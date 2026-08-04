# iThink Shipping Status — Real-time Webhook

Order status (Shipped → Out for Delivery → Delivered → RTO) can update **two ways**:

- **Webhook (real-time)** — iThink POSTs each scan to your server. Instant, lowest load.
- **Polling (fallback)** — the `cron:shipping-status-refresh` job + the **Refresh Tracking**
  button pull status from iThink's tracking API. Works without any webhook, just not instant.

Both feed the same status-update logic (which also fires the WhatsApp `order_shipped` /
`order_delivered` messages and the push/Telegram alerts).

---

## What you have to do

1. **Add the webhook URL in iThink's panel** (Settings → Webhook / Push Tracking URL, or ask
   iThink support to enable it for your account):

   ```
   https://api.crosscoin.in/api/orders/shipping/webhook
   ```

2. **Env — leave signing OFF for shipping** (iThink doesn't sign its callbacks):
   - Do **not** set `WEBHOOK_REQUIRE_SIGNATURE=true` (that would reject iThink's unsigned POSTs).
   - `ITHINK_WEBHOOK_SECRET` — only set this **if** iThink lets you configure a secret/HMAC for
     the webhook (most accounts don't). If unset, the endpoint accepts the callback.
   - WhatsApp stays secure independently via `WHATSAPP_WEBHOOK_SECRET`.

3. **Deploy** the current backend — the handler now accepts iThink's field names (and logs the
   raw payload the first time a real webhook lands).

4. **Confirm it works:** move a test order to Shipped/Delivered in iThink (or wait for a real
   scan). In the server logs you'll see:
   ```
   🔔 Shipping webhook received: {...}
   ```
   and the order status should flip in the dashboard within seconds. If the status does **not**
   change, copy that logged payload and send it over — the exact field names may need a small
   mapping tweak (iThink's webhook format isn't publicly documented, so the handler is written to
   tolerate common variants: awb / awb_number / waybill, current_status / status, reference_no /
   order_id, etc.).

---

## If you skip the webhook

Everything still works via polling:
- The **Refresh Tracking** button on the orders page pulls the latest status on demand.
- The **`cron:shipping-status-refresh`** OS cron (see the HTTP-cron setup) refreshes active
  orders on a schedule. Point a cPanel cron at:
  ```
  curl -fsS -H "x-cron-token: <CRON_TOKEN>" "https://api.crosscoin.in/api/cron/run?job=status-refresh" >/dev/null 2>&1
  ```
  e.g. every 30–60 minutes. The webhook just makes it instant instead.
