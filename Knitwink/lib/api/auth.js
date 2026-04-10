import { apiClient } from './client';


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

export const login = (email, password) =>
apiClient.post('/auth/login', { email, password });

export const register = (data) =>




apiClient.post('/auth/register', data);

export const logout = () => apiClient.post('/auth/logout', {});

export const getMe = async () => {
  const res = await fetch(`${API_URL}/auth/me`);
  if (!res.ok) return null;
  return res.json();
};

export const updateProfile = (data) =>
apiClient.patch('/auth/me', data);

export const updatePassword = (data) =>


apiClient.patch('/auth/me/password', data);