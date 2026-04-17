const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = 'knitwink'

function headers(token) {
  const h = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// Register (email/password)
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

// OTP Login (phone + MSG91 access_token)
export async function loginWithOtp({ phone, access_token }) {
  const res = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone, access_token }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Login failed')
  if (data.token) localStorage.setItem('token', data.token)
  return data
}

// Admin/staff login (email + password)
export async function adminLogin({ email, password }) {
  const res = await fetch(`${API_URL}/api/users/admin-login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Login failed')
  if (data.token) localStorage.setItem('token', data.token)
  return data
}

// Get current user
export async function getMe() {
  const token = getToken()
  if (!token) return null
  const res = await fetch(`${API_URL}/api/users/me`, { headers: headers(token) })
  if (!res.ok) return null
  return res.json()
}

// Get profile
export async function getProfile() {
  const token = getToken()
  if (!token) return null
  const res = await fetch(`${API_URL}/api/users/profile`, { headers: headers(token) })
  if (!res.ok) return null
  return res.json()
}

// Update profile
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

// Change password
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

// Logout
export async function logout() {
  const token = getToken()
  await fetch(`${API_URL}/api/users/logout`, { method: 'POST', headers: headers(token) }).catch(() => {})
  localStorage.removeItem('token')
}

// Refresh token
export async function refreshToken() {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/users/refresh-token`, {
    method: 'POST',
    headers: headers(token),
  })
  const data = await res.json()
  if (data.token) localStorage.setItem('token', data.token)
  return data
}

// Verify OTP (for checkout COD flow)
export async function verifyOtp({ phone, access_token }) {
  const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone, access_token }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'OTP verification failed')
  if (data.token) localStorage.setItem('token', data.token)
  return data
}
