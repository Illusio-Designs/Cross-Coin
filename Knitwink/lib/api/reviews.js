import { apiClient } from './client';












const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export const getReviews = async (productId) => {
  const res = await fetch(`${API_URL}/products/${productId}/reviews`, {});
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
};

export const submitReview = (
productId,
data) =>
apiClient.post(`/products/${productId}/reviews`, data);