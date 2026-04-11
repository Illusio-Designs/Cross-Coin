# CrossCoin Backend — Technical Documentation

## Overview

Node.js + Express REST API for the CrossCoin e-commerce platform. Handles products, orders, payments, users, shipping, loyalty, WhatsApp, and admin dashboard.

- **Runtime:** Node.js (Express 5)
- **Database:** MySQL via Sequelize ORM
- **Cache:** Redis (ioredis)
- **Queue:** Bull (Redis-backed job queue)
- **Auth:** JWT + Passport (Google OAuth)
- **Payments:** Razorpay
- **Shipping:** FShip API + iThink Logistics (provider-agnostic via `shippingProviderFactory`)
- **Media:** ImageKit CDN
- **Entry point:** `index.js` → `worker.js` (spawned as child process)

---

## Architecture

```
index.js          — Express app, middleware, server startup
worker.js         — Background process: cron jobs, badge queue
routes/           — Route definitions (mounted under /api and /api/v1)
controller/       — Thin handlers, delegate to services
model/            — Sequelize models + associations
services/         — Business logic, event emitters, external integrations
middleware/       — Auth, brand, upload, etag, validation
config/           — DB, CORS, logging, passport, cron
integration/      — Facebook Pixel, Google Analytics, Facebook Catalog
queue/            — Bull queue setup + processors + dead letter queue
utils/            — Helpers: encryption, validation, batch ops, circuit breaker
scripts/          — DB setup, migrations, data scripts
```

### Startup Sequence

1. Connect Redis (non-fatal if unavailable)
2. Authenticate MySQL connection
3. Run `setupDatabase()` only if schema version changed (includes migration 006: `awaiting_confirmation` status)
4. Initialize SEO data (first boot only)
5. Spawn `worker.js` as child process (auto-restarts on crash)
6. Start HTTP server on `PORT` (default 5000)

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `NODE_ENV` | `development` / `production` |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_DATABASE` | MySQL database name |
| `DB_DIALECT` | `mysql` |
| `JWT_SECRET` | JWT signing secret |
| `SESSION_SECRET` | Express session secret (required in production) |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `REDIS_PASSWORD` | Redis password |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `FSHIP_API_KEY` | FShip API key |
| `FB_PIXEL_ID` | Facebook Pixel ID |
| `FB_ACCESS_TOKEN` | Facebook Conversions API token |
| `GA_MEASUREMENT_ID` | Google Analytics 4 ID |
| `GA_API_SECRET` | GA4 Measurement Protocol secret |
| `UPLOAD_PATH` | Local upload directory (default `uploads`) |

---

## User & Auth System

- **No guest users.** Every order creates a `consumer` account automatically.
- OTP-based phone login (MSG91). Server-side OTP verification via Redis before JWT issuance.
- On login/register, any historical guest orders are linked by email match.
- Soft delete: `DELETE /api/users/delete` anonymises PII, sets `deleted_at`. Soft-deleted users cannot authenticate.
- Roles: `admin`, `product_manager`, `order_manager`, `whatsapp_manager`, `consumer`.
- JWT: 7-day access + 7-day refresh tokens (hashed in DB). Refresh token format: `userId:tokenPart` for O(1) lookup.
- Token revocation: Redis-based blacklist. On logout/soft-delete, JWT is blacklisted for its remaining lifetime.
- Profile updates: users can only update their own profile. `role` field is stripped from update requests.
- `forgotPassword` does NOT return the reset token in the response — token is only sent via email link.
- `getCurrentUser` excludes `password`, `resetToken`, `refreshToken` from response.

---

## Order System

### Status Flow (State Machine)

```
awaiting_confirmation → confirmed → processing → booked
  → pickup initiated → manifested → in transit
  → shipped → out for delivery → delivered
  → [return_initiated → returned_rto]
  → [rto → rto delivered]
  Any pre-dispatch state → cancelled
```

Transitions are validated by `orderService.assertTransition()`. Invalid transitions return 400.

### Default Status

All new orders start as `awaiting_confirmation`. Admin must confirm before FShip sync.

### Order Creation — Authenticated (`POST /api/orders`)

1. Validates shipping address ownership
2. **Comprehensive address validation** via `shippingValidationService` (name, address length, pincode format, phone format, junk detection, Indian state check)
3. Pincode serviceability check against active shipping provider
4. Batch-fetches products + variations (avoids N+1)
5. Server-side coupon discount verification
6. COD max value cap + RTO risk scoring
7. Batch-inserts order items, decrements stock atomically
8. Sets status to `awaiting_confirmation`, payment to `pending`
9. Emits `order.created` event (SSE notification to admin)
10. Shipping sync does NOT happen — waits for admin confirmation

### Order Creation — Unauthenticated (`POST /api/orders/checkout`)

1. Validates `guest_info` (phone, email, name) via schema validator
2. Finds existing `consumer` by phone → email → creates new one if not found
3. Creates `ShippingAddress` under that user
4. **Validates address** via `shippingValidationService` — destroys address and rejects if invalid
5. Delegates to `createOrder` internally
6. Returns `X-Auth-Token` header — frontend stores it, user is auto-logged in
7. **No `GuestUser` record is ever created.** All orders belong to a `consumer` user.

### Admin Confirmation (`PUT /api/orders/:id/confirm`)

1. Validates state transition (`awaiting_confirmation` → `confirmed`)
2. Creates status history entry
3. Emits `order.confirmed` event → WhatsApp confirmation sent
4. Triggers shipping sync via `orderService.syncOrderToFShip()` → routes to active provider (FShip or iThink) via `shippingProviderFactory`

### Cancellation

| Who | Allowed statuses |
|---|---|
| User | `awaiting_confirmation`, `pending`, `confirmed`, `processing` |
| Admin | Above + `booked` |
| Blocked | `shipped`, `in transit`, `out for delivery`, `delivered` |

- Reason is **required** (min 5 chars, validated by schema)
- Restores stock, decrements coupon usage, refunds loyalty points
- Cancels FShip order if already synced
- Emits `order.cancelled` event → WhatsApp cancellation sent

### RTO Risk Scoring

| Score | Level | Meaning |
|---|---|---|
| 0-10 | 🟢 LOW | Normal |
| 11-20 | 🟡 MEDIUM | Caution |
| 21-30 | 🔴 HIGH | Block COD |

Scoring runs for ALL payment types (COD and prepaid), not just COD.

Factors:
- Repeat RTO customer: +20 (1+ RTO orders in last 6 months, queried by `user_id`)
- Short/low-quality address: +10 (address < 30 characters)

COD-specific: orders blocked entirely if 2+ prior RTOs. COD max value cap enforced per brand.

---

## Payment System (Razorpay)

### Prepaid Flow (Frontend → Backend)

1. Frontend creates Razorpay order via `POST /api/payments/razorpay/create`
2. Razorpay payment modal opens (managed by Razorpay SDK, 15-min window)
3. User completes payment → Razorpay handler fires
4. Handler creates backend order with **3 retries** (2s, 4s, 6s exponential backoff)
5. Then verifies payment via `POST /api/payments/razorpay/verify`
6. If all retries fail: cart cleared, user shown "Payment received, order being processed"
7. Razorpay webhook (`POST /api/payments/razorpay/webhook`) reconciles any missed orders

### Payment Verification (3 parallel paths, race-condition protected)

All three paths use `SELECT ... FOR UPDATE` row locking to prevent double-processing:

1. **Client verify** (`POST /api/payments/razorpay/verify`) — frontend calls after Razorpay success
2. **Server callback** (`POST /api/payments/razorpay/callback`) — Razorpay redirects after payment
3. **Webhook** (`POST /api/payments/razorpay/webhook`) — server-to-server event handler

Webhook includes a fallback: if no payment record is found by `razorpay_order_id`, it matches the order by customer email/phone + amount + time window and creates the missing payment link.

### Stale Prepaid Order Cleanup

Cron job runs every 30 minutes. Cancels prepaid orders where `payment_status` is still `pending` or `failed` after 30 minutes. Restores stock and coupon usage atomically.

### COD Flow

1. OTP verification required before placing COD order
2. Order created directly → status `awaiting_confirmation`
3. COD max value cap enforced server-side (configurable per brand)
4. RTO risk check: COD blocked for repeat RTO customers (2+ RTOs in 6 months)

---

## Event-Driven Architecture

`orderEvents.js` — decoupled order lifecycle events via Node.js EventEmitter.

| Event | Trigger | Actions |
|---|---|---|
| `order.created` | Order placed | SSE notification to admin dashboard |
| `order.confirmed` | Admin confirms | WhatsApp confirmation, FShip sync |
| `order.shipped` | Status → shipped | WhatsApp tracking notification |
| `order.delivered` | Status → delivered | Review request scheduled (via cron) |
| `order.cancelled` | Order cancelled | WhatsApp cancellation message |
| `order.analytics` | Any event | Facebook Pixel + GA4 server-side events |

Benefits: controllers stay thin, integrations are decoupled, easy to add new listeners.

---

## Circuit Breaker

`utils/circuitBreaker.js` — protects against cascading failures from external services.

| Service | Threshold | Timeout | Reset |
|---|---|---|---|
| FShip | 3 failures | 60s open | Auto half-open |
| Razorpay | 3 failures | 30s open | Auto half-open |
| WhatsApp | 5 failures | 60s open | Auto half-open |

States: `CLOSED` (normal) → `OPEN` (failing, rejects calls) → `HALF_OPEN` (testing recovery).

---

## Shipping Providers

Multi-provider shipping via `shippingProviderFactory.js`. Active provider is set per brand via `SHIPPING_PROVIDER` brand setting.

### Supported Providers

| Provider | Service File | Auth Method | Status |
|---|---|---|---|
| FShip | `fshipService.js` | `signature` header | Active (default) |
| iThink Logistics | `iThinkService.js` | `access_token` + `secret_key` in body | Ready |

### Provider Factory

`shippingProviderFactory.getShippingProvider(brandId)` reads `SHIPPING_PROVIDER` from brand settings and returns the correct service instance. Both services expose the same interface:

- `createForwardOrder(orderData)` / `createOrUpdateForwardOrder(orderData)`
- `getTrackingHistory(waybill)` / `getShipmentStatus(waybill)`
- `cancelOrder(waybill, reason)`
- `calculateRates(rateData)`
- `checkServiceability(sourcePincode, destinationPincode)`
- `getShippingLabel(waybills)`
- `registerPickup(waybills)`
- `mapFShipStatusToCrossCoin(status)`
- `testConnection()`

### iThink — Manual Courier Selection

Admin picks a courier before syncing:

1. `GET /api/orders/:id/shipping/couriers` — returns available couriers with rates/ETAs (validates order first)
2. Admin selects courier from dashboard
3. `PUT /api/orders/:id/fship/sync` with `{ logistics: "delhivery", s_type: "surface" }` — syncs with selected courier

Allowed `logistics` values: `delhivery`, `bluedart`, `xpressbees`, `ecom`, `ekart`, `fedex`, or empty (auto-select).

### Brand Settings (Shipping)

| Key | Category | Description |
|---|---|---|
| `SHIPPING_PROVIDER` | shipping | Active provider: `fship` or `ithink` |
| `FSHIP_API_KEY` | shipping | FShip API key |
| `FSHIP_ENVIRONMENT` | shipping | `staging` or `production` |
| `FSHIP_DEFAULT_WAREHOUSE_ID` | shipping | FShip warehouse ID |
| `FSHIP_WAREHOUSE_PINCODE` | shipping | Warehouse pincode for serviceability |
| `ITHINK_ACCESS_TOKEN` | shipping | iThink API access token (encrypted) |
| `ITHINK_SECRET_KEY` | shipping | iThink API secret key (encrypted) |
| `ITHINK_ENVIRONMENT` | shipping | `staging` or `production` |
| `ITHINK_PICKUP_ADDRESS_ID` | shipping | iThink warehouse ID |
| `ITHINK_RETURN_ADDRESS_ID` | shipping | Return address ID |
| `ITHINK_DEFAULT_LOGISTICS` | shipping | Default courier (empty = admin picks per order) |
| `ITHINK_WAREHOUSE_PINCODE` | shipping | Warehouse pincode for serviceability |

Seed script: `node scripts/seedShippingProviderSettings.js`

### Detailed Integration Doc

See `docs/ITHINK-LOGISTICS-INTEGRATION.md` for full API reference, payload mapping, status codes, and migration checklist.

---

## Schema Validation

`utils/validate.js` — lightweight request body validation (no external deps).

Pre-built schemas wired as middleware:
- `schemas.checkout` — phone, email, firstName, items, payment_type
- `schemas.cancelOrder` — reason (min 5 chars)
- `schemas.createAddress` — address (min 15 chars), city, state, pincode, phone
- `schemas.register` — username, email, password (min 8 chars)

Usage: `router.post('/checkout', validateBody(schemas.checkout), handler)`

### Shipping Address Validation (`shippingValidationService`)

Runs at address creation, address update, order creation, guest checkout, and prepaid checkout. Blocks the request if any errors are found.

| Check | Type | Rule |
|---|---|---|
| Customer name | Error | Required, min 2 chars, not only numbers |
| Street address | Error | Required, min 10 chars, no junk (test, asdf, na, xxx) |
| Short address | Warning | < 20 chars — suggest adding landmark |
| City | Error | Required, min 2 chars, not only numbers |
| State | Error/Warning | Required, validated against Indian state list |
| Pincode | Error | Must be 6-digit format, no placeholders (000000, 111111) |
| Phone | Error | Valid 10-digit Indian mobile (starts 6-9), no repeated digits, no known placeholders |
| Courier name | Error | Must be valid iThink logistics value (if provided) |
| Service type | Error | Must match courier (e.g. air/surface for BlueDart) |

Error response format:
```json
{
  "message": "Address has issues that will cause delivery failure",
  "errors": ["Pincode \"12345\" is not a valid 6-digit Indian pincode"],
  "warnings": ["State \"Maharastra\" may not be valid — verify spelling"]
}
```

---

## Caching Strategy

`services/cacheManager.js` — Redis-backed with namespace isolation and defined TTLs.

All cache keys are prefixed with `crosscoin:cache:` to prevent collisions with sessions, queues, and other Redis data. `clear()` uses pattern-based deletion (SCAN + DEL) instead of `flushdb()`.

Max value size: 1MB. Oversized payloads are logged and skipped.

| Key pattern | TTL | Invalidated on |
|---|---|---|
| `products:public:*` | 5 min | Product create/update/delete |
| `categories:public` | 10 min | Category change |
| `sliders:public` | 10 min | Slider change |
| `dashboard:*` | 1 min | Order create/update |
| `seo:*` | 30 min | SEO update |
| `cart:user:{id}` | 5 min | Cart add/remove/update |

---

## Models

### User (`users`)

| Field | Type | Notes |
|---|---|---|
| id | INT PK | Auto increment |
| username | STRING | Unique |
| email | STRING | Unique |
| password | STRING | Bcrypt hashed, nullable (Google login) |
| role | ENUM | `admin`, `product_manager`, `order_manager`, `whatsapp_manager`, `consumer` |
| phone | STRING(20) | Unique, nullable |
| profileImage | STRING | ImageKit path |
| loyalty_points | INT | Default 0 |
| deleted_at | DATE | Soft delete timestamp |

### Order (`orders`, underscored)

| Field | Type | Notes |
|---|---|---|
| id | INT PK | |
| user_id | INT FK | |
| order_number | STRING | Unique `ORD-YYYYMMDD-XXXX` |
| total_amount | DECIMAL(10,2) | Before discount |
| discount_amount | DECIMAL(10,2) | |
| shipping_fee | DECIMAL(10,2) | |
| final_amount | DECIMAL(10,2) | |
| payment_type | ENUM | `cod`, `razorpay`, `upi`, etc. |
| payment_status | ENUM | `pending`, `paid`, `failed`, `refunded`, `cancelled`, `refund_pending` |
| status | ENUM | See state machine above |
| shipping_address_id | INT FK | |
| coupon_id | INT FK | Nullable |
| brand_id | INT FK | Default 1 |
| fship_order_id | STRING | FShip reference |
| fship_waybill | STRING | Tracking waybill |
| fship_sync_status | ENUM | `pending`, `syncing`, `synced`, `failed` |
| rto_risk_score | INT | 0-30 |
| guest_user_id | INT FK | Legacy only, not written to anymore |

### Other Models

| Model | Table | Purpose |
|---|---|---|
| Product | `products` | Products with slug, badge, category |
| ProductVariation | `product_variations` | SKU, price, stock, attributes (JSON) |
| ProductImage | `product_images` | Product/variation images |
| ProductSEO | `product_seo` | SEO + structured data |
| Category | `categories` | Self-referential tree |
| Brand | `brands` | Multi-brand support |
| BrandSetting | `brand_settings` | Per-brand config (encrypted) |
| Payment | `payments` | Razorpay transactions |
| ShippingAddress | `shipping_addresses` | Encrypted phone + address |
| Cart / CartItem | `carts`, `cart_items` | User cart |
| Coupon / CouponUsage | `coupons`, `coupon_usages` | Percentage, fixed, tiered, quantity-based |
| LoyaltyTransaction | `loyalty_transactions` | Earned, redeemed, expired, refunded |
| Review / ReviewImage | `reviews`, `review_images` | Product reviews |
| Wishlist | `wishlists` | User wishlists |
| OrderItem | `order_items` | Order line items |
| OrderStatusHistory | `order_status_histories` | Audit trail |
| Slider / SliderBrand | `sliders`, `slider_brands` | Hero banners |
| Lookbook / LookbookImage / LookbookHotspot | lookbook tables | Shoppable lookbooks |
| Reel / ReelProduct | `reels`, `reel_products` | Video reels |
| InstagramPostProduct | `instagram_post_products` | Instagram tagging |
| WhatsappConversation / WhatsappMessage | whatsapp tables | WhatsApp CRM |
| BlogPost / BlogCategory / BlogTag / BlogSEO | blog tables | Blog system |
| UTMTracking | `utm_tracking` | UTM capture |
| LeadCapture | `lead_captures` | Phone popup leads |
| FShipLabelDownload | `fship_label_downloads` | Label audit |
| OrderShipment | `order_shipments` | **NEW** — Provider-agnostic shipment tracking (provider, waybill, AWB, courier, label, sync state). Supports `fship` and `ithink`. |
| GuestUser | `guest_users` | **Legacy only** — not written to anymore |

---

## Controllers & Routes

> **Base URL:** `/api/` or `/api/v1/` (both supported)

### Route Naming Convention

All routes follow: `/api/v1/{resource}`, `/api/v1/{resource}/{id}`, `/api/v1/{resource}/{id}/{action}`

No `/public`, `/guest`, or `/admin` prefixes in URLs — handled by middleware.

### Auth — `/api/v1/auth`

| Method | Route | Auth | Function |
|---|---|---|---|
| POST | `/otp/send` | Public | Send OTP to phone |
| POST | `/otp/verify` | Public | Verify OTP |

### Users — `/api/v1/users`

| Method | Route | Auth | Function |
|---|---|---|---|
| POST | `/register` | Public | Create consumer |
| POST | `/login` | Public | OTP phone login |
| POST | `/admin-login` | Public | Staff login |
| POST | `/logout` | Public | Invalidate token |
| GET | `/me` | Auth | Current user |
| PUT | `/profile` | Auth | Update profile |
| DELETE | `/` | Auth | Soft delete account |
| GET | `/all` | Admin | List all users |
| GET | `/guest-merge-report` | Admin | Unlinked guest data |
| POST | `/bulk-merge-guests` | Admin | Merge by email |

### Orders — `/api/v1/orders`

| Method | Route | Auth | Function |
|---|---|---|---|
| POST | `/` | Auth | Create order |
| POST | `/guest-checkout` | Public | Auto-create user + order |
| GET | `/my-orders` | Auth | User orders |
| GET | `/:id` | Auth | Single order |
| PUT | `/:id/confirm` | OrderManager | Confirm → shipping sync |
| PUT | `/:id/cancel` | Auth | User cancel |
| PUT | `/:id/admin-cancel` | OrderManager | Admin cancel |
| PUT | `/:id/status` | OrderManager | State machine update |
| POST | `/:id/return` | Auth | Initiate return |
| GET | `/:id/shipping/validate` | OrderManager | Pre-shipping validation (errors + warnings) |
| GET | `/:id/shipping/couriers` | OrderManager | Available couriers with rates (validates first) |
| PUT | `/:id/fship/sync` | OrderManager | Sync single order to shipping provider |
| GET | `/` | OrderManager | All orders |
| GET | `/stats` | OrderManager | Statistics |
| GET | `/track/awb` | Public | Track by AWB |
| GET | `/track/:order_number` | Public | Track by order number |

### Payments — `/api/v1/payments`

| Method | Route | Auth | Function |
|---|---|---|---|
| POST | `/razorpay/order` | Auth | Create Razorpay order |
| POST | `/razorpay/verify` | Public | Verify signature |
| POST | `/razorpay/webhook` | Public | Razorpay webhook |
| POST | `/guest/razorpay/order` | Public | Guest Razorpay order |
| GET | `/my-payments` | Auth | User payments |
| POST | `/refund` | OrderManager | Full/partial refund |
| GET | `/` | OrderManager | All payments |

### Products — `/api/v1/products`

| Method | Route | Auth | Function |
|---|---|---|---|
| GET | `/catalog` | Public | Product listing |
| GET | `/by-slug/:slug` | Public | Product by slug |
| GET | `/search` | Public | Search with relevance |
| GET | `/featured` | Public | Featured products |
| GET | `/new-arrivals` | Public | New arrivals |
| GET | `/best-sellers` | Public | Best sellers |
| GET | `/category/:id` | Public | By category |

### Cart — `/api/v1/cart`

| Method | Route | Auth | Function |
|---|---|---|---|
| GET | `/` | Auth | Get cart (no coupon preview discount) |
| POST | `/items` | Auth | Add item (validates product active, stock, quantity >= 1, uses transaction + row lock) |
| PUT | `/items/:productId` | Auth | Update quantity (re-validates stock, refreshes price if changed) |
| DELETE | `/items/:productId` | Auth | Remove item (exact product+variation match only, no fallback) |
| DELETE | `/` | Auth | Clear cart |

### Wishlist — `/api/v1/wishlist`

| Method | Route | Auth | Function |
|---|---|---|---|
| GET | `/` | Auth | Get wishlist |
| POST | `/:productId` | Auth | Add to wishlist |
| DELETE | `/:productId` | Auth | Remove |
| DELETE | `/` | Auth | Clear |

### Users — `/api/v1/users`

| Method | Route | Auth | Validation | Function |
|---|---|---|---|---|
| POST | `/register` | Public | `schemas.register` | Create consumer |
| POST | `/login` | Public | — | OTP phone login |
| POST | `/admin/login` | Public | — | Staff login |
| DELETE | `/delete` | Auth | — | Soft delete account |
| GET | `/admin/guest-merge-report` | Admin | — | Unlinked guest data report |
| POST | `/admin/bulk-merge-guests` | Admin | — | Merge guests by email |
| POST | `/admin/auto-create-from-guests` | Admin | — | Auto-create users for orphan guests |

### Orders — `/api/v1/orders`

| Method | Route | Auth | Validation | Function |
|---|---|---|---|---|
| POST | `/` | Auth | `shippingValidationService` | Create order (awaiting_confirmation) |
| POST | `/checkout` | Public | `schemas.checkout` + `shippingValidationService` | Auto-create user + order |
| PUT | `/:id/confirm` | OrderManager | — | Confirm → shipping provider sync |
| PUT | `/:id/cancel` | Auth | `schemas.cancelOrder` | User cancel (reason required) |
| PUT | `/:id/admin/cancel` | OrderManager | `schemas.cancelOrder` | Admin cancel |
| PUT | `/:id/status` | OrderManager | — | State machine update |
| GET | `/:id/shipping/validate` | OrderManager | — | Pre-shipping validation check |
| GET | `/:id/shipping/couriers` | OrderManager | `shippingValidationService` | Available couriers (validates first) |
| GET | `/my-orders` | Auth | — | User orders + rto_risk_level |
| GET | `/` | OrderManager | — | All orders + rto_risk_level |

### Payments — `/api/v1/payments`

| Method | Route | Auth | Function |
|---|---|---|---|
| POST | `/razorpay/create` | Auth | Create Razorpay order |
| POST | `/razorpay/verify` | Public | Verify payment signature |
| POST | `/razorpay/webhook` | Public | Razorpay webhook |
| POST | `/guest/razorpay/create` | Public | Razorpay order (unauthenticated) |
| GET | `/my-payments` | Auth | User payment history |
| GET | `/` | OrderManager | All payments |
| POST | `/refund` | OrderManager | Full or partial refund |

### Coupon System

- `validateCoupon`: server-side cart total calculation for authenticated users (ignores client `cartTotal`)
- `applyCoupon`: server-side discount recalculation (ignores client `discountAmount`), atomic usage increment with row lock
- Guest coupon usage tracked via email through GuestUser records
- `getCouponById` scoped to current brand
- `getUserCouponHistory` restricted to authenticated user's own history
- Product slugs enforced unique (auto-appends `-2`, `-3` on collision)

### Refund System

- Full + partial refund via Razorpay API
- Auto-refund on prepaid order cancellation
- Status: `paid` → `refund_pending` → `refunded` / `partial_refund`
- WhatsApp notification on refund processed
- Audit log for every refund
- Refundable statuses: `cancelled`, `return_initiated`, `returned_rto`, `rto delivered`

### Shipping Addresses — `/api/v1/shipping-addresses`

| Method | Route | Auth | Function |
|---|---|---|---|
| GET | `/` | Auth | User addresses |
| POST | `/` | Auth | Create address (validated by `shippingValidationService`) |
| PUT | `/:id` | Auth | Update address (validated by `shippingValidationService`) |
| DELETE | `/:id` | Auth | Delete address |
| PUT | `/:id/default` | Auth | Set as default |
| POST | `/guest` | Public | Auto-create user + address (validated by `shippingValidationService`) |
| GET | `/guest` | Auth | Get addresses by email (requires auth + ownership check) |

### All Other Routes

| Prefix | Purpose | Key Endpoints |
|---|---|---|
| `/api/categories` | Categories | `GET /listing`, `GET /by-name/:name`, CRUD `/:id` |
| `/api/sliders` | Hero banners | `GET /listing`, admin CRUD |
| `/api/coupons` | Coupons | `GET /listing`, `POST /validate`, CRUD `/:id` |
| `/api/reviews` | Reviews | `GET /all`, `GET /product/:id`, `POST /submit` |
| `/api/attributes` | Attributes | `GET /mega-menu`, CRUD `/:id` |
| `/api/attributes` | Product attributes | `GET /mega-menu`, CRUD `/:id`, `POST /:id/values` |
| `/api/coupons` | Coupon management | `GET /public`, `POST /validate`, `POST /apply`, CRUD `/:id` |
| `/api/reviews` | Product reviews | `GET /public/all`, `GET /public/:productId`, `POST /public`, admin `PUT /:id/moderate` |
| `/api/wishlist` | User wishlist | `GET /`, `POST /add/:productId`, `DELETE /remove/:productId`, `DELETE /clear` |
| `/api/cart` | Shopping cart | `GET /`, `POST /add`, `PUT /item/:productId`, `DELETE /clear` |
| `/api/sliders` | Hero banners | `GET /public`, admin CRUD, `POST /:id/brands` |
| `/api/lookbooks` | Shoppable lookbooks | `GET /`, `GET /:slug` |
| `/api/reels` | Video reels | `GET /`, `POST /:id/view` |
| `/api/instagram` | Instagram feed | `GET /feed`, `POST /refresh`, `POST /tag` |
| `/api/blogs` | Blog system | `GET /public`, `GET /public/:slug`, admin CRUD under `/admin/` |
| `/api/seo` | SEO metadata | `GET /`, admin `GET /all`, `POST /create`, `PUT /update` |
| `/api/policies` | Policy pages | `GET /`, `GET /name/:name`, CRUD `/:id` |
| `/api/shipping-fees` | Shipping fee config | `GET /`, `GET /:type`, CRUD |
| `/api/loyalty` | Loyalty points | `GET /balance`, `GET /history`, `POST /redeem` |
| `/api/whatsapp` | WhatsApp CRM | Conversations, messages, templates, broadcasts, canned responses |
| `/api/dashboard` | Admin stats | `GET /stats` |
| `/api/leads` | Lead capture | `POST /phone` |
| `/api/utm` | UTM tracking | `POST /track`, `GET /session`, `GET /analytics` |
| `/api/checkout` | OTP verification | `POST /phone-otp/send`, `POST /phone-otp/verify` |
| `/api/notifications` | SSE notifications | `GET /poll` |
| `/api/order-status-history` | Order audit | `GET /order/:orderId`, `POST /order/:orderId` |
| `/api/serviceability/:pincode` | Delivery check | Pincode serviceability + COD availability (routes to active shipping provider) |
| `/api/admin/brands` | Brand management | CRUD, `PATCH /:id/toggle-status` |
| `/api/admin/brand-settings` | Per-brand config | CRUD by key, filter by category |
| `/api/admin/loyalty` | Admin loyalty | `POST /adjust`, `GET /transactions` |
| `/api/admin/lookbooks` | Admin lookbooks | CRUD, image upload, hotspot management |
| `/api/admin/reels` | Admin reels | CRUD, product assignment |
| `/api/analytics` | Dashboard analytics | Aggregated analytics |
| `/api/facebook-pixel` | Server-side pixel | FB Conversions API |
| `/api/facebook-catalog` | Product catalog | FB product feed |
| `/api/health` | System health | DB + Redis + memory |
| `/api/health/db` | DB readiness | MySQL ping |
| `/api/health/redis` | Redis readiness | Set/get test |
| `/api/docs` | API documentation | Swagger UI |

---

## Services

| Service | Purpose |
|---|---|
| `orderService` | Business logic: `confirmOrder`, `cancelOrder`, `syncOrderToFShip`, state machine, RTO risk |
| `orderEvents` | EventEmitter: `order.created/confirmed/shipped/delivered/cancelled/analytics` |
| `shippingProviderFactory` | **NEW** — Returns FShip or iThink service based on `SHIPPING_PROVIDER` brand setting. Cached per brand. |
| `iThinkService` | **NEW** — iThink Logistics API wrapper: order creation (manual courier selection), tracking, cancellation, rate check, pincode serviceability, labels, NDR, warehouse management |
| `shippingValidationService` | **NEW** — Comprehensive pre-shipping validation. Validates name, address, city, state, pincode, phone, items, courier selection. Blocks bad orders at creation time. |
| `fshipService` | FShip API (protected by circuit breaker, singleton init guard, PII redaction in logs, throws on invalid phone) |
| `redisService` | Redis connection + `get`/`set`/`del` proxy methods |
| `cacheManager` | TTL-based cache with namespace isolation (`crosscoin:cache:` prefix), max value size, pattern-based clear |
| `razorpayService` | Razorpay order + signature verification + refund API |
| `loyaltyService` | Credit/redeem/expire/refund points. Expiry runs in batches of 100 with separate transactions. |
| `whatsappService` | WhatsApp templates (order, OTP, abandoned cart, review, win-back, upsell, refund). Rate limited (10/phone/hour). Input sanitized. Credentials cached 5min. |
| `notificationService` | SSE real-time notifications |
| `dashboardService` | Admin stats + cache invalidation |
| `imagekitService` | CDN upload/delete/optimize |
| `instagramService` | Feed refresh + token management |
| `badgeService` | Badge recalculation queue |
| `brandSettingsService` | CRUD for per-brand settings with in-memory cache (5min TTL) |
| `addressQualityService` | Delivery address scoring (historical success rate) |
| `settingsHelper` | Per-brand settings with defaults + env fallback |
| `searchService` | Product search with relevance ranking, typo tolerance, caching |
| `refundService` | Full/partial Razorpay refunds, auto-refund on cancel, WhatsApp notification |

---

## Utilities

| Utility | Purpose |
|---|---|
| `validate.js` | Schema validation middleware (no deps) |
| `circuitBreaker.js` | Circuit breaker for FShip/Razorpay/WhatsApp |
| `apiResponse.js` | Standardized `{ success, data, error }` helpers |
| `encryption.js` | AES-256-GCM for PII fields |
| `batchFetch.js` | Batch product/variation fetch (avoids N+1) |
| `batchInsert.js` | Bulk insert order items |
| `pagination.js` | Pagination helper |
| `passwordValidation.js` | Password strength rules |

---

## Background Worker (`worker.js`)

Separate child process. Auto-restarts on crash.

| Job | Schedule | Purpose |
|---|---|---|
| FShip Sync | Every 2h | Sync `confirmed` orders via active shipping provider (max 3 retries) |
| Loyalty Expiry | Daily 2 AM | Expire old points |
| Instagram Refresh | Every 6h | Refresh feed cache |
| Abandoned Cart | Every hour | WhatsApp to users with stale carts |
| Review Request | Daily 10 AM | WhatsApp 3 days post-delivery |
| Win-back | Daily 11 AM | WhatsApp to 30-60 day inactive users |
| Upsell | Daily 3 PM | WhatsApp 1 day post-delivery |
| Stale Prepaid Cleanup | Every 30 min | Cancel unpaid prepaid orders older than 30 min, restore stock + coupon usage |
| Badge Recalc | On-demand (Bull) | Product badges from order history |

Failed Bull jobs are logged to DLQ after max attempts for manual review.

---

## Security

- **Helmet** — security headers, HSTS in production
- **Rate limiting** — 3-tier: Strict (10/15min), Medium (30/15min), General (120/min)
  - Strict: login, register, checkout, OTP, payments
  - Medium: order creation, address creation
  - General: all other routes
  - Key: IP + userId (prevents both anonymous and authenticated abuse)
  - Public review endpoint: 5 reviews per IP per 15 minutes
  - WhatsApp messages: 10 per phone per hour via Redis
- **JWT** — 7-day access + refresh tokens. Token blacklist via Redis on logout/soft-delete.
- **Bcrypt** — password hashing
- **AES-256-GCM** — phone/address encryption at rest (Sequelize getter/setter handles encrypt/decrypt)
- **CORS** — strict whitelist-based. Vercel preview deployments use suffix match (`.vercel.app`). HTTP origins only in non-production.
- **Soft delete** — accounts anonymised, not hard-deleted. Soft-deleted users blocked from auth.
- **Schema validation** — request bodies validated before processing
- **Shipping address validation** — comprehensive checks (name, address quality, pincode format, phone format, junk detection, Indian state verification) block bad orders at creation time
- **Circuit breaker** — external service failures don't cascade
- **Idempotency** — DB-based duplicate order prevention
- **Brand isolation** — write operations check user-brand access. Consumers scoped to their brand. Staff/admin bypass.
- **Input sanitization** — review text stripped of HTML tags. WhatsApp messages sanitized. SQL wildcards escaped in search.
- **Authorization** — review deletion requires ownership or admin. Profile updates restricted to own profile. Coupon history restricted to own user. Guest address lookup requires auth.
- **File upload validation** — review media: images/videos only, 10MB max. Directory traversal prevented in image endpoints.

---

## Logging System

`config/logging.js` — structured logger with file output.

- **JSON output** in production (for log aggregators like CloudWatch/ELK)
- **Human-readable** in development
- **File logging:** `logs/app.log` (all), `logs/error.log` (warn + error)
- **Request logger middleware:** logs every request with timing, status, requestId, userId
- **Log levels:** `debug` (dev), `warn` (prod), `error` (test)
- **Request tracing:** each request gets `req.requestId` for correlation

---

## Health Check & Monitoring

| Endpoint | Purpose | Response |
|---|---|---|
| `GET /api/health` | Full system health | DB + Redis + memory + uptime |
| `GET /api/health/db` | Database readiness | MySQL ping |
| `GET /api/health/redis` | Redis readiness | Set/get test |

Returns 200 if healthy, 503 if degraded. Use for deployment readiness probes.

---

## Error Handling

`utils/AppError.js` + `middleware/errorMiddleware.js`

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ORDER_INVALID_STATE",
    "message": "Cannot cancel shipped order",
    "details": { "currentStatus": "shipped", "targetStatus": "cancelled" }
  }
}
```

Error codes:
| Code | Status | Meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate entry |
| `RATE_LIMITED` | 429 | Too many requests |
| `ORDER_INVALID_STATE` | 400 | Invalid status transition |
| `ORDER_NOT_CANCELLABLE` | 400 | Order past cancellation window |
| `COD_BLOCKED` | 400 | COD not available (RTO risk) |
| `OUT_OF_STOCK` | 400 | Insufficient stock |
| `DUPLICATE_ORDER` | 200 | Idempotency key match |
| `PAYMENT_FAILED` | 402 | Payment processing error |
| `DB_UNAVAILABLE` | 503 | Database connection error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

Auto-maps: Sequelize validation/unique errors, JWT errors, Multer file errors.

---

## API Documentation

Interactive Swagger UI available at `/api/docs`.
JSON spec at `/api/docs/spec.json`.

Covers all endpoints with request/response schemas, auth headers, error codes.

---

## Search System

`services/searchService.js` — production-grade product search.

**Features:**
- Relevance scoring: exact name (100) > partial name (50) > description (20) > per-word (10)
- Typo tolerance via MySQL SOUNDEX (phonetic matching)
- Multi-word search: each word scored independently
- Filters: category, price range, brand
- Sort: relevance, price_asc, price_desc, newest, name_asc
- Cached results (60s TTL)
- "Did you mean" suggestions when no results found
- FULLTEXT index on `products(name, description)` — migration 009

**API:** `GET /api/products/search?query=sock&category=Men&sort=price_asc&page=1&limit=20`

**Response includes:**
- `products[]` — with images, variations, relevance score
- `total` — total matches
- `suggestions[]` — alternative search terms (when 0 results)
- `pagination` — page, limit, totalPages, hasNextPage

**Upgrade path:** swap `searchService.js` internals to Meilisearch/Elasticsearch without changing the API contract.

---

## Database Migrations

`scripts/setupDatabase.js` — runs automatically on schema version change.

| Migration | Purpose |
|---|---|
| 001 | Base tables + constraints |
| 002 | Address quality scores |
| 003 | Coupon usage table |
| 004 | Webhooks log (Razorpay/FShip dedup) |
| 005 | RTO risk score column |
| 006 | `awaiting_confirmation` added to order status ENUM |
| 007 | `order_audit_logs` table (who did what, when) |
| 008 | `idempotency_key` column on orders (unique, prevents duplicates) |
| 009 | FULLTEXT index on `products(name, description)` for search |
| 010 | `order_shipments` table — provider-agnostic shipment tracking |

### Scripts

| Script | Purpose |
|---|---|
| `setupDatabase.js` | Auto-run migrations on schema version change |
| `encryptExistingData.js` | Encrypt existing PII data |
| `migrateShipmentData.js` | Copy FShip data from orders → order_shipments table |
| `seedShippingProviderSettings.js` | **NEW** — Seed iThink + shipping provider brand settings |

---

## Idempotency

- `idempotency_key` column on `orders` table (UNIQUE constraint)
- Frontend sends `idempotency_key` in request body or `X-Idempotency-Key` header
- If key already exists → returns existing order (200), no duplicate created
- DB-based — survives Redis downtime, no TTL expiry issues
- Covers: payment retries, network retries, frontend double-clicks

---

## Concurrency & Locking

- `confirmOrder` and `cancelOrder` use `SELECT ... FOR UPDATE` row locks
- Prevents race conditions: admin confirm + user cancel at same time
- FShip sync uses atomic `UPDATE ... WHERE fship_sync_status IN ('pending', 'failed')` — prevents double sync
- All stock decrements happen inside DB transactions with auto-rollback on failure

---

## Audit Logs

`order_audit_logs` table tracks all admin/user actions on orders:

| Field | Type | Notes |
|---|---|---|
| order_id | INT FK | |
| action | VARCHAR | `confirm`, `cancel`, `status_change`, `fship_sync`, `payment_update` |
| performed_by | INT | User ID |
| role | VARCHAR | `admin`, `user`, `system`, `webhook` |
| metadata | JSON | Reason, old/new status, etc. |
| created_at | DATETIME | |

---

## Webhook Deduplication

- `webhooks_log` table stores processed event IDs
- Before processing any Razorpay/FShip webhook: check if `event_id` exists
- If exists → skip (idempotent)
- If not → process + insert into `webhooks_log`
- Prevents duplicate payment confirmations and status updates

---

## COD Fraud Prevention

`orderService.checkCodEligibility(phone, brandId)` checks:
- RTO count in last 6 months (from shipping addresses with same phone)
- 2+ RTOs → COD blocked entirely
- 1 RTO → score +20 (shown as 🟡 MEDIUM in admin)
- Missing landmark → score +10
- COD max order value enforced per brand (configurable via brand settings)
- Score > 20 → HIGH risk badge in admin dashboard

---

## Frontend Integration Notes

- `/api/orders/checkout` returns `X-Auth-Token` header → frontend stores in localStorage
- `AuthContext` listens to `storage` events → auto-logs in user after checkout
- Prepaid: payment first → order creation with 3 retries → webhook safety net
- COD: OTP verification → order creation → admin confirms → shipping provider sync
- Admin dashboard shows RTO badges (🟢/🟡/🔴) and Confirm button for `awaiting_confirmation` orders
- Admin can validate orders (`GET /:id/shipping/validate`) and pick couriers (`GET /:id/shipping/couriers`) before syncing
- Address creation/update returns `errors[]` and `warnings[]` if validation fails — frontend should display these inline
- Profile page: soft delete with reason, orders/addresses always under user (no guest)
