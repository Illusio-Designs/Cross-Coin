const express = require('express');
const {
    createRazorpayOrder, updateOrderPayment,
    razorpayWebhook, handlePaymentFailure,
    getAllPayments
} = require('../controller/paymentController.js');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// ── Razorpay ──────────────────────────────────────────────────────────────
router.post('/razorpay/order',    isAuthenticated, createRazorpayOrder);
router.post('/razorpay/verify',   updateOrderPayment);
router.post('/razorpay/webhook',  express.raw({ type: 'application/json' }), razorpayWebhook);

// ── Guest Razorpay ────────────────────────────────────────────────────────
router.post('/guest/razorpay/order', createRazorpayOrder);

// ── User ──────────────────────────────────────────────────────────────────
router.post('/failed',            handlePaymentFailure);

// ── Admin ─────────────────────────────────────────────────────────────────
router.get('/',                   isAuthenticated, isOrderManager, getAllPayments);

module.exports = router;
