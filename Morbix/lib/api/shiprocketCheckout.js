/* Morbix — Shiprocket Checkout (their hosted checkout opens over the store).

   Our backend signs a checkout token for the chosen lines (the secret never
   reaches the browser) → Shiprocket's script opens its checkout with that
   token → after payment Shiprocket sends the shopper to
   /order-confirmation?oid=…&ost=…, where confirmShiprocketOrder() saves the
   order and the thank-you page fires the Purchase. */

import { trackingIds } from '@/utils/pixel';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'morbix';
const SDK_JS  = 'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
const SDK_CSS = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';
// Remembers, for the thank-you page, whether the checkout was the cart (so
// the cart is emptied after the order) or a single Buy now (cart untouched).
export const SR_SOURCE_KEY = 'mbx-sr-source';

let enabledPromise = null;
let sdkPromise = null;

// Is Shiprocket Checkout switched on for Morbix (Brand settings → Payments →
// Shiprocket Checkout, with keys saved)? Asked once per visit. Morbix checks
// out only through Shiprocket, so only a clear "switched off" (false) brings
// back the store's own checkout; if the question itself fails the answer is
// null ("don't know") and it is asked again next time.
export function shiprocketEnabled() {
  if (!enabledPromise) {
    enabledPromise = fetch(`${API_URL}/api/custom-checkout/status`, { headers: { 'X-Brand-Name': BRAND } })
      .then((r) => r.json())
      .then((d) => (typeof d?.enabled === 'boolean' ? d.enabled : null))
      .catch(() => null)
      .then((on) => { if (on === null) enabledPromise = null; return on; });
  }
  return enabledPromise;
}

// Download Shiprocket's script + stylesheet ahead of the tap, once the shopper
// first touches, scrolls or types on the page (and the browser is idle), so
// tapping Buy now / checkout doesn't wait for the download. Not on page load:
// it would cost the page's speed score, and most visitors never check out.
let preloadArmed = false;
export function preloadShiprocket() {
  if (preloadArmed || typeof window === 'undefined') return;
  preloadArmed = true;
  const evs = ['pointerdown', 'touchstart', 'keydown', 'scroll'];
  const go = () => {
    evs.forEach((e) => window.removeEventListener(e, go));
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    idle(() => {
      shiprocketEnabled().then((on) => { if (on !== false) loadShiprocketSdk().catch(() => {}); });
    });
  };
  evs.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
}

// Shiprocket's stylesheet (their checkout window + their Buy now button).
export function loadShiprocketCss() {
  if (typeof document === 'undefined' || document.querySelector(`link[href="${SDK_CSS}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SDK_CSS;
  document.head.appendChild(link);
}

// Load Shiprocket's checkout script + styles once; resolves when
// window.HeadlessCheckout exists.
export function loadShiprocketSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.HeadlessCheckout) return Promise.resolve(window.HeadlessCheckout);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      loadShiprocketCss();
      const s = document.createElement('script');
      s.src = SDK_JS;
      s.async = true;
      s.onload = () => (window.HeadlessCheckout ? resolve(window.HeadlessCheckout) : reject(new Error('Checkout script did not start')));
      s.onerror = () => reject(new Error('Checkout script failed to load'));
      document.body.appendChild(s);
    }).catch((e) => { sdkPromise = null; throw e; });
  }
  return sdkPromise;
}

// Open Shiprocket Checkout for lines [{ variationId, quantity }]. `source` is
// 'cart' or 'buy-now'. The shopper's browser ids + cookie choice ride along,
// so the order's Meta / GA4 Purchase matches them even if the tab is closed.
export async function openShiprocketCheckout(event, lines, source = 'buy-now') {
  const items = lines
    .filter((l) => l.variationId != null)
    .map((l) => ({ variant_id: String(l.variationId), quantity: Math.max(1, Number(l.quantity) || 1) }));
  if (!items.length || items.length !== lines.length) throw new Error('Some items cannot be checked out here');

  const ids = trackingIds();
  const custom_attributes = {};
  for (const k of Object.keys(ids)) if (ids[k] != null && ids[k] !== '') custom_attributes[k] = String(ids[k]);

  const [sdk, res] = await Promise.all([
    loadShiprocketSdk(),
    fetch(`${API_URL}/api/custom-checkout/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify({ items, custom_attributes, redirect_url: `${window.location.origin}/order-confirmation` }),
    }).then((r) => r.json().catch(() => ({}))),
  ]);
  const token = res?.result?.token || res?.token;
  if (!res?.success || !token) throw new Error(res?.message || 'Checkout could not be started');
  try { sessionStorage.setItem(SR_SOURCE_KEY, source); } catch { /* blocked */ }
  // If Shiprocket can't open its checkout it sends the shopper back here.
  sdk.addToCart(event, token, { fallbackUrl: window.location.href });
}

// Back from Shiprocket: our backend verifies the order with Shiprocket, saves
// it and answers with our own order number.
export async function confirmShiprocketOrder(oid) {
  const res = await fetch(`${API_URL}/api/custom-checkout/confirm`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
    body: JSON.stringify({ ...trackingIds(), oid }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.message || 'Could not confirm the order');
  return data;
}
