// Browser Web-Push enablement for the dashboard. Registers the service worker,
// asks permission, subscribes with the server's VAPID key, and stores the
// subscription on the backend so it can push order alerts even when the tab is
// closed. Safe to call repeatedly.
import { whatsappService } from '../services';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function pushPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'default';
}

// Returns { ok, reason, endpoint }. reason ∈ unsupported | disabled | denied | error.
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  // Ask first, before any network call: iPhone/iPad only show the permission
  // prompt while the tap that started it is still "fresh", and a request made
  // after awaiting the server can be refused without ever being shown.
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  // Is Web Push configured on the server (VAPID key present)?
  let vapid;
  try { vapid = await whatsappService.getPushVapidKey(); }
  catch { return { ok: false, reason: 'error' }; }
  if (!vapid?.enabled || !vapid?.publicKey) return { ok: false, reason: 'disabled' };

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const key = urlBase64ToUint8Array(vapid.publicKey);
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an older server key never receives anything —
  // drop it and subscribe again with the current key.
  if (sub && sub.options?.applicationServerKey) {
    const old = new Uint8Array(sub.options.applicationServerKey);
    if (old.length !== key.length || old.some((b, i) => b !== key[i])) {
      try { await sub.unsubscribe(); } catch (_) { /* subscribe again below */ }
      sub = null;
    }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }

  await whatsappService.savePushSubscription(sub.toJSON());
  return { ok: true, endpoint: sub.endpoint };
}

// Ask the server to push a test alert to this browser/phone.
// Returns { ok, message }.
export async function sendTestPush(endpoint) {
  try {
    const r = await whatsappService.testPush(endpoint);
    return { ok: !!r?.success, message: r?.message || '' };
  } catch (e) {
    return { ok: false, message: e?.response?.data?.message || 'Could not reach the server.' };
  }
}
