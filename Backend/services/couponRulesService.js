'use strict';

// ── One coupon rule set for every place a coupon is applied ──────────────────
// Used by POST /api/coupons/validate (cart drawer), POST /api/orders (COD /
// guest orders) and POST /api/checkout/initiate (prepaid). The server is the
// source of truth: order paths compare the client's discount with this result
// and reject a mismatch, so a coupon can't be reused past its limits or
// stretched to items it doesn't cover by posting coupon_id + discount_amount.
//
// Rules (in order, first failure wins):
//   active + in date → store (coupon_brands) → payment mode → total uses →
//   first order only → uses per customer (empty = once) → works on (categories /
//   products: at least one matching line) → minimum order (whole cart) → amount.
// Amount is worked out on the ELIGIBLE lines only (all lines when the coupon has
// no category/product list):
//   percentage      value % of eligible subtotal, capped at maxDiscount
//   fixed           value, at most the eligible subtotal
//   tiered          [{minAmount, discount}] ₹ off for the highest minAmount the eligible subtotal reaches
//   quantity_based  [{minQuantity, discount}] ₹ off for the highest minQuantity the eligible item count reaches
// rounded to a whole rupee (keeps order totals decimal-free for courier booking).

const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');

const CANCELLED = ['cancelled', 'order cancelled'];
const toInt = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const idList = (v) => {
  let arr = v;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = arr.split(','); } }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(toInt).filter(Boolean))];
};
const jsonArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

// Storefront / server line → { productId, quantity, price } (price = unit price).
// Storefronts differ: productId | product_id | id, quantity | qty.
function normaliseLines(items) {
  return (Array.isArray(items) ? items : []).map((i) => {
    if (!i || typeof i !== 'object') return null;
    const productId = toInt(i.productId ?? i.product_id ?? i.Product?.id ?? i.id);
    const quantity = Number(i.quantity ?? i.qty ?? 0);
    const price = Number(i.price);
    return productId && quantity > 0 ? { productId, quantity, price: Number.isFinite(price) ? price : null } : null;
  }).filter(Boolean);
}

const fail = (status, message, coupon = null) => ({ ok: false, status, message, coupon, discount: 0 });

/**
 * @param {object} o
 * @param {object|number} o.coupon       Coupon instance or id
 * @param {Array}  o.items               cart lines (any storefront shape, or server validated items)
 * @param {number} o.subtotal            whole-cart subtotal in rupees
 * @param {number} [o.userId]            signed-in customer
 * @param {string} [o.guestEmail]        guest email (validate path only)
 * @param {string} [o.paymentType]       'cod' or anything else (= prepaid); omit to skip the check
 * @param {number} [o.brandId]           store the order is placed on; omit to skip the store check
 * @param {object} [o.transaction]
 * @returns {Promise<{ok, status?, message?, discount, eligibleSubtotal?, coupon}>}
 */
async function evaluateCoupon(o) {
  const { Coupon, CouponUsage, Order, User } = require('../model/associations.js');
  const t = o.transaction ? { transaction: o.transaction } : {};
  const coupon = o.coupon && typeof o.coupon === 'object' ? o.coupon : await Coupon.findByPk(o.coupon, t);
  const now = new Date();
  if (!coupon || coupon.status !== 'active' || new Date(coupon.startDate) > now || new Date(coupon.endDate) < now) {
    return fail(404, 'Invalid or expired coupon code', coupon);
  }

  if (o.brandId) {
    const { allowedOnBrand } = require('./couponAdminService.js');
    if (!(await allowedOnBrand(coupon.id, o.brandId))) return fail(404, "This code doesn't work on this store", coupon);
  }

  if (o.paymentType && coupon.paymentModeRestriction && coupon.paymentModeRestriction !== 'all') {
    const mode = o.paymentType === 'cod' ? 'cod' : 'prepaid';
    if (coupon.paymentModeRestriction !== mode) {
      const modeText = coupon.paymentModeRestriction === 'cod' ? 'Cash on Delivery' : 'Prepaid';
      return fail(400, `This coupon is only valid for ${modeText} orders`, coupon);
    }
  }

  if (coupon.usageLimit && Number(coupon.usageCount) >= Number(coupon.usageLimit)) {
    return fail(400, 'This coupon has reached its usage limit.', coupon);
  }

  // Who is ordering: the signed-in account, else every account / guest record
  // with the guest's email (createGuestOrder turns guests into accounts).
  let userIds = o.userId ? [Number(o.userId)] : [];
  let guestIds = [];
  const email = !o.userId && o.guestEmail ? String(o.guestEmail).toLowerCase().trim() : '';
  if (email) {
    const { GuestUser } = require('../model/associations.js');
    const [users, guests] = await Promise.all([
      User.findAll({ where: { email }, attributes: ['id'], ...t }),
      GuestUser.findAll({ where: { email }, attributes: ['id'], ...t }),
    ]);
    userIds = users.map((u) => u.id);
    guestIds = guests.map((g) => g.id);
  }
  const who = (userKey, guestKey) => {
    const or = [];
    if (userIds.length) or.push({ [userKey]: { [Op.in]: userIds } });
    if (guestIds.length) or.push({ [guestKey]: { [Op.in]: guestIds } });
    return or.length ? { [Op.or]: or } : null;
  };

  if (coupon.firstOrderOnly) {
    const w = who('user_id', 'guest_user_id');
    if (w) {
      const previous = await Order.count({ where: { ...w, status: { [Op.notIn]: CANCELLED } }, ...t });
      if (previous > 0) return fail(400, 'This coupon is only valid for first orders', coupon);
    }
  }

  const w = who('userId', 'guestUserId');
  if (w) {
    const used = await CouponUsage.count({ where: { couponId: coupon.id, ...w }, ...t });
    const perUser = Number(coupon.perUserLimit) || 1; // empty = once per customer
    if (used >= perUser) {
      return fail(400, coupon.perUserLimit > 1 ? 'You have already used this coupon the maximum number of times.' : 'You have already used this coupon.', coupon);
    }
  }

  const subtotal = Number(o.subtotal) || 0;
  const lines = normaliseLines(o.items);
  const cats = idList(coupon.applicableCategories);
  const prods = idList(coupon.applicableProducts);
  let eligible = lines;
  let eligibleSubtotal = subtotal;
  if (cats.length || prods.length) {
    let catMatch = new Set();
    if (cats.length && lines.length) {
      const rows = await sequelize.query(
        `SELECT p.id FROM products p LEFT JOIN categories c ON c.id = p.categoryId
          WHERE p.id IN (:ids) AND (p.categoryId IN (:cats) OR c.parentId IN (:cats))`,
        { replacements: { ids: [...new Set(lines.map((l) => l.productId))], cats }, type: QueryTypes.SELECT, ...t });
      catMatch = new Set(rows.map((r) => Number(r.id)));
    }
    eligible = lines.filter((l) => prods.includes(l.productId) || catMatch.has(l.productId));
    if (!eligible.length) return fail(400, 'This code works only on selected products — add one of them to your cart to use it.', coupon);
    if (eligible.some((l) => l.price == null)) return fail(400, 'Please refresh your cart and try the code again.', coupon);
    eligibleSubtotal = eligible.reduce((s, l) => s + l.price * l.quantity, 0);
  }

  if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
    const min = Number(coupon.minPurchase);
    return fail(400, `You must spend at least ₹${min} to use this coupon. Add ₹${(min - subtotal).toFixed(2)} more to your cart.`, coupon);
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (eligibleSubtotal * Number(coupon.value)) / 100;
    if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) discount = Number(coupon.maxDiscount);
  } else if (coupon.type === 'fixed') {
    discount = Number(coupon.value);
  } else if (coupon.type === 'tiered') {
    const tiers = jsonArray(coupon.tieredDiscounts);
    if (!tiers.length) return fail(400, 'This tiered coupon is not properly configured', coupon);
    const tier = [...tiers].sort((a, b) => Number(b.minAmount) - Number(a.minAmount)).find((x) => eligibleSubtotal >= Number(x.minAmount));
    if (!tier) return fail(400, "This coupon requires a minimum purchase amount that you haven't met", coupon);
    discount = Number(tier.discount);
  } else if (coupon.type === 'quantity_based') {
    const tiers = jsonArray(coupon.quantityBasedDiscounts);
    if (!tiers.length) return fail(400, 'This quantity-based coupon is not properly configured', coupon);
    const qty = eligible.reduce((s, l) => s + l.quantity, 0);
    if (!qty) return fail(400, 'Cart items are required for quantity-based coupons', coupon);
    const tier = [...tiers].sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity)).find((x) => qty >= Number(x.minQuantity));
    if (!tier) {
      const minQty = Math.min(...tiers.map((x) => Number(x.minQuantity)));
      return fail(400, `You need at least ${minQty} items in your cart to use this coupon`, coupon);
    }
    discount = Number(tier.discount);
  }
  discount = Math.max(0, Math.min(eligibleSubtotal, Math.round(discount)));
  return { ok: true, discount, eligibleSubtotal, coupon };
}

// Order paths: check the client's discount against the server's. Returns
// { ok:true, discount, couponId } (couponId null when no coupon discount applies)
// or { ok:false, status, message }.
async function verifyOrderCoupon({ couponId, appliedDiscount, items, subtotal, userId, paymentType, brandId, transaction }) {
  if (!couponId) return { ok: true, discount: 0, couponId: null };
  // A coupon id with no discount claimed changes nothing — don't attach it.
  if (!(Number(appliedDiscount) > 0)) return { ok: true, discount: 0, couponId: null };
  const r = await evaluateCoupon({ coupon: couponId, items, subtotal, userId, paymentType, brandId, transaction });
  if (!r.ok) {
    const msg = r.status === 404 ? `${r.message}. Please remove it and try again.` : `${r.message}. Please remove it or update your cart.`;
    return { ok: false, status: 400, message: msg.replace('..', '.') };
  }
  if (Math.abs(Number(appliedDiscount) - r.discount) > 1) {
    return { ok: false, status: 400, message: 'Order total mismatch. Please refresh and try again.' };
  }
  return { ok: true, discount: r.discount, couponId: r.coupon.id };
}

// Order cancelled / abandoned: give the use back — only when a usage row was
// actually removed (usage is recorded only when a discount applied, so a
// zero-discount order must not lower the count). Never below zero.
async function releaseCouponUse(order, transaction) {
  if (!order || !order.coupon_id) return false;
  const { Coupon, CouponUsage } = require('../model/associations.js');
  const removed = await CouponUsage.destroy({ where: { orderId: order.id }, transaction });
  if (!removed) return false;
  await Coupon.update(
    { usageCount: sequelize.literal(`GREATEST(usageCount - ${Number(removed)}, 0)`) },
    { where: { id: order.coupon_id }, transaction });
  return true;
}

module.exports = { evaluateCoupon, verifyOrderCoupon, releaseCouponUse, normaliseLines };
