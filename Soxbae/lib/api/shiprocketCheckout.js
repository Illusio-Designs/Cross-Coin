import { runCheckoutOpening, confirmVerifiedOrder, normalizeCheckoutLines } from '../buyingFlow';
import { startCheckoutDiagnostic, checkoutDiagnosticStep, checkoutFallbackUrl } from '../checkoutDiagnostics';
/* Soxbae — Shiprocket Checkout (their hosted checkout opens over the store).

   Our backend signs a checkout token for the chosen lines (the secret never
   reaches the browser) → Shiprocket's script opens its checkout with that
   token → after payment Shiprocket sends the shopper to
   /order-confirmation?oid=…&ost=…, where confirmShiprocketOrder() saves the
   order and the thank-you page fires the Purchase. */

import { trackingIds } from '@/utils/pixel';
import { API_URL, BRAND } from './client';

const SDK_JS  = 'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
const SDK_CSS = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';
// Remembers, for the thank-you page, whether the checkout was the cart (so
// the cart is emptied after the order) or a single Buy now (cart untouched).
export const SR_SOURCE_KEY = 'soxbae-sr-source';

let enabledPromise = null;
let enabledAt = 0;
let sdkPromise = null;
let openingPromise = null;

// Is Shiprocket Checkout switched on for Soxbae (Brand settings → Payments →
// Shiprocket Checkout, with keys saved)? Asked once per visit. Soxbae checks
// out only through Shiprocket, so only a clear "switched off" (false) brings
// back the store's own checkout; if the question itself fails the answer is
// null ("don't know") and it is asked again next time.
export function shiprocketEnabled() {
  if (Date.now() - enabledAt > 30000) enabledPromise = null;
  if (!enabledPromise) {
    enabledAt = Date.now();
    enabledPromise = fetch(`${API_URL}/api/custom-checkout/status`, { headers: { 'X-Brand-Name': BRAND } })
      .then((r) => r.json())
      .then((d) => (typeof d?.enabled === 'boolean' ? d.enabled : null))
      .catch(() => null)
      .then((on) => { if (on === null) enabledPromise = null; return on; });
  }
  return enabledPromise;
}

// Warm static checkout assets after rendering or on first interaction. Tokens
// are still requested only for the current selection when checkout is tapped.
let preloadArmed = false;
export function preloadShiprocket() {
  if (preloadArmed || typeof window === 'undefined') return;
  preloadArmed = true;
  const evs = ['pointerdown', 'touchstart', 'keydown', 'wheel'];
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    evs.forEach((e) => window.removeEventListener(e, go));
    loadShiprocketSdk().catch(() => { preloadArmed = false; });
  };
  evs.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
  if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 750);
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
export function openShiprocketCheckout(event, lines, source = 'buy-now') {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  return runCheckoutOpening(BRAND, async () => {
    lines = normalizeCheckoutLines(lines);
    if (openingPromise) return openingPromise;
    const open = async () => {
      startCheckoutDiagnostic(source, { preserveTap: true });
      checkoutDiagnosticStep('opening_started');
      const byVariant = new Map();
      for (const line of lines || []) {
        const id = String(line.variationId ?? '');
        const quantity = Number(line.quantity ?? 1);
        if (!/^\d+$/.test(id) || Number(id) <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
          throw new Error('Some items cannot be checked out here');
        }
        byVariant.set(id, (byVariant.get(id) || 0) + quantity);
      }
      const items = [...byVariant].map(([variant_id, quantity]) => ({ variant_id, quantity }));
      if (!items.length) throw new Error('Some items cannot be checked out here');

      const ids = trackingIds();
      const custom_attributes = {};
      for (const k of Object.keys(ids)) if (ids[k] != null && ids[k] !== '') custom_attributes[k] = String(ids[k]);

      checkoutDiagnosticStep('token_requested', { itemCount: items.reduce((sum, item) => sum + item.quantity, 0), variantIds: items.map((item) => item.variant_id), secureContext: window.isSecureContext === true, cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled === true : false });
      const [sdk, res] = await Promise.all([
        loadShiprocketSdk().then((sdk) => { checkoutDiagnosticStep('sdk_ready'); return sdk; }),
        fetch(`${API_URL}/api/custom-checkout/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
          body: JSON.stringify({ items, custom_attributes, redirect_url: `${window.location.origin}/order-confirmation` }),
        }).then(async (r) => {
          const data = await r.json().catch(() => ({}));
          checkoutDiagnosticStep('token_response', { httpStatus: r.status, tokenPresent: !!(data?.result?.token || data?.token), code: data?.code, catalogReady: Array.isArray(data?.catalogPush) && data.catalogPush.length > 0 && data.catalogPush.every((row) => [true, 'unchanged', 'background'].includes(row?.pushed)), productCount: data?.catalogPush?.length || 0 });
          if (!r.ok || !data?.success) {
            const error = new Error(data?.message || 'Checkout could not be started');
            error.code = data?.code || 'CHECKOUT_TOKEN_FAILED';
            throw error;
          }
          return data;
        }),
      ]);
      const token = res?.result?.token || res?.token;
      if (!res?.success || typeof token !== 'string' || !token.trim()) throw new Error(res?.message || 'Checkout could not be started');
      // Inspect only expiry metadata for diagnostics; never record the token or
      // decoded customer/merchant claims. Decoding does not verify its signature.
      const tokenFormat = String(token).split('.').length === 3 ? 'jwt' : 'opaque';
      let tokenSecondsRemaining;
      if (tokenFormat === 'jwt') {
        try {
          const encoded = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const claims = JSON.parse(window.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
          if (typeof claims.exp === 'number' && Number.isFinite(claims.exp)) tokenSecondsRemaining = Math.floor(claims.exp - Date.now() / 1000);
        } catch { /* opaque or non-decodable provider token */ }
      }
      checkoutDiagnosticStep('token_metadata', { tokenFormat, tokenSecondsRemaining });
      try { sessionStorage.setItem(SR_SOURCE_KEY, source); } catch { /* blocked */ }
      // If Shiprocket can't open its checkout it sends the shopper back here.
      checkoutDiagnosticStep('sdk_open_requested');
      await sdk.addToCart(event, token, { fallbackUrl: checkoutFallbackUrl(window.location.href) });
      checkoutDiagnosticStep('sdk_call_returned');
    };
    openingPromise = open().catch((error) => {
      checkoutDiagnosticStep('opening_failed', { code: /^CHECKOUT_[A-Z_]+$/.test(error?.code || '') ? error.code : 'CHECKOUT_OPEN_FAILED' });
      throw error;
    }).finally(() => { openingPromise = null; });
    return openingPromise;

});
}

// Back from Shiprocket: our backend verifies the order with Shiprocket, saves
// it and answers with our own order number.
export function confirmShiprocketOrder(oid) {
  return confirmVerifiedOrder(BRAND, oid, async () => {
    const res = await fetch(`${API_URL}/api/custom-checkout/confirm`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify({ ...trackingIds(), oid }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.message || 'Could not confirm the order');
    return data;

});
}
