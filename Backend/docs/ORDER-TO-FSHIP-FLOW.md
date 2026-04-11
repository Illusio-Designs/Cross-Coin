# Order → FShip Shipping Flow

> Complete documentation of how orders are created, synced to FShip, and tracked.
> Last updated: April 2026

---

## 1. Order Creation — Two Flows

### A. Prepaid (Payment-First)

```
Customer → POST /api/checkout/initiate → Reserve stock (Redis, 10min TTL)
         → Create Razorpay order → Customer pays
         → Payment verified (3 paths: client verify / callback / webhook)
         → orderCreationService.createOrderFromSession()
         → Order created with status = "confirmed"
         → Stock deducted from DB, Redis reservation released
         → order.confirmed event emitted
```

**Key files:** `checkoutController.js`, `orderCreationService.js`, `paymentController.js`

### B. COD (Cash-on-Delivery)

```
Customer → POST /api/orders → Validate address + stock
         → Order created with status = "awaiting_confirmation"
         → Stock deducted immediately
         → Admin manually reviews RTO risk score → confirms order
         → order.confirmed event emitted
```

**Key file:** `orderController.createOrder()`

---

## 2. Order → FShip Sync

### Trigger Mechanisms

| Trigger | When | Limit |
|---------|------|-------|
| Cron job | Every 2 hours | 50 orders per run |
| Admin manual | `POST /api/orders/fship/sync` | Configurable via `?limit=` |
| Single order | `PUT /api/orders/:id/fship/sync` | 1 order |

### Sync Eligibility Criteria

Orders are picked for sync when ALL of these are true:
- `status` NOT IN (`awaiting_confirmation`, `pending`, `cancelled`, `delivered`, `rto delivered`)
- `order_number` does NOT contain "TEST"
- `fship_sync_status` IN (`pending`, `failed`)
- `fship_sync_attempts` < 5

### Sync Flow

```
1. Test FShip API connection
2. Fetch eligible orders (with items, address, user)
3. For each order:
   a. Mark fship_sync_status = "syncing", increment attempt counter
   b. If NOT synced (no fship_order_id + fship_waybill):
      → validateOrderForFShip() — check address, items, customer
      → prepareFShipOrderData() — format payload
      → fshipService.createOrUpdateForwardOrder()
      → Save fship_order_id, fship_waybill, fship_label_url
      → Update order status to "processing"
   c. If ALREADY synced:
      → fshipService.getTrackingHistory(waybill)
      → Map FShip status → CrossCoin status
      → Update order status + payment status
4. Log summary
```

---

## 3. FShip Payload Structure

```javascript
{
  orderId: "CC-XXXXX-XXXXXX",        // order_number
  customer_Name: "John Doe",          // from ShippingAddress.full_name
  customer_Mobile: "9876543210",      // 10-digit, from ShippingAddress.phone
  customer_Address: "123 Main St",    // ShippingAddress.address
  customer_PinCode: "400001",         // ShippingAddress.pincode
  customer_City: "Mumbai",            // ShippingAddress.city
  customer_State: "Maharashtra",      // ShippingAddress.state
  payment_Mode: 1,                    // 1=COD, 2=PREPAID
  express_Type: "surface",            // always "surface"
  shipment_Weight: 0.14,              // 70g per item (in kg)
  shipment_Length: 14,                // fixed 14cm
  shipment_Width: 3,                  // fixed 3cm
  shipment_Height: 10,                // fixed 10cm (NOT multiplied by qty!)
  pick_Address_ID: 227729,            // from brand settings
  products: [{ productName, unitPrice, quantity, sku, ... }],
  courierId: 0                        // auto-selection
}
```

---

## 4. Status Lifecycle

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                                                         ▼
awaiting_confirmation → confirmed → processing → booked → pickup initiated → manifested → in transit
        │                   │                                                                 │
        ▼                   ▼                                                                 ▼
    cancelled           cancelled                                              out for delivery / shipped
                                                                                    │           │
                                                                                    ▼           ▼
                                                                                delivered   undelivered
                                                                                    │           │
                                                                                    ▼           ▼
                                                                            return_initiated   rto
                                                                                    │           │
                                                                                    ▼           ▼
                                                                              returned_rto  rto delivered
```

### Payment Status Auto-Updates

| Order Status | COD Payment | Prepaid Payment |
|---|---|---|
| `delivered` | → `paid` (Payment record created) | No change |
| `cancelled` / `rto` | → `cancelled` | → `refund_pending` |
| `rto delivered` | → `cancelled` | → `refund_pending` |

---

## 5. FShip Status Sync Back

### Webhook (POST /api/orders/fship/webhook)
- ✅ Implemented and functional
- Receives: `waybill`, `status`, `courier_name`, `order_id`, `remark`, `rto_reason`
- Finds order by `fship_waybill` OR `fship_order_id` OR `order_number`
- Maps FShip status → CrossCoin status
- Auto-handles RTO: restores stock, marks payment as refunded/failed, logs to `rto_stock_restoration` table
- Credits loyalty points on `delivered`
- Sends WhatsApp notifications (shipped, delivered, RTO)

### Cron Polling (every 2 hours)
- Calls `getTrackingHistory(waybill)` for already-synced orders
- Updates status + payment status
- Constructs missing label URLs

---

## 6. Order Status Color Scheme

### Current Colors (in `orders.css`) vs Suggested Fix

| Status | Current Color | Problem | Suggested Color | Hex (bg → text) |
|--------|--------------|---------|-----------------|------------------|
| `pending` | 🟡 Amber | ✅ OK | 🟡 Amber (waiting) | `#fef3c7` → `#92400e` |
| `awaiting_confirmation` | ❌ MISSING | No CSS class | 🟠 Orange (needs action) | `#ffedd5` → `#9a3412` |
| `confirmed` | ❌ MISSING | No CSS class | 🔵 Blue (acknowledged) | `#dbeafe` → `#1e40af` |
| `processing` | 🔵 Blue | ✅ OK | 🔵 Blue (in progress) | `#dbeafe` → `#1e40af` |
| `booked` | 🔵 Blue | Same as processing | 🟣 Indigo (courier assigned) | `#e0e7ff` → `#3730a3` |
| `pickup initiated` | 🟣 Indigo | ✅ OK | 🟣 Indigo (pickup stage) | `#e0e7ff` → `#3730a3` |
| `manifested` | 🟢 Teal | ✅ OK | 🩵 Cyan (manifest ready) | `#cffafe` → `#155e75` |
| `in transit` | 🟠 Orange | ✅ OK | 🟠 Orange (moving) | `#fed7aa` → `#9a3412` |
| `shipped` | 🟣 Purple | ❌ Confusing — purple = pickup stage | 🟠 Dark Orange (on the way) | `#fed7aa` → `#7c2d12` |
| `out for delivery` | 🔴 Red | ❌ Red = negative, but this is positive | 🟢 Lime (almost there!) | `#d9f99d` → `#365314` |
| `delivered` | 🟢 Green | ✅ OK | 🟢 Green (success) | `#dcfce7` → `#166534` |
| `undelivered` | 🔴 Light Red | ✅ OK | 🔴 Red (failed attempt) | `#fee2e2` → `#991b1b` |
| `rto` | 🟡 Amber | ✅ OK | 🟡 Amber (returning) | `#fef3c7` → `#92400e` |
| `rto delivered` | 🟢 Green | ❌ Green = success, but RTO is bad | 🟤 Slate (returned to warehouse) | `#e2e8f0` → `#475569` |
| `cancelled` | 🔴 Red | ✅ OK | 🔴 Red (cancelled) | `#fee2e2` → `#991b1b` |
| `order cancelled` | 🔴 Red | ✅ OK | 🔴 Red (cancelled) | `#fee2e2` → `#991b1b` |
| `exception` | 🔴 Dark Red | ✅ OK | 🔴 Dark Red (error) | `#fef2f2` → `#7f1d1d` |
| `return_initiated` | ❌ MISSING | No CSS class | 🟡 Amber (return in progress) | `#fef3c7` → `#92400e` |
| `returned_rto` | ❌ MISSING | No CSS class | 🟤 Slate (returned) | `#e2e8f0` → `#475569` |

### Color Logic

```
🟡 Amber    = Waiting / Needs attention (pending, rto, return_initiated)
🟠 Orange   = Moving / In transit (in transit, shipped, awaiting_confirmation)
🔵 Blue     = Confirmed / Processing (confirmed, processing)
🟣 Indigo   = Courier stage (booked, pickup initiated)
🩵 Cyan     = Manifest ready (manifested)
🟢 Green    = Positive outcome (delivered, out for delivery)
🟢 Lime     = Almost done (out for delivery)
🔴 Red      = Negative outcome (cancelled, undelivered, exception)
🟤 Slate    = Terminal / Returned (rto delivered, returned_rto)
```

### Missing CSS Classes to Add

```css
.status-badge.status-awaiting-confirmation { }
.status-badge.status-confirmed { }
.status-badge.status-return-initiated { }  /* return_initiated */
.status-badge.status-returned-rto { }      /* returned_rto */
```

### Colors to Fix

```css
/* shipped — change from purple to dark orange */
/* out for delivery — change from red to lime green */
/* rto delivered — change from green to slate */
```

---

## 7. Validation Gaps & Issues

### ❌ CRITICAL — Missing Validations

| # | Issue | Status |
|---|-------|--------|
| 1 | ~~No pincode serviceability check before order creation~~ | ✅ FIXED — added in both checkout + COD flows |
| 2 | ~~shipment_Height not multiplied by quantity~~ | ✅ FIXED — now uses `fshipService.calculateShipmentDimensions()` |
| 3 | **No address quality scoring** before FShip sync | ⬜ TODO |
| 4 | ~~Fallback phone "9876543210" in prepareFShipOrderData~~ | ✅ FIXED — now throws error if no phone |
| 5 | ~~No pincode format validation before FShip~~ | ✅ FIXED — regex check in `validateOrderForFShip()` |
| 6 | **COD amount not set correctly** — verify `total_Amount` is always set | ⬜ TODO |

### ⚠️ MEDIUM — Logic Issues

| # | Issue | Status |
|---|-------|--------|
| 7 | ~~Sync uses a single transaction for ALL orders~~ | ✅ FIXED — per-order transactions |
| 8 | ~~order.confirmed event doesn't trigger FShip sync~~ | ✅ FIXED — immediate sync on event |
| 9 | **No velocity/fraud checks for COD** | ⬜ TODO |
| 10 | **Stale prepaid cleanup doesn't cancel FShip order** | ⬜ TODO |

### ℹ️ LOW — Improvements

| # | Issue | Status |
|---|-------|--------|
| 11 | ~~FShip sync cron runs every 2 hours~~ | ✅ FIXED — also triggers on order.confirmed |
| 12 | No retry backoff for failed syncs | ⬜ TODO |
| 13 | `console.log` used extensively in fshipService | ⬜ TODO |
| 14 | No webhook signature verification | ⬜ TODO |

---

## 8. Recommended Fixes (Priority Order)
### P0 — Fix Now

1. **Add pincode serviceability check** at checkout/order creation:
   ```javascript
   // In checkoutController.initiateCheckout() and orderController.createOrder()
   const warehousePincode = await settingsHelper.getSetting(1, 'FSHIP_WAREHOUSE_PINCODE', '395006');
   const serviceability = await fshipService.checkServiceability(warehousePincode, shippingAddress.pincode);
   if (!serviceability || serviceability.length === 0) {
     return res.status(400).json({ message: 'Delivery not available for this pincode' });
   }
   ```

2. **Fix shipment height calculation** in `prepareFShipOrderData()`:
   ```javascript
   const dims = fshipService.calculateShipmentDimensions(order.OrderItems);
   // Use dims.shipment_Weight, dims.shipment_Height, etc.
   ```

3. **Remove fallback dummy phone** — fail the sync instead:
   ```javascript
   const customerMobile = shippingAddress?.phone || customer?.phone;
   if (!customerMobile) throw new Error('No phone number for shipping');
   ```

4. **Add pincode validation** in `validateOrderForFShip()`:
   ```javascript
   if (!/^\d{6}$/.test(addr.pincode?.trim())) issues.push('Invalid pincode format');
   ```

### P1 — Fix Soon

5. **Trigger FShip sync on order.confirmed** event (don't wait for 2hr cron)
6. **Use per-order transactions** in `syncOrdersWithFShip` instead of one big transaction
7. **Add webhook signature verification** for FShip webhook endpoint
8. **Cancel FShip order** when stale prepaid cleanup cancels an already-synced order

---

## 9. File Reference

| File | Role |
|------|------|
| `controller/checkoutController.js` | Prepaid checkout flow (stock reservation → Razorpay) |
| `controller/orderController.js` | COD order creation, FShip sync, webhook handler |
| `services/orderCreationService.js` | Creates order from confirmed payment session |
| `services/orderService.js` | State machine, row locking, status transitions |
| `services/fshipService.js` | FShip API wrapper (create order, track, cancel, etc.) |
| `services/orderEvents.js` | Event emitter (order.created, confirmed, shipped, etc.) |
| `services/stockReservationService.js` | Redis-based stock reservation for prepaid |
| `services/addressQualityService.js` | Address validation & quality scoring (⚠️ unused) |
| `config/cronJobs.js` | FShip sync cron (every 2hr), stale order cleanup (30min) |
| `model/orderModel.js` | Order schema with fship_* fields |
