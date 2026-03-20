import { apiClient } from './client'

export interface Review {
  id: string
  productId: string
  authorName: string
  rating: number
  title: string
  body: string
  createdAt: string
  verified: boolean
}

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

export const getReviews = async (productId: string) => {
  const res = await fetch(`${API_URL}/products/${productId}/reviews`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json() as Promise<Review[]>
}

export const submitReview = (
  productId: string,
  data: { rating: number; title: string; body: string }
) => apiClient.post<Review>(`/products/${productId}/reviews`, data)
