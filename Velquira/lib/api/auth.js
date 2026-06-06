import { apiClient } from '@/lib/api/client'

/**
 * Auth API surface. All HTTP goes through the shared apiClient so it
 * inherits the 30s timeout, CSRF mirror, brand header, and categorised
 * error toasts.
 *
 * Token storage today is still localStorage (matches existing call
 * sites). The apiClient transparently reads from both cookies AND
 * localStorage, so when the auth-cookie migration lands this file
 * needs minimal change.
 */

function setToken(token) {
  if (typeof window === 'undefined' || !token) return
  try { localStorage.setItem('token', token) } catch { /* ignore */ }
}

function clearToken() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem('token') } catch { /* ignore */ }
}

function hasToken() {
  if (typeof window === 'undefined') return false
  try { return !!localStorage.getItem('token') } catch { return false }
}

// Register (email/password)
export async function register({ username, email, password, phone }) {
  return apiClient.post('/api/users/register', { username, email, password, phone, role: 'consumer' })
}

// OTP Login (phone + MSG91 access_token)
export async function loginWithOtp({ phone, access_token }) {
  const data = await apiClient.post('/api/users/login', { phone, access_token })
  if (data?.token) setToken(data.token)
  return data
}

// Admin/staff login (email + password)
export async function adminLogin({ email, password }) {
  const data = await apiClient.post('/api/users/admin-login', { email, password })
  if (data?.token) setToken(data.token)
  return data
}

// Get current user
export async function getMe() {
  if (!hasToken()) return null
  try { return await apiClient.get('/api/users/me', { suppressErrorToast: true }) }
  catch { return null }
}

// Get profile
export async function getProfile() {
  if (!hasToken()) return null
  try { return await apiClient.get('/api/users/profile', { suppressErrorToast: true }) }
  catch { return null }
}

// Update profile
export async function updateProfile(data) {
  return apiClient.put('/api/users/profile', data)
}

// Change password
export async function changePassword({ currentPassword, newPassword }) {
  return apiClient.put('/api/users/change-password', { currentPassword, newPassword })
}

// Logout
export async function logout() {
  try { await apiClient.post('/api/users/logout', {}, { suppressErrorToast: true }) }
  catch { /* swallow — we clear local state regardless */ }
  clearToken()
}

// Refresh token
export async function refreshToken() {
  try {
    const data = await apiClient.post('/api/users/refresh-token', {}, { suppressErrorToast: true })
    if (data?.token) setToken(data.token)
    return data
  } catch { return null }
}

// Verify OTP (for checkout COD flow)
export async function verifyOtp({ phone, access_token }) {
  const data = await apiClient.post('/api/auth/otp/verify', { phone, access_token })
  if (data?.token) setToken(data.token)
  return data
}

// Aliases for backward compatibility with old imports
export const login = loginWithOtp
export const updatePassword = changePassword
