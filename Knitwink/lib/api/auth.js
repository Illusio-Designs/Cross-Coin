import { apiClient } from './client';


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

export const login = (email, password) =>
apiClient.post('/api/users/login', { email, password });

export const register = (data) =>
apiClient.post('/api/users/register', data);

export const logout = () => apiClient.post('/api/users/logout', {});

export const getMe = async () => {
  const res = await fetch(`${API_URL}/api/users/me`);
  if (!res.ok) return null;
  return res.json();
};

export const updateProfile = (data) =>
apiClient.patch('/api/users/profile', data);

export const updatePassword = (data) =>
apiClient.patch('/api/users/change-password', data);