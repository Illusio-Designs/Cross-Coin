// WhatsApp abandoned-cart recovery — shared by all 7 storefronts.
//
// The "Complete Order" button in the cart_abandoned WhatsApp message goes to
//   https://api.crosscoin.in/api/cart-recover/<token>
// which 302s to this store as  /?recover=1&coupon=CART10&cart=<token>.
// The link usually opens in WhatsApp's in-app browser (or another phone), where
// the shopper's localStorage cart does NOT exist — so the store fetches the
// cart's line items from the server by the unguessable token and puts them back
// before opening the cart drawer and applying the coupon.
//
// The per-brand domain template links straight to the store as
//   /?recover=1&coupon=CART10&cart=<token>
// and, if WhatsApp percent-encodes its variable, as
//   /?recover=1&coupon=CART10%26cart%3D<token>  — both are handled here.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || '__BRAND__';
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const COUPON_RE = /^[A-Z0-9_-]{2,32}$/;

/**
 * Read the recovery params from the current URL.
 * @returns {null | { coupon: string, cartToken: string|null }}
 */
export function readCartRecovery() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('recover') !== '1') return null;
    let coupon = String(params.get('coupon') || '').trim();
    let cartToken = String(params.get('cart') || '').trim();
    // "CART10&cart=<token>" arrived inside the coupon value (encoded variable).
    const m = coupon.match(/^([^&?#]*)[&?]cart=([^&#]*)/i);
    if (m) {
      coupon = m[1];
      if (!cartToken) cartToken = m[2];
    }
    coupon = coupon.toUpperCase();
    return {
      coupon: COUPON_RE.test(coupon) ? coupon : '',
      cartToken: TOKEN_RE.test(cartToken) ? cartToken : null,
    };
  } catch (_) {
    return null;
  }
}

/** Strip recover / coupon / cart from the URL so a refresh or share doesn't re-trigger. */
export function clearCartRecoveryParams() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    params.delete('recover');
    params.delete('coupon');
    params.delete('cart');
    const qs = params.toString();
    window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  } catch (_) { /* best-effort */ }
}

/**
 * Fetch the recovered cart lines for a token. Never throws; [] on any problem
 * (expired link, already ordered, network error).
 * Each line: { productId, variationId, quantity, name, slug, image, images,
 *              price, comparePrice, size, color, packId, packSize, packGroup,
 *              stock, line } — `line` is this store's own captured cart line
 *              (or null when the cart came from the server-side cart).
 */
export async function fetchRecoveredCart(token, { timeoutMs = 10000 } = {}) {
  if (!TOKEN_RE.test(String(token || ''))) return [];
  let timer = null;
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${API_URL}/api/abandoned-cart/restore/${encodeURIComponent(token)}`, {
      headers: { 'X-Brand-Name': BRAND },
      cache: 'no-store',
      ...(ctrl ? { signal: ctrl.signal } : {}),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.items) ? data.items.filter((l) => l && l.productId) : [];
  } catch (_) {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Build the `items` array sent with the abandoned-cart capture.
 * @param {Array} lines   the store's cart lines
 * @param {(line) => object} pick  maps a line to { productId, variationId, quantity,
 *                                 size?, color?, packId?, packSize?, packGroup? }
 * The store's own line is attached as a snapshot (primitives only) so it can be
 * put back exactly as it was.
 */
export function toRecoveryItems(lines, pick) {
  if (!Array.isArray(lines)) return [];
  const out = [];
  for (const ln of lines.slice(0, 30)) {
    try {
      const p = pick(ln) || {};
      const productId = Number(p.productId);
      if (!Number.isInteger(productId) || productId <= 0) continue;
      const variationId = Number(p.variationId);
      const snap = {};
      for (const [k, v] of Object.entries(ln || {})) {
        if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) snap[k] = v;
      }
      out.push({
        productId,
        variationId: Number.isInteger(variationId) && variationId > 0 ? variationId : null,
        quantity: Math.max(1, Math.min(99, Math.round(Number(p.quantity) || 1))),
        size: p.size ? String(p.size) : undefined,
        color: p.color ? String(p.color) : undefined,
        packId: p.packId ? String(p.packId) : undefined,
        packSize: p.packSize ? Number(p.packSize) : undefined,
        packGroup: p.packGroup ? String(p.packGroup) : undefined,
        line: snap,
      });
    } catch (_) { /* skip a bad line */ }
  }
  return out;
}
