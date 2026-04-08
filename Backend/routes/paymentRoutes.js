const express = require('express');
const {
    createRazorpayOrder, updateOrderPayment, razorpayCallback,
    razorpayWebhook, handlePaymentFailure,
    refundPayment, getAllPayments, getUserPayments, getPaymentStatus
} = require('../controller/paymentController.js');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// ── Razorpay ──────────────────────────────────────────────────────────────
router.post('/razorpay/order',    isAuthenticated, createRazorpayOrder);
router.post('/razorpay/verify',   updateOrderPayment);
router.post('/razorpay/callback', razorpayCallback);
router.post('/razorpay/webhook',  express.raw({ type: 'application/json' }), razorpayWebhook);

// ── Guest Razorpay ────────────────────────────────────────────────────────
router.post('/guest/razorpay/order', createRazorpayOrder);

// ── User ──────────────────────────────────────────────────────────────────
router.get('/my-payments',        isAuthenticated, getUserPayments);
router.get('/status/:paymentId',  isAuthenticated, getPaymentStatus);
router.post('/failed',            handlePaymentFailure);

// ── Admin ─────────────────────────────────────────────────────────────────
router.get('/',                   isAuthenticated, isOrderManager, getAllPayments);
router.post('/refund',            isAuthenticated, isOrderManager, refundPayment);

module.exports = router;
