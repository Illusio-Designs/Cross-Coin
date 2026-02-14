const express = require('express');
const {
    getAllOrders,
    getUserOrders,
    getOrder,
    updateOrderStatus,
    createOrder,
    createGuestOrder,
    getGuestOrder,
    trackOrderByAWB,
    trackOrderByOrderNumber,
    cancelOrder,
    adminCancelOrder,
    cancelOrdersInFShip,
    getOrderStats,
    getFShipTrackingForOrder,
    getFShipLabelForOrder,
    getFShipCouriers,
    syncOrdersWithFShip,
    handleFShipWebhook,
    syncSingleOrderWithFShip,
    exportDeliveredOrders,
    updateAwbNumber
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
router.get('/export/delivered', isAuthenticated, authorize(['admin']), exportDeliveredOrders);
router.post('/fship/sync', isAuthenticated, authorize(['admin']), syncOrdersWithFShip);
router.post('/fship/cancel', isAuthenticated, authorize(['admin']), cancelOrdersInFShip);
router.get('/fship/couriers', isAuthenticated, authorize(['admin']), getFShipCouriers);
router.put('/:id/fship/sync', isAuthenticated, authorize(['admin']), syncSingleOrderWithFShip);
router.put('/:id/admin/cancel', isAuthenticated, authorize(['admin']), adminCancelOrder);
router.put('/:id/awb', isAuthenticated, authorize(['admin']), updateAwbNumber);

// Guest checkout route (no authentication required)
router.post('/guest', createGuestOrder);
router.get('/guest/track', getGuestOrder);

// Public order tracking by AWB (no authentication required)
router.get('/track/awb', trackOrderByAWB);

// Public order tracking by order number (no authentication required)
router.get('/track/:order_number', trackOrderByOrderNumber);

// FShip webhook (no authentication required)
router.post('/fship/webhook', handleFShipWebhook);

// Protected routes (parameter routes last)
router.post('/', isAuthenticated, createOrder);
router.get('/my-orders', isAuthenticated, getUserOrders);
router.get('/:id', isAuthenticated, getOrder);
router.put('/:id/cancel', isAuthenticated, cancelOrder);
router.put('/:id/status', isAuthenticated, authorize(['admin']), updateOrderStatus);
router.get('/:id/fship/tracking', isAuthenticated, getFShipTrackingForOrder);
router.get('/:id/fship/label', isAuthenticated, getFShipLabelForOrder);

module.exports = router;