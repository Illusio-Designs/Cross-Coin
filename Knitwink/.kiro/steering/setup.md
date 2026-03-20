---
inclusion: always
---

# Project Setup — From Scratch

## How to initialise this project
This project does not exist yet. When asked to set up or scaffold the project,
follow these exact steps in order.

## Step 1 — Bootstrap Next.js
```bash
pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

## Step 2 — Install all required packages
```bash
pnpm add framer-motion zustand react-hook-form zod @hookform/resolvers \
  embla-carousel-react lucide-react clsx tailwind-merge js-cookie date-fns

pnpm add -D @types/js-cookie prettier prettier-plugin-tailwindcss \
  husky lint-staged @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

## Step 3 — Delete boilerplate
Delete everything Next.js generates inside app/ except layout.tsx.
Delete the contents of app/page.tsx — we will write it from scratch.
Delete app/globals.css — we will replace it with styles/globals.css.

## Step 4 — Create the folder structure
Create these empty folders exactly as listed in structure.md:
- components/layout/
- components/home/
- components/collection/
- components/product/
- components/cart/
- components/checkout/
- components/quiz/
- components/account/
- components/ui/
- lib/api/
- hooks/
- store/
- types/
- styles/

## Step 5 — Copy config files
Replace the generated tailwind.config.ts, tsconfig.json, next.config.ts,
and .eslintrc.json with the versions specified in tech.md and ui-conventions.md.
Create styles/globals.css with all brand tokens from ui-conventions.md.
Create .env.local from .env.example.
Create .prettierrc as specified in tech.md.

## Step 6 — Create base files first, in this order
1. styles/globals.css — brand tokens + base resets
2. types/index.ts — all shared TypeScript types
3. lib/api/client.ts — typed fetch wrapper
4. lib/utils.ts — formatPrice(), cn(), truncate()
5. lib/constants.ts — SITE_NAME, SHIPPING_THRESHOLD, NAV_LINKS, ROUTES
6. components/ui/cn.ts — clsx + tailwind-merge utility
7. components/ui/Button.tsx — primary, secondary, ghost variants
8. components/ui/Input.tsx — label + input + error
9. components/ui/Badge.tsx — New, Sale, Bestseller pill
10. components/ui/Skeleton.tsx — loading placeholder
11. store/cartStore.ts — Zustand cart store
12. store/uiStore.ts — Zustand UI store
13. hooks/useCart.ts
14. hooks/useAuth.ts
15. hooks/useMediaQuery.ts
16. hooks/useIntersectionObserver.ts
17. middleware.ts — protect /account/* and /checkout
18. app/layout.tsx — root layout with fonts, providers, Navbar, Footer

## What the completed project looks like
After all steps, running `pnpm dev` should show:
- A white page with the Navbar and Footer visible
- No errors in the terminal
- No TypeScript errors
- All brand color tokens working in Tailwind
