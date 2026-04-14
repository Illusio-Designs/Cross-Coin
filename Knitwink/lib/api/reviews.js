const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = 'knitwink'

const headers = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND }

// Get approved reviews for a specific product
export async function getProductReviews(productId) {
  const res = await fetch(`${API_URL}/api/reviews/product/${productId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json()
}

// Get all public reviews (for home page)
export async function getAllReviews() {
  const res = await fetch(`${API_URL}/api/reviews/all`, { headers })
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json()
}

// Submit a public review (no auth required)
export async function submitReview({ productId, rating, comment, name, email }) {
  const res = await fetch(`${API_URL}/api/reviews/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId, rating, comment, name, email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to submit review')
  return data
}
