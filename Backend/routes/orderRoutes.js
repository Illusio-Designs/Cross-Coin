const express = require('express');
const {
    getAllOrders, getUserOrders, getOrder, updateOrderStatus,
    createOrder, createGuestOrder,
    trackOrderByAWB, trackOrderByOrderNumber,
    cancelOrder, adminCancelOrder, confirmOrder,
    getOrderStats, updateAwbNumber, initiateReturn,
    adminCreateManualOrder,
} = require('../controller/orderController.js');
const {
    cancelOrdersInFShip,
    getFShipTrackingForOrder, getFShipLabelForOrder, getFShipCouriers,
    syncOrdersWithFShip, handleFShipWebhook, syncSingleOrderWithFShip,
    bulkRefreshFShipStatus,
    validateOrderForShipping, getAvailableCouriers, syncWithCourier,
    generateManifest, downloadManifest,
} = require('../controller/orderShippingController.js');
const {
    exportDeliveredOrders,
    markLabelDownloaded, downloadLabel, bulkDownloadLabels,
    getPendingLabels, getLabelDownloadStats,
} = require('../controller/orderLabelController.js');
const {
    markOrderAsRTO, getRTOOrders, getRTOStats,
    bulkMarkOrdersAsRTO, getStockRestorationHistory,
} = require('../controller/orderRTOController.js');
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
router.post('/manifest/generate',       isAuthenticated, isOrderManager, generateManifest);
router.get('/manifest/download/:manifestId', isAuthenticated, isOrderManager, downloadManifest);
router.get('/labels/pending',           isAuthenticated, isOrderManager, getPendingLabels);
router.get('/labels/stats',             isAuthenticated, isOrderManager, getLabelDownloadStats);
router.post('/labels/bulk-download',    isAuthenticated, isOrderManager, bulkDownloadLabels);
router.post('/labels/:orderId/downloaded', isAuthenticated, isOrderManager, markLabelDownloaded);
router.get('/labels/:orderId/download', isAuthenticated, isOrderManager, downloadLabel);
router.put('/:id/fship/sync',          isAuthenticated, isOrderManager, syncSingleOrderWithFShip);
router.get('/:id/shipping/validate',   isAuthenticated, isOrderManager, validateOrderForShipping);
router.get('/:id/shipping/couriers',   isAuthenticated, isOrderManager, getAvailableCouriers);
router.post('/:id/sync-with-courier',  isAuthenticated, isOrderManager, syncWithCourier);
router.put('/:id/confirm',             isAuthenticated, isOrderManager, confirmOrder);
router.put('/:id/admin-cancel',        isAuthenticated, isOrderManager, validateBody(schemas.cancelOrder), adminCancelOrder);
router.put('/:id/awb',                 isAuthenticated, isOrderManager, updateAwbNumber);
router.put('/:id/status',              isAuthenticated, isOrderManager, updateOrderStatus);
router.post('/manual',                  isAuthenticated, isOrderManager, adminCreateManualOrder);

// ── RTO ───────────────────────────────────────────────────────────────────
router.get('/rto',                       isAuthenticated, isOrderManager, getRTOOrders);
router.get('/rto/stats',                 isAuthenticated, isOrderManager, getRTOStats);
router.get('/rto/stock-restoration',     isAuthenticated, isOrderManager, getStockRestorationHistory);
router.post('/rto/bulk',                 isAuthenticated, isOrderManager, bulkMarkOrdersAsRTO);
router.put('/:id/rto',                   isAuthenticated, isOrderManager, markOrderAsRTO);

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
