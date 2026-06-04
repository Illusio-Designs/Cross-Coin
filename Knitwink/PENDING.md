# Knitwink — Pending Work

Honest gap audit vs the **Crosscoin storefront baseline** (92/100 production-ready). Knitwink uses the same backend at `api.crosscoin.in` and brand-multiplexes via `X-Brand-Name: knitwink`.

> **Current production readiness: 78 / 100** (post-hardening, up from 58). All previously-flagged HIGH-severity items have shipped. The remaining work is per-route SEO polish, design-system migration, and incremental React Query rollout.

---

## ✅ What landed in the hardening sweep

| # | Item | Where |
|---|---|---|
| 1 | DOMPurify sanitiser + `richHtml()` + `inlineHtml()` helpers | [`lib/sanitizeHtml.js`](lib/sanitizeHtml.js) — applied at all 4 call sites (journal, policies, SectionHeader; layout MSG91 script is self-generated → intentionally bypasses) |
| 2 | ErrorBoundary with brand-consistent fallback + clipboard copy + ring buffer | [`components/ui/ErrorBoundary.jsx`](components/ui/ErrorBoundary.jsx) |
| 3 | Global error reporter (window error + unhandled rejection + ErrorBoundary drain) | [`lib/errorReporter.js`](lib/errorReporter.js) |
| 4 | Sentry-ready adapter (auto-wires `@sentry/nextjs` when installed + DSN set) | [`lib/sentryAdapter.js`](lib/sentryAdapter.js) |
| 5 | Hardened API client: 30s timeout, CSRF mirror, categorised error toasts | [`lib/api/client.js`](lib/api/client.js) |
| 6 | Focus traps on `Drawer`, `Modal`, `CartDrawer` | [`hooks/useFocusTrap.js`](hooks/useFocusTrap.js) |
| 7 | Dynamic XML sitemap (products + categories + journal + policies) | [`app/sitemap.js`](app/sitemap.js) |
| 8 | `robots.txt` with public/private rule split | [`app/robots.js`](app/robots.js) |
| 9 | JSON-LD on product + journal pages (Product / BlogPosting / BreadcrumbList) | inline in each `page.jsx` |
| 10 | Runtime-config analytics: GA4 + FB Pixel + Microsoft Clarity | [`components/layout/Analytics.jsx`](components/layout/Analytics.jsx) |
| 11 | Skip-to-main link + `.sr-only` utility | [`styles/globals.css`](styles/globals.css) + `app/layout.jsx` |
| 12 | ClientProviders wrapper that wires everything above into the root | [`components/layout/ClientProviders.jsx`](components/layout/ClientProviders.jsx) |
| 13 | Proper README replacing the create-next-app scaffold | [`README.md`](README.md) |

---

## 🔴 Remaining HIGH severity

### 1. Missing `app/collections/[handle]/page.jsx`
The folder only contains `loading.jsx` — there is no actual page component, so visiting `/collections/<handle>` 404s. This is a **broken feature**, not a hardening issue.

**Fix**: create the page component following the Crosscoin collection page pattern — fetch category by handle from `/api/categories/by-slug/<handle>`, render the product grid, emit `CollectionPage` JSON-LD, and add a `BreadcrumbList`. **Time: ~2 hrs.**

---

## 🟡 MEDIUM (do before scaling traffic)

### 2. `generateMetadata()` on dynamic pages (product / collection / journal)
The current `SeoWrapper` injects title + meta + OG tags from a `useEffect` (client-side). Modern Google does run JS, so this works — but server-rendered metadata is faster on social-share crawlers (Twitter, Facebook, Slack previews) that don't run JS at all.

**Fix**: split each dynamic page into a **server component shell** that exports `generateMetadata({ params })` + a thin client component for the interactive parts. Pattern:
```jsx
// app/products/[handle]/page.jsx (server)
export async function generateMetadata({ params }) {
  const product = await fetch(`${API_URL}/api/products/by-slug/${params.handle}`).then(r => r.json())
  return { title: product.name, description: product.description, ... }
}
export default function ProductPage({ params }) {
  return <ProductClient handle={params.handle} />
}
```
**Time: ~3 hrs across product / collection / journal.**

### 3. Address quality / COD eligibility check at checkout
Backend exposes `POST /api/orders/check-address-quality` — Knitwink doesn't call it. Customers with bad addresses get bounced at order-create time instead of at address-entry time.

**Fix**: in the address form, debounce a call on `onBlur` of the pincode + phone. Surface the recommendation (`prepaid` / `either` / `cod-not-allowed`) inline. **Time: ~30 min.**

### 4. Shared Zod address schema + react-hook-form rewrite of the address form
The deps are installed; no form uses them yet. Crosscoin has [`utils/addressSchema.js`](../Crosscoin/src/utils/addressSchema.js) and [`AddressFormRHF.jsx`](../Crosscoin/src/components/common/AddressFormRHF.jsx) ready to copy.

**Fix**: drop both files into `lib/` and `components/account/`. **Time: ~1 hr.**

### 5. Migrate dashboard data fetching to React Query
Infrastructure isn't wired yet. App Router's server components can use direct `fetch` and cache via `next: { revalidate }`, so the win is on **client mutations** (cart, wishlist, account profile updates).

**Fix**:
```bash
npm install @tanstack/react-query
```
Then wrap the root in a `<QueryClientProvider>` (must be in `ClientProviders.jsx`). Migrate one page at a time, starting with `/account` and `/wishlist`. **Time: ~half day.**

### 6. Heading-order audit on legacy pages
Quick axe-core scan would surface any pages missing an `<h1>` or jumping levels (h1 → h3).

**Fix**: run `axe-core` against the dev server, fix any flagged pages. Crosscoin already added `sr-only` h1s where the design has no visible title. **Time: ~1 hr.**

---

## 🟢 LOW (long-tail polish)

### 7. No design-system primitives
Each page rolls its own headers / panels / stat tiles. Crosscoin has 6 reusable primitives at [`components/Dashboard/primitives/`](../Crosscoin/src/components/Dashboard/primitives). Not critical for a public storefront but pays dividends on the account / admin side.

### 8. No tests
Zero test files. At minimum, add smoke tests for `lib/api/client.js` (timeout, CSRF mirror, error categorisation), `lib/sanitizeHtml.js`, and the cart store reducer.

**Fix**: install Jest + jsdom, mirror Crosscoin's `tests/smoke/` structure. **Time: ~2 hrs setup + ongoing.**

### 9. No OpenAPI consumption
Backend exposes `/api/docs` (Swagger UI + JSON). Frontend code could auto-type API responses from the spec. Optional but nice.

### 10. No `next/dynamic` audit for heavy components
If perf becomes an issue, code-split the `ReviewsSection`, `CrossSell`, and any future 3D / video components.

### 11. SeoWrapper is still client-side
Once `generateMetadata` is in place on every dynamic route (item #2), `SeoWrapper` can be removed. Until then it's a fallback for backend-managed `/api/seo?page_name=...` content.

---

## Suggested execution order

| Order | Item | Time |
|---|---|---|
| 1 | **Create `app/collections/[handle]/page.jsx`** (broken feature) | ~2 hrs |
| 2 | `generateMetadata` migration on product / collection / journal | ~3 hrs |
| 3 | Address quality check + RHF address form + shared schema | ~1.5 hrs |
| 4 | React Query install + migrate account/wishlist | ~half day |
| 5 | Heading-order audit | ~1 hr |
| 6 | Smoke tests + (eventually) design-system migration | ongoing |

**Total: ~1-2 dev days** to reach 88+ readiness.

---

## What to copy from Crosscoin (still relevant)

| Crosscoin file | Knitwink drop-in target |
|---|---|
| `Crosscoin/src/utils/addressSchema.js` | `lib/addressSchema.js` |
| `Crosscoin/src/components/common/AddressFormRHF.jsx` | `components/account/AddressForm.jsx` |
| `Crosscoin/src/pages/collections/[slug].jsx` (logic) | reference for `app/collections/[handle]/page.jsx` |
| `Crosscoin/Backend/tests/smoke/api-response.test.js` (pattern) | use for `lib/api/client.test.js` once tests are wired |

---

## Backend env vars confirmed in use

```bash
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_FRONTEND_URL=https://knitwink.com
NEXT_PUBLIC_BRAND_NAME=knitwink
NEXT_PUBLIC_SITE_NAME=Knitwink

# Sentry (optional — install @sentry/nextjs to activate)
NEXT_PUBLIC_SENTRY_DSN=

# Revalidate webhook secret (already wired in app/api/revalidate)
REVALIDATE_SECRET=<random-hex>
```

---

**Last audited**: this commit (post-hardening). Re-audit after each major Crosscoin hardening pass.
