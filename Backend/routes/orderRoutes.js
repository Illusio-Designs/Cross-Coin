const express = require('express');
const {
    getAllOrders, getUserOrders, getOrder, updateOrderStatus,
    createOrder, createGuestOrder,
    trackOrderByAWB, trackOrderByOrderNumber,
    cancelOrder, adminCancelOrder, adminDeleteOrder, confirmOrder,
    getOrderStats, updateAwbNumber, initiateReturn,
    adminCreateManualOrder,
} = require('../controller/orderController.js');
// checkAddressQuality has been migrated to the domain-grouped file.
const { checkAddressQuality } = require('../controller/orders/createController.js');
const {
    cancelOrdersInFShip,
    getFShipTrackingForOrder, getFShipLabelForOrder, getFShipCouriers,
    syncOrdersWithFShip, handleFShipWebhook, syncSingleOrderWithFShip,
    bulkRefreshFShipStatus,
    validateOrderForShipping, getAvailableCouriers, syncWithCourier,
    generateLabel, generateLabelForOrder, downloadOrderLabel,
    requeueFailedShipments,
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
const { validateBody: zValidateBody, validateQuery: zValidateQuery, z, schemas: zSchemas } = require('../middleware/validate.js');
const { verifyWebhookSignature } = require('../middleware/webhookSignature.js');

const router = express.Router();

// ── Zod schemas for newer endpoints (legacy uses utils/validate.js) ─
const checkAddressQualitySchema = z.object({
  line1: z.string().trim().min(5, 'Address line 1 is too short').max(500),
  line2: z.string().trim().max(255).optional(),
  landmark: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  pincode: zSchemas.indianPincode,
  phone: zSchemas.indianPhone.optional(),
});

const returnOrderSchema = z.object({
  reason: z.string().trim().min(5, 'Return reason must be at least 5 characters').max(500),
});

const updateAwbSchema = z.object({
  awb_number: z.string().trim().min(5, 'AWB looks too short').max(50),
  courier_name: z.string().trim().max(100).optional(),
});

// Accept the AWB under either query name — the storefront sends `awb_number`,
// while the docs/curl use `awb`. Require at least one.
const trackByAwbSchema = z.object({
  awb: z.string().trim().min(5).max(50).optional(),
  awb_number: z.string().trim().min(5).max(50).optional(),
}).refine((d) => !!(d.awb || d.awb_number), { message: 'awb (or awb_number) is required' });

// ── Admin / Order Manager ─────────────────────────────────────────────────
router.get('/',                          isAuthenticated, isOrderManager, getAllOrders);
router.get('/stats',                     isAuthenticated, isOrderManager, getOrderStats);
router.get('/export/delivered',          isAuthenticated, isOrderManager, exportDeliveredOrders);
// ── Shipping (provider-agnostic, dispatches via SHIPPING_PROVIDER setting) ───
// The /shipping/* paths are the canonical names. The /fship/* paths are
// kept as aliases so existing dashboard JS keeps working.
router.post('/shipping/sync',           isAuthenticated, isOrderManager, syncOrdersWithFShip);
router.post('/shipping/refresh-status', isAuthenticated, isOrderManager, bulkRefreshFShipStatus);
router.post('/shipping/cancel',         isAuthenticated, isOrderManager, cancelOrdersInFShip);
router.get('/shipping/couriers',        isAuthenticated, isOrderManager, getFShipCouriers);
// Legacy aliases (deprecated — use /shipping/*).
router.post('/fship/sync',              isAuthenticated, isOrderManager, syncOrdersWithFShip);
router.post('/fship/refresh-status',    isAuthenticated, isOrderManager, bulkRefreshFShipStatus);
router.post('/fship/cancel',            isAuthenticated, isOrderManager, cancelOrdersInFShip);
router.get('/fship/couriers',           isAuthenticated, isOrderManager, getFShipCouriers);
router.post('/labels/generate',         isAuthenticated, isOrderManager, generateLabel);
router.get('/:id/labels/generate',      isAuthenticated, isOrderManager, generateLabelForOrder);
router.post('/:id/labels/generate',     isAuthenticated, isOrderManager, generateLabelForOrder);
router.get('/labels/download/:labelId', isAuthenticated, isOrderManager, downloadOrderLabel);
router.get('/labels/pending',           isAuthenticated, isOrderManager, getPendingLabels);
router.get('/labels/stats',             isAuthenticated, isOrderManager, getLabelDownloadStats);
router.post('/labels/bulk-download',    isAuthenticated, isOrderManager, bulkDownloadLabels);
router.post('/labels/:orderId/downloaded', isAuthenticated, isOrderManager, markLabelDownloaded);
router.get('/labels/:orderId/download', isAuthenticated, isOrderManager, downloadLabel);
router.put('/:id/shipping/sync',       isAuthenticated, isOrderManager, syncSingleOrderWithFShip);
router.put('/:id/fship/sync',          isAuthenticated, isOrderManager, syncSingleOrderWithFShip);  // legacy alias
router.get('/:id/shipping/validate',   isAuthenticated, isOrderManager, validateOrderForShipping);
router.get('/:id/shipping/couriers',   isAuthenticated, isOrderManager, getAvailableCouriers);
router.post('/:id/sync-with-courier',  isAuthenticated, isOrderManager, syncWithCourier);
router.post('/shipping/requeue-failed', isAuthenticated, isOrderManager, requeueFailedShipments);
router.put('/:id/confirm',             isAuthenticated, isOrderManager, confirmOrder);
router.put('/:id/admin-cancel',        isAuthenticated, isOrderManager, validateBody(schemas.cancelOrder), adminCancelOrder);
router.delete('/:id',                  isAuthenticated, isOrderManager, adminDeleteOrder);
router.put('/:id/awb',                 isAuthenticated, isOrderManager, zValidateBody(updateAwbSchema), updateAwbNumber);
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
router.get('/track/awb',                zValidateQuery(trackByAwbSchema), trackOrderByAWB);
router.get('/track/:order_number',      trackOrderByOrderNumber);
// Pre-checkout: client sends a typed address and gets back the COD
// recommendation BEFORE picking a payment method (so we don't bail
// the user out at submit time).
router.post('/check-address-quality',   zValidateBody(checkAddressQualitySchema), checkAddressQuality);
// Shipping webhook (provider-agnostic). Uses the 'shipping' source which
// tries iThink + FShip secrets in order and accepts whichever matches —
// so the brand can toggle SHIPPING_PROVIDER without re-routing webhooks.
// Both /shipping/webhook and /fship/webhook (legacy) hit the same handler.
router.post('/shipping/webhook',        verifyWebhookSignature('shipping'), handleFShipWebhook);
router.post('/fship/webhook',           verifyWebhookSignature('fship'),    handleFShipWebhook);  // legacy alias

// ── Authenticated user ────────────────────────────────────────────────────
router.post('/',                        isAuthenticated, createOrder);
router.get('/my-orders',                isAuthenticated, getUserOrders);
router.get('/:id',                      isAuthenticated, getOrder);
router.put('/:id/cancel',              isAuthenticated, validateBody(schemas.cancelOrder), cancelOrder);
router.post('/:id/return',             isAuthenticated, zValidateBody(returnOrderSchema), initiateReturn);
router.get('/:id/fship/tracking',      isAuthenticated, getFShipTrackingForOrder);
router.get('/:id/fship/label',         isAuthenticated, getFShipLabelForOrder);

module.exports = router;
