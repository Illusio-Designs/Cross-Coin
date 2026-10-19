const express = require('express');
const {
    updateOrderPayment,
    razorpayWebhook, handlePaymentFailure,
    adminListPayments, adminPaymentsSummary, adminPaymentMismatches, adminFixPaymentMismatch,
} = require('../controller/paymentController.js');
const { isAuthenticated, isOrderManager, isAdmin } = require('../middleware/authMiddleware.js');

const router = express.Router();

// ── Razorpay ──────────────────────────────────────────────────────────────
// Razorpay orders are created only by checkout (POST /api/checkout/initiate,
// /guest/initiate, /retry) with the server-computed total. The old
// /razorpay/order and /guest/razorpay/order endpoints took any amount from the
// browser and were unused by every storefront, so they are gone.
router.post('/razorpay/verify',   updateOrderPayment);
router.post('/razorpay/webhook',  express.raw({ type: 'application/json' }), razorpayWebhook);

// ── User ──────────────────────────────────────────────────────────────────
router.post('/failed',            isAuthenticated, handlePaymentFailure);

// ── Admin (Dashboard → Payments) ──────────────────────────────────────────
router.get('/admin/list',         isAuthenticated, isOrderManager, adminListPayments);
router.get('/admin/summary',      isAuthenticated, isOrderManager, adminPaymentsSummary);
router.get('/admin/mismatches',   isAuthenticated, isOrderManager, adminPaymentMismatches);
router.post('/admin/mismatches/fix', isAuthenticated, isAdmin, adminFixPaymentMismatch);

module.exports = router;
