'use strict';

// Brand-neutral redirect endpoints used by WhatsApp template buttons.
//
// WHY THIS EXISTS: one verified WhatsApp number (the shared WABA) serves every
// brand, so a template's call-to-action button can only carry ONE fixed URL
// domain — it can't be per-brand. To still land each customer on their OWN
// store, the button points at a fixed backend URL with the order number as the
// only variable, and this route 302-redirects to that order's brand storefront.
//
//   Button URL (in the template):  https://api.crosscoin.in/api/track/{{1}}
//   {{1}} = order number  →  302 → https://<brand-domain>/<track route>?order=<n>
//
// The per-store domain + path logic is reused verbatim from whatsappService so
// the button and the in-body text link always agree.

const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService.js');
const { Order } = require('../model/orderModel.js');
const { logger } = require('../config/logging.js');

// GET /api/track/:orderNumber → the order's OWN store order-tracking page.
router.get('/track/:orderNumber', async (req, res) => {
  const orderNumber = String(req.params.orderNumber || '').trim();
  try {
    let brandId = 1;
    if (orderNumber) {
      const order = await Order.findOne({
        where: { order_number: orderNumber },
        attributes: ['brand_id'],
      });
      if (order) brandId = order.brand_id || 1;
    }
    const url = await whatsappService.getTrackingUrl(brandId, orderNumber);
    return res.redirect(302, url);
  } catch (e) {
    logger.warn('[track-redirect] failed for %s: %s', orderNumber, e.message);
    // Safe default: Crosscoin's tracking page still shows the order by number.
    return res.redirect(302, `https://crosscoin.in/OrderTracking?order=${encodeURIComponent(orderNumber)}`);
  }
});

// GET /api/shop/:brandId → that brand's storefront homepage (for "Shop again" /
// cart-recovery buttons that can't carry a per-brand domain themselves).
router.get('/shop/:brandId', async (req, res) => {
  const brandId = Number(req.params.brandId) || 1;
  try {
    const domain = await whatsappService.getBrandDomain(brandId);
    return res.redirect(302, `https://${domain}`);
  } catch (e) {
    logger.warn('[shop-redirect] failed for brand %s: %s', brandId, e.message);
    return res.redirect(302, 'https://crosscoin.in');
  }
});

// GET /api/cart-recover/:brandId → the brand storefront with a recovery flag so
// the store reopens the shopper's (localStorage) cart and pre-applies the
// abandoned-cart coupon. Used by the "Complete Order" button on the
// cart_abandoned WhatsApp template. One shared WABA number can't carry a
// per-brand domain in the button, so the button points here and we 302 to the
// right store. ?recover=1 tells the storefront to open the cart drawer; the
// coupon (default CART10) is pre-filled so the shopper doesn't have to type it.
router.get('/cart-recover/:brandId', async (req, res) => {
  const brandId = Number(req.params.brandId) || 1;
  const coupon = String(req.query.coupon || 'CART10').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || 'CART10';
  try {
    const domain = await whatsappService.getBrandDomain(brandId);
    return res.redirect(302, `https://${domain}/?recover=1&coupon=${encodeURIComponent(coupon)}`);
  } catch (e) {
    logger.warn('[cart-recover-redirect] failed for brand %s: %s', brandId, e.message);
    return res.redirect(302, `https://crosscoin.in/?recover=1&coupon=${encodeURIComponent(coupon)}`);
  }
});

module.exports = router;
