'use strict';

const settingsHelper = require('./settingsHelper.js');

/**
 * Single source of truth for the delivery fee and the free-shipping threshold.
 *
 * Model (per brand) — the SAME rule every storefront cart drawer applies, so
 * the total a shopper sees, the order's final_amount and the courier's COD
 * collection all agree:
 *   - The fee is the brand's shipping_fees row for the payment type
 *     (orderType 'prepaid' or 'cod'); no row = free.
 *   - COD ships free once the cart subtotal reaches the brand's
 *     FREE_SHIPPING_THRESHOLD (0 / empty = no threshold). Prepaid always
 *     carries its own row's fee (usually 0).
 *
 * Used by orderController.createOrder (COD + guest checkout), the Razorpay
 * checkout (checkoutController) and the public shipping-fees API. Edited from
 * Dashboard → Shipping & courier.
 */

// The cart subtotal (₹) at/above which COD shipping becomes free, for this brand.
// Admin-configurable via the FREE_SHIPPING_THRESHOLD brand setting. 0 / empty =
// no threshold (COD always carries its fee).
async function getFreeShippingThreshold(brandId = 1) {
  try {
    const raw = await settingsHelper.getSetting(brandId, 'FREE_SHIPPING_THRESHOLD', '0');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (_) {
    return 0;
  }
}

// The delivery fee (₹) for an order of `orderType` ('cod' | anything else =
// prepaid) with this cart `subtotal` (item total after pack pricing, before
// coupons — the same base the storefront drawers compare).
async function computeShippingFee({ orderType, subtotal = 0, brandId = 1 }) {
  const type = orderType === 'cod' ? 'cod' : 'prepaid';
  const { ShippingFee } = require('../model/shippingFeeModel.js');
  const row = await ShippingFee.findOne({ where: { orderType: type, brand_id: brandId } });
  const fee = row ? Number(row.fee) || 0 : 0;
  if (fee <= 0) return 0;
  if (type === 'cod') {
    const threshold = await getFreeShippingThreshold(brandId);
    if (threshold > 0 && Number(subtotal) >= threshold) return 0;
  }
  return fee;
}

module.exports = { getFreeShippingThreshold, computeShippingFee };
