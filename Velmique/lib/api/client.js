/**
 * Shared API client for Velmique.
 *
 * Each per-resource module (lib/api/products.js, blog.js, etc.) can
 * delegate to `apiClient.get/post/...` to inherit:
 *   - 30s timeout via AbortController
 *   - X-Brand-Name header (NEXT_PUBLIC_BRAND_NAME)
 *   - X-CSRF-Token mirror from cc_csrf cookie on state-changing methods
 *   - Categorised error toast on failure (opt-out per-call)
 *
 * Existing per-resource files keep their public API; only the internal
 * `fetch` calls swap to apiClient.* incrementally as you touch them.
 *
 * Auth note: Velmique currently reads the JWT from localStorage.
 * Migrating to js-cookie (HttpOnly cookies on backend, JS-readable
 * mirror via Set-Cookie) is documented in PENDING.md and remains
 * deliberately deferred to avoid breaking authed flows in one PR.
 * Until that migration lands, apiClient honours both sources.
 */

import Cookies from 'js-cookie';
import { showError as toastError } from '@/lib/toast';

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velmique';
const DEFAULT_TIMEOUT_MS = 30_000;
const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  // Prefer cookie when available (future-state).
  const cookie = Cookies.get('auth_token');
  if (cookie) return cookie;
  // Fall back to legacy localStorage location used across lib/api/*.
  try { return localStorage.getItem('token'); } catch { return null; }
}

function isStateChanging(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

function buildErrorMessage(err) {
  if (err?.code === 'TIMEOUT' || /aborted/i.test(err?.message || '')) {
    return 'The server took too long to respond. Please check your connection and try again.';
  }
  if (err?.status == null) return "Can't reach the server. Check your internet connection.";
  const apiMessage = err?.message && err.message !== 'An error occurred' ? err.message : null;
  const s = err.status;
  if (s === 401) return apiMessage || 'Please sign in to continue.';
  if (s === 403) return apiMessage || "You don't have permission for that action.";
  if (s === 404) return apiMessage || "We couldn't find that resource.";
  if (s === 409) return apiMessage || 'Conflict — please refresh and try again.';
  if (s === 422 || s === 400) return apiMessage || 'Some details look invalid. Please review and retry.';
  if (s === 429) return apiMessage || 'Too many requests — please slow down.';
  if (s >= 500) return apiMessage || 'Our server hit a bump. Please try again in a moment.';
  return apiMessage || 'Something went wrong. Please try again.';
}

async function apiFetch(path, init = {}) {
  const method = init.method || 'GET';
  const token = getAuthToken();
  const csrf = typeof window !== 'undefined' ? Cookies.get('cc_csrf') : undefined;

  const userTimeout = init.timeoutMs;
  const timeoutMs = Number.isFinite(userTimeout) ? userTimeout : DEFAULT_TIMEOUT_MS;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    'X-Brand-Name': BRAND,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrf && isStateChanging(method) ? { 'X-CSRF-Token': csrf } : {}),
    ...(init.headers ?? {}),
  };

  let res;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers,
      signal: init.signal || ac.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const err = { message: e?.message || 'Network error', code: ac.signal.aborted ? 'TIMEOUT' : 'NETWORK', status: null };
    if (!init.suppressErrorToast && !init.silentError && typeof window !== 'undefined') {
      try { toastError(buildErrorMessage(err)); } catch { /* ignore */ }
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const err = { message: 'An error occurred', status: res.status };
    try {
      const body = await res.json();
      err.message = body.message ?? body.error?.message ?? err.message;
      err.code = body.code ?? body.error?.code;
      err.details = body.error?.details;
    } catch { /* body wasn't JSON */ }

    if (!init.suppressErrorToast && !init.silentError && typeof window !== 'undefined') {
      try { toastError(buildErrorMessage(err)); } catch { /* ignore */ }
    }
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const apiClient = {
  get:    (path, init) => apiFetch(path, { ...init, method: 'GET' }),
  post:   (path, body, init) => apiFetch(path, { ...init, method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body, init) => apiFetch(path, { ...init, method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body, init) => apiFetch(path, { ...init, method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path, init) => apiFetch(path, { ...init, method: 'DELETE' }),
};

export async function fetchCsrfToken() {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${getBaseUrl()}/api/csrf/token`, {
      headers: { 'X-Brand-Name': BRAND },
      credentials: 'include',
    });
  } catch { /* CSRF is opt-in on the backend */ }
}
