const express = require('express');
const {
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
    refundPayment,
    getAllPayments,
    getUserPayments,
    createRazorpayOrder,
    updateOrderPayment,
    razorpayCallback,
    handlePaymentFailure,
    razorpayWebhook
} = require('../controller/paymentController.js');
const { isAuthenticated, authorize, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Protected routes
router.post('/create-payment-intent', isAuthenticated, createPaymentIntent);
router.post('/confirm/:paymentIntentId', isAuthenticated, confirmPayment);
router.get('/status/:paymentIntentId', isAuthenticated, getPaymentStatus);
router.get('/my-payments', isAuthenticated, getUserPayments);
router.post('/razorpay-order', isAuthenticated, createRazorpayOrder);
router.post('/razorpay-callback', razorpayCallback);

// Guest routes (no authentication required)
router.post('/guest/razorpay-order', createRazorpayOrder);

// Public routes (no authentication required for payment updates)
router.post('/update-order-payment', updateOrderPayment);
router.post('/payment-failed', handlePaymentFailure);

// Razorpay webhook — express.raw() scoped here only so JSON parsing on other routes is unaffected
router.post('/razorpay-webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// Order Manager routes
router.get('/', isAuthenticated, isOrderManager, getAllPayments);
router.post('/refund/:paymentId', isAuthenticated, isOrderManager, refundPayment);

module.exports = router; 