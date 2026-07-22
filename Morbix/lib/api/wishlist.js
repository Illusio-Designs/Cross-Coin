/* Wishlist API — mirrors Knitwink/lib/api/wishlist.js for the Morbix brand.
 * Works for both signed-in users (Bearer token) and guests (X-Guest-Token).
 * Endpoints under /api/wishlist.
 */
import { API_URL, BRAND, getToken } from './client';

const GUEST_TOKEN_KEY = 'morbix:guestToken';

function getOrCreateGuestToken() {
  if (typeof window === 'undefined') return '';
  try {
    let t = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!t) {
      t = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `g_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(GUEST_TOKEN_KEY, t);
    }
    return t;
  } catch {
    return `g_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function headers() {
  const h = {
    'Content-Type': 'application/json',
    'X-Brand-Name': BRAND,
    'X-Guest-Token': getOrCreateGuestToken(),
  };
  const auth = getToken();
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

async function request(path, init = {}) {
  const res = await fetch(`${API_URL}/api/wishlist${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const err = new Error(body?.message || `Wishlist request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL || 'https://ik.imagekit.io/wp2oatzmf';

function resolveImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw;
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Normalise a backend wishlist row into the Morbix product-card shape. */
function normalize(row) {
  if (!row) return null;
  const p = row.Product || row.product || row;
  if (!p) return null;
  const variation = p.ProductVariations?.[0] || p.variations?.[0];
  const price = Number(variation?.price ?? p.price ?? 0);
  const firstImg = p.ProductImages?.[0] || p.images?.[0] || variation?.VariationImages?.[0] || null;
  const rawImage =
    (typeof firstImg === 'string' ? firstImg : null) ||
    firstImg?.large ||
    firstImg?.image_url ||
    firstImg?.url ||
    firstImg?.medium ||
    p.image ||
    '';
  return {
    id: p.id,
    slug: p.slug || p.handle || '',
    name: p.name || '',
    price,
    oldPrice: variation?.comparePrice ? Number(variation.comparePrice) : undefined,
    image: resolveImageUrl(rawImage),
  };
}

export async function getWishlist() {
  try {
    const data = await request('');
    const items = data?.wishlist || data?.items || [];
    return Array.isArray(items) ? items.map(normalize).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function addToWishlist(productId) {
  return request(`/${productId}`, { method: 'POST' });
}

export async function removeFromWishlist(productId) {
  return request(`/${productId}`, { method: 'DELETE' });
}

export async function clearWishlist() {
  return request('', { method: 'DELETE' });
}

export async function moveWishlistItemToCart(productId) {
  return request(`/${productId}/move-to-cart`, { method: 'POST' });
}
