/* Auth API — mirrors Knitwink/lib/api/auth.js for the Soxbae brand.
 *
 * Consumer auth is phone + OTP based (MSG91 access_token verified by the
 * backend). Email/password register + admin login are available too. The
 * bearer token is persisted in localStorage under `token`.
 */
import { API_URL, BRAND, authHeaders, getToken, setToken, clearToken } from './client';

function headers(withAuth = false) {
  return authHeaders(withAuth ? {} : {});
}

// ── Registration (email/password) ──────────────────────────────────────────
export async function register({ username, email, password, phone }) {
  const res = await fetch(`${API_URL}/api/users/register`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username, email, password, phone, role: 'consumer' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Registration failed');
  if (data.token) setToken(data.token);
  return data;
}

// ── Check if a phone number already has an account ─────────────────────────
export async function checkPhone(phone) {
  try {
    const res = await fetch(`${API_URL}/api/users/check-phone`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { exists: false, ok: false };
    return { exists: !!data.exists, ok: true, ...data };
  } catch {
    // If the endpoint is unavailable, don't block the flow.
    return { exists: true, ok: false };
  }
}

// ── OTP send / verify ──────────────────────────────────────────────────────
// Send an OTP to a phone number. The backend integrates with MSG91.
export async function sendOtp({ phone }) {
  const res = await fetch(`${API_URL}/api/auth/otp/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ phone }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
  return data;
}

// Verify an OTP. Returns { access_token } (MSG91 token) and/or { token }.
export async function verifyOtp({ phone, otp, access_token }) {
  const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ phone, otp, access_token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'OTP verification failed');
  if (data.token) setToken(data.token);
  return data;
}

// ── Login (phone + verified MSG91 access_token) ────────────────────────────
export async function loginWithOtp({ phone, access_token }) {
  const res = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ phone, access_token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.code === 'USER_NOT_FOUND') throw new Error('No account found. Please register first.');
    throw new Error(data.message || 'Login failed');
  }
  if (!data.token) throw new Error('No token received');
  setToken(data.token);
  return data;
}

// ── Current user ───────────────────────────────────────────────────────────
export async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/users/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const getMe = getCurrentUser;

// ── Profile ────────────────────────────────────────────────────────────────
export async function getProfile() {
  if (!getToken()) return null;
  try {
    const res = await fetch(`${API_URL}/api/users/profile`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function updateProfile(data) {
  const res = await fetch(`${API_URL}/api/users/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Update failed');
  return result;
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await fetch(`${API_URL}/api/users/change-password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Password change failed');
  return data;
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout() {
  const token = getToken();
  if (token) {
    await fetch(`${API_URL}/api/users/logout`, { method: 'POST', headers: authHeaders() }).catch(() => {});
  }
  clearToken();
}

// ── Refresh token ──────────────────────────────────────────────────────────
export async function refreshToken() {
  const res = await fetch(`${API_URL}/api/users/refresh-token`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (data.token) setToken(data.token);
  return data;
}

// ── Forgot / reset password ────────────────────────────────────────────────
export async function forgotPassword({ email }) {
  const res = await fetch(`${API_URL}/api/users/forgot-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export async function resetPassword({ token, password }) {
  const res = await fetch(`${API_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Reset failed');
  return data;
}

// Aliases for convenience / backward-compat with Knitwink naming.
export const login = loginWithOtp;
export { BRAND };
