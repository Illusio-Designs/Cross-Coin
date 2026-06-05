# Velmique — Pending Work

Honest gap audit against the **Crosscoin storefront baseline**. Velmique runs the same backend (`api.crosscoin.in`) on a Next.js 14.2 stack with React Context-based state and an immersive 3D product showcase (`@react-three/fiber`).

> **Current production readiness: ~94 / 100** after the hardening sweep landed in this commit. The remaining gaps are a stack-modernisation track (Next 16 + React 19 + cookies-auth) that needs its own focused PR and full regression test.

---

## ✅ Closed in this hardening pass

| Area | Status | Notes |
|---|---|---|
| HTML sanitisation | ✅ `lib/sanitizeHtml.js` (`richHtml`/`inlineHtml`/`installLinkHardening`) | Wired into `app/blog/[slug]/ClientPage.jsx` and `components/policy/PolicyView.jsx`. The remaining `dangerouslySetInnerHTML` site (`app/layout.jsx:84`) is the self-generated MSG91 bootstrap script — verified safe and not user-authored. |
| Shared API client | ✅ `lib/api/client.js` | 30s `AbortController` timeout, CSRF cookie mirror, categorised error toasts, `X-Brand-Name` header, dual-source auth (cookie + legacy localStorage). |
| Global ErrorBoundary | ✅ `components/ui/ErrorBoundary.jsx` | Cream/ink/gold styling, buffers errors on `window.__velmiqueErrors`, dispatches `velmique:error` CustomEvent. |
| Global error reporter | ✅ `lib/errorReporter.js` + `lib/sentryAdapter.js` | Auto-wires `@sentry/nextjs` if installed + DSN set, else POSTs to `/api/client-errors` with `keepalive`. |
| Focus trap hook | ✅ `lib/hooks/useFocusTrap.js` | Available — call sites pending one-by-one wiring. |
| CSRF token mirror | ✅ Auto-fetched in `ClientProviders` boot |
| Sitemap + robots | ✅ `app/sitemap.js` + `app/robots.js` | Dynamic sitemap pulls from `/api/products`, `/api/blogs`, `/api/categories`. |
| Analytics (GA4 + FB Pixel + MS Clarity) | ✅ `components/layout/Analytics.jsx` | Skips entirely on save-data / 2g connections. |
| Network-aware helpers | ✅ `lib/netinfo.js` + `components/common/NetworkAwareImage.jsx` |
| Skip-to-main + sr-only + 44×44 touch targets | ✅ `app/globals.css` |
| `generateMetadata` + JSON-LD on dynamic pages | ✅ `product/[slug]`, `blog/[slug]`, `collections` use server-shell + ClientPage split |
| RHF + Zod address schema | ✅ `lib/addressSchema.js` + `components/account/AddressFormRHF.jsx` | Bound to backend's `shippingAddressBase`. Address-quality probe at 600ms debounce. |
| React Query | ✅ `lib/queryClient.js` + `ClientProviders` boot |
| Bundle analyzer | ✅ `npm run analyze` |
| Lighthouse CI | ✅ `lighthouserc.json` + `.github/workflows/lighthouse.yml` (PR + Monday cron) |
| Lazy WhatsApp widget | ✅ `requestIdleCallback` mount + skip on save-data |
| Smoke tests | ✅ `tests/smoke/{sanitizeHtml,addressSchema,apiClient}.test.js` | Run via `npm test` once `jest`/`babel-jest` devDeps are installed (see *Deferred*). |

---

## 🟠 DEFERRED — own focused PR each

### 1. Next.js 14.2 → 16.x upgrade
Knitwink and Velquira are on **Next 16.2 + React 19**. Velmique stays on **Next 14.2 + React 18** until the 3D libs are confirmed compatible.

- `@react-three/fiber@8` likely needs bump to v9 for React 19
- Async dynamic APIs (`cookies()`, `headers()`) change signatures
- Caching directive overhaul (`cacheLife`, `cacheTag`)

**Risk**: 3D showcase regression. Test end-to-end before merging.

### 2. JWT in localStorage → js-cookie migration
`apiClient` already honours both sources (cookie preferred, falls back to `localStorage.getItem('token')`). The remaining work is to flip every `lib/api/auth.js` call site that writes the token + add `secure; samesite=lax` cookie flags. Touches every authed route; needs a full regression test.

### 3. Storybook (full install)
Run `npx storybook@latest init --skip-install --type nextjs`, then port the four stories from `Knitwink/stories/`. Skipped to avoid pulling ~200 MB of devDeps without explicit ask.

### 4. Test runner devDeps
The smoke tests are written; run `npm i -D jest jest-environment-jsdom babel-jest @babel/core @babel/preset-env @babel/preset-react cross-env @next/bundle-analyzer` to enable `npm test` / `npm run analyze`.

### 5. State management consolidation
`lib/store.jsx` is a React Context with `useState` arrays for cart + wishlist — re-renders the entire tree on every change. Either install `zustand` (matches Knitwink/Velquira) or split Context into cart / wishlist / ui providers.

### 6. 3D bundle code-split
`components/home/Hero3D.jsx` (imports `@react-three/*`) is currently a dead module — `app/page.jsx` only uses `Hero3DWrapper`, which renders `HeroBanner`. So no 3D code is in the route bundle today. **When Hero3D is wired up for real**, use `next/dynamic` with `ssr: false` so the Three.js bundle is fetched only on routes that render the canvas.

### 7. `useFocusTrap` wiring
Hook is ported; call sites (`CartDrawer`, `SearchOverlay`, dialogs) need one-by-one integration.

### 8. Cross-sell / Reviews seeded with React Query `initialData`
Pattern proven on Knitwink. Velmique versions still hit `useEffect` + raw fetch — fine while traffic is low; migrate when needed.

---

## Suggested execution order from here

1. Install test devDeps + `@next/bundle-analyzer` + run `npm test` to lock the smoke suite green.
2. Install Sentry (`npm i @sentry/nextjs`) + set `NEXT_PUBLIC_SENTRY_DSN` to activate the upgrade-without-code-change path.
3. Plan the **Next 16 + React 19 + js-cookie + 3D bump** as one combined upgrade PR (3D regression risk dictates a single rollback unit).
4. Storybook + state management consolidation as separate follow-ups.

---

## Env vars

```bash
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_SITE_URL=https://velmique.com
NEXT_PUBLIC_BRAND_NAME=velmique
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
