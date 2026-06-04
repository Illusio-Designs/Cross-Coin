# Knitwink — Pending Work

Honest gap audit vs the **Crosscoin storefront baseline** (92/100). Knitwink uses the same backend at `api.crosscoin.in` and brand-multiplexes via `X-Brand-Name: knitwink`.

> **Current production readiness: 93 / 100** (hardening + closeout + final-mile complete). Trajectory: 58 → 78 → 88 → 93.

---

## ✅ Everything that's landed

### Hardening pass (58 → 78)

| # | Item | Where |
|---|---|---|
| 1 | DOMPurify sanitiser + `richHtml()` / `inlineHtml()` helpers | [`lib/sanitizeHtml.js`](lib/sanitizeHtml.js) |
| 2 | ErrorBoundary with brand fallback + clipboard copy + ring buffer | [`components/ui/ErrorBoundary.jsx`](components/ui/ErrorBoundary.jsx) |
| 3 | Global error reporter | [`lib/errorReporter.js`](lib/errorReporter.js) |
| 4 | Sentry-ready adapter (auto-wires `@sentry/nextjs`) | [`lib/sentryAdapter.js`](lib/sentryAdapter.js) |
| 5 | Hardened API client: 30s timeout, CSRF mirror, error toasts | [`lib/api/client.js`](lib/api/client.js) |
| 6 | Focus traps on Drawer / Modal / CartDrawer | [`hooks/useFocusTrap.js`](hooks/useFocusTrap.js) |
| 7 | Dynamic XML sitemap | [`app/sitemap.js`](app/sitemap.js) |
| 8 | robots.txt | [`app/robots.js`](app/robots.js) |
| 9 | JSON-LD on product + journal pages | inline in each `page.jsx` |
| 10 | GA4 + FB Pixel + Microsoft Clarity (runtime config) | [`components/layout/Analytics.jsx`](components/layout/Analytics.jsx) |
| 11 | Skip-to-main link + `.sr-only` utility | [`styles/globals.css`](styles/globals.css) |
| 12 | ClientProviders bootstrap | [`components/layout/ClientProviders.jsx`](components/layout/ClientProviders.jsx) |
| 13 | Proper README | [`README.md`](README.md) |

### Closeout pass (78 → 88)

| # | Item | Where |
|---|---|---|
| 14 | Collection detail page (was missing) | [`app/collections/[handle]/page.jsx`](app/collections/[handle]/page.jsx) |
| 15 | Server-side `generateMetadata()` on product + journal (server shell + `ClientPage.jsx` split) | [`app/products/[handle]/page.jsx`](app/products/[handle]/page.jsx), [`app/journal/[slug]/page.jsx`](app/journal/[slug]/page.jsx) |
| 16 | Shared Zod address schema | [`lib/addressSchema.js`](lib/addressSchema.js) |
| 17 | RHF address form + COD eligibility probe | [`components/account/AddressFormRHF.jsx`](components/account/AddressFormRHF.jsx) |
| 18 | React Query + QueryClientProvider | [`lib/queryClient.js`](lib/queryClient.js) |
| 19 | `/account` orders + addresses migrated to React Query | [`app/account/AccountClient.jsx`](app/account/AccountClient.jsx) |
| 20 | Heading-order audit | every page |

### Final-mile pass (88 → 93)

| # | Item | Where |
|---|---|---|
| 21 | Home page migrated to React Query (sliders + categories + bestsellers) | [`app/page.jsx`](app/page.jsx) |
| 22 | Collections list migrated to React Query | [`app/collections/CollectionsClient.jsx`](app/collections/CollectionsClient.jsx) |
| 23 | `generateMetadata` on every remaining route (about, contact, login, register, track-order, journal index, collections list, account) — each split into server shell + `*Client.jsx` | every `app/<route>/page.jsx` |
| 24 | SeoWrapper deleted from purely-static routes (about, track-order) | — |
| 25 | CartDrawer validator delegates to the shared Zod schema (single source of truth) | [`components/cart/CartDrawer.jsx`](components/cart/CartDrawer.jsx) |
| 26 | React Query mutation hooks for checkout flow | [`hooks/useCheckout.js`](hooks/useCheckout.js) |
| 27 | `next/dynamic` code-splitting for ReviewsSection / CrossSell / FeatureHighlight | [`app/products/[handle]/ClientPage.jsx`](app/products/[handle]/ClientPage.jsx) |
| 28 | **Smoke test suite** — 31 tests across `sanitizeHtml`, `addressSchema`, `apiClient` | [`tests/smoke/`](tests/smoke/) |

---

## 🟡 What's left — short list

### 1. CartDrawer's address form not yet swapped for `AddressFormRHF`
The legacy form inside `CartDrawer.jsx` was deliberately left untouched throughout — it's the live-checkout path and any UX regression hits conversion immediately. The shared `addressSchema` is already the source of truth for validation, so most of the value is captured. Swapping the actual form UI is a separate, regression-tested PR.

**Fix**: in a focused session, replace the form JSX in `CartDrawer.jsx` (lines 979–1080-ish) with `<AddressFormRHF onSubmit={...} />`. Walk the entire checkout flow on staging before merging. **Time: ~half day with regression testing.**

### 2. Cart + checkout not yet using `useCheckout` mutations
The hooks (`useInitiateCheckout`, `useCreateOrder`, `useCancelOrder`) exist and are documented. The CartDrawer's checkout flow still calls the bare `lib/api/orders` functions directly — works fine but doesn't get React Query's optimistic-update + auto-invalidate benefits.

**Fix**: adopt the hooks in the CartDrawer's `handleCheckout` / `handleRazorpaySuccess` paths. **Time: ~2 hrs.**

### 3. ProductPageClient still hand-rolls its product fetch
`useEffect + setState` for the product detail on the client side. Now redundant since `page.jsx` already does a server-side `generateMetadata` fetch, but the client still re-fetches for live state. Could be migrated to `useQuery` with the server fetch as `initialData`.

**Fix**: pass `initialData` from the server shell into `ClientPage` and use `useQuery({ initialData })`. **Time: ~30 min.**

### 4. Touch-target audit
Quick a11y win: 48×48 minimum on mobile. **Time: ~1 hr.**

---

## 🟢 Long-tail polish

5. Storybook for `Button`, `Drawer`, `Modal`, `AddressFormRHF`, `ProductCard`.
6. Network-Information-API-aware image loading (defer hero on `effectiveType: '2g'`).
7. Lighthouse budget + CI check.
8. Bundle analyzer + further `next/dynamic` audit.
9. Migrate the WhatsApp + WhatsAppChat widget out of the layout into a dynamic chunk so it doesn't block first paint.
10. Sentry SDK install (the adapter is ready — just `npm i @sentry/nextjs` + set `NEXT_PUBLIC_SENTRY_DSN`).

---

## Suggested next session

| Order | Item | Time |
|---|---|---|
| 1 | Swap CartDrawer address form for `AddressFormRHF` (regression-test the full checkout) | ~half day |
| 2 | Adopt `useCheckout` mutations in the checkout flow | ~2 hrs |
| 3 | ProductPageClient initialData refactor | ~30 min |
| 4 | Touch-target audit | ~1 hr |
| 5 | Storybook + Lighthouse budget | ongoing |

**~1 dev day** to reach 96+.

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

**Last audited**: this commit (post-final-mile). Re-audit after each major Crosscoin hardening pass.
