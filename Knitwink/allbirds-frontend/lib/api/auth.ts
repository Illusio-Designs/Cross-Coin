import { apiClient } from './client'
import type { User } from '@/types'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

export const login = (email: string, password: string) =>
  apiClient.post<{ user: User; token: string }>('/auth/login', { email, password })

export const register = (data: {
  firstName: string
  lastName: string
  email: string
  password: string
}) => apiClient.post<{ user: User; token: string }>('/auth/register', data)

export const logout = () => apiClient.post<void>('/auth/logout', {})

export const getMe = async () => {
  const res = await fetch(`${API_URL}/auth/me`, { next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json() as Promise<User>
}

export const updateProfile = (data: Partial<User>) =>
  apiClient.patch<User>('/auth/me', data)

export const updatePassword = (data: {
  currentPassword: string
  newPassword: string
}) => apiClient.patch<void>('/auth/me/password', data)
