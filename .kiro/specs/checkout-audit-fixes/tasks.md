# CrossCoin — Task List
Last updated: April 2026

Legend: 🔴 Critical · 🟡 Partial · 🟢 Complete · 🆕 New task

---

- [x] 1. Cart Merge on Login — detect false→true auth transition, merge localStorage cart into DB, re-fetch
- [x] 2. Fix Prepaid Order Sequencing — already correct, no changes needed
- [x] 3. Payment Failure Retry / Cancel UI — add paymentFailed state, retry panel, max 3 retries in CartDrawer.jsx
- [x] 4. Backend Input Validation — phone regex, email format, name length, address min-length, qty guard in createOrder and createGuestOrder
- [x] 5. Server-side Total Verification — computeCouponDiscount helper, mismatch → 400 in both order creation handlers
- [x] 6. COD Maximum Order Value Cap — COD_MAX_ORDER_VALUE setting (default 1500) enforced in both order handlers
- [x] 7. Idempotency Key — frontend generates key, backend dedup via Redis in createOrder and createGuestOrder
- [x] 8. Payment ID Deduplication — transaction_id uniqueness check in updateOrderPayment
- [x] 9. Guard Re-processing Paid Orders — payment_status check at start of updateOrderPayment
- [x] 10. Add confirmed Status for COD Orders — ENUM updated, status set after COD commit, OrderStatusHistory entry added
- [x] 11. Add return_initiated and returned_rto Statuses — ENUM updated, POST /api/orders/:id/return route and handler added
- [x] 12. Block Cancellation of Shipped Orders — DISPATCHED_STATUSES block in cancelOrder, confirmed allowed
- [x] 13. Razorpay Webhook Signature Verification — HMAC-SHA256 on razorpayCallback, express.raw() scoped to route, webhooks_log dedup
- [ ] 14. Restrict Refunds to Eligible Orders — order.status check in processRefund and refundPayment, amount cap
- [x] 15. Phone OTP for COD — Backend/controller/checkoutController.js + Backend/routes/checkoutRoutes.js, Redis OTP store, WhatsApp send
- [x] 16. Pincode Serviceability in Checkout — CartDrawer.jsx pincode blur handler, city/state autofill, COD block if not serviceable
- [x] 17. Repeat-RTO Customer COD Block — getRtoCount helper, block COD if count >= 2 in both order handlers
- [x] 18. WhatsApp Cancel Window — CANCEL handler in handleAutoReply, look up confirmed order within 2h, cancel and reply
- [x] 19. Prepaid Discount Nudge — already complete in CartDrawer.jsx
- [x] 20. FShip Webhook Handler — already complete, returned_rto mapping covered by Task 11 ENUM
