const express = require('express');
const router = express.Router();
const ctrl = require('../controller/customCheckoutController.js');
const { authenticate, isAdmin } = require('../middleware/authMiddleware.js');

// The store must be named: X-Brand-Name header (e.g. `X-Brand-Name: velmique`),
// or ?brand=<slug> where a header can't be set. A missing or unknown store is
// an error — never another store's catalog or orders.
function brandRequired(req, res, next) {
  if (req.brand && req.brandId) return next();
  const sent = req.headers['x-brand-name'] || req.query.brand;
  return res.status(400).json({
    success: false,
    message: sent
      ? `Unknown store "${String(sent).slice(0, 40)}" in X-Brand-Name`
      : 'Send the store in the X-Brand-Name header, e.g. X-Brand-Name: velmique',
  });
}

// ── Seller catalog URLs the checkout provider pulls (public, brand-scoped
//    via the X-Brand-Name header) ─────────────────────────────────────────
router.get('/products', brandRequired, ctrl.listProducts);
router.get('/collections', brandRequired, ctrl.listCollections);
router.get('/collection-products', brandRequired, ctrl.listCollectionProducts);
router.get('/points', brandRequired, ctrl.getPoints);

// ── Storefront: create a checkout access token (secret stays server-side) ──
router.get('/status', brandRequired, ctrl.status);
router.post('/token', brandRequired, ctrl.createToken);

// ── Provider → seller: order webhook (X-Brand-Name header, or ?brand=) ────
router.post('/order-webhook', brandRequired, ctrl.orderWebhook);

// ── Storefront: back from the provider's page → confirm + Purchase ────────
router.post('/confirm', brandRequired, ctrl.confirmReturn);

// ── Admin utilities ────────────────────────────────────────────────────────
router.get('/orders', authenticate, isAdmin, ctrl.orderList);
router.get('/orders/:orderId', authenticate, isAdmin, ctrl.orderDetails);
router.post('/sync/product/:id', authenticate, isAdmin, ctrl.syncProduct);
router.post('/sync/collection/:id', authenticate, isAdmin, ctrl.syncCollection);
router.post('/refund/initiate', authenticate, isAdmin, ctrl.refundInitiate);
router.post('/refund/reports', authenticate, isAdmin, ctrl.refundReports);

module.exports = router;
