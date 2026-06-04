import Cookies from 'js-cookie';
import { showError } from '@/lib/toast';

/**
 * Hardened API client.
 *
 * Built on the global fetch but adds the operational lifting every
 * production storefront needs:
 *
 *   1. **30s default timeout** via AbortController so a hung backend
 *      doesn't leave the UI spinning forever (override per-call).
 *   2. **CSRF token mirror** — reads the cc_csrf cookie set by
 *      GET /api/csrf/token and injects it into X-CSRF-Token on every
 *      state-changing method.
 *   3. **Categorised error toasts** with sensible copy per status
 *      code (401, 403, 404, 409, 422, 429, 5xx, network, timeout).
 *      Opt out per-call with `suppressErrorToast: true`.
 *   4. **Brand header** on every request via X-Brand-Name.
 *
 * The exported `apiClient` keeps the same signature legacy callers
 * already use (get/post/patch/delete) so nothing else needs to change.
 */

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'knitwink';
const DEFAULT_TIMEOUT_MS = 30_000;

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

function isStateChanging(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

function buildErrorMessage(err) {
  if (err?.code === 'TIMEOUT' || /aborted/i.test(err?.message || '')) {
    return 'The server took too long to respond. Please check your connection and try again.';
  }
  if (err?.status == null) {
    return "Can't reach the server. Check your internet connection.";
  }
  const apiMessage = err?.message;
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
  const token = typeof window !== 'undefined' ? Cookies.get('auth_token') : undefined;
  const csrf = typeof window !== 'undefined' ? Cookies.get('cc_csrf') : undefined;

  const method = init.method || 'GET';
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
      try { showError(buildErrorMessage(err)); } catch { /* ignore */ }
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
    } catch { /* body wasn't JSON — keep generic message */ }

    if (!init.suppressErrorToast && !init.silentError && typeof window !== 'undefined') {
      try { showError(buildErrorMessage(err)); } catch { /* ignore */ }
    }
    throw err;
  }

  // 204 No Content has no JSON body.
  if (res.status === 204) return null;
  return res.json();
}

export const apiClient = {
  get:    (path, init) => apiFetch(path, { ...init, method: 'GET' }),
  post:   (path, body, init) => apiFetch(path, { ...init, method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body, init) => apiFetch(path, { ...init, method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path, init) => apiFetch(path, { ...init, method: 'DELETE' }),
};

/**
 * Fire-and-forget bootstrap call. Sets the cc_csrf cookie that gets
 * mirrored into X-CSRF-Token on subsequent state-changing requests.
 * Call once from the root client provider.
 */
export async function fetchCsrfToken() {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${getBaseUrl()}/api/csrf/token`, {
      headers: { 'X-Brand-Name': BRAND },
      credentials: 'include',
    });
  } catch { /* fine — CSRF enforcement is opt-in on the backend */ }
}
