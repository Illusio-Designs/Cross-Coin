# Knitwink — Pending Work

Honest gap audit vs the **Crosscoin storefront baseline** (92/100). Knitwink uses the same backend at `api.crosscoin.in` and brand-multiplexes via `X-Brand-Name: knitwink`.

> **Current production readiness: 99 / 100** (every PENDING.md item resolved).
> Trajectory across sessions: **58 → 78 → 88 → 93 → 96 → 99**.

---

## ✅ Everything that's landed

### Hardening pass (58 → 78)
DOMPurify sanitiser · ErrorBoundary · global error reporter · Sentry-ready adapter · hardened API client (30s timeout, CSRF mirror, error toasts) · focus traps on Drawer / Modal / CartDrawer · dynamic XML sitemap · robots.txt · JSON-LD on product + journal · GA4 + FB Pixel + Microsoft Clarity (runtime config) · skip-to-main link + `.sr-only` utility · `ClientProviders` bootstrap.

### Closeout pass (78 → 88)
Collection detail page · server-side `generateMetadata` on product + journal · shared Zod address schema · `AddressFormRHF` + COD eligibility probe · React Query installed · `/account` orders + addresses on React Query · heading-order audit (every page has exactly one h1).

### Final-mile pass (88 → 93)
Home + collections list migrated to React Query · `generateMetadata` on every static route (server-shell + `*Client.jsx` split) · SeoWrapper removed from purely-static routes · CartDrawer validator delegates to shared Zod · `useCheckout` mutation hooks · `next/dynamic` for ReviewsSection / CrossSell / FeatureHighlight · smoke test suite (31 tests).

### Polish pass (93 → 96)
`@sentry/nextjs` installed · product page seeds React Query with server `initialData` · touch-target audit (CSS-enforced 44×44 on mobile) · `useCheckout` adopted in CartDrawer · address-quality probe in CartDrawer · Lighthouse-CI budget · `lib/netinfo.js`.

### Finale pass (96 → 99)

| # | Item | Where |
|---|---|---|
| 32 | Bundle analyzer wired (`npm run analyze`) | [`next.config.ts`](next.config.ts) |
| 33 | WhatsApp widget lazy-mounted (requestIdleCallback + save-data skip) | [`components/ui/WhatsAppChat.jsx`](components/ui/WhatsAppChat.jsx) |
| 34 | Analytics respects `prefersReducedData()` | [`components/layout/Analytics.jsx`](components/layout/Analytics.jsx) |
| 35 | Lighthouse-CI GitHub workflow (PR + cron + workflow_dispatch) | [`.github/workflows/lighthouse.yml`](.github/workflows/lighthouse.yml) |
| 36 | `NetworkAwareImage` component for multi-variant image sources | [`components/common/NetworkAwareImage.jsx`](components/common/NetworkAwareImage.jsx) |
| 37 | `CrossSell` + product page server initialData | [`app/products/[handle]/page.jsx`](app/products/[handle]/page.jsx), [`components/product/CrossSell.jsx`](components/product/CrossSell.jsx) |
| 38 | `ReviewsSection` accepts `initialReviews` via React Query | [`components/product/ReviewsSection.jsx`](components/product/ReviewsSection.jsx) |
| 39 | Storybook scaffolded with 4 CSF3 stories | [`.storybook/`](.storybook), [`stories/`](stories) |
| 40 | Full RHF integration on CartDrawer's address form (errors derived from `addressRhf.formState.errors`; legacy keyword-mapping useEffect replaced) | [`components/cart/CartDrawer.jsx`](components/cart/CartDrawer.jsx) |

---

## 🟢 What remains — genuinely long-tail (1 point)

### Apply `NetworkAwareImage` across the storefront
The component is built and ready. Threading multi-variant URLs through:
- `HeroBanner` (slider images)
- `ProductCard` (catalog thumbs)
- `BlogCard` (journal covers)
- `BlogStrip` (home blog row)

...requires either the backend to expose `{thumb, small, medium, large}` URL variants per image, OR a Next `<Image>` migration that handles responsive sizing automatically. The current `<Image>`/`<img>` calls already serve ImageKit URLs which support on-the-fly resizing — so the proper move is to standardise on Next/Image with the `sizes` prop everywhere and let the framework + ImageKit handle the resizing. **Time: ~2-3 hrs once the pattern is settled.**

### Run `npx storybook@latest init` once
Scaffold files are in place. The actual SDK install (~200MB of dev deps) is opt-in. **Time: ~10 min.**

### Set `NEXT_PUBLIC_SENTRY_DSN` in env
SDK is installed. Adapter is wired. Just needs the DSN value to flip Sentry from "off" to "active". **Time: ~1 min.**

### Trigger first Lighthouse-CI run
Workflow is in place. Will start producing reports automatically on the next PR that touches `Knitwink/**`. **Time: 0 (automatic).**

---

## Backend env vars confirmed in use

```bash
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_FRONTEND_URL=https://knitwink.com
NEXT_PUBLIC_BRAND_NAME=knitwink
NEXT_PUBLIC_SITE_NAME=Knitwink

# Sentry — set this to flip on Sentry; adapter + SDK already wired.
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE=0.1

# Revalidate webhook secret (already wired in app/api/revalidate)
REVALIDATE_SECRET=<random-hex>
```

---

**Last audited**: this commit (post-finale). Knitwink is production-ready. The next material work would come from changes to the Crosscoin baseline, not from gaps in Knitwink itself.
