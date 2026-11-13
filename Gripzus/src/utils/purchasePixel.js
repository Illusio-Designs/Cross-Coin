// @generated — DO NOT EDIT. Source: shared/frontend/purchasePixel.js
// Edit that file then run: node scripts/sync-frontend-shared.mjs
import { getConsent } from '../lib/consent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'gripzus';
const LIBRARY = 'https://connect.facebook.net/en_US/fbevents.js';
let pending = null;

// Like Morbix's client tracking-config fallback, recover a missing server tag.
// Called only for a verified Purchase, so normal landing-page loading stays deferred.
export function ensurePurchasePixel() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!getConsent().marketing || /^\/(dashboard|auth)(\/|$)/.test(window.location.pathname) || /\.vercel\.app$/.test(window.location.hostname)) return Promise.resolve(false);
  if (typeof window.fbq?.callMethod === 'function') return Promise.resolve(true);
  if (pending) return pending;
  pending = (async () => {
    if (!window._fbqId) {
      const response = await fetch(`${API_URL}/api/public/tracking-config`, {
        cache: 'no-store', headers: { 'X-Brand-Name': BRAND },
      });
      const config = await response.json();
      if (!response.ok || !config?.success || !/^\d+$/.test(String(config.fb_pixel_id || ''))) return false;
      const id = String(config.fb_pixel_id);
      if (!window.fbq) {
        const queue = function () { queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments); };
        queue.queue = []; queue.push = queue; queue.loaded = true; queue.version = '2.0';
        window.fbq = queue;
        window._fbq = queue;
      }
      window._fbqId = id;
      const match = window.__fbUser || {};
      window.fbq('init', id, match);
      window.dispatchEvent(new Event('brand-fbq-ready'));
    }
    if (typeof window.fbq?.callMethod === 'function') return true;
    return new Promise((resolve) => {
      const existing = document.querySelector(`script[src="${LIBRARY}"]`);
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = (ready) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(ready);
      };
      const timeout = setTimeout(() => finish(false), 15000);
      script.addEventListener('load', () => finish(typeof window.fbq?.callMethod === 'function'), { once: true });
      script.addEventListener('error', () => { script.remove(); finish(false); }, { once: true });
      if (!existing) { script.src = LIBRARY; script.async = true; document.head.appendChild(script); }
    });
  })().catch(() => false).then((ready) => { pending = null; return ready; });
  return pending;
}
