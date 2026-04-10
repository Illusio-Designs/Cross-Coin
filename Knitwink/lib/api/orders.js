import { apiClient } from './client';



const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

export const getOrders = async () => {
  const res = await fetch(`${API_URL}/orders`, {});
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
};

export const getOrder = async (id) => {
  const res = await fetch(`${API_URL}/orders/${id}`, {});
  if (!res.ok) throw new Error('Failed to fetch order');
  return res.json();
};

export const createOrder = (data) =>


apiClient.post('/orders', data);