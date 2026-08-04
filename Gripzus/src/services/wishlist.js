/* Wishlist API — works for signed-in users and guests.
   Same backend routes as Knitwink (under /api/wishlist):
     GET    /                        -> { wishlist: [...] }
     POST   /:productId              -> add to wishlist
     DELETE /:productId              -> remove from wishlist
     DELETE /                        -> clear wishlist
     POST   /:productId/move-to-cart -> move single item to cart (auth only)

   Identity:
     - Signed-in users send Authorization: Bearer <token>
     - Guests send X-Guest-Token (auto-generated, persisted in localStorage) */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

const GUEST_TOKEN_KEY = 'gripzus:guestToken';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('token'); } catch { return null; }
}

function getOrCreateGuestToken() {
  if (typeof window === 'undefined') return '';
  try {
    let t = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!t) {
      t = (typeof crypto !== 'undefined' && crypto.randomUUID)
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

function cleanUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

/* Backend wishlist row → Gripzus product shape, so ProductCard can
   render it even for items only known from the backend. */
function normalize(row) {
  if (!row) return null;
  const p = row.Product || row.product || row;
  if (!p) return null;
  const variation = p.ProductVariations?.[0] || p.variations?.[0];
  const price = Number(variation?.price ?? p.price ?? 0);
  const cmp = variation?.comparePrice ?? p.comparePrice ?? p.compareAtPrice;
  const firstImg = p.ProductImages?.[0] || p.images?.[0] || null;
  const rawImage =
    (typeof firstImg === 'string' ? firstImg : null) ||
    firstImg?.large || firstImg?.image_url || firstImg?.url || firstImg?.medium ||
    p.image || '';

  return {
    id:    String(p.id),
    name:  p.name || 'Gripzus Pair',
    slug:  p.slug || p.handle || String(p.id),
    collection: p.category?.name || p.Category?.name || p.collectionName || 'Gripzus',
    price,
    compareAtPrice: cmp && Number(cmp) > price ? Number(cmp) : undefined,
    images: [cleanUrl(rawImage) || '/assets/Gripzus.JPG.jpeg'],
    colors: [],
    inStock: true,
  };
}

/* Fetch the saved wishlist (normalised to Gripzus product shape). */
export async function getWishlist() {
  const data = await request('');
  const items = data?.wishlist || data?.items || data?.data || [];
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
