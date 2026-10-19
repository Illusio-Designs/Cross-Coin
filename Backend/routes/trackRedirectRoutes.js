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

// GET /api/cart-recover/:key → the brand storefront with a recovery flag so
// the store reopens the shopper's cart and pre-applies the abandoned-cart
// coupon. Used by the "Complete Order" button on the cart_abandoned WhatsApp
// template (https://api.crosscoin.in/api/cart-recover/{{1}}). One shared WABA
// number can't carry a per-brand domain in the button, so the button points
// here and we 302 to the right store.
//
// {{1}} is normally the cart's unguessable recovery token (see
// services/cartRecoveryService.js): we find the cart's brand from it and pass
// it on as &cart=<token>, so the store can rebuild the cart from the server —
// the WhatsApp in-app browser (or another phone) has no localStorage cart.
// A plain number is the legacy form (brand id) from messages sent before the
// token existed: it still opens the right store, just without the items.
const CART_RECOVER_COUPON = 'CART10';
router.get('/cart-recover/:key', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  // Tolerate a stray trailing slash / encoded junk WhatsApp may add.
  const key = String(req.params.key || '').trim().replace(/[/\s]+$/, '');
  const coupon = String(req.query.coupon || CART_RECOVER_COUPON).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || CART_RECOVER_COUPON;
  let brandId = 1;
  let token = null;
  try {
    if (/^\d{1,9}$/.test(key)) {
      brandId = Number(key) || 1;
    } else {
      const recovery = require('../services/cartRecoveryService.js');
      const row = await recovery.findByToken(key);
      if (row) { brandId = row.brandId || 1; token = row.recoverToken; }
    }
    const domain = await whatsappService.getBrandDomain(brandId);
    const qs = `recover=1&coupon=${encodeURIComponent(coupon)}${token ? `&cart=${encodeURIComponent(token)}` : ''}`;
    return res.redirect(302, `https://${domain}/?${qs}`);
  } catch (e) {
    logger.warn('[cart-recover-redirect] failed for %s: %s', key.slice(0, 8), e.message);
    return res.redirect(302, `https://crosscoin.in/?recover=1&coupon=${encodeURIComponent(coupon)}`);
  }
});

module.exports = router;
