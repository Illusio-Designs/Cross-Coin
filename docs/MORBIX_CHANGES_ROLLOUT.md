# Morbix changes, 29 Oct – 1 Nov 2026: rollout to the other stores

Order: **Soxbae and Crosscoin first, then Knitwink and Velmique.**

Key: ✅ done · ⬜ to do · — not needed

## A. Already live on every store

These went through `shared/frontend/` or the Backend, so every store already has them:

- Meta server events carry the ad-click id (fbc) — `8435d2d`
- Shiprocket Checkout orders linked to the shopper's visit — `f4caf74`
- Meta: delivery outcomes, better match quality, abandoned checkouts — `9fd3381`
- GA4: purchases tied to their visit, refunds for cancelled and returned orders, real item names — `45b1726`
- App visits that send no referrer get a traffic source — `51b8dc7`
- Meta's own page loads (crawlers, ad previews) not counted as Facebook visits — `291f88d`
- Traffic report "Visit check" — `9532255`
- Lighter Sentry, which loads on the first real touch, click or key — `151cba0`, `a805df2`

## B. Store-by-store changes

| # | Change (Morbix commit) | What it does | Soxbae | Crosscoin | Knitwink | Velmique |
|---|---|---|---|---|---|---|
| 1 | No cookie banner (`d641eb6`) | Every visitor is tracked; no banner on the first screen | ✅ (no banner) | ✅ (already) | ✅ | ✅ |
| 2 | Shiprocket-only checkout, packs included (`6f15aa8`) | Buy now and the cart open Shiprocket; no own checkout page | ✅ | ⬜ needs Shiprocket pack offers first | ⬜ needs Shiprocket pack offers first | ⬜ needs Shiprocket pack offers first |
| 3 | Faster checkout opening (`511169b`, `6f15aa8`) | Shiprocket script warmed on the first touch | ✅ | ✅ | ✅ | ✅ |
| 4 | Tracking IDs read on the server (`c770c66`) | GA4 and the pixel start without waiting for an API call | ✅ | ✅ (already, `_document`) | ✅ | ✅ |
| 5 | Buyer remembered on the order page (`9fd3381`) | Better Meta match quality on later visits | ✅ | ✅ | ✅ | ✅ |
| 6 | Product page: first screen first (`98fe8a5`) | Videos, reviews, related products and FAQ mount only near the screen (`LazyMount`) | ✅ | ✅ | ✅ | ✅ (sections skip layout; server-rendered for SEO) |
| 7 | CSS inside the HTML (`3b7b72e`) | No render-blocking stylesheet | ✅ | ✅ (already, `optimizeCss`) | ✅ | — Next 14 has no `inlineCss`; needs Next 15 first |
| 8 | Modern browsers only (`3b7b72e`) | `browserslist` in package.json: no legacy JS | ✅ | ✅ | ✅ | ✅ |
| 9 | Product photos at q-72 (`3b7b72e`) | Smaller image files | ✅ | ✅ | ✅ | ✅ |
| 10 | Latin-only local font files (`1913259`) | The ₹ sign no longer pulls the extended-Latin font files | ✅ (13 → 3 files) | ✅ (16 → 4 files) | ✅ (3 Latin files) | ✅ (self-hosted, real names) |
| 11 | OTP widget only on login and register (`151cba0`) | MSG91 code not loaded site-wide | ✅ | ✅ (already) | ✅ | ✅ |
| 12 | Smaller logo files (`151cba0`) | Re-encoded webp | ✅ | — (5 KB already) | — (small already) | — (not checked) |
| 13 | Tags wait for real input (`3b7b72e`, `151cba0`, `a805df2`) | GA4, GTM, Clarity and the pixel load on the first touch, click, key or wheel (or 20 s); visitors from ads get them at once | ✅ | ✅ | ✅ | ✅ |
| 14 | Moving strips wait for the first touch (`61be454`) | Ticker or marquee still until the first touch (helps Speed Index) | ✅ (header ticker) | ✅ (ticker, hero coin) | ✅ (review strips) | ✅ (announcement strip, hero) |
| 15 | Description pictures on demand (`61be454`, `a805df2`) | Loaded only near the screen, at column-sized widths | ✅ | ✅ | ✅ | ✅ |
| 16 | Shiprocket preload on wheel, not scroll (`a805df2`) | Lighthouse no longer triggers it | ✅ | ✅ | ✅ | ✅ |

## C. Notes per store

- **Soxbae:** everything is done (commits `6a2fedb` and `2eedaa5`). Still to do on your side:
  - set up the pack offers in Shiprocket;
  - send the Meta domain-verification code.
- **Crosscoin:** done except Shiprocket-only checkout. Its pack and bundle prices still go to its own checkout, because Shiprocket would charge each pair at the catalogue price; switch over once the pack offers are set up in Shiprocket.
  - Pages Router (`src/pages`). Server-side tracking IDs go in `getStaticProps`/`_app`, not a layout, and fonts move from the `<link>` in `_document` to `next/font/local`.
  - It has its own tracking layer (`fbqTrack.js`, `UTMTracker.jsx`), so Analytics is not a copy of Morbix's file.
- **Knitwink:** done except Shiprocket-only checkout (same reason as Crosscoin). Next 16, so the edge file is `proxy.js`. The product page is `app/products/[handle]`.
- **Velmique:** done except Shiprocket-only checkout (same reason) and inline CSS (needs Next 15).
  - Next 14.2: inline CSS needs an upgrade to Next 15 first.
  - The product page is `app/product/[slug]`.
  - It still has its own `/checkout` page, which goes once Shiprocket-only checkout is on.
- Every row in **B** changes only that store's folder, so each push rebuilds only that store.
