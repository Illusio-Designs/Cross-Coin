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

// Open Shiprocket Checkout for lines [{ variationId, quantity }].
export async function openShiprocketCheckout(event, lines, redirectPath) {
  const items = lines
    .filter((l) => l.variationId != null)
    .map((l) => ({ variant_id: String(l.variationId), quantity: Math.max(1, Number(l.quantity) || 1) }));
  if (!items.length) throw new Error('Add at least one item');

  const [sdk, res] = await Promise.all([
    loadShiprocketSdk(),
    fetch(`${API_URL}/api/custom-checkout/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify({ items, redirect_url: `${window.location.origin}${redirectPath}` }),
    }).then((r) => r.json().catch(() => ({}))),
  ]);
  const token = res?.result?.token || res?.token;
  if (!res?.success || !token) {
    const why = res?.message || 'Checkout could not be started';
    const provider = res?.provider ? ` — Shiprocket: ${JSON.stringify(res.provider).slice(0, 200)}` : '';
    throw new Error(why + provider);
  }
  sdk.addToCart(event, token, { fallbackUrl: window.location.href });
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
