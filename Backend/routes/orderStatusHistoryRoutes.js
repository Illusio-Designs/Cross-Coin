import express from 'express';
import { 
    getOrderStatusHistory,
    addOrderStatusEntry,
    getAllOrderStatusHistory
} from '../controller/orderStatusHistoryController.js';
import { isAuthenticated, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to get all status history records (admin only)
router.get('/', isAuthenticated, isAdmin, getAllOrderStatusHistory);

// Routes for specific order status history
router.get('/order/:orderId', isAuthenticated, getOrderStatusHistory);
router.post('/order/:orderId', isAuthenticated, isAdmin, addOrderStatusEntry);

export default router; 