# Implementation Plan: Backend Optimization, ImageKit Integration, Security Hardening & New Features

## Overview

Incremental implementation across 14 groups. Start with critical bug fixes (data integrity), then security hardening, then ImageKit migration, then performance, then new features. Each group builds on the previous and ends with wiring into the existing app.

## Tasks

- [x] 0. Quick Resource Wins (do immediately — no spec requirement, pure fixes)
  - [x] 0.1 Fix `alter: true` running on every production startup
    - In `Backend/config/db.js`, change `connectDB()` to call `sequelize.sync({ force: false, alter: false })` in production
    - Only run `alter: true` when `NODE_ENV === 'development'`
    - This removes 10–20 unnecessary schema-scan queries on every server restart

  - [x] 0.2 Consolidate Redis clients — remove duplicate `redis` package usage in badge processor
    - In `Backend/queue/processors/badgeProcessor.js`, remove `const redis = require('redis'); const redisClient = redis.createClient(...)` — this opens a third Redis connection pool
    - Replace with the existing `redisService` singleton (`require('../../services/redisService').getClient()`)
    - Saves ~10MB memory and removes one idle TCP connection to Redis

  - [x] 0.3 Add limit to badge processor `Order.findAll`
    - In `Backend/queue/processors/badgeProcessor.js`, change `Order.findAll({ where: { user_id } })` to `Order.findAll({ where: { user_id }, limit: 50, order: [['createdAt', 'DESC']] })`
    - A user with 200+ orders currently loads all of them with full product joins — this can spike memory to 400MB+
    - 50 most recent orders is sufficient for badge calculation

- [x] 1. Fix FShip Duplicate Order Creation (Req 27)
  - [x] 1.1 Add `fship_sync_status` and `fship_sync_attempts` columns to `orders` table
    - Run SQL: `ALTER TABLE orders ADD COLUMN fship_sync_status ENUM('pending','syncing','synced','failed') DEFAULT 'pending', ADD COLUMN fship_sync_attempts INT DEFAULT 0, ADD INDEX idx_fship_sync_status (fship_sync_status)`
    - Update `Backend/model/orderModel.js` to include both new fields
    - _Requirements: 27.1, 27.2_

  - [x] 1.2 Update `createOrder` and `createGuestOrder` to use sync status state machine
    - After `Order.create()`, atomically set `fship_sync_status = 'syncing'` and `fship_sync_attempts = 1` before `setImmediate`
    - Inside `setImmediate`, update to `synced` on success or `failed` on error
    - _Requirements: 27.3, 27.4, 27.7_

  - [x] 1.3 Update `syncOrdersWithFShip` cron to filter by sync status
    - Change WHERE clause to `fship_sync_status IN ('pending', 'failed')` and `fship_sync_attempts < 5`
    - Set `fship_sync_status = 'syncing'` and increment `fship_sync_attempts` before processing each order
    - Log admin alert when `fship_sync_attempts >= 5`
    - _Requirements: 27.5, 27.6, 27.8_

  - [ ]* 1.4 Write property test for FShip sync status state machine (Property 28)
    - **Property 28: FShip sync status prevents duplicates**
    - **Validates: Requirements 27.3, 27.5**

- [x] 2. Fix Coupon Usage Tracking (Req 25)
  - [x] 2.1 Add `guest_user_id` column to `coupon_usages` table and update model
    - Run SQL: `ALTER TABLE coupon_usages ADD COLUMN guest_user_id INT NULL, ADD CONSTRAINT fk_coupon_usage_guest FOREIGN KEY (guest_user_id) REFERENCES guest_users(id)`
    - Update `Backend/model/couponUsageModel.js` to include `guestUserId` field
    - _Requirements: 25.3_

  - [x] 2.2 Record `CouponUsage` atomically inside `createOrder` and `createGuestOrder`
    - Inside the existing order creation transaction, after `Order.create()`, create `CouponUsage` and increment `coupon.usageCount` when `coupon_id` is present
    - For guest orders, set `guestUserId` from the created guest user record
    - _Requirements: 25.1, 25.2_

  - [x] 2.3 Decrement coupon usage on order cancellation
    - In the cancellation handler (to be built in Group 6), decrement `usageCount` and destroy the `CouponUsage` record for the cancelled order
    - _Requirements: 25.4_

  - [ ]* 2.4 Write property test for coupon usage count consistency (Property 25)
    - **Property 25: Coupon usageCount matches order count**
    - **Validates: Requirements 25.1, 25.2**

- [ ] 3. Checkpoint — Ensure all tests pass, ask the user if questions arise.


- [x] 4. Security Hardening (Req 8, 9, 10, 11, 12, 17)
  - [x] 4.1 Install and configure `helmet` as first middleware in `index.js`
    - `npm install helmet` in Backend
    - Add `app.use(helmet({ contentSecurityPolicy: { directives: { imgSrc: ["'self'", "data:", "https://ik.imagekit.io"] } }, hsts: process.env.NODE_ENV === 'production' }))` as the first `app.use` call
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 4.2 Install and configure `express-rate-limit`
    - `npm install express-rate-limit` in Backend
    - Create `authRateLimiter` (10 req / 15 min) and `generalRateLimiter` (100 req / 1 min)
    - Apply `authRateLimiter` to `/api/users/login` and `/api/users/register` before `generalRateLimiter`
    - Apply `generalRateLimiter` to `/api/`
    - Include `X-RateLimit-*` headers in responses; return HTTP 429 with `{ success: false, message: "Too many requests, please try again later" }` on limit exceeded
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 4.3 Fix CORS to reject unknown origins in production
    - In `Backend/config/corsConfig.js`, change the fallback from silent allow to `callback(new Error('Not allowed by CORS'))` when `NODE_ENV === 'production'`
    - Keep development behavior (allow with warning log)
    - _Requirements: 8.1, 8.4, 8.5_

  - [x] 4.4 Add magic-byte file validation to `uploadMiddleware.js`
    - Add `MAGIC_BYTES` map for `image/jpeg` (`FF D8 FF`), `image/png` (`89 50 4E 47`), `image/webp` (`52 49 46 46`)
    - In `fileFilter`, read first 8 bytes from the file stream and compare against declared MIME type; call `cb(new Error('Invalid file type'), false)` on mismatch
    - Return HTTP 400 `{ success: false, message: "Invalid file type" }` to client
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 4.5 Add password strength validation utility and apply to auth endpoints
    - Create `Backend/utils/passwordValidation.js` with `validatePasswordStrength(password)` — rejects if < 8 chars, no uppercase, no lowercase, or no digit; returns `{ valid, message }`
    - Apply to `register`, `resetPassword`, `updatePassword`, and `changePassword` in `userController.js`; return HTTP 400 with the validation message on failure
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 4.6 Verify startup credential log is gated behind `NODE_ENV !== 'production'`
    - Inspect `Backend/index.js` startup block; confirm the debug log is inside `if (process.env.NODE_ENV !== 'production')` — add the guard if missing
    - _Requirements: 12.1, 12.2_

  - [ ]* 4.7 Write property test for CORS rejection (Property 6)
    - **Property 6: CORS rejects unknown origins in production**
    - **Validates: Requirements 8.1**

  - [ ]* 4.8 Write property test for auth rate limit (Property 7)
    - **Property 7: Auth rate limit enforced after 10 requests**
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 4.9 Write property test for magic-byte validation (Property 8)
    - **Property 8: Magic-byte validation rejects mismatched files**
    - **Validates: Requirements 11.1**

  - [ ]* 4.10 Write property test for password strength validation (Property 14)
    - **Property 14: Weak passwords rejected at all auth endpoints**
    - **Validates: Requirements 17.1, 17.2**

- [ ] 5. Checkpoint — Ensure all tests pass, ask the user if questions arise.


- [x] 6. ImageKit Migration for Profiles and Reviews (Req 1, 2, 3, 4, 5)
  - [x] 6.1 Update `userController.js` to upload profile images to ImageKit
    - On profile image upload: call `imagekitService.upload(buffer, filename, '/profiles')`, store returned path in `users.profileImage`, delete old ImageKit image if one existed
    - On account deletion: call `imagekitService.deleteFile(fileId)` for the profile image
    - Resolve `profileImage` through `imagekitService.getOptimizedUrl` in all user profile responses
    - Delete local temp file after successful upload
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 6.2 Update `reviewController.js` to upload review images to ImageKit
    - On review creation with files: upload each file to ImageKit under `/reviews`, store path in `ReviewImage.fileName`
    - On review deletion: delete all associated ImageKit images
    - Resolve each `ReviewImage.fileName` through `imagekitService.getOptimizedUrl` in review responses
    - Delete local temp files after successful upload
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.3 Extend `review_images.fileName` column to VARCHAR(500)
    - Run SQL: `ALTER TABLE review_images MODIFY COLUMN fileName VARCHAR(500)`
    - _Requirements: 2.1_

  - [x] 6.4 Write `Backend/scripts/migrateProfilesToImageKit.js`
    - Find all users where `profileImage` is not null and does not contain `ik.imagekit.io`
    - For each: read file from `uploads/users/`, upload to ImageKit `/profiles/`, update `users.profileImage`
    - Skip if local file not found (log warning); idempotent check prevents re-upload
    - Log success/failure counts on completion
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.5 Write `Backend/scripts/migrateReviewImagesToImageKit.js`
    - Find all `ReviewImage` records where `fileName` does not contain `ik.imagekit.io`
    - For each: read file from `uploads/reviews/`, upload to ImageKit `/reviews/`, update `review_images.fileName`
    - Skip if local file not found (log warning); idempotent check prevents re-upload
    - Log success/failure counts on completion
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.6 Update `cartController.js` to resolve product images via `imagekitService.getOptimizedUrl`
    - Ensure cart item product images are resolved through `imagekitService.getOptimizedUrl` rather than raw paths
    - _Requirements: 5.1, 5.2_

  - [ ]* 6.7 Write property test for profile image upload stores ImageKit path (Property 1)
    - **Property 1: Profile image upload stores ImageKit path**
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ]* 6.8 Write property test for migration idempotence (Property 4)
    - **Property 4: Migration scripts are idempotent**
    - **Validates: Requirements 3.2, 4.1**

- [x] 7. Performance & Caching Improvements (Req 6, 7, 24)
  - [x] 7.1 Re-enable product list caching in `productService.js` with brand-scoped keys
    - Uncomment/re-enable `cacheManager.set` in `getProductsList` with 10-min TTL
    - Cache key: `products:list:${brandId}:${category}:${search}:${sort}:${page}:${limit}`
    - Invalidate cache on product create/update/delete
    - _Requirements: 24.1_

  - [x] 7.2 Remove `Review` join from `productService.getProductsList`
    - Remove the `Review` association from `includeOptions` in `getProductsList`; rely on pre-aggregated `avg_rating` and `review_count` columns
    - _Requirements: 24.8_

  - [x] 7.3 Add Redis caching to `getPublicProductReviews` in `reviewController.js`
    - Cache key: `reviews:${productId}:${page}:${limit}:${sort}`, TTL 10 min
    - Invalidate on review create/update/approve/delete for that product
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.4 Eliminate N+1 queries in review and user endpoints (Req 7)
    - In `getAllReviews` (admin): add `include: [User, Product, ReviewImage]` to single query
    - In `getPublicProductReviews`: add `include: [User, ReviewImage]` to single query
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.5 Add `Cache-Control` headers to public endpoints
    - Add `res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')` to: `GET /api/categories/public`, `GET /api/sliders/public`
    - Add `Cache-Control: no-store` to user/order/cart endpoints
    - _Requirements: 24.2_

  - [x] 7.6 Add ETag middleware for public product and category endpoints
    - Install `etag` npm package; create response interceptor middleware that computes ETag from response body
    - Apply to `GET /api/categories/public`, `GET /api/products/public`, `GET /api/sliders/public`
    - Return HTTP 304 when `If-None-Match` matches
    - _Requirements: 24.3_

  - [x] 7.7 Fix dashboard cache key to use `brandId` only (remove `userId`)
    - Change cache key in `dashboardService.js` from `dashboard:brand:${brandId}:${userId}:stats` to `dashboard:brand:${brandId || 'all'}:stats`
    - _Requirements: 24.10_

  - [x] 7.8 Replace `console.log` with `logger.debug` in `orderController.js`
    - Replace all `console.log` calls in `orderController.js` with `logger.debug()` calls
    - _Requirements: 24.4_

  - [x] 7.9 Enforce pagination cap of 100 on all list endpoints
    - In all controllers using `findAll`/`findAndCountAll` with a `limit` param, add `Math.min(parseInt(limit) || 20, 100)` cap
    - _Requirements: 24.5_

  - [ ]* 7.10 Write property test for product list cache hit (Property 22)
    - **Property 22: Product list cache hit on repeat request**
    - **Validates: Requirements 24.1**

  - [ ]* 7.11 Write property test for ETag 304 response (Property 23)
    - **Property 23: ETag produces 304 on repeat request**
    - **Validates: Requirements 24.2**

  - [ ]* 7.12 Write property test for pagination cap (Property 24)
    - **Property 24: Pagination cap enforced at 100**
    - **Validates: Requirements 24.5**

  - [ ]* 7.13 Write property test for review cache invalidation (Property 5)
    - **Property 5: Review cache invalidated after any review mutation**
    - **Validates: Requirements 6.1, 6.3**

- [ ] 8. Checkpoint — Ensure all tests pass, ask the user if questions arise.


- [x] 9. JWT Refresh Token (Req 15)
  - [x] 9.1 Add `refreshTokenExpiry` column to `users` table and update model
    - Run SQL: `ALTER TABLE users ADD COLUMN refreshTokenExpiry DATETIME NULL`
    - Confirm `refreshToken` column exists (VARCHAR); update `Backend/model/userModel.js` to include `refreshTokenExpiry`
    - _Requirements: 15.3_

  - [x] 9.2 Update login to issue refresh token alongside access token
    - On successful login, generate a random refresh token, bcrypt-hash it, store hash + expiry (7 days) in `users.refreshToken` and `users.refreshTokenExpiry`
    - Return raw refresh token in login response alongside `accessToken`
    - _Requirements: 15.1_

  - [x] 9.3 Implement `POST /api/users/refresh-token` endpoint
    - Accept `refreshToken` in request body; find user by matching bcrypt hash; verify not expired
    - Rotate: generate new refresh token, invalidate old one, return new `accessToken` and new `refreshToken`
    - Return HTTP 401 `{ success: false, message: "Invalid or expired refresh token" }` on failure
    - _Requirements: 15.2, 15.4_

  - [x] 9.4 Update logout to invalidate refresh token
    - On logout, set `users.refreshToken = null` and `users.refreshTokenExpiry = null`
    - _Requirements: 15.5_

  - [ ]* 9.5 Write property test for refresh token rotation (Property 12)
    - **Property 12: Refresh token rotation — old token rejected after use**
    - **Validates: Requirements 15.2, 15.3**

- [x] 10. Order Cancellation (Req 14)
  - [x] 10.1 Implement `POST /api/orders/:id/cancel` for authenticated users
    - Allow cancellation only if `order.status` is `pending` or `processing`
    - Restore stock for all order items (`ProductVariation.stock += quantity` for each item)
    - Set `order.status = 'cancelled'`; if `payment_status === 'paid'`, set `payment_status = 'refund_pending'`; otherwise set `payment_status = 'cancelled'`
    - Decrement coupon `usageCount` and destroy `CouponUsage` record if order had a coupon (wires in task 2.3)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.6_

  - [x] 10.2 Implement `POST /api/orders/guest/cancel` for guest users
    - Accept `email` + `order_number` in request body; find matching guest order
    - Apply same cancellation logic as 10.1
    - _Requirements: 14.5, 14.7_

  - [x] 10.3 Add cancellation routes to `Backend/routes/orderRoutes.js`
    - Wire `POST /api/orders/:id/cancel` (auth middleware) and `POST /api/orders/guest/cancel` (no auth)
    - _Requirements: 14.6, 14.7_

  - [ ]* 10.4 Write property test for order cancellation restores stock (Property 10)
    - **Property 10: Order cancellation restores stock for all items**
    - **Validates: Requirements 14.1, 14.2**

  - [ ]* 10.5 Write property test for prepaid cancellation sets refund_pending (Property 11)
    - **Property 11: Prepaid order cancellation sets payment_status to refund_pending**
    - **Validates: Requirements 14.3**

- [x] 11. WhatsApp Order Notifications (Req 19)
  - [x] 11.1 Create `Backend/services/whatsappService.js`
    - Implement `formatE164(phone)` — converts 10-digit Indian numbers to `+91XXXXXXXXXX`
    - Implement `sendTemplate(phone, templateName, components)` — POST to `https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` via axios
    - Implement `sendOrderConfirmation`, `sendOrderShipped`, `sendOrderDelivered`, `sendOrderCancelled` using the respective approved template names
    - Silently skip (log warning) if phone is null/undefined
    - _Requirements: 19.1, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10_

  - [x] 11.2 Add WhatsApp env vars to `.env` and document in `.env.example`
    - Add `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
    - _Requirements: 19.7_

  - [x] 11.3 Send WhatsApp order confirmation in `createOrder` and `createGuestOrder`
    - After successful order creation, fire-and-forget: `whatsappService.sendOrderConfirmation(phone, {...}).catch(logger.warn)`
    - Phone comes from the shipping address associated with the order
    - _Requirements: 19.1_

  - [x] 11.4 Send WhatsApp notifications on order status changes
    - In `orderStatusHistoryController.js` (or wherever status is updated), add fire-and-forget calls:
      - Status → `shipped`: `whatsappService.sendOrderShipped(phone, { orderNumber, awbNumber, trackingUrl })`
      - Status → `delivered`: `whatsappService.sendOrderDelivered(phone, { orderNumber })`
      - Status → `cancelled`: `whatsappService.sendOrderCancelled(phone, { orderNumber, refundInfo })`
    - _Requirements: 19.2, 19.3, 19.4_

  - [ ]* 11.5 Write unit tests for whatsappService (mock axios)
    - Test `formatE164` with various input formats
    - Test fire-and-forget: order creation does not fail when WhatsApp throws
    - _Requirements: 19.6_

  - [ ]* 11.6 Write property test for WhatsApp phone formatting (Property 16)
    - **Property 16: formatE164 produces valid E.164 format**
    - **Validates: Requirements 19.2**

- [ ] 12. Checkpoint — Ensure all tests pass, ask the user if questions arise.


- [x] 13. Product Filters & Mega Menu (Req 16, 18)
  - [x] 13.1 Add `minPrice`, `maxPrice`, `inStock`, `minRating`, `attributes` filters to public products endpoint
    - In `productService.getProductsList`, parse and apply optional query params as additional WHERE/HAVING clauses
    - `inStock=true`: only products with at least one variation with `stock > 0`
    - `attributes`: JSON-encoded object; filter by attribute value joins
    - All filters are conjunctive (AND)
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 13.2 Create `getMegaMenu` handler in `attributeController.js`
    - Query all active attributes with active values scoped by `req.brandId`
    - For each value, count active in-stock products; exclude values with `product_count === 0`
    - Cache result in Redis: key `mega-menu:${brandId}`, TTL 30 min
    - Invalidate cache on product create/update/delete
    - Return shape: `{ success: true, data: [{ id, name, values: [{ id, value, product_count }] }] }`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [x] 13.3 Add `GET /api/attributes/mega-menu` route (no auth)
    - Wire route in `Backend/routes/attributeRoutes.js`
    - Add `Cache-Control: public, max-age=300, stale-while-revalidate=60` header to response
    - _Requirements: 18.1, 18.8_

  - [x] 13.4 Update `Header.jsx` with mega menu dropdown
    - Add `onMouseEnter`/`onMouseLeave` handler on "Products" nav item
    - Fetch `/api/attributes/mega-menu` on hover (cache in component state)
    - Render attribute groups as columns; each value as a link to `/Products?attributes={"name":["value"]}`
    - Mobile: tap to expand/collapse inline in sidebar
    - Close on outside click or navigation
    - _Requirements: 18.9, 18.10, 18.11, 18.12_

  - [ ]* 13.5 Write property test for product filters are conjunctive (Property 13)
    - **Property 13: All active filters satisfied simultaneously in product list response**
    - **Validates: Requirements 16.1, 16.2, 16.3**

  - [ ]* 13.6 Write property test for mega menu excludes zero-count values (Property 15)
    - **Property 15: Mega menu excludes attribute values with product_count === 0**
    - **Validates: Requirements 18.2**

- [ ] 14. Data Encryption for PII (Req 23)
  - [ ] 14.1 Create `Backend/utils/encryption.js`
    - Implement `encrypt(plaintext)` using AES-256-GCM with random IV; return `iv:authTag:ciphertext` (hex-encoded)
    - Implement `decrypt(ciphertext)` — parse `iv:authTag:ciphertext`, decrypt, return plaintext; return `null` and log error on failure
    - Implement `isEncrypted(value)` — returns true if value matches `hex:hex:hex` format
    - Read key from `process.env.DATA_ENCRYPTION_KEY` (64-char hex)
    - _Requirements: 23.1, 23.2, 23.9_

  - [ ] 14.2 Extend `phone` columns to VARCHAR(500) in `shipping_addresses` and `guest_users`
    - Run SQL: `ALTER TABLE shipping_addresses MODIFY COLUMN phone VARCHAR(500)` and `ALTER TABLE guest_users MODIFY COLUMN phone VARCHAR(500)`
    - _Requirements: 23.3_

  - [ ] 14.3 Encrypt `phone` in `ShippingAddress` on create/update; decrypt on read
    - In `shippingAddressController.js`, call `encrypt(phone)` before saving and `decrypt(phone)` before returning in responses
    - _Requirements: 23.3, 23.4_

  - [ ] 14.4 Encrypt `phone` in `GuestUser` on create; decrypt on read
    - In `orderController.js` (guest order creation) and wherever guest user data is returned, apply `encrypt`/`decrypt`
    - _Requirements: 23.5, 23.6_

  - [ ] 14.5 Encrypt `brand_settings` values where `is_encrypted = true` on write; decrypt on read
    - In `brandSettingsController.js` / `brandSettingsService.js`, wrap value with `encrypt`/`decrypt` when `is_encrypted` flag is true
    - _Requirements: 23.7_

  - [ ] 14.6 Add `DATA_ENCRYPTION_KEY` to `.env` and document in `.env.example`
    - _Requirements: 23.2_

  - [ ] 14.7 Write `Backend/scripts/encryptExistingData.js` migration script
    - Find all `ShippingAddress` records where `phone` does not match `isEncrypted()` — encrypt in-place
    - Find all `GuestUser` records where `phone` is not null and not encrypted — encrypt in-place
    - Find all `BrandSetting` records where `is_encrypted = true` and value is not encrypted — encrypt in-place
    - Idempotent: skip already-encrypted values
    - _Requirements: 23.8, 23.9_

  - [ ]* 14.8 Write property test for encryption round trip (Property 20)
    - **Property 20: decrypt(encrypt(x)) === x for any plaintext**
    - **Validates: Requirements 23.1, 23.2**

  - [ ]* 14.9 Write property test for phone numbers encrypted at rest (Property 21)
    - **Property 21: Phone stored in DB does not equal plaintext after encryption**
    - **Validates: Requirements 23.3**

- [ ] 15. Checkpoint — Ensure all tests pass, ask the user if questions arise.


- [ ] 16. Loyalty Program (Req 26, 28)
  - [ ] 16.1 Create `loyalty_transactions` table and Sequelize model
    - Run SQL to create table with columns: `id`, `user_id`, `order_id` (nullable), `type` ENUM('earned','redeemed','expired','adjusted','refunded'), `points`, `balance_after`, `description`, `expires_at`, `brand_id`, `created_at`
    - Create `Backend/model/loyaltyTransactionModel.js`
    - Add associations in `Backend/model/associations.js`
    - _Requirements: 26.1, 26.5_

  - [ ] 16.2 Add `loyalty_points` column to `users` table and update model
    - Run SQL: `ALTER TABLE users ADD COLUMN loyalty_points INT DEFAULT 0`
    - Update `Backend/model/userModel.js`
    - _Requirements: 26.5_

  - [ ] 16.3 Create `Backend/services/loyaltyService.js`
    - Implement `creditPoints(userId, orderId, orderAmount, brandId)` — reads `LOYALTY_EARN_RATE` from brand settings, creates `loyalty_transactions` record with `type='earned'`, increments `users.loyalty_points`
    - Implement `debitPoints(userId, orderId, points, brandId)` — validates balance, creates `type='redeemed'` record, decrements `users.loyalty_points`
    - Implement `refundPoints(userId, orderId, brandId)` — finds redeemed transaction for order, creates `type='refunded'` record, restores points
    - Implement `expirePoints()` — finds earned transactions past `expires_at`, creates `type='expired'` records, decrements `users.loyalty_points`
    - Implement `getBalance(userId)` and `getHistory(userId, page, limit)`
    - Implement `adjustPoints(userId, points, description, adminId)` for admin manual adjustments
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.6, 26.7_

  - [ ] 16.4 Credit loyalty points when order status changes to `delivered`
    - In the order status update handler, call `loyaltyService.creditPoints(...)` when new status is `delivered` and `order.userId` is not null (skip guests)
    - _Requirements: 26.1_

  - [ ] 16.5 Implement loyalty API endpoints and routes
    - `GET /api/loyalty/balance` — returns `{ points, pendingPoints }` for authenticated user
    - `GET /api/loyalty/history` — paginated `loyalty_transactions` for authenticated user
    - `POST /api/loyalty/redeem` — validates and reserves points; returns redemption token
    - `POST /api/admin/loyalty/adjust` — admin manual credit/debit
    - `GET /api/admin/loyalty/transactions` — all transactions (brand-scoped, paginated)
    - Wire all routes in a new `Backend/routes/loyaltyRoutes.js`
    - _Requirements: 26.3, 26.4, 26.6, 26.7_

  - [ ] 16.6 Add daily cron job for points expiry
    - In `Backend/config/cronJobs.js`, add `cron.schedule('0 2 * * *', () => loyaltyService.expirePoints())`
    - _Requirements: 26.8_

  - [ ] 16.7 Implement guest-to-member conversion on registration (Req 28)
    - In `userController.register`, after creating the new user, check for `guest_users` records with matching email
    - For each matched guest user: set `converted_at = NOW()`, find all delivered guest orders, credit loyalty points for each (check `loyalty_transactions` for existing `order_id` to prevent double-credit)
    - Return `pointsCredited` total in registration response
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

  - [ ] 16.8 Refund loyalty points on order cancellation
    - In the cancellation handler (task 10.1/10.2), call `loyaltyService.refundPoints(userId, orderId, brandId)` if the order had redeemed points
    - _Requirements: 26.3_

  - [ ]* 16.9 Write property test for loyalty balance consistency (Property 26)
    - **Property 26: users.loyalty_points equals sum of non-expired loyalty_transactions**
    - **Validates: Requirements 26.1, 26.2, 26.3**

  - [ ]* 16.10 Write property test for points redemption bounded by max_redeem_percent (Property 27)
    - **Property 27: Points redemption cannot exceed max_redeem_percent of order total**
    - **Validates: Requirements 26.2**

  - [ ]* 16.11 Write property test for guest-to-member conversion idempotence
    - Registering twice with same email SHALL NOT double-credit points
    - **Validates: Requirements 28.3**

- [ ] 17. Checkpoint — Ensure all tests pass, ask the user if questions arise.


- [ ] 18. Lookbook Feature (Req 20)
  - [ ] 18.1 Create `lookbooks`, `lookbook_images`, and `lookbook_hotspots` tables and models
    - Run SQL to create all three tables per the schema in the design doc
    - Create `Backend/model/lookbookModel.js`, `Backend/model/lookbookImageModel.js`, `Backend/model/lookbookHotspotModel.js`
    - Add associations (Lookbook hasMany LookbookImage, LookbookImage hasMany LookbookHotspot, LookbookHotspot belongsTo Product) in `associations.js`
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ] 18.2 Create `Backend/controller/lookbookController.js` with admin CRUD
    - `createLookbook`, `updateLookbook`, `deleteLookbook` — standard CRUD with brand scoping
    - `uploadLookbookImage` — upload to ImageKit under `/lookbooks`, create `LookbookImage` record
    - `deleteLookbookImage` — delete from ImageKit, destroy record
    - `addHotspot`, `updateHotspot`, `deleteHotspot` — validate `position_x`/`position_y` in [0,100]; return HTTP 400 if out of range
    - _Requirements: 20.4, 20.5_

  - [ ] 18.3 Create public lookbook endpoints
    - `GET /api/lookbooks` — active lookbooks scoped by `req.brandId`, with images and hotspot product data (name, price, primary image, slug)
    - `GET /api/lookbooks/:slug` — single lookbook with full image + hotspot data
    - Resolve all image URLs through `imagekitService.getOptimizedUrl`
    - _Requirements: 20.6, 20.7, 20.8_

  - [ ] 18.4 Add lookbook routes to `Backend/routes/`
    - Create `Backend/routes/lookbookRoutes.js` with admin routes (auth middleware) and public routes
    - Register in `index.js`
    - _Requirements: 20.4, 20.6_

  - [ ] 18.5 Create `/Lookbook` frontend page
    - Grid of lookbook cover images (first image of each lookbook)
    - Clicking opens full lookbook view with images and interactive hotspots
    - Hotspots as `<button>` elements positioned with `left: {x}%`, `top: {y}%`; pulsing CSS animation
    - Hover/tap shows product card popup (name, price, primary image, Add to Cart)
    - Responsive: hotspot positions use percentage-based coordinates
    - _Requirements: 20.9, 20.10, 20.11, 20.12, 20.13_

  - [ ]* 18.6 Write property test for lookbook hotspot coordinates bounded (Property 17)
    - **Property 17: Hotspot position_x and position_y must be in [0, 100]**
    - **Validates: Requirements 20.2**

- [ ] 19. Shoppable Reels (Req 21)
  - [ ] 19.1 Create `reels` and `reel_products` tables and models
    - Run SQL to create both tables per the design schema
    - Create `Backend/model/reelModel.js` and `Backend/model/reelProductModel.js`
    - Add associations in `associations.js`
    - _Requirements: 21.1, 21.2_

  - [ ] 19.2 Create `Backend/controller/reelController.js`
    - Admin CRUD: `createReel`, `updateReel`, `deleteReel` — upload video + thumbnail to ImageKit under `/reels`; support `video/mp4` and `video/webm`, max 50MB
    - `assignProducts`, `removeProduct` — manage `reel_products` join records
    - Public `getReels` — active reels scoped by `req.brandId`, ordered by `display_order`, with tagged product data
    - `incrementViewCount` — `POST /api/reels/:id/view`, no auth, atomic increment of `view_count`
    - _Requirements: 21.3, 21.4, 21.5, 21.6_

  - [ ] 19.3 Add reel routes to `Backend/routes/reelRoutes.js` and register in `index.js`
    - _Requirements: 21.3, 21.5, 21.6_

  - [ ] 19.4 Create `/Reels` frontend page
    - Vertical scroll container with `scroll-snap-type: y mandatory`
    - Each reel: `<video>` with `autoplay muted loop` triggered by IntersectionObserver when in viewport
    - Tagged products in bottom sheet panel with product cards and Add to Cart
    - Thumbnail as `poster` attribute before video loads
    - _Requirements: 21.7, 21.8, 21.9, 21.10, 21.11_

  - [ ]* 19.5 Write property test for reel view count increments monotonically (Property 18)
    - **Property 18: view_count increases by exactly 1 per POST /api/reels/:id/view call**
    - **Validates: Requirements 21.6**

- [ ] 20. Checkpoint — Ensure all tests pass, ask the user if questions arise.


- [ ] 21. Instagram Gallery Feed (Req 22)
  - [ ] 21.1 Create `instagram_post_products` table and model
    - Run SQL to create table with columns: `id`, `instagram_post_id` VARCHAR(100), `product_id` FK, `brand_id` FK, `created_at`
    - Create `Backend/model/instagramPostProductModel.js` and add associations
    - _Requirements: 22.1_

  - [ ] 21.2 Create `Backend/services/instagramService.js`
    - `fetchFeed(brandId)` — GET `https://graph.facebook.com/v18.0/{account_id}/media` with fields `id,media_type,media_url,thumbnail_url,permalink,caption,timestamp`; read `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_ACCOUNT_ID` from brand settings
    - `getCachedFeed(brandId)` — return Redis cache (`instagram:feed:${brandId}`, TTL 1h) or fetch if missing
    - `refreshFeed(brandId)` — force-refresh cache
    - `refreshAccessTokenIfNeeded(brandId)` — check token expiry; auto-refresh if within 7 days; log warning
    - On API failure: return last cached data; if no cache, return `{ data: [], stale: true }`
    - _Requirements: 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

  - [ ] 21.3 Create `Backend/controller/instagramController.js`
    - `getFeed` — calls `instagramService.getCachedFeed`, adds `Cache-Control: public, max-age=300` header
    - `refreshFeed` — admin only, calls `instagramService.refreshFeed`
    - `tagPost` — admin only, creates `instagram_post_products` record
    - _Requirements: 22.4, 22.5, 22.8_

  - [ ] 21.4 Add Instagram routes and register in `index.js`
    - Create `Backend/routes/instagramRoutes.js`; `GET /api/instagram/feed` (public), `POST /api/instagram/refresh` (admin), `POST /api/instagram/tag` (admin)
    - _Requirements: 22.4, 22.5, 22.8_

  - [ ] 21.5 Add Instagram feed cron job (every 6 hours)
    - In `Backend/config/cronJobs.js`, add `cron.schedule('0 */6 * * *', () => instagramService.refreshFeed(brandId))`
    - _Requirements: 22.6_

  - [ ] 21.6 Create `InstagramGallery` frontend component
    - 3-column grid (desktop), 2-column (mobile) using CSS Grid
    - Each cell: image/thumbnail with hover overlay (caption excerpt + Instagram icon link)
    - Video posts (`media_type === VIDEO`): show `thumbnail_url` with play icon overlay
    - Posts with tagged products: shopping bag icon; click shows product card popup with Add to Cart
    - Embeddable on homepage and `/Instagram` page
    - Fetch from `/api/instagram/feed` only — never call Instagram API directly
    - _Requirements: 22.9, 22.10, 22.11, 22.12, 22.13_

  - [ ]* 21.7 Write property test for Instagram feed served from cache on API failure (Property 19)
    - **Property 19: Stale cache returned when Instagram API is down**
    - **Validates: Requirements 22.7**

- [ ] 22. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Groups 1–2 (bug fixes) must be completed before Groups 6 and 10 (which depend on cancellation logic)
- Group 4 (security) is independent and can be done in parallel with Group 6 (ImageKit)
- All new DB columns should be added via SQL in the task that first needs them — no separate migration task needed
- Property tests use `fast-check` with minimum 100 iterations per property
- Tag format for each property test: `// Feature: backend-optimization-imagekit, Property {N}: {property_text}`
