/* Velmique — Shiprocket Checkout (their hosted checkout opens over the store).

   Flow: our backend signs a checkout token for the bag (the secret never
   reaches the browser) → Shiprocket's script opens its checkout with that
   token → after payment Shiprocket sends the shopper to
   /order-confirmation?oid=…&ost=…, where CheckoutReturn confirms the order
   and fires the Purchase. */

import { trackingIds } from '@/utils/pixel';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';
const SDK_JS  = 'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
const SDK_CSS = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';
// Remembers, for the thank-you page, whether the checkout was the bag (so the
// bag is emptied after the order) or a single Buy now (bag untouched).
export const SR_SOURCE_KEY = 'vlq-sr-source';

let enabledPromise = null;
let sdkPromise = null;

// Whether Shiprocket checkout is set up for this store. Asked once per visit;
// any failure means "no", so the store's own checkout is used.
export function shiprocketEnabled() {
  if (!enabledPromise) {
    enabledPromise = fetch(`${API_URL}/api/custom-checkout/status`, { headers: { 'X-Brand-Name': BRAND } })
      .then((r) => r.json())
      .then((d) => !!d?.enabled)
      .catch(() => false);
  }
  return enabledPromise;
}

// Can these lines go to Shiprocket? Each needs a variant, and Build-your-pack
// lines (pack_group) stay on our own checkout, which applies the pack price;
// Shiprocket only knows unit prices.
export function shiprocketTakes(lines) {
  return lines.length > 0 && lines.every((l) => l.variationId != null && !l.packGroup);
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

// Open Shiprocket checkout for these lines ({ variationId, quantity }).
// `source` is 'cart' (the bag) or 'buy-now' (one product page selection).
// The shopper's browser ids + cookie choice ride along in custom_attributes,
// so the order's Meta Purchase can match them even if the tab is closed.
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
      body: JSON.stringify({
        items,
        custom_attributes,
        redirect_url: `${window.location.origin}/order-confirmation`,
      }),
    }).then((r) => r.json().catch(() => ({}))),
  ]);
  const token = res?.result?.token || res?.token;
  if (!res?.success || !token) throw new Error(res?.message || 'Checkout could not be started');
  try { sessionStorage.setItem(SR_SOURCE_KEY, source); } catch { /* blocked */ }
  // If Shiprocket can't open its checkout it sends the shopper back here.
  sdk.addToCart(event, token, { fallbackUrl: window.location.href });
}
