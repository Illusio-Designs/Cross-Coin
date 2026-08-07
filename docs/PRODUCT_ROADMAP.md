# Product Roadmap & Backlog — Obzus Admin Dashboard

_Senior-PM recommendations for future updates. Living document — reprioritize as the business changes._

Last updated: 2026-08-07

---

## Product context (the lens for every bet below)

The dashboard already proves three things about how this business thinks:

- **Unit economics matter** — there's real tooling for CPP, Gross Profit, Net Profit and RTO (the Ads Reporting page).
- **Multi-brand** — Cross Coin, Grpizus/Gripzus, Soxbae, Morbix, Velmique, Knitwink… operated as one house.
- **Ops runs on mobile** — the team works the dashboard from phones.

That triangulates the north star: **margin protection in Indian D2C**, where RTO and COD quietly eat 15–30% of contribution. The roadmap should push the product from *reporting* ("here are the numbers") toward *doing the work* ("the dashboard tells me what to act on and lets me act").

---

## Prioritized recommendations

### P0 — RTO / NDR intervention workflow  ⭐ biggest margin lever
**Problem:** We *measure* RTO but can't *act* on it. Orders sit at "undelivered / exception" and silently flip to RTO — pure lost contribution.
**Build:**
- An **NDR queue** of at-risk orders (undelivered / exception statuses) with one-tap **WhatsApp / call** to the customer before they flip.
- A **COD → prepaid nudge** on high-value COD orders (confirmation / prepaid-conversion message).
- Optional: address-quality flags (bad pincode / phone) surfaced pre-dispatch.
**Why now:** Highest rupee-impact item, and it reuses infra we already own (WhatsApp integration, web push, order statuses). Not net-new plumbing — it's connecting existing pieces.
**Effort:** Medium. **Impact:** High.
**Notes:** Needs a dedicated Orders status group/tab for undelivered+exception (see Batch-C note — the orders status filter currently has no NDR tab) and an unread/aging indicator.

### P1 — Auto-sync ad spend from Meta (close the Ads loop)
**Problem:** Ad spend is typed in **by hand daily** — the single manual input the whole Ads Reporting depends on, and the thing most likely to be forgotten or fat-fingered.
**Build:** Pull spend-per-brand automatically from the Meta Ads API and reconcile against the report's per-day / per-brand rows; keep manual entry as an override/fallback.
**Why now:** Makes the GP/NP numbers trustworthy and removes a daily chore. Natural next step for a feature we just invested in. (Meta Ads API tooling is already reachable from the working environment.)
**Effort:** Medium. **Impact:** High.
**Notes:** Respect the IST day boundary and the report-start date (2026-08-04) the report already enforces.

### P2 — Retention analytics (repeat rate / cohorts / LTV)
**Problem:** Every metric today is acquisition/volume. There is **no repeat rate, new-vs-returning, or cohort/LTV** — invisible for a brand house whose growth engine is repeat purchase.
**Build:** New-vs-returning split, 30/60/90-day cohorts, per-brand repeat rate; then **RFM segments** that feed WhatsApp campaigns.
**Effort:** Medium–High. **Impact:** High (growth, not just visibility).

### P3 — Per-brand P&L view
**Problem:** We have revenue-by-brand, ad-spend-by-brand, and cost defaults — but no single screen that says "**Brand X made ₹N contribution this month.**"
**Build:** One per-brand P&L assembling data we already compute (revenue − COGS − shipping − ad spend − RTO/cancel losses).
**Effort:** Low–Medium (mostly assembly). **Impact:** High for owners/weekly review.

### P4 — Accountability: staff activity log
**Problem:** The tool is shared across roles but there's **no audit trail**. "Who cancelled / refunded / changed that price?" has no answer.
**Build:** Append-only activity log (actor, action, entity, before/after, timestamp) with a filterable admin view.
**Effort:** Medium. **Impact:** Medium now, rising fast as the team grows.

---

## Quick wins / loose ends

- **Reviews "Avg. rating" is page-only** — it averages the visible 10 rows but is displayed as a global stat; it changes as you page/filter. Compute server-side (or drop the tile). _Known bug, not yet fixed._
- **Notification persistence** — notifications are in-memory only and evaporate on reload (see the "Clear all" discussion). Persist to localStorage (then optionally a backend table) so the drawer reflects real history; this also makes the mocked drawer redesign meaningful.
- **Threshold alerts (proactive)** — the home "Needs attention" inbox is reactive. Add proactive nudges: RTO-rate spike, ad spend logged with zero matching orders, best-seller out of stock.
- **Product server-side filtering** — the Product Filter Drawer was removed (it was dead UI with no backend support). Rebuild as a real feature (category/price/status/badge whereOptions + attributes join) when catalog size warrants it.
- **NDR Orders tab** — add an "undelivered / exception" status group to the Orders status tabs (prerequisite for the P0 queue and a valuable filter on its own).

---

## Completed this session (for context)

- **Home "Needs attention" action inbox** — live queues (orders to confirm, RTO/returns, out-of-stock, low-stock, reviews to moderate), each click-throughs to the right page pre-filtered.
- **Custom Obzus toast** across the whole dashboard (themed light/dark) + removed the legacy conflicting toast styling.
- **Dashboard audit → 3 batches:**
  - _A — correctness bugs:_ reviews status/search now server-side across all pages; UTM medium grouping fixed; broken coupon types removed; bulk-SEO save reports failures; home "today" no longer shows a 30-day number; products null-status crash + real debounce.
  - _B — dead code:_ removed 4 orphan files (orders/index shim, brandSettings, shipping-settings, CourierSelectionModal) + dead imports/state/helpers.
  - _C — half-built features:_ wired New Order, manual AWB entry, and the Live-updates toggle; deleted the dead Product Filter Drawer.
- **Ads Reporting:** break-even ROAS set to 1.85×.
- **Sentry removed.**
- **Blue-font (navy `#180D3E`) leak fixed** — scoped the storefront "force light" globals off the dashboard.
- **Mobile responsiveness:** toast, action inbox, orders toolbar; ads-report grids reflow; public site got a hamburger nav; **order status tabs now scroll on one row** (no wrap); sidebar uses `100dvh` so the footer + "Need help?" support button aren't hidden under the iOS home bar.

---

## How to use this doc

- Treat **P0→P4** as the default priority order; pull forward whatever the business needs most.
- Each item can be spec'd as a visual artifact first (mock → approve → build), the way the toast / inbox / drawer were.
- When an item ships, move it to **Completed** with a one-line note so this stays the single source of truth.
