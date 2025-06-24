import express from 'express';
import { 
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
    refundPayment,
    getAllPayments,
    getUserPayments,
    createRazorpayOrder
} from '../controller/paymentController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';

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

export default router; 