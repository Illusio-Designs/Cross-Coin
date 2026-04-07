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
    cancelGuestOrder,
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
    updateAwbNumber,
    initiateReturn,
    // Label management functions
    markLabelDownloaded,
    downloadLabel,
    bulkDownloadLabels,
    getPendingLabels,
    getLabelDownloadStats
} = require('../controller/orderController.js');
const { isAuthenticated, authorize, isOrderManager } = require('../middleware/authMiddleware.js');

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

// Admin/Order Manager routes (specific routes first)
router.get('/', isAuthenticated, isOrderManager, getAllOrders);
router.get('/stats/overview', isAuthenticated, isOrderManager, getOrderStats);
router.get('/export/delivered', isAuthenticated, isOrderManager, exportDeliveredOrders);
router.post('/fship/sync', isAuthenticated, isOrderManager, syncOrdersWithFShip);
router.post('/fship/cancel', isAuthenticated, isOrderManager, cancelOrdersInFShip);
router.get('/fship/couriers', isAuthenticated, isOrderManager, getFShipCouriers);

// Label management routes
router.get('/labels/pending', isAuthenticated, isOrderManager, getPendingLabels);
router.get('/labels/stats', isAuthenticated, isOrderManager, getLabelDownloadStats);
router.post('/labels/bulk-download', isAuthenticated, isOrderManager, bulkDownloadLabels);
router.post('/labels/:orderId/mark-downloaded', isAuthenticated, isOrderManager, markLabelDownloaded);
router.get('/labels/:orderId/download', isAuthenticated, isOrderManager, downloadLabel);

router.put('/:id/fship/sync', isAuthenticated, isOrderManager, syncSingleOrderWithFShip);
router.put('/:id/admin/cancel', isAuthenticated, isOrderManager, adminCancelOrder);
router.put('/:id/awb', isAuthenticated, isOrderManager, updateAwbNumber);

// Guest checkout route (no authentication required)
router.post('/guest', createGuestOrder);
router.get('/guest/track', getGuestOrder);
router.post('/guest/cancel', cancelGuestOrder);

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
router.post('/:id/return', isAuthenticated, initiateReturn);
router.put('/:id/status', isAuthenticated, isOrderManager, updateOrderStatus);
router.get('/:id/fship/tracking', isAuthenticated, getFShipTrackingForOrder);
router.get('/:id/fship/label', isAuthenticated, getFShipLabelForOrder);

module.exports = router;