# Velquira — Fine Jewellery Storefront

Velquira is the jewellery storefront in the multi-brand CrossCoin platform,
alongside Crosscoin, Knitwink, Velmique and Gripzus. It runs on the shared
backend at `api.crosscoin.in`, scoped by the `X-Brand-Name: velquira` header.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** JavaScript (JSX)
- **Styling:** Tailwind CSS — gold & black luxury theme
- **State:** Zustand (cart + wishlist, persisted to localStorage)
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3001
npm run build
npm start
```

## Backend prerequisite

The storefront talks to the shared backend and is scoped by brand. A
`velquira` brand row must exist there first:

```bash
# in ../Backend
node scripts/seedVelquiraBrand.js
```

Then assign categories and products to Velquira in the dashboard, otherwise
every page renders empty.

## Environment

Defaults are baked in; override via `.env.local` if needed:

```
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_BRAND_NAME=velquira
NEXT_PUBLIC_FRONTEND_URL=https://velquira.com
```

## Structure

```
src/
  app/                 routes (home, collections, products/[id], cart,
                       checkout, account, search, about, contact)
  components/          layout, home, product, collection, cart, SeoWrapper
  context/             AuthContext
  lib/api/             products, categories, sliders, auth, wishlist,
                       orders, addresses, reviews, blog, policies, seo
  store/               cartStore, wishlistStore (Zustand)
```

## Colour Scheme

- **Black** `#000000` — elegance
- **Gold** `#D4AF37` — luxury accent
- **Accent Gold** `#C9A961` — highlights
- **Light Gold** `#F4E4C1` — backgrounds