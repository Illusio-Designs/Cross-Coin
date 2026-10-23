// @generated — DO NOT EDIT. Source: shared/frontend/visitCounter.js
// Edit that file then run: node scripts/sync-frontend-shared.mjs
import { NextResponse } from 'next/server';

// Server-side visit counter. Runs at the edge on every real page navigation,
// BEFORE the page's JavaScript loads, and posts one ping to the backend
// (POST /api/i/v). That counts the visitors the in-page trackers miss: people
// who leave before hydration on slow mobile, in-app browsers or accidental ad
// clicks.
//
// It never changes headers or caching: it returns NextResponse.next(), only
// adds the first-party `_cv` session cookie, and the ping is sent in the
// background (event.waitUntil), so the page is never delayed. Any failure is
// swallowed. The one routing change: a store's retired mixed-case paths
// (LEGACY_PATHS, e.g. /Products → /products) get a permanent redirect,
// matched case-exactly — next.config redirects ignore case and would loop.

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velquira';
const COOKIE = '_cv';
// Retired page path → its current one (exact case), per store.
const LEGACY_PATHS = {};
const SESSION_SECONDS = 30 * 60; // sliding 30-minute session
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse|headless|monitor|curl|wget|python/i;

// Prefetches (router, <link rel=prefetch>, speculation rules) aren't visits.
function isPrefetch(h) {
  return !!(h.get('next-router-prefetch') || h.get('x-middleware-prefetch'))
    || /prefetch/i.test(h.get('purpose') || '')
    || /prefetch/i.test(h.get('sec-purpose') || '');
}

// Client-side route change (App Router RSC payload / Pages Router data JSON).
function isClientNav(request) {
  const h = request.headers;
  return !!(h.get('rsc') || h.get('x-nextjs-data'))
    || request.nextUrl.searchParams.has('_rsc') || /[?&]_rsc=/.test(request.url);
}

// A real top-level page load: GET, and the browser says it wants a document.
function isDocument(request) {
  const h = request.headers;
  const dest = h.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  return (h.get('accept') || '').includes('text/html');
}

function deviceOf(ua) {
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function newId() {
  try { return globalThis.crypto.randomUUID(); } catch (_) {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
}

function decode(v) {
  if (!v) return '';
  try { return decodeURIComponent(v); } catch (_) { return v; }
}

function setSessionCookie(res, id) {
  res.cookies.set(COOKIE, id, {
    maxAge: SESSION_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  });
}

export function middleware(request, event) {
  const moved = LEGACY_PATHS[request.nextUrl.pathname];
  if (moved) {
    const url = request.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url, 301);
  }
  const res = NextResponse.next();
  try {
    if (request.method !== 'GET') return res; // also skips HEAD
    const h = request.headers;
    if (isPrefetch(h)) return res;
    const ua = h.get('user-agent') || '';
    if (!ua || BOT_RE.test(ua)) return res;

    const existing = request.cookies.get(COOKIE)?.value || '';
    const valid = /^[A-Za-z0-9-]{8,64}$/.test(existing);

    // In-app navigation: keep an existing session alive, but don't count it
    // (it isn't a page load) and don't start a session from it.
    if (isClientNav(request)) {
      if (valid) setSessionCookie(res, existing);
      return res;
    }
    if (!isDocument(request)) return res;

    const newSession = !valid;
    setSessionCookie(res, valid ? existing : newId());

    const q = request.nextUrl.searchParams;
    const headers = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND };
    if (process.env.VISIT_INGEST_KEY) headers['X-Visit-Key'] = process.env.VISIT_INGEST_KEY;
    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(1500) : undefined;

    const ping = fetch(`${API}/api/i/v`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        path: request.nextUrl.pathname,
        utm_source: q.get('utm_source'),
        utm_medium: q.get('utm_medium'),
        utm_campaign: q.get('utm_campaign'),
        utm_term: q.get('utm_term'),
        utm_content: q.get('utm_content'),
        referrer: h.get('referer') || '',
        newSession,
        country: h.get('x-vercel-ip-country') || '',
        region: h.get('x-vercel-ip-country-region') || '',
        city: decode(h.get('x-vercel-ip-city')),
        device: deviceOf(ua),
        ua,
      }),
    }).catch(() => {});

    if (event && typeof event.waitUntil === 'function') event.waitUntil(ping);
  } catch (_) {
    // Counting must never break a page load.
  }
  return res;
}

// Page routes only: no Next internals, API routes, files with an extension,
// favicon, robots.txt or sitemaps.
export const config = {
  matcher: ['/((?!_next(?:/|$)|api(?:/|$)|favicon|robots\\.txt|sitemap|.*\\.[A-Za-z0-9]+$).*)'],
};
