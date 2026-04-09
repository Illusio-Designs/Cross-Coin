# Bugfix Requirements Document

## Introduction

The CrossCoin e-commerce backend (Node.js + Express + MySQL + Redis) has been audited and found to contain a comprehensive set of bugs spanning critical security vulnerabilities, broken business logic (RTO scoring), data leaks, race conditions, authorization bypasses, and operational issues. This document captures all open bugs from the audit (BUGS.md) organized by the bug condition methodology to ensure systematic fix verification and regression prevention.

---

## Bug Analysis

### Current Behavior (Defect)

**RTO Score — Always LOW (3 root causes)**

1.1 WHEN a prepaid order is created THEN the system skips RTO risk scoring entirely, leaving `rtoRiskScore` at 0, because the scoring block is gated behind `if (payment_type === 'cod')`

1.2 WHEN a COD order is created and the shipping address has no `landmark` field THEN the system always evaluates `!shippingAddress.landmark` as `true` (adding +10 to score) because the `ShippingAddress` model has no `landmark` column — the field is always `undefined`

1.3 WHEN `getRtoCount` queries `ShippingAddress.findAll({ where: { phone } })` with a plaintext phone number THEN the query compares plaintext against AES-256-GCM encrypted values in the database, never matches, and always returns 0 RTO orders

1.4 WHEN a prepaid order is created via the payment-first flow in `orderCreationService.js` THEN `rtoRiskScore` is hardcoded to 0

**Critical Security (S1–S7)**

1.5 WHEN `forgotPassword` is called and email credentials are misconfigured (or even when they work) THEN the system returns the `resetToken` in the HTTP response body, allowing any caller to reset any user's password without email access

1.6 WHEN `updateProfile` is called with a URL parameter `id` THEN the system updates the user matching that `id` with no ownership check — any authenticated user can modify any other user's profile including role escalation

1.7 WHEN the mobile `login` endpoint is called with a phone number THEN the system issues a JWT without ever verifying the OTP server-side — OTP verification is stated as "frontend via MSG91" only

1.8 WHEN a soft-deleted user (with `deleted_at` set) presents a valid JWT THEN the `authenticate` middleware allows the request because it only checks `User.findByPk(decoded.id)` without filtering on `deleted_at`

1.9 WHEN a request originates from a domain containing the substring `vercel.app` (e.g., `evil-vercel.app.attacker.com`) THEN CORS allows it; additionally, in non-production environments, all origins are allowed after the brand domain check fails

1.10 WHEN `deleteUser` is called and `req.user` is undefined or missing THEN the system falls back to `req.params.id`, allowing any user to delete another user's account

1.11 WHEN the `identifyBrand` middleware resolves a brand from the client-controlled `X-Brand-Name` header THEN no check verifies the authenticated user has access to that brand — enabling cross-tenant data access

**High Severity (H1–H12)**

1.12 WHEN `addToCart` is called concurrently by the same or different users for the same product THEN the stock check and cart update are not wrapped in a transaction, creating a race condition that allows overselling

1.13 WHEN `addToCart` is called with a `productId` THEN the system does not validate that the product exists or is active before adding it to the cart

1.14 WHEN `updateCartItem` is called to increase quantity THEN the system does not re-validate stock availability against the new quantity

1.15 WHEN a guest user (unauthenticated) validates a coupon via `validateCoupon` THEN the per-user usage limit check is skipped entirely because `userId` is undefined, allowing unlimited coupon reuse

1.16 WHEN multiple concurrent requests call `applyCoupon` for the same coupon THEN the `usageCount` check and `increment` are not atomic — concurrent requests can exceed the `usageLimit`

1.17 WHEN `applyCoupon` is called THEN the `discountAmount` is accepted directly from the client request body without server-side re-calculation, allowing arbitrary discount values

1.18 WHEN `getUserShippingAddresses` returns addresses THEN the `phone` field contains the raw encrypted blob from the database instead of the decrypted value, because the response mapping uses `addr.phone` which accesses the Sequelize getter (decrypted) but the field name mapping may bypass it in certain serialization paths

1.19 WHEN `getGuestShippingAddresses` is called with any `guest_email` query parameter THEN the system returns all shipping addresses for that email with no authentication required — a data leak

1.20 WHEN `deleteReview` is called by any authenticated user THEN the system deletes the review without checking if the caller owns it or is an admin

1.21 WHEN the public review creation endpoint `createPublicReview` is called THEN there is no rate limiting applied, allowing bot spam

1.22 WHEN `refreshToken` is called THEN the system fetches ALL users with non-null, non-expired refresh tokens and iterates with `bcrypt.compare` against each — O(n) time complexity, a DoS vector

1.23 WHEN `getAllUsers` is called THEN the system returns all users in a single response with no pagination, and includes PII fields like phone, email (excluding only password)

**Medium Severity (M1–M23)**

1.24 WHEN `addToCart` is called with a negative or zero `quantity` THEN the system accepts it without validation

1.25 WHEN a product's price changes after being added to cart THEN the cart retains the stale price from add-time with no re-validation at checkout

1.26 WHEN `removeFromCart` cannot find the exact cart item (product + variation match) THEN it falls back to deleting any cart item matching just the `productId`, potentially removing the wrong variation

1.27 WHEN `validateCoupon` is called THEN the `cartTotal` from the client is trusted for the `minPurchase` check without server-side cart total calculation

1.28 WHEN `getCouponById` is called THEN the coupon is fetched by primary key with no brand scoping, allowing cross-brand coupon data access

1.29 WHEN `getUserCouponHistory` is called with a `userId` URL parameter THEN any authenticated user can view any other user's coupon history (IDOR)

1.30 WHEN `updateShippingAddress` is called with a `phone_number` THEN the phone value is stored directly without re-encrypting (the Sequelize setter handles it, but the update payload passes raw value which may bypass encryption in edge cases)

1.31 WHEN `createGuestShippingAddress` is called with a `phone_number` THEN the phone is stored as `phone: phone_number` without using the `encrypt()` function, relying on the Sequelize setter which may not trigger on `create` with raw values

1.32 WHEN a review is submitted via `createReview` or `createPublicReview` THEN the review text is stored without HTML/XSS sanitization — potential stored XSS

1.33 WHEN `getReview` (single review fetch) is called by any authenticated user THEN the response includes moderation state (`status`, `admin_notes`) that should be admin-only

1.34 WHEN the product search uses `Op.like` with user input THEN SQL wildcard characters (`%`, `_`) in the search term are not escaped, allowing search manipulation

1.35 WHEN `getExistingImages` processes file paths THEN there is no path traversal prevention, allowing directory traversal via crafted input

1.36 WHEN image deletion is performed in the product controller THEN there is no brand scoping check, allowing cross-brand image deletion

1.37 WHEN `fshipService` encounters an invalid phone number THEN it returns a hardcoded `9876543210` instead of throwing an error

1.38 WHEN `fshipService.initialize()` is called concurrently THEN there is no singleton guard, causing a race condition

1.39 WHEN WhatsApp messages are triggered THEN there is no rate limiting, allowing unlimited messages to be sent

1.40 WHEN WhatsApp message text is constructed THEN user input is not sanitized before inclusion in the message

1.41 WHEN `cacheManager.clear()` is called THEN it executes `flushdb()` which clears the entire Redis database including sessions, queues, and other non-cache data

1.42 WHEN cache keys are set THEN there is no namespace prefix, risking key collisions with other services sharing the same Redis instance

1.43 WHEN large payloads are cached THEN there is no max value size check, risking Redis memory exhaustion

1.44 WHEN `optionalBrand` middleware encounters an error THEN it silently swallows the error and continues, causing unscoped requests that return all-brand data

1.45 WHEN `expirePoints` runs THEN it processes all users in a single transaction, causing long-held database locks

1.46 WHEN a JWT is compromised THEN there is no token revocation mechanism — the token remains valid for up to 7 days

**Low Severity (L1–L11)**

1.47 WHEN `getCart` receives any coupon code THEN it applies a hardcoded 10% discount placeholder instead of validating the coupon

1.48 WHEN product ETag is generated THEN it uses `Date.now()` which changes on every request, defeating the caching purpose

1.49 WHEN a product slug is generated THEN there is no uniqueness check, allowing duplicate slugs

1.50 WHEN public product reviews are cached THEN the cache key includes the unvalidated `sort` query parameter, allowing cache pollution with arbitrary sort values

1.51 WHEN review media is uploaded THEN there is no file type or size validation

1.52 WHEN brand domains are added to the CORS allowed origins list THEN HTTP (non-HTTPS) origins are included for all brands even in production

1.53 WHEN `fshipService` receives a non-404 error for an order check THEN it assumes the order doesn't exist, risking duplicate FShip order creation

1.54 WHEN `fshipService` logs shipping data THEN it logs full customer data including addresses and phone numbers to console

1.55 WHEN WhatsApp API tokens are needed THEN they are fetched from the database on every call with no caching

1.56 WHEN `getBalance` reads the user's loyalty points THEN it reads without a lock, returning potentially stale balance

1.57 WHEN `getCurrentUser` returns user data THEN the response includes the `refreshToken` field


### Expected Behavior (Correct)

**RTO Score — Correct Calculation**

2.1 WHEN any order (COD or prepaid) is created THEN the system SHALL calculate the RTO risk score for all payment types, not just COD

2.2 WHEN the RTO scoring evaluates address quality THEN the system SHALL use a field that actually exists on the `ShippingAddress` model (e.g., address length or address quality score) instead of the non-existent `landmark` field

2.3 WHEN `getRtoCount` queries for prior RTO orders by phone THEN the system SHALL decrypt stored phone values or use a deterministic hash/index for phone lookup so that matches are found correctly

2.4 WHEN a prepaid order is created via the payment-first flow THEN the system SHALL calculate the actual RTO risk score instead of hardcoding it to 0

**Critical Security (S1–S7)**

2.5 WHEN `forgotPassword` is called THEN the system SHALL NOT return the `resetToken` in the HTTP response body — it SHALL only be sent via the email reset link

2.6 WHEN `updateProfile` is called THEN the system SHALL enforce that the authenticated user can only update their own profile (`req.user.id` must match the target), and SHALL NOT allow role changes through this endpoint

2.7 WHEN the mobile `login` endpoint is called THEN the system SHALL verify the OTP server-side (via MSG91 API verification) before issuing a JWT

2.8 WHEN the `authenticate` middleware resolves a user THEN the system SHALL check that `deleted_at` is null and reject authentication for soft-deleted users

2.9 WHEN CORS validates an origin containing `vercel.app` THEN the system SHALL use strict domain matching (e.g., `origin.endsWith('.vercel.app')`) to prevent subdomain spoofing; in non-production, the system SHALL NOT allow all arbitrary origins

2.10 WHEN `deleteUser` is called THEN the system SHALL only use `req.user.id` as the target user ID and SHALL NOT fall back to `req.params.id`

2.11 WHEN the `identifyBrand` middleware resolves a brand THEN the system SHALL verify that the authenticated user (if present) has access to that brand for write operations, preventing cross-tenant data modification

**High Severity (H1–H12)**

2.12 WHEN `addToCart` is called THEN the system SHALL wrap the stock check and cart item creation/update in a database transaction to prevent race conditions

2.13 WHEN `addToCart` is called THEN the system SHALL validate that the product exists, is active, and belongs to the current brand before adding it to the cart

2.14 WHEN `updateCartItem` is called to change quantity THEN the system SHALL re-validate stock availability for the new quantity before saving

2.15 WHEN a guest user validates a coupon THEN the system SHALL enforce per-user limits using a guest identifier (e.g., email or session) instead of skipping the check entirely

2.16 WHEN `applyCoupon` is called THEN the system SHALL use an atomic operation (transaction with row lock or `UPDATE ... WHERE usageCount < usageLimit`) to prevent concurrent requests from exceeding the usage limit

2.17 WHEN `applyCoupon` is called THEN the system SHALL re-calculate the discount amount server-side based on the coupon rules and cart contents, ignoring the client-provided `discountAmount`

2.18 WHEN `getUserShippingAddresses` returns addresses THEN the system SHALL return the decrypted phone value by ensuring the Sequelize getter is invoked correctly in the response serialization

2.19 WHEN `getGuestShippingAddresses` is called THEN the system SHALL require authentication or a verified token to access address data, preventing unauthenticated data leaks

2.20 WHEN `deleteReview` is called THEN the system SHALL verify that the caller is either the review owner or an admin before allowing deletion

2.21 WHEN the public review creation endpoint is called THEN the system SHALL enforce rate limiting (e.g., max 5 reviews per IP per 15 minutes) to prevent bot spam

2.22 WHEN `refreshToken` is called THEN the system SHALL look up the user by a stored token identifier or use an indexed lookup instead of iterating all users with bcrypt comparison

2.23 WHEN `getAllUsers` is called THEN the system SHALL support pagination (page/limit parameters) and SHALL exclude sensitive PII fields (phone, email) or mask them in the response

**Medium Severity (M1–M23)**

2.24 WHEN `addToCart` is called THEN the system SHALL validate that `quantity` is a positive integer (>= 1)

2.25 WHEN checkout or order creation occurs THEN the system SHALL re-validate product prices against current database values instead of using the stale cart price

2.26 WHEN `removeFromCart` cannot find the exact cart item THEN the system SHALL return a 404 error instead of falling back to deleting a different variation

2.27 WHEN `validateCoupon` checks `minPurchase` THEN the system SHALL calculate the cart total server-side from the user's actual cart instead of trusting the client-provided `cartTotal`

2.28 WHEN `getCouponById` is called THEN the system SHALL scope the query to the current brand (`req.brandId`)

2.29 WHEN `getUserCouponHistory` is called THEN the system SHALL only return history for the authenticated user (`req.user.id`), not an arbitrary `userId` from URL params

2.30 WHEN `updateShippingAddress` is called with a new phone number THEN the system SHALL ensure the phone value is properly encrypted before storage

2.31 WHEN `createGuestShippingAddress` is called THEN the system SHALL encrypt the phone number using the `encrypt()` function or ensure the Sequelize setter triggers correctly

2.32 WHEN a review is submitted THEN the system SHALL sanitize the review text to strip HTML tags and prevent stored XSS

2.33 WHEN `getReview` is called by a non-admin user THEN the system SHALL exclude moderation fields (`status`, `admin_notes`) from the response

2.34 WHEN product search processes user input for `Op.like` THEN the system SHALL escape SQL wildcard characters (`%`, `_`) in the search term

2.35 WHEN `getExistingImages` processes file paths THEN the system SHALL validate and sanitize paths to prevent directory traversal (reject `..` segments)

2.36 WHEN image deletion is performed THEN the system SHALL verify the image belongs to a product within the current brand scope

2.37 WHEN `fshipService` encounters an invalid phone number THEN the system SHALL throw a validation error instead of returning a hardcoded phone number

2.38 WHEN `fshipService.initialize()` is called THEN the system SHALL use a singleton guard (mutex or flag) to prevent concurrent initialization

2.39 WHEN WhatsApp messages are triggered THEN the system SHALL enforce rate limiting per recipient (e.g., max N messages per hour)

2.40 WHEN WhatsApp message text includes user input THEN the system SHALL sanitize the input before inclusion

2.41 WHEN cache needs to be cleared THEN the system SHALL use pattern-based key deletion (e.g., `SCAN` + `DEL` with a namespace prefix) instead of `flushdb()`

2.42 WHEN cache keys are set THEN the system SHALL prefix all keys with a namespace (e.g., `crosscoin:`) to prevent collisions

2.43 WHEN values are cached THEN the system SHALL enforce a maximum value size limit and reject or truncate oversized payloads

2.44 WHEN `optionalBrand` middleware encounters an error THEN the system SHALL log the error at warn level instead of silently swallowing it

2.45 WHEN `expirePoints` runs THEN the system SHALL process users in batches (e.g., 100 at a time) with separate transactions to avoid long-held locks

2.46 WHEN a user logs out or is soft-deleted THEN the system SHALL invalidate their JWT by storing a token blacklist or bumping a token version, preventing use of compromised tokens

**Low Severity (L1–L11)**

2.47 WHEN `getCart` receives a coupon code THEN the system SHALL validate the coupon and calculate the actual discount instead of applying a hardcoded 10% placeholder

2.48 WHEN product ETag is generated THEN the system SHALL use a content-based hash (e.g., hash of `updatedAt` timestamp) instead of `Date.now()`

2.49 WHEN a product slug is generated THEN the system SHALL check for uniqueness and append a suffix if a duplicate exists

2.50 WHEN public product reviews are cached THEN the system SHALL validate the `sort` parameter against an allowlist before including it in the cache key

2.51 WHEN review media is uploaded THEN the system SHALL validate file type (images/videos only) and enforce a maximum file size

2.52 WHEN brand domains are added to CORS THEN the system SHALL only add HTTPS origins in production, not HTTP

2.53 WHEN `fshipService` receives a non-404 error THEN the system SHALL treat it as an error condition and retry or fail gracefully instead of assuming the order doesn't exist

2.54 WHEN `fshipService` logs shipping data THEN the system SHALL redact or mask PII (phone numbers, full addresses) in log output

2.55 WHEN WhatsApp API tokens are needed THEN the system SHALL cache them with a reasonable TTL instead of fetching from the database on every call

2.56 WHEN `getBalance` reads loyalty points THEN the system SHALL use a shared lock or read from a consistent snapshot to avoid stale reads

2.57 WHEN `getCurrentUser` returns user data THEN the system SHALL exclude the `refreshToken` field from the response


### Unchanged Behavior (Regression Prevention)

**Order Creation & Payment Flow**

3.1 WHEN a valid COD order is created with correct shipping address, items, and stock THEN the system SHALL CONTINUE TO create the order with status `awaiting_confirmation`, decrement stock, record coupon usage, and emit `order.created` event

3.2 WHEN a valid prepaid order is created and payment is verified THEN the system SHALL CONTINUE TO create the order, verify the Razorpay signature, and update payment status to `paid`

3.3 WHEN an order is confirmed by an admin THEN the system SHALL CONTINUE TO transition status from `awaiting_confirmation` to `confirmed`, create status history, and trigger FShip sync

3.4 WHEN an order is cancelled within the allowed statuses THEN the system SHALL CONTINUE TO restore stock, decrement coupon usage, refund loyalty points, and update status to `cancelled`

3.5 WHEN the idempotency key matches an existing order THEN the system SHALL CONTINUE TO return the existing order with 200 status without creating a duplicate

**Authentication & User Management**

3.6 WHEN a valid user with correct credentials calls `adminLogin` THEN the system SHALL CONTINUE TO issue a JWT with 1-day expiry and return the user profile

3.7 WHEN a valid consumer calls `login` with a registered phone number THEN the system SHALL CONTINUE TO issue a JWT and refresh token (after OTP verification is added)

3.8 WHEN `register` is called with valid data THEN the system SHALL CONTINUE TO create a consumer account, hash the password, and link any guest orders by email

3.9 WHEN `resetPassword` is called with a valid, non-expired reset token THEN the system SHALL CONTINUE TO update the password and clear the reset token

3.10 WHEN `updateUser` is called by the authenticated user for their own profile THEN the system SHALL CONTINUE TO update allowed fields (username, email) and handle profile image upload

**Cart Operations**

3.11 WHEN `addToCart` is called with a valid product, variation, and sufficient stock THEN the system SHALL CONTINUE TO add the item to the cart or increment quantity if it already exists

3.12 WHEN `getCart` is called THEN the system SHALL CONTINUE TO return the cart with formatted items including images, prices, stock levels, and summary totals

3.13 WHEN `clearCart` is called THEN the system SHALL CONTINUE TO remove all items from the user's cart

**Coupon Operations**

3.14 WHEN `validateCoupon` is called with a valid, active, non-expired coupon code and sufficient cart total THEN the system SHALL CONTINUE TO return the calculated discount amount and final amount

3.15 WHEN `createCoupon` is called with valid data by an admin THEN the system SHALL CONTINUE TO create the coupon with all fields including tiered and quantity-based discounts

3.16 WHEN `getPublicCoupons` is called THEN the system SHALL CONTINUE TO return only active, non-expired coupons scoped to the current brand

**Shipping Address Operations**

3.17 WHEN `createShippingAddress` is called with valid data THEN the system SHALL CONTINUE TO create the address with encrypted phone, set as default if it's the first address

3.18 WHEN `deleteShippingAddress` is called for an address owned by the user THEN the system SHALL CONTINUE TO delete it and reassign default if needed

3.19 WHEN `setDefaultShippingAddress` is called THEN the system SHALL CONTINUE TO unset the previous default and set the new one

**Review Operations**

3.20 WHEN `createReview` is called by an authenticated user for a product they haven't reviewed THEN the system SHALL CONTINUE TO create the review with pending status and handle image uploads

3.21 WHEN `moderateReview` is called by an admin THEN the system SHALL CONTINUE TO update review status, featured flag, and recalculate product review statistics

3.22 WHEN `getPublicProductReviews` is called THEN the system SHALL CONTINUE TO return only approved reviews with pagination, rating stats, and cached results

**Brand & CORS**

3.23 WHEN a request includes a valid `X-Brand-Name` header for an active brand THEN the system SHALL CONTINUE TO attach the brand to the request and allow the request to proceed

3.24 WHEN a request originates from a whitelisted static origin or a valid brand domain THEN the system SHALL CONTINUE TO allow the CORS request

**Cache & Loyalty**

3.25 WHEN `cacheManager.set` is called with a key and value THEN the system SHALL CONTINUE TO store the serialized value in Redis with the specified TTL

3.26 WHEN `creditPoints` is called for a delivered order THEN the system SHALL CONTINUE TO calculate points based on the earn rate, create a loyalty transaction, and update the user's balance

3.27 WHEN `cancelOrder` triggers `refundPoints` THEN the system SHALL CONTINUE TO refund any redeemed points for the cancelled order

**FShip & WhatsApp**

3.28 WHEN `syncOrderToFShip` is called for a confirmed order THEN the system SHALL CONTINUE TO build the FShip payload, create the forward order, and update the order with waybill and tracking info

3.29 WHEN WhatsApp order confirmation is triggered after order creation THEN the system SHALL CONTINUE TO send the confirmation message with order details
