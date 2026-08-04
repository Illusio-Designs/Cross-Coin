/* Soxbae client-side API helpers.
 *
 * These talk to the same Cross-Coin backend the server-side lib/api.js uses,
 * scoped by the `X-Brand-Name: soxbae` header, but from the browser — they
 * attach the logged-in user's bearer token (localStorage `token`) and are
 * used by the cart / checkout / account flows. Mirrors the Knitwink
 * lib/api/* modules, adapted to the Soxbae brand.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
export const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'soxbae';

export const TOKEN_KEY = 'token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (typeof window === 'undefined' || !token) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    // Let cart/auth listeners know the session changed.
    window.dispatchEvent(new Event('storage'));
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('storage'));
  } catch {
    /* ignore */
  }
}

/** Standard JSON headers with brand + optional bearer token. */
export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'X-Brand-Name': BRAND,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Fetch + JSON parse with a thrown Error carrying the API message on failure. */
export async function apiFetch(path, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty / non-JSON body */
  }
  if (!res.ok) {
    const err = new Error(body?.message || body?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = body?.code || body?.error?.code;
    err.body = body;
    throw err;
  }
  return body;
}
