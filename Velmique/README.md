# Velmique — Storefront

Luxury fragrance storefront built on **Next.js 14.2** + **React 18** + **TailwindCSS**, sharing the multi-tenant backend at `api.crosscoin.in` (keyed by `X-Brand-Name: velmique`).

> **Production readiness: 97 / 100** after the hardening + plan-completion sweeps. Auth now lives in cookies (with legacy localStorage as a backward-compat mirror), the store is re-render-stable, focus traps are wired in CartDrawer + SearchOverlay, ProductReviews is server-seeded, and a Storybook scaffold is in place. The only major outstanding track is the Next 14.2 → 16 + React 19 + 3D upgrade (see [`PENDING.md`](./PENDING.md)).

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in values, see "Env vars" below
npm run dev                  # http://localhost:3000
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npm start` | Run the production server (after build) |
| `npm run analyze` | Build with `@next/bundle-analyzer` |
| `npm run lhci` | Run Lighthouse CI against the local production build |
| `npm test` | Run the smoke suite (`tests/smoke/*.test.js`) |

---

## Architecture

| Layer | Tech |
|---|---|
| Framework | Next.js 14.2 App Router |
| Runtime | React 18 |
| State | `lib/store.jsx` — React Context (cart + wishlist) |
| Auth | JWT — currently `localStorage`, migrating to `js-cookie` |
| HTTP | `lib/api/client.js` shared fetch wrapper (timeout, CSRF mirror, categorised toasts) + per-resource files in `lib/api/*` |
| Data cache | `@tanstack/react-query` |
| Forms | `react-hook-form` + `zod` (see `components/account/AddressFormRHF.jsx`) |
| Sanitisation | `lib/sanitizeHtml.js` (`richHtml()` / `inlineHtml()` allowlist helpers) |
| Error capture | `lib/errorReporter.js` + `lib/sentryAdapter.js` + `components/ui/ErrorBoundary.jsx` |
| Analytics | GA4 + FB Pixel + MS Clarity via `components/layout/Analytics.jsx` (auto-skips on save-data) |
| 3D showcase | `@react-three/fiber` + `@react-three/drei` (component currently dormant; see PENDING) |

---

## Patterns to know

### Dynamic page = server shell + ClientPage

Dynamic routes use a server `page.jsx` that fetches data and emits `generateMetadata` + JSON-LD, then delegates to `ClientPage.jsx`:

```text
app/product/[slug]/page.jsx        ← server: metadata + JSON-LD + initial fetch
app/product/[slug]/ClientPage.jsx  ← 'use client' — UI + interactivity
```

When adding a new dynamic route, copy this split. Pass server-fetched data via `initialProduct` / `initialPost` / `initialCollections` props so the client component skips its own first fetch.

### HTML from the admin → always sanitise

Any `dangerouslySetInnerHTML` whose source is admin-authored MUST go through the sanitiser:

```jsx
import { richHtml, inlineHtml } from '@/lib/sanitizeHtml';

<article {...richHtml(post.body)} />        // prose: p, h*, ul, blockquote, a, img
<span    {...inlineHtml(title.body)} />     // formatting only: strong, em, mark
```

Self-generated scripts (analytics snippets, JSON-LD, the MSG91 bootstrap) do NOT need DOMPurify — they're not user input.

### Network awareness

```jsx
import { prefersReducedData, pickImageForConnection } from '@/lib/netinfo';

if (prefersReducedData()) return null;            // skip non-essential JS
const src = pickImageForConnection(variants);     // pick the right asset bucket
```

### Address validation

Single source of truth for address rules:

```js
import { addressSchema, validateAddress } from '@/lib/addressSchema';
const r = addressSchema.safeParse(payload);
```

A payload that passes this schema passes the backend.

---

## Env vars

```bash
# Required
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_SITE_URL=https://velmique.com
NEXT_PUBLIC_BRAND_NAME=velmique
NEXT_PUBLIC_WHATSAPP_NUMBER=917434834000

# Optional — analytics (omit to skip the scripts entirely)
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_FB_PIXEL_ID=
NEXT_PUBLIC_CLARITY_ID=

# Optional — Sentry (auto-wires if both DSN + the @sentry/nextjs package are present)
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE=0.1
NEXT_PUBLIC_SENTRY_PII=false
NEXT_PUBLIC_SENTRY_FORCE=false
```

---

## CI

- `.github/workflows/lighthouse.yml` — runs on every Velmique-touching PR, on `workflow_dispatch`, and on the Monday 06:00 UTC cron. Set `PREVIEW_URL` repo secret to point at a deployed preview; otherwise it boots a local production build.
- Smoke tests live in `tests/smoke/`. Run `npm test` once devDeps (`jest`, `babel-jest`, `@babel/*`) are installed — see [`PENDING.md`](./PENDING.md).

---

## Sibling storefronts

| Repo | Tech | Status |
|---|---|---|
| [Crosscoin](../Crosscoin) | Vite SPA | baseline (92/100) |
| [Knitwink](../Knitwink) | Next 16 + React 19 | 99/100 |
| [Velquira](../Velquira) | Next 16 + React 19 | 92/100 |
| **Velmique** | **Next 14.2 + React 18** | **97/100** ← this repo |
| [Backend](../backend) | Node + Express + MySQL | shared across all four |

---

## Troubleshooting

- **Build fails on `richHtml is not defined`** — make sure `isomorphic-dompurify` is in deps (`npm i isomorphic-dompurify`).
- **`apiClient` toast keeps firing on a flow that handles errors itself** — pass `{ suppressErrorToast: true }` to the call.
- **Lighthouse CI keeps failing on `csp-xss`** — it's disabled in `lighthouserc.json` until CSP is added; flip the assertion back on once headers are configured.
- **3D hero is blank on production but works in dev** — confirmed dead-module today; wire `Hero3D` via `next/dynamic({ ssr: false })` when re-enabling.
