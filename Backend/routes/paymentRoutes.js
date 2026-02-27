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
    getShippingInfo
} = require('../controller/magicCheckoutController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

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

// Magic Checkout routes (support both authenticated and guest access)
router.post('/magic-checkout/create-order', createMagicCheckoutOrder);
router.post('/magic-checkout/verify-payment', verifyMagicCheckoutPayment);
router.get('/magic-checkout/promotions', getPromotions);
router.post('/magic-checkout/apply-promotion', applyPromotion);
router.post('/magic-checkout/shipping-info', getShippingInfo);

// Public routes (no authentication required for payment updates)
router.post('/update-order-payment', updateOrderPayment);

// Admin routes
router.get('/', isAuthenticated, authorize(['admin']), getAllPayments);
router.post('/refund/:paymentId', isAuthenticated, authorize(['admin']), refundPayment);

module.exports = router; 