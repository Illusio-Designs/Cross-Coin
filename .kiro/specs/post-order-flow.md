# Post-Order Creation Flow

## Overview
Everything that happens after `createOrder` / `createGuestOrder` commits successfully.

---

## Synchronous (before response is sent)

| Step | What | Where |
|------|------|-------|
| 1 | DB transaction commits | `orderController.js` |
| 2 | Real-time socket notification → admin dashboard | `notificationService.emitNewOrder()` |
| 3 | Badge recalculation job enqueued (async queue) | `BadgeService.enqueueBadgeRecalculation()` |
| 4 | Full order re-fetched with items, user, status history | `Order.findByPk()` |
| 5 | FShip order data prepared, `fship_sync_status` → `syncing` | `orderController.js` |
| 6 | **Response sent to client** `201 Created` | — |

---

## Async — Fire & Forget (after response, via `setImmediate`)

### FShip (Shipping)
- Calls `fshipService.createOrUpdateForwardOrder()` with customer + item + dimension data
- On success: stores `fship_order_id`, `fship_waybill`, `fship_label_url`, `tracking_number` on the order, sets `status → processing`, `fship_sync_status → synced`
- Auto-registers pickup via `fshipService.registerPickup()`
- On failure: sets `fship_sync_status → failed` (cron job retries up to 5 attempts)

### WhatsApp
- Sends order confirmation message to customer phone
- COD only: also sends a COD-specific message with address summary

### Analytics (Facebook CAPI + GA4)
- `AddShippingInfo` → fires for **all** orders
- COD only: `InitiateCheckout` + `AddPaymentInfo` + `Purchase` fire here
- Prepaid: `Purchase` fires later in `updateOrderPayment` after Razorpay signature is verified

### Dashboard Cache
- `invalidateDashboardCache()` called to bust admin dashboard stats

---

## FShip Webhook (async, Razorpay-independent)
After FShip picks up the order, all further status transitions are owned by FShip:

```
processing → booked → pickup initiated → manifested
→ in transit → shipped → out for delivery → delivered
                                          → undelivered → rto → rto delivered
```

On each webhook event:
- Order status updated via `fshipService.mapFShipStatusToCrossCoin()`
- `OrderStatusHistory` entry created
- WhatsApp notification sent (shipped / out for delivery / delivered / cancelled)
- On `delivered`: loyalty points credited to registered user
- On `rto`: stock auto-restored, prepaid order flagged for refund

---

## Prepaid-only: After Razorpay Payment (`updateOrderPayment`)
- Razorpay signature verified (HMAC-SHA256)
- `order.payment_status → paid`, `order.status → processing`
- Payment record updated/created with `razorpay_order_id`, `transaction_id`, `signature`
- `Purchase` event fired to Facebook CAPI + GA4

---

## What's Missing / Gaps

| Gap | Risk |
|-----|------|
| No email confirmation sent | Customer has no email receipt |
| FShip order created before prepaid payment confirmed | If `updateOrderPayment` fails, FShip already has a booked order with no paid status |
| Cart not cleared server-side | Only frontend clears cart — server DB cart remains populated |
| Loyalty points only on `delivered` | No points preview or pending credit shown to user |
| No order confirmation for guest users beyond WhatsApp | Guest has no way to look up order if they lose the toast |
