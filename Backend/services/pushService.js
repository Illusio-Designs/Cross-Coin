'use strict';

const crypto = require('crypto');
const { logger } = require('../config/logging.js');

// Web Push (browser notifications that fire even when the dashboard tab is
// closed). Configure with VAPID keys:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — generate once: `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT                        — a mailto: or https: contact URL
// Degrades to a no-op if the library or keys are absent, so it never breaks the
// order flow.
let webpush = null;
let configured = false;
try {
  webpush = require('web-push');
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@crosscoin.in', pub, priv);
    configured = true;
  }
} catch (e) {
  logger.warn('[Push] web-push unavailable: ' + e.message);
}

function isEnabled() {
  return !!(webpush && configured);
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function hashEndpoint(endpoint) {
  return crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 64);
}

// Save (or refresh) a browser subscription. Idempotent on the endpoint.
async function saveSubscription(sub, userId = null) {
  if (!sub || !sub.endpoint || !sub.keys) throw new Error('Invalid subscription');
  const { PushSubscription } = require('../model/pushSubscriptionModel.js');
  const endpoint_hash = hashEndpoint(sub.endpoint);
  await PushSubscription.upsert({
    endpoint: sub.endpoint,
    endpoint_hash,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_id: userId,
  });
  return { ok: true };
}

// Send a notification to every saved subscription. Prunes dead ones (404/410).
async function sendToAll(payload) {
  if (!isEnabled()) return { skipped: true };
  const { PushSubscription } = require('../model/pushSubscriptionModel.js');
  let subs = [];
  try { subs = await PushSubscription.findAll(); } catch (e) {
    logger.warn('[Push] could not read subscriptions: ' + e.message);
    return { error: e.message };
  }
  if (!subs.length) return { sent: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const dead = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      );
      sent++;
    } catch (err) {
      const code = err.statusCode;
      if (code === 404 || code === 410) dead.push(s.id); // gone — remove it
      else logger.warn(`[Push] send failed (${code || '?'}): ${err.message}`);
    }
  }));

  if (dead.length) {
    try { await PushSubscription.destroy({ where: { id: dead } }); } catch (_) {}
  }
  return { sent, pruned: dead.length };
}

module.exports = { isEnabled, getPublicKey, saveSubscription, sendToAll };
