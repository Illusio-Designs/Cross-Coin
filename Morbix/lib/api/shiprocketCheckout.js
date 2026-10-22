/* Morbix — Shiprocket Checkout (their hosted checkout opens over the store).

   Our backend signs a checkout token for the chosen lines (the secret never
   reaches the browser) → Shiprocket's script opens its checkout with that
   token → after payment Shiprocket sends the shopper back to redirect_url
   with ?oid=…&ost=…, where confirmShiprocketOrder() saves the order. */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'morbix';
const SDK_JS  = 'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
const SDK_CSS = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';

let sdkPromise = null;

// Load Shiprocket's checkout script + styles once; resolves when
// window.HeadlessCheckout exists.
export function loadShiprocketSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.HeadlessCheckout) return Promise.resolve(window.HeadlessCheckout);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      if (!document.querySelector(`link[href="${SDK_CSS}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = SDK_CSS;
        document.head.appendChild(link);
      }
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

// Open Shiprocket Checkout for lines [{ variationId, quantity }]. `log`
// (optional) receives each step — used by the staff test page.
export async function openShiprocketCheckout(event, lines, redirectPath, log = () => {}) {
  const items = lines
    .filter((l) => l.variationId != null)
    .map((l) => ({ variant_id: String(l.variationId), quantity: Math.max(1, Number(l.quantity) || 1) }));
  if (!items.length) throw new Error('Add at least one item');
  const redirect_url = `${window.location.origin}${redirectPath}`;
  log('step', 'Requesting checkout token from our backend', { items, redirect_url });

  const [sdk, res] = await Promise.all([
    loadShiprocketSdk().then((sdkObj) => { log('step', 'Shiprocket script loaded', { methods: Object.keys(sdkObj || {}) }); return sdkObj; },
      (e) => { log('error', 'Shiprocket script failed to load', { message: e.message }); throw e; }),
    fetch(`${API_URL}/api/custom-checkout/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify({ items, redirect_url }),
    }).then(async (r) => {
      const body = await r.json().catch(() => ({}));
      const t = body?.result?.token || body?.token || '';
      log(r.ok ? 'step' : 'error', `Token response HTTP ${r.status}`, { ...body, result: body?.result ? { ...body.result, token: t ? `${t.slice(0, 8)}…(${t.length} chars)` : t } : body?.result });
      return body;
    }),
  ]);
  const token = res?.result?.token || res?.token;
  if (!res?.success || !token) {
    const why = res?.message || 'Checkout could not be started';
    const provider = res?.provider ? ` — Shiprocket: ${JSON.stringify(res.provider).slice(0, 200)}` : '';
    throw new Error(why + provider);
  }
  log('step', 'Calling HeadlessCheckout.addToCart', { fallbackUrl: window.location.href });
  sdk.addToCart(event, token, { fallbackUrl: window.location.href });
  log('step', 'addToCart returned (the Shiprocket window should now be open)');
}

// Back from Shiprocket: our backend verifies the order with Shiprocket and
// saves it; returns our order number.
export async function confirmShiprocketOrder(oid) {
  const res = await fetch(`${API_URL}/api/custom-checkout/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
    body: JSON.stringify({ oid }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.message || 'Could not confirm the order');
  return data;
}
