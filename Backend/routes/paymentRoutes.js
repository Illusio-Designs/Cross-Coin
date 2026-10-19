const express = require('express');
const {
    createRazorpayOrder, updateOrderPayment,
    razorpayWebhook, handlePaymentFailure,
    adminListPayments, adminPaymentsSummary, adminPaymentMismatches, adminFixPaymentMismatch,
} = require('../controller/paymentController.js');
const { isAuthenticated, isOrderManager, isAdmin } = require('../middleware/authMiddleware.js');

const router = express.Router();

// ── Razorpay ──────────────────────────────────────────────────────────────
router.post('/razorpay/order',    isAuthenticated, createRazorpayOrder);
router.post('/razorpay/verify',   updateOrderPayment);
router.post('/razorpay/webhook',  express.raw({ type: 'application/json' }), razorpayWebhook);

// ── Guest Razorpay ────────────────────────────────────────────────────────
router.post('/guest/razorpay/order', createRazorpayOrder);

// ── User ──────────────────────────────────────────────────────────────────
router.post('/failed',            handlePaymentFailure);

// ── Admin (Dashboard → Payments) ──────────────────────────────────────────
router.get('/admin/list',         isAuthenticated, isOrderManager, adminListPayments);
router.get('/admin/summary',      isAuthenticated, isOrderManager, adminPaymentsSummary);
router.get('/admin/mismatches',   isAuthenticated, isOrderManager, adminPaymentMismatches);
router.post('/admin/mismatches/:orderId/fix', isAuthenticated, isAdmin, adminFixPaymentMismatch);

module.exports = router;
