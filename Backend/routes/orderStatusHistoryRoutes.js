const express = require('express');
const {
    getOrderStatusHistory,
    addOrderStatusEntry,
    getAllOrderStatusHistory
} = require('../controller/orderStatusHistoryController.js');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Route to get all status history records (admin only)
router.get('/', isAuthenticated, isAdmin, getAllOrderStatusHistory);

// Routes for specific order status history
router.get('/order/:orderId', isAuthenticated, getOrderStatusHistory);
router.post('/order/:orderId', isAuthenticated, isAdmin, addOrderStatusEntry);

module.exports = router; 