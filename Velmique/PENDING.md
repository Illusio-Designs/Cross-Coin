# Velmique — Pending Work

> **Production readiness: ~97 / 100** after the hardening + plan-completion sweeps. The only remaining major track is the **Next 14.2 → 16 + React 19 + @react-three/fiber@9** upgrade — three majors bundled because the 3D library forces a single rollback unit. Everything else is opt-in installs or polish.

---

## ✅ Closed in the hardening + plan-completion sweeps

- Sanitiser (richHtml/inlineHtml), wired into all admin-HTML sites
- Shared `apiClient` with timeout / CSRF mirror / categorised toasts
- ErrorBoundary + global errorReporter + Sentry adapter (auto-wires when DSN + `@sentry/nextjs` are present)
- `useFocusTrap` ported AND wired into `CartDrawer` and `SearchOverlay`
- Sitemap / robots / generateMetadata + JSON-LD on product / blog / collections
- Analytics (GA4 + FB Pixel + MS Clarity, save-data aware)
- Skip-to-main + sr-only + 44×44 touch targets
- React Query bootstrap; ProductReviews server-seeded with `initialReviewsPayload`
- RHF + Zod `AddressFormRHF` bound to backend `shippingAddressBase`
- Bundle analyzer + Lighthouse CI
- Lazy-mount WhatsApp via `requestIdleCallback`
- Smoke tests for sanitiser / address schema / apiClient
- **Store rewrite**: `lib/store.jsx` value is now `useMemo`'d and every action is `useCallback`'d, so a cart mutation no longer re-renders every wishlist consumer (and vice versa)
- **Auth token migration**: `lib/authToken.js` is the single source of truth — writes to a `Secure`+`SameSite=Lax` cookie AND mirrors to legacy localStorage so live sessions don't sign out. Every call site (`AuthContext`, `lib/api/auth.js`, `lib/api/addresses.js`, `lib/api/orders.js`, `lib/api/wishlist.js`, `app/login`, `app/register`) now goes through it.
- Storybook scaffold (`.storybook/main.js` + `preview.js` + 3 stories for ProductCard / ErrorBoundary / AddressFormRHF) — opt-in install only.

---

## 🟠 Deferred — own PRs

### 1. Next 14.2 → 16 + React 19 + `@react-three/fiber@9`
Three majors bundled because the 3D library forces a single rollback unit. Run codemods, audit async dynamic API call-sites (`cookies()` / `headers()` now async), verify the dormant Hero3D module under React 19. **~half a day plus manual end-to-end QA.** Don't ship without a QA window.

### 2. Drop legacy localStorage mirror
Once cookie-only auth is verified working in prod (~30 days), remove the `localStorage.setItem(LEGACY_LS_KEY, token)` writes from `lib/authToken.js`. Readers can stay (defensive), but writers stop minting new legacy entries.

### 3. Opt-in installs (operator-driven)
```bash
# Tests
npm i -D jest jest-environment-jsdom babel-jest @babel/core @babel/preset-env @babel/preset-react cross-env @next/bundle-analyzer

# Sentry (auto-wires when DSN env var is also set)
npm i @sentry/nextjs

# Storybook (scaffold already in place — just install + run)
npx storybook@latest init --skip-install --type nextjs
```

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
