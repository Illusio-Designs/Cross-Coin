import express from 'express';
import { 
    createOrder,
    getAllOrders,
    getOrder,
    updateOrderStatus,
    cancelOrder,
    getUserOrders,
    getOrderStats
} from '../controller/orderController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes
router.post('/', isAuthenticated, createOrder);
router.get('/my-orders', isAuthenticated, getUserOrders);
router.get('/:id', isAuthenticated, getOrder);
router.put('/:id/cancel', isAuthenticated, cancelOrder);

// Admin routes
router.get('/', isAuthenticated, authorize(['admin']), getAllOrders);
router.put('/:id/status', isAuthenticated, authorize(['admin']), updateOrderStatus);
router.get('/stats/overview', isAuthenticated, authorize(['admin']), getOrderStats);

export default router; 