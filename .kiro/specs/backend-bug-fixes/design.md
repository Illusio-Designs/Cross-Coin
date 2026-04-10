# Backend Bug Fixes — Bugfix Design

## Overview

The CrossCoin backend has 57 open bugs spanning critical security vulnerabilities, broken business logic (RTO scoring), authorization bypasses, data leaks, race conditions, and operational issues. The fix strategy groups bugs into 6 implementation batches ordered by severity: critical security first, then high severity, then medium and low. Each batch targets a logical grouping of related files/subsystems to minimize merge conflicts and enable incremental testing.

## Glossary

- **Bug_Condition (C)**: The set of inputs/states that trigger a specific bug — e.g., a request with a forged `X-Brand-Name` header, a negative cart quantity, or a plaintext phone query against encrypted data
- **Property (P)**: The desired correct behavior when the bug condition holds — e.g., the request is rejected, the quantity is validated, or the phone lookup uses decryption
- **Preservation**: Existing correct behaviors that must remain unchanged after fixes — e.g., valid COD orders still create successfully, valid coupons still apply, CORS still allows legitimate origins
- **RTO**: Return To Origin — when a shipped order is returned undelivered
- **AES-256-GCM**: Encryption scheme used for `ShippingAddress.phone` with custom Sequelize getter/setter
- **IDOR**: Insecure Direct Object Reference — accessing another user's data via URL parameter manipulation
- **PBT**: Property-Based Testing — generating random inputs to verify correctness properties hold universally

## Bug Details

### Bug Condition

The 57 bugs manifest across 6 categories. The overarching bug condition is: any request that exercises an unvalidated input, missing authorization check, broken query, race condition, or missing sanitization in the affected endpoints.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { request, endpoint, userState, systemState }
  OUTPUT: boolean

  // Batch 1: Critical Security
  RETURN (input.endpoint == 'forgotPassword' AND response contains resetToken)
      OR (input.endpoint == 'updateProfile' AND input.request.params.id != input.userState.authenticatedUserId)
      OR (input.endpoint == 'mobileLogin' AND input.request.otp NOT verified server-side)
      OR (input.userState.deleted_at != null AND input.request.hasValidJWT)
      OR (input.request.origin contains 'vercel.app' AND NOT endsWith('.vercel.app'))
      OR (input.endpoint == 'deleteUser' AND fallsBackToParamsId)
      OR (input.request.header['X-Brand-Name'] AND NO user-brand access check)

  // Batch 2: RTO Score
      OR (input.endpoint == 'createOrder' AND input.request.payment_type != 'cod' AND rtoScore == 0)
      OR (input.endpoint == 'createOrder' AND checks non-existent 'landmark' field)
      OR (input.endpoint == 'getRtoCount' AND queries plaintext against encrypted phone)
      OR (input.endpoint == 'createOrderFromSession' AND rtoRiskScore hardcoded to 0)

  // Batch 3: High Severity (Auth/Data)
      OR (input.endpoint == 'addToCart' AND concurrent requests AND no transaction)
      OR (input.endpoint == 'addToCart' AND product does not exist or is inactive)
      OR (input.endpoint == 'updateCartItem' AND no stock revalidation)
      OR (input.endpoint == 'validateCoupon' AND input.userState.isGuest AND no usage limit)
      OR (input.endpoint == 'applyCoupon' AND concurrent requests AND no atomic check)
      OR (input.endpoint == 'applyCoupon' AND discountAmount from client)
      OR (input.endpoint == 'getUserShippingAddresses' AND phone is encrypted blob)
      OR (input.endpoint == 'getGuestShippingAddresses' AND no auth required)
      OR (input.endpoint == 'deleteReview' AND caller != owner AND caller != admin)
      OR (input.endpoint == 'createPublicReview' AND no rate limit)
      OR (input.endpoint == 'refreshToken' AND iterates all users)
      OR (input.endpoint == 'getAllUsers' AND no pagination)

  // Batch 4-6: Medium and Low severity conditions (see individual properties)
END FUNCTION
```

### Examples

- **S1**: `POST /api/users/forgot-password { email: "victim@example.com" }` → response body contains `{ resetToken: "abc123..." }` — attacker uses token to reset password without email access
- **S2**: `PUT /api/users/profile/42` with auth token for user 7 → user 42's profile is updated, including `role: "admin"`
- **RTO**: `POST /api/orders { payment_type: "razorpay", ... }` → `rtoRiskScore` stays 0 because scoring is gated behind `payment_type === 'cod'`
- **H1**: Two concurrent `POST /api/cart/items { productId: 5, quantity: 1 }` when stock=1 → both succeed, stock goes to -1
- **M18**: `cacheManager.clear()` → `flushdb()` wipes sessions, queues, and all non-cache Redis data

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Valid COD and prepaid order creation with correct stock, coupon, and payment flows (3.1, 3.2)
- Admin order confirmation triggering FShip sync and WhatsApp notification (3.3)
- Order cancellation with stock restoration, coupon refund, and loyalty refund (3.4)
- Idempotency key deduplication returning existing orders (3.5)
- Admin login with valid credentials issuing JWT (3.6)
- User registration creating consumer accounts and linking guest orders (3.8)
- Password reset with valid non-expired token (3.9)
- Cart add/get/clear operations for valid products with sufficient stock (3.11, 3.12, 3.13)
- Coupon validation, creation, and public listing for valid coupons (3.14, 3.15, 3.16)
- Shipping address CRUD with encryption for authenticated users (3.17, 3.18, 3.19)
- Review creation, moderation, and public listing (3.20, 3.21, 3.22)
- Brand identification from valid `X-Brand-Name` header (3.23)
- CORS allowing whitelisted static origins and valid brand domains (3.24)
- Cache set/get operations with TTL (3.25)
- Loyalty point credit, debit, and refund (3.26, 3.27)
- FShip sync for confirmed orders (3.28)
- WhatsApp order confirmation messages (3.29)

**Scope:**
All inputs that do NOT trigger any of the 57 bug conditions should produce identical behavior before and after the fix. This includes:
- Legitimate authenticated requests to own resources
- Valid product/cart/order operations with correct data
- Properly scoped brand requests
- CORS requests from whitelisted origins

## Hypothesized Root Cause

Based on the bug analysis, the root causes fall into these categories:

1. **Missing Authorization Checks**: Multiple endpoints accept user-controlled IDs from URL params or request body without verifying ownership (S2, S6, H8, H9, M6, M10, M29). The pattern is `req.params.id` used directly instead of `req.user.id`.

2. **Missing Input Validation**: Endpoints trust client-provided values without server-side verification (S3, H6, M1, M4, M17, M27). The `discountAmount` and `cartTotal` from client are used directly.

3. **Broken Encryption Queries**: `getRtoCount` queries `ShippingAddress.phone` with plaintext against AES-256-GCM encrypted values. Since AES-GCM is non-deterministic (random IV), `WHERE phone = ?` never matches. The Sequelize getter decrypts on read but `findAll({ where: { phone } })` compares at the SQL level against raw encrypted bytes.

4. **Missing Transactions/Atomicity**: Cart operations (H1), coupon application (H5), and FShip initialization (M15) lack transactions or mutex guards, enabling race conditions under concurrent requests.

5. **Overly Broad Access**: CORS substring match `origin.includes('vercel.app')` (S5), `flushdb()` clearing all Redis data (M18), no cache key namespacing (M19), and `optionalBrand` silently swallowing errors (M21).

6. **Information Leakage**: Reset token in response (S1), refresh token in user response (L11), PII in logs (L8), moderation state exposed (M10), all users without pagination (H12).

7. **Hardcoded/Placeholder Logic**: RTO score hardcoded to 0 in payment-first flow (1.4), 10% discount placeholder in `getCart` (L1), hardcoded phone `9876543210` for invalid numbers (M14).

## Correctness Properties

Property 1: Bug Condition — Critical Security Fixes (Batch 1)

_For any_ request where a security bug condition holds (forgotPassword leaking token, updateProfile with foreign ID, unverified OTP login, soft-deleted user authenticating, CORS subdomain spoofing, deleteUser fallback to params.id, or cross-tenant brand access), the fixed code SHALL reject the request or remove the leaked data from the response, returning an appropriate 4xx error.

**Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11**

Property 2: Bug Condition — RTO Score Calculation (Batch 2)

_For any_ order creation (COD or prepaid) where the user has prior RTO history or address quality issues, the fixed code SHALL calculate the RTO risk score correctly by: scoring all payment types, using an existing model field instead of `landmark`, querying encrypted phone via decryption or hash index, and computing the actual score in the payment-first flow.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 3: Bug Condition — High Severity Fixes (Batch 3)

_For any_ request where a high-severity bug condition holds (cart race condition, missing product validation, stock revalidation skip, guest coupon bypass, coupon race condition, client discount amount, encrypted phone in response, unauthenticated guest address access, unauthorized review deletion, missing rate limit, O(n) refresh token, unpaginated user list), the fixed code SHALL enforce the correct validation, authorization, atomicity, or pagination.

**Validates: Requirements 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23**

Property 4: Bug Condition — Medium Severity Fixes (Batch 4)

_For any_ request where a medium-severity bug condition holds (negative quantity, stale price, wrong variation removal, client cartTotal, cross-brand coupon, IDOR coupon history, phone encryption issues, XSS in reviews, moderation leak, SQL wildcard injection, directory traversal, cross-brand image deletion, hardcoded phone, singleton race, WhatsApp rate limit/sanitization, flushdb, no namespace, no size limit, silent error swallow, batch expiry, no token revocation), the fixed code SHALL enforce the correct validation, sanitization, scoping, or operational safeguard.

**Validates: Requirements 2.24–2.46**

Property 5: Bug Condition — Low Severity Fixes (Batch 5)

_For any_ request where a low-severity bug condition holds (hardcoded discount, Date.now ETag, duplicate slug, cache pollution, missing upload validation, HTTP CORS in production, FShip error assumption, PII logging, uncached WhatsApp tokens, stale balance, refresh token leak), the fixed code SHALL apply the correct logic, validation, or data handling.

**Validates: Requirements 2.47–2.57**

Property 6: Preservation — Existing Behavior Unchanged

_For any_ input where none of the 57 bug conditions hold (valid authenticated requests to own resources, correct cart/order/coupon operations, legitimate CORS origins, properly scoped brand requests), the fixed code SHALL produce the same result as the original code, preserving all existing functionality.

**Validates: Requirements 3.1–3.29**

## Fix Implementation

### Changes Required

Fixes are organized into 6 batches for incremental implementation and testing.

---

### Batch 1: Critical Security (S1–S7)

**File**: `Backend/controller/userController.js`

**S1 — forgotPassword leaks resetToken**
- Remove `resetToken` from the HTTP response body
- Only include it in the email reset link URL
- Response should only confirm "Reset email sent" without the token

**S2 — updateProfile IDOR**
- Replace `req.params.id` with `req.user.id` as the target user
- Strip `role` from the allowed update fields to prevent role escalation
- Add ownership check: if params.id is provided, verify it matches `req.user.id`

**S3 — Mobile login skips OTP verification**
- Add server-side OTP verification via MSG91 API before issuing JWT
- Reject login if OTP is not verified or expired

**S6 — deleteUser fallback to params.id**
- Remove the `req.params.id` fallback entirely
- Always use `req.user.id` as the target for deletion

**S7 — Cross-tenant brand access (brandMiddleware.js)**
- For write operations (POST, PUT, DELETE), verify the authenticated user has access to the resolved brand
- Admin users bypass the check; consumers are scoped to their brand

**File**: `Backend/middleware/authMiddleware.js`

**S4 — Soft-deleted users can authenticate**
- Add `deleted_at: null` condition to the `User.findByPk` query in `authenticate`
- Or add a check after fetch: `if (user.deleted_at) return 401`

**File**: `Backend/config/corsConfig.js`

**S5 — CORS subdomain spoofing**
- Replace `origin.includes('vercel.app')` with strict check: `origin.endsWith('.vercel.app') || origin === 'https://vercel.app'`
- In non-production, log a warning but still restrict to known patterns (don't allow all origins)

**File**: `Backend/controller/userController.js`

**L11 — getCurrentUser leaks refreshToken**
- Exclude `refreshToken` from the user response in `getCurrentUser`

---

### Batch 2: RTO Score (4 root causes)

**File**: `Backend/controller/orderController.js`

**1.1 — RTO scoring only for COD**
- Move RTO risk scoring outside the `if (payment_type === 'cod')` block
- Keep COD-specific logic (max value cap, COD blocking) inside the COD block

**1.2 — Non-existent landmark field**
- Replace `!shippingAddress.landmark` with a check on an existing field
- Use address quality score from `addressQualityService` or check `address.length < threshold`

**1.3 — getRtoCount queries plaintext against encrypted phone**
- Modify `getRtoCount` to: fetch all addresses for the user by `user_id` instead of by phone, OR decrypt phone values in application code for comparison, OR add a deterministic phone hash column for lookups

**File**: `Backend/services/orderCreationService.js`

**1.4 — rtoRiskScore hardcoded to 0 in payment-first flow**
- Import and call the same RTO scoring logic used in `orderController.createOrder`
- Extract RTO scoring into a shared utility function callable from both flows

---

### Batch 3: High Severity (H1–H12)

**File**: `Backend/controller/cartController.js`

**H1 — addToCart race condition**
- Wrap stock check + cart item creation/update in a Sequelize transaction
- Use `SELECT ... FOR UPDATE` on the product variation row during stock check

**H2 — No product existence validation**
- Before adding to cart, verify product exists, is active, and belongs to current brand

**H3 — No stock revalidation on quantity update**
- In `updateCartItem`, re-check stock availability for the new total quantity

**M1 — Negative quantity accepted**
- Validate `quantity` is a positive integer >= 1 before processing

**L1 — Hardcoded 10% discount in getCart**
- Remove the hardcoded discount placeholder
- Either validate the coupon properly or remove coupon preview from getCart

**File**: `Backend/controller/couponController.js`

**H4 — Guest users bypass coupon usage limit**
- When `userId` is undefined, use guest identifier (email or session ID) for usage tracking
- Never skip the per-user limit check

**H5 — applyCoupon race condition**
- Use `UPDATE coupons SET usageCount = usageCount + 1 WHERE id = ? AND usageCount < usageLimit` for atomic increment
- Or wrap in transaction with row lock

**H6 — Client-provided discountAmount**
- Ignore `req.body.discountAmount`
- Re-calculate discount server-side based on coupon rules and actual cart contents

**M4 — Client cartTotal trusted for minPurchase**
- Calculate cart total server-side from the user's actual cart items

**M5 — getCouponById no brand scoping**
- Add `brand_id: req.brandId` to the query WHERE clause

**M6 — getUserCouponHistory IDOR**
- Replace `req.params.userId` with `req.user.id`

**File**: `Backend/controller/shippingAddressController.js`

**H7 — Encrypted phone blobs in response**
- Ensure response serialization invokes the Sequelize getter by using `addr.get({ plain: true })` or explicitly mapping `phone: addr.phone`

**H8 — getGuestShippingAddresses unauthenticated data leak**
- Require authentication or a verified guest token
- Remove the public endpoint or gate it behind auth middleware

**M7 — updateShippingAddress phone not re-encrypted**
- Ensure the Sequelize setter triggers by using `instance.phone = newValue` (not raw update)

**M8 — createGuestShippingAddress phone unencrypted**
- Use `ShippingAddress.create({ phone: value })` which triggers the setter, or explicitly call `encrypt()`

**File**: `Backend/controller/reviewController.js`

**H9 — deleteReview no authorization**
- Check `review.user_id === req.user.id || req.user.role === 'admin'` before deletion

**H10 — No rate limiting on public review creation**
- Add rate limiting middleware (e.g., 5 reviews per IP per 15 minutes)

**M9 — Review text XSS**
- Sanitize review text (strip HTML tags) before storage using a library like `sanitize-html` or `DOMPurify`

**M10 — Single review leaks moderation state**
- For non-admin users, exclude `status` and `admin_notes` from the response

**L4 — Cache key includes unvalidated sort param**
- Validate `sort` against an allowlist (`newest`, `highest`, `lowest`) before using in cache key

**L5 — No file type/size validation on review uploads**
- Add file type validation (images/videos only) and max size limit in upload middleware

**File**: `Backend/controller/userController.js`

**H11 — refreshToken O(n) DoS**
- Store the refresh token hash alongside the user ID
- On refresh, decode the token to get the user ID, fetch that single user, then bcrypt.compare

**H12 — getAllUsers no pagination**
- Add `page` and `limit` query parameters with defaults
- Exclude or mask PII fields (phone, email) in the response

---

### Batch 4: Medium Severity — Product, FShip, WhatsApp

**File**: `Backend/controller/productController.js`

**M11 — SQL wildcard injection in search**
- Escape `%` and `_` characters in user search input before using with `Op.like`

**M12 — Directory traversal in getExistingImages**
- Validate and sanitize file paths: reject any path containing `..` segments
- Use `path.resolve` and verify the resolved path is within the allowed directory

**M13 — Cross-brand image deletion**
- Verify the image's product belongs to the current brand before allowing deletion

**L2 — ETag uses Date.now()**
- Replace `Date.now()` with a content-based hash (e.g., hash of product `updatedAt`)

**L3 — Slug uniqueness not checked**
- After generating slug, query for existing slugs and append `-2`, `-3` etc. if duplicate found

**File**: `Backend/services/fshipService.js`

**M14 — Hardcoded phone 9876543210**
- Throw a validation error when phone is invalid instead of returning a hardcoded number

**M15 — Singleton initialize() race condition**
- Add a mutex/flag: if `this.initializing` promise exists, await it instead of re-initializing

**L7 — Non-404 error assumed as "order doesn't exist"**
- Only treat 404 as "not found"; for other errors, throw/retry instead of assuming non-existence

**L8 — PII logged to console**
- Redact phone numbers and addresses in log output (mask all but last 4 digits)

**File**: `Backend/services/whatsappService.js`

**M16 — No rate limiting on WhatsApp messages**
- Add per-recipient rate limiting (e.g., max 10 messages per phone per hour) using Redis counters

**M17 — No input sanitization on message text**
- Sanitize user-provided text before including in WhatsApp message payloads

**L9 — API tokens fetched from DB every call**
- Cache WhatsApp credentials in memory or Redis with a 5-minute TTL

---

### Batch 5: Medium Severity — Cache, Brand, Loyalty, Auth

**File**: `Backend/services/cacheManager.js`

**M18 — flushdb() clears entire Redis**
- Replace `flushdb()` in `clear()` with pattern-based deletion using `SCAN` + `DEL` with the namespace prefix

**M19 — No cache key namespacing**
- Prefix all cache keys with `crosscoin:` (or configurable namespace)
- Update `set`, `get`, `delete`, `invalidate`, `exists`, `getTTL`, `expire`, `getKeys` to prepend the prefix

**M20 — No max value size check**
- Before `set`, check `JSON.stringify(value).length` against a configurable max (e.g., 1MB)
- Log a warning and skip caching if exceeded

**File**: `Backend/middleware/brandMiddleware.js`

**M21 — optionalBrand swallows errors silently**
- In the catch block, log the error at warn level using the structured logger instead of `console.error` + silent `next()`
- Still call `next()` but ensure the error is visible in logs

**File**: `Backend/services/loyaltyService.js`

**M22 — expirePoints processes all users in single transaction**
- Process users in batches (e.g., 100 at a time) with separate transactions per batch
- Use `LIMIT` and `OFFSET` or cursor-based pagination

**L10 — getBalance stale read**
- Use `lock: true` (shared lock) or `SELECT ... LOCK IN SHARE MODE` for consistent reads
- Or accept eventual consistency with a comment documenting the trade-off

**File**: `Backend/middleware/authMiddleware.js`

**M23 — No token revocation**
- Implement a token blacklist in Redis (key: `blacklist:{jti}`, TTL: token remaining lifetime)
- On logout and soft-delete, add the token's JTI to the blacklist
- In `authenticate`, check the blacklist before allowing the request

---

### Batch 6: Low Severity — CORS, Cart, Product

**File**: `Backend/config/corsConfig.js`

**L6 — HTTP origins in production**
- In the `fetchBrandDomains` function, only add `https://` origins when `NODE_ENV === 'production'`
- Keep HTTP origins for development only

**File**: `Backend/controller/cartController.js`

**M2 — Stale price at checkout**
- At checkout/order creation, re-fetch current product prices and compare with cart prices
- If prices differ, either update the cart or warn the user

**M3 — Remove fallback deletes wrong variation**
- Remove the fallback logic that deletes by `productId` alone
- Return 404 if the exact product + variation match is not found

**File**: `Backend/controller/productController.js`

**L2, L3** — (covered in Batch 4)

**File**: `Backend/controller/reviewController.js`

**L4, L5** — (covered in Batch 3)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior. Given the breadth of 57 bugs, tests are organized by batch.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing fixes. Confirm or refute the root cause analysis for each batch.

**Test Plan**: Write integration/unit tests that exercise each bug condition on the UNFIXED code to observe failures and validate our root cause hypotheses.

**Test Cases**:
1. **S1 — Reset Token Leak**: Call `forgotPassword` and assert the response body contains `resetToken` (will pass on unfixed code, confirming the leak)
2. **S2 — Profile IDOR**: Authenticate as user A, call `PUT /profile/B` and assert user B's profile is modified (will succeed on unfixed code)
3. **S4 — Soft-deleted Auth**: Create a soft-deleted user, present their JWT, assert authentication succeeds (will pass on unfixed code)
4. **RTO — Plaintext Phone Query**: Create an order with a known phone, query `getRtoCount` with plaintext, assert it returns 0 (will return 0 on unfixed code due to encryption mismatch)
5. **H1 — Cart Race Condition**: Send concurrent `addToCart` requests for a product with stock=1, assert both succeed (will oversell on unfixed code)
6. **H5 — Coupon Race Condition**: Send concurrent `applyCoupon` requests for a coupon with usageLimit=1, assert both succeed (will exceed limit on unfixed code)
7. **M18 — flushdb Scope**: Set a non-cache Redis key, call `cacheManager.clear()`, assert the non-cache key is deleted (will be deleted on unfixed code)

**Expected Counterexamples**:
- Security endpoints return sensitive data or allow unauthorized access
- RTO count always returns 0 regardless of actual RTO history
- Concurrent requests exceed stock/coupon limits
- `flushdb()` destroys non-cache data

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedEndpoint(input)
  ASSERT expectedBehavior(result)
  // e.g., forgotPassword response does NOT contain resetToken
  // e.g., updateProfile with foreign ID returns 403
  // e.g., getRtoCount returns actual RTO count
  // e.g., concurrent addToCart does not oversell
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where no bug condition holds, the fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalEndpoint(input) = fixedEndpoint(input)
  // e.g., valid COD order creation still works
  // e.g., legitimate CORS origins still allowed
  // e.g., authenticated user can still update own profile
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for legitimate operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Order Creation Preservation**: Verify valid COD/prepaid orders still create correctly with proper stock decrement, coupon usage, and event emission
2. **Auth Preservation**: Verify valid users can still authenticate, refresh tokens, and access their own profiles
3. **Cart Preservation**: Verify valid add/update/remove/clear operations work correctly for in-stock products
4. **CORS Preservation**: Verify whitelisted origins and valid brand domains are still allowed
5. **Cache Preservation**: Verify cache set/get/delete/invalidate operations work correctly with namespaced keys

### Unit Tests

- Test each security fix in isolation (S1–S7): verify unauthorized requests are rejected
- Test RTO scoring with mocked data: verify correct scores for COD, prepaid, repeat RTO customers
- Test cart operations with transactions: verify stock consistency under concurrent access
- Test coupon validation with server-side calculation: verify correct discount amounts
- Test phone encryption/decryption round-trip in shipping address operations
- Test review authorization: verify owner and admin can delete, others cannot
- Test cache operations with namespace prefix: verify key isolation
- Test input sanitization: verify XSS payloads are stripped from review text
- Test path traversal prevention: verify `..` segments are rejected

### Property-Based Tests

- Generate random user IDs and verify `updateProfile` only allows self-updates
- Generate random origins and verify CORS only allows exact matches from the allowlist
- Generate random cart quantities and verify only positive integers are accepted
- Generate random coupon codes and verify server-side discount calculation matches coupon rules
- Generate random phone numbers and verify encryption round-trip preserves the original value
- Generate random review text with HTML and verify sanitization strips all tags
- Generate random file paths and verify directory traversal is prevented
- Generate random cache keys and verify namespace prefix is always applied

### Integration Tests

- Test full order creation flow (COD + prepaid) with RTO scoring end-to-end
- Test concurrent cart operations with multiple users and verify stock consistency
- Test coupon application flow from validation through order creation
- Test user lifecycle: register → login → update profile → delete → verify JWT rejected
- Test brand scoping: verify cross-brand data access is blocked for all endpoints
- Test cache clear: verify only cache keys are removed, not sessions or queues
- Test WhatsApp message flow with rate limiting: verify messages are throttled correctly
