# Morbix storefront

Next.js (App Router) storefront for the **Morbix** socks brand — part of the
multi-brand monorepo. Shares the same backend API as the other brands, scoped by
the `X-Brand-Name: morbix` header.

## Status: mock-data mode

The UI currently renders **frontend mock data** (`lib/mockData.js`) so the site
works before the backend has Morbix products/sliders seeded.

To go live on the shared API, set the env flag and the data layer fetches real
data instead (same pattern as Knitwink/Velmique):

```
NEXT_PUBLIC_USE_MOCK=false
```

`lib/api.js` already wires the brand-scoped fetches; only the flag changes.

## Stack
- Next.js 15 (App Router), static/ISR homepage (`revalidate = 300`)
- Lenis smooth scroll (`components/SmoothScroll.jsx`)
- Plain CSS design system — **all brand colors live in `app/globals.css` `:root`**
  (navy + teal from the Morbix logo). Rebrand = edit those tokens.
- lucide-react icons

## To finish branding
- Drop the real logo into `public/` and swap the text wordmark in
  `components/layout/Header.jsx` / `Footer.jsx`.
- Replace the Unsplash placeholder images (hero, category banners, product
  cards) with real Morbix product/lifestyle photos.

## Dev
```
npm install --legacy-peer-deps
npm run dev
```
