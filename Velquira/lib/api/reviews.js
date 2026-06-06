import { apiClient } from '@/lib/api/client'

export async function getProductReviews(productId) {
  return apiClient.get(`/api/reviews/product/${productId}`, { suppressErrorToast: true })
}

export async function getAllReviews() {
  return apiClient.get('/api/reviews/all', { suppressErrorToast: true })
}

export async function submitReview({ productId, rating, comment, name, email }) {
  return apiClient.post('/api/reviews/submit', { productId, rating, comment, name, email })
}
