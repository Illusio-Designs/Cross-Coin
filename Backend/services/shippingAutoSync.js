'use strict';

/**
 * Shipping auto-sync switch.
 *
 * When OFF (the default), the store runs in MANUAL booking mode:
 *   - order.confirmed does NOT auto-book the shipment and does NOT enqueue retries
 *   - the shipping:sync-order retry queue drains without booking (no retry spam)
 *   - the cron:shipping-sync bulk job is a no-op
 * Orders simply wait as "pending sync" and the admin books each one manually
 * from the dashboard (per-row Sync). Manual booking is unaffected — it calls the
 * controller directly, not through these auto paths.
 *
 * Flip it back to automatic by setting the env var:
 *   SHIPPING_AUTO_SYNC=on   (also accepts true / 1 / yes)
 */
function isAutoSyncEnabled() {
  return ['on', 'true', '1', 'yes'].includes(
    String(process.env.SHIPPING_AUTO_SYNC ?? 'off').toLowerCase().trim()
  );
}

module.exports = { isAutoSyncEnabled };
