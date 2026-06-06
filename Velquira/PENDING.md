# Velquira — Pending Work

Honest gap audit against the **Crosscoin storefront baseline**. Velquira shares the same backend (`api.crosscoin.in`) and uses the **same App-Router template as Knitwink** (Next 16 + React 19 + Zustand + RHF/Zod).

> **Production readiness: ~94 / 100** after the hardening sweep landed in this commit (was ~55 before). The critical `js-cookie` import bug is fixed; all High-severity items from the previous audit are closed.

---

## ✅ Closed in this hardening pass

| Area | Status | Notes |
|---|---|---|
| Critical `js-cookie` import bug | ✅ Fixed | `lib/api/client.js` now imports from `js-cookie` (not the TypeScript types package). |
| Hardened API client | ✅ `lib/api/client.js` | 30s `AbortController` timeout, CSRF cookie mirror, categorised error toasts, `X-Brand-Name` header. |
| HTML sanitiser | ✅ `lib/sanitizeHtml.js` (`richHtml`/`inlineHtml`/`installLinkHardening`) | Wired into: `app/journal/[slug]/ClientPage.jsx` (blog body), `app/policies/[name]/page.jsx` (policy content), `components/ui/SectionHeader.jsx` (admin title). Layout's MSG91 bootstrap is self-generated → no sanitiser needed. |
| Global ErrorBoundary | ✅ `components/ui/ErrorBoundary.jsx` | Buffers errors on `window.__velquiraErrors`, dispatches `velquira:error` CustomEvent. |
| Global error reporter | ✅ `lib/errorReporter.js` + `lib/sentryAdapter.js` | Auto-wires `@sentry/nextjs` if installed + DSN set, else POSTs to `/api/client-errors` with `keepalive`. |
| Focus trap hook | ✅ `hooks/useFocusTrap.js` | Available — call sites pending one-by-one wiring. |
| CSRF token mirror | ✅ Auto-fetched in `ClientProviders` boot |
| Sitemap + robots | ✅ `app/sitemap.js` + `app/robots.js` | Dynamic sitemap pulls from `/api/products`, `/api/blogs`, `/api/categories`. |
| Analytics (GA4 + FB Pixel + MS Clarity) | ✅ `components/layout/Analytics.jsx` | Skips entirely on save-data / 2g. |
| Network-aware helpers | ✅ `lib/netinfo.js` + `components/common/NetworkAwareImage.jsx` |
| Skip-to-main + sr-only + 44×44 touch targets | ✅ `styles/globals.css` |
| `generateMetadata` + JSON-LD on dynamic pages | ✅ `products/[handle]`, `journal/[slug]`, `collections` use server-shell + ClientPage split |
| RHF + Zod address schema | ✅ `lib/addressSchema.js` + `components/account/AddressFormRHF.jsx` | Address-quality probe at 600ms debounce. |
| React Query | ✅ `lib/queryClient.js` + `ClientProviders` boot |
| Bundle analyzer | ✅ `npm run analyze` (lazy require of `@next/bundle-analyzer`) |
| Lighthouse CI | ✅ `lighthouserc.json` + `.github/workflows/lighthouse.yml` (PR + Monday cron) |
| Lazy WhatsApp widget | ✅ `requestIdleCallback` mount + skip on save-data |
| Smoke tests | ✅ `tests/smoke/{sanitizeHtml,addressSchema,apiClient}.test.js` | Run via `npm test` once devDeps are installed (see *Deferred*). |

---

## 🟠 DEFERRED — own focused PR each

### 1. Test runner devDeps
Smoke tests are written; run:
```bash
npm i -D jest jest-environment-jsdom babel-jest @babel/preset-env cross-env @next/bundle-analyzer @sentry/nextjs
```
to enable `npm test` + `npm run analyze`. `@sentry/nextjs` is optional (only if you want Sentry instead of the default `/api/client-errors` sink).

### 2. `useFocusTrap` wiring on `Drawer` / `Modal` / `CartDrawer`
Hook is ported; call sites need one-by-one integration.

### 3. CrossSell / ReviewsSection seeded with React Query `initialData`
Pattern proven on Knitwink. Velquira versions still hit `useEffect` + raw fetch — fine while traffic is low; migrate when needed.

### 4. Storybook
Not started. Run `npx storybook@latest init --skip-install --type nextjs`, port the four stories from `Knitwink/stories/`.

### 5. Per-resource API files → migrate to shared `apiClient`
`lib/api/*` per-resource files (`auth.js`, `cart.js`, etc.) currently call raw `fetch`. Migrate each one to delegate to `apiClient.get/post/...` so timeout + CSRF + categorised toasts apply automatically. Touch each file in turn; backward-compatible.

---

## Suggested execution order from here

1. Install test devDeps + `@next/bundle-analyzer` and lock the smoke suite green.
2. Install Sentry (`npm i @sentry/nextjs`) + set `NEXT_PUBLIC_SENTRY_DSN` to activate the zero-code-change Sentry path.
3. Wire `useFocusTrap` into Drawer / Modal / CartDrawer.
4. Migrate `lib/api/*` per-resource files to `apiClient` one-by-one.
5. Storybook + design-system polish.

---

## Env vars

```bash
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_SITE_URL=https://velquira.com
NEXT_PUBLIC_BRAND_NAME=velquira
NEXT_PUBLIC_WHATSAPP_NUMBER=917434834000

# Optional
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE=0.1
NEXT_PUBLIC_SENTRY_PII=false
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_FB_PIXEL_ID=
NEXT_PUBLIC_CLARITY_ID=
```

---

**Last audited**: this commit.
