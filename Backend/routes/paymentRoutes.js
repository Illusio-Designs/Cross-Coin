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
    createMagicCheckoutOrder,
    verifyMagicCheckoutPayment
} = require('../controller/paymentController.js');
const {
    getPromotions,
    applyPromotion,
    getShippingInfo,
    createOrder,
    verifyPayment
} = require('../controller/magicCheckoutController.js');
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

// Magic Checkout routes — all POST, no auth (Razorpay calls promotions/shipping directly)
router.post('/magic-checkout/create-order', createOrder);
router.post('/magic-checkout/verify-payment', verifyPayment);
router.post('/magic-checkout/promotions', getPromotions);
router.post('/magic-checkout/apply-promotion', applyPromotion);
router.post('/magic-checkout/shipping-info', getShippingInfo);

// Public routes (no authentication required for payment updates)
router.post('/update-order-payment', updateOrderPayment);

// Order Manager routes
router.get('/', isAuthenticated, isOrderManager, getAllPayments);
router.post('/refund/:paymentId', isAuthenticated, isOrderManager, refundPayment);

module.exports = router; 