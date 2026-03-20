---
inclusion: always
---

# Technology Stack — Frontend Only

## Core
- **Next.js 14** — App Router (`app/` directory only, never `pages/`)
- **React 18** — Server Components by default; `'use client'` only when truly needed
- **TypeScript** — strict mode, zero `any` types

## Styling
- **Tailwind CSS v3** — only styling method, mobile-first
- CSS variables for brand tokens in `styles/globals.css`
- No CSS Modules, no styled-components, no inline `style={{}}` objects

## State
- **Zustand** — cart state, drawer open/close, active filters
- `useState` / `useReducer` — local component state only
- No Redux, no React Context for global state

## Talking to the Backend
- All API calls go through `lib/api/client.ts` — a typed `fetch` wrapper
- Server Components: call `lib/api/*.ts` functions directly (they use `fetch` with `next: { revalidate }`)
- Client Components: call through custom hooks in `hooks/`
- **Never call `fetch()` directly inside a component** — always use `lib/api/` or a hook
- Auth token lives in an httpOnly cookie set by the backend — frontend just reads it via `js-cookie` to attach to requests

## Key Libraries
| Library | Why |
|---|---|
| `framer-motion` | Cart drawer slide, sticky ATC entrance, image crossfade |
| `zustand` | Cart + UI global state |
| `react-hook-form` + `zod` | Checkout, login, register, quiz forms |
| `next/image` | Every image — never `<img>` |
| `next/font` | Font loading |
| `lucide-react` | All icons — no other icon library |
| `embla-carousel-react` | PDP image gallery, homepage hero |
| `clsx` + `tailwind-merge` | Conditional classes via `cn()` util |
| `js-cookie` | Read auth token cookie on client |
| `date-fns` | Format order dates |

## Performance Rules
- `priority` on all above-the-fold `next/image` instances
- `next/dynamic` with `ssr: false` for heavy below-fold components (reviews, quiz)
- Every page exports `generateMetadata()` for SEO
- Prefer Server Component data fetching over `useEffect` fetching

## Tooling
- **pnpm** — always, never npm or yarn
- **ESLint** — `next/core-web-vitals` + `@typescript-eslint/recommended`
- **Prettier** — single quotes, no semicolons, 2-space indent, 100 char width
- **Husky** + **lint-staged** — lint + typecheck before every commit

## Environment Variables (frontend only)
```bash
# .env.local

# Backend API base URL — server side (not exposed to browser)
API_URL=http://localhost:4000

# Backend API base URL — client side (browser can see this)
NEXT_PUBLIC_API_URL=http://localhost:4000

# Site metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=YourBrand

# Free shipping threshold (in paise/smallest unit × 100)
NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD=75000

# CDN hostname for product images (for next/image remotePatterns)
CDN_HOSTNAME=cdn.yourdomain.com

# Secret to verify ISR revalidation webhooks from backend
REVALIDATE_SECRET=replace-with-random-string
```
