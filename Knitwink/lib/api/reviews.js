import { apiClient } from './client';












const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

export const getReviews = async (productId) => {
  const res = await fetch(`${API_URL}/api/reviews/product/${productId}`, {});
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
};

export const submitReview = (
productId,
data) =>
apiClient.post('/api/reviews/submit', data);