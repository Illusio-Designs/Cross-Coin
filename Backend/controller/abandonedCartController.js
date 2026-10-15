'use strict';

const { Op } = require('sequelize');
const { AbandonedCart } = require('../model/abandonedCartModel.js');
const { phoneHash } = require('../utils/encryption.js');
const { logger } = require('../config/logging.js');

function tenDigits(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

// Public: POST /api/abandoned-cart — upsert a shopper's in-progress cart the
// moment they reach checkout with a valid phone. Deduped per (phone, brand):
// re-entering details re-arms the same row to 'pending' so it gets one fresh
// recovery chance. Marketing consent is honoured at send time (opt-out check in
// the cron), never here — this only records intent to buy.
exports.capture = async (req, res) => {
  try {
    const brandId = req.brandId || parseInt(req.body.brandId, 10) || 1;
    const { phone, name, cartSummary, itemCount, cartValue, userId } = req.body;
    const digits = tenDigits(phone);
    if (digits.length !== 10) {
      return res.status(400).json({ success: false, message: 'A valid 10-digit phone is required' });
    }
    const hash = phoneHash(digits);
    const [row, created] = await AbandonedCart.findOrCreate({
      where: { phoneHashValue: hash, brandId },
      defaults: {
        phone: digits, customerName: name || null, cartSummary: cartSummary || null,
        itemCount: Number(itemCount) || 0, cartValue: Number(cartValue) || 0,
        userId: userId || null, status: 'pending', waSent: false,
      },
    });
    let prevStatus = null;
    if (!created) {
      prevStatus = row.status;
      await row.update({
        phone: digits,
        customerName: name || row.customerName,
        cartSummary: cartSummary || row.cartSummary,
        itemCount: Number(itemCount) || row.itemCount,
        cartValue: Number(cartValue) || row.cartValue,
        userId: userId || row.userId,
        status: 'pending', waSent: false,
      });
    }

    // Fire the recovery WhatsApp IMMEDIATELY (no cron wait) now that we have the
    // shopper's phone + cart — on the first capture, or on a fresh abandonment
    // after a previous message/recovery. Re-entering details within the same
    // pending cycle does NOT re-fire (avoids spam); the 5-minute cron stays as a
    // backstop. Non-blocking + opt-out honoured; never blocks the response.
    const freshCycle = created || prevStatus === 'messaged' || prevStatus === 'recovered';
    if (freshCycle) {
      setImmediate(async () => {
        try {
          const whatsappService = require('../services/whatsappService.js');
          const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
          const conv = await WhatsappConversation.findOne({
            where: { customer_phone: { [Op.like]: `%${digits}` }, brand_id: brandId },
          });
          if (conv?.opted_out) { await row.update({ status: 'messaged', waSent: true }); return; }
          await whatsappService.sendAbandonedCart(digits, {
            customerName: name || null,
            itemsSummary: cartSummary || 'your items',
            total: Number(cartValue) ? Number(cartValue).toFixed(0) : undefined,
            couponCode: 'CART10',
          }, brandId);
          await row.update({ status: 'messaged', waSent: true });
        } catch (e) {
          logger.warn('Immediate abandoned-cart WA failed: ' + e.message);
        }
      });
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error('Abandoned-cart capture error: ' + err.message);
    return res.status(500).json({ success: false });
  }
};

// Public: POST /api/abandoned-cart/recovered — the shopper completed checkout,
// so never message them. Best-effort; also called server-side on order success.
exports.recovered = async (req, res) => {
  try {
    const brandId = req.brandId || parseInt(req.body.brandId, 10) || 1;
    await module.exports.markRecovered(brandId, req.body.phone);
    return res.json({ success: true });
  } catch (err) {
    logger.error('Abandoned-cart recovered error: ' + err.message);
    return res.status(500).json({ success: false });
  }
};

// Admin: GET /api/admin/abandoned-carts — list + summary stats for the
// dashboard. Optional ?brandId= and ?status= filters, ?limit= (max 500).
exports.adminList = async (req, res) => {
  try {
    const Brand = require('../model/brandModel.js');
    const brands = await Brand.findAll({ attributes: ['id', 'name', 'display_name'], raw: true });
    const bmap = {};
    brands.forEach((b) => { bmap[b.id] = b.display_name || b.name; });
    const brandName = (id) => bmap[id] || (id ? `Brand #${id}` : '—');

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const where = {};
    const statWhere = {};
    if (req.query.brandId) { where.brandId = parseInt(req.query.brandId, 10); statWhere.brandId = parseInt(req.query.brandId, 10); }
    if (['pending', 'messaged', 'recovered'].includes(req.query.status)) where.status = req.query.status;

    const [total, pending, messaged, recovered, rows] = await Promise.all([
      AbandonedCart.count({ where: statWhere }),
      AbandonedCart.count({ where: { ...statWhere, status: 'pending' } }),
      AbandonedCart.count({ where: { ...statWhere, status: 'messaged' } }),
      AbandonedCart.count({ where: { ...statWhere, status: 'recovered' } }),
      AbandonedCart.findAll({ where, order: [['updatedAt', 'DESC']], limit }),
    ]);

    const carts = rows.map((r) => {
      const digits = String(r.phone || '').replace(/\D/g, '');
      return {
        id: r.id, brand: brandName(r.brandId), brandId: r.brandId,
        name: r.customerName || '—',
        phone: digits.length === 10 ? `••• ••• ${digits.slice(-4)}` : '—',
        cart: r.cartSummary || '—', itemCount: r.itemCount, value: Number(r.cartValue) || 0,
        status: r.status, waSent: !!r.waSent, createdAt: r.createdAt, updatedAt: r.updatedAt,
      };
    });

    // Recovered rate among carts we actually acted on (messaged + recovered).
    const actioned = messaged + recovered;
    const recoveredRate = actioned ? Math.round((recovered / actioned) * 100) : 0;
    return res.json({ success: true, stats: { total, pending, messaged, recovered, recoveredRate }, count: carts.length, carts });
  } catch (err) {
    logger.error('Abandoned-cart adminList error: ' + err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Internal helper — mark any pending/messaged row for this phone+brand as
// recovered so the recovery cron skips it. Safe to call from order-success
// paths; never throws.
exports.markRecovered = async (brandId, phone) => {
  try {
    const digits = tenDigits(phone);
    if (digits.length !== 10) return;
    const hash = phoneHash(digits);
    await AbandonedCart.update(
      { status: 'recovered' },
      { where: { phoneHashValue: hash, brandId: brandId || 1, status: { [Op.ne]: 'recovered' } } },
    );
  } catch (e) { /* non-fatal */ }
};
