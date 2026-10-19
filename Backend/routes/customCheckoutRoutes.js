const express = require('express');
const router = express.Router();
const ctrl = require('../controller/customCheckoutController.js');
const { authenticate, isAdmin } = require('../middleware/authMiddleware.js');

// ── Seller catalog URLs the checkout provider pulls (public, brand-scoped
//    via X-Brand-Name or ?brand=<slug>) ────────────────────────────────────
router.get('/products', ctrl.listProducts);
router.get('/collections', ctrl.listCollections);
router.get('/collection-products', ctrl.listCollectionProducts);

// ── Storefront: create a checkout access token (secret stays server-side) ──
router.post('/token', ctrl.createToken);

// ── Admin utilities ────────────────────────────────────────────────────────
router.get('/orders', authenticate, isAdmin, ctrl.orderList);
router.get('/orders/:orderId', authenticate, isAdmin, ctrl.orderDetails);
router.post('/sync/product/:id', authenticate, isAdmin, ctrl.syncProduct);
router.post('/sync/collection/:id', authenticate, isAdmin, ctrl.syncCollection);
router.post('/refund/initiate', authenticate, isAdmin, ctrl.refundInitiate);
router.post('/refund/reports', authenticate, isAdmin, ctrl.refundReports);

module.exports = router;
