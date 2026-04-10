# Implementation Plan

## Batch 1: Critical Security (S1–S7)

- [x] 1. Write bug condition exploration test — Critical Security
  - **Property 1: Bug Condition** — Critical Security Vulnerabilities
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the security bugs exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for each security bug
  - Test S1: Call `forgotPassword` and assert response body does NOT contain `resetToken` (will FAIL on unfixed code — token is leaked)
  - Test S2: Authenticate as user A, call `PUT /profile/:userB_id` and assert 403 is returned (will FAIL — IDOR allows update)
  - Test S3: Call mobile `login` without server-side OTP verification and assert 401 (will FAIL — JWT issued without OTP check)
  - Test S4: Present JWT for soft-deleted user and assert 401 (will FAIL — auth succeeds for deleted users)
  - Test S5: Send request with origin `evil-vercel.app.attacker.com` and assert CORS rejects it (will FAIL — substring match allows it)
  - Test S6: Call `deleteUser` with `req.user` undefined and assert it does NOT fall back to `req.params.id` (will FAIL — fallback exists)
  - Test S7: Set `X-Brand-Name` header to a brand the user has no access to and assert 403 for write operations (will FAIL — no access check)
  - Test L11: Call `getCurrentUser` and assert response does NOT contain `refreshToken` (will FAIL — token is leaked)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.57_

- [x] 2. Write preservation property tests — Auth & User flows (BEFORE implementing fix)
  - **Property 2: Preservation** — Authentication & User Management Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Valid admin login with correct credentials returns JWT and user profile on unfixed code (3.6)
  - Observe: User registration creates consumer account and links guest orders (3.8)
  - Observe: Password reset with valid non-expired token updates password (3.9)
  - Observe: Authenticated user can update their own profile fields (3.10)
  - Write property-based tests: for all valid auth/user inputs (correct credentials, own profile, valid tokens), behavior is preserved
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.6, 3.8, 3.9, 3.10_

- [x] 3. Batch 1 — Critical Security Fixes (S1–S7, L11)

  - [x] 3.1 Fix forgotPassword resetToken leak in `Backend/controller/userController.js`
    - Remove `resetToken` from the HTTP response body
    - Only include token in the email reset link URL
    - Response should only confirm "Reset email sent"
    - _Bug_Condition: endpoint == 'forgotPassword' AND response contains resetToken_
    - _Expected_Behavior: response does NOT contain resetToken (2.5)_
    - _Preservation: password reset with valid token still works (3.9)_
    - _Requirements: 1.5, 2.5_

  - [x] 3.2 Fix updateProfile IDOR in `Backend/controller/userController.js`
    - Replace `req.params.id` with `req.user.id` as the target user
    - Strip `role` from allowed update fields
    - _Bug_Condition: req.params.id != req.user.id_
    - _Expected_Behavior: only own profile can be updated, role changes blocked (2.6)_
    - _Preservation: authenticated user can still update own profile (3.10)_
    - _Requirements: 1.6, 2.6_

  - [x] 3.3 Fix mobile login OTP bypass in `Backend/controller/userController.js`
    - Add server-side OTP verification via MSG91 API before issuing JWT
    - Reject login if OTP is not verified or expired
    - _Bug_Condition: mobileLogin AND otp NOT verified server-side_
    - _Expected_Behavior: JWT only issued after server-side OTP verification (2.7)_
    - _Preservation: valid consumer login still works after OTP verification (3.7)_
    - _Requirements: 1.7, 2.7_

  - [x] 3.4 Fix soft-deleted user authentication in `Backend/middleware/authMiddleware.js`
    - Add `deleted_at: null` condition to `User.findByPk` in `authenticate`
    - _Bug_Condition: user.deleted_at != null AND request has valid JWT_
    - _Expected_Behavior: soft-deleted users get 401 (2.8)_
    - _Preservation: valid users still authenticate (3.6)_
    - _Requirements: 1.8, 2.8_

  - [x] 3.5 Fix CORS subdomain spoofing in `Backend/config/corsConfig.js`
    - Replace `origin.includes('vercel.app')` with `origin.endsWith('.vercel.app')`
    - Remove blanket allow-all in non-production after brand domain check fails
    - _Bug_Condition: origin contains 'vercel.app' but is NOT a valid subdomain_
    - _Expected_Behavior: only exact `.vercel.app` subdomains allowed (2.9)_
    - _Preservation: whitelisted origins and valid brand domains still allowed (3.24)_
    - _Requirements: 1.9, 2.9_

  - [x] 3.6 Fix deleteUser fallback to params.id in `Backend/controller/userController.js`
    - Remove `req.params.id` fallback; always use `req.user.id`
    - _Bug_Condition: req.user undefined AND fallsBackToParamsId_
    - _Expected_Behavior: only own account can be deleted (2.10)_
    - _Requirements: 1.10, 2.10_

  - [x] 3.7 Fix cross-tenant brand access in `Backend/middleware/brandMiddleware.js`
    - For write operations (POST, PUT, DELETE), verify authenticated user has access to the resolved brand
    - Admin users bypass; consumers scoped to their brand
    - _Bug_Condition: X-Brand-Name header set AND no user-brand access check_
    - _Expected_Behavior: cross-tenant writes blocked (2.11)_
    - _Preservation: valid brand requests still proceed (3.23)_
    - _Requirements: 1.11, 2.11_

  - [x] 3.8 Fix getCurrentUser refreshToken leak in `Backend/controller/userController.js`
    - Exclude `refreshToken` from the user response in `getCurrentUser`
    - _Bug_Condition: getCurrentUser response includes refreshToken_
    - _Expected_Behavior: refreshToken excluded from response (2.57)_
    - _Requirements: 1.57, 2.57_

  - [x] 3.9 Verify bug condition exploration test now passes (Batch 1)
    - **Property 1: Expected Behavior** — Critical Security Fixes
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - **EXPECTED OUTCOME**: Test PASSES (confirms security bugs are fixed)
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.57_

  - [x] 3.10 Verify preservation tests still pass (Batch 1)
    - **Property 2: Preservation** — Authentication & User Management
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all auth/user flows still work after security fixes

- [x] 4. Checkpoint — Batch 1 complete
  - Ensure all Batch 1 tests pass, ask the user if questions arise


## Batch 2: RTO Score (4 root causes)

- [x] 5. Write bug condition exploration test — RTO Score
  - **Property 1: Bug Condition** — RTO Score Always LOW
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples that demonstrate the RTO scoring bugs
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for each RTO root cause
  - Test 1.1: Create a prepaid order and assert `rtoRiskScore` is NOT 0 (will FAIL — scoring gated behind `payment_type === 'cod'`)
  - Test 1.2: Create a COD order with address that has no landmark and assert scoring uses an existing model field (will FAIL — checks non-existent `landmark`)
  - Test 1.3: Call `getRtoCount` with a phone number that has prior RTO orders and assert count > 0 (will FAIL — plaintext vs encrypted mismatch)
  - Test 1.4: Create a prepaid order via payment-first flow and assert `rtoRiskScore` is calculated (will FAIL — hardcoded to 0)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Write preservation property tests — Order Creation flows (BEFORE implementing fix)
  - **Property 2: Preservation** — Order Creation & Payment Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Valid COD order creates with status `awaiting_confirmation`, decrements stock, records coupon usage, emits event (3.1)
  - Observe: Valid prepaid order creates with Razorpay signature verification and payment status `paid` (3.2)
  - Observe: Idempotency key returns existing order without duplicate creation (3.5)
  - Write property-based tests: for all valid order inputs (correct payment, valid items, sufficient stock), order creation behavior is preserved
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 7. Batch 2 — RTO Score Fixes

  - [x] 7.1 Fix RTO scoring gated behind COD in `Backend/controller/orderController.js`
    - Move RTO risk scoring outside the `if (payment_type === 'cod')` block
    - Keep COD-specific logic (max value cap, COD blocking) inside the COD block
    - _Bug_Condition: payment_type != 'cod' AND rtoScore == 0_
    - _Expected_Behavior: RTO score calculated for all payment types (2.1)_
    - _Preservation: valid COD/prepaid orders still create correctly (3.1, 3.2)_
    - _Requirements: 1.1, 2.1_

  - [x] 7.2 Fix non-existent landmark field in `Backend/controller/orderController.js`
    - Replace `!shippingAddress.landmark` with check on existing field (address length or quality score)
    - _Bug_Condition: scoring checks non-existent 'landmark' field_
    - _Expected_Behavior: use existing model field for address quality (2.2)_
    - _Requirements: 1.2, 2.2_

  - [x] 7.3 Fix getRtoCount plaintext vs encrypted phone in `Backend/controller/orderController.js`
    - Modify `getRtoCount` to query by `user_id` instead of phone, or decrypt for comparison, or add deterministic hash column
    - _Bug_Condition: queries plaintext against encrypted phone_
    - _Expected_Behavior: phone lookup matches correctly (2.3)_
    - _Requirements: 1.3, 2.3_

  - [x] 7.4 Fix hardcoded rtoRiskScore in `Backend/services/orderCreationService.js`
    - Extract RTO scoring into shared utility; call from both order creation flows
    - _Bug_Condition: payment-first flow AND rtoRiskScore hardcoded to 0_
    - _Expected_Behavior: actual RTO score calculated (2.4)_
    - _Preservation: prepaid order creation still works (3.2)_
    - _Requirements: 1.4, 2.4_

  - [x] 7.5 Verify bug condition exploration test now passes (Batch 2)
    - **Property 1: Expected Behavior** — RTO Score Calculation
    - **IMPORTANT**: Re-run the SAME test from task 5 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms RTO scoring bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.6 Verify preservation tests still pass (Batch 2)
    - **Property 2: Preservation** — Order Creation & Payment
    - **IMPORTANT**: Re-run the SAME tests from task 6 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in order flows)

- [x] 8. Checkpoint — Batch 2 complete
  - Ensure all Batch 2 tests pass, ask the user if questions arise


## Batch 3: High Severity (H1–H12)

- [x] 9. Write bug condition exploration test — High Severity
  - **Property 1: Bug Condition** — High Severity Vulnerabilities
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples that demonstrate the high-severity bugs
  - Test H1: Send concurrent `addToCart` for product with stock=1, assert both do NOT succeed (will FAIL — race condition allows overselling)
  - Test H2: Call `addToCart` with non-existent productId, assert 404 (will FAIL — no validation)
  - Test H3: Call `updateCartItem` to increase quantity beyond stock, assert rejection (will FAIL — no revalidation)
  - Test H4: Validate coupon as guest user, assert per-user limit enforced (will FAIL — check skipped for undefined userId)
  - Test H5: Send concurrent `applyCoupon` for coupon with usageLimit=1, assert only one succeeds (will FAIL — race condition)
  - Test H6: Call `applyCoupon` with client-provided `discountAmount`, assert server recalculates (will FAIL — client value trusted)
  - Test H7: Call `getUserShippingAddresses`, assert phone is decrypted not encrypted blob (will FAIL — raw encrypted value returned)
  - Test H8: Call `getGuestShippingAddresses` without auth, assert 401 (will FAIL — no auth required)
  - Test H9: Call `deleteReview` as non-owner non-admin, assert 403 (will FAIL — no ownership check)
  - Test H10: Spam `createPublicReview` from same IP, assert rate limit kicks in (will FAIL — no rate limiting)
  - Test H11: Call `refreshToken` and assert it does NOT iterate all users (will FAIL — O(n) lookup)
  - Test H12: Call `getAllUsers` and assert pagination is enforced (will FAIL — returns all users)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - _Requirements: 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.19, 1.20, 1.21, 1.22, 1.23_

- [x] 10. Write preservation property tests — Cart, Coupon, Address, Review flows (BEFORE implementing fix)
  - **Property 2: Preservation** — Cart, Coupon, Shipping, Review Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Valid `addToCart` with sufficient stock adds item or increments quantity (3.11)
  - Observe: `getCart` returns formatted items with images, prices, stock, summary (3.12)
  - Observe: `clearCart` removes all items (3.13)
  - Observe: Valid coupon validation returns correct discount and final amount (3.14)
  - Observe: Admin `createCoupon` creates coupon with all fields (3.15)
  - Observe: `getPublicCoupons` returns active non-expired brand-scoped coupons (3.16)
  - Observe: `createShippingAddress` creates with encrypted phone, sets default if first (3.17)
  - Observe: `deleteShippingAddress` deletes and reassigns default (3.18)
  - Observe: `createReview` creates with pending status and handles images (3.20)
  - Observe: `moderateReview` updates status and recalculates stats (3.21)
  - Observe: `getPublicProductReviews` returns approved reviews with pagination and cache (3.22)
  - Write property-based tests capturing observed behavior
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.20, 3.21, 3.22_

- [x] 11. Batch 3 — High Severity Fixes (Cart)

  - [x] 11.1 Fix addToCart race condition in `Backend/controller/cartController.js`
    - Wrap stock check + cart item creation/update in a Sequelize transaction
    - Use `SELECT ... FOR UPDATE` on product variation row during stock check
    - _Bug_Condition: concurrent addToCart AND no transaction_
    - _Expected_Behavior: stock consistency under concurrent access (2.12)_
    - _Preservation: valid addToCart still works (3.11)_
    - _Requirements: 1.12, 2.12_

  - [x] 11.2 Add product existence validation to addToCart in `Backend/controller/cartController.js`
    - Verify product exists, is active, and belongs to current brand before adding
    - _Bug_Condition: addToCart with non-existent or inactive product_
    - _Expected_Behavior: 404 for missing/inactive products (2.13)_
    - _Requirements: 1.13, 2.13_

  - [x] 11.3 Add stock revalidation to updateCartItem in `Backend/controller/cartController.js`
    - Re-check stock availability for the new total quantity before saving
    - _Bug_Condition: updateCartItem increases quantity beyond stock_
    - _Expected_Behavior: reject if insufficient stock (2.14)_
    - _Requirements: 1.14, 2.14_

  - [x] 11.4 Add quantity validation to addToCart in `Backend/controller/cartController.js`
    - Validate `quantity` is a positive integer >= 1
    - _Bug_Condition: quantity <= 0 or non-integer_
    - _Expected_Behavior: reject invalid quantities (2.24)_
    - _Requirements: 1.24, 2.24_

  - [x] 11.5 Remove hardcoded 10% discount in getCart in `Backend/controller/cartController.js`
    - Remove placeholder discount; validate coupon properly or remove coupon preview
    - _Bug_Condition: getCart applies hardcoded 10% for any coupon code_
    - _Expected_Behavior: actual coupon validation or no preview (2.47)_
    - _Requirements: 1.47, 2.47_

- [x] 12. Batch 3 — High Severity Fixes (Coupon)

  - [x] 12.1 Fix guest coupon usage bypass in `Backend/controller/couponController.js`
    - When `userId` is undefined, use guest identifier (email/session) for usage tracking
    - Never skip per-user limit check
    - _Bug_Condition: guest user validates coupon AND no usage limit enforced_
    - _Expected_Behavior: per-user limits enforced for guests (2.15)_
    - _Preservation: valid coupon validation still works (3.14)_
    - _Requirements: 1.15, 2.15_

  - [x] 12.2 Fix applyCoupon race condition in `Backend/controller/couponController.js`
    - Use atomic `UPDATE ... WHERE usageCount < usageLimit` or transaction with row lock
    - _Bug_Condition: concurrent applyCoupon AND no atomic check_
    - _Expected_Behavior: concurrent requests cannot exceed usage limit (2.16)_
    - _Requirements: 1.16, 2.16_

  - [x] 12.3 Fix client-provided discountAmount in `Backend/controller/couponController.js`
    - Ignore `req.body.discountAmount`; recalculate server-side from coupon rules and cart
    - _Bug_Condition: discountAmount accepted from client_
    - _Expected_Behavior: server-side discount calculation (2.17)_
    - _Requirements: 1.17, 2.17_

  - [x] 12.4 Fix client cartTotal trusted for minPurchase in `Backend/controller/couponController.js`
    - Calculate cart total server-side from actual cart items
    - _Bug_Condition: client-provided cartTotal trusted for minPurchase check_
    - _Expected_Behavior: server-side cart total calculation (2.27)_
    - _Requirements: 1.27, 2.27_

  - [x] 12.5 Fix getCouponById no brand scoping in `Backend/controller/couponController.js`
    - Add `brand_id: req.brandId` to query WHERE clause
    - _Bug_Condition: getCouponById with no brand scoping_
    - _Expected_Behavior: coupon scoped to current brand (2.28)_
    - _Requirements: 1.28, 2.28_

  - [x] 12.6 Fix getUserCouponHistory IDOR in `Backend/controller/couponController.js`
    - Replace `req.params.userId` with `req.user.id`
    - _Bug_Condition: userId from URL params != authenticated user_
    - _Expected_Behavior: only own coupon history accessible (2.29)_
    - _Requirements: 1.29, 2.29_

- [x] 13. Batch 3 — High Severity Fixes (Shipping Address)

  - [x] 13.1 Fix encrypted phone blob in response in `Backend/controller/shippingAddressController.js`
    - Ensure Sequelize getter is invoked via `addr.get({ plain: true })` or explicit `phone: addr.phone`
    - _Bug_Condition: getUserShippingAddresses returns encrypted blob_
    - _Expected_Behavior: decrypted phone in response (2.18)_
    - _Preservation: address CRUD still works (3.17, 3.18, 3.19)_
    - _Requirements: 1.18, 2.18_

  - [x] 13.2 Fix unauthenticated guest address access in `Backend/controller/shippingAddressController.js`
    - Require authentication or verified guest token for `getGuestShippingAddresses`
    - _Bug_Condition: getGuestShippingAddresses with no auth_
    - _Expected_Behavior: 401 for unauthenticated requests (2.19)_
    - _Requirements: 1.19, 2.19_

  - [x] 13.3 Fix phone encryption on update in `Backend/controller/shippingAddressController.js`
    - Ensure Sequelize setter triggers by using `instance.phone = newValue`
    - _Bug_Condition: updateShippingAddress phone not re-encrypted_
    - _Expected_Behavior: phone properly encrypted on update (2.30)_
    - _Requirements: 1.30, 2.30_

  - [x] 13.4 Fix guest address phone encryption in `Backend/controller/shippingAddressController.js`
    - Use `ShippingAddress.create({ phone: value })` to trigger setter, or call `encrypt()` explicitly
    - _Bug_Condition: createGuestShippingAddress phone unencrypted_
    - _Expected_Behavior: phone encrypted on guest address creation (2.31)_
    - _Requirements: 1.31, 2.31_

- [x] 14. Batch 3 — High Severity Fixes (Review)

  - [x] 14.1 Fix deleteReview authorization in `Backend/controller/reviewController.js`
    - Check `review.user_id === req.user.id || req.user.role === 'admin'` before deletion
    - _Bug_Condition: deleteReview by non-owner non-admin_
    - _Expected_Behavior: 403 for unauthorized deletion (2.20)_
    - _Preservation: review creation and moderation still work (3.20, 3.21)_
    - _Requirements: 1.20, 2.20_

  - [x] 14.2 Add rate limiting to createPublicReview in `Backend/controller/reviewController.js`
    - Add rate limiting middleware (e.g., 5 reviews per IP per 15 minutes)
    - _Bug_Condition: createPublicReview with no rate limit_
    - _Expected_Behavior: rate limiting enforced (2.21)_
    - _Requirements: 1.21, 2.21_

  - [x] 14.3 Fix review text XSS in `Backend/controller/reviewController.js`
    - Sanitize review text (strip HTML tags) before storage using `sanitize-html` or similar
    - _Bug_Condition: review text contains HTML/XSS payload_
    - _Expected_Behavior: HTML stripped from review text (2.32)_
    - _Requirements: 1.32, 2.32_

  - [x] 14.4 Fix single review moderation state leak in `Backend/controller/reviewController.js`
    - For non-admin users, exclude `status` and `admin_notes` from response
    - _Bug_Condition: getReview by non-admin includes moderation fields_
    - _Expected_Behavior: moderation fields hidden from non-admins (2.33)_
    - _Requirements: 1.33, 2.33_

  - [x] 14.5 Fix cache key sort param validation in `Backend/controller/reviewController.js`
    - Validate `sort` against allowlist (`newest`, `highest`, `lowest`) before using in cache key
    - _Bug_Condition: unvalidated sort param in cache key_
    - _Expected_Behavior: only allowlisted sort values in cache key (2.50)_
    - _Requirements: 1.50, 2.50_

  - [x] 14.6 Add file type/size validation for review uploads in `Backend/controller/reviewController.js`
    - Validate file type (images/videos only) and enforce max file size
    - _Bug_Condition: review upload with no type/size validation_
    - _Expected_Behavior: only valid file types and sizes accepted (2.51)_
    - _Requirements: 1.51, 2.51_

- [x] 15. Batch 3 — High Severity Fixes (User Controller)

  - [x] 15.1 Fix refreshToken O(n) DoS in `Backend/controller/userController.js`
    - Store refresh token hash alongside user ID; on refresh, decode token to get user ID, fetch single user, then bcrypt.compare
    - _Bug_Condition: refreshToken iterates all users with bcrypt.compare_
    - _Expected_Behavior: O(1) lookup by user ID (2.22)_
    - _Requirements: 1.22, 2.22_

  - [x] 15.2 Fix getAllUsers no pagination in `Backend/controller/userController.js`
    - Add `page` and `limit` query parameters with defaults
    - Exclude or mask PII fields (phone, email) in response
    - _Bug_Condition: getAllUsers returns all users with no pagination_
    - _Expected_Behavior: paginated response with masked PII (2.23)_
    - _Requirements: 1.23, 2.23_

  - [x] 15.3 Verify bug condition exploration test now passes (Batch 3)
    - **Property 1: Expected Behavior** — High Severity Fixes
    - **IMPORTANT**: Re-run the SAME test from task 9 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms high-severity bugs are fixed)
    - _Requirements: 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23_

  - [x] 15.4 Verify preservation tests still pass (Batch 3)
    - **Property 2: Preservation** — Cart, Coupon, Shipping, Review
    - **IMPORTANT**: Re-run the SAME tests from task 10 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 16. Checkpoint — Batch 3 complete
  - Ensure all Batch 3 tests pass, ask the user if questions arise


## Batch 4: Medium Severity — Product, FShip, WhatsApp

- [x] 17. Write bug condition exploration test — Medium Severity (Batch 4)
  - **Property 1: Bug Condition** — Product, FShip, WhatsApp Bugs
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples for medium-severity bugs in product, FShip, and WhatsApp
  - Test M11: Search with SQL wildcard chars `%_` and assert they are escaped (will FAIL — wildcards not escaped)
  - Test M12: Call `getExistingImages` with path containing `..` and assert rejection (will FAIL — no traversal prevention)
  - Test M13: Attempt cross-brand image deletion and assert 403 (will FAIL — no brand scoping)
  - Test M14: Call fshipService with invalid phone and assert error thrown (will FAIL — returns hardcoded `9876543210`)
  - Test M15: Call `fshipService.initialize()` concurrently and assert singleton behavior (will FAIL — no guard)
  - Test M16: Send many WhatsApp messages to same recipient and assert rate limit (will FAIL — no rate limiting)
  - Test M17: Include HTML/script in WhatsApp message user input and assert sanitized (will FAIL — no sanitization)
  - Test L2: Generate product ETag and assert it's content-based, not `Date.now()` (will FAIL — uses Date.now)
  - Test L3: Generate duplicate product slug and assert uniqueness suffix added (will FAIL — no uniqueness check)
  - Test L7: Simulate non-404 fshipService error and assert it's treated as error (will FAIL — assumes order doesn't exist)
  - Test L8: Log shipping data and assert PII is redacted (will FAIL — full PII logged)
  - Test L9: Fetch WhatsApp tokens and assert caching (will FAIL — DB fetch every call)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - _Requirements: 1.34, 1.35, 1.36, 1.37, 1.38, 1.39, 1.40, 1.48, 1.49, 1.53, 1.54, 1.55_

- [x] 18. Write preservation property tests — Product, FShip, WhatsApp flows (BEFORE implementing fix)
  - **Property 2: Preservation** — Product, FShip, WhatsApp Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: FShip sync for confirmed orders builds payload and updates tracking (3.28)
  - Observe: WhatsApp order confirmation sends message with order details (3.29)
  - Observe: Product search returns correct results for normal search terms
  - Write property-based tests capturing observed behavior
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.28, 3.29_

- [x] 19. Batch 4 — Medium Severity Fixes (Product Controller)

  - [x] 19.1 Fix SQL wildcard injection in search in `Backend/controller/productController.js`
    - Escape `%` and `_` characters in user search input before `Op.like`
    - _Bug_Condition: search input contains SQL wildcard chars_
    - _Expected_Behavior: wildcards escaped in search (2.34)_
    - _Requirements: 1.34, 2.34_

  - [x] 19.2 Fix directory traversal in getExistingImages in `Backend/controller/productController.js`
    - Validate and sanitize paths; reject `..` segments; use `path.resolve` and verify within allowed directory
    - _Bug_Condition: file path contains '..' segments_
    - _Expected_Behavior: directory traversal prevented (2.35)_
    - _Requirements: 1.35, 2.35_

  - [x] 19.3 Fix cross-brand image deletion in `Backend/controller/productController.js`
    - Verify image's product belongs to current brand before deletion
    - _Bug_Condition: image deletion with no brand scoping_
    - _Expected_Behavior: cross-brand deletion blocked (2.36)_
    - _Requirements: 1.36, 2.36_

  - [x] 19.4 Fix ETag using Date.now() in `Backend/controller/productController.js`
    - Replace `Date.now()` with content-based hash (e.g., hash of `updatedAt`)
    - _Bug_Condition: ETag changes on every request_
    - _Expected_Behavior: content-based ETag for caching (2.48)_
    - _Requirements: 1.48, 2.48_

  - [x] 19.5 Fix slug uniqueness in `Backend/controller/productController.js`
    - After generating slug, query for duplicates and append `-2`, `-3` etc. if found
    - _Bug_Condition: duplicate slug generated with no uniqueness check_
    - _Expected_Behavior: unique slugs enforced (2.49)_
    - _Requirements: 1.49, 2.49_

- [x] 20. Batch 4 — Medium Severity Fixes (FShip Service)

  - [x] 20.1 Fix hardcoded phone in `Backend/services/fshipService.js`
    - Throw validation error for invalid phone instead of returning `9876543210`
    - _Bug_Condition: invalid phone number input_
    - _Expected_Behavior: validation error thrown (2.37)_
    - _Requirements: 1.37, 2.37_

  - [x] 20.2 Fix singleton initialize() race condition in `Backend/services/fshipService.js`
    - Add mutex/flag: if `this.initializing` promise exists, await it
    - _Bug_Condition: concurrent initialize() calls_
    - _Expected_Behavior: singleton initialization (2.38)_
    - _Requirements: 1.38, 2.38_

  - [x] 20.3 Fix non-404 error handling in `Backend/services/fshipService.js`
    - Only treat 404 as "not found"; for other errors, throw/retry
    - _Bug_Condition: non-404 error assumed as "order doesn't exist"_
    - _Expected_Behavior: proper error handling by status code (2.53)_
    - _Requirements: 1.53, 2.53_

  - [x] 20.4 Fix PII logging in `Backend/services/fshipService.js`
    - Redact phone numbers and addresses in log output (mask all but last 4 digits)
    - _Bug_Condition: full PII logged to console_
    - _Expected_Behavior: PII redacted in logs (2.54)_
    - _Requirements: 1.54, 2.54_

- [ ] 21. Batch 4 — Medium Severity Fixes (WhatsApp Service)

  - [x] 21.1 Add rate limiting to WhatsApp messages in `Backend/services/whatsappService.js`
    - Add per-recipient rate limiting using Redis counters (e.g., max 10 per phone per hour)
    - _Bug_Condition: unlimited WhatsApp messages sent_
    - _Expected_Behavior: rate limiting per recipient (2.39)_
    - _Requirements: 1.39, 2.39_

  - [x] 21.2 Add input sanitization to WhatsApp messages in `Backend/services/whatsappService.js`
    - Sanitize user-provided text before inclusion in message payloads
    - _Bug_Condition: unsanitized user input in message text_
    - _Expected_Behavior: sanitized message text (2.40)_
    - _Requirements: 1.40, 2.40_

  - [x] 21.3 Add WhatsApp token caching in `Backend/services/whatsappService.js`
    - Cache credentials in memory or Redis with 5-minute TTL
    - _Bug_Condition: API tokens fetched from DB every call_
    - _Expected_Behavior: cached tokens with TTL (2.55)_
    - _Requirements: 1.55, 2.55_

  - [x] 21.4 Verify bug condition exploration test now passes (Batch 4)
    - **Property 1: Expected Behavior** — Product, FShip, WhatsApp Fixes
    - **IMPORTANT**: Re-run the SAME test from task 17 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms medium-severity bugs are fixed)
    - _Requirements: 2.34, 2.35, 2.36, 2.37, 2.38, 2.39, 2.40, 2.48, 2.49, 2.53, 2.54, 2.55_

  - [x] 21.5 Verify preservation tests still pass (Batch 4)
    - **Property 2: Preservation** — Product, FShip, WhatsApp
    - **IMPORTANT**: Re-run the SAME tests from task 18 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 22. Checkpoint — Batch 4 complete
  - Ensure all Batch 4 tests pass, ask the user if questions arise


## Batch 5: Medium Severity — Cache, Brand, Loyalty, Auth

- [x] 23. Write bug condition exploration test — Medium Severity (Batch 5)
  - **Property 1: Bug Condition** — Cache, Brand, Loyalty, Auth Bugs
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples for cache, brand middleware, loyalty, and auth bugs
  - Test M18: Set a non-cache Redis key, call `cacheManager.clear()`, assert non-cache key survives (will FAIL — `flushdb()` wipes everything)
  - Test M19: Set a cache key and assert it has namespace prefix (will FAIL — no prefix)
  - Test M20: Cache an oversized payload and assert rejection (will FAIL — no size limit)
  - Test M21: Trigger error in `optionalBrand` and assert it's logged at warn level (will FAIL — silently swallowed)
  - Test M22: Run `expirePoints` with many users and assert batch processing (will FAIL — single transaction)
  - Test M23: Logout user and assert JWT is blacklisted (will FAIL — no revocation mechanism)
  - Test L10: Call `getBalance` and assert consistent read (will FAIL — no lock)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - _Requirements: 1.41, 1.42, 1.43, 1.44, 1.45, 1.46, 1.56_

- [x] 24. Write preservation property tests — Cache, Loyalty flows (BEFORE implementing fix)
  - **Property 2: Preservation** — Cache & Loyalty Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `cacheManager.set` stores value in Redis with TTL (3.25)
  - Observe: `creditPoints` calculates points and creates loyalty transaction (3.26)
  - Observe: `refundPoints` refunds redeemed points for cancelled orders (3.27)
  - Observe: Valid brand identification from `X-Brand-Name` header (3.23)
  - Write property-based tests capturing observed behavior
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.23, 3.25, 3.26, 3.27_

- [x] 25. Batch 5 — Medium Severity Fixes (Cache Manager)

  - [x] 25.1 Replace flushdb() with pattern-based deletion in `Backend/services/cacheManager.js`
    - Use `SCAN` + `DEL` with namespace prefix instead of `flushdb()`
    - _Bug_Condition: clear() executes flushdb() wiping all Redis data_
    - _Expected_Behavior: only namespaced cache keys deleted (2.41)_
    - _Preservation: cache set/get/delete still works (3.25)_
    - _Requirements: 1.41, 2.41_

  - [x] 25.2 Add namespace prefix to all cache keys in `Backend/services/cacheManager.js`
    - Prefix all keys with `crosscoin:` (or configurable namespace)
    - Update `set`, `get`, `delete`, `invalidate`, `exists`, `getTTL`, `expire`, `getKeys`
    - _Bug_Condition: no namespace prefix on cache keys_
    - _Expected_Behavior: all keys prefixed with namespace (2.42)_
    - _Requirements: 1.42, 2.42_

  - [x] 25.3 Add max value size check in `Backend/services/cacheManager.js`
    - Before `set`, check `JSON.stringify(value).length` against configurable max (e.g., 1MB)
    - Log warning and skip caching if exceeded
    - _Bug_Condition: oversized payload cached without limit_
    - _Expected_Behavior: max size enforced (2.43)_
    - _Requirements: 1.43, 2.43_

- [x] 26. Batch 5 — Medium Severity Fixes (Brand Middleware)

  - [x] 26.1 Fix optionalBrand silent error swallowing in `Backend/middleware/brandMiddleware.js`
    - Log error at warn level using structured logger instead of silent `next()`
    - _Bug_Condition: optionalBrand error silently swallowed_
    - _Expected_Behavior: error logged at warn level (2.44)_
    - _Preservation: valid brand requests still proceed (3.23)_
    - _Requirements: 1.44, 2.44_

- [x] 27. Batch 5 — Medium Severity Fixes (Loyalty Service)

  - [x] 27.1 Fix expirePoints batch processing in `Backend/services/loyaltyService.js`
    - Process users in batches (e.g., 100 at a time) with separate transactions per batch
    - _Bug_Condition: expirePoints processes all users in single transaction_
    - _Expected_Behavior: batch processing with separate transactions (2.45)_
    - _Preservation: loyalty credit/debit/refund still works (3.26, 3.27)_
    - _Requirements: 1.45, 2.45_

  - [x] 27.2 Fix getBalance stale read in `Backend/services/loyaltyService.js`
    - Use shared lock or `SELECT ... LOCK IN SHARE MODE` for consistent reads
    - _Bug_Condition: getBalance reads without lock_
    - _Expected_Behavior: consistent read with lock (2.56)_
    - _Requirements: 1.56, 2.56_

- [x] 28. Batch 5 — Medium Severity Fixes (Auth Middleware)

  - [x] 28.1 Implement token revocation in `Backend/middleware/authMiddleware.js`
    - Add Redis-based token blacklist (key: `blacklist:{jti}`, TTL: token remaining lifetime)
    - On logout and soft-delete, add token JTI to blacklist
    - In `authenticate`, check blacklist before allowing request
    - _Bug_Condition: compromised JWT remains valid for up to 7 days_
    - _Expected_Behavior: revoked tokens rejected (2.46)_
    - _Preservation: valid users still authenticate (3.6)_
    - _Requirements: 1.46, 2.46_

  - [x] 28.2 Verify bug condition exploration test now passes (Batch 5)
    - **Property 1: Expected Behavior** — Cache, Brand, Loyalty, Auth Fixes
    - **IMPORTANT**: Re-run the SAME test from task 23 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms medium-severity bugs are fixed)
    - _Requirements: 2.41, 2.42, 2.43, 2.44, 2.45, 2.46, 2.56_

  - [x] 28.3 Verify preservation tests still pass (Batch 5)
    - **Property 2: Preservation** — Cache & Loyalty
    - **IMPORTANT**: Re-run the SAME tests from task 24 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 29. Checkpoint — Batch 5 complete
  - Ensure all Batch 5 tests pass, ask the user if questions arise


## Batch 6: Low Severity — CORS, Cart, Product, Review

- [x] 30. Write bug condition exploration test — Low Severity (Batch 6)
  - **Property 1: Bug Condition** — Low Severity Bugs
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples for low-severity bugs
  - Test L6: Assert CORS only adds HTTPS origins in production (will FAIL — HTTP origins included)
  - Test M2: Change product price after adding to cart, proceed to checkout, assert price re-validated (will FAIL — stale price used)
  - Test M3: Call `removeFromCart` with non-matching variation, assert 404 returned (will FAIL — fallback deletes wrong variation)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - _Requirements: 1.25, 1.26, 1.52_

- [x] 31. Write preservation property tests — CORS, Cart, Order flows (BEFORE implementing fix)
  - **Property 2: Preservation** — CORS & Cart Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Whitelisted origins and valid brand domains allowed by CORS (3.24)
  - Observe: Valid cart add/get/clear operations work correctly (3.11, 3.12, 3.13)
  - Observe: Order confirmation triggers FShip sync (3.3)
  - Observe: Order cancellation restores stock and refunds (3.4)
  - Write property-based tests capturing observed behavior
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.3, 3.4, 3.11, 3.12, 3.13, 3.24_

- [x] 32. Batch 6 — Low Severity Fixes

  - [x] 32.1 Fix HTTP origins in production CORS in `Backend/config/corsConfig.js`
    - In `fetchBrandDomains`, only add `https://` origins when `NODE_ENV === 'production'`
    - Keep HTTP origins for development only
    - _Bug_Condition: HTTP origins added in production_
    - _Expected_Behavior: HTTPS-only origins in production (2.52)_
    - _Preservation: valid CORS origins still allowed (3.24)_
    - _Requirements: 1.52, 2.52_

  - [x] 32.2 Fix stale price at checkout in `Backend/controller/cartController.js`
    - At checkout/order creation, re-fetch current product prices and compare with cart
    - Update cart or warn user if prices differ
    - _Bug_Condition: product price changed after cart add, stale price used_
    - _Expected_Behavior: prices re-validated at checkout (2.25)_
    - _Preservation: valid cart operations still work (3.11, 3.12)_
    - _Requirements: 1.25, 2.25_

  - [x] 32.3 Fix removeFromCart wrong variation fallback in `Backend/controller/cartController.js`
    - Remove fallback that deletes by `productId` alone; return 404 if exact match not found
    - _Bug_Condition: removeFromCart falls back to deleting wrong variation_
    - _Expected_Behavior: 404 if exact product+variation not found (2.26)_
    - _Requirements: 1.26, 2.26_

  - [x] 32.4 Verify bug condition exploration test now passes (Batch 6)
    - **Property 1: Expected Behavior** — Low Severity Fixes
    - **IMPORTANT**: Re-run the SAME test from task 30 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms low-severity bugs are fixed)
    - _Requirements: 2.25, 2.26, 2.52_

  - [x] 32.5 Verify preservation tests still pass (Batch 6)
    - **Property 2: Preservation** — CORS & Cart
    - **IMPORTANT**: Re-run the SAME tests from task 31 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 33. Checkpoint — Batch 6 complete
  - Ensure all Batch 6 tests pass, ask the user if questions arise

## Final Validation

- [x] 34. Final checkpoint — All batches complete
  - Run full test suite across all 6 batches
  - Verify all 57 bug conditions are covered by exploration tests
  - Verify all preservation tests pass
  - Verify no regressions in existing functionality
  - Ask the user if questions arise
