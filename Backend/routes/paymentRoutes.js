const express = require('express');
const {
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
    refundPayment,
    getAllPayments,
    getUserPayments,
    createRazorpayOrder
} = require('../controller/paymentController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Protected routes
router.post('/create-payment-intent', isAuthenticated, createPaymentIntent);
router.post('/confirm/:paymentIntentId', isAuthenticated, confirmPayment);
router.get('/status/:paymentIntentId', isAuthenticated, getPaymentStatus);
router.get('/my-payments', isAuthenticated, getUserPayments);
router.post('/razorpay-order', isAuthenticated, createRazorpayOrder);

// Admin routes
router.get('/', isAuthenticated, authorize(['admin']), getAllPayments);
router.post('/refund/:paymentId', isAuthenticated, authorize(['admin']), refundPayment);

module.exports = router; 