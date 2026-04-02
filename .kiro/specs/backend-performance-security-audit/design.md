# Design Document: Backend Performance & Security Audit

## Overview

This document describes the technical design for a comprehensive audit and improvement pass on the CrossCoin Node.js/Express backend. The work spans four areas: performance optimization (query efficiency, caching, resource management, file handling), bug fixes, dead code removal, and security hardening.

The backend is a multi-brand e-commerce API built with Express 5, Sequelize ORM on MySQL, Redis for caching, ImageKit for CDN image storage, and Bull/Redis for background job queues. It serves multiple storefronts via a brand-aware middleware layer.

---

## Architecture

The system follows a layered architecture:

```
Client Request
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  Express Middleware Stack                           │
│  helmet → rateLimit → cors → compression →         │
│  cookieParser → session → passport → morgan        │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  Route Layer (routes/*.js)                          │
│  brandMiddleware → authMiddleware → controller      │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────┐    ┌──────────────────────────────┐
│  Controller Layer │    │  Service Layer               │
│  (controller/*.js)│◄──►│  cacheManager, productService│
│                  │    │  imagekitService, etc.        │
└──────────────────┘    └──────────────────────────────┘
     │                           │
     ▼                           ▼
┌──────────────┐         ┌──────────────┐
│  Sequelize   │         │  Redis Cache │
│  (MySQL DB)  │         │  (ioredis)   │
└──────────────┘         └──────────────┘
```

Key cross-cutting concerns addressed by this audit:
- **Security**: helmet CSP, HSTS, rate limiting, JWT validation, input sanitization, cookie flags
- **Performance**: Redis caching with TTL, HTTP compression, ETag/304 support, DB connection pooling, N+1 elimination
- **Reliability**: Graceful shutdown, transaction rollback on error, Redis fallback to DB
- **Hygiene**: Duplicate dependency removal, dead code cleanup, secret externalization

---

## Components and Interfaces

### 1. Database Query Layer (`config/db.js`, Sequelize models)

**Current state**: Pool is already configured at max=10, min=2. Models define indexes on primary keys and some foreign keys. Some controllers still use `SELECT *` patterns without explicit `attributes` arrays.

**Changes**:
- Add explicit `attributes` arrays to all `findAll` / `findAndCountAll` calls in list endpoints (products, orders, users, categories, brands).
- Audit all models for missing indexes on FK columns and `WHERE`-clause columns. Add indexes to: `order_items.order_id`, `order_items.product_id`, `order_items.variation_id`, `product_variations.productId`, `product_images.product_id`, `product_images.product_variation_id`, `reviews.productId`, `reviews.userId`, `orders.brand_id`, `orders.created_at`, `cart_items.cartId`, `wishlist.userId`, `wishlist.productId`.
- Ensure all raw SQL queries use Sequelize's parameterized query interface (`sequelize.query(sql, { replacements: [...] })`).

### 2. Cache Manager (`services/cacheManager.js`, `services/redisService.js`)

**Current state**: `CacheManager` uses `SCAN` for `invalidate()` but uses `client.keys()` in `getKeys()`. The `get()` method already returns `null` on error (Redis fallback). Cache TTLs are set in `ProductService`.

**Changes**:
- Replace `client.keys(pattern)` in `getKeys()` with a cursor-based `SCAN` loop (same pattern as `invalidate()`).
- Ensure `cacheManager.get()` catches all Redis errors and returns `null` (already done — verify coverage).
- Add cache-aside pattern to `categoryController` and `brandController` list endpoints (currently only `productService` has caching).
- Enforce minimum TTL of 300 seconds for all public read-only cache entries.

### 3. HTTP Middleware Stack (`index.js`)

**Current state**: `helmet`, `compression`, `cors`, `rateLimit` are all present. Session cookie has `httpOnly: true`, `secure` in production, `sameSite` in production. `SESSION_SECRET` falls back to `'your-secret-key'`.

**Changes**:
- Remove `SESSION_SECRET` hardcoded fallback — throw at startup if missing in production.
- Remove `JWT_SECRET` hardcoded fallback in `config/config.js` — throw at startup if missing in production.
- Remove unused `{ dirname, join }` from `'path'` and `{ fileURLToPath }` from `'url'` imports (CommonJS `__dirname` is natively available).
- Add `Cache-Control: public, max-age=300` header to public read-only API responses via a response middleware helper.
- Add `Cache-Control: no-store` to authenticated/write responses.
- Add `Cache-Control: public, max-age=86400` and `ETag` to static file serving from `uploads/`.
- Improve graceful shutdown to also close the Redis client and DB pool before `process.exit()`.

### 4. Auth Middleware (`middleware/authMiddleware.js`)

**Current state**: Already returns `{ code: 'INVALID_TOKEN' }` on JWT failure. Uses `process.env.JWT_SECRET` (but `config/config.js` has a hardcoded fallback that some code may use).

**Changes**:
- Ensure all JWT operations use `process.env.JWT_SECRET` directly, not the `config.js` export.
- Verify `authorize()`, `isAdmin()`, `isStaff()` all return HTTP 403 (not 401) when role check fails — already correct.

### 5. Upload Middleware (`middleware/uploadMiddleware.js`)

**Current state**: MIME type allowlist check is in `fileFilter` (before disk write). Magic byte validation (`validateMagicBytes`) is a post-upload middleware that must be applied manually after multer. File size limits are set per upload instance.

**Changes**:
- The MIME type check in `fileFilter` already rejects before disk write — this is correct.
- `validateMagicBytes` is already implemented — ensure it is applied on all upload routes.
- After successful ImageKit upload, delete local temp file immediately (already done in `uploadFileToImageKit` helper in `productController` — audit other controllers for the same pattern).
- Set `Cache-Control: public, max-age=86400` on static file responses from `uploads/` in `index.js`.

### 6. CORS Config (`config/corsConfig.js`)

**Current state**: On DB error in `getBrandDomains()`, the catch block logs the error and returns `[]` (empty array). The origin check then falls through to the `process.env.NODE_ENV === 'production'` block, which blocks the request in production. This is the correct behavior but the log level is `console.error`, not `logger.warn`.

**Changes**:
- Replace `console.error` with `logger.warn` in the catch block.
- On DB error, fall back to `staticAllowedOrigins` rather than returning `[]` (which would block all dynamic brand domains).

### 7. Order Number Generation (`controller/orderController.js`)

**Current state**: `generateOrderNumber()` uses `Date + random 4-digit suffix`. The `order_number` column has a `unique` constraint in the model. However, there is no retry logic on collision.

**Changes**:
- Wrap order creation in a retry loop (max 3 attempts) that catches `SequelizeUniqueConstraintError` on `order_number` and regenerates before retrying.

### 8. Production Logging (`controller/productController.js`, others)

**Current state**: `createProduct` and `updateProduct` log full `req.body` with `console.log` unconditionally. The `logger` utility in `config/logging.js` already suppresses `debug` in production.

**Changes**:
- Replace all `console.log("Request Body:", ...)` calls in controllers with `logger.debug(...)` so they are suppressed in production.
- Ensure no controller logs JWT tokens, passwords, or payment credentials at any level.

### 9. Dependency Hygiene (`package.json`)

**Current state**: Both `bcrypt` and `bcryptjs` are present. `userController.js` uses `bcrypt`; `scripts/setupDatabase.js` uses `bcryptjs`. The `etag` package is listed as a dependency alongside Express's built-in ETag support. `xlsx` is loaded at module level in `orderController.js`.

**Changes**:
- Remove `bcryptjs` from `package.json`; update `scripts/setupDatabase.js` to use `bcrypt`.
- Remove the standalone `etag` package; use Express's built-in `res.set('ETag', ...)` or `etag` from the `express` internals.
- Lazy-require `xlsx` inside the export handler function in `orderController.js`.
- Move `nodemon` to `devDependencies` (already there — verify).

### 10. Dead Code and File Cleanup

**Files to move/archive**:
- `config/corsConfig.EXAMPLE.js` → `docs/examples/corsConfig.EXAMPLE.js`
- `scripts/migrateToImageKit.js`, `scripts/migrateProfilesToImageKit.js`, `scripts/migrateReviewImagesToImageKit.js` → `scripts/archive/`

**Code to remove**:
- Unused `{ dirname, join }` and `{ fileURLToPath }` imports in `index.js`.
- Commented-out code blocks > 3 lines across all controllers.
- Top-level `require('../model/utmModel.js')` inside `createOrder` (it's already imported at the top of the file — the inline `require` is redundant).

**`.gitignore` update**:
- Add `Backend/uploads/**` with a `!Backend/uploads/.gitkeep` exception.

### 11. Input Sanitization

**Current state**: `dompurify` is listed as a dependency but usage is not consistently applied across all text input fields.

**Changes**:
- Create a `utils/sanitize.js` helper that wraps `dompurify` (using `jsdom` as the DOM implementation, which is already a dependency).
- Apply sanitization to all user-supplied text fields before DB writes in: `productController`, `blogController`, `reviewController`, `userController`, `leadController`.

---

## Data Models

No new models are introduced. The following schema changes are required:

### Index Additions (via Sequelize model `indexes` arrays)

| Model | Column(s) | Type |
|---|---|---|
| `OrderItem` | `order_id` | index |
| `OrderItem` | `product_id` | index |
| `OrderItem` | `variation_id` | index |
| `ProductVariation` | `productId` | index |
| `ProductImage` | `product_id` | index |
| `ProductImage` | `product_variation_id` | index |
| `Review` | `productId` | index |
| `Review` | `userId` | index |
| `Order` | `brand_id` | index (already exists via model) |
| `Order` | `created_at` | index |
| `CartItem` | `cartId` | index |
| `Wishlist` | `userId` | index |
| `Wishlist` | `productId` | index |
| `UTMTracking` | `session_id` | index |

### Order Number Uniqueness

The `order_number` column already has `unique: 'idx_order_number'` in the model. The application layer must add retry logic on `SequelizeUniqueConstraintError`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Parameterized query injection safety

*For any* user-supplied string input passed to a raw Sequelize query, the query result should be identical to the result with a known-safe input of the same semantic value, and the input should never alter the query structure (no extra rows returned, no errors from SQL metacharacters).

**Validates: Requirements 1.5**

---

### Property 2: Transaction atomicity on failure

*For any* multi-table write operation (order creation, product creation) where an exception is thrown after the first write but before commit, the database state should be identical to the state before the operation began — no partial records should exist.

**Validates: Requirements 1.2, 5.5**

---

### Property 3: Cache read-through and TTL

*For any* product, category, or brand ID, making two consecutive GET requests where the first is a cache miss should result in: (a) the second request returning the same data as the first, and (b) the cache key existing with a TTL ≥ 300 seconds after the first request.

**Validates: Requirements 2.1**

---

### Property 4: Cache invalidation on mutation

*For any* cached resource (product, category, brand), after a create, update, or delete operation on that resource, a subsequent GET request should not return the pre-mutation cached value.

**Validates: Requirements 2.2**

---

### Property 5: ETag 304 round-trip

*For any* GET request to a public read-only endpoint that returns an ETag header, a subsequent GET request with `If-None-Match` set to that ETag value should receive HTTP 304 with an empty body.

**Validates: Requirements 2.4**

---

### Property 6: Cache-Control header correctness

*For any* GET request to a public read-only endpoint (product list, category list), the response should include `Cache-Control: public, max-age=300`. *For any* authenticated or write endpoint, the response should include `Cache-Control: no-store`.

**Validates: Requirements 2.5**

---

### Property 7: Redis fallback to DB

*For any* GET request to a cached endpoint, when the Redis client is unavailable (connection refused), the response should still return valid data (fetched from DB) and should not return a 5xx error.

**Validates: Requirements 2.6**

---

### Property 8: Local file cleanup after ImageKit upload

*For any* file upload that is successfully transferred to ImageKit, the local temporary file path should not exist on the filesystem after the request completes.

**Validates: Requirements 3.2, 4.5**

---

### Property 9: MIME type rejection before disk write

*For any* file upload request where the `Content-Type` header is not in the allowlist (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`), the upload should be rejected with HTTP 400 and no file should be written to the `uploads/` directory.

**Validates: Requirements 4.1, 7.8**

---

### Property 10: Magic byte validation

*For any* file upload where the declared MIME type does not match the file's actual magic bytes, the upload should be rejected with HTTP 400 and the file should be deleted from disk.

**Validates: Requirements 4.2**

---

### Property 11: File size enforcement

*For any* image file upload exceeding 5 MB, or any video file upload exceeding 50 MB, the upload should be rejected with HTTP 413.

**Validates: Requirements 4.3**

---

### Property 12: Order number uniqueness

*For any* set of concurrently created orders, all resulting `order_number` values should be distinct — no two orders should share the same order number.

**Validates: Requirements 5.3**

---

### Property 13: Transaction rollback on unhandled exception

*For any* request handler that starts a Sequelize transaction and encounters an unhandled exception, the transaction should be rolled back and the response should be an appropriate HTTP error (4xx or 5xx), not a 2xx success.

**Validates: Requirements 5.5**

---

### Property 14: CORS DB error fallback

*For any* CORS origin check where the DB query for brand domains throws an error, the request from a statically allowed origin should still be permitted (not blocked), and the error should be logged at `warn` level.

**Validates: Requirements 5.6**

---

### Property 15: Invalid JWT rejection

*For any* request to an authenticated endpoint with a tampered, expired, or missing JWT, the response should be HTTP 401 with a body containing `code: 'INVALID_TOKEN'` or `code: 'TOKEN_EXPIRED'`.

**Validates: Requirements 7.2**

---

### Property 16: Rate limiter enforcement

*For any* sequence of more than 10 requests to an auth endpoint (`/api/users/login`, `/api/users/register`) within a 15-minute window from the same IP, requests beyond the 10th should receive HTTP 429. *For any* sequence of more than 100 requests to any other `/api/` route within 1 minute, requests beyond the 100th should receive HTTP 429.

**Validates: Requirements 7.3**

---

### Property 17: XSS input sanitization

*For any* user-supplied text input containing HTML/script tags (e.g., `<script>alert(1)</script>`), the value stored in the DB and returned in API responses should have the script tags stripped or escaped.

**Validates: Requirements 7.4**

---

### Property 18: Role-based access control

*For any* request to an admin-only endpoint with a valid JWT belonging to a non-admin role (e.g., `consumer`, `product_manager`), the response should be HTTP 403.

**Validates: Requirements 7.6**

---

### Property 19: No stack traces in production error responses

*For any* request that triggers an unhandled server error when `NODE_ENV === 'production'`, the response body should not contain a `stack` field, file paths, or SQL query details.

**Validates: Requirements 7.7**

---

## Error Handling

### Redis Unavailability
- `cacheManager.get()` already returns `null` on error — controllers must treat `null` as a cache miss and proceed to DB.
- `cacheManager.set()` and `cacheManager.invalidate()` errors should be logged at `warn` level and not propagate to the caller.

### Transaction Failures
- All controllers that open a Sequelize transaction must wrap the entire handler body in `try/catch` with `transaction.rollback()` in the catch block.
- The `transaction.finished` check before rollback (already present in `orderController`) should be applied consistently.

### File Upload Errors
- Multer errors (size exceeded, invalid type) must be caught by the Express error handler and returned as HTTP 413 or HTTP 400 respectively.
- ImageKit upload failures should fall back to local path storage (already implemented) with a `logger.warn` entry.

### Graceful Shutdown
- On `SIGTERM`/`SIGINT`, the shutdown sequence must be:
  1. Stop accepting new connections (`server.close()`)
  2. Close Redis client (`redisService.close()`)
  3. Close Sequelize pool (`sequelize.close()`)
  4. `process.exit(0)`
- A 10-second timeout should force `process.exit(1)` if shutdown stalls.

### Secret Validation at Startup
- If `JWT_SECRET` or `SESSION_SECRET` is missing in production, the server should log a fatal error and exit with code 1 before binding to the port.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. Unit tests cover specific examples, integration points, and edge cases. Property-based tests verify universal correctness across randomized inputs.

### Unit Tests

Focus areas:
- `cacheManager.get()` returns `null` when Redis throws (mock Redis client)
- `validateMagicBytes` middleware rejects files with mismatched magic bytes (specific JPEG/PNG/WebP examples)
- `authMiddleware.authenticate` returns 401 with `code: 'INVALID_TOKEN'` for tampered tokens
- `authMiddleware.isAdmin` returns 403 for non-admin roles
- Graceful shutdown sequence closes Redis and DB in order (mock process signals)
- `config/config.js` throws when `JWT_SECRET` is absent in production
- `SESSION_SECRET` absence causes startup failure in production
- `getKeys()` uses SCAN not KEYS (verify via mock Redis client call tracking)
- `bcryptjs` is not present in `package.json`
- `xlsx` is not required at module load time

### Property-Based Tests

Use **fast-check** (JavaScript property-based testing library) for all property tests. Configure each test to run a minimum of **100 iterations**.

Each property test must be tagged with a comment in the format:
`// Feature: backend-performance-security-audit, Property {N}: {property_text}`

**Property 1 — Parameterized query injection safety**
Generate random strings containing SQL metacharacters (`'`, `"`, `;`, `--`, `/**/`, `UNION`, `DROP`). Pass them as search/filter parameters to list endpoints. Verify: (a) no 5xx response, (b) response count matches only legitimate records.
`// Feature: backend-performance-security-audit, Property 1: parameterized query injection safety`

**Property 2 — Transaction atomicity on failure**
Generate random valid order payloads. Inject a mock that throws after the first DB write. Verify: (a) HTTP 5xx returned, (b) no `Order` record exists in DB after the request.
`// Feature: backend-performance-security-audit, Property 2: transaction atomicity on failure`

**Property 3 — Cache read-through and TTL**
Generate random product IDs. Make two GET requests. Verify: (a) both return same data, (b) cache key TTL ≥ 300 after first request.
`// Feature: backend-performance-security-audit, Property 3: cache read-through and TTL`

**Property 4 — Cache invalidation on mutation**
Generate random product data. Create product (populates cache). Update product. Make GET request. Verify response reflects updated data, not cached stale data.
`// Feature: backend-performance-security-audit, Property 4: cache invalidation on mutation`

**Property 5 — ETag 304 round-trip**
Generate random public endpoint paths. Make first GET, capture ETag. Make second GET with `If-None-Match`. Verify HTTP 304 and empty body.
`// Feature: backend-performance-security-audit, Property 5: ETag 304 round-trip`

**Property 6 — Cache-Control header correctness**
Generate random public endpoint paths and authenticated endpoint paths. Verify correct `Cache-Control` header on each category.
`// Feature: backend-performance-security-audit, Property 6: Cache-Control header correctness`

**Property 7 — Redis fallback to DB**
Simulate Redis connection failure (mock). Generate random product IDs. Verify GET returns valid data with HTTP 200.
`// Feature: backend-performance-security-audit, Property 7: Redis fallback to DB`

**Property 8 — Local file cleanup after ImageKit upload**
Generate random valid image buffers. Upload via the API. Verify the temp file path no longer exists after the request.
`// Feature: backend-performance-security-audit, Property 8: local file cleanup after ImageKit upload`

**Property 9 — MIME type rejection before disk write**
Generate random MIME type strings not in the allowlist. Send upload requests with those Content-Type values. Verify HTTP 400 and no file written to `uploads/`.
`// Feature: backend-performance-security-audit, Property 9: MIME type rejection before disk write`

**Property 10 — Magic byte validation**
Generate image buffers with valid MIME type headers but incorrect magic bytes (e.g., declare `image/jpeg` but use PNG magic bytes). Verify HTTP 400 and file deleted from disk.
`// Feature: backend-performance-security-audit, Property 10: magic byte validation`

**Property 11 — File size enforcement**
Generate image buffers of random sizes between 1 byte and 10 MB. Verify: files ≤ 5 MB are accepted, files > 5 MB return HTTP 413.
`// Feature: backend-performance-security-audit, Property 11: file size enforcement`

**Property 12 — Order number uniqueness**
Generate N concurrent order creation requests (N = 50–200). Verify all resulting `order_number` values in the DB are distinct.
`// Feature: backend-performance-security-audit, Property 12: order number uniqueness`

**Property 13 — Transaction rollback on unhandled exception**
Generate random valid request payloads for order/product creation. Inject a mock that throws at a random point after transaction start. Verify: HTTP error response and no partial records in DB.
`// Feature: backend-performance-security-audit, Property 13: transaction rollback on unhandled exception`

**Property 14 — CORS DB error fallback**
Simulate DB error in `getBrandDomains`. Generate requests from statically allowed origins. Verify: requests are permitted (not blocked) and a `warn` log entry is emitted.
`// Feature: backend-performance-security-audit, Property 14: CORS DB error fallback`

**Property 15 — Invalid JWT rejection**
Generate random strings, expired tokens, and tokens signed with wrong secrets. Send to authenticated endpoints. Verify HTTP 401 with `code: 'INVALID_TOKEN'` or `code: 'TOKEN_EXPIRED'`.
`// Feature: backend-performance-security-audit, Property 15: invalid JWT rejection`

**Property 16 — Rate limiter enforcement**
Generate sequences of N requests (N > 10 for auth, N > 100 for general) from the same IP within the window. Verify requests beyond the limit receive HTTP 429.
`// Feature: backend-performance-security-audit, Property 16: rate limiter enforcement`

**Property 17 — XSS input sanitization**
Generate random strings containing HTML/script injection payloads. Submit via text input fields (product name, review body, blog content). Verify stored/returned values have script tags stripped.
`// Feature: backend-performance-security-audit, Property 17: XSS input sanitization`

**Property 18 — Role-based access control**
Generate valid JWTs for each non-admin role (`consumer`, `product_manager`, `order_manager`, `whatsapp_manager`). Send to admin-only endpoints. Verify HTTP 403 for all non-admin roles.
`// Feature: backend-performance-security-audit, Property 18: role-based access control`

**Property 19 — No stack traces in production error responses**
Generate requests that trigger server errors (invalid IDs, malformed payloads) with `NODE_ENV=production`. Verify response body does not contain `stack`, file paths, or SQL fragments.
`// Feature: backend-performance-security-audit, Property 19: no stack traces in production error responses`
