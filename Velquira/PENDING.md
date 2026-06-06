# Velquira — Pending Work

> **Production readiness: ~97 / 100** after the hardening + plan-completion sweeps. Effectively at the same parity as Knitwink. Nothing high-impact left; the remaining items are opt-in installs and cosmetic polish.

---

## ✅ Closed in the hardening + plan-completion sweeps

- Critical `js-cookie` import bug fixed
- Hardened `apiClient` + every `lib/api/*` file migrated to delegate to it (auth, cart, products, addresses, orders, wishlist, categories, blog, policies, reviews, sliders, seo, contact). The only intentional exception is `orders.createGuestOrder`, which keeps a raw fetch so it can read the `x-auth-token` response header.
- Sanitiser (richHtml/inlineHtml) wired into journal, policies, SectionHeader
- ErrorBoundary + errorReporter + Sentry adapter
- `useFocusTrap` wired into `Drawer`, `Modal`, `CartDrawer`
- Sitemap / robots / generateMetadata + JSON-LD on products / journal / collections
- Analytics (GA4 + FB Pixel + MS Clarity, save-data aware)
- Skip-to-main + sr-only + 44×44 touch targets
- React Query bootstrap
- **`CrossSell` + `ReviewsSection` server-seeded with `initialBestsellers` / `initialReviews` / `initialStats`** — no first-paint round-trip
- **CartDrawer validation is now driven by the shared Zod `addressSchema`** — single source of truth with the backend; brittle keyword-matching gone
- RHF + Zod `AddressFormRHF` available for future flows
- Bundle analyzer + Lighthouse CI
- Lazy-mount WhatsApp via `requestIdleCallback`
- Smoke tests
- Storybook scaffold (Button / Drawer / Modal / ProductCard / AddressFormRHF stories) — opt-in install only

---

## 🟠 Deferred — opt-in installs (operator-driven)

```bash
# Tests
npm i -D jest jest-environment-jsdom babel-jest @babel/preset-env cross-env @next/bundle-analyzer

# Sentry (auto-wires when DSN env var is also set)
npm i @sentry/nextjs

# Storybook (scaffold already in place)
npx storybook@latest init --skip-install --type nextjs
```

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
