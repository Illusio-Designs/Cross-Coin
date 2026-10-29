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
// adds first-party cookies (the `_cv` session, Meta's `_fbp` / `_fbc`, Google's
// `_ga` and the anonymous visitor id `_mvid`, see setMetaCookies), and the ping
// is sent in the
// background (event.waitUntil), so the page is never delayed. Any failure is
// swallowed. The routing changes: a store's retired mixed-case paths
// (LEGACY_PATHS, e.g. /Products → /products) get a permanent redirect,
// matched case-exactly — next.config redirects ignore case and would loop;
// and, where enabled, a product page opened from a coloured card is rewritten
// to that colour's cached copy (PDP_COLOR_REWRITE below).

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'gripzus';
const COOKIE = '_cv';
// Retired page path → its current one (exact case), per store.
const LEGACY_PATHS = {};
// Product pages are cached (ISR), so they can't read the colour cookie
// themselves. When a shopper opened /products/<slug> from a card of one colour
// (cookie "pdp_color" = "<slug>:<colour>", set on click) or an old ?color=
// link, the request is rewritten to /products/<slug>/c/<colour>: a cached
// copy of the same page that opens on that colour. The address bar doesn't
// change.
const PDP_COLOR_REWRITE = false;
const SESSION_SECONDS = 30 * 60; // sliding 30-minute session
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|meta-external|facebookcatalog|whatsapp|preview|lighthouse|headless|monitor|curl|wget|python/i;

// Prefetches (router, <link rel=prefetch>, speculation rules) aren't visits —
// nor are the Facebook and Instagram apps loading a link ahead of a tap
// (X-Purpose: preview): the shopper hasn't opened the page.
function isPrefetch(h) {
  return !!(h.get('next-router-prefetch') || h.get('x-middleware-prefetch'))
    || /prefetch|preview/i.test(h.get('purpose') || '')
    || /prefetch|preview/i.test(h.get('sec-purpose') || '')
    || /prefetch|preview/i.test(h.get('x-purpose') || '')
    || /prefetch/i.test(h.get('x-moz') || '');
}

// Meta's own network (AS32934): ad review and Meta's link checks open the
// page from there with Facebook-app user agents. Shoppers never do.
const META_V4 = [
  '31.13.24.0/21', '31.13.64.0/18', '45.64.40.0/22', '57.141.0.0/16', '57.144.0.0/14',
  '66.220.144.0/20', '69.63.176.0/20', '69.171.224.0/19', '74.119.76.0/22',
  '102.132.96.0/20', '103.4.96.0/22', '129.134.0.0/16', '157.240.0.0/16',
  '163.70.128.0/17', '173.252.64.0/18', '179.60.192.0/22', '185.60.216.0/22',
  '185.89.216.0/22', '204.15.20.0/22',
].map((c) => {
  const [ip, bits] = c.split('/');
  const mask = (~0 << (32 - Number(bits))) >>> 0;
  return [(v4Int(ip) & mask) >>> 0, mask];
});
function v4Int(ip) {
  return ip.split('.').reduce((n, o) => ((n << 8) + Number(o)) >>> 0, 0);
}
function isMetaNetwork(h) {
  const ip = (h.get('x-real-ip') || (h.get('x-forwarded-for') || '').split(',')[0] || '').trim().toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const n = v4Int(ip);
    return META_V4.some(([net, mask]) => ((n & mask) >>> 0) === net);
  }
  return /^(2a03:2880:|2a03:83e0:|2620:0{0,4}:1c[0-9a-f]{2}:)/.test(ip);
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

function pdpColorRewrite(request) {
  const m = /^\/products\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  if (!m) return null;
  const slug = decode(m[1]);
  let color = request.nextUrl.searchParams.get('color') || '';
  if (!color) {
    const v = decode(request.cookies.get('pdp_color')?.value || '');
    const i = v.indexOf(':');
    if (i > 0 && v.slice(0, i) === slug) color = v.slice(i + 1);
  }
  if (!color || color.length > 80) return null;
  const url = request.nextUrl.clone();
  url.pathname = `/products/${m[1]}/c/${encodeURIComponent(color)}`;
  url.searchParams.delete('color');
  return NextResponse.rewrite(url);
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

// Meta browser id (_fbp) and ad-click id (_fbc), set here on the first page
// load, before any script runs. The Meta pixel loads late (after the page) and
// only then creates these cookies, so until now the server copies of the first
// events — and everything from shoppers who left or blocked the pixel — carried
// neither and couldn't be tied to the ad click. The pixel reuses cookies that
// already exist, so browser and server events share one value. Same formats as
// the pixel (fb.1.<ms>.<random> / fb.1.<ms>.<fbclid>), on the site's own
// domain, readable by the page, 90 days like the pixel's.
const META_COOKIE_SECONDS = 90 * 24 * 60 * 60;
function metaCookieDomain(host) {
  if (!host || host === 'localhost' || /^[\d.:]+$/.test(host) || /\.vercel\.app$/i.test(host)) return undefined;
  return host.replace(/^www\./i, '');
}
function setMetaCookies(request, res) {
  const opts = {
    maxAge: META_COOKIE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    domain: metaCookieDomain(request.nextUrl.hostname),
  };
  const now = Date.now();
  if (!request.cookies.get('_fbp')?.value) {
    res.cookies.set('_fbp', `fb.1.${now}.${Math.floor(1e9 + Math.random() * 9e9)}`, opts);
  }
  // Anonymous visitor id (Meta external_id): a random SHA-256-sized hex, the
  // same value sent by the pixel and the server, kept for a year.
  if (!/^[a-f0-9]{64}$/.test(request.cookies.get('_mvid')?.value || '')) {
    const b = new Uint8Array(32);
    globalThis.crypto.getRandomValues(b);
    res.cookies.set('_mvid', Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''), { ...opts, maxAge: 365 * 24 * 60 * 60 });
  }
  // Google Analytics browser id (_ga), in gtag's own format, so the shopper
  // has the same client id from the first page — gtag reuses it — and a quick
  // purchase sent by our server joins their visit instead of a made-up id.
  if (!request.cookies.get('_ga')?.value) {
    res.cookies.set('_ga', `GA1.1.${Math.floor(1e9 + Math.random() * 9e9)}.${Math.floor(now / 1000)}`, { ...opts, maxAge: 400 * 24 * 60 * 60 });
  }
  const clid = request.nextUrl.searchParams.get('fbclid');
  if (clid && /^[\w-]{10,500}$/.test(clid)) {
    const cur = request.cookies.get('_fbc')?.value || '';
    if (!cur.endsWith(`.${clid}`)) res.cookies.set('_fbc', `fb.1.${now}.${clid}`, opts);
  }
}

export function middleware(request, event) {
  const moved = LEGACY_PATHS[request.nextUrl.pathname];
  if (moved) {
    const url = request.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url, 301);
  }
  const res = (PDP_COLOR_REWRITE && pdpColorRewrite(request)) || NextResponse.next();
  try {
    if (request.method !== 'GET') return res; // also skips HEAD
    const h = request.headers;
    if (isPrefetch(h)) return res;
    const ua = h.get('user-agent') || '';
    if (!ua || BOT_RE.test(ua) || isMetaNetwork(h)) return res;

    const existing = request.cookies.get(COOKIE)?.value || '';
    const valid = /^[A-Za-z0-9-]{8,64}$/.test(existing);

    // In-app navigation: keep an existing session alive, but don't count it
    // (it isn't a page load) and don't start a session from it.
    if (isClientNav(request)) {
      if (valid) setSessionCookie(res, existing);
      return res;
    }
    if (!isDocument(request)) return res;
    setMetaCookies(request, res);

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
        // Which ad click ids the link carried (names only): with the user agent
        // they place an app visit that sent no referrer (Instagram, a Google ad).
        clicks: ['gclid', 'gbraid', 'wbraid', 'fbclid', 'igshid', 'igsh', 'ttclid', 'msclkid'].filter((k) => q.has(k)),
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
