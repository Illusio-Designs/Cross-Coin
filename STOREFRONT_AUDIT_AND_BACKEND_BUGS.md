# Cross‑Coin / Obzus — Storefront Audit + Backend Bug Report

_Prepared for illusiodesigns@gmail.com. Covers all 7 storefronts (SEO + shopping‑journey) and a backend bug hunt focused on stats, reports and WhatsApp. Every finding is tied to a file that was read._

Brands: **Crosscoin**, **Gripzus** (Pages Router) · **Knitwink**, **Morbix**, **Soxbae**, **Velmique**, **Velquira** (App Router). One shared backend API, brand‑scoped by the `X-Brand-Name` header.

---

## PART A — Must‑fix before launch (highest shopper/business impact)

| # | Brand | Issue | Why it matters |
|---|-------|-------|----------------|
| 1 | **Gripzus** | **Live auth is bypassed.** `src/pages/login.jsx:24` + `register.jsx:24` set `OTP_TEST_MODE = true` → OTP **`1111` logs in/registers as ANY phone**. | Anyone can enter any customer's account and place COD orders as them. Set both to `false`. |
| 2 | **Velmique** | **Orphan FAKE checkout + confirmation pages.** `app/checkout/page.jsx` collects raw card number/expiry/CVV into plain inputs and just `clearCart()` + redirect — no backend, no order. `app/order-confirmation/page.jsx` shows a random `#VLQ-####`. | Both routes are directly reachable/indexable and harvest card data to nowhere. Delete both (real flow is the cart drawer). |
| 3 | **Crosscoin** | **Register is a login dead‑end.** `register.jsx` collects only username/email/password (no phone), but `login.jsx` is phone‑OTP gated by `check-phone`. | A shopper who registers can **never log in**. Make register phone‑OTP based (like Gripzus/Morbix) or add a phone field. |
| 4 | **Velmique** | **Wrong domain across all SEO surfaces** — code defaults to `velmique.com`, brand is `velmique.co.in` (canonical, OG url, sitemap `<loc>`, robots host). Only `lib/productFeed.js` uses the right one. | Canonical/indexing split‑brain. Fix fallback in `app/layout.jsx`, `sitemap.js`, `robots.js`, `product/[slug]/page.jsx` and set `NEXT_PUBLIC_SITE_URL` in Vercel. |

---

## PART B — SEO audit

### Shared facts
- SEO is **data‑driven** from the backend (`seoMetadataModel`, `productSEOModel`, category SEO + `seoIndex` noindex flag, `blogSeoModel`, `defaultSeoData`). The capability exists for every brand; the gap is **which storefronts actually consume and render it server‑side**.
- All brands use raw `<img>` (ImageKit transforms) rather than `next/image`; CLS is held by CSS containers, not intrinsic width/height.

### Status matrix (product pages unless noted)

| Brand | title | desc | canonical | OG/Twitter | JSON‑LD | robots.txt | sitemap | noindex priv. | 404 | domain |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Crosscoin | ✓ | ✓ | ⚠ www | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⚠ |
| Gripzus | ⚠ CSR | ⚠ CSR | ✓ | ⚠ | ✗ | ⚠ no ref | ✗ | ✗ | ⚠ | ✓ |
| Knitwink | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Morbix | ✓ | ⚠ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Soxbae | ✓ | ⚠ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Velmique | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⚠ route | ⚠ | ✓ | ✗ .com |
| Velquira | ✓ | ⚠ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

**Tiers:** Knitwink & Crosscoin are strongest (full canonical/OG/JSON‑LD/sitemap/robots). Velmique is mature but shipped the wrong domain. **Morbix/Soxbae/Velquira are near‑identical and thin** — title‑only metadata, no canonical/OG/JSON‑LD/robots/sitemap/noindex/404.

### Top SEO fixes, ranked
1. **Morbix, Soxbae, Velquira: no sitemap and no robots.txt.** Port Knitwink's `app/sitemap.js` + `app/robots.js`, swapping domain/brand (morbixsocks.com / soxbaesocks.com / velquira.in). Cluster routes: products `/products/<slug>`, collections `/collections/<handle>`.
2. **Velmique wrong domain** (Part A #4).
3. **Cluster product/collection pages: no canonical, no per‑page OG/Twitter, no JSON‑LD.** Extend `generateMetadata` with `alternates.canonical` + `openGraph` + `twitter`; server‑inject Product+Breadcrumb / CollectionPage+ItemList+Breadcrumb JSON‑LD. Templates: Knitwink `collections/[handle]/page.jsx`, Velmique `product/[slug]/page.jsx`. Backend already provides `product.seo.structuredData`.
4. **Cluster: no noindex + no robots.txt** → cart/account/login/wishlist/search indexable. Add `robots:{index:false}` to private routes.
5. **Gripzus: no XML sitemap, no JSON‑LD, no dynamic collection pages.** Port Crosscoin's `sitemap.xml.js`, add `Sitemap:` to robots.txt, add Product/Breadcrumb JSON‑LD, add `collections/[slug].jsx`.
6. **Gripzus product pages are client‑rendered** — product title/description/OG/JSON‑LD are not in the initial HTML; crawlers see generic "Gripzus". Add `getServerSideProps` (its sibling `journal/[slug].jsx` already SSRs; Crosscoin's product page is the template).
7. **Crosscoin www vs non‑www inconsistency** — robots.txt + sitemap use `www.crosscoin.in`, canonical/OG default to `crosscoin.in`. Pick one host; align env + add a redirect.
8. **Velmique sitemap emits `/collections/<slug>` with no matching route** → those URLs 404. Add the route or drop the entries. Also verify the home page has an `<h1>` (`HeroBanner.jsx` currently has none).
9. **Cross‑cutting (lower):** no intrinsic image dimensions anywhere; add width/height (or aspect‑ratio) + `fetchPriority="high"` on LCP images; set `metadataBase` in Knitwink & Velmique layouts.

---

## PART C — Shopping‑journey audit

**Shared pattern:** In 6 of 7 brands checkout is **not a page** — it lives entirely inside `CartDrawer` (line items → coupon → summary → address + pincode serviceability → shipping/COD‑vs‑prepaid → COD `createOrder` or prepaid Razorpay `initiateCheckout`+`verifyPayment` with cancel/retry → in‑drawer success with real order number + track link). Every endpoint the storefronts call exists in the backend. The funnel is genuinely functional and consistent across brands.

**Design facts worth knowing:**
- **No OTP verification inside checkout anywhere** — guest checkout collects a phone but never verifies it → COD‑abuse exposure (design gap, not a break).
- Listing pages render the **full** product set (no server pagination); sort/filter facets exist only on `/products`, not on `/collections/[handle]`.
- All brands share one WhatsApp helpline (`wa.me/917434834000`) hardcoded in drawers/footers.

**Ranked gaps/bugs:**
1. Gripzus auth bypass (Part A #1).
2. Velmique fake checkout/confirmation + dead "Apply" promo button on `app/cart/page.jsx` + hardcoded shipping inconsistent with drawer (Part A #2).
3. Crosscoin register lockout (Part A #3).
4. **Soxbae & Velquira — dead home CTA:** `components/home/ClubBand.jsx:16` "Become a member" is `href="#"`.
5. **Crosscoin sitemap dead links:** `src/pages/sitemap.jsx:49‑82` — Shop by Category/Price/New Arrivals/Offers all `href="#"`.
6. **Polish:** Morbix/Soxbae/Velquira PDPs have **no "Buy Now"** (only Add to Cart) while other brands do; Crosscoin CartDrawer has a dead `verifyCheckoutPhoneOtp` import; Knitwink & Velmique cart **pages** show hardcoded shipping that can differ from the drawer's real fee; `collections/[handle]` pages have no sort/filter/pagination.

---

## PART D — Backend bugs (stats / reports / WhatsApp)

### Confirmed

**[HIGH] WhatsApp inbound messages have no dedupe.** `controller/whatsappController.js:1437` creates the message with no "already seen?" check, and `model/whatsappConversationModel.js:68` `idx_wa_msg_wa_msg_id` is a **plain** index, not unique. Meta webhooks are at‑least‑once → a redelivered message creates a duplicate row, double‑increments `unread_count`, and fires auto‑reply/COD handlers twice (customer gets the same bot reply twice; stats inflate). **Fix:** unique index on `wa_message_id` + `findOrCreate`/`ON DUPLICATE KEY`; only count/auto‑reply when newly created.

**[HIGH/MED] Dashboard stats load the entire orders table.** `services/dashboardService.js:60‑64` does `Order.findAll({ where: orderWhere })` with **no limit**; with no date filter (the default cached dashboard) it pulls every order ever into memory. Grows unbounded. **Fix:** push aggregation into SQL (GROUP BY status/payment_type/brand_id, SUM(final_amount)) or bound by a date window.

**[MED] Per‑brand dashboard caches are never event‑invalidated.** `dashboardService.js:11,837‑838` keys the cache by brand, but `invalidateDashboardCache(userId)` passes `brandId=undefined` → always clears only `dashboard:brand:all:stats`; `orderEvents.js:196` passes a user id into the brand slot. Brand‑scoped dashboards serve stale numbers until the 60s TTL. **Fix:** invalidate by `order.brand_id` and clear the `all` key too.

**[MED] WhatsApp deliveryRate under‑reports.** `whatsappController.js:1475` overwrites each message's status to the latest state, so delivered‑then‑read messages end as `read`; `getStats` (619‑622) computes `delivered/sent` excluding them. **Fix:** `(delivered + read) / sent`.

**[MED] Reports brand‑traffic uses server‑local day boundaries, not IST.** `controller/reportsController.js:24‑30` (`parseRange`) builds the day in host TZ, while the rest of the system anchors to IST (`utils/dateRange.js`, adsReportController). On a UTC host, orders/sessions near midnight land in the wrong day and won't match the Overview the code claims to match. **Fix:** use `dayStartTZ/dayEndTZ`.

**[MED] Brand‑scoped dashboard leaks GLOBAL numbers for several blocks.** `dashboardService.js` — recentOrders count (212‑218), the whole customers block (152‑194), topProducts/lowStock/outOfStock SQL (311‑358), utmStats/utmConversions (550‑578), reviews (197‑209) ignore the brand filter while orders.total/revenue are brand‑scoped. Misleading mixed view. **Fix:** thread brandId through these queries.

**[MED/LOW] Dashboard raw SQL excludes only `'cancelled'`, not `'order cancelled'`.** `dashboardService.js:323` (topProducts) and `:571` (utmConversions) — everywhere else both are treated as cancelled. Those two let `order cancelled` orders count toward top‑seller + UTM revenue. **Fix:** `LOWER(o.status) NOT IN ('cancelled','order cancelled')`.

**[LOW/MED] WhatsApp status updates have no out‑of‑order guard.** `whatsappController.js:1475` — a late `delivered` can overwrite `read`. **Fix:** advance status monotonically only.

### Needs verification (intent‑dependent — confirm before changing)
- **V1 [MED?]** Ads report revenue/ROAS includes cancelled + RTO order amounts (`adsReportController.js:226` `SUM(final_amount)` with no status filter) → overstates ROAS/GP. Confirm whether the sheet intends gross‑booked revenue.
- **V2 [MED?]** brand‑traffic funnel can show >100% — "Orders" stage counts all non‑cancelled orders by brand, but rates divide by tracked sessions (`reportsController.js:155‑173`). Confirm the chart tolerates >100% or cap it.
- **V3 [LOW]** KPI revenue‑delta uses only `status==='delivered'` (`dashboardService.js:240`) while headline earned revenue counts delivered OR completed.
- **V4 [LOW]** Bot‑detect SQL regex drifted from the JS list (`utils/botDetect.js`) — WhatsApp/link‑preview crawlers count as real sessions.
- **V5 [LOW]** WhatsApp rate limiter can wedge if a key ever lacks a TTL (`whatsappService.js:571‑572`).
- **V6 [INFO]** Dead duplicate webhook handler (`whatsappController.js:228‑557`) is replaced at runtime by the 1303 version — a fixer editing the obvious first handler would change nothing. Recommend deleting the dead block.

### Checked and OK
Dashboard date‑filter Symbol handling; getStats brand subquery (no SQLi); sourceRows COUNT(DISTINCT) (no fan‑out); topProducts subtotal (no fan‑out); webhook verify‑token + HMAC (fails‑open until `WHATSAPP_WEBHOOK_SECRET` set, closable via `WEBHOOK_REQUIRE_SIGNATURE=true`); division‑by‑zero guards.
