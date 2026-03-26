# Requirements: Backend Optimization, ImageKit Integration & Security Hardening

## Overview

This feature covers three areas for the CrossCoin backend:
1. Migrate profile and review images to ImageKit (same pattern as products/categories/sliders)
2. Backend performance optimization (caching, N+1 query elimination)
3. Security hardening (CORS enforcement, rate limiting, HTTP security headers, file upload validation)

---

## Requirements

### 1. User Profile Image — ImageKit Upload

**User Story:** As a user, when I upload or update my profile picture, it should be stored in ImageKit and served via optimized CDN URLs.

**Acceptance Criteria:**
- WHEN a user uploads a profile image, the system SHALL upload the file buffer to ImageKit under the `/profiles` folder
- WHEN the upload succeeds, the system SHALL store the ImageKit file path in `users.profileImage`
- WHEN a user updates their profile image, the system SHALL delete the old ImageKit image before storing the new one
- WHEN a user deletes their account, the system SHALL delete their profile image from ImageKit
- The system SHALL return the ImageKit-optimized URL in all user profile API responses
- The system SHALL delete the local temp file after successful ImageKit upload

**Correctness Properties:**
- No orphaned images in ImageKit after user deletion
- Profile image URL in response is always a valid ImageKit URL (contains `ik.imagekit.io`)

---

### 2. Review Images — ImageKit Upload

**User Story:** As a user, when I submit a review with images or videos, they should be stored in ImageKit.

**Acceptance Criteria:**
- WHEN a review is created with attached files, the system SHALL upload each file to ImageKit under `/reviews`
- WHEN a review is deleted, the system SHALL delete all associated images from ImageKit
- WHEN a review image is served, the system SHALL return an ImageKit-optimized URL
- The system SHALL support both image and video file types in review uploads
- The system SHALL delete local temp files after successful ImageKit upload

**Correctness Properties:**
- No orphaned review images in ImageKit after review deletion
- `ReviewImage.fileName` stores the ImageKit file path, not a local filename

---

### 3. Migration Script — Existing Local Profile Images

**User Story:** As a developer, I need a one-time migration script to move existing local profile images to ImageKit without data loss.

**Acceptance Criteria:**
- WHEN the migration script runs, it SHALL find all users with a local `profileImage` path (not an ImageKit URL)
- FOR EACH such user, the script SHALL upload the local file to ImageKit and update `users.profileImage`
- IF a local file does not exist, the script SHALL skip that user and log a warning
- The script SHALL be idempotent — running it twice SHALL NOT re-upload already-migrated images
- The script SHALL log success/failure counts on completion

---

### 4. Migration Script — Existing Local Review Images

**User Story:** As a developer, I need a one-time migration script to move existing local review images to ImageKit.

**Acceptance Criteria:**
- WHEN the migration script runs, it SHALL find all `ReviewImage` records with a local `fileName` (not an ImageKit path)
- FOR EACH such record, the script SHALL upload the local file to ImageKit and update `review_images.fileName`
- IF a local file does not exist, the script SHALL skip that record and log a warning
- The script SHALL be idempotent
- The script SHALL log success/failure counts on completion

---

### 5. Optimized URL Resolution in API Responses

**Acceptance Criteria:**
- WHEN any endpoint returns user data, the system SHALL resolve `profileImage` through `imagekitService.getOptimizedUrl`
- WHEN any endpoint returns review data, the system SHALL resolve each `ReviewImage.fileName` through `imagekitService.getOptimizedUrl`
- Legacy bare filenames (not yet migrated) SHALL fall back to the local `/uploads/` path so nothing breaks during migration

---

### 6. Redis Caching for Public Review Queries

**Acceptance Criteria:**
- WHEN `getPublicProductReviews` is called, the system SHALL check Redis cache before querying the database
- Cache key SHALL be scoped by `productId`, `page`, `limit`, and `sort`
- Cache TTL SHALL be 10 minutes
- WHEN a review is created, updated, approved, or deleted for a product, the system SHALL invalidate that product's review cache
- Cache miss SHALL fall through to database query transparently

**Correctness Property:**
- A review approved by admin SHALL appear in public results within 10 minutes (next cache expiry)

---

### 7. N+1 Query Elimination

**Acceptance Criteria:**
- WHEN `getAllReviews` (admin) is called, the system SHALL use a single query with eager-loaded `User`, `Product`, and `ReviewImage` associations
- WHEN `getPublicProductReviews` is called, the system SHALL load `User` and `ReviewImage` in a single query
- WHEN user profile endpoints return data, associated data SHALL be loaded via `include`, not separate queries

---

### 8. CORS Enforcement (Security)

**User Story:** As a system operator, I need CORS to actually block unauthorized origins, not just log warnings.

**Acceptance Criteria:**
- WHEN a request arrives from an origin not in the allowed list, the system SHALL reject it with a CORS error (not silently allow it)
- The allowed origins list SHALL include: static production domains, localhost for development, and active brand domains from the database
- Requests with no origin (mobile apps, Postman, server-to-server) SHALL still be allowed
- The CORS fallback SHALL call `callback(new Error('Not allowed by CORS'))` for unknown origins in production
- In development (`NODE_ENV !== 'production'`), unknown origins MAY be allowed with a warning log

**Correctness Property:**
- In production, a request from `https://malicious-site.com` SHALL receive a CORS error response

---

### 9. Rate Limiting (Security)

**User Story:** As a system operator, I need rate limiting on sensitive endpoints to prevent brute force and abuse.

**Acceptance Criteria:**
- The system SHALL install and configure `express-rate-limit`
- Auth endpoints (`/api/users/login`, `/api/users/register`) SHALL be limited to 10 requests per 15 minutes per IP
- All other API endpoints SHALL be limited to 100 requests per minute per IP
- WHEN a rate limit is exceeded, the system SHALL respond with HTTP 429 and a clear message
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) SHALL be included in responses

**Correctness Property:**
- More than 10 login attempts from the same IP within 15 minutes SHALL result in a 429 response

---

### 10. HTTP Security Headers via Helmet (Security)

**User Story:** As a system operator, I need standard HTTP security headers to protect against common browser-based attacks.

**Acceptance Criteria:**
- The system SHALL install and use the `helmet` package
- The following headers SHALL be set: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (production only), `X-XSS-Protection`
- Content Security Policy SHALL be configured to allow ImageKit CDN (`ik.imagekit.io`) as an allowed image source
- Helmet SHALL be applied as the first middleware in the Express app

---

### 11. File Upload Magic-Byte Validation (Security)

**User Story:** As a system operator, I need file uploads to be validated by actual file content, not just MIME type or extension.

**Acceptance Criteria:**
- WHEN a file is uploaded, the system SHALL read the first 8 bytes and verify the magic bytes match the declared MIME type
- Files with mismatched magic bytes (e.g., a renamed `.php` file with `.jpg` extension) SHALL be rejected with HTTP 400
- Supported types for validation: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`52 49 46 46`)
- The validation SHALL be applied in `uploadMiddleware.js` as a custom `fileFilter`

**Correctness Property:**
- A file with `.jpg` extension but PHP content SHALL be rejected at upload time

---

### 12. Sensitive Data Leak Prevention (Security)

**Acceptance Criteria:**
- WHEN the server starts in production (`NODE_ENV === 'production'`), it SHALL NOT log environment variables, DB credentials, or API keys to stdout
- The startup debug log block SHALL be gated behind `NODE_ENV !== 'production'` (it already is, but must be verified)
- Error responses in production SHALL NOT include stack traces or internal error details



---

### 13. Order Confirmation Email

**User Story:** As a customer, after placing an order I should receive an email confirmation with my order details.

**Acceptance Criteria:**
- WHEN an order is successfully created (both authenticated and guest), the system SHALL send an order confirmation email to the customer's email address
- The email SHALL include: order number, items ordered with quantities and prices, shipping address, payment method, and estimated delivery
- WHEN an order status changes to `shipped`, the system SHALL send a shipping notification email with the AWB/tracking number
- WHEN an order status changes to `delivered`, the system SHALL send a delivery confirmation email
- Email sending SHALL be non-blocking — order creation SHALL NOT fail if email sending fails
- The system SHALL use `nodemailer` (already installed) with the existing `EMAIL_USER` and `EMAIL_APP_PASSWORD` env vars

**Correctness Property:**
- A guest customer who places a COD order SHALL receive an email — the ThankYou page currently says "Confirmation sent to your email" but nothing is sent

---

### 14. Order Cancellation by User

**User Story:** As a customer, I should be able to cancel my own order if it hasn't been shipped yet.

**Acceptance Criteria:**
- WHEN a user sends a cancel request for their own order, the system SHALL allow cancellation only if order status is `pending` or `processing`
- WHEN an order is cancelled, the system SHALL restore stock for all order items
- WHEN an order is cancelled, the system SHALL update `order.status` to `cancelled` and `payment_status` to `cancelled`
- WHEN a prepaid order is cancelled, the system SHALL mark it for refund (set `payment_status` to `refund_pending`)
- Guest users SHALL be able to cancel by providing their email + order number
- The endpoint SHALL be `POST /api/orders/:id/cancel` for authenticated users
- The endpoint SHALL be `POST /api/orders/guest/cancel` for guests (requires `email` + `order_number` in body)

**Correctness Property:**
- Cancelling an order with 3 items of stock 10 SHALL result in stock becoming 13 for each item

---

### 15. JWT Token Refresh

**User Story:** As a user, I should not be logged out every 24 hours without warning.

**Acceptance Criteria:**
- The system SHALL issue a `refreshToken` (7-day expiry) alongside the `accessToken` (1-day expiry) on login
- The system SHALL expose a `POST /api/users/refresh-token` endpoint that accepts a valid refresh token and returns a new access token
- Refresh tokens SHALL be stored in the database (hashed) on the `users` table
- WHEN a refresh token is used, the system SHALL invalidate the old one and issue a new one (rotation)
- WHEN a user logs out, the system SHALL invalidate their refresh token

---

### 16. Product Filters (Price Range, Stock, Rating)

**User Story:** As a shopper, I should be able to filter products by price range, availability, and rating on the Collections/Products page.

**Acceptance Criteria:**
- The public products endpoint (`GET /api/products/public`) SHALL accept the following optional query params:
  - `minPrice` — filter variations with price >= minPrice
  - `maxPrice` — filter variations with price <= maxPrice
  - `inStock` — when `true`, only return products with at least one variation with stock > 0
  - `minRating` — only return products with `avg_rating` >= minRating
  - `attributes` — JSON-encoded object to filter by attribute values e.g. `{"color":["red","blue"],"size":["M","L"]}`
- WHEN filters are applied, the system SHALL return only products matching ALL specified filters
- Filter params SHALL be optional — omitting them returns all products as before

**Correctness Property:**
- A request with `minPrice=100&maxPrice=500&inStock=true` SHALL NOT return products where all variations are out of stock or priced outside the range

---

### 17. Password Strength Validation

**Acceptance Criteria:**
- WHEN a user registers or resets their password, the system SHALL reject passwords shorter than 8 characters
- The system SHALL require at least one uppercase letter, one lowercase letter, and one number
- WHEN validation fails, the system SHALL return HTTP 400 with a clear message describing the requirement
- The same validation SHALL apply to: `register`, `resetPassword`, `updatePassword`, and `changePassword` endpoints

---

### 18. Mega Menu — Attribute-Based Navigation

**User Story:** As a shopper, when I hover over "Products" in the navigation, I should see a mega menu that groups products by their attribute values (e.g. by color, size, type) so I can quickly jump to filtered product listings.

**Acceptance Criteria:**
- The system SHALL expose a new public endpoint `GET /api/attributes/mega-menu` (no auth required)
- The endpoint SHALL return all active attributes with their active values, scoped by `req.brandId`
- Each attribute SHALL include its values with a `product_count` — the number of active, in-stock products that have that attribute value
- Attribute values with `product_count === 0` SHALL be excluded from the response
- The response SHALL be cached in Redis with a 30-minute TTL, keyed by `brand_id`
- Cache SHALL be invalidated when a product is created, updated, or deleted
- The response shape SHALL be:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "color",
      "values": [
        { "id": 10, "value": "Red", "product_count": 5 },
        { "id": 11, "value": "Blue", "product_count": 3 }
      ]
    },
    {
      "id": 2,
      "name": "size",
      "values": [
        { "id": 20, "value": "M", "product_count": 8 },
        { "id": 21, "value": "L", "product_count": 6 }
      ]
    }
  ]
}
```
- The frontend `Header.jsx` "Products" nav item SHALL be updated to show a mega menu dropdown on hover, rendering the attribute groups and their values as clickable links
- Each value link SHALL navigate to `/Products?attributes={"color":["Red"]}` (using the existing filter from Req 16)
- The mega menu SHALL be accessible on desktop hover and mobile tap-to-expand
- The mega menu SHALL close when the user clicks outside or navigates away



---

### 19. WhatsApp Order Notifications (Replace Email)

**User Story:** As a customer, I should receive WhatsApp messages for order confirmation, shipping updates, and delivery — instead of email — since WhatsApp has higher open rates in India.

**Background:**
Phone number is available from `shipping_addresses.phone` for both authenticated and guest users. The system will use the Meta WhatsApp Business API (Cloud API) — free tier supports up to 1,000 conversations/month. Requires a Meta Business account, a verified phone number, and approved message templates.

**Acceptance Criteria:**
- WHEN an order is successfully created, the system SHALL send a WhatsApp message to the customer's phone number from the shipping address
- WHEN an order status changes to `shipped`, the system SHALL send a WhatsApp shipping notification with the AWB/tracking number and tracking URL
- WHEN an order status changes to `delivered`, the system SHALL send a WhatsApp delivery confirmation
- WHEN an order is cancelled, the system SHALL send a WhatsApp cancellation notification
- All WhatsApp messages SHALL use pre-approved Meta message templates
- WhatsApp sending SHALL be non-blocking — order creation SHALL NOT fail if WhatsApp sending fails
- The system SHALL add the following env vars: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
- A new service `Backend/services/whatsappService.js` SHALL handle all WhatsApp API calls via `axios` to `https://graph.facebook.com/v18.0/{phone_number_id}/messages`
- Phone numbers SHALL be formatted to E.164 format (e.g. `+919876543210`) before sending
- IF the customer has no phone number, the notification SHALL be silently skipped with a warning log

**Message Templates (to be created in Meta Business Manager):**
- `order_confirmation` — order number, item count, total amount, estimated delivery
- `order_shipped` — order number, AWB number, tracking URL
- `order_delivered` — order number, thank you message
- `order_cancelled` — order number, refund info if prepaid

**Correctness Property:**
- A guest order with phone `9876543210` SHALL trigger a WhatsApp message to `+919876543210` within 5 seconds of order creation

---

### 20. Lookbook Feature

**User Story:** As a brand admin, I should be able to create curated lookbooks — editorial photo collections that link products to lifestyle images — so customers can shop the look directly from the image.

**Background:**
Similar to Shopify's lookbook feature. A lookbook is a collection of editorial/lifestyle images where each image can have multiple "hotspots" — clickable product tags positioned on the image that show product info and allow add-to-cart.

**Acceptance Criteria:**

**Backend:**
- The system SHALL create a `lookbooks` table with: `id`, `title`, `slug`, `description`, `status` (active/draft), `brand_id`, `display_order`, `created_at`, `updated_at`
- The system SHALL create a `lookbook_images` table with: `id`, `lookbook_id`, `image_url` (ImageKit path), `display_order`, `alt_text`
- The system SHALL create a `lookbook_hotspots` table with: `id`, `lookbook_image_id`, `product_id`, `position_x` (0-100 percentage), `position_y` (0-100 percentage), `label`
- Admin endpoints SHALL include: CRUD for lookbooks, upload lookbook images to ImageKit under `/lookbooks`, add/update/remove hotspots on images
- Public endpoint `GET /api/lookbooks` SHALL return active lookbooks scoped by `req.brandId`, with images and hotspot product data (name, price, primary image, slug)
- Public endpoint `GET /api/lookbooks/:slug` SHALL return a single lookbook with full image + hotspot data
- Lookbook images SHALL be uploaded to ImageKit under `/lookbooks` folder using the same pattern as sliders/blogs
- The response SHALL include ImageKit-optimized URLs for all lookbook images

**Frontend (Crosscoin):**
- A new `/Lookbook` page SHALL display all active lookbooks as a grid of cover images
- Clicking a lookbook SHALL open the full lookbook view with images and interactive hotspots
- Hotspots SHALL appear as pulsing dot indicators on the image
- Hovering/tapping a hotspot SHALL show a product card popup with image, name, price, and "Add to Cart" button
- The lookbook SHALL be responsive — hotspot positions use percentage-based coordinates so they work on all screen sizes

---

### 21. Shoppable Reels / Video Feed (Reelify-style)

**User Story:** As a brand admin, I should be able to upload short product videos (reels) that customers can scroll through vertically — like Instagram Reels — with product tags that allow direct add-to-cart.

**Background:**
Similar to Shopify's Reelify app. A vertical scrolling video feed where each reel is a short video with tagged products. Videos are stored in ImageKit (supports video uploads). The feed is embedded on the homepage or a dedicated `/Reels` page.

**Acceptance Criteria:**

**Backend:**
- The system SHALL create a `reels` table with: `id`, `title`, `video_url` (ImageKit path), `thumbnail_url` (ImageKit path), `status` (active/draft), `brand_id`, `display_order`, `view_count`, `created_at`, `updated_at`
- The system SHALL create a `reel_products` table with: `id`, `reel_id`, `product_id`, `display_order`
- Admin endpoints SHALL include: CRUD for reels, upload reel video + thumbnail to ImageKit under `/reels`, assign/remove products from a reel
- Video uploads SHALL support `video/mp4` and `video/webm` MIME types, max 50MB
- Public endpoint `GET /api/reels` SHALL return active reels scoped by `req.brandId`, ordered by `display_order`, with tagged product data
- WHEN a reel is viewed, the system SHALL increment `view_count` via `POST /api/reels/:id/view` (no auth required)
- Reel video and thumbnail SHALL be served via ImageKit CDN URLs

**Frontend (Crosscoin):**
- A new `/Reels` page (and embeddable component for homepage) SHALL display a vertical scrolling video feed
- Each reel SHALL autoplay when scrolled into view (muted by default, tap to unmute)
- Tagged products SHALL appear as a bottom sheet or side panel showing product cards with "Add to Cart"
- The feed SHALL support swipe-up/scroll to next reel on mobile
- Reel thumbnails SHALL be shown before video loads for fast perceived performance



---

### 22. Instagram Gallery Feed

**User Story:** As a brand admin, I should be able to display my Instagram posts as a shoppable gallery on the website, so customers can see real lifestyle content and shop directly from it.

**Background:**
Instagram's Basic Display API was deprecated in December 2024. The current approach uses the **Instagram Graph API** via a Meta App. The backend fetches and caches posts — the frontend never calls Instagram directly (avoids CORS, ad blockers, and rate limits).

**What's required to set up:**
1. A Facebook Business account with an Instagram Professional account linked to a Facebook Page
2. A Meta Developer App with `instagram_basic` and `pages_read_engagement` permissions
3. A long-lived User Access Token (60-day expiry) — must be refreshed before expiry
4. The Instagram Business Account ID

**Acceptance Criteria:**

**Backend:**
- The system SHALL add a new `Backend/services/instagramService.js` that fetches posts from `https://graph.facebook.com/v18.0/{instagram_account_id}/media`
- The service SHALL fetch: `id`, `media_type`, `media_url`, `thumbnail_url`, `permalink`, `caption`, `timestamp` for each post
- The system SHALL cache the Instagram feed in Redis with a 1-hour TTL, keyed by `brand_id`
- The system SHALL expose `GET /api/instagram/feed` (public, brand-scoped) returning the cached feed
- The system SHALL expose `POST /api/instagram/refresh` (admin only) to manually force a cache refresh
- A cron job SHALL automatically refresh the Instagram feed cache every 6 hours
- The system SHALL store `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` in env vars (per brand via `brand_settings`)
- WHEN the access token is within 7 days of expiry, the system SHALL automatically refresh it using the token refresh endpoint and log a warning
- IF the Instagram API call fails, the system SHALL return the last cached data rather than an error
- The system SHALL support optional product tagging — admin can link an Instagram post ID to a product via `POST /api/instagram/tag` storing `{instagram_post_id, product_id}` in a new `instagram_post_products` table

**Frontend (Crosscoin):**
- A new `InstagramGallery` component SHALL display the latest 9–12 posts in a responsive grid (3 columns desktop, 2 mobile)
- Each post SHALL show the image/video thumbnail with a hover overlay showing the caption excerpt and an Instagram icon link
- IF a post has tagged products, a shopping bag icon SHALL appear — clicking it shows a product card popup with add-to-cart
- The component SHALL be embeddable on the homepage and a dedicated `/Instagram` page
- Video posts (`media_type === VIDEO`) SHALL show the `thumbnail_url` with a play icon overlay

**Correctness Property:**
- The frontend SHALL never call the Instagram API directly — all data comes from `/api/instagram/feed`
- A stale cache SHALL be served if the Instagram API is down, rather than showing an error to users

---

### 23. Data Encryption for PII and Secrets

**User Story:** As a system operator, sensitive customer data and API secrets stored in the database should be encrypted at rest so a database breach does not expose raw personal information.

**Background:**
Currently the following are stored as plain text in the database:
- `shipping_addresses.phone` — customer phone numbers
- `guest_users.phone` — guest phone numbers  
- `brand_settings` values — may contain API keys, Razorpay secrets, WhatsApp tokens

Passwords are already hashed (bcryptjs). Payment card data is never stored (Razorpay handles it). HTTPS handles encryption in transit.

**Encryption approach:** AES-256-GCM symmetric encryption using a `DATA_ENCRYPTION_KEY` env var (32-byte hex key). A new `Backend/utils/encryption.js` utility will provide `encrypt(text)` and `decrypt(text)` functions. Encrypted values are stored as `iv:authTag:ciphertext` strings.

**Acceptance Criteria:**
- The system SHALL add `Backend/utils/encryption.js` with `encrypt(plaintext)` and `decrypt(ciphertext)` using AES-256-GCM
- The encryption key SHALL be read from `process.env.DATA_ENCRYPTION_KEY` (32-byte hex, 64 chars)
- WHEN a shipping address is created or updated, `phone` SHALL be encrypted before storing
- WHEN a shipping address is read, `phone` SHALL be decrypted before returning in the API response
- WHEN a guest user is created, `phone` SHALL be encrypted before storing
- WHEN a guest user is read, `phone` SHALL be decrypted before returning
- WHEN a `brand_setting` value is marked as `is_secret: true`, it SHALL be encrypted before storing and decrypted on read
- The system SHALL add a migration script `Backend/scripts/encryptExistingData.js` that encrypts all existing plain-text phone numbers and secret brand settings in-place
- The migration script SHALL be idempotent — it SHALL detect already-encrypted values (by checking for the `iv:authTag:ciphertext` format) and skip them
- IF decryption fails for a value (wrong key, corrupted data), the system SHALL log an error and return `null` for that field rather than crashing

**Correctness Properties:**
- `decrypt(encrypt("9876543210"))` SHALL equal `"9876543210"`
- Two calls to `encrypt("9876543210")` SHALL produce different ciphertext (due to random IV) but both SHALL decrypt correctly
- A database dump SHALL NOT contain readable phone numbers for any shipping address created after this feature is deployed

**What does NOT need encryption:**
- Email addresses — needed for search/lookup, hashing would break queries
- Names, addresses, city, state, pincode — low sensitivity, needed for FShip/logistics
- Product data, order amounts, status fields — not PII



---

### 24. Server Bandwidth & Resource Optimization

**Background:**
Current issues identified that waste server bandwidth and CPU:

1. **Product list caching is disabled** — `productService.js` has caching commented out with `// Cache disabled - reviews must be fresh`. Every product list request hits the DB.
2. **No HTTP response caching headers** — browsers and CDNs re-fetch static-ish data (categories, sliders, products) on every page load
3. **No request compression on responses** — `compression` middleware is installed but large JSON responses (product lists, orders) are not verified to be compressed
4. **`console.log` spam in production** — `orderController.js` has dozens of `console.log` calls that run on every order, wasting CPU and filling disk
5. **No pagination default limits** — some endpoints have no `limit` cap, a single request could return thousands of rows
6. **Static files served by Node** — `/uploads` is served by Express directly instead of being offloaded (all images should be on ImageKit anyway after migration)
7. **Brand domains cache refreshes every 5 minutes** — `corsConfig.js` hits the DB every 5 minutes even when brands haven't changed
8. **`productService.getProductsList` loads Reviews eagerly** — every product list query joins the reviews table even when reviews aren't needed
9. **No `ETag` / `Last-Modified` headers** — clients always get full responses even when data hasn't changed
10. **Dashboard aggregation runs on every request** — even with Redis cache, the cache key includes `userId` so each admin user gets their own cache entry for identical data

**Acceptance Criteria:**

**Re-enable and fix product list caching:**
- The system SHALL re-enable `cacheManager.set` in `ProductService.getProductsList` with a 10-minute TTL
- Cache keys SHALL include `brand_id` so different brands get separate caches
- Cache SHALL be invalidated when any product is created, updated, or deleted

**HTTP Cache-Control headers:**
- Public endpoints that return rarely-changing data SHALL include `Cache-Control: public, max-age=300, stale-while-revalidate=60` headers:
  - `GET /api/categories/public`
  - `GET /api/sliders/public`
  - `GET /api/attributes/mega-menu`
  - `GET /api/instagram/feed`
- Dynamic user-specific endpoints (cart, orders, profile) SHALL include `Cache-Control: no-store`

**ETag support:**
- The system SHALL add ETag middleware for public product and category endpoints
- WHEN a client sends `If-None-Match` with a matching ETag, the server SHALL respond with HTTP 304 (no body) instead of the full response

**Remove console.log spam in production:**
- ALL `console.log` calls in `orderController.js` SHALL be replaced with `logger.debug()` calls
- `logger.debug()` SHALL only output when `LOG_LEVEL=debug` — silent in production by default
- This applies to all controllers that have excessive logging

**Enforce pagination limits:**
- ALL `findAll` and `findAndCountAll` queries that accept a `limit` param SHALL cap at a maximum of 100 records
- Default `limit` SHALL be 20 if not specified
- Endpoints that currently have no limit (e.g. `getAllUsers`, `getAllPayments` with `limit: 100` hardcoded) SHALL use the paginated pattern

**Remove static file serving from Node:**
- WHEN all images are migrated to ImageKit, the `app.use('/uploads', express.static(...))` middleware SHALL be removed or disabled
- Until migration is complete, it SHALL remain but with a deprecation log warning

**Fix brand domains CORS cache:**
- The brand domains cache in `corsConfig.js` SHALL be invalidated via an event when a brand is created, updated, or deleted — instead of relying solely on the 5-minute TTL
- This prevents stale CORS rejections after brand domain changes

**Dashboard cache key fix:**
- The dashboard cache key SHALL be `dashboard:brand:${brandId || 'all'}:stats` — removing `userId` from the key so all admins share the same cached dashboard data for the same brand

**Lazy-load reviews from product list:**
- `ProductService.getProductsList` SHALL NOT include the `Review` association by default
- Reviews are already pre-aggregated on `products.avg_rating` and `products.review_count` — the join is redundant and adds significant query cost

**Correctness Properties:**
- A second identical request to `GET /api/categories/public` within 5 minutes SHALL return HTTP 304 if the client sends the correct ETag
- Product list queries SHALL NOT join the `reviews` table
- In production, `orderController.createOrder` SHALL produce zero `console.log` output


---

### 25. Fix Coupon Usage Tracking

**Background:**
Coupon usage is currently broken end-to-end:
- `createOrder` stores `coupon_id` on the order but **never** creates a `CouponUsage` record and **never** increments `coupons.usageCount`
- The frontend never calls `POST /api/coupons/apply` after order creation
- Result: every coupon can be used unlimited times by any user, `usageLimit` and `perUserLimit` are never enforced at order time
- `coupon_usages` table has 0 rows despite orders having `coupon_id` set

**Acceptance Criteria:**
- WHEN an order is created with a `coupon_id`, the system SHALL atomically (within the same transaction):
  1. Create a `CouponUsage` record with `couponId`, `userId` (or `null` for guest), `orderId`, `discountAmount`
  2. Increment `coupons.usageCount` by 1
- This SHALL apply to both `createOrder` (authenticated) and `createGuestOrder` (guest)
- For guest orders, `CouponUsage.userId` SHALL be `null` and a `guestUserId` field SHALL be added to `coupon_usages`
- WHEN an order with a coupon is cancelled, the system SHALL decrement `coupons.usageCount` by 1 and delete the associated `CouponUsage` record
- The `couponController.validateCoupon` per-user limit check SHALL also count guest usages by email (via `guest_user_id` join) to prevent guests from reusing coupons
- The `POST /api/coupons/apply` endpoint SHALL be deprecated — usage tracking happens automatically at order creation, not as a separate step

**Schema change:**
- Add `guest_user_id INT NULL FK → guest_users.id` to `coupon_usages` table

**Correctness Properties:**
- After N orders using coupon `SAVE10`, `coupons.usageCount` for `SAVE10` SHALL equal N and `coupon_usages` SHALL have N rows
- A coupon with `usageLimit: 5` SHALL reject the 6th order attempt with HTTP 400
- A coupon with `perUserLimit: 1` SHALL reject a second order from the same user with HTTP 400

---

### 26. Reward / Loyalty Points Program

**User Story:** As a customer, I should earn points for every purchase and be able to redeem them for discounts on future orders, encouraging repeat purchases.

**Background:**
A simple points-based loyalty program:
- Earn points on every delivered order (e.g. 1 point per ₹10 spent)
- Redeem points at checkout (e.g. 100 points = ₹10 discount)
- Points expire after 12 months of inactivity
- Admin can configure earn rate, redeem rate, and expiry via `brand_settings`

**Acceptance Criteria:**

**Points earning:**
- WHEN an order status changes to `delivered`, the system SHALL credit loyalty points to the customer's account
- Points earned = `floor(order.final_amount / earn_rate)` where `earn_rate` is configurable per brand (default: 10, meaning 1 point per ₹10)
- Guest users SHALL NOT earn points (points require an account)
- Points SHALL be recorded in a new `loyalty_transactions` table with type `earned`

**Points redemption:**
- WHEN a user applies points at checkout, the system SHALL validate they have sufficient balance
- Maximum redeemable points per order = `floor(order.total_amount * max_redeem_percent / 100)` where `max_redeem_percent` is configurable (default: 20%, meaning max 20% of order value can be paid with points)
- Points redeemed SHALL be recorded in `loyalty_transactions` with type `redeemed`
- Points redemption SHALL be treated like a coupon discount — reduces `final_amount`
- WHEN an order with redeemed points is cancelled, the system SHALL refund the redeemed points back to the user

**Points balance:**
- `GET /api/loyalty/balance` (authenticated) — returns current points balance and pending points
- `GET /api/loyalty/history` (authenticated) — returns paginated transaction history
- `POST /api/loyalty/redeem` — validates and reserves points for an order (returns a redemption token)

**Admin:**
- Admin can manually credit/debit points via `POST /api/admin/loyalty/adjust`
- Admin can view all loyalty transactions in the dashboard
- Brand settings: `LOYALTY_EARN_RATE`, `LOYALTY_REDEEM_RATE`, `LOYALTY_MAX_REDEEM_PERCENT`, `LOYALTY_POINTS_EXPIRY_DAYS`

**Points expiry:**
- A daily cron job SHALL expire points that have not been used for `LOYALTY_POINTS_EXPIRY_DAYS` days (default: 365)
- Expired points SHALL be recorded in `loyalty_transactions` with type `expired`

**New table: `loyalty_transactions`**

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| user_id | INT FK → users.id | |
| order_id | INT FK → orders.id NULL | |
| type | ENUM('earned','redeemed','expired','adjusted','refunded') | |
| points | INT NOT NULL | positive = credit, negative = debit |
| balance_after | INT NOT NULL | running balance snapshot |
| description | VARCHAR(255) | human-readable reason |
| expires_at | DATETIME NULL | for earned points |
| brand_id | INT FK → brands.id | |
| created_at | DATETIME | |

**New column on `users`:**
- `loyalty_points` INT DEFAULT 0 — current redeemable balance (denormalized for fast reads)

**Correctness Properties:**
- After a delivered order of ₹500 with earn_rate=10, `users.loyalty_points` SHALL increase by 50 and a `loyalty_transactions` record with `type='earned', points=50` SHALL exist
- After redeeming 100 points (redeem_rate=1, so ₹10 discount), `users.loyalty_points` SHALL decrease by 100 and `order.discount_amount` SHALL increase by ₹10
- Cancelling an order where 100 points were redeemed SHALL restore 100 points to `users.loyalty_points`
- `users.loyalty_points` SHALL always equal the sum of all non-expired `loyalty_transactions.points` for that user


---

### 27. Fix FShip Duplicate Order Creation

**Background:**
FShip orders are being created multiple times for the same CrossCoin order due to a race condition between two independent code paths:

1. **Path A** — `createOrder`/`createGuestOrder` calls `fshipService.createOrUpdateForwardOrder()` inside a `setImmediate` callback immediately after order creation
2. **Path B** — `syncOrdersWithFShip` cron job (every 2 hours) calls `createOrderInFShip` for any order where `fship_last_synced_at IS NULL` or older than 30 minutes

**Race condition:** If Path A's `setImmediate` is slow, fails silently, or the FShip API is temporarily unavailable, `fship_last_synced_at` remains `NULL`. The cron job then picks up the same order and creates a second FShip order. The `createOrUpdateForwardOrder` duplicate check calls `/api/getorderdetails` on FShip — but if the first order was just created milliseconds ago, FShip may not return it yet, causing a second creation.

**Additional issues found:**
- `createOrderInFShip` has a `order.fship_order_id && order.fship_waybill` check but this only works if Path A already committed the update — there's no DB-level lock preventing concurrent execution
- The cron processes up to 50 orders every 2 hours with no per-order mutex/lock
- `fship_last_synced_at` is only set AFTER successful FShip creation — a failed attempt leaves it NULL, triggering retry on next cron run (correct behavior) but also triggering Path A again on the next server restart

**Acceptance Criteria:**
- The system SHALL add a `fship_sync_status` ENUM column to `orders` table: `pending`, `syncing`, `synced`, `failed`
- Default value SHALL be `pending` for new orders
- WHEN `createOrder`/`createGuestOrder` triggers FShip creation via `setImmediate`, it SHALL first atomically set `fship_sync_status = 'syncing'` on the order
- The cron job `syncOrdersWithFShip` SHALL only process orders where `fship_sync_status IN ('pending', 'failed')` — it SHALL skip orders with `fship_sync_status = 'syncing'` or `'synced'`
- WHEN FShip order creation succeeds, the system SHALL set `fship_sync_status = 'synced'`
- WHEN FShip order creation fails after 3 retries, the system SHALL set `fship_sync_status = 'failed'` so the cron can retry
- The `setImmediate` in `createOrder` SHALL be replaced with a proper async function that updates `fship_sync_status` on both success and failure
- A `fship_sync_attempts` INT column SHALL be added to `orders` to track retry count — cron SHALL skip orders with `fship_sync_attempts >= 5` (max retries) and alert admin
- The `createOrUpdateForwardOrder` duplicate check SHALL be the last line of defense, not the primary one — the `fship_sync_status` flag is the primary guard

**Schema changes to `orders` table:**
```sql
ALTER TABLE orders 
  ADD COLUMN fship_sync_status ENUM('pending','syncing','synced','failed') DEFAULT 'pending',
  ADD COLUMN fship_sync_attempts INT DEFAULT 0,
  ADD INDEX idx_fship_sync_status (fship_sync_status);
```

**Correctness Properties:**
- For any order, `SELECT COUNT(*) FROM fship_label_downloads WHERE order_id = X` (as a proxy for FShip order count) SHALL be at most 1 after order creation
- An order with `fship_sync_status = 'syncing'` SHALL NOT be processed by the cron job
- An order with `fship_sync_status = 'synced'` SHALL NOT trigger a new FShip order creation under any circumstances
- An order with `fship_sync_attempts >= 5` SHALL NOT be retried automatically — it SHALL appear in an admin alert/dashboard


---

### 28. Guest-to-Member Conversion for Loyalty Points

**User Story:** As a guest customer who placed an order, I should be able to create an account and have my past order's loyalty points credited to my new account, so I'm not penalized for checking out as a guest.

**Background:**
Guests cannot earn points at order time (Req 26). However, if a guest later registers with the same email they used for their guest order, the system should retroactively credit points for their delivered guest orders. This incentivizes account creation and rewards loyal customers.

**Acceptance Criteria:**
- WHEN a new user registers with an email that matches one or more `guest_users.email` records, the system SHALL:
  1. Link the `guest_users` record to the new `users` record by setting `guest_users.converted_at = NOW()` and `guest_users.status = 'converted'`
  2. Find all delivered orders placed by that guest user
  3. Credit loyalty points for each delivered guest order using the standard earn rate
  4. Create `loyalty_transactions` records with `type = 'earned'`, `description = 'Retroactive points for guest order #{order_number}'`
- Points SHALL only be credited for orders with `status = 'delivered'` — not pending or cancelled
- Points SHALL only be credited once per guest order — the system SHALL check if a `loyalty_transactions` record already exists for that `order_id` before crediting
- WHEN a guest registers, the system SHALL return the total points credited in the registration response so the frontend can show a welcome message like "You earned 150 points from your past orders!"
- Guest orders placed AFTER account creation (same email) SHALL earn points normally at delivery time since the user is now registered

**Correctness Properties:**
- A guest who placed 3 delivered orders of ₹300, ₹500, ₹200 (earn_rate=10) and then registers SHALL receive 30 + 50 + 20 = 100 points credited
- Running the conversion twice for the same guest SHALL NOT double-credit points (idempotent)
- A guest order that is not yet delivered at registration time SHALL NOT receive points at registration — points are credited when the order is later marked delivered
