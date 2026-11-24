import { runCheckoutOpening, shiprocketCheckoutItems, readCheckoutTokenResponse, cleanCheckoutFallbackUrl } from '../buyingFlow';
/* Velmique — Shiprocket Checkout (their hosted checkout opens over the store).

   Flow: our backend signs a checkout token for the bag (the secret never
   reaches the browser) → Shiprocket's script opens its checkout with that
   token → after payment Shiprocket sends the shopper to
   /order-confirmation?oid=…&ost=…, where CheckoutReturn confirms the order
   and fires the Purchase. */

import { fbTrack, trackingIds } from '@/utils/pixel';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';
const SDK_JS  = 'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
const SDK_CSS = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';
// Remembers, for the thank-you page, whether the checkout was the bag (so the
// bag is emptied after the order) or a single Buy now (bag untouched).
export const SR_SOURCE_KEY = 'vlq-sr-source';
export const SHIPROCKET_RETRY_MESSAGE = 'Checkout couldn’t open. Please check your connection and try again.';
export const PACK_DISCOUNT_UNAVAILABLE = 'CHECKOUT_PACK_DISCOUNT_UNAVAILABLE';

let enabledPromise = null;
let sdkPromise = null;

// Cache a confirmed status. A failed request can be retried on the next click.
export function shiprocketEnabled() {
  if (!enabledPromise) {
    enabledPromise = fetch(`${API_URL}/api/custom-checkout/status`, { headers: { 'X-Brand-Name': BRAND } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => typeof d?.enabled === 'boolean' ? d.enabled : null)
      .catch(() => null)
      .then((enabled) => {
        if (enabled === null) enabledPromise = null;
        return enabled;
      });
  }
  return enabledPromise;
}

export function shiprocketTakes(lines) {
  return lines.length > 0 && lines.every((line) => line.variationId != null);
}

export async function openShiprocketCartCheckout(event, lines) {
  const enabled = await shiprocketEnabled();
  if (enabled === null) throw new Error(SHIPROCKET_RETRY_MESSAGE);
  if (!enabled) throw new Error('Shiprocket Checkout is currently unavailable. Your selections are still in your bag.');

  const contents = lines.map((line) => ({ id: String(line.productId ?? line.id), quantity: Number(line.quantity ?? 1) }));
  fbTrack('InitiateCheckout', {
    content_ids: contents.map(({ id }) => id),
    content_type: 'product',
    contents,
    num_items: contents.reduce((sum, line) => sum + line.quantity, 0),
    value: lines.reduce((sum, line) => sum + Number(line.price || 0) * Number(line.quantity ?? 1), 0),
    currency: 'INR',
  });
  return openShiprocketCheckout(event, lines, 'cart');
}

// Shiprocket's stylesheet for the hosted checkout window.
function loadShiprocketCss() {
  if (typeof document === 'undefined' || document.querySelector(`link[href="${SDK_CSS}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SDK_CSS;
  document.head.appendChild(link);
}

// Download Shiprocket's script + stylesheet ahead of the tap, once the shopper
// first touches, clicks, types or uses the mouse wheel (and the browser is
// idle), so tapping Buy now / checkout doesn't wait for the download. Not on
// page load (it would cost the page's speed score, and most visitors never
// check out), and not on scroll (a page scrolls itself while it loads).
let preloadArmed = false;
export function preloadShiprocket() {
  if (preloadArmed || typeof window === 'undefined') return;
  preloadArmed = true;
  const evs = ['pointerdown', 'touchstart', 'keydown', 'wheel'];
  const go = () => {
    evs.forEach((e) => window.removeEventListener(e, go));
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    idle(() => {
      shiprocketEnabled().then((on) => { if (on) loadShiprocketSdk().catch(() => {}); });
    });
  };
  evs.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
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
export function openShiprocketCheckout(event, lines, source = 'buy-now') {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  return runCheckoutOpening(BRAND, async () => {
    const { items, pack } = shiprocketCheckoutItems(lines);

    const ids = trackingIds();
    const custom_attributes = {};
    for (const k of Object.keys(ids)) if (ids[k] != null && ids[k] !== '') custom_attributes[k] = String(ids[k]);

    const [sdk, res] = await Promise.all([
      loadShiprocketSdk(),
      fetch(`${API_URL}/api/custom-checkout/${pack ? 'pack-token' : 'token'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({
          items,
          custom_attributes,
          redirect_url: `${window.location.origin}/order-confirmation`,
        }),
      }).then(async (response) => {
        if (pack && response.status === 409) {
          const data = await response.clone().json().catch(() => null);
          if (data?.code === PACK_DISCOUNT_UNAVAILABLE) {
            const error = new Error(data.message);
            error.code = PACK_DISCOUNT_UNAVAILABLE;
            throw error;
          }
        }
        return readCheckoutTokenResponse(response);
      }),
    ]);
    const token = res?.result?.token || res?.token;
    if (!res?.success || !token) throw new Error(res?.message || 'Checkout could not be started');
    try { sessionStorage.setItem(SR_SOURCE_KEY, source); } catch { /* blocked */ }
    // If Shiprocket can't open its checkout it sends the shopper back here.
    await sdk.addToCart(event, token, { fallbackUrl: cleanCheckoutFallbackUrl(window.location.href) });

  });
}
