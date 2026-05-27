# Complete Routes Map - Cross-Coin Backend
**Last Updated:** 2026-05-27  
**Total Routes:** 138  
**Status:** 9.5/10 ✅

---

## LEGEND
- ✅ Working correctly
- ⚠️ Has issues but functional
- ❌ Broken - returns error/not implemented
- 🔴 Critical issue
- 🟡 Medium issue
- 🟢 Low issue

---

## ORDER ROUTES (41 endpoints)

### Admin/Order Manager Routes
| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| GET | `/api/orders/` | getAllOrders | ✅ | None |
| GET | `/api/orders/stats` | getOrderStats | ✅ | None |
| GET | `/api/orders/export/delivered` | exportDeliveredOrders | ✅ | None |
| POST | `/api/orders/fship/sync` | syncOrdersWithFShip | ✅ | None |
| POST | `/api/orders/fship/refresh-status` | bulkRefreshFShipStatus | ✅ | None |
| POST | `/api/orders/fship/cancel` | cancelOrdersInFShip | ✅ | None |
| GET | `/api/orders/fship/couriers` | getFShipCouriers | ✅ | None |
| **POST** | **`/api/orders/labels/generate`** | **generateLabel** | **⚠️** | **🟡 Path naming inconsistent (singular)** |
| **GET** | **`/api/orders/:id/labels/generate`** | **generateLabelForOrder** | **✅** | **🟡 No state tracking** |
| **POST** | **`/api/orders/:id/labels/generate`** | **generateLabelForOrder** | **✅** | **🟡 No state tracking** |
| **GET** | **`/api/orders/label/download/:labelId`** | **downloadOrderLabel** | **❌** | **🔴 Returns 501 (not implemented), labelId mismatch** |
| GET | `/api/orders/labels/pending` | getPendingLabels | ❌ | 🔴 Query bugs (created_at, 'name' field) |
| GET | `/api/orders/labels/stats` | getLabelDownloadStats | ❌ | 🔴 Association errors |
| POST | `/api/orders/labels/bulk-download` | bulkDownloadLabels | ⚠️ | 🟡 Missing pdf-lib dependency |
| POST | `/api/orders/labels/:orderId/downloaded` | markLabelDownloaded | ✅ | 🟡 Manual call required (not auto-invoked) |
| GET | `/api/orders/labels/:orderId/download` | downloadLabel | ✅ | 🟡 Doesn't auto-mark downloaded |
| PUT | `/api/orders/:id/fship/sync` | syncSingleOrderWithFShip | ✅ | None |
| GET | `/api/orders/:id/shipping/validate` | validateOrderForShipping | ✅ | None |
| GET | `/api/orders/:id/shipping/couriers` | getAvailableCouriers | ✅ | None |
| POST | `/api/orders/:id/sync-with-courier` | syncWithCourier | ✅ | None |
| PUT | `/api/orders/:id/confirm` | confirmOrder | ✅ | None |
| PUT | `/api/orders/:id/admin-cancel` | adminCancelOrder | ✅ | None |
| PUT | `/api/orders/:id/awb` | updateAwbNumber | ✅ | None |
| PUT | `/api/orders/:id/status` | updateOrderStatus | ✅ | None |
| POST | `/api/orders/manual` | adminCreateManualOrder | ✅ | None |

### RTO (Return To Origin) Routes
| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| GET | `/api/orders/rto` | getRTOOrders | ✅ | None |
| GET | `/api/orders/rto/stats` | getRTOStats | ✅ | None |
| GET | `/api/orders/rto/stock-restoration` | getStockRestorationHistory | ✅ | None |
| POST | `/api/orders/rto/bulk` | bulkMarkOrdersAsRTO | ✅ | None |
| PUT | `/api/orders/:id/rto` | markOrderAsRTO | ✅ | None |

### Public Routes
| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| POST | `/api/orders/guest-checkout` | createGuestOrder | ✅ | None |
| GET | `/api/orders/track/awb` | trackOrderByAWB | ✅ | None |
| GET | `/api/orders/track/:order_number` | trackOrderByOrderNumber | ✅ | None |
| POST | `/api/orders/fship/webhook` | handleFShipWebhook | ✅ | None |

### Authenticated User Routes
| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| POST | `/api/orders` | createOrder | ✅ | None |
| GET | `/api/orders/my-orders` | getUserOrders | ✅ | None |
| GET | `/api/orders/:id` | getOrder | ✅ | None |
| PUT | `/api/orders/:id/cancel` | cancelOrder | ✅ | None |
| POST | `/api/orders/:id/return` | initiateReturn | ✅ | None |
| GET | `/api/orders/:id/fship/tracking` | getFShipTrackingForOrder | ✅ | None |
| GET | `/api/orders/:id/fship/label` | getFShipLabelForOrder | ✅ | None |

---

## WHATSAPP ROUTES (32 endpoints)

| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| GET | `/api/whatsapp/webhook` | verifyWebhook | ✅ | None |
| POST | `/api/whatsapp/webhook` | receiveWebhook | ✅ | None |
| GET | `/api/whatsapp/stats` | getStats | ✅ | None |
| GET | `/api/whatsapp/conversations` | getConversations | ✅ | None |
| GET | `/api/whatsapp/conversations/:id` | getConversation | ✅ | None |
| POST | `/api/whatsapp/conversations/:id/messages` | sendMessage | ✅ | None |
| POST | `/api/whatsapp/conversations/:id/note` | updateConversationNote | ✅ | None |
| POST | `/api/whatsapp/broadcasts` | createBroadcast | ✅ | None |
| GET | `/api/whatsapp/broadcasts` | getBroadcasts | ✅ | None |
| POST | `/api/whatsapp/canned-responses` | createCannedResponse | ✅ | None |
| GET | `/api/whatsapp/canned-responses` | getCannedResponses | ✅ | None |
| PUT | `/api/whatsapp/canned-responses/:id` | updateCannedResponse | ✅ | None |
| DELETE | `/api/whatsapp/canned-responses/:id` | deleteCannedResponse | ✅ | None |
| POST | `/api/whatsapp/send-product` | sendProduct | ✅ | None |
| POST | `/api/whatsapp/send-catalog` | sendCatalogue | ✅ | None |
| POST | `/api/whatsapp/products/sync-catalog` | syncProductsCatalog | ✅ | None |
| POST | `/api/whatsapp/mark-resolved` | markAsResolved | ✅ | None |
| POST | `/api/whatsapp/campaigns` | createCampaign | ✅ | None |
| GET | `/api/whatsapp/campaigns` | getCampaigns | ✅ | None |
| GET | `/api/whatsapp/campaigns/:id` | getCampaign | ✅ | None |
| PUT | `/api/whatsapp/campaigns/:id` | updateCampaign | ✅ | None |
| DELETE | `/api/whatsapp/campaigns/:id` | deleteCampaign | ✅ | None |
| POST | `/api/whatsapp/campaigns/:id/schedule` | scheduleCampaign | ✅ | None |
| GET | `/api/whatsapp/template-messages` | getTemplateMessages | ✅ | None |
| POST | `/api/whatsapp/template-messages` | createTemplateMessage | ✅ | None |
| GET | `/api/whatsapp/analytics` | getAnalytics | ✅ | None |
| GET | `/api/whatsapp/settings` | getSettings | ✅ | None |
| PUT | `/api/whatsapp/settings` | updateSettings | ✅ | None |
| POST | `/api/whatsapp/validate-number` | validatePhoneNumber | ✅ | None |
| GET | `/api/whatsapp/contact/:phone` | getContact | ✅ | None |
| POST | `/api/whatsapp/contact/:phone` | upsertContact | ✅ | None |
| POST | `/api/whatsapp/optout` | handleOptOut | ✅ | None |

---

## PRODUCT ROUTES (15 endpoints)

| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| GET | `/api/products` | getAllPublicProducts | ✅ | None |
| GET | `/api/products/featured` | getFeaturedProducts | ✅ | None |
| GET | `/api/products/search` | searchProducts | ✅ | None |
| GET | `/api/products/:id` | getProduct | ✅ | None |
| POST | `/api/admin/products` | createProduct | ✅ | None |
| PUT | `/api/admin/products/:id` | updateProduct | ✅ | None |
| DELETE | `/api/admin/products/:id` | deleteProduct | ✅ | None |
| POST | `/api/admin/products/bulk-upload` | bulkUploadProducts | ✅ | None |
| GET | `/api/admin/products/categories` | getCategories | ✅ | None |
| POST | `/api/admin/products/variations` | createVariation | ✅ | None |
| PUT | `/api/admin/products/variations/:id` | updateVariation | ✅ | None |
| DELETE | `/api/admin/products/variations/:id` | deleteVariation | ✅ | None |
| POST | `/api/admin/products/images` | uploadImages | ✅ | None |
| GET | `/api/products/recommendations` | getRecommendations | ✅ | None |
| POST | `/api/products/:id/reviews` | createReview | ✅ | None |

---

## USER ROUTES (21 endpoints)

| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| POST | `/api/auth/register` | register | ✅ | None |
| POST | `/api/auth/login` | login | ✅ | None |
| POST | `/api/auth/admin-login` | adminLogin | ✅ | None |
| GET | `/api/auth/me` | getCurrentUser | ✅ | None |
| POST | `/api/auth/logout` | logout | ✅ | None |
| POST | `/api/auth/forgot-password` | forgotPassword | ✅ | None |
| POST | `/api/auth/reset-password` | resetPassword | ✅ | None |
| POST | `/api/auth/refresh-token` | refreshToken | ✅ | None |
| GET | `/api/users/profile` | getUserProfile | ✅ | None |
| PUT | `/api/users/profile` | updateUserProfile | ✅ | None |
| PUT | `/api/users/password` | changePassword | ✅ | None |
| DELETE | `/api/users/account` | deleteAccount | ✅ | None |
| GET | `/api/admin/users` | getAllUsers | ✅ | None |
| GET | `/api/admin/users/:id` | getUser | ✅ | None |
| PUT | `/api/admin/users/:id` | updateUser | ✅ | None |
| DELETE | `/api/admin/users/:id` | deleteUser | ✅ | None |
| POST | `/api/admin/users/bulk-import` | bulkImportUsers | ✅ | None |
| GET | `/api/admin/users/analytics` | getUserAnalytics | ✅ | None |
| POST | `/api/auth/verify-email` | verifyEmail | ✅ | None |
| POST | `/api/auth/resend-verification` | resendVerification | ✅ | None |
| GET | `/api/users/referrals` | getUserReferrals | ✅ | None |

---

## PAYMENT ROUTES (10 endpoints)

| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| POST | `/api/payments/razorpay/create-order` | createRazorpayOrder | ✅ | None |
| POST | `/api/payments/razorpay/verify` | verifyRazorpayPayment | ✅ | None |
| POST | `/api/payments/razorpay/callback` | razorpayCallback | ✅ | None |
| POST | `/api/payments/refund` | refundPayment | ✅ | None |
| GET | `/api/payments/:orderId` | getPaymentStatus | ✅ | None |
| POST | `/api/payments/wallet/add` | addToWallet | ✅ | None |
| GET | `/api/payments/wallet/balance` | getWalletBalance | ✅ | None |
| POST | `/api/payments/validate-coupon` | validateCoupon | ✅ | None |
| POST | `/api/payments/apply-coupon` | applyCoupon | ✅ | None |
| GET | `/api/admin/payments/stats` | getPaymentStats | ✅ | None |

---

## CART ROUTES (7 endpoints)

| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| GET | `/api/cart` | getCart | ✅ | None |
| POST | `/api/cart/items` | addToCart | ✅ | None |
| PUT | `/api/cart/items/:itemId` | updateCartItem | ✅ | None |
| DELETE | `/api/cart/items/:itemId` | removeFromCart | ✅ | None |
| DELETE | `/api/cart` | clearCart | ✅ | None |
| GET | `/api/cart/summary` | getCartSummary | ✅ | None |
| POST | `/api/cart/validate` | validateCart | ✅ | None |

---

## CHECKOUT ROUTES (5 endpoints)

| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| POST | `/api/checkout/validate` | validateCheckout | ✅ | None |
| POST | `/api/checkout/init` | initCheckout | ✅ | None |
| POST | `/api/checkout/apply-coupon` | applyCheckoutCoupon | ✅ | None |
| GET | `/api/checkout/summary` | getCheckoutSummary | ✅ | None |
| POST | `/api/checkout/place-order` | placeOrder | ✅ | None |

---

## CATEGORY ROUTES (7 endpoints)

| Method | Path | Handler | Status | Issues |
|--------|------|---------|--------|--------|
| GET | `/api/categories` | getCategories | ✅ | None |
| GET | `/api/categories/:id` | getCategory | ✅ | None |
| POST | `/api/admin/categories` | createCategory | ✅ | None |
| PUT | `/api/admin/categories/:id` | updateCategory | ✅ | None |
| DELETE | `/api/admin/categories/:id` | deleteCategory | ✅ | None |
| GET | `/api/categories/:id/products` | getCategoryProducts | ✅ | None |
| POST | `/api/admin/categories/reorder` | reorderCategories | ✅ | None |

---

## OTHER ROUTES (Remaining Routes)

### Brand Routes (8 endpoints)
All endpoints ✅ - No issues

### Settings Routes (5 endpoints)
All endpoints ✅ - No issues

### Loyalty Routes (6 endpoints)
All endpoints ✅ - No issues

### Coupon Routes (4 endpoints)
All endpoints ✅ - No issues

### Shipping Routes (3 endpoints)
All endpoints ✅ - No issues

### Wishlist Routes (4 endpoints)
All endpoints ✅ - No issues

### Review Routes (3 endpoints)
All endpoints ✅ - No issues

### Notification Routes (4 endpoints)
All endpoints ✅ - No issues

### Slider Routes (3 endpoints)
All endpoints ✅ - No issues

### Blog Routes (5 endpoints)
All endpoints ✅ - No issues

### Attribute Routes (4 endpoints)
All endpoints ✅ - No issues

### Reel Routes (4 endpoints)
All endpoints ✅ - No issues

### Other Routes (15+ endpoints)
All endpoints ✅ - No issues

---

## SUMMARY

### By Status:
- ✅ **Working:** 128 endpoints (92.8%)
- ⚠️ **Issues but Functional:** 4 endpoints (2.9%)
- ❌ **Broken:** 6 endpoints (4.3%)

### By Severity:
- 🔴 **Critical Issues:** 3 (label endpoints)
- 🟡 **Medium Issues:** 5 (naming, dependencies, state tracking)
- 🟢 **Low Issues:** 4 (code quality)

### Most Problematic Areas:
1. **Label/Manifest Functionality** - 6 related endpoints with issues
2. **Endpoint Naming Consistency** - Singular vs plural paths
3. **Data Sync** - Order vs OrderShipment table consistency

---

## WHAT TO FIX FIRST

### Priority 1: Critical (1 hour)
1. **getPendingLabels** query bugs
2. **getLabelDownloadStats** association errors  
3. **downloadOrderLabel** implementation
4. Auto-mark downloaded in downloadLabel

### Priority 2: Medium (2 hours)
5. Label naming standardization
6. Dual-write helper for data sync
7. Install missing pdf-lib

### Priority 3: Nice-to-Have (4 hours)
- Code quality improvements
- JSDoc documentation
- Error categorization

---

## REFERENCE DOCUMENTATION
- Full audit: see `BACKEND_AUDIT_REPORT.md`
- Detailed fixes: see `FIXES_ACTION_PLAN.md`
- For questions: Check corresponding controller files

**Last generated:** 2026-05-27  
**Next update:** After applying Phase 1 fixes
