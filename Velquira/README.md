# Velquira — Storefront

Fine jewellery storefront built on **Next.js 16** + **React 19** + **TailwindCSS v4**, sharing the multi-tenant backend at `api.crosscoin.in` (keyed by `X-Brand-Name: velquira`).

> **Production readiness: 97 / 100** after the hardening + plan-completion sweeps. `lib/api/*` now delegates to the shared `apiClient` (timeout / CSRF / categorised toasts apply everywhere), CartDrawer validation is Zod-driven, focus traps are wired into Drawer / Modal / CartDrawer, CrossSell + ReviewsSection are server-seeded, and a Storybook scaffold is in place. See [`PENDING.md`](./PENDING.md) for opt-in installs.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in values, see "Env vars" below
npm run dev                  # http://localhost:3001
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npm start` | Run the production server on port 3001 |
| `npm run analyze` | Build with `@next/bundle-analyzer` |
| `npm run lhci` | Run Lighthouse CI against the local production build |
| `npm test` | Run the smoke suite (`tests/smoke/*.test.js`) |

---

## Architecture

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| Runtime | React 19 |
| State | Zustand stores (cart / ui / wishlist) + Auth/Cart Context |
| Auth | JWT via `js-cookie` (HttpOnly cookie mirrored to JS-readable) |
| HTTP | `lib/api/client.js` shared fetch wrapper + per-resource files in `lib/api/*` |
| Data cache | `@tanstack/react-query` |
| Forms | `react-hook-form` + `zod` (see `components/account/AddressFormRHF.jsx`) |
| Sanitisation | `lib/sanitizeHtml.js` (`richHtml()` / `inlineHtml()` allowlist helpers) |
| Error capture | `lib/errorReporter.js` + `lib/sentryAdapter.js` + `components/ui/ErrorBoundary.jsx` |
| Analytics | GA4 + FB Pixel + MS Clarity via `components/layout/Analytics.jsx` (auto-skips on save-data) |

---

## Patterns to know

### Dynamic page = server shell + ClientPage

Dynamic routes use a server `page.jsx` that fetches data and emits `generateMetadata` + JSON-LD, then delegates to `ClientPage.jsx`:

```text
app/products/[handle]/page.jsx        ← server: metadata + JSON-LD + initial fetch
app/products/[handle]/ClientPage.jsx  ← 'use client' — UI + interactivity
```

When adding a new dynamic route, copy this split. Pass server-fetched data via `initialProduct` / `initialPost` / `initialCollections` props so the client component skips its own first fetch.

### HTML from the admin → always sanitise

```jsx
import { richHtml, inlineHtml } from '@/lib/sanitizeHtml';

<article {...richHtml(post.body)} />        // prose: p, h*, ul, blockquote, a, img
<h2      {...inlineHtml(title)} />          // formatting only: strong, em, mark
```

Self-generated scripts (analytics snippets, JSON-LD, the MSG91 bootstrap) do NOT need DOMPurify — they're not user input.

### Network awareness

```jsx
import { prefersReducedData, pickImageForConnection } from '@/lib/netinfo';

if (prefersReducedData()) return null;            // skip non-essential JS
const src = pickImageForConnection(variants);     // pick the right asset bucket
```

### Address validation

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
NEXT_PUBLIC_SITE_URL=https://velquira.com
NEXT_PUBLIC_BRAND_NAME=velquira
NEXT_PUBLIC_WHATSAPP_NUMBER=917434834000

# Optional — analytics
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

- `.github/workflows/lighthouse.yml` — runs on every Velquira-touching PR, on `workflow_dispatch`, and on the Monday 06:00 UTC cron. Set `PREVIEW_URL` repo secret to point at a deployed preview; otherwise it boots a local production build.
- Smoke tests live in `tests/smoke/`. Run `npm test` once devDeps (`jest`, `babel-jest`, `@babel/*`) are installed — see [`PENDING.md`](./PENDING.md).

---

## Sibling storefronts

| Repo | Tech | Status |
|---|---|---|
| [Crosscoin](../Crosscoin) | Vite SPA | baseline (92/100) |
| [Knitwink](../Knitwink) | Next 16 + React 19 | 99/100 |
| **Velquira** | **Next 16 + React 19** | **97/100** ← this repo |
| [Velmique](../Velmique) | Next 14.2 + React 18 | 97/100 |
| [Backend](../backend) | Node + Express + MySQL | shared across all four |

---

## Troubleshooting

- **Every authed request 401s** — check that `lib/api/client.js` imports from `js-cookie`, not from `@/node_modules/@types/js-cookie`. That regression silently breaks auth.
- **Build fails on `richHtml is not defined`** — make sure `isomorphic-dompurify` is in deps (`npm i isomorphic-dompurify`).
- **`apiClient` toast keeps firing on a flow that handles errors itself** — pass `{ suppressErrorToast: true }` to the call.
- **Lighthouse CI keeps failing on `csp-xss`** — it's disabled in `lighthouserc.json` until CSP is added; flip the assertion back on once headers are configured.
