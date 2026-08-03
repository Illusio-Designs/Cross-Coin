'use strict';

/**
 * Razorpay Magic (one-click) Checkout — test routes, mounted at /api/magic.
 *
 *   POST /api/magic/order          → create a Magic order (storefront calls this)
 *   POST /api/magic/verify         → verify payment + read chosen address (storefront)
 *   POST /api/magic/shipping-info  → Razorpay callback: serviceability + shipping fee
 *   POST /api/magic/coupons        → Razorpay callback: available coupons
 *   POST /api/magic/apply-coupon   → Razorpay callback: validate/apply a coupon
 *
 * The two storefront routes run behind optionalBrand (X-Brand-Name → req.brandId).
 * The three Razorpay callbacks are server-to-server (no brand header), so the
 * controller falls back to ?brand_id= (baked into the dashboard callback URL) or
 * brand 1. Configure the callback URLs in the Razorpay Magic dashboard.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controller/magicCheckoutController.js');

router.post('/order', ctrl.createMagicOrder);
router.post('/verify', ctrl.verifyMagicPayment);

// Razorpay Magic callbacks (configure these URLs in the dashboard).
router.post('/shipping-info', ctrl.shippingInfo);
router.post('/coupons', ctrl.getCoupons);
router.post('/apply-coupon', ctrl.applyCoupon);

module.exports = router;
