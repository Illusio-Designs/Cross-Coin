/* Wishlist API — works for both signed-in users and guests.

   Backend routes (under /api/wishlist):
     GET    /                           -> { count, wishlist: [...] }
     POST   /:productId                 -> add to wishlist
     DELETE /:productId                 -> remove from wishlist
     DELETE /                           -> clear wishlist
     POST   /:productId/move-to-cart    -> move single item to cart (auth-only)

   Identity:
     - Signed-in users: Authorization: Bearer <token> (apiClient handles this)
     - Guests: X-Guest-Token: <token> (auto-generated, persisted in localStorage)
*/

import { apiClient } from '@/lib/api/client'

const GUEST_TOKEN_KEY = 'velquira:guestToken'

function getOrCreateGuestToken() {
  if (typeof window === 'undefined') return ''
  try {
    let t = localStorage.getItem(GUEST_TOKEN_KEY)
    if (!t) {
      t = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `g_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem(GUEST_TOKEN_KEY, t)
    }
    return t
  } catch {
    return `g_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

function guestHeaders() {
  return { 'X-Guest-Token': getOrCreateGuestToken() }
}

const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL ?? 'https://ik.imagekit.io/wp2oatzmf'

function resolveImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let url = raw
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'))
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`
}

function normalize(row) {
  if (!row) return null
  const p = row.Product || row.product || row
  if (!p) return null
  const variation = p.ProductVariations?.[0] || p.variations?.[0]
  const price = Number(variation?.price ?? p.price ?? 0)

  const firstImg =
    p.ProductImages?.[0] ||
    p.images?.[0] ||
    variation?.VariationImages?.[0] ||
    null

  const rawImage =
    (typeof firstImg === 'string' ? firstImg : null) ||
    firstImg?.large ||
    firstImg?.image_url ||
    firstImg?.url ||
    firstImg?.medium ||
    p.image ||
    ''

  return {
    id: String(p.id),
    name: p.name || '',
    handle: p.slug || p.handle || '',
    price,
    images: [{ url: resolveImageUrl(rawImage), alt: p.name || '' }],
    variants: [],
    colors: [],
  }
}

export async function getWishlist() {
  try {
    const data = await apiClient.get('/api/wishlist', { headers: guestHeaders(), suppressErrorToast: true })
    const items = data?.wishlist || data?.items || []
    return Array.isArray(items) ? items.map(normalize).filter(Boolean) : []
  } catch { return [] }
}

export async function addToWishlist(productId) {
  return apiClient.post(`/api/wishlist/${productId}`, {}, { headers: guestHeaders() })
}

export async function removeFromWishlist(productId) {
  return apiClient.delete(`/api/wishlist/${productId}`, { headers: guestHeaders() })
}

export async function clearWishlist() {
  return apiClient.delete('/api/wishlist', { headers: guestHeaders() })
}

export async function moveWishlistItemToCart(productId) {
  return apiClient.post(`/api/wishlist/${productId}/move-to-cart`, {}, { headers: guestHeaders() })
}
