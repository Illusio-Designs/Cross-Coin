import { setAuthToken, getAuthToken, clearAuthToken } from '@/lib/authToken'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique'

function headers(token) {
  const h = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

const getToken = getAuthToken

export async function register({ username, email, password, phone }) {
  const res = await fetch(`${API_URL}/api/users/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, email, password, phone, role: 'consumer' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Registration failed')
  return data
}

export async function loginWithOtp({ phone, access_token }) {
  const res = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone, access_token }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Login failed')
  if (data.token) setAuthToken(data.token)
  return data
}

export async function getMe() {
  const token = getToken()
  if (!token) return null
  const res = await fetch(`${API_URL}/api/users/me`, { headers: headers(token) })
  if (!res.ok) return null
  return res.json()
}

export async function getProfile() {
  const token = getToken()
  if (!token) return null
  const res = await fetch(`${API_URL}/api/users/profile`, { headers: headers(token) })
  if (!res.ok) return null
  return res.json()
}

export async function updateProfile(data) {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/users/profile`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(data),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.message || 'Update failed')
  return result
}

export async function changePassword({ currentPassword, newPassword }) {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/users/change-password`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Password change failed')
  return data
}

export async function logout() {
  const token = getToken()
  await fetch(`${API_URL}/api/users/logout`, { method: 'POST', headers: headers(token) }).catch(() => {})
  clearAuthToken()
}

export const login = loginWithOtp
