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

## APPENDIX — concrete setup (copy-paste, real values)

Frontend Sentry is now wired via `@sentry/browser` + a `SentryInit` component in
all 7 storefronts (no `NEXT_PUBLIC_SENTRY_DSN` env needed — the DSN is baked in,
env still overrides). Backend Sentry is wired via `instrument.js`. So the only
work left is **dashboard config**: alert rules + uptime monitors.

### A. Sentry alert rules (do for BOTH projects: Express + Next.js)
Sentry → select project → **Alerts → Create Alert → Issues**.

**Rule 1 — new problem (the important one)**
- WHEN: *A new issue is created*
- IF: `environment` equals `production`
- THEN: *Send a notification to* → email **illusiodesigns@gmail.com**
- Name it `new-issue` → Save. (Fires the first time any never-seen error appears.)

**Rule 2 — spike**
- WHEN: *An issue is seen more than* `20` *times in* `1 hour`
- IF: `environment` equals `production`
- THEN: email → Save as `error-spike`.

> The Next.js project is shared by all 7 storefronts; every issue carries a
> `brand` tag (crosscoin/gripzus/…), so you can tell which store threw it. Add a
> per-brand rule later only if one brand needs its own routing.

### B. UptimeRobot monitors (free: 50 monitors, 5-min checks)
All 10 are plain **HTTP(s)** monitors. The API health routes already return
**HTTP 503 when unhealthy** (DB down → `/api/health` + `/api/health/db` 503;
Redis down → `/api/health/redis` 503) and **200** when ok, so a plain HTTP
monitor (alert on non-200 / timeout) is all you need — no keyword required.

| Monitor | URL |
|---|---|
| API liveness (+DB) | `https://api.crosscoin.in/api/health` |
| API + DB | `https://api.crosscoin.in/api/health/db` |
| API + Redis | `https://api.crosscoin.in/api/health/redis` |
| Crosscoin | `https://crosscoin.in` |
| Gripzus | `https://gripzus.com` |
| Morbix | `https://www.morbixsocks.com` |
| Soxbae | `https://www.soxbaesocks.com` |
| Knitwink | `https://knitwink.com` |
| Velmique | `https://velmique.com` |
| Velquira | `https://www.velquira.in` |

- Interval: 5 min. Alert contact: **email** (add a Slack/WhatsApp contact too if you want push).
- Optional extra on `/api/health`: a **Keyword** monitor with keyword `"status":"ok"`,
  "alert when NOT present" — catches a `degraded` (200-ish) state too. Not required.
- Bonus: the 5-min ping on `/api/health` keeps cPanel Passenger warm, helping the
  in-process queue worker stay alive.

### C. (Optional) queue-health monitor
UptimeRobot **Keyword** monitor on
`https://api.crosscoin.in/api/metrics?token=<YOUR_ADMIN_METRICS_TOKEN>` — but
keyword monitors can't do numeric thresholds, so this only catches the endpoint
being down. For real "failed jobs climbing" alerting, use a Better Stack heartbeat
(charts `integration_queue.counts`) — skip until Sentry + uptime are in place.

---

## Definition of done
- [x] `@sentry/node` wired on the backend (code shipped, no-op until DSN set)
- [x] Frontend Sentry wired via `@sentry/browser` + `SentryInit` in all 7 storefronts
- [ ] `SENTRY_DSN` set in cPanel env (or rely on baked-in) → verify via `/api/debug-sentry`
- [ ] Verify a frontend test error lands in the Next.js project (with `brand` tag)
- [ ] Sentry alert rules A (new-issue + spike) on both projects
- [ ] UptimeRobot monitors B (3 API + 7 storefronts), alerting to email
- [ ] (Optional) metrics/queue-health monitor C
