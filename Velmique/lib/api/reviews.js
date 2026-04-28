/* Public Reviews API — same backend as Knitwink/Crosscoin.

   Endpoints:
   - GET  /api/reviews/all                 → every approved review for the brand
   - GET  /api/reviews/product/:productId  → reviews + stats for one product
   - POST /api/reviews/submit              → guest review submission

   All requests carry X-Brand-Name so reviews are scoped to this brand
   (the dashboard moderates them). The submit endpoint is public — guests
   can post a review by giving name + email + rating + comment, and an
   admin approves it before it shows up in the GET endpoints.
*/

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

const baseHeaders = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND_NAME };

/* Pull approved reviews for a single product, with rating histogram + average. */
export async function getProductReviews(productId, { page = 1, limit = 10 } = {}) {
  if (!productId) {
    return { reviews: [], pagination: { total: 0, page, limit, totalPages: 0 }, stats: null };
  }
  try {
    const res = await fetch(
      `${API_URL}/api/reviews/product/${productId}?page=${page}&limit=${limit}`,
      { headers: baseHeaders }
    );
    if (!res.ok) throw new Error('Failed to fetch product reviews');
    const data = await res.json();
    return {
      reviews:    Array.isArray(data?.reviews) ? data.reviews : [],
      pagination: data?.pagination || { total: 0, page, limit, totalPages: 0 },
      stats:      data?.stats || null,
    };
  } catch {
    return { reviews: [], pagination: { total: 0, page, limit, totalPages: 0 }, stats: null };
  }
}

/* All approved reviews across the brand — used in the homepage testimonials grid. */
export async function getAllReviews({ page = 1, limit = 24 } = {}) {
  try {
    const res = await fetch(
      `${API_URL}/api/reviews/all?page=${page}&limit=${limit}`,
      { headers: baseHeaders }
    );
    if (!res.ok) throw new Error('Failed to fetch reviews');
    const data = await res.json();
    return {
      reviews:    Array.isArray(data?.reviews) ? data.reviews : [],
      pagination: data?.pagination || { total: 0, page, limit, totalPages: 0 },
    };
  } catch {
    return { reviews: [], pagination: { total: 0, page, limit, totalPages: 0 } };
  }
}

/* Submit a guest review. Returns the API response (success or error message). */
export async function submitReview({ productId, rating, comment, name, email }) {
  const res = await fetch(`${API_URL}/api/reviews/submit`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ productId, rating, comment, name, email }),
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const msg = data?.message || 'Failed to submit review';
    throw new Error(msg);
  }
  return data || { success: true };
}
