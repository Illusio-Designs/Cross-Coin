/* Reviews API (client-side submit) — mirrors Knitwink/lib/api/reviews.js.
 * Read paths (product/all reviews) live in the server-side lib/api.js.
 */
import { API_URL, authHeaders } from './client';

// Submit a public product review (no auth required).
export async function submitReview({ productId, rating, comment, name, email, files = [] }) {
  const body = new FormData();
  for (const [key, value] of Object.entries({ productId, rating, comment, name, email })) body.append(key, String(value ?? ''));
  for (const file of files) body.append('files', file);
  const headers = authHeaders();
  delete headers['Content-Type']; // The browser supplies the multipart boundary.
  const res = await fetch(`${API_URL}/api/reviews/submit`, {
    method: 'POST',
    headers,
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to submit review');
  return data;
}
