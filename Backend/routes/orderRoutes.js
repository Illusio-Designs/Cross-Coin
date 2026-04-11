const express = require('express');
const {
    getAllOrders, getUserOrders, getOrder, updateOrderStatus,
    createOrder, createGuestOrder,
    trackOrderByAWB, trackOrderByOrderNumber,
    cancelOrder, adminCancelOrder, confirmOrder,
    cancelOrdersInFShip, getOrderStats,
    getFShipTrackingForOrder, getFShipLabelForOrder, getFShipCouriers,
    syncOrdersWithFShip, handleFShipWebhook, syncSingleOrderWithFShip,
    bulkRefreshFShipStatus,
    exportDeliveredOrders, updateAwbNumber, initiateReturn,
    markLabelDownloaded, downloadLabel, bulkDownloadLabels, getPendingLabels, getLabelDownloadStats
} = require('../controller/orderController.js');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');
const { validateBody, schemas } = require('../utils/validate.js');

const router = express.Router();

// ── Admin / Order Manager ─────────────────────────────────────────────────
router.get('/',                          isAuthenticated, isOrderManager, getAllOrders);
router.get('/stats',                     isAuthenticated, isOrderManager, getOrderStats);
router.get('/export/delivered',          isAuthenticated, isOrderManager, exportDeliveredOrders);
router.post('/fship/sync',              isAuthenticated, isOrderManager, syncOrdersWithFShip);
router.post('/fship/refresh-status',    isAuthenticated, isOrderManager, bulkRefreshFShipStatus);
router.post('/fship/cancel',            isAuthenticated, isOrderManager, cancelOrdersInFShip);
router.get('/fship/couriers',           isAuthenticated, isOrderManager, getFShipCouriers);
router.get('/labels/pending',           isAuthenticated, isOrderManager, getPendingLabels);
router.get('/labels/stats',             isAuthenticated, isOrderManager, getLabelDownloadStats);
router.post('/labels/bulk-download',    isAuthenticated, isOrderManager, bulkDownloadLabels);
router.post('/labels/:orderId/downloaded', isAuthenticated, isOrderManager, markLabelDownloaded);
router.get('/labels/:orderId/download', isAuthenticated, isOrderManager, downloadLabel);
router.put('/:id/fship/sync',          isAuthenticated, isOrderManager, syncSingleOrderWithFShip);
router.put('/:id/confirm',             isAuthenticated, isOrderManager, confirmOrder);
router.put('/:id/admin-cancel',        isAuthenticated, isOrderManager, validateBody(schemas.cancelOrder), adminCancelOrder);
router.put('/:id/awb',                 isAuthenticated, isOrderManager, updateAwbNumber);
router.put('/:id/status',              isAuthenticated, isOrderManager, updateOrderStatus);

// ── Public ────────────────────────────────────────────────────────────────
router.post('/guest-checkout',          validateBody(schemas.checkout), createGuestOrder);
router.get('/track/awb',                trackOrderByAWB);
router.get('/track/:order_number',      trackOrderByOrderNumber);
router.post('/fship/webhook',           handleFShipWebhook);

// ── Authenticated user ────────────────────────────────────────────────────
router.post('/',                        isAuthenticated, createOrder);
router.get('/my-orders',                isAuthenticated, getUserOrders);
router.get('/:id',                      isAuthenticated, getOrder);
router.put('/:id/cancel',              isAuthenticated, validateBody(schemas.cancelOrder), cancelOrder);
router.post('/:id/return',             isAuthenticated, initiateReturn);
router.get('/:id/fship/tracking',      isAuthenticated, getFShipTrackingForOrder);
router.get('/:id/fship/label',         isAuthenticated, getFShipLabelForOrder);

module.exports = router;
