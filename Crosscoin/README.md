# Crosscoin Storefront + Admin

Next.js app powering both the public storefront at `crosscoin.in` and the admin dashboard at `/dashboard/*`.

> **Production readiness: 65 / 100.** See [§ Production Readiness](#production-readiness) for the honest breakdown and what's still pending.

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

**65 / 100** — strong primitives + SEO foundations, weak hardening on the user-facing edges.

| Area | Score | What hurts |
|---|---|---|
| Architecture | 7/10 | 100+ CSS files; large `Products.jsx`; mixed legacy / DS components |
| SEO | 6/10 | 13 storefront pages now SSR'd ✅; sitemap clean ✅; FAQs render on product pages but not on static pages yet; no rich review snippets |
| Performance | 6/10 | many useEffects on Products page; CSS bundle not split; no Lighthouse budget |
| **Accessibility** | **5/10** | no focus trap on `CartDrawer` / size charts; no skip-to-main; inconsistent alt text |
| State management | 6/10 | React Query used on a few pages; most still hand-roll fetches; no optimistic updates |
| Error handling | 6/10 | `ErrorBoundary` exists but Sentry not wired; some `catch {}` swallows; no global timeout/retry |
| Forms & validation | 7/10 | CartDrawer validates everything; no form lib — pure component state |
| Mobile / responsive | 7/10 | Tailwind + tokens; design system mobile-aware; not all admin pages migrated |
| **Security** | **7/10** | strong CSP + HSTS; `dangerouslySetInnerHTML` used in 9+ places — most should run through DOMPurify |
| Admin dashboard UX | 6/10 | 6 primitives shipped; ~10 pages migrated; rest still on legacy CSS |

### Pending (not deployment) — by severity

**🔴 High** (do these before turning on Google Ads at scale)
1. **Sanitize every `dangerouslySetInnerHTML`** with DOMPurify — currently `ProductFaqSection`, `ProductDetails`, `UnlockedExclusives` and a few admin pages render untrusted HTML directly. XSS exposure.
2. **Focus trap on modals** (`CartDrawer`, `Modal`, `ProductFilterDrawer`, size charts). Keyboard / screen-reader users currently get stuck. Real risk; accessibility lawsuits in India are picking up.
3. **Surface API errors to users** — several services use `catch { /* silent */ }` or just `console.error`. Add a global toast on network failure + a request-timeout interceptor on axios.
4. **Render page FAQs on static pages** — backend supports `attached_to_type: 'page'` but no static page calls `ProductFaqSection`. Page FAQs you write in the admin currently don't appear on the storefront.

**🟡 Medium**
5. Migrate the remaining admin pages (Customers, Brands, Coupons, Payments, Reviews, Slider, Blogs, Lookbooks, Reels, Brand Settings, Analytics) to the design-system primitives so the dashboard looks consistent end-to-end.
6. Move all dashboard data fetching to React Query (currently mixed) for cache + retry consistency.
7. Replace hand-rolled `CartDrawer` validation with `react-hook-form` + Zod — would cut ~150 lines and reduce re-renders.
8. Memoise the heavy filter computations in `Products.jsx` (33 `useState`/`useEffect` calls suggest excessive re-renders).
9. CSS consolidation — pick one of Tailwind / hand-written CSS / styled-components. Today it's all three.
10. Storybook for the 6 primitives + page templates.
11. **Wire `GET /api/csrf/token` on dashboard load + mirror into `X-CSRF-Token`** so the backend can flip `CSRF_REQUIRED=true`. Token endpoint is already live; this is just an axios interceptor.

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
