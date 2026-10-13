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
    if (!created) {
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
