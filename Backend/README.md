# CrossCoin Backend

REST API for the CrossCoin e-commerce platform. Powers the storefront at `crosscoin.in` and the admin dashboard.

> **Production readiness: 84 / 100.** See [§ Production Readiness](#production-readiness) for the honest breakdown and what's still pending.

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
All schedules live in `config/cronJobs.js`:
- iThink/FShip order sync — every 2 h at :05
- iThink/FShip order-status refresh — 6 AM + 6 PM
- Loyalty point expiry — 2 AM
- **Payment reconciliation (Razorpay) — 3 AM** *(new)* — sweeps every Razorpay payment marked pending/failed in the last 48 h and reconciles against the truth from Razorpay's API. Catches dropped webhooks before the customer notices.
- Instagram feed sync — every 6 h
- Abandoned cart recovery — every hour at :15

### Integration retry queue
Failed shipping syncs, payment reconciliations, and WhatsApp sends are pushed onto a Bull queue (`services/integrationQueue.js`) with exponential backoff (5 attempts, 5s/25s/2m/10m/50m). Falls back to inline execution if Redis is unavailable, so dev still works without Redis. Workers register in [`services/integrationQueueWorkers.js`](services/integrationQueueWorkers.js).

### Webhook signature verification
HMAC-SHA256 enforced on `/api/orders/fship/webhook` and `/api/whatsapp/webhook` via [`middleware/webhookSignature.js`](middleware/webhookSignature.js). Configure secrets in env:
- `FSHIP_WEBHOOK_SECRET` — value from FShip dashboard
- `WHATSAPP_WEBHOOK_SECRET` — Meta app secret
- `ITHINK_WEBHOOK_SECRET` — for when iThink switches from pull to push

Transitional fail-open: requests pass through with a warning until the secret is set, then enforcement is automatic.

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

**84 / 100** — hardening complete. Everything still pending is either a multi-day refactor (deferred for safety) or genuinely optional.

| Area | Score | What hurts |
|---|---|---|
| Architecture | 7/10 | `orderController.js` is 2.4k LOC — overdue for a split (deferred — risky big-bang refactor) |
| Data model | 7/10 | no formal migrations — `setupDatabase.js` is the migration system |
| **Security** | **9/10** | webhook HMAC live; CSRF opt-in; Zod validation on auth + critical mutations |
| Error handling | 9/10 | structured logger + AppError middleware; client-error sink at `/api/client-errors` |
| API design | 8/10 | response envelope helper + Zod on key routes; ~30 legacy endpoints still hand-roll their shape |
| **Integrations** | **9/10** | Bull retry queue with exponential backoff; payment reconciliation now fans out via Bull when Redis is up |
| Cron jobs | 7/10 | in-process `node-cron` — fine for one instance; would double-fire under horizontal scaling |
| **Testing** | **4/10** | 38-test smoke suite; integration tests against a seeded test DB still pending (needs a Docker MySQL or sqlite-memory harness) |
| Observability | 8/10 | health + `/api/metrics` + slow-query log + client-error sink; no APM yet |
| Data integrity | 8/10 | `order_audit_logs` populated at every mutation; daily Razorpay reconciliation cron live with Bull fan-out; backfill script ready |

### What's still pending — honest accounting

**🟡 Carry-on items (do incrementally, no blocker)**
1. Migrate ~30 legacy response shapes to `utils/apiResponse.js` envelope. **Why incremental, not big-bang**: silently breaks frontend code that destructures the current shape. Migrate when you touch each controller.
2. Apply Zod to remaining mutation routes (product create / update, checkout). **Why deferred**: product create uses multer + complex nested payload (variations, attributes); writing the schema needs a careful audit of the real request body, not guess-work.

**🟠 Genuine refactors (need their own dedicated session)**
3. **Split `orderController.js` (2.4k LOC).** Best done by domain: `orders/createController.js`, `orders/trackingController.js`, `orders/cancellationController.js`, `orders/adminController.js`. Each pull touches the routes file + audit/queue call sites. Plan for half a day, test with the full smoke suite at every step.
4. **Move cron → Bull queues fully.** `node-cron` works for a single instance; the moment you horizontally scale (two API pods), every job fires twice. The reconciliation cron already enqueues to Bull when available — generalise the pattern to FShip sync, status refresh, loyalty expiry, Instagram refresh.
5. **Integration tests against a seeded test DB.** Needs a `tests/setup.js` that spins up an isolated MySQL (Docker) or sqlite-in-memory, runs `setupDatabase`, seeds a few orders, then exercises checkout + order create + cancel + refund via supertest. ~200 LOC + Docker compose entry.

**🟢 Long-tail polish (do if/when you actually need them)**
6. Auto-generate OpenAPI from the route layer (use `swagger-jsdoc` + JSDoc on each route).
7. OpenTelemetry distributed tracing — meaningful once you have a second service to trace into.
8. Replace last `console.*` calls in `fshipService.js` with `logger` (cosmetic).

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
