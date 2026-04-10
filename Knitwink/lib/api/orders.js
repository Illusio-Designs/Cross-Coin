import { apiClient } from './client';



const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export const getOrders = async () => {
  const res = await fetch(`${API_URL}/orders`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
};

export const getOrder = async (id) => {
  const res = await fetch(`${API_URL}/orders/${id}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Failed to fetch order');
  return res.json();
};

export const createOrder = (data) =>


apiClient.post('/orders', data);