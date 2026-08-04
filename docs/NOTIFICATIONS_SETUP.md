# Off-Dashboard Notifications — Setup

The dashboard already shows live in-app alerts (bell + sound) via long-poll, but
only while a tab is open. These two channels reach you when it's **not**:

- **Telegram** — instant DM to a staff group on every **new order**.
- **Web Push** — browser notification that fires even when the dashboard tab is
  **closed** (and on mobile if the dashboard is added to the home screen).

Both are **fire-and-forget and optional** — if unconfigured they no-op, and the
order flow is never affected. Current trigger: **new orders**.

---

## 1) Telegram (recommended — dead simple, reaches phones)

1. In Telegram, message **@BotFather** → `/newbot` → follow prompts → copy the **bot token**.
2. Create a group (e.g. "CrossCoin Orders"), **add your bot** to it.
3. Get the group's **chat id**: add **@RawDataBot** (or **@getidsbot**) to the group briefly, or
   send a message and open `https://api.telegram.org/bot<TOKEN>/getUpdates` → read `chat.id`
   (group ids look like `-1001234567890`).
4. Set env:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-your-bot-token
   TELEGRAM_CHAT_ID=-1001234567890        # one or more, comma-separated
   ```
5. Restart the backend → place a test order → the group gets "🛒 New order …".

Multiple recipients: comma-separate ids in `TELEGRAM_CHAT_ID` (e.g. a group + your own DM id).

---

## 2) Web Push (browser notifications, tab can be closed)

1. Generate VAPID keys once (already-installed lib):
   ```
   cd Backend && npx web-push generate-vapid-keys
   ```
2. Set env:
   ```
   VAPID_PUBLIC_KEY=<public key>
   VAPID_PRIVATE_KEY=<private key>
   VAPID_SUBJECT=mailto:admin@crosscoin.in
   ```
3. Restart the backend (an idempotent migration creates the `push_subscriptions` table on boot).
4. In the dashboard, open the 🔔 **bell → "Enable alerts"**, and allow notifications when the
   browser asks. That device is now subscribed — it shows "Alerts on".
5. **Mobile:** open the dashboard in Chrome/Safari, add it to the home screen, then Enable alerts —
   you'll get push on the phone.

Notes:
- Each browser/device enables once; the subscription is stored server-side and re-verified on load.
- Dead subscriptions (uninstalled/expired) are auto-pruned when a push fails.
- If `web-push` isn't installed on the server or the VAPID keys are missing, push simply stays off
  (the "Enable alerts" button reports "not configured") — Telegram still works.

---

## Env summary

```
# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@crosscoin.in
```

## Want more later?
Easy to extend to more events (COD confirmed, new WhatsApp reply, sync failures) or more channels
(WhatsApp-to-admin, email) — just ask.
