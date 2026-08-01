# Runbook #6 — Observability: errors, uptime, alerting

**Goal:** know something broke **before a customer screenshots it** — instead of
reading raw cPanel logs after the fact.

Three layers, all free-tier, in priority order: **Errors → Uptime → Logs.**

---

## 1. Error tracking (Sentry) — biggest win, mostly already wired

### Frontend (5 min per brand — code already supports it)
Each storefront has `sentryAdapter.js` that reads `NEXT_PUBLIC_SENTRY_DSN`.
It's a no-op until you set the DSN.

1. Create a free Sentry account → a **project per brand** (or one project, tag by
   brand). Copy each project's **DSN**.
2. In **Vercel → \<project\> → Settings → Environment Variables** add:
   ```
   NEXT_PUBLIC_SENTRY_DSN            = https://…ingest.sentry.io/…
   NEXT_PUBLIC_SENTRY_TRACES_SAMPLE  = 0.1
   ```
3. Redeploy. Errors + performance now flow to Sentry with source maps.

### Backend (add it — ~20 min)
The backend has **no** error tracking yet. Add `@sentry/node`:
1. `npm i @sentry/node` in `Backend/`.
2. At the very top of `index.js`:
   ```js
   const Sentry = require('@sentry/node');
   if (process.env.SENTRY_DSN) {
     Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
   }
   ```
   and add `app.use(Sentry.expressErrorHandler())` **after** your routes (before the
   final error middleware).
3. Set `SENTRY_DSN` in the cPanel Node app env → restart.
4. Also forward the existing structured logger's `error`s to Sentry
   (`Sentry.captureException`) so `logger.error(...)` shows up too.

> Result: uncaught exceptions, unhandled rejections, and logged errors land in
> Sentry with stack traces + request context — the "silent failure" era ends.

---

## 2. Uptime monitoring (UptimeRobot / Better Stack — free)

Free tier: 50 monitors, 5-min checks, email/Slack alerts.

Add HTTP monitors for:
| What | URL | Expect |
|---|---|---|
| API liveness | `https://api.crosscoin.in/api/v1/health` | 200 |
| API + DB | `https://api.crosscoin.in/api/health/db` | 200 |
| API + Redis | `https://api.crosscoin.in/api/health/redis` | 200 |
| Each storefront | `https://<brand-domain>/` | 200 |

- Keyword monitor tip: also assert the health body contains `"success":true`.
- **Bonus (cPanel-idle safety):** hitting `/api/v1/health` every 5 min keeps
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
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set on all 7 Vercel projects (frontend errors live)
- [ ] `@sentry/node` + `SENTRY_DSN` on the backend (server errors live)
- [ ] Uptime monitors on `/api/v1/health`, `/health/db`, `/health/redis`, + 7 storefronts
- [ ] Alerts routed to email + team chat
- [ ] (Optional) metrics/queue-health monitor on `/api/metrics`
