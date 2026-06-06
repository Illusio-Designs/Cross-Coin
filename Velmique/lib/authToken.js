/**
 * Auth token storage helper.
 *
 * Single source of truth for where the JWT lives. Writes to a cookie
 * (preferred — Secure + SameSite=Lax) AND mirrors to localStorage so
 * any code path that still reads from there continues working during
 * the migration. After every consumer is moved over, the localStorage
 * mirror can be dropped.
 *
 * Reads prefer the cookie; falls back to legacy localStorage so live
 * sessions don't sign out on the next deploy.
 */

import Cookies from 'js-cookie';

const COOKIE_KEY = 'auth_token';
const LEGACY_LS_KEY = 'token';
const DEFAULT_TTL_DAYS = 30;

function cookieOpts() {
  const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  return {
    expires: DEFAULT_TTL_DAYS,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthToken(token) {
  if (!token || typeof window === 'undefined') return;
  try { Cookies.set(COOKIE_KEY, token, cookieOpts()); } catch { /* ignore */ }
  try { localStorage.setItem(LEGACY_LS_KEY, token); } catch { /* ignore */ }
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    const cookie = Cookies.get(COOKIE_KEY);
    if (cookie) return cookie;
  } catch { /* ignore */ }
  try { return localStorage.getItem(LEGACY_LS_KEY); } catch { return null; }
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  try { Cookies.remove(COOKIE_KEY, { path: '/' }); } catch { /* ignore */ }
  try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
}
