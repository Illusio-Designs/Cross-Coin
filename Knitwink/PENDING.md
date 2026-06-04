# Knitwink — Pending Work

Honest gap audit vs the **Crosscoin storefront baseline** (92/100 production-ready). Knitwink uses the same backend at `api.crosscoin.in` and brand-multiplexes via `X-Brand-Name: knitwink`.

> **Current production readiness: 88 / 100** (post-hardening + closeout). Initial sweep took the score from 58 → 78; the closeout pass took it from 78 → 88 by:
> - Creating the previously-missing `/collections/[handle]/page.jsx`.
> - Migrating `/products/[handle]` + `/journal/[slug]` to server-side `generateMetadata`.
> - Shipping the shared Zod address schema + `AddressFormRHF` with built-in COD eligibility probe.
> - Installing React Query + migrating `/account` orders + addresses.
> - Heading-order audit (every page now has exactly one h1).

---

## ✅ What landed in the hardening sweep

| # | Item | Where |
|---|---|---|
| 1 | DOMPurify sanitiser + `richHtml()` / `inlineHtml()` helpers | [`lib/sanitizeHtml.js`](lib/sanitizeHtml.js) — applied at all 4 call sites |
| 2 | ErrorBoundary with brand fallback + clipboard copy + ring buffer | [`components/ui/ErrorBoundary.jsx`](components/ui/ErrorBoundary.jsx) |
| 3 | Global error reporter | [`lib/errorReporter.js`](lib/errorReporter.js) |
| 4 | Sentry-ready adapter (auto-wires `@sentry/nextjs`) | [`lib/sentryAdapter.js`](lib/sentryAdapter.js) |
| 5 | Hardened API client: 30s timeout, CSRF mirror, error toasts | [`lib/api/client.js`](lib/api/client.js) |
| 6 | Focus traps on Drawer / Modal / CartDrawer | [`hooks/useFocusTrap.js`](hooks/useFocusTrap.js) |
| 7 | Dynamic XML sitemap | [`app/sitemap.js`](app/sitemap.js) |
| 8 | robots.txt with public/private split | [`app/robots.js`](app/robots.js) |
| 9 | JSON-LD on product + journal pages | inline in each `page.jsx` |
| 10 | GA4 + FB Pixel + Microsoft Clarity (runtime config) | [`components/layout/Analytics.jsx`](components/layout/Analytics.jsx) |
| 11 | Skip-to-main link + `.sr-only` utility | [`styles/globals.css`](styles/globals.css) + `app/layout.jsx` |
| 12 | ClientProviders bootstrap wrapper | [`components/layout/ClientProviders.jsx`](components/layout/ClientProviders.jsx) |
| 13 | Proper README replacing the create-next-app scaffold | [`README.md`](README.md) |

## ✅ What landed in the closeout pass

| # | Item | Where |
|---|---|---|
| 14 | **Collection detail page** — server component with `generateMetadata`, `generateStaticParams`, `CollectionPage` + `BreadcrumbList` JSON-LD | [`app/collections/[handle]/page.jsx`](app/collections/[handle]/page.jsx) |
| 15 | **Server-side `generateMetadata()`** on product + journal — each route split into a server shell + `ClientPage.jsx`. Social-share scrapers (Twitter, FB, LinkedIn, Slack) now see real meta tags without running JS | [`app/products/[handle]/page.jsx`](app/products/[handle]/page.jsx) + [`app/journal/[slug]/page.jsx`](app/journal/[slug]/page.jsx) |
| 16 | **Shared Zod address schema** mirroring the backend route | [`lib/addressSchema.js`](lib/addressSchema.js) |
| 17 | **`AddressFormRHF`** — RHF + Zod form with built-in `/api/orders/check-address-quality` probe (debounced 600ms on pincode + phone) that surfaces COD eligibility inline | [`components/account/AddressFormRHF.jsx`](components/account/AddressFormRHF.jsx) |
| 18 | **React Query** installed + `QueryClientProvider` wrapped in `ClientProviders` | [`lib/queryClient.js`](lib/queryClient.js) |
| 19 | **`/account` migrated to React Query** — orders + addresses from `useQuery`; mutations invalidate via `queryClient.invalidateQueries` | [`app/account/page.jsx`](app/account/page.jsx) |
| 20 | **Heading-order audit** — every page now has exactly one `<h1>`. `app/page.jsx` (home) gets a visually-hidden h1; cart / wishlist / contact verified to already have one in their client wrappers | [`app/page.jsx`](app/page.jsx) |

---

## 🟡 MEDIUM — what's left

### 1. Remaining pages still use legacy `useEffect + useState` for fetches
Migrated: `/account`. Still on the legacy pattern: `/` (home — sliders, categories, bestsellers), `/collections` (categories list), search, contact form submit, journal index.

**Fix**: page-by-page migrate to `useQuery` / `useMutation`. Pattern is now established. **Time: ~2-3 hrs.**

### 2. CartDrawer still uses hand-rolled validation
The legacy address form inside `components/cart/CartDrawer.jsx` was deliberately left untouched in the hardening pass to avoid changing live checkout behaviour. The new `AddressFormRHF` is ready when you want to swap it.

**Fix**: replace the cart-drawer address sub-form with `<AddressFormRHF onSubmit={...} />`. Test the full checkout flow after. **Time: ~2 hrs.**

### 3. SeoWrapper still in use
Each page still calls `<SeoWrapper pageName="..." />` which updates `document.head` client-side. The product + collection + journal routes now ALSO have server-side `generateMetadata`, so `SeoWrapper` is a redundant fallback for them. It's still genuinely useful on static routes like `/about`, `/contact` until those also get server metadata.

**Fix**: add `generateMetadata` to the remaining static routes (about, contact, cart, account, wishlist, search, track-order, policies index). Then delete `SeoWrapper`. **Time: ~2 hrs.**

### 4. `cart` + `checkout` not migrated to React Query
Cart state is in Zustand; checkout state is local. They'd benefit from React Query's optimistic updates + retry semantics on the create-order / payment flow.

**Fix**: incremental — wrap the checkout submit in `useMutation` first, then move the cart to a query/mutation pair. **Time: ~half day.**

---

## 🟢 LOW — long-tail polish

### 5. No design-system primitives
Each page rolls its own header / panel / stat tile.

### 6. No tests
Zero test files. At minimum, add smoke tests for `lib/api/client.js` and `lib/sanitizeHtml.js`.

### 7. `next/dynamic` audit
If perf becomes an issue, code-split `ReviewsSection`, `CrossSell`, and any future heavy components.

### 8. Touch-target audit
Quick a11y win: 48×48 minimum on mobile.

### 9. Network-Information-API-aware image loading
Defer hero images on `effectiveType: '2g'`.

---

## Suggested execution order

| Order | Item | Time |
|---|---|---|
| 1 | Migrate home / collections / search to React Query | ~2-3 hrs |
| 2 | Swap CartDrawer's address sub-form for AddressFormRHF | ~2 hrs |
| 3 | `generateMetadata` on remaining static routes; delete SeoWrapper | ~2 hrs |
| 4 | Smoke tests for client + sanitiser + form schema | ~2 hrs |
| 5 | Design-system primitives + touch-target audit | ongoing |

**Total: ~1 dev day** to reach 93+.

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

**Last audited**: this commit (post-closeout). Re-audit after each major Crosscoin hardening pass.
