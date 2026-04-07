# Checkout & Payment Audit — Fix Requirements

## Overview
Fixes identified from the full checkout/payment audit against the purchase journey diagram. FShip manages all post-dispatch statuses (booked → pickup initiated → manifested → in transit → shipped → out for delivery → delivered → undelivered → rto → rto delivered) via webhook sync — those transitions are intentionally owned by FShip and must not be broken.

---

## REQ-1: Cart Merge on Login (Frontend)

**What:** When a guest logs in, their localStorage cart items must be merged into their DB cart — not silently dropped.

**Acceptance:**
- On login success, read `cartItems` from localStorage
- For each item, call `addToCart` API to sync it to the DB cart
- If an item already exists in DB cart, increment quantity (don't duplicate)
- Clear localStorage cart after merge completes
- If merge fails for any item, log a warning but don't block login

---

## REQ-2: Prepaid Order Sequencing Fix (Frontend)

**What:** Currently the frontend calls `createOrder` before verifying payment, meaning a failed `updateOrderPayment` leaves a ghost order. The correct sequence per the diagram is: Razorpay payment → verify → then create order.

**Acceptance:**
- `createRazorpayOrder` is called first (no DB order yet)
- Razorpay modal opens; user pays
- On `handler` success callback: call `createOrder` / `createGuestOrder` with `payment_type: 'razorpay'`
- Then call `updateOrderPayment` with the Razorpay IDs
- Pass `razorpayOrderId` in the `createRazorpayOrder` request body once the order exists (for pending payment tracking)
- On failure: show retry/cancel UI (see REQ-3)

---

## REQ-3: Payment Failure Retry/Cancel UI (Frontend)

**What:** When `payment.failed` fires, the user needs explicit Retry and Cancel buttons — not just a toast.

**Acceptance:**
- On `rzp.on('payment.failed')`: set a `paymentFailed` state with the error description
- Render a visible error panel in the checkout drawer with "Retry Payment" and "Cancel Order" buttons
- "Retry Payment" re-opens the Razorpay modal with the same `rzpOrder`
- "Cancel Order" resets the checkout state and calls `POST /api/payments/payment-failed` to record the failure
- `modal.ondismiss` also triggers the same failed state

---

## REQ-4: Call payment-failed API on Failure (Frontend)

**What:** The `POST /api/payments/payment-failed` endpoint exists but is never called from the frontend.

**Acceptance:**
- When `payment.failed` fires, call `POST /api/payments/payment-failed` with `{ orderId, razorpayOrderId, errorCode, errorDescription }`
- This is fire-and-forget (don't block UI on it)
- Only call it if an `orderId` exists (i.e. order was already created)

---

## REQ-5: Input Validation — Backend (API-level)

**What:** Several fields are accepted without format validation on the backend.

**Acceptance:**
- Phone: validate 10-digit Indian mobile regex (`/^[6-9]\d{9}$/`) in both `createOrder` and `createGuestOrder`
- Name (firstName): min 2 characters, no digits allowed
- Email: basic RFC format check (must contain `@`, valid domain) in `createGuestOrder`
- Quantity: explicit `quantity >= 1` guard per item before stock check
- Address: min 10 characters on the `address` field
- Apply to both `createOrder` and `createGuestOrder`

---

## REQ-6: Server-side Total Verification (Backend)

**What:** `discount_amount` is sent by the client and used as-is. A malicious client can send `discount_amount: 9999` and get a free order.

**Acceptance:**
- After computing `subTotal` from DB prices, recompute the expected discount server-side using the `coupon_id`
- If `discount_amount` from client differs from server-computed discount by more than ₹1 (float tolerance), reject with 400
- If no `coupon_id` is provided but `discount_amount > 0`, reject with 400
- Apply to both `createOrder` and `createGuestOrder`

---

## REQ-7: COD Maximum Order Value Cap (Backend)

**What:** No cap on COD order value. High-value COD orders are a fraud/RTO risk.

**Acceptance:**
- Add a configurable `COD_MAX_ORDER_VALUE` setting (default ₹5000) via `settingsHelper`
- In `createOrder` and `createGuestOrder`, if `payment_type === 'cod'` and `finalAmount > COD_MAX_ORDER_VALUE`, reject with 400 and message: `"COD is not available for orders above ₹{limit}. Please pay online."`

---

## REQ-8: Idempotency Key — Duplicate Order Guard (Backend)

**What:** Rapid double-submit (network retry, double-click) creates duplicate orders.

**Acceptance:**
- Accept an optional `X-Idempotency-Key` header (or `idempotency_key` in body) on `createOrder` and `createGuestOrder`
- If the same key was used within the last 24 hours for the same user, return the existing order (200) instead of creating a new one
- Store idempotency keys in a Redis cache or a lightweight DB table with TTL
- If no key is provided, proceed normally (backward compatible)

---

## REQ-9: Payment ID Deduplication (Backend)

**What:** The same Razorpay `payment_id` can be replayed to mark multiple orders as paid.

**Acceptance:**
- Before updating order to `paid` in `updateOrderPayment`, check if `transaction_id` (razorpayPaymentId) already exists in the `payments` table with `status: 'successful'`
- If it does, return 400: `"Payment already processed"`
- Add a unique index on `payments.transaction_id` (excluding nulls)

---

## REQ-10: Guard Against Re-processing Paid Orders (Backend)

**What:** `updateOrderPayment` doesn't check if the order is already paid before marking it paid again.

**Acceptance:**
- At the start of `updateOrderPayment`, check `order.payment_status`
- If already `'paid'`, return 200 with the existing order (idempotent, not an error)
- If `'failed'` or `'cancelled'`, return 400: `"Cannot process payment for a failed/cancelled order"`

---

## REQ-11: Order Status — Add `confirmed` State for COD (Backend)

**What:** The diagram shows COD orders should reach a `confirmed` state. Currently COD orders stay `pending` forever until FShip picks them up.

**Acceptance:**
- Add `'confirmed'` to the `status` ENUM in `orderModel.js`
- In `createOrder` and `createGuestOrder`, after successful order creation with `payment_type === 'cod'`, immediately update `status` to `'confirmed'`
- Add `'confirmed'` to `OrderStatusHistory` on creation
- FShip webhook must not overwrite `confirmed` → `pending` (only forward transitions allowed)

---

## REQ-12: Add `return_initiated` State (Backend)

**What:** `return_initiated` is not in the order status ENUM, making returns untrackable.

**Acceptance:**
- Add `'return_initiated'` to the `status` ENUM in `orderModel.js`
- Add a `POST /api/orders/:id/return` endpoint that transitions `delivered` → `return_initiated`
- Only allow this transition if `status === 'delivered'`
- Record in `OrderStatusHistory`

---

## REQ-13: Block Cancellation of Shipped Orders (Backend)

**What:** Orders can be cancelled even after they've been shipped.

**Acceptance:**
- In the cancel order endpoint, check current `status`
- If status is in `['shipped', 'in transit', 'out for delivery', 'manifested', 'booked', 'pickup initiated', 'delivered', 'rto', 'rto delivered']`, return 400: `"Order cannot be cancelled after it has been dispatched"`
- Only `pending`, `confirmed`, and `processing` orders can be cancelled

---

## REQ-14: Razorpay Webhook Signature Verification (Backend)

**What:** The `razorpayCallback` endpoint and any future webhook endpoints don't verify the `x-razorpay-signature` header, allowing spoofed requests to mark orders as paid.

**Acceptance:**
- In `razorpayCallback`, verify the `x-razorpay-signature` header using HMAC-SHA256 of the raw request body with the Razorpay webhook secret
- If signature is missing or invalid, return 400 and log the attempt
- Add `RAZORPAY_WEBHOOK_SECRET` to settings via `settingsHelper`

---

## REQ-15: Refund Only on Eligible Orders (Backend)

**What:** Refunds can be processed on orders that are still `processing` (not yet delivered).

**Acceptance:**
- In `processRefund` and `refundPayment`, check that `order.status` is in `['delivered', 'return_initiated', 'rto delivered', 'cancelled', 'order cancelled']` before allowing refund
- If order is still `processing` or `in transit`, return 400: `"Refund can only be processed after delivery or cancellation"`

---

## Out of Scope (FShip-owned transitions)
The following status transitions are managed exclusively by FShip webhook and must not be modified:
- `processing` → `booked`
- `booked` → `pickup initiated`
- `pickup initiated` → `manifested`
- `manifested` → `in transit`
- `in transit` → `shipped`
- `shipped` → `out for delivery`
- `out for delivery` → `delivered` / `undelivered`
- Any → `rto` / `rto delivered`
