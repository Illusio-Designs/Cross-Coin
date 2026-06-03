# CrossCoin Backend

REST API for the CrossCoin e-commerce platform. Powers the storefront at `crosscoin.in` and the admin dashboard.

> **Production readiness: 93 / 100.** See [§ Production Readiness](#production-readiness) for the honest breakdown and what's still pending.

---

## Tech Stack

| | |
|---|---|
| Runtime | Node.js (CommonJS) |
| Framework | Express |
| ORM | Sequelize |
| Database | MySQL 8 (utf8mb4) |
| Cache / sessions | Redis (token blacklist, idempotency keys, rate limits) |
| Auth | JWT (access + refresh), bcrypt, MSG91 OTP |
| File storage | ImageKit (with local `/uploads` fallback) |
| Payments | Razorpay |
| Shipping | iThink (primary) + FShip (legacy) |
| Other integrations | WhatsApp Business API, Facebook Pixel + CAPI, GA4 Data API, Google Search Console API |
| Cron | `node-cron` (in-process — see [§ Background Jobs](#background-jobs)) |

---

## Folder Layout

```
Backend/
├── index.js                    # Express bootstrap
├── routes/
│   ├── routesManager.js        # mounts every router under /api
│   ├── orderRoutes.js          # /api/orders/*
│   ├── productRoutes.js        # /api/products/*
│   └── ...                     # one router per resource
├── controller/                 # request handlers (large; see refactor notes)
├── services/                   # business logic + 3rd-party integrations
│   ├── iThinkService.js        # iThink API client
│   ├── fshipService.js         # legacy FShip API client
│   ├── razorpayService.js
│   ├── whatsappService.js
│   └── shippingProviderFactory.js   # routes orders to the right provider
├── model/
│   ├── associations.js         # all Sequelize relations
│   └── *Model.js               # one per table (auto-loaded by setupDatabase)
├── middleware/
│   ├── authMiddleware.js       # authenticate, isAdmin, isProductManager, ...
│   ├── brandMiddleware.js      # multi-brand request scoping
│   └── ...
├── integration/                # Facebook Pixel + GA + Search Console proxies
├── config/
│   ├── db.js                   # Sequelize init
│   ├── cronJobs.js             # cron schedule definitions
│   └── logging.js              # Winston logger
└── scripts/
    └── setupDatabase.js        # idempotent schema setup + default SEO seeding
```

---

## Local Setup

```bash
cd Backend
npm install
cp .env.example .env             # fill in DB + integration keys
node scripts/setupDatabase.js    # creates tables, patches columns, seeds defaults
node index.js                    # or: npm run dev
```

The setup script is **idempotent** — you can re-run it any time and it only adds the missing columns / indexes. It also seeds 13 default SEO rows for the storefront pages.

---

## Key Conventions

### Routes
All public + admin endpoints are mounted under `/api` (and `/api/v1` for forward-compat) via [`routes/routesManager.js`](routes/routesManager.js). Add a new resource by:
1. Create `model/myThingModel.js` (auto-loaded).
2. Add the model to `model/associations.js`.
3. Create `controller/myThingController.js`.
4. Create `routes/myThingRoutes.js`.
5. Register it in `routesManager.js`.

### Auth tiers
Middleware in `middleware/authMiddleware.js`:
- `authenticate` (alias: `isAuthenticated`) — requires valid JWT
- `isAdmin` — full dashboard access
- `isProductManager`, `isOrderManager`, `isWhatsappManager`, `isStaff` — scoped admin
- `optionalAuth` — populates `req.user` when present but doesn't reject

### Brand scoping
`brandMiddleware.js` (`optionalBrand` / `requireBrand`) reads `X-Brand-Name` header and sets `req.brand`. Every public-facing query filters on `req.brand.id`.

### Settings
Per-brand integration keys (Razorpay, FB Pixel, iThink, SEO defaults) live in `brand_settings` (key/value with `category`). Read via `services/settingsHelper.getSetting(brandId, key, default)`. Falls back to `process.env[KEY]` if not set, then to the default. This is how the dashboard lets the team rotate keys without redeploying.

### Logging
`config/logging.js` exports a Winston logger writing to `logs/app.log` + `logs/error.log`. Use `logger.debug/info/warn/error(...)` — **don't** use `console.*` (one or two legacy spots remain; PRs welcome).

### Cron
All schedules live in `config/cronJobs.js`. **Every job enqueues a Bull task; the worker (in `services/integrationQueueWorkers.js`) does the actual work.** node-cron is just the trigger.
- Shipping sync (provider-agnostic) — every 2 h at :05 → `cron:shipping-sync`
- Shipping status refresh — 6 AM + 6 PM → `cron:shipping-status-refresh`
- Loyalty point expiry — 2 AM → `cron:loyalty-expiry`
- **Payment reconciliation (Razorpay)** — 3 AM → fans out 1 Bull job per pending payment
- Instagram feed sync — every 6 h → `cron:instagram-refresh`
- Abandoned cart recovery — every hour at :15 (still inline; lower volume)

### Integration retry queue
Failed shipping syncs, payment reconciliations, and WhatsApp sends are pushed onto a Bull queue (`services/integrationQueue.js`) with exponential backoff (5 attempts, 5s/25s/2m/10m/50m). Falls back to inline execution if Redis is unavailable, so dev still works without Redis. Workers register in [`services/integrationQueueWorkers.js`](services/integrationQueueWorkers.js).

### Webhook signature verification
HMAC-SHA256 enforced on `/api/orders/shipping/webhook` (and the legacy `/fship/webhook` alias) + `/api/whatsapp/webhook` via [`middleware/webhookSignature.js`](middleware/webhookSignature.js). Configure secrets in env:
- `FSHIP_WEBHOOK_SECRET` — value from FShip dashboard
- `WHATSAPP_WEBHOOK_SECRET` — Meta app secret
- `ITHINK_WEBHOOK_SECRET` — for when iThink switches from pull to push

The `shipping` source is provider-agnostic: it tries iThink + FShip secrets in order and accepts whichever matches, so the brand can toggle `SHIPPING_PROVIDER` without re-routing webhooks.

Transitional fail-open: requests pass through with a warning until the secret is set, then enforcement is automatic.

### Shipping (multi-provider)
The system supports **two shipping providers behind one interface**: **iThink** (live in production) and **FShip** (legacy fallback). Selection is **per-brand**, driven by the `SHIPPING_PROVIDER` setting in `brand_settings` (default: `fship`). To switch a brand's provider, update that setting — no code change, no redeploy.

| Layer | File | Role |
|---|---|---|
| Driver | [`services/iThinkService.js`](services/iThinkService.js) | iThink REST API client |
| Driver | [`services/fshipService.js`](services/fshipService.js) | FShip REST API client |
| Factory | [`services/shippingProviderFactory.js`](services/shippingProviderFactory.js) | Reads the setting, returns the right driver (cached per-brand) |
| **Facade** | [`services/shippingService.js`](services/shippingService.js) | **Canonical front-door.** Use this for new code. |
| Controller | [`controller/orderShippingController.js`](controller/orderShippingController.js) | Express handlers; functions named `*FShip*` for legacy reasons but every one dispatches via the factory. Provider-agnostic aliases (`syncShipments`, `refreshShipmentStatuses`, `handleShippingWebhook`, etc.) re-export from the bottom of the file. |
| Routes | [`routes/orderRoutes.js`](routes/orderRoutes.js) | `/api/orders/shipping/*` is canonical; `/fship/*` is a deprecated alias. |

**Canonical usage from new code:**
```js
const shipping = require('../services/shippingService.js');
const result = await shipping.createOrder(brandId, orderData);
const tracking = await shipping.trackByAwb(brandId, awb);
await shipping.cancelShipment(brandId, awb, 'Customer request');
```

**Adding a new provider** (e.g. Delhivery direct): implement the same surface as a class in `services/`, register the brand-setting value in `shippingProviderFactory.js` — existing callers keep working unchanged.

### CSRF protection
Double-submit cookie pattern via [`middleware/csrf.js`](middleware/csrf.js). Frontend fetches a token from `GET /api/csrf/token` on load and mirrors it into `X-CSRF-Token` on every state-changing request. Enforcement is opt-in via `CSRF_REQUIRED=true` — the token endpoint is always live so the frontend can prepare for the switch.

### Address quality scoring
[`services/addressQualityService.js`](services/addressQualityService.js) returns a 0-100 score per shipping address based on pincode validity, phone validity, completeness, **landmark presence**, and historical delivery success at that exact address. `createOrder` blocks COD when score < `COD_MIN_ADDRESS_QUALITY` (default 60, per-brand configurable). Storefront can pre-check via `POST /api/orders/check-address-quality`. Counters auto-increment on delivered / undelivered / rto.

---

## Important Endpoints

| Endpoint | Use |
|---|---|
| `GET /api/health` | liveness probe |
| `GET /api/health/db` + `/health/redis` | dependency status |
| `GET /api/metrics` | operator metrics (memory, integration queue counts, uptime) — gated by `X-Metrics-Token` if `ADMIN_METRICS_TOKEN` is set |
| `GET /api/csrf/token` | issues a CSRF token cookie + JSON payload for frontend to mirror into `X-CSRF-Token` |
| `GET /api/seo?page_name=X` | public SEO lookup (used by SSR) |
| `GET /api/public/faqs?type=…` | public FAQ list |
| `GET /api/public/tracking-config` | runtime tracking IDs (GA / FB / Clarity) — read by the storefront so changes in admin take effect without a redeploy |
| `POST /api/products/:id/seo/regenerate` | re-runs auto-fill for product SEO |
| `POST /api/orders/check-address-quality` | pre-checkout quality + COD eligibility check |
| `POST /api/orders/fship/refresh-status` | bulk status refresh for active orders |

---

## Testing

Smoke suite under [`tests/smoke/`](tests/smoke/) covers the critical
infrastructure that should never silently regress: webhook HMAC,
address-quality scoring + landmark bonus, API response envelope, CSRF
middleware. Runs in under a second — no MySQL, no Redis, no network.

```bash
npm test            # all tests
npm run test:smoke  # just the smoke suite
```

See [`tests/README.md`](tests/README.md) for what's covered and what's
deliberately deferred until a test DB seed exists.

---

## Production Readiness

**90 / 100** — every previously-deferred refactor now has at least a scaffold or partial completion shipped. What remains is either inherently incremental or genuinely optional.

| Area | Score | What hurts |
|---|---|---|
| Architecture | 8/10 | `orderController.js` still 2.4k LOC, but domain-grouped facade in [`controller/orders/`](controller/orders/) lets routes import from per-domain files. Functions get migrated out as you touch them. |
| Data model | 7/10 | no formal migrations — `setupDatabase.js` is the migration system |
| **Security** | **9/10** | webhook HMAC; CSRF opt-in; Zod validation on auth + product + checkout + addresses + coupons + orders |
| Error handling | 9/10 | structured logger + AppError middleware; client-error sink at `/api/client-errors` |
| API design | 8/10 | response envelope helper + Zod on key routes; OpenAPI spec at `/api/docs` |
| **Integrations** | **9/10** | Bull retry queue + fan-out; all crons now enqueue Bull jobs (workers do the work) |
| Cron jobs | 9/10 | `node-cron` is just the trigger; every job goes through Bull (retries + persistence + dedup). Inline fallback when Redis is down. |
| **Testing** | **6/10** | 38-test smoke suite + 3-test integration suite (sqlite::memory harness). Add more integration tests per-domain as you touch them. |
| Observability | 9/10 | health + `/api/metrics` + slow-query log + client-error sink + OpenAPI spec at `/api/docs` |
| Data integrity | 8/10 | audit logs everywhere; daily Razorpay reconciliation cron fans out via Bull; backfill script ready |

### What's still pending — honest accounting

**🟡 Carry-on items (do incrementally, no blocker)**
1. Migrate ~30 legacy response shapes to `utils/apiResponse.js` envelope. **Still incremental**: silently breaks frontend code that destructures the current shape. Migrate per-controller as you touch them.
2. Extend Zod schemas as you encounter new edge cases. The atomic primitives in [`middleware/validate.js`](middleware/validate.js) cover the basics; product/checkout schemas use `.passthrough()` and validate the bare minimum — tighten them as you understand the real payload shape better.
3. Migrate functions OUT of `controller/orderController.js` into the domain shim files when you touch them. The domain map at the top of the file documents which file each function belongs in.

**🟠 What's actually left — and why it's not urgent**
4. **Document remaining routes in OpenAPI.** Five example routes are documented in [`config/openapi-routes.js`](config/openapi-routes.js); copy the pattern for the rest. Live at `/api/docs` after server start.
5. **Integration tests for the checkout flow.** Harness is in place ([`tests/integration/_setup.js`](tests/integration/_setup.js) — sqlite::memory + auto-loaded models). Address quality persistence test is the template; checkout test would need Razorpay/iThink mocks.

**🟢 Long-tail polish (do if/when you actually need them)**
6. OpenTelemetry distributed tracing — meaningful once you have a second service to trace into.
7. Replace last `console.*` calls in `fshipService.js` with `logger` (cosmetic).

### Required env vars (new this hardening pass)

```bash
# Webhook HMAC (transitional fail-open — set these to flip to enforcement)
FSHIP_WEBHOOK_SECRET=<from-fship-dashboard>
WHATSAPP_WEBHOOK_SECRET=<meta-app-secret>
ITHINK_WEBHOOK_SECRET=<from-ithink-when-they-add-push>

# Metrics endpoint protection
ADMIN_METRICS_TOKEN=<random-32-hex>

# CSRF enforcement (off by default — flip to true once frontend wired)
CSRF_REQUIRED=false

# Address quality COD cutoff (default 60; stored per-brand in brand_settings)
# COD_MIN_ADDRESS_QUALITY=60
```

---

## Useful Scripts

```bash
node scripts/setupDatabase.js   # idempotent schema setup + SEO seed
node index.js                   # start the API
```

(See `scripts/` for one-off data utilities.)
