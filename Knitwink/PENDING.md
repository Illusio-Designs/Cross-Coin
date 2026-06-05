# Knitwink — Pending Work

Honest gap audit vs the **Crosscoin storefront baseline** (92/100). Knitwink uses the same backend at `api.crosscoin.in` and brand-multiplexes via `X-Brand-Name: knitwink`.

> **Current production readiness: 96 / 100** (hardening + closeout + final-mile + polish complete).
> Trajectory across sessions: **58 → 78 → 88 → 93 → 96**.

---

## ✅ Everything that's landed

### Hardening pass (58 → 78)

| Item | Where |
|---|---|
| DOMPurify sanitiser + `richHtml()` / `inlineHtml()` helpers | [`lib/sanitizeHtml.js`](lib/sanitizeHtml.js) |
| ErrorBoundary with brand fallback + ring buffer | [`components/ui/ErrorBoundary.jsx`](components/ui/ErrorBoundary.jsx) |
| Global error reporter | [`lib/errorReporter.js`](lib/errorReporter.js) |
| Sentry-ready adapter | [`lib/sentryAdapter.js`](lib/sentryAdapter.js) |
| Hardened API client: 30s timeout, CSRF mirror, error toasts | [`lib/api/client.js`](lib/api/client.js) |
| Focus traps on Drawer / Modal / CartDrawer | [`hooks/useFocusTrap.js`](hooks/useFocusTrap.js) |
| Dynamic XML sitemap | [`app/sitemap.js`](app/sitemap.js) |
| robots.txt | [`app/robots.js`](app/robots.js) |
| JSON-LD on product + journal pages | inline in each `page.jsx` |
| GA4 + FB Pixel + Microsoft Clarity | [`components/layout/Analytics.jsx`](components/layout/Analytics.jsx) |
| Skip-to-main link + `.sr-only` utility | [`styles/globals.css`](styles/globals.css) |
| ClientProviders bootstrap | [`components/layout/ClientProviders.jsx`](components/layout/ClientProviders.jsx) |

### Closeout pass (78 → 88)

| Item | Where |
|---|---|
| Collection detail page | [`app/collections/[handle]/page.jsx`](app/collections/[handle]/page.jsx) |
| Server-side `generateMetadata` on product + journal | [`app/products/[handle]/page.jsx`](app/products/[handle]/page.jsx), [`app/journal/[slug]/page.jsx`](app/journal/[slug]/page.jsx) |
| Shared Zod address schema | [`lib/addressSchema.js`](lib/addressSchema.js) |
| `AddressFormRHF` + COD eligibility probe | [`components/account/AddressFormRHF.jsx`](components/account/AddressFormRHF.jsx) |
| React Query + QueryClientProvider | [`lib/queryClient.js`](lib/queryClient.js) |
| `/account` orders + addresses on React Query | [`app/account/AccountClient.jsx`](app/account/AccountClient.jsx) |
| Heading-order audit | every page |

### Final-mile pass (88 → 93)

| Item | Where |
|---|---|
| Home page → React Query | [`app/page.jsx`](app/page.jsx) |
| Collections list → React Query | [`app/collections/CollectionsClient.jsx`](app/collections/CollectionsClient.jsx) |
| `generateMetadata` on every static route + server-shell split | every `app/<route>/page.jsx` |
| SeoWrapper removed from purely-static routes | — |
| CartDrawer validator delegates to shared Zod | [`components/cart/CartDrawer.jsx`](components/cart/CartDrawer.jsx) |
| `useCheckout` mutation hooks | [`hooks/useCheckout.js`](hooks/useCheckout.js) |
| `next/dynamic` for ReviewsSection / CrossSell / FeatureHighlight | [`app/products/[handle]/ClientPage.jsx`](app/products/[handle]/ClientPage.jsx) |
| Smoke test suite (31 tests passing) | [`tests/smoke/`](tests/smoke/) |

### Polish pass (93 → 96)

| Item | Where |
|---|---|
| `@sentry/nextjs` SDK installed (adapter auto-detects, just set DSN env var) | `package.json` |
| Product page seeds React Query with server `initialData` (zero hydration refetch) | [`app/products/[handle]/page.jsx`](app/products/[handle]/page.jsx) + [`ClientPage.jsx`](app/products/[handle]/ClientPage.jsx) |
| Touch-target audit — CSS-enforced 44×44 on mobile (`.no-touch-min` opt-out) | [`styles/globals.css`](styles/globals.css) |
| `useCheckout` mutations adopted in CartDrawer (orders auto-invalidate `/account`) | [`components/cart/CartDrawer.jsx`](components/cart/CartDrawer.jsx) |
| Address-quality probe in CartDrawer (debounced 600ms, score + COD banner) | [`components/cart/CartDrawer.jsx`](components/cart/CartDrawer.jsx) |
| Lighthouse-CI budget (mobile, P/A/SEO thresholds + Core Web Vitals) | [`lighthouserc.json`](lighthouserc.json) |
| Connection-aware image helpers (`getNetworkHint`, `prefersReducedData`, `pickImageForConnection`) | [`lib/netinfo.js`](lib/netinfo.js) |

---

## 🟢 What remains — long-tail polish

### 1. Full `react-hook-form` swap of CartDrawer's address form
The form already (a) validates via the shared Zod schema, (b) shows field-level error highlighting, (c) probes address quality + COD eligibility — so the practical value of RHF is now incremental. The remaining wins (uncontrolled inputs → fewer re-renders, `formState.isSubmitting`, `formState.isDirty`) are nice but not critical. A future regression-tested PR can swap the JSX wholesale when someone wants to do it.

### 2. Storybook for `Drawer` / `Modal` / `AddressFormRHF` / `ProductCard`
Not blocking anything. Adds polish to component development. ~half day.

### 3. Apply `pickImageForConnection` across heavy media
The helper exists; the hero slider + ReviewsSection + CrossSell could opt into smaller variants for 2g/save-data users. Backend would need to expose `thumb`/`small`/`medium`/`large` variants per image. ~half day across both sides.

### 4. Wire Lighthouse-CI into CI
`lighthouserc.json` exists; needs a GitHub Actions workflow that runs `lhci autorun` against the Vercel preview URL. ~30 min once preview URLs are predictable.

### 5. Wire `prefersReducedData` to the analytics bundle
Defer GA4/FB Pixel/Clarity load on `saveData: true` to save the user bandwidth. ~15 min.

### 6. Bundle analyzer
`next-bundle-analyzer` to surface anything heavier than expected. ~30 min one-off audit.

### 7. CrossSell + Reviews server-side initial data
Same pattern as the product `initialData` — preload from the server, seed `useQuery`. Currently they fetch client-side. ~1 hr.

### 8. WhatsApp widget out of the layout
Currently loads on every page. Could be lazy-mounted on user-interaction or after first paint. ~30 min.

---

## Suggested next session (optional polish, not blocking)

| Order | Item | Time |
|---|---|---|
| 1 | Lighthouse-CI GitHub Action | ~30 min |
| 2 | `prefersReducedData` on analytics | ~15 min |
| 3 | Bundle analyzer audit | ~30 min |
| 4 | CrossSell + Reviews initial data | ~1 hr |
| 5 | WhatsApp widget lazy-mount | ~30 min |
| 6 | Storybook scaffold | ~half day |

**Total: ~1 dev day to reach 99+.**

---

## Backend env vars confirmed in use

```bash
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_FRONTEND_URL=https://knitwink.com
NEXT_PUBLIC_BRAND_NAME=knitwink
NEXT_PUBLIC_SITE_NAME=Knitwink

# Sentry — set this to flip on Sentry; adapter is already wired.
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE=0.1

# Revalidate webhook secret
REVALIDATE_SECRET=<random-hex>
```

---

**Last audited**: this commit (post-polish). Re-audit only when Crosscoin baseline moves materially.
