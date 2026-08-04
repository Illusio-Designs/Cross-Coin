# WhatsApp Business — Go-Live Setup Checklist

One **shared verified number** serves all 7 brands. The account is configured on
**CrossCoin (brand 1)**; every other brand falls back to it automatically, and
each message shows the correct brand + customer name.

Work top to bottom. Nothing here needs code changes — it's all configuration.

---

## 1) Meta / WhatsApp Manager (business.facebook.com)

- [ ] Verified WhatsApp number + WhatsApp Business Account (WABA) — already in place.
- [ ] Copy these **4 credentials** (Meta → your App → WhatsApp → API Setup, and App → Settings → Basic):
  - [ ] Permanent access token → `WHATSAPP_API_TOKEN`
  - [ ] Phone number ID → `WHATSAPP_PHONE_NUMBER_ID`
  - [ ] WhatsApp Business Account ID → `WHATSAPP_BUSINESS_ACCOUNT_ID`
  - [ ] App Secret → `WHATSAPP_WEBHOOK_SECRET`
- [ ] Configure the **webhook** (App → WhatsApp → Configuration):
  - [ ] Callback URL: `https://api.crosscoin.in/api/whatsapp/webhook`
  - [ ] Verify token: any string you choose (must equal `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
  - [ ] Click **Verify and Save**
  - [ ] **Subscribe to the `messages` field** ← required for inbound replies, COD confirmations, and media
- [ ] Templates get approved from the dashboard (Section 3). Meta usually approves UTILITY templates within minutes.

> You do **NOT** need `WHATSAPP_CATALOG_ID` — product sharing is catalog-free (product photo + link).

---

## 2) Backend environment variables (`.env`)

```
WHATSAPP_API_TOKEN=<permanent token>
WHATSAPP_PHONE_NUMBER_ID=<phone number id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<WABA id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<same string you set in the Meta webhook>
WHATSAPP_WEBHOOK_SECRET=<App Secret from Meta>
WEBHOOK_REQUIRE_SIGNATURE=true        # turn ON only AFTER the secret above is set & verified
WHATSAPP_SHARED_BRAND_ID=1            # CrossCoin holds the shared account
```

- [ ] Set all values above.
- [ ] Set `WHATSAPP_WEBHOOK_SECRET` **first**, confirm inbound messages still arrive, **then** set `WEBHOOK_REQUIRE_SIGNATURE=true`.
      (Until the secret is set + enforcement is on, the webhook accepts unsigned requests — i.e. spoofable.)
- [ ] Restart the backend so the startup migrations run (they auto-add the new
      `whatsapp_messages.type` values and `whatsapp_conversations.awaiting_address_for` column).

> The WhatsApp credentials may live in `.env` **or** in CrossCoin's brand settings — either works.

---

## 3) In the dashboard

- [ ] **Copy WhatsApp settings into every brand** (Settings): paste the 5 `WHATSAPP_*`
      values into each brand; mark `WHATSAPP_API_TOKEN` as **encrypted**.
      (Any brand you miss still works via the CrossCoin fallback.)
- [ ] **Set each brand's live domain** on the Brand record (Brands admin) — this is
      what product-card links use, e.g. `morbix.in`. Blank → falls back to `crosscoin.in`.
      - Velmique uses `/product/<slug>`; the other 6 use `/products/<slug>` — handled
        automatically. To override for a future brand, set `STORE_PRODUCT_PATH`.
- [ ] Confirm each brand has **`STORE_NAME`** and **`STORE_URL`** set.
- [ ] **Templates → Template Manager:**
  - [ ] **Seed** all templates (make sure the new `order_packed` and `address_request` exist).
  - [ ] **Re-submit** the order templates (select → *Re-submit selected*) so Meta re-approves the new copy/variables.
  - [ ] Wait until every template shows **Approved** (sends fail until then).

---

## 4) Test (after templates are Approved)

- [ ] Place a **test COD order** → receive "Confirm your COD order" with Confirm/Wrong buttons.
- [ ] Tap **Confirm Address** (or reply **YES**) → order becomes **confirmed** in the dashboard.
- [ ] Tap **Wrong Address** (or reply **NO**) → receive address request → reply with a new
      address → order re-confirms with the updated address + pincode.
- [ ] Click **Sync** on the confirmed order → iThink books the courier →
      receive **"Packed"**, then **Shipped** / **Delivered** as the status changes.
- [ ] WhatsApp inbox: send yourself a **photo, PDF, and voice note** (all render);
      send a **product card** back to a customer.

---

## The full lifecycle (what fires automatically)

```
COD placed → cod_order_confirmation (Confirm / Wrong Address)
  ├─ Confirm / YES → order_confirmation → [Sync] → order_packed → order_shipped
  │                    → order_out_for_delivery → order_delivered → review_request
  └─ Wrong / NO   → address_request → customer sends new address → captured → re-confirm ↺
Cancelled / RTO → order_cancelled     Refund → refund_processed
```

Every message leads with `{{1}}` = customer's first name and `{{2}}` = brand.

---

## Templates (12) that must be Approved

| Template | Stage |
|---|---|
| `cod_order_confirmation` | COD order placed — Confirm / Wrong Address buttons |
| `order_confirmation` | Confirmed & processing |
| `address_request` | Ask for corrected address (Wrong Address flow) |
| `order_packed` | Booked with courier — packed & ready |
| `order_shipped` | Dispatched + AWB + tracking link |
| `order_out_for_delivery` | Arriving today |
| `order_delivered` | Delivered |
| `order_cancelled` | Cancelled / RTO |
| `refund_processed` | Refund initiated |
| `review_request` | Rate your experience |
| `popup_coupon`, `cart_abandoned` | Marketing (optional) |

---

## Reference — what's set where

| Item | Where |
|---|---|
| Token, Phone ID, WABA ID, Verify token, App Secret | Meta → `.env` |
| `WEBHOOK_REQUIRE_SIGNATURE=true` | `.env` (after secret set) |
| Webhook URL + subscribe `messages` | Meta → Configuration |
| Copy `WHATSAPP_*` to all brands | Dashboard → brand Settings (manual) |
| Brand `domain`, `STORE_NAME`, `STORE_URL` | Brands admin / settings |
| Seed + Re-submit + approve templates | Dashboard → Templates |
| iThink creds + warehouse pincode | Already set per brand |

---

## Still open (tell me when ready)

- [ ] Remove the manual **Confirm Order** button once WhatsApp confirmation is verified working.
- [ ] (Optional) Add a **reminder** to re-ping COD customers who don't reply, so orders don't sit
      in `awaiting_confirmation`. Non-responders currently stay unshipped on purpose (keeps RTO low).
