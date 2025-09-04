const express = require('express');
const {
    getAllOrders,
    getUserOrders,
    getOrder,
    updateOrderStatus,
    createOrder,
    createGuestOrder,
    getGuestOrder,
    cancelOrder,
    getOrderStats,
    getShiprocketTrackingForOrder,
    getShiprocketLabelForOrder,
    getAllShiprocketOrders,
    syncOrdersWithShiprocket,
    testShiprocketCredentials
} = require('../controller/orderController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Debug middleware to log all requests
router.use((req, res, next) => {
    console.log(`[Orders Route] ${req.method} ${req.path}`);
    next();
});

// Test route to verify router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Orders router is working' });
});

// Admin routes (specific routes first)
router.get('/', isAuthenticated, authorize(['admin']), getAllOrders);
router.get('/stats/overview', isAuthenticated, authorize(['admin']), getOrderStats);
router.get('/shiprocket/all', isAuthenticated, authorize(['admin']), getAllShiprocketOrders);
router.post('/shiprocket/sync', isAuthenticated, authorize(['admin']), syncOrdersWithShiprocket);
router.get('/shiprocket/test-credentials', isAuthenticated, authorize(['admin']), testShiprocketCredentials);

// Guest checkout route (no authentication required)
router.post('/guest', createGuestOrder);
router.get('/guest/track', getGuestOrder);

// Protected routes (parameter routes last)
router.post('/', isAuthenticated, createOrder);
router.get('/my-orders', isAuthenticated, getUserOrders);
router.get('/:id', isAuthenticated, getOrder);
router.put('/:id/cancel', isAuthenticated, cancelOrder);
router.put('/:id/status', isAuthenticated, authorize(['admin']), updateOrderStatus);
router.get('/:id/shiprocket/tracking', isAuthenticated, getShiprocketTrackingForOrder);
router.get('/:id/shiprocket/label', isAuthenticated, getShiprocketLabelForOrder);

module.exports = router;