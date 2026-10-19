'use strict';

const settingsHelper = require('./settingsHelper.js');
const { ShippingFee } = require('../model/shippingFeeModel.js');
const { logger } = require('../config/logging.js');

/**
 * Single source of truth for the delivery fee and the free-shipping threshold.
 *
 * Model (per brand):
 *   - PREPAID orders always ship FREE.
 *   - COD orders carry the configured COD fee, UNLESS the cart subtotal reaches
 *     the brand's FREE_SHIPPING_THRESHOLD, in which case COD ships free too.
 *
 * Both the checkout (orderController) and the public shipping-fees API use this,
 * so the storefront's "₹X away from free shipping" bar can never promise a
 * waiver the order total won't actually apply.
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

// The delivery fee for an order. Shipping is now FREE on every order — prepaid
// and COD alike (COD carries no fee). The per-brand threshold is retained only to
// drive the storefront's free-shipping badge; it no longer gates the fee.
async function computeShippingFee({ orderType, subtotal = 0, brandId = 1 }) { // eslint-disable-line no-unused-vars
  return 0;
}

module.exports = { getFreeShippingThreshold, computeShippingFee };
