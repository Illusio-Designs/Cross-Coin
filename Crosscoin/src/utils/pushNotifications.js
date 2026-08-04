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

// Returns { ok, reason }. reason ∈ unsupported | disabled | denied | error.
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  // Is Web Push configured on the server (VAPID key present)?
  let vapid;
  try { vapid = await whatsappService.getPushVapidKey(); }
  catch { return { ok: false, reason: 'error' }; }
  if (!vapid?.enabled || !vapid?.publicKey) return { ok: false, reason: 'disabled' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
    });
  }

  await whatsappService.savePushSubscription(sub.toJSON());
  return { ok: true };
}
