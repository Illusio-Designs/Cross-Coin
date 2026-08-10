const express = require('express');
const {
    getAllOrders, getUserOrders, getOrder, updateOrderStatus,
    createOrder, createGuestOrder,
    trackOrderByAWB, trackOrderByOrderNumber,
    cancelOrder, adminCancelOrder, adminDeleteOrder, confirmOrder,
    updateAwbNumber, initiateReturn,
    adminCreateManualOrder, updateOrderAddress,
} = require('../controller/orderController.js');
// checkAddressQuality has been migrated to the domain-grouped file.
const { checkAddressQuality } = require('../controller/orders/createController.js');
const {
    cancelOrdersInFShip,
    getFShipTrackingForOrder, getFShipLabelForOrder, getFShipCouriers,
    handleFShipWebhook, syncSingleOrderWithFShip,
    bulkRefreshFShipStatus,
    getAvailableCouriers, syncWithCourier,
    generateLabelForOrder,
} = require('../controller/orderShippingController.js');
const {
    exportDeliveredOrders, exportDeliveredGSTReport,
    markLabelDownloaded, downloadLabel, bulkDownloadLabels,
    getPendingLabels, getLabelDownloadStats,
} = require('../controller/orderLabelController.js');
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
router.get('/export/delivered',          isAuthenticated, isOrderManager, exportDeliveredOrders);
router.get('/export/gst-report',         isAuthenticated, isOrderManager, exportDeliveredGSTReport);
// ── Shipping (provider-agnostic, dispatches via SHIPPING_PROVIDER setting) ───
router.post('/shipping/refresh-status', isAuthenticated, isOrderManager, bulkRefreshFShipStatus);
router.post('/shipping/cancel',         isAuthenticated, isOrderManager, cancelOrdersInFShip);
router.get('/shipping/couriers',        isAuthenticated, isOrderManager, getFShipCouriers);
router.get('/:id/labels/generate',      isAuthenticated, isOrderManager, generateLabelForOrder);
router.post('/:id/labels/generate',     isAuthenticated, isOrderManager, generateLabelForOrder);
router.get('/labels/pending',           isAuthenticated, isOrderManager, getPendingLabels);
router.get('/labels/stats',             isAuthenticated, isOrderManager, getLabelDownloadStats);
router.post('/labels/bulk-download',    isAuthenticated, isOrderManager, bulkDownloadLabels);
router.post('/labels/:orderId/downloaded', isAuthenticated, isOrderManager, markLabelDownloaded);
router.get('/labels/:orderId/download', isAuthenticated, isOrderManager, downloadLabel);
router.put('/:id/shipping/sync',       isAuthenticated, isOrderManager, syncSingleOrderWithFShip);
router.get('/:id/shipping/couriers',   isAuthenticated, isOrderManager, getAvailableCouriers);
router.post('/:id/sync-with-courier',  isAuthenticated, isOrderManager, syncWithCourier);
router.put('/:id/confirm',             isAuthenticated, isOrderManager, confirmOrder);
router.put('/:id/admin-cancel',        isAuthenticated, isOrderManager, validateBody(schemas.cancelOrder), adminCancelOrder);
router.delete('/:id',                  isAuthenticated, isOrderManager, adminDeleteOrder);
router.put('/:id/awb',                 isAuthenticated, isOrderManager, zValidateBody(updateAwbSchema), updateAwbNumber);
router.put('/:id/address',             isAuthenticated, isOrderManager, updateOrderAddress);
router.put('/:id/status',              isAuthenticated, isOrderManager, updateOrderStatus);
router.post('/manual',                  isAuthenticated, isOrderManager, adminCreateManualOrder);
// (RTO management module removed — RTO is handled automatically by the courier
//  webhook in orderShippingController: it sets RTO status, restores stock and
//  refunds prepaid orders. The old standalone /rto endpoints were unused.)

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
router.get('/:id/shipping/tracking',   isAuthenticated, getFShipTrackingForOrder);
router.get('/:id/shipping/label',      isAuthenticated, getFShipLabelForOrder);

module.exports = router;
