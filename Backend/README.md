# CrossCoin Backend

REST API for the CrossCoin e-commerce platform. Powers the storefront at `crosscoin.in` and the admin dashboard.

> **Production readiness: 62 / 100.** See [§ Production Readiness](#production-readiness) for the honest breakdown and what's still pending.

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
- iThink order-status refresh — 6 AM + 6 PM
- Loyalty point expiry — 2 AM
- Instagram feed sync — every 6 h
- Abandoned cart recovery — every hour at :15

---

## Important Endpoints

| Endpoint | Use |
|---|---|
| `GET /api/health` | liveness probe |
| `GET /api/health/db` + `/health/redis` | dependency status |
| `GET /api/seo?page_name=X` | public SEO lookup (used by SSR) |
| `GET /api/public/faqs?type=…` | public FAQ list |
| `GET /api/public/tracking-config` | runtime tracking IDs (GA / FB / Clarity) — read by the storefront so changes in admin take effect without a redeploy |
| `POST /api/products/:id/seo/regenerate` | re-runs auto-fill for product SEO |
| `POST /api/orders/fship/refresh-status` | bulk status refresh for active orders |

---

## Production Readiness

**62 / 100** — strong foundations, weak hardening.

| Area | Score | What hurts |
|---|---|---|
| Architecture | 7/10 | controllers are 2k+ LOC; mix of service + controller logic |
| Data model | 7/10 | no formal migrations — `setupDatabase.js` is the migration system |
| **Security** | **6/10** | no CSRF; no webhook signature verification on iThink/WhatsApp; some integration secrets live in DB |
| Error handling | 8/10 | structured logger + AppError middleware; a couple of legacy `console.error` calls remain |
| API design | 6/10 | response envelopes inconsistent across routes; no OpenAPI; pagination metadata varies |
| **Integrations** | **5/10** | no retry / dead-letter queue for failed shipping or webhook events |
| Cron jobs | 6/10 | in-process `node-cron` — fine until you horizontally scale, then double-fires |
| **Testing** | **0/10** | no unit / integration / e2e tests in the repo |
| Observability | 5/10 | health checks present; no metrics export, no slow-query alerts, no APM |
| Data integrity | 4/10 | `order_audit_logs` schema exists but isn't populated; payment reconciliation is manual |

### Pending (not deployment) — by severity

**🔴 High** (do these before scaling traffic)
1. Add webhook signature verification on iThink and WhatsApp endpoints (forgery risk today).
2. Start writing tests — even a smoke suite on auth + checkout + order creation pays back fast.
3. Move integration retries off "fire and forget" — push failed shipping syncs / payment captures into a queue (Bull on Redis) with exponential backoff.
4. Populate the `order_audit_logs` table on every order mutation. Today there's no trail when an order changes.

**🟡 Medium**
5. Daily payment-reconciliation job (Razorpay vs `payments` table).
6. Standard response envelope: `{ success, data, pagination?, error? }` for every endpoint.
7. Request validation middleware (Joi or Zod) so controllers stop hand-checking required fields.
8. Move cron from `node-cron` to Bull queues (persistence + dashboard + idempotency).
9. Slow-query log + Prometheus-style metrics (`/metrics`).
10. CSRF tokens on state-changing dashboard POST/PUT/DELETE.

**🟢 Low**
11. Auto-generate an OpenAPI doc from the route layer.
12. Distributed tracing (OpenTelemetry).
13. Replace the last `console.*` calls in `fshipService.js` with `logger`.
14. Split `orderController.js` and `orderShippingController.js` into smaller domain files.

---

## Useful Scripts

```bash
node scripts/setupDatabase.js   # idempotent schema setup + SEO seed
node index.js                   # start the API
```

(See `scripts/` for one-off data utilities.)
