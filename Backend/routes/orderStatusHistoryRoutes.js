const express = require('express');
const {
    getOrderStatusHistory,
    addOrderStatusEntry,
    getAllOrderStatusHistory
} = require('../controller/orderStatusHistoryController.js');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Order Manager routes
router.get('/', isAuthenticated, isOrderManager, getAllOrderStatusHistory);

// Routes for specific order status history
router.get('/order/:orderId', isAuthenticated, getOrderStatusHistory);
router.post('/order/:orderId', isAuthenticated, isOrderManager, addOrderStatusEntry);

module.exports = router; 