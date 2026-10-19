'use strict';

const { Op } = require('sequelize');
const { AbandonedCart } = require('../model/abandonedCartModel.js');
const { phoneHash } = require('../utils/encryption.js');
const { logger } = require('../config/logging.js');
const recovery = require('../services/cartRecoveryService.js');

function tenDigits(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

// Capture is public and unauthenticated, and each captured cart can lead to a
// paid WhatsApp marketing message — so cap it per client IP and per phone.
// Redis counters (shared by every app process), with an in-memory fallback
// when Redis is down. Generous enough for a real checkout (the storefront
// re-posts as the shopper edits their details) and for shoppers behind
// carrier-grade NAT sharing one IP.
const CAPTURE_LIMITS = [
  { scope: 'ip15m', windowSec: 15 * 60, max: 30 },
  { scope: 'ipday', windowSec: 24 * 3600, max: 300 },
  { scope: 'phoneday', windowSec: 24 * 3600, max: 10 },
];
const _memHits = new Map(); // key → { n, resetAt }
async function overLimit(key, windowSec, max) {
  try {
    const redis = require('../services/redisService.js');
    const n = await redis.incr(key);
    if (typeof n === 'number') {
      if (n === 1) await redis.expire(key, windowSec);
      return n > max;
    }
  } catch (_) { /* fall back to memory */ }
  const now = Date.now();
  let e = _memHits.get(key);
  if (!e || e.resetAt <= now) { e = { n: 0, resetAt: now + windowSec * 1000 }; _memHits.set(key, e); }
  e.n += 1;
  if (_memHits.size > 50000) { for (const [k, v] of _memHits) if (v.resetAt <= now) _memHits.delete(k); }
  return e.n > max;
}
async function captureRateLimited(ip, digits) {
  const ipKey = String(ip || 'unknown');
  for (const l of CAPTURE_LIMITS) {
    const subject = l.scope.startsWith('phone') ? phoneHash(digits) || digits : ipKey;
    if (await overLimit(`ac:cap:${l.scope}:${subject}`, l.windowSec, l.max)) return true;
  }
  return false;
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
    if (await captureRateLimited(req.ip, digits)) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } });
    }
    // Line items (ids + quantities) so the WhatsApp link can rebuild this cart
    // on any device. Optional — older storefront builds don't send them.
    const items = recovery.sanitizeItems(req.body.items);
    const hash = phoneHash(digits);
    const [row, created] = await AbandonedCart.findOrCreate({
      where: { phoneHashValue: hash, brandId },
      defaults: {
        phone: digits, customerName: name || null, cartSummary: cartSummary || null,
        itemCount: Number(itemCount) || 0, cartValue: Number(cartValue) || 0,
        userId: userId || null, status: 'pending', waSent: false,
        items, recoverToken: recovery.newToken(),
      },
    });
    if (!created) {
      // A fresh capture re-arms the row (pending → the cron messages it after
      // the configured wait) unless this shopper was already sent a cart
      // message in the last 7 days — then only the cart contents are updated.
      const rearm = await recovery.canRearm(row);
      await row.update({
        phone: digits,
        customerName: name || row.customerName,
        cartSummary: cartSummary || row.cartSummary,
        itemCount: Number(itemCount) || row.itemCount,
        cartValue: Number(cartValue) || row.cartValue,
        userId: userId || row.userId,
        ...(rearm ? { status: 'pending', waSent: false } : {}),
        ...(items ? { items } : {}),
        ...(recovery.isToken(row.recoverToken) ? {} : { recoverToken: recovery.newToken() }),
      });
    }

    // No message is sent from here. The shopper is usually still on the
    // checkout page; the 5-minute recovery cron messages the cart only after
    // the wait set in WhatsApp Studio → Abandoned carts → Rules (default 1 h,
    // never 9 pm–9 am), and only if no order came in meanwhile.

    return res.json({ success: true });
  } catch (err) {
    logger.error('Abandoned-cart capture error: ' + err.message);
    return res.status(500).json({ success: false });
  }
};

// Public: GET /api/abandoned-cart/restore/:token — the line items behind a
// WhatsApp "Complete Order" link, so the storefront can rebuild the cart on a
// device that never had it (WhatsApp's in-app browser, another phone). The
// token is unguessable and the response carries no personal data (no phone or
// name) — only product/variation ids, quantities and public product info.
// Empty items (not an error) when the link has expired or the shopper already
// ordered, so the store still opens the cart and applies the coupon.
exports.restore = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  try {
    const row = await recovery.findByToken(req.params.token);
    // A storefront only restores its own brand's carts.
    if (!row || (req.brandId && Number(req.brandId) !== Number(row.brandId))) {
      return res.status(404).json({ success: false, message: 'Cart link not found' });
    }
    // The per-brand-domain cart template links straight to the store (not via
    // /api/cart-recover), so this restore call is where we learn it was opened.
    recovery.markLinkOpened(row.id).catch(() => {});
    const coupon = (await recovery.getCartRules().catch(() => null))?.coupon || 'CART10';
    if (row.status === 'recovered') {
      return res.json({ success: true, items: [], reason: 'ordered', coupon });
    }
    if (recovery.isExpired(row)) {
      return res.json({ success: true, items: [], reason: 'expired', coupon });
    }
    const items = await recovery.buildRestoreLines(row);
    return res.json({ success: true, items, coupon });
  } catch (err) {
    logger.error('Abandoned-cart restore error: ' + err.message);
    return res.status(500).json({ success: false, items: [] });
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
