const express = require('express');
const {
    createOrder,
    getAllOrders,
    getOrder,
    updateOrderStatus,
    cancelOrder,
    getUserOrders,
    getOrderStats,
    getShiprocketTrackingForOrder,
    getShiprocketLabelForOrder
} = require('../controller/orderController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Protected routes
router.post('/', isAuthenticated, createOrder);
router.get('/my-orders', isAuthenticated, getUserOrders);
router.get('/:id', isAuthenticated, getOrder);
router.put('/:id/cancel', isAuthenticated, cancelOrder);
router.get('/:id/shiprocket/tracking', isAuthenticated, getShiprocketTrackingForOrder);
router.get('/:id/shiprocket/label', isAuthenticated, getShiprocketLabelForOrder);

// Admin routes
router.get('/', isAuthenticated, authorize(['admin']), getAllOrders);
router.put('/:id/status', isAuthenticated, authorize(['admin']), updateOrderStatus);
router.get('/stats/overview', isAuthenticated, authorize(['admin']), getOrderStats);

module.exports = router; 