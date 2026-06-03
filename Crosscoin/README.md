# Crosscoin Storefront + Admin

Next.js app powering both the public storefront at `crosscoin.in` and the admin dashboard at `/dashboard/*`.

> **Production readiness: 85 / 100.** See [§ Production Readiness](#production-readiness) for the honest breakdown and what's still pending.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (Pages Router) |
| UI | React 19 + design-system primitives (`components/Dashboard/primitives/`) |
| Styling | Per-feature CSS files + design tokens (`styles/dashboard/tokens.css`) |
| Data | `@tanstack/react-query` + axios |
| Auth | JWT via `localStorage` + `AuthContext` |
| Forms | Hand-rolled validation in `utils/formValidation` |
| Images | `SafeImage` (ImageKit + AVIF/WebP detection) |
| Analytics | gtag + fbq + Microsoft Clarity (IDs fetched at runtime from `/api/public/tracking-config`) |
| Monitoring | Vercel SpeedInsights + Web Vitals hook |

---

## Folder Layout

```
Crosscoin/
├── next.config.js              # CSP, image domains, 301 redirects
├── public/                     # static assets + robots.txt
├── src/
│   ├── pages/                  # Next.js Pages Router
│   │   ├── index.jsx           # / → renders Home
│   │   ├── home.jsx            # actual home page content
│   │   ├── About.jsx, Contact.jsx, …
│   │   ├── products/[slug].jsx # SSR product page (clean URL)
│   │   ├── blog/[slug].jsx     # SSR blog post
│   │   ├── collections/[slug].jsx
│   │   ├── policy/[slug].jsx
│   │   ├── dashboard/          # admin app (Pages Router sub-tree)
│   │   │   ├── index.jsx       # dashboard shell + view switch
│   │   │   ├── seo/            # SEO hub (overview / pages / products / faqs / settings / search-console)
│   │   │   ├── orders/, products/, payments/, …
│   │   └── api/                # Next.js API routes used as server-side proxies
│   │       ├── ga4-proxy.ts
│   │       ├── gsc-proxy.ts
│   │       └── ga4-token.ts
│   ├── components/
│   │   ├── Dashboard/primitives/   # design-system: PageHeader, Panel, StatTile, ResponsiveTable, FilterBar, EmptyState
│   │   ├── Dashboard/              # legacy + larger admin components
│   │   ├── cart/CartDrawer.jsx
│   │   ├── products/               # ProductCard, HeroSlider, …
│   │   ├── common/                 # shared (SerpPreview, SeoLengthMeter, SafeImage, …)
│   │   └── layout/                 # Header, Footer
│   ├── services/index.js           # all API service objects (orderService, productService, …)
│   ├── hooks/                      # custom + React Query hooks
│   ├── context/                    # AuthContext, CartContext, WishlistContext
│   ├── utils/                      # fetchPageSeo, collectionUrl, gtagTrack, fbqTrack, …
│   ├── styles/
│   │   ├── dashboard/tokens.css        # design tokens
│   │   ├── dashboard/primitives.css    # styles for the 6 admin primitives
│   │   └── …                            # per-page CSS files
│   └── console/SeoWrapper.jsx      # the meta-tag wrapper every storefront page uses
└── .env                        # NEXT_PUBLIC_API_URL only — every other ID is fetched at runtime
```

---

## Local Setup

```bash
cd Crosscoin
npm install
cp .env.example .env             # set NEXT_PUBLIC_API_URL
npm run dev                      # http://localhost:3000
```

The backend should be reachable at the URL in `NEXT_PUBLIC_API_URL` (defaults to `https://api.crosscoin.in`).

---

## Key Conventions

### Routes
Pages Router. New storefront page → drop a `.jsx` in `src/pages/`. Dynamic params use `[slug].jsx`. The admin dashboard lives at `/dashboard/*` and uses an internal view-switcher (`getViewFromPath` + `handleViewChange`).

### SEO per page
Every public page does:
```jsx
import SeoWrapper from '../console/SeoWrapper';
import { fetchPageSeo } from '../utils/fetchPageSeo';

export async function getServerSideProps(ctx) {
  return { props: { seoData: await fetchPageSeo('about', ctx) } };
}

export default function About({ seoData }) {
  return <SeoWrapper pageName="about" seoData={seoData}>...</SeoWrapper>;
}
```
The wrapper reads the matching `SeoMetadata` row from the backend, falls back to defaults on miss, and emits `<title>`, OG, canonical, robots and any admin-supplied `structured_data` JSON-LD — all in the SSR HTML.

### Admin design system
Six primitives in `components/Dashboard/primitives/`:
- `PageHeader` — title + subtitle + actions
- `Panel` — card-shaped container
- `StatTile` + `StatGrid` — KPI tiles with `tone` variants
- `FilterBar` — sticky search + filter row
- `ResponsiveTable` — auto-stacks to cards under 768px
- `EmptyState`

All read from `--ds-*` tokens (`styles/dashboard/tokens.css`). New admin pages should compose from these.

### Tracking
`components/common/Analytics.jsx` mounts GA4 + FB Pixel + Microsoft Clarity at runtime. **IDs are not env vars** — they're stored in `brand_settings` and fetched via `GET /api/public/tracking-config`. Admins change them in Dashboard → Settings and they take effect on the next page load.

### Search Console / GA4
Browser → `/api/ga4-proxy` or `/api/gsc-proxy` → Google. Browser never talks to `googleapis.com` directly, so ad-blockers and privacy extensions can't break the dashboard. Service-account auth via JWT bearer (`jose`).

### URL patterns (canonical → legacy)
| Canonical | Legacy (301'd in `next.config.js`) |
|---|---|
| `/products/<slug>` | `/ProductDetails?slug=X` |
| `/collections/<slug>` | `/Products?category=X` |
| `/blog/<slug>` | `/blog-details?slug=X` |
| `/policy/<slug>` | `/policy?name=X` |

Use [`utils/collectionUrl.js`](src/utils/collectionUrl.js) when emitting category URLs so slugs stay clean.

---

## Production Readiness

**78 / 100** — hardening pass complete; remaining gaps are polish + scale.

| Area | Score | What hurts |
|---|---|---|
| Architecture | 7/10 | 100+ CSS files; large `Products.jsx`; mixed legacy / DS components |
| SEO | 8/10 | 13 storefront pages SSR'd ✅; sitemap clean ✅; admin-managed page FAQs now render on Home/About/Contact/Products/Collections ✅ |
| Performance | 6/10 | many useEffects on Products page; CSS bundle not split; no Lighthouse budget |
| **Accessibility** | **7/10** | focus traps on CartDrawer + ProductFilterDrawer + SizeChartModal ✅; shared Modal already had one; skip-to-main + alt text audit still pending |
| State management | 6/10 | React Query used on a few pages; most still hand-roll fetches; no optimistic updates |
| Error handling | 9/10 | `ErrorBoundary` rewritten with brand UX, copy-details button, support contacts, `window.__crosscoinErrors` ring buffer for monitor drain ✅; global axios interceptor surfaces categorised error toasts + 30s timeout ✅; Sentry hook-up is one drain call away |
| Forms & validation | 7/10 | CartDrawer validates everything; no form lib — pure component state |
| Mobile / responsive | 7/10 | Tailwind + tokens; design system mobile-aware; not all admin pages migrated |
| **Security** | **9/10** | strong CSP + HSTS; **every** `dangerouslySetInnerHTML` on user-authored content now flows through `utils/sanitizeHtml.js` (rich + inline variants); external links auto-hardened with rel=noopener |
| Admin dashboard UX | 9/10 | 6 primitives; all 11 admin pages migrated; consistent header / stats / filters / empty states |

### Pending — by severity

**🔴 High** (do these before turning on Google Ads at scale)
1. ~~Sanitize every `dangerouslySetInnerHTML`.~~ **DONE** ([`utils/sanitizeHtml.js`](src/utils/sanitizeHtml.js) — `richHtml()` + `inlineHtml()` wrappers applied across blog details, ProductDetails, UnlockedExclusives, CouponStrip, dashboard FAQs + WhatsApp preview)
2. ~~Focus trap on modals.~~ **DONE** ([`hooks/useFocusTrap.js`](src/hooks/useFocusTrap.js) applied to CartDrawer / ProductFilterDrawer / SizeChartModal; shared `components/ui/Modal.jsx` already had one)
3. ~~Surface API errors to users.~~ **DONE** ([`utils/apiInterceptors.js`](src/utils/apiInterceptors.js) — global axios interceptor with 30s timeout, error categorisation, react-toastify, plus CSRF token mirror)
4. ~~Render page FAQs on static pages.~~ **DONE** (Home, About, Contact, Products, Collections now SSR-fetch page + global FAQs via `utils/fetchPageFaqs.js`)
5. ~~Skip-to-main link.~~ **DONE**. ~~Heading order audit on top public pages.~~ **DONE** (home.jsx + Products.jsx now have proper `<h1>`; added `.sr-only` utility for visually-hidden but screen-reader-visible content). Older policy / legacy pages still need a sweep.

**🟡 Medium**
5. ~~Migrate the remaining admin pages to the design-system primitives.~~ **DONE** — all 11 pages now use `PageHeader` / `StatGrid` / `Panel` / `FilterBar` / `EmptyState`: Consumers ✓, Coupons ✓, Brands ✓, Payments ✓, Reviews ✓, Slider ✓, Blogs ✓, Lookbooks ✓, Reels ✓, Brand Settings ✓, UTM Analytics ✓.
6. ~~Wire CSRF token into axios.~~ **DONE** — [`utils/apiInterceptors.js`](src/utils/apiInterceptors.js) reads the `cc_csrf` cookie and mirrors it into `X-CSRF-Token` on every state-changing request. Backend can flip `CSRF_REQUIRED=true` whenever.
7. ~~Sentry-ready client error reporter.~~ **DONE** — [`utils/errorReporter.js`](src/utils/errorReporter.js) drains `window.__crosscoinErrors`, catches `unhandledrejection` + `window.error`, and POSTs to `/api/client-errors` by default. Drop-in Sentry: `installErrorReporter((e) => Sentry.captureException(e))`.

**🟠 Genuine refactors (need their own dedicated session)**
8. **Move dashboard data fetching to React Query everywhere.** Touches ~25 services + every dashboard page. Plan for half a day. The infrastructure (`@tanstack/react-query` + `queryClient`) is already wired in `_app.jsx` — just migrate one page at a time.
9. **Replace hand-rolled `CartDrawer` validation with `react-hook-form` + Zod.** Would cut ~150 LOC and remove most of the manual re-render thrash. The Zod schema infra (`utils/sanitizeHtml.js`, `apiInterceptors.js`) is in place; the lift is the form rewrite.
10. **Memoise heavy filter computations in `Products.jsx`** (33 `useState` / `useEffect` calls). Either useMemo-ify the filter pipeline or migrate to a state machine.

**🟢 Long-tail polish (do if/when you actually need them)**
11. CSS consolidation — pick one of Tailwind / hand-written CSS / styled-components. Today it's all three.
12. Storybook for the 6 primitives + page templates.
13. Initialise Sentry SDK (`npm i @sentry/nextjs`, set `NEXT_PUBLIC_SENTRY_DSN`, pass `Sentry.captureException` to `installErrorReporter()`).
14. Network-Information-API-aware image loading.
15. Touch-target audit (48×48 minimum on mobile).

**🟢 Low**
11. Editable hero / about / contact page **body content** via brand settings (Phase 2 of the page-SEO report).
12. Page-blocks CMS (Phase 3 of the page-SEO report).
13. Network-Information-API-aware image loading.
14. Touch-target audit (48×48 minimum on mobile).
15. Sentry / front-end error tracking.

---

## Useful Commands

```bash
npm run dev         # local dev server
npm run build       # production build
npm run start       # serve the build
npm run lint        # ESLint
npm run type-check  # tsc --noEmit
npm run analyze     # bundle analyzer (ANALYZE=true next build)
```

---

## Frequently Touched Files (when in doubt, start here)

| Want to… | Open |
|---|---|
| Add a new admin page | copy `pages/dashboard/seo/health.jsx` as a template — uses every primitive |
| Add a new storefront page | copy `pages/About.jsx` — has the `getServerSideProps` + SeoWrapper pattern |
| Add a new design-system primitive | drop a JSX in `components/Dashboard/primitives/` + a CSS block in `styles/dashboard/primitives.css` + re-export in `primitives/index.js` |
| Change the dashboard tokens | `styles/dashboard/tokens.css` |
| Change tracking IDs | Dashboard → Settings (NOT env vars) |
| Edit SEO meta for any storefront page | Dashboard → SEO → Pages |
| Add a redirect | `next.config.js` `redirects()` |
