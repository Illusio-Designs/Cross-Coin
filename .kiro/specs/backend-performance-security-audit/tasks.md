# Implementation Plan: Backend Performance & Security Audit

## Overview

Incremental implementation of all performance, security, bug-fix, and hygiene improvements for the CrossCoin Express.js backend. Each task builds on the previous, ending with full integration. All property-based tests use **fast-check** with a minimum of 100 iterations.

## Tasks

- [x] 1. Dependency and dead-code hygiene (pre-requisite cleanup)
  - [x] 1.1 Remove `bcryptjs` from `package.json` and update `scripts/setupDatabase.js` to use `bcrypt`
    - Replace all `require('bcryptjs')` with `require('bcrypt')` in `scripts/setupDatabase.js`
    - Run `npm uninstall bcryptjs` and verify no remaining references
    - _Requirements: 6.1, 8.1_
  - [x] 1.2 Remove the standalone `etag` package and lazy-require `xlsx` in `orderController.js`
    - Run `npm uninstall etag`; replace any direct `etag` import with Express built-in `res.set('ETag', ...)`
    - Move `const xlsx = require('xlsx')` from module top-level into the export handler function body
    - _Requirements: 8.1, 8.3_
  - [x] 1.3 Move `nodemon` to `devDependencies` if not already there; verify `package.json` is correct
    - _Requirements: 8.2_
  - [x] 1.4 Remove unused `{ dirname, join }` / `{ fileURLToPath }` imports from `index.js` (CommonJS `__dirname` is natively available)
    - _Requirements: 6.2_
  - [x] 1.5 Archive migration scripts and move example config file
    - Move `scripts/migrateToImageKit.js`, `scripts/migrateProfilesToImageKit.js`, `scripts/migrateReviewImagesToImageKit.js` → `scripts/archive/`
    - Move `config/corsConfig.EXAMPLE.js` → `docs/examples/corsConfig.EXAMPLE.js`
    - _Requirements: 6.3, 6.4_
  - [x] 1.6 Add `Backend/uploads/**` to `.gitignore` with `!Backend/uploads/.gitkeep` exception; create `.gitkeep` if missing
    - _Requirements: 6.7_
  - [x] 1.7 Remove all commented-out code blocks longer than 3 lines from all controller and service files
    - Scan: `controller/*.js`, `services/*.js`, `middleware/*.js`, `config/*.js`
    - _Requirements: 6.5_
  - [x] 1.8 Update `.env.example` to list all required environment variables with placeholder values and no real secrets
    - Ensure `JWT_SECRET`, `SESSION_SECRET`, `DB_*`, `REDIS_*`, `IMAGEKIT_*` are all present
    - _Requirements: 8.4_

- [x] 2. Secret externalization and startup validation
  - [x] 2.1 Remove hardcoded `JWT_SECRET` fallback from `config/config.js`; throw a fatal error and exit with code 1 if `process.env.JWT_SECRET` is absent in production
    - _Requirements: 5.1, 7.2_
  - [x] 2.2 Remove hardcoded `SESSION_SECRET` fallback from `index.js`; throw a fatal error and exit with code 1 if `process.env.SESSION_SECRET` is absent in production
    - _Requirements: 5.2_
  - [ ]* 2.3 Write unit tests for startup secret validation
    - Test that `config/config.js` throws when `JWT_SECRET` is absent and `NODE_ENV=production`
    - Test that `index.js` startup throws when `SESSION_SECRET` is absent and `NODE_ENV=production`
    - _Requirements: 5.1, 5.2_

- [x] 3. Database index additions
  - [x] 3.1 Add missing indexes to Sequelize models via the `indexes` array
    - `OrderItem`: `order_id`, `product_id`, `variation_id`
    - `ProductVariation`: `productId`
    - `ProductImage`: `product_id`, `product_variation_id`
    - `Review`: `productId`, `userId`
    - `Order`: `created_at`
    - `CartItem`: `cartId`
    - `Wishlist`: `userId`, `productId`
    - `UTMTracking`: `session_id`
    - _Requirements: 1.4_
  - [ ]* 3.2 Write unit tests verifying each model's `rawAttributes` / `options.indexes` contains the expected index definitions
    - _Requirements: 1.4_

- [x] 4. Parameterized queries and N+1 elimination
  - [x] 4.1 Audit all raw `sequelize.query()` calls across controllers and services; replace any string-interpolated user input with `{ replacements: [...] }` parameterized form
    - _Requirements: 1.5_
  - [x] 4.2 Add explicit `attributes` arrays to all `findAll` / `findAndCountAll` calls in list endpoints: `productController`, `orderController`, `userController`, `categoryController`, `brandController`
    - _Requirements: 1.1_
  - [x] 4.3 Replace any per-record child queries in loops with eager-loaded `include` arrays (eliminate N+1 patterns in `orderController`, `productController`, `cartController`)
    - _Requirements: 1.3_
  - [ ]* 4.4 Write property test for parameterized query injection safety
    - **Property 1: Parameterized query injection safety**
    - Generate random strings with SQL metacharacters (`'`, `"`, `;`, `--`, `UNION`, `DROP`); pass as filter params to list endpoints; verify no 5xx and no extra rows returned
    - **Validates: Requirements 1.5**
    - `// Feature: backend-performance-security-audit, Property 1: parameterized query injection safety`

- [x] 5. Sequelize transaction hardening
  - [x] 5.1 Wrap all multi-table write handlers in `try/catch` with `transaction.rollback()` in the catch block; apply consistently to `orderController`, `productController`, `cartController`, and any other controller that opens a transaction
    - Check `transaction.finished` before calling `rollback()` (pattern already in `orderController` — propagate to others)
    - _Requirements: 1.2, 5.5_
  - [x] 5.2 Add order-number collision retry loop (max 3 attempts) in `generateOrderNumber` that catches `SequelizeUniqueConstraintError` and regenerates before retrying
    - _Requirements: 5.3_
  - [ ]* 5.3 Write property test for transaction atomicity on failure
    - **Property 2: Transaction atomicity on failure**
    - Inject a mock that throws after the first DB write; verify HTTP 5xx and no `Order` record in DB
    - **Validates: Requirements 1.2, 5.5**
    - `// Feature: backend-performance-security-audit, Property 2: transaction atomicity on failure`
  - [ ]* 5.4 Write property test for order number uniqueness
    - **Property 12: Order number uniqueness**
    - Generate 50–200 concurrent order creation requests; verify all resulting `order_number` values are distinct
    - **Validates: Requirements 5.3**
    - `// Feature: backend-performance-security-audit, Property 12: order number uniqueness`
  - [ ]* 5.5 Write property test for transaction rollback on unhandled exception
    - **Property 13: Transaction rollback on unhandled exception**
    - Inject a mock that throws at a random point after transaction start; verify HTTP error response and no partial records in DB
    - **Validates: Requirements 5.5**
    - `// Feature: backend-performance-security-audit, Property 13: transaction rollback on unhandled exception`

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Cache manager improvements
  - [x] 7.1 Replace `client.keys(pattern)` in `cacheManager.getKeys()` with a cursor-based `SCAN` loop (same pattern as `invalidate()`)
    - _Requirements: 5.7_
  - [x] 7.2 Add cache-aside pattern to `categoryController` and `brandController` list endpoints with TTL ≥ 300 seconds
    - _Requirements: 2.1_
  - [x] 7.3 Ensure `cacheManager.set()` and `cacheManager.invalidate()` errors are caught, logged at `warn` level, and do not propagate to callers
    - _Requirements: 2.6_
  - [x] 7.4 Add cache invalidation calls (`cacheManager.invalidate('category:*')`, `cacheManager.invalidate('brand:*')`) to create/update/delete handlers in `categoryController` and `brandController`
    - _Requirements: 2.2_
  - [ ]* 7.5 Write unit test verifying `getKeys()` uses SCAN not KEYS (mock Redis client call tracking)
    - _Requirements: 5.7_
  - [ ]* 7.6 Write property test for cache read-through and TTL
    - **Property 3: Cache read-through and TTL**
    - Generate random product/category/brand IDs; make two consecutive GETs; verify same data returned and cache key TTL ≥ 300 after first request
    - **Validates: Requirements 2.1**
    - `// Feature: backend-performance-security-audit, Property 3: cache read-through and TTL`
  - [ ]* 7.7 Write property test for cache invalidation on mutation
    - **Property 4: Cache invalidation on mutation**
    - Create a resource (populates cache), update it, make GET; verify response reflects updated data
    - **Validates: Requirements 2.2**
    - `// Feature: backend-performance-security-audit, Property 4: cache invalidation on mutation`
  - [ ]* 7.8 Write property test for Redis fallback to DB
    - **Property 7: Redis fallback to DB**
    - Simulate Redis connection failure (mock); generate random product IDs; verify GET returns valid data with HTTP 200
    - **Validates: Requirements 2.6**
    - `// Feature: backend-performance-security-audit, Property 7: Redis fallback to DB`

- [x] 8. HTTP middleware — compression, Cache-Control, ETag, and CORS fix
  - [x] 8.1 Verify `compression` middleware is applied globally in `index.js` with a threshold of 1 KB; add if missing
    - _Requirements: 2.3_
  - [x] 8.2 Add a response middleware helper that sets `Cache-Control: public, max-age=300` on public read-only GET responses and `Cache-Control: no-store` on authenticated or write responses
    - _Requirements: 2.5_
  - [x] 8.3 Set `Cache-Control: public, max-age=86400` and `ETag` header on static file responses served from `uploads/` in `index.js`
    - _Requirements: 4.4_
  - [x] 8.4 Fix `corsConfig.js`: replace `console.error` with `logger.warn` in the catch block; fall back to `staticAllowedOrigins` (not `[]`) on DB error
    - _Requirements: 5.6_
  - [ ]* 8.5 Write property test for ETag 304 round-trip
    - **Property 5: ETag 304 round-trip**
    - Generate random public endpoint paths; make first GET, capture ETag; make second GET with `If-None-Match`; verify HTTP 304 and empty body
    - **Validates: Requirements 2.4**
    - `// Feature: backend-performance-security-audit, Property 5: ETag 304 round-trip`
  - [ ]* 8.6 Write property test for Cache-Control header correctness
    - **Property 6: Cache-Control header correctness**
    - Generate random public and authenticated endpoint paths; verify correct `Cache-Control` header on each category
    - **Validates: Requirements 2.5**
    - `// Feature: backend-performance-security-audit, Property 6: Cache-Control header correctness`
  - [ ]* 8.7 Write property test for CORS DB error fallback
    - **Property 14: CORS DB error fallback**
    - Simulate DB error in `getBrandDomains`; generate requests from statically allowed origins; verify requests are permitted and a `warn` log entry is emitted
    - **Validates: Requirements 5.6**
    - `// Feature: backend-performance-security-audit, Property 14: CORS DB error fallback`

- [x] 9. Upload middleware hardening
  - [x] 9.1 Verify `fileFilter` in `uploadMiddleware.js` rejects disallowed MIME types before any bytes are written to disk; confirm allowlist is `['image/jpeg','image/png','image/webp','video/mp4','video/webm']`
    - _Requirements: 4.1, 7.8_
  - [x] 9.2 Ensure `validateMagicBytes` post-upload middleware is applied on every upload route; delete the file and return HTTP 400 if magic bytes do not match declared MIME type
    - _Requirements: 4.2_
  - [x] 9.3 Enforce file size limits: 5 MB for images, 50 MB for videos; return HTTP 413 on violation
    - _Requirements: 4.3_
  - [x] 9.4 Audit all controllers that call ImageKit upload (`productController`, `blogController`, `sliderController`, `reelController`, `reviewController`, `userController`); ensure local temp file is deleted immediately after successful ImageKit transfer
    - _Requirements: 3.2, 4.5_
  - [ ]* 9.5 Write property test for MIME type rejection before disk write
    - **Property 9: MIME type rejection before disk write**
    - Generate random MIME type strings not in the allowlist; send upload requests; verify HTTP 400 and no file written to `uploads/`
    - **Validates: Requirements 4.1, 7.8**
    - `// Feature: backend-performance-security-audit, Property 9: MIME type rejection before disk write`
  - [ ]* 9.6 Write property test for magic byte validation
    - **Property 10: Magic byte validation**
    - Generate image buffers with valid MIME type headers but incorrect magic bytes; verify HTTP 400 and file deleted from disk
    - **Validates: Requirements 4.2**
    - `// Feature: backend-performance-security-audit, Property 10: magic byte validation`
  - [ ]* 9.7 Write property test for file size enforcement
    - **Property 11: File size enforcement**
    - Generate image buffers of random sizes between 1 byte and 10 MB; verify files ≤ 5 MB are accepted and files > 5 MB return HTTP 413
    - **Validates: Requirements 4.3**
    - `// Feature: backend-performance-security-audit, Property 11: file size enforcement`
  - [ ]* 9.8 Write property test for local file cleanup after ImageKit upload
    - **Property 8: Local file cleanup after ImageKit upload**
    - Generate random valid image buffers; upload via API; verify temp file path no longer exists after request completes
    - **Validates: Requirements 3.2, 4.5**
    - `// Feature: backend-performance-security-audit, Property 8: local file cleanup after ImageKit upload`

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Security hardening — helmet, HSTS, rate limiting, cookies
  - [x] 11.1 Configure `helmet` with a Content Security Policy: `default-src 'self'`; explicitly allowlist required external domains for `img-src` and `script-src`
    - _Requirements: 7.1_
  - [x] 11.2 Enable HSTS via `helmet` (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) when `NODE_ENV === 'production'`
    - _Requirements: 7.9_
  - [x] 11.3 Verify rate limiter configuration: 10 req / 15 min on auth endpoints (`/api/users/login`, `/api/users/register`); 100 req / 1 min on all other `/api/` routes
    - _Requirements: 7.3_
  - [x] 11.4 Verify session cookie flags: `httpOnly: true`, `secure: true` (production), `sameSite: 'strict'` (production)
    - _Requirements: 7.5_
  - [ ]* 11.5 Write property test for rate limiter enforcement
    - **Property 16: Rate limiter enforcement**
    - Generate sequences of N requests (N > 10 for auth, N > 100 for general) from the same IP within the window; verify requests beyond the limit receive HTTP 429
    - **Validates: Requirements 7.3**
    - `// Feature: backend-performance-security-audit, Property 16: rate limiter enforcement`

- [x] 12. Auth middleware — JWT and RBAC hardening
  - [x] 12.1 Ensure all JWT operations in `authMiddleware.js` use `process.env.JWT_SECRET` directly (not the `config.js` export); return HTTP 401 with `{ code: 'INVALID_TOKEN' }` on any verification failure
    - _Requirements: 7.2_
  - [x] 12.2 Verify `authorize()`, `isAdmin()`, `isStaff()` return HTTP 403 (not 401) when role check fails
    - _Requirements: 7.6_
  - [ ]* 12.3 Write unit tests for auth middleware
    - Test HTTP 401 with `code: 'INVALID_TOKEN'` for tampered tokens
    - Test HTTP 401 with `code: 'TOKEN_EXPIRED'` for expired tokens
    - Test HTTP 403 for non-admin roles on admin-only endpoints
    - _Requirements: 7.2, 7.6_
  - [ ]* 12.4 Write property test for invalid JWT rejection
    - **Property 15: Invalid JWT rejection**
    - Generate random strings, expired tokens, and tokens signed with wrong secrets; send to authenticated endpoints; verify HTTP 401 with `code: 'INVALID_TOKEN'` or `code: 'TOKEN_EXPIRED'`
    - **Validates: Requirements 7.2**
    - `// Feature: backend-performance-security-audit, Property 15: invalid JWT rejection`
  - [ ]* 12.5 Write property test for role-based access control
    - **Property 18: Role-based access control**
    - Generate valid JWTs for each non-admin role (`consumer`, `product_manager`, `order_manager`, `whatsapp_manager`); send to admin-only endpoints; verify HTTP 403 for all non-admin roles
    - **Validates: Requirements 7.6**
    - `// Feature: backend-performance-security-audit, Property 18: role-based access control`

- [x] 13. Input sanitization
  - [x] 13.1 Create `utils/sanitize.js` — a helper that wraps `dompurify` with `jsdom` as the DOM implementation; export a `sanitize(str)` function
    - _Requirements: 7.4_
  - [x] 13.2 Apply `sanitize()` to all user-supplied text fields before DB writes in `productController`, `blogController`, `reviewController`, `userController`, `leadController`
    - _Requirements: 7.4_
  - [ ]* 13.3 Write property test for XSS input sanitization
    - **Property 17: XSS input sanitization**
    - Generate random strings containing HTML/script injection payloads; submit via text input fields; verify stored/returned values have script tags stripped
    - **Validates: Requirements 7.4**
    - `// Feature: backend-performance-security-audit, Property 17: XSS input sanitization`

- [x] 14. Production error response hardening and logging cleanup
  - [x] 14.1 Update the global Express error handler in `index.js` to omit `stack`, file paths, and SQL query details from responses when `NODE_ENV === 'production'`
    - _Requirements: 7.7_
  - [x] 14.2 Replace all `console.log("Request Body:", ...)` calls in controllers with `logger.debug(...)` so they are suppressed in production
    - _Requirements: 5.4_
  - [x] 14.3 Audit all controllers and services to ensure no JWT tokens, passwords, or payment credentials are logged at any level in production
    - _Requirements: 7.10_
  - [ ]* 14.4 Write property test for no stack traces in production error responses
    - **Property 19: No stack traces in production error responses**
    - Generate requests that trigger server errors (invalid IDs, malformed payloads) with `NODE_ENV=production`; verify response body does not contain `stack`, file paths, or SQL fragments
    - **Validates: Requirements 7.7**
    - `// Feature: backend-performance-security-audit, Property 19: no stack traces in production error responses`

- [x] 15. Graceful shutdown
  - [x] 15.1 Update the `SIGTERM`/`SIGINT` handler in `index.js` to follow the shutdown sequence: `server.close()` → `redisService.close()` → `sequelize.close()` → `process.exit(0)`; add a 10-second force-exit timeout
    - _Requirements: 3.3_
  - [ ]* 15.2 Write unit tests for graceful shutdown sequence
    - Mock `server.close`, `redisService.close`, `sequelize.close`; send `SIGTERM`; verify all three are called in order
    - _Requirements: 3.3_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property-based tests use **fast-check** with a minimum of 100 iterations per property
- All property test files must include the comment tag: `// Feature: backend-performance-security-audit, Property {N}: {property_text}`
- Checkpoints at tasks 6, 10, and 16 ensure incremental validation
