# Requirements Document

## Introduction

This spec covers a comprehensive audit and improvement initiative for the CrossCoin Node.js/Express backend. The goal is to reduce resource consumption and bandwidth, eliminate bugs, remove dead code and unwanted files, and harden the application against security threats. The work is organized into four areas: Performance Optimization, Bug Fixes, Dead Code & File Cleanup, and Security Hardening.

## Glossary

- **System**: The CrossCoin Express.js backend application
- **Cache_Manager**: The Redis-backed `services/cacheManager.js` singleton
- **Auth_Middleware**: The JWT authentication layer in `middleware/authMiddleware.js`
- **Upload_Middleware**: The Multer-based file upload handler in `middleware/uploadMiddleware.js`
- **Rate_Limiter**: The `express-rate-limit` instances configured in `index.js`
- **CORS_Config**: The dynamic CORS origin resolver in `config/corsConfig.js`
- **DB**: The MySQL database accessed via Sequelize ORM
- **ImageKit**: The external CDN/image optimization service
- **FShip**: The third-party shipping integration service
- **Sequelize**: The ORM used for all DB interactions
- **JWT**: JSON Web Token used for stateless authentication
- **PII**: Personally Identifiable Information (email, phone, address)
- **N+1 Query**: A database anti-pattern where one query spawns N additional queries in a loop
- **Dead Code**: Source code that is defined but never executed or referenced
- **Hardcoded Secret**: A credential or key embedded directly in source code rather than loaded from environment variables

---

## Requirements

### Requirement 1: Database Query Optimization

**User Story:** As a backend engineer, I want all database queries to use efficient patterns, so that the server uses fewer CPU cycles and DB connections under load.

#### Acceptance Criteria

1. WHEN the System fetches a list of products, orders, or users, THE System SHALL use `findAndCountAll` with explicit `attributes` arrays to select only required columns instead of `SELECT *`.
2. WHEN the System performs a write operation that spans multiple tables (e.g., order creation, product creation), THE System SHALL wrap all writes in a single Sequelize transaction to prevent partial writes.
3. WHEN the System loads a model that has associated child records (e.g., `OrderItems`, `ProductVariations`, `ProductImages`), THE System SHALL use eager loading (`include`) in a single query rather than issuing separate queries per record.
4. THE System SHALL define database indexes on all foreign key columns and all columns used in `WHERE` clauses across Sequelize models (e.g., `product_id`, `user_id`, `order_id`, `slug`, `status`).
5. WHEN the System executes a raw SQL query containing user-supplied input, THE System SHALL use parameterized queries or Sequelize's built-in escaping and SHALL NOT interpolate user input directly into SQL strings.

---

### Requirement 2: Response Caching and Bandwidth Reduction

**User Story:** As a backend engineer, I want frequently read data to be served from cache and responses to be compressed, so that bandwidth and DB load are minimized.

#### Acceptance Criteria

1. WHEN a GET request is made for a product detail, product list, category list, or brand list, THE Cache_Manager SHALL return the cached response if a valid cache entry exists, and SHALL store the DB result in cache with a TTL of at least 300 seconds on a cache miss.
2. WHEN a product, category, or brand record is created, updated, or deleted, THE Cache_Manager SHALL invalidate all cache keys matching the affected resource pattern (e.g., `product:*`, `products:*`).
3. THE System SHALL apply HTTP `compression` middleware to all API responses, compressing payloads larger than 1 KB using gzip or brotli.
4. WHEN a GET request includes an `If-None-Match` header matching the current ETag, THE System SHALL respond with HTTP 304 and an empty body instead of re-sending the full payload.
5. THE System SHALL set `Cache-Control: public, max-age=300` on all public read-only API responses (product listings, category listings) and `Cache-Control: no-store` on all authenticated or write responses.
6. WHEN the Cache_Manager encounters a Redis connection error during a GET operation, THE Cache_Manager SHALL fall back to fetching data directly from the DB and SHALL NOT return an error to the caller.

---

### Requirement 3: Memory and Process Resource Management

**User Story:** As a backend engineer, I want the server process to use memory efficiently and release resources promptly, so that the server stays stable under sustained load.

#### Acceptance Criteria

1. WHEN the server starts, THE System SHALL initialize a single shared Sequelize connection pool with a maximum of 10 connections and a minimum of 2 connections, and SHALL NOT create additional pool instances.
2. WHEN a file upload is processed and successfully transferred to ImageKit, THE System SHALL delete the local temporary file from the `uploads/` directory within the same request lifecycle.
3. WHEN the server receives a `SIGTERM` or `SIGINT` signal, THE System SHALL close all active DB connections, the Redis client, and the HTTP server before exiting, completing shutdown within 10 seconds.
4. THE System SHALL NOT load all Sequelize model associations eagerly at startup for routes that do not require them; each route handler SHALL include only the associations it needs.
5. WHEN memory heap usage exceeds 400 MB, THE System SHALL emit a `warn`-level log entry and, if the `--expose-gc` flag is active, SHALL invoke `global.gc()`.

---

### Requirement 4: Upload and Static File Handling

**User Story:** As a backend engineer, I want file uploads to be validated and served efficiently, so that invalid files are rejected early and static file serving does not waste bandwidth.

#### Acceptance Criteria

1. WHEN a file is uploaded, THE Upload_Middleware SHALL validate the file's MIME type against an allowlist (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`) before writing it to disk.
2. WHEN a file is uploaded, THE Upload_Middleware SHALL verify the file's magic bytes match the declared MIME type after writing to disk, and SHALL delete the file and return HTTP 400 if the bytes do not match.
3. THE Upload_Middleware SHALL enforce a maximum file size of 5 MB for images and 50 MB for video files, and SHALL return HTTP 413 if the limit is exceeded.
4. WHEN serving files from the `uploads/` directory, THE System SHALL set `Cache-Control: public, max-age=86400` and an `ETag` header on each response.
5. THE System SHALL NOT store uploaded images permanently on the local filesystem; WHEN an image is successfully uploaded to ImageKit, THE System SHALL remove the local copy immediately.

---

### Requirement 5: Bug Identification and Fixes

**User Story:** As a backend engineer, I want known bugs and error-prone patterns to be identified and corrected, so that the API behaves reliably for all clients.

#### Acceptance Criteria

1. WHEN `config/config.js` is loaded, THE System SHALL read `JWT_SECRET` exclusively from `process.env.JWT_SECRET` and SHALL NOT fall back to a hardcoded string value.
2. WHEN `index.js` initializes the session store, THE System SHALL read `SESSION_SECRET` exclusively from `process.env.SESSION_SECRET` and SHALL NOT fall back to a hardcoded string value.
3. WHEN the `generateOrderNumber` function produces a number, THE System SHALL guarantee uniqueness by using a database-level unique constraint on `order_number` and retrying generation on collision, rather than relying solely on a random suffix.
4. WHEN `productController.js` logs request body data during product creation or update, THE System SHALL omit logging in production (`NODE_ENV === 'production'`) to prevent PII and payload data from appearing in logs.
5. IF a Sequelize transaction is started and an unhandled exception occurs before `commit()` or `rollback()` is called, THEN THE System SHALL catch the exception, call `transaction.rollback()`, and return an appropriate HTTP error response.
6. WHEN the `CORS_Config` encounters a DB error while fetching brand domains, THE System SHALL log the error at `warn` level and SHALL fall back to the static allowed-origins list rather than silently allowing all origins.
7. WHEN `cacheManager.getKeys()` is called in production, THE System SHALL use `SCAN` with a cursor instead of `KEYS` to avoid blocking the Redis event loop.

---

### Requirement 6: Dead Code and Unwanted File Removal

**User Story:** As a backend engineer, I want unused code, duplicate dependencies, and leftover files removed, so that the codebase is smaller, easier to maintain, and has a reduced attack surface.

#### Acceptance Criteria

1. THE System SHALL NOT contain both `bcrypt` and `bcryptjs` as dependencies; THE System SHALL use exactly one bcrypt library consistently across all files that hash or compare passwords.
2. THE System SHALL NOT import `{ dirname, join }` from `'path'` and `{ fileURLToPath }` from `'url'` in CommonJS modules where `__dirname` is already available natively.
3. THE System SHALL NOT contain the `config/corsConfig.EXAMPLE.js` file in the production deployment; THE System SHALL move example/template config files to a `docs/` or `.examples/` directory.
4. THE System SHALL NOT contain migration scripts (`scripts/migrateToImageKit.js`, `scripts/migrateProfilesToImageKit.js`, `scripts/migrateReviewImagesToImageKit.js`) that have already been run and are no longer needed in the active codebase; THE System SHALL archive them in a `scripts/archive/` directory.
5. THE System SHALL NOT contain commented-out code blocks longer than 3 lines in production source files; all such blocks SHALL be removed.
6. THE System SHALL NOT import modules at the top level that are only used inside a single function; such imports SHALL be moved to the function scope or hoisted to the top of the file consistently.
7. THE System SHALL NOT contain the `Backend/uploads/` directory contents in version control; THE System SHALL ensure `uploads/**` (excluding `.gitkeep`) is listed in `.gitignore`.

---

### Requirement 7: Security Hardening

**User Story:** As a backend engineer, I want the API to be protected against common web vulnerabilities, so that user data and system integrity are preserved.

#### Acceptance Criteria

1. THE System SHALL use `helmet` middleware with a Content Security Policy that restricts `default-src` to `'self'` and explicitly allowlists only required external domains for `img-src` and `script-src`.
2. THE Auth_Middleware SHALL verify the JWT signature using `process.env.JWT_SECRET` and SHALL return HTTP 401 with a `code: 'INVALID_TOKEN'` body if verification fails for any reason.
3. THE Rate_Limiter SHALL apply a limit of 10 requests per 15-minute window to all authentication endpoints (`/api/users/login`, `/api/users/register`) and a limit of 100 requests per minute to all other `/api/` routes.
4. WHEN a user submits any text input that will be stored in the DB or rendered in a response, THE System SHALL sanitize the input using `dompurify` or an equivalent library to prevent stored XSS.
5. THE System SHALL set the `httpOnly`, `secure` (in production), and `sameSite: 'strict'` (in production) flags on all session cookies.
6. WHEN an admin-only endpoint is accessed, THE Auth_Middleware SHALL verify both authentication (valid JWT) and authorization (role is `admin` or an allowed staff role) before executing the handler, and SHALL return HTTP 403 if the role check fails.
7. THE System SHALL NOT expose internal error stack traces, DB query details, or environment variable values in HTTP responses when `NODE_ENV === 'production'`.
8. WHEN a file upload request is received, THE Upload_Middleware SHALL reject files whose `Content-Type` header does not match the allowlist before writing any bytes to disk.
9. THE System SHALL enforce HTTPS-only access in production by setting `Strict-Transport-Security: max-age=31536000; includeSubDomains` via the `helmet` HSTS option when `NODE_ENV === 'production'`.
10. THE System SHALL NOT log full request bodies, JWT tokens, passwords, or payment credentials at any log level in production.

---

### Requirement 8: Dependency and Package Hygiene

**User Story:** As a backend engineer, I want the dependency tree to be minimal and up-to-date, so that the attack surface from third-party packages is reduced.

#### Acceptance Criteria

1. THE System SHALL NOT have duplicate packages serving the same purpose (e.g., both `bcrypt` and `bcryptjs`, both `etag` and the built-in ETag support in Express); THE System SHALL remove the redundant package and update all references.
2. WHEN a new dependency is added, THE System SHALL add it to `dependencies` if required at runtime and to `devDependencies` if only required during development (e.g., `nodemon`).
3. THE System SHALL NOT include `xlsx` as a runtime dependency if it is only used in a single admin export endpoint; WHERE the feature is optional, THE System SHALL lazy-require `xlsx` inside the handler function to avoid loading it on every server start.
4. THE System SHALL maintain a `.env.example` file that lists all required environment variables with placeholder values and no real secrets, so that new developers can configure the application without accessing production credentials.
