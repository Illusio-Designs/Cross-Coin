const express = require('express');
const {
    createRazorpayOrder, updateOrderPayment, razorpayCallback,
    razorpayWebhook, handlePaymentFailure,
    refundPayment, getAllPayments, getUserPayments, getPaymentStatus
} = require('../controller/paymentController.js');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');
const magicCtrl = require('../controller/magicCheckoutController.js');

const router = express.Router();

// ── Razorpay Magic Checkout callbacks (server-to-server, public) ────────────
// Razorpay's Magic dashboard calls these URLs during checkout. They mirror the
// canonical handlers at /api/magic/* so the dashboard can use either naming:
//   Shipping info    → https://api.crosscoin.in/api/payments/magic-checkout/shipping-info
//   Get promotions   → https://api.crosscoin.in/api/payments/magic-checkout/promotions
//   Apply promotion  → https://api.crosscoin.in/api/payments/magic-checkout/apply-promotion
router.post('/magic-checkout/shipping-info',   magicCtrl.shippingInfo);
router.post('/magic-checkout/promotions',      magicCtrl.getCoupons);
router.post('/magic-checkout/apply-promotion', magicCtrl.applyCoupon);

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
