# Tracking & Ads Setup — All Brands

One guide for every storefront: **Crosscoin, Gripzus, Morbix, Soxbae, Knitwink, Velmique, Velquira**.

It covers **Google Tag Manager, Google Analytics 4, Google Ads, Google Search Console, Meta (Facebook) Pixel + Conversions API**, and Microsoft Clarity. Only the required steps — set the IDs, verify, done.

---

## How it works (read this first)

- **All tracking IDs are config-driven.** They live in **Brand Settings** in the admin dashboard, *not* in code. Change an ID → it takes effect on the next page load, **no redeploy**.
- **Everything is per-brand.** Each storefront calls the shared API with its own brand name (`X-Brand-Name`), so each brand can have its **own** pixel, GA4, Ads, GTM, etc. The brand keys are:

  | Brand | `X-Brand-Name` | Storefront |
  |---|---|---|
  | Crosscoin | `crosscoin` | crosscoin.in |
  | Gripzus | `gripzus` | (Gripzus domain) |
  | Morbix | `morbix` | (Morbix domain) |
  | Soxbae | `soxbae` | (Soxbae domain) |
  | Knitwink | `knitwink` | (Knitwink domain) |
  | Velmique | `velmique` | (Velmique domain) |
  | Velquira | `velquira` | (Velquira domain) |

- **The tags are server-rendered / injected on the public storefront only** — never on the admin dashboard (`/dashboard`) or auth pages, and never on Vercel preview builds. So your analytics stay clean.

---

## Where to set values

Admin **Dashboard → Brand Settings**:

1. Select the **brand** at the top.
2. Open the **Analytics** category tab.
3. Click **“+ Add Setting”**.
4. Enter the **Key** and **Value** from the tables below, set **Category = Analytics**, and **Save**.
5. To change one later, edit its value; to remove one, use its delete button.

> If a setting isn't present, the storefront falls back to a sensible default (or skips that tag). Set the brand's own values to make it explicit and correct.

### All keys at a glance

| Key | Service | Required? | Example value |
|---|---|---|---|
| `GTM_ID` | Google Tag Manager | Recommended | `GTM-XXXXXXX` |
| `GA_MEASUREMENT_ID` | Google Analytics 4 | Required | `G-XXXXXXXXXX` |
| `GA_API_SECRET` | GA4 server events (optional) | Optional | `xxxxxxxx` |
| `GOOGLE_ADS_ID` | Google Ads tag | If running Ads | `AW-XXXXXXXXX` |
| `GOOGLE_ADS_LABEL_PURCHASE` (+ per event) | Google Ads conversions | If running Ads | `AbC-D_efGh` |
| `FB_PIXEL_ID` | Meta Pixel | Required for Meta | `15-digit id` |
| `FB_ACCESS_TOKEN` | Meta Conversions API | Required for CAPI | long token |
| `CLARITY_ID` | Microsoft Clarity | Optional | `xxxxxxxxxx` |

---

## 1. Google Tag Manager (GTM)

**What:** a container that can host other tags. Loaded high in `<head>` + a `<noscript>` iframe.

**Get it:** [tagmanager.google.com](https://tagmanager.google.com) → create/choose a **Web** container → copy the **`GTM-XXXXXXX`** id.

**Set:** Brand Settings → `GTM_ID` = `GTM-XXXXXXX`.

**Verify:** GTM → **Preview**, or the **Tag Assistant** browser extension → connect to the storefront → confirm the container fires.

> ⚠️ GTM can *also* fire GA4 / Ads / Meta tags. Don't set the **same** tag both directly (below) **and** inside GTM, or you'll double-count. Pick one place per tag.

---

## 2. Google Analytics 4 (GA4)

**What:** on-site behaviour + traffic reporting. Fires `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`.

**Get it:** [analytics.google.com](https://analytics.google.com) → **Admin → Data Streams → Web** → copy the **Measurement ID** `G-XXXXXXXXXX`.

- *(Optional, server-side)* Same stream → **Measurement Protocol API secrets → Create** → copy the secret → set `GA_API_SECRET`. Only needed for server-sent GA events.

**Set:** Brand Settings → `GA_MEASUREMENT_ID` = `G-XXXXXXXXXX` (and optionally `GA_API_SECRET`).

**Verify:** GA4 → **Reports → Realtime** → browse the storefront in another tab → see yourself live.

---

## 3. Google Ads

**What:** the ads tag (`AW-…`) + conversion tracking. Fires on the same funnel events as GA4.

**Get it:** [ads.google.com](https://ads.google.com) → **Tools → Conversions**.

1. The base **tag id** is `AW-XXXXXXXXX` (shown when you set up the tag / a conversion action).
2. Create a conversion action (start with **Purchase**; optionally **Add to cart**, **Begin checkout**). Each gives a `send_to` like `AW-XXXXXXXXX/AbC-D_efGh` — the part **after the slash** is that event's **label**.

**Set:**
- `GOOGLE_ADS_ID` = `AW-XXXXXXXXX`
- **One simple setting per conversion — no JSON needed.** Add the label (the part after the slash) under the matching key; only the events you add will fire:

  | Setting key | Fires on |
  |---|---|
  | `GOOGLE_ADS_LABEL_PURCHASE` | order confirmed |
  | `GOOGLE_ADS_LABEL_ADD_TO_CART` | add to cart |
  | `GOOGLE_ADS_LABEL_BEGIN_CHECKOUT` | checkout started |
  | `GOOGLE_ADS_LABEL_ADD_SHIPPING_INFO` | shipping added |
  | `GOOGLE_ADS_LABEL_ADD_PAYMENT_INFO` | payment added |
  | `GOOGLE_ADS_LABEL_VIEW_ITEM` | product viewed |

  e.g. `GOOGLE_ADS_LABEL_PURCHASE` = `AbC-D_efGh`. (A `GOOGLE_ADS_CONVERSION_LABELS` JSON map is still accepted, but you don't need it.)

**Verify:** **Tag Assistant** → confirm the `AW-` tag loads; Ads → **Conversions** shows data 1–3 days after go-live.

---

## 4. Google Search Console (SEO / rankings)

**What:** the source of truth for keyword rankings, impressions and clicks. **Not a Brand Setting** — it's verified at the **domain** level.

**Steps (per brand domain):**
1. [search.google.com/search-console](https://search.google.com/search-console) → **Add property** → enter the brand's domain.
2. **Verify ownership** — easiest is the **DNS TXT record** at the registrar, or the **HTML tag** method.
3. **Submit the sitemap:** `https://<brand-domain>/sitemap.xml`.
4. Rankings populate over **2–7 days** and mature over a few weeks.

*(Optional)* Link Search Console ↔ GA4 (GA4 Admin → Product Links) to see queries inside GA4.

---

## 5. Meta (Facebook) Pixel + Conversions API (CAPI)

**What:** browser **Pixel** + server **Conversions API** for Meta Ads. Both should fire, sharing the same event id so Meta **deduplicates** them.

### 5a. Pixel (browser) — required
**Get it:** [Meta Events Manager](https://business.facebook.com/events_manager) → your **dataset/pixel** → copy the **Pixel ID** (15 digits).

**Set:** Brand Settings → `FB_PIXEL_ID` = `<pixel id>`.

- ✅ **Advanced Matching is already handled in code** — when a shopper is signed in, the pixel is re-initialised with their hashed email/phone/name automatically. Nothing to configure.

### 5b. Conversions API (server) — required for full coverage
**Get it:** Events Manager → **Settings → Conversions API → Generate access token** → copy the long token.

**Set:** Brand Settings → `FB_ACCESS_TOKEN` = `<token>`.

- Without this token the server sends **no** CAPI events (only the browser pixel fires). Set it to get server-side coverage + better attribution.

**Verify:** Events Manager → **Test events** → browse/checkout → see both **Browser** and **Server** events arriving, marked **Deduplicated**.

> **Deduplication:** `Purchase` already dedupes (browser + server share `Purchase_<order_number>`). Full dedup for `InitiateCheckout`/`AddToCart` needs shared event-ids threaded through checkout — see the code TODO; ask the dev team to enable it.

---

## 6. Microsoft Clarity (optional — heatmaps/session replay)

**Get it:** [clarity.microsoft.com](https://clarity.microsoft.com) → project → **Settings → copy the Clarity ID**.

**Set:** Brand Settings → `CLARITY_ID` = `<id>`.

---

## Per-brand checklist

Do this for **each** brand (repeat sections 1–6 with that brand selected in Brand Settings):

- [ ] `GA_MEASUREMENT_ID` set (GA4) — **required**
- [ ] `FB_PIXEL_ID` set (Meta Pixel) — **required for Meta**
- [ ] `FB_ACCESS_TOKEN` set (Meta CAPI) — **required for server events**
- [ ] `GTM_ID` set (if using GTM)
- [ ] `GOOGLE_ADS_ID` + `GOOGLE_ADS_CONVERSION_LABELS` set (if running Google Ads)
- [ ] `CLARITY_ID` set (optional)
- [ ] Domain **verified in Search Console** + `sitemap.xml` submitted
- [ ] (Optional) Linked GA4 ↔ Google Ads ↔ Search Console

---

## Final verification (per brand)

| Tool | Where | Looks healthy when… |
|---|---|---|
| GA4 | Realtime report | you appear live while browsing |
| Meta | Events Manager → Test events | Browser + Server events, **Deduplicated** |
| Google Ads | Tag Assistant | `AW-` tag detected; conversions after 1–3 days |
| GTM | GTM Preview / Tag Assistant | container fires |
| Search Console | Coverage / Performance | pages indexed, queries appear (a few days) |

> Reminder: none of this shows **inside** the admin dashboard — the data lives in each provider's own console (GA4, Meta, Google Ads, Search Console). The admin only manages the **IDs**.
