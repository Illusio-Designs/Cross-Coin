/* Wishlist API — works for both signed-in users and guests.

   Backend routes (under /api/wishlist):
     GET    /                           -> { count, wishlist: [...] }
     POST   /:productId                 -> add to wishlist
     DELETE /:productId                 -> remove from wishlist
     DELETE /                           -> clear wishlist
     POST   /:productId/move-to-cart    -> move single item to cart (auth-only)

   Identity:
     - Signed-in users send Authorization: Bearer <token>
     - Guests send X-Guest-Token: <token> (auto-generated, persisted in localStorage)
*/

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

const GUEST_TOKEN_KEY = 'velmique:guestToken';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('token'); } catch { return null; }
}

function getOrCreateGuestToken() {
  if (typeof window === 'undefined') return '';
  try {
    let t = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!t) {
      t = (crypto?.randomUUID?.() || `g_${Date.now()}_${Math.random().toString(36).slice(2)}`);
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
    'X-Brand-Name': BRAND_NAME,
    'X-Guest-Token': getOrCreateGuestToken(),
  };
  const auth = getAuthToken();
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

async function request(path, init = {}) {
  const res = await fetch(`${API_URL}/api/wishlist${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(body?.message || `Wishlist request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

/* ImageKit base — used to resolve relative image paths returned by the
   backend (e.g. "/products/abc.png") into full CDN URLs. */
const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL ?? 'https://ik.imagekit.io/wp2oatzmf';

/* Clean up doubled URLs ("https://...https://...") that some uploaders
   produce, then prepend the ImageKit endpoint if the path is relative. */
function resolveImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw;
  // Trim doubled https:// prefix
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path → prepend ImageKit endpoint
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalize(row) {
  if (!row) return null;
  const p = row.Product || row.product || row;
  if (!p) return null;
  const variation = p.ProductVariations?.[0] || p.variations?.[0];
  const price = Number(variation?.price ?? p.price ?? 0);

  // Walk through the candidate sources in order of preference. Backend
  // returns ProductImages on auth-fetch, images on guest-fetch.
  const firstImg =
    p.ProductImages?.[0] ||
    p.images?.[0] ||
    variation?.VariationImages?.[0] ||
    null;

  const rawImage =
    (typeof firstImg === 'string' ? firstImg : null) ||
    firstImg?.large ||
    firstImg?.image_url ||
    firstImg?.url ||
    firstImg?.medium ||
    p.image ||
    '';

  return {
    id: String(p.id),
    name: p.name || '',
    slug: p.slug || '',
    price,
    image: resolveImageUrl(rawImage),
  };
}

export async function getWishlist() {
  const data = await request('');
  const items = data?.wishlist || data?.items || [];
  return Array.isArray(items) ? items.map(normalize).filter(Boolean) : [];
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
