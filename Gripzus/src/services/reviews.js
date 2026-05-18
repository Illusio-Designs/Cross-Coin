/* Reviews — brand-filtered, same endpoints as Knitwink:
   GET  /api/reviews/all             → every approved review (home page)
   GET  /api/reviews/product/:id     → one product's reviews
   POST /api/reviews/submit          → create a review for a product

   Submitted reviews go in pending — they appear once approved. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

const headers = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND_NAME };

/* Backend review → the shape the Gripzus review cards expect. */
function mapReview(r, i = 0) {
  return {
    id:     r.id ?? `rv-${i}`,
    quote:  r.review || r.comment || r.body || r.text || '',
    name:   r.reviewerName || r.guestName || r.name || 'Anonymous',
    role:   'Verified buyer',
    rating: Number(r.rating) || 5,
  };
}

/* All approved reviews — used by the home page review band. */
export async function getAllReviews() {
  try {
    const res = await fetch(`${API_URL}/api/reviews/all`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.reviews ?? data?.data ?? data ?? [];
    return Array.isArray(list) ? list.map(mapReview).filter((r) => r.quote) : [];
  } catch {
    return [];
  }
}

/* One product's approved reviews — used by the product detail page. */
export async function getProductReviews(productId) {
  if (!productId) return { reviews: [], stats: null };
  try {
    const res = await fetch(`${API_URL}/api/reviews/product/${productId}`, { headers });
    if (!res.ok) return { reviews: [], stats: null };
    const data = await res.json();
    const list = data?.reviews ?? data?.data ?? data ?? [];
    return {
      reviews: Array.isArray(list) ? list.map(mapReview).filter((r) => r.quote) : [],
      stats: data?.stats ?? null,
    };
  } catch {
    return { reviews: [], stats: null };
  }
}

/* Create a review for a product — POST /api/reviews/submit. */
export async function submitReview({ productId, rating, comment, name, email }) {
  const res = await fetch(`${API_URL}/api/reviews/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId, rating, comment, name, email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to submit review');
  return data;
}
