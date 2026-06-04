# Knitwink Storefront

Next.js 16 App Router storefront for the **Knitwink** brand. Backed by the shared CrossCoin API at `api.crosscoin.in` — brand-multiplexed via the `X-Brand-Name: knitwink` header, so every backend feature (orders, addresses, coupons, SEO admin, shipping, audit logs) works for Knitwink as soon as a brand row exists.

> **Production readiness: 78 / 100** (after the hardening sweep). See [§ Production Readiness](#production-readiness) for the honest breakdown and what's still pending.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| UI | Tailwind v4 + `framer-motion` + `lucide-react` |
| State | Zustand stores (`store/cartStore`, `uiStore`, `wishlistStore`) + React Context (`AuthContext`, `CartContext`) |
| Auth | JWT cookie via `js-cookie` |
| Forms | `react-hook-form` + `zod` (deps installed; address form rewrite pending) |
| API client | [`lib/api/client.js`](lib/api/client.js) — hardened fetch wrapper with 30s timeout, CSRF mirror, categorised error toasts |
| Toasts | `react-toastify` |
| Sanitisation | [`lib/sanitizeHtml.js`](lib/sanitizeHtml.js) — isomorphic-dompurify with `richHtml()` + `inlineHtml()` helpers |
| Error tracking | [`lib/errorReporter.js`](lib/errorReporter.js) + [`lib/sentryAdapter.js`](lib/sentryAdapter.js) — auto-wires `@sentry/nextjs` when installed, falls back to `/api/client-errors` sink |
| ISR | `app/api/revalidate` endpoint, secret-guarded |
| Analytics | [`components/layout/Analytics.jsx`](components/layout/Analytics.jsx) — GA4 + FB Pixel + Microsoft Clarity, IDs fetched at runtime from `/api/public/tracking-config` |

---

## Folder Layout

```
Knitwink/
├── app/                          # Next.js App Router
│   ├── layout.jsx                # Root layout — wires ClientProviders, ErrorBoundary, Analytics
│   ├── page.jsx                  # Home
│   ├── sitemap.js                # Dynamic XML sitemap (products + categories + journal + policies)
│   ├── robots.js                 # robots.txt with public/private rules
│   ├── about/, contact/, search/, track-order/, wishlist/, login/, register/
│   ├── account/                  # Authenticated user area (profile, orders, settings)
│   ├── api/revalidate/           # ISR webhook for product/collection updates
│   ├── cart/                     # Cart page + client logic
│   ├── collections/[handle]/     # Category page (page.jsx still pending)
│   ├── journal/[slug]/           # Blog post with BlogPosting JSON-LD
│   ├── policies/[name]/          # Sanitised policy renderer
│   └── products/[handle]/        # Product detail with Product + BreadcrumbList JSON-LD
├── components/
│   ├── SeoWrapper.jsx            # Client-side title/meta injection (legacy — see Pending)
│   ├── ui/                       # Button, Drawer, Modal, ErrorBoundary, Skeleton, etc.
│   ├── layout/                   # Navbar, Footer, ClientProviders, Analytics, MobileMenu
│   ├── cart/                     # CartDrawer with focus trap
│   ├── product/                  # Gallery, ProductInfo, ReviewsSection, CrossSell
│   ├── collection/, home/, account/
├── hooks/                        # useAuth, useCart, useFocusTrap, useMediaQuery, useIntersectionObserver
├── lib/
│   ├── api/                      # Per-resource API modules (auth, products, cart, ...) all using client.js
│   ├── sanitizeHtml.js           # DOMPurify wrappers
│   ├── errorReporter.js          # Window error + unhandled rejection sink
│   ├── sentryAdapter.js          # Optional Sentry wire-up
│   ├── toast.js                  # react-toastify wrapper with branded copy
│   ├── constants.js              # SITE_NAME, SHIPPING_THRESHOLD, ROUTES
│   └── utils.js, colorMap.js
├── store/                        # Zustand stores
├── styles/
│   ├── globals.css               # Tailwind imports + skip-to-main + sr-only + Knitwink theme tokens
│   └── CartDrawer.css
├── public/                       # logos, hero images, favicons
├── next.config.ts
└── PENDING.md                    # Honest gap audit vs Crosscoin baseline
```

---

## Local Setup

```bash
cd Knitwink
npm install                          # or pnpm install
cp .env.example .env.local           # see §Environment below
npm run dev                          # http://localhost:3000
```

The dev server hot-reloads on every save. Tailwind v4 picks up classes from `app/**`, `components/**`, `hooks/**`, `lib/**`.

---

## Environment

```bash
# Backend — production API (shared with all sibling storefronts)
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_BRAND_NAME=knitwink
NEXT_PUBLIC_FRONTEND_URL=https://knitwink.com
NEXT_PUBLIC_SITE_NAME=Knitwink

# Optional — free-shipping threshold for the cart bar (paise / lowest unit)
NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD=50000

# ISR revalidate webhook (matches the backend secret that fires it)
REVALIDATE_SECRET=<random-hex>

# Sentry (optional) — install @sentry/nextjs to activate
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE=0.1
NEXT_PUBLIC_SENTRY_PII=false
```

---

## Key Conventions

### API calls
Every API module under [`lib/api/*.js`](lib/api) delegates to `apiClient` from [`lib/api/client.js`](lib/api/client.js). That single chokepoint gives every call:
- 30s default timeout via `AbortController`
- `X-Brand-Name: knitwink` header
- `X-CSRF-Token` mirror from the `cc_csrf` cookie (state-changing methods only)
- Categorised error toast on failure (opt out per-call with `{ suppressErrorToast: true }`)
- JSON parsing + envelope `{ success, data }` unwrap

Adding a new endpoint:
```js
// lib/api/something.js
import { apiClient } from '@/lib/api/client'

export const listSomething = (params) => apiClient.get('/api/something', { params })
export const createSomething = (body) => apiClient.post('/api/something', body)
```

### Rendering user-authored HTML
**Never write `dangerouslySetInnerHTML` directly on admin-supplied content.** Use the helpers from [`lib/sanitizeHtml.js`](lib/sanitizeHtml.js):

```jsx
import { richHtml, inlineHtml } from '@/lib/sanitizeHtml'

// Full prose (blog body, policy, product description)
<div className="blog-content" {...richHtml(post.body)} />

// Inline formatting only (titles, banners)
<h2 {...inlineHtml(section.title)} />
```

Self-generated JavaScript / JSON-LD intentionally bypasses this — they're not user content.

### Modals / drawers
Every modal/drawer wraps its content with the focus trap so keyboard / screen-reader users can't tab out:

```jsx
import { useFocusTrap } from '@/hooks/useFocusTrap'

const trapRef = useFocusTrap(isOpen, { onEscape: close })
return <div ref={trapRef} role="dialog" aria-modal="true">…</div>
```

### Analytics
Component is mounted once in `app/layout.jsx`. IDs come from the backend's `/api/public/tracking-config`, so the ops team can rotate keys without redeploying. Nothing renders if no IDs are configured.

### Cron / Webhook
`POST /api/revalidate?secret=...` revalidates the home / a product / a collection. Wired into the backend's product-publish hooks.

---

## Important Routes

| Route | Notes |
|---|---|
| `/` | Home |
| `/collections` | Category index |
| `/collections/[handle]` | **page.jsx missing** — only `loading.jsx` present. See PENDING.md. |
| `/products/[handle]` | Product detail; emits Product + BreadcrumbList JSON-LD |
| `/journal/[slug]` | Blog post; emits BlogPosting + BreadcrumbList JSON-LD |
| `/policies/[name]` | Sanitised policy renderer |
| `/cart`, `/account`, `/wishlist`, `/track-order` | Self-explanatory |
| `/api/revalidate` | ISR webhook (secret-protected) |
| `/sitemap.xml` | Dynamic — refreshed every 5 min |
| `/robots.txt` | Static — blocks account/cart/checkout, allows everything else |

---

## Production Readiness

**78 / 100** — hardening sweep complete; remaining gaps are documented in [PENDING.md](PENDING.md).

| Area | Score | What hurts |
|---|---|---|
| Architecture | 7/10 | Mix of Zustand + React Context; SeoWrapper still client-side |
| **Security** | **9/10** | DOMPurify on every user HTML; ErrorBoundary live; CSRF mirror wired; webhook signature backend-side. Sentry init is one env var away |
| Error handling | 9/10 | ErrorBoundary + 30s timeout + categorised error toasts + window error reporter + Sentry-ready adapter |
| **Accessibility** | **8/10** | Focus traps on Drawer / Modal / CartDrawer; skip-to-main link; sr-only utility. Heading-order audit on legacy pages still pending |
| SEO | 7/10 | sitemap + robots + JSON-LD on product/journal pages; **generateMetadata is still client-side via SeoWrapper** (works but suboptimal — Google's modern crawler runs JS but a server-rendered title is faster) |
| State management | 6/10 | Zustand for cart/wishlist/ui; React Context for auth — works but not migrated to React Query yet |
| Forms & validation | 6/10 | RHF + Zod installed; only used in some forms |
| Mobile / responsive | 7/10 | Tailwind v4 + framer-motion; mostly responsive |
| Analytics | 7/10 | GA4 + FB Pixel + Clarity via runtime config endpoint |
| Performance | 6/10 | App Router + ISR on revalidate webhook; no Lighthouse budget yet |

### What landed in this hardening pass

1. **DOMPurify** (`lib/sanitizeHtml.js`) — sanitised the journal, policy, and SectionHeader rendering paths.
2. **ErrorBoundary** (`components/ui/ErrorBoundary.jsx`) — wraps the entire client subtree. Buffers errors onto `window.__knitwinkErrors` for any monitor to drain.
3. **Error reporter** (`lib/errorReporter.js`) + Sentry adapter — POSTs to `/api/client-errors` or routes to Sentry when `@sentry/nextjs` is installed + DSN is set.
4. **Hardened API client** (`lib/api/client.js`) — 30s timeout, CSRF mirror, categorised error toasts.
5. **Focus traps** on `Drawer`, `Modal`, `CartDrawer` via `hooks/useFocusTrap.js`.
6. **`app/sitemap.js`** — dynamic XML sitemap (products + categories + journal + policies). 5-min ISR cache.
7. **`app/robots.js`** — public/private rule split.
8. **JSON-LD** on product + journal pages — Product / BreadcrumbList / BlogPosting.
9. **Analytics** (`components/layout/Analytics.jsx`) — GA4 + FB Pixel + Clarity, IDs fetched at runtime.
10. **Skip-to-main link** + `.sr-only` utility in `globals.css`.

See [PENDING.md](PENDING.md) for the remaining items.

---

## Useful Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run start        # serve the build
npm run lint         # ESLint
```

---

## Where to Look First

| Want to… | Open |
|---|---|
| Add a new page | `app/<route>/page.jsx` — server component by default |
| Add a new API call | `lib/api/<resource>.js` using `apiClient` |
| Render admin HTML | use `richHtml()` / `inlineHtml()` from `lib/sanitizeHtml.js` |
| Add a new modal | `components/ui/Modal.jsx` already has the focus trap |
| Change brand colours | `styles/globals.css` `@theme inline` block |
| Update SEO defaults | dashboard → SEO → Pages (backend) — Knitwink reads `/api/seo?page_name=<route>` |
| Wire analytics | dashboard → Brand Settings (backend) — sets `ga4_measurement_id`, `fb_pixel_id`, `clarity_id` |
| Trigger ISR | `POST /api/revalidate?secret=<...>` with `{ type, handle }` |
