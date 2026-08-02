# Runbook #6 — Observability: errors, uptime, alerting

**Goal:** know something broke **before a customer screenshots it** — instead of
reading raw cPanel logs after the fact.

Three layers, all free-tier, in priority order: **Errors → Uptime → Logs.**

---

## 1. Error tracking (Sentry) — biggest win, mostly already wired

### Frontend (per brand)
**State (verified):** only **Crosscoin, Velmique, Knitwink** have `sentryAdapter.js`;
of those, only **Knitwink** has `@sentry/nextjs` in its deps, and its wiring is
currently disabled. **Morbix, Soxbae, Velquira, Gripzus** have no Sentry code at all.

> ⚠️ **TDZ caveat:** `@sentry/nextjs` imported into the client bundle previously
> caused a runtime TDZ crash (see `Knitwink/components/layout/ClientProviders.jsx`)
> — likely linked to the intermittent "raw HTML only" bug. Re-enable it via the
> **dynamic-import** adapter (Knitwink's pattern), pilot on ONE brand, deploy, and
> confirm the live store still hydrates before rolling out to the rest.

Each `sentryAdapter.js` reads `NEXT_PUBLIC_SENTRY_DSN` and is a no-op until the DSN
is set. Because all 7 storefronts can share one Sentry project, set a `brand` tag
in each adapter so issues are attributable.

1. Create a free Sentry account → a **project per brand** (or one project, tag by
   brand). Copy each project's **DSN**.
2. In **Vercel → \<project\> → Settings → Environment Variables** add:
   ```
   NEXT_PUBLIC_SENTRY_DSN            = https://…ingest.sentry.io/…
   NEXT_PUBLIC_SENTRY_TRACES_SAMPLE  = 0.1
   ```
3. Redeploy. Errors + performance now flow to Sentry with source maps.

### Backend ✅ DONE (code shipped) — just set the env var
`@sentry/node` is installed and wired (commit a04d1cb):
- `Backend/instrument.js` — `Sentry.init`, required as the first line of `index.js`.
- `Backend/index.js` — `Sentry.setupExpressErrorHandler(app)` after routes.
- `Backend/config/logging.js` — `logger.error(...)` forwarded to Sentry.

All of it is a **no-op until `SENTRY_DSN` is set**, so it's already deployed-safe.

**Your only step:** set `SENTRY_DSN` = the Sentry **Express** project's DSN in the
cPanel Node app environment → restart. Optional: `SENTRY_TRACES_SAMPLE` (default 0.1),
`SENTRY_PII=true` to include PII.

> Result: uncaught exceptions, unhandled rejections, and logged errors land in
> Sentry with stack traces + request context — the "silent failure" era ends.

---

## 2. Uptime monitoring (UptimeRobot / Better Stack — free)

Free tier: 50 monitors, 5-min checks, email/Slack alerts.

Add HTTP monitors for:
| What | URL | Expect |
|---|---|---|
| API liveness | `https://api.crosscoin.in/api/health` | 200 |
| API + DB | `https://api.crosscoin.in/api/health/db` | 200 |
| API + Redis | `https://api.crosscoin.in/api/health/redis` | 200 |
| Each storefront | `https://<brand-domain>/` | 200 |

- Keyword monitor tip: also assert the health body contains `"success":true`.
- **Bonus (cPanel-idle safety):** hitting `/api/health` every 5 min keeps
  Passenger warm, which also helps the in-process queue worker stay alive.
- Route alerts to **email + a Slack/WhatsApp channel** so a down event pings the team.

---

## 3. Logs + metrics dashboard

- **Errors** are covered by Sentry (above) — that's 90% of what you need.
- **Metrics:** you already have `GET /api/metrics` (now token-gated). Point a
  Better Stack "heartbeat"/HTTP monitor at
  `https://api.crosscoin.in/api/metrics?token=…` and chart `integration_queue.counts`
  (waiting/failed) + memory. Alert if `failed` climbs or `waiting` stays > 0.
- **Full log aggregation** (optional, later): Better Stack Telemetry / Logtail free
  tier — ship the cPanel app log via their agent or a log drain. Not required if
  Sentry + uptime are in place.

---

## Alerting rules to set (so alerts are useful, not noise)
- **Sentry:** alert on a *new* issue type, and on error-rate spike (> N/min).
- **UptimeRobot:** alert after 2 consecutive failed checks (avoids flapping).
- **Queue health:** alert if `/api/metrics` shows `failed` increasing or
  `waiting > 0` for > 30 min (means the cron drain isn't keeping up).

---

## Definition of done
- [x] `@sentry/node` wired on the backend (code shipped, no-op until DSN set)
- [ ] `SENTRY_DSN` set in cPanel env → backend errors live
- [ ] Frontend Sentry re-enabled via dynamic-import adapter, piloted on 1 brand, then all 7
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set on all 7 Vercel projects (frontend errors live)
- [ ] Uptime monitors on `/api/health`, `/health/db`, `/health/redis`, + 7 storefronts
- [ ] Alerts routed to email + team chat
- [ ] (Optional) metrics/queue-health monitor on `/api/metrics`
