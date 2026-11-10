import { gtagTrack } from './gtagTrack';
import { getConsent } from '../lib/consent';

// Facebook Pixel event tracking utility.
//
// Fires the browser pixel AND — for the standard funnel events — relays the
// same event to the backend Conversions API with a SHARED event_id, so Meta
// deduplicates the pixel + server pair. This is what lifts "pixel events
// covered by Conversions API" toward ~100% (previously ViewContent /
// AddToCart / InitiateCheckout / Search had no server-side counterpart).
//
// options can include { eventID } to force a deterministic id (Purchase uses
// `Purchase_<order_number>` so the browser, this relay, and the order-time
// server event all collapse to one). When omitted, a unique id is generated.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'crosscoin';

// Events we mirror to CAPI from the browser (same set Shopify's Meta app sends
// server-side). Purchase is intentionally excluded — the server sends it
// authoritatively at order time (deduped via `Purchase_<order>`), so relaying
// it again would add a redundant server event.
// PageView: every page (first load via relayFirstPageView, navigation via
// fbqTrack) and the cart drawer (trackCartPageView).
const RELAY_EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search', 'AddPaymentInfo', 'AddToWishlist', 'PageView']);

const BLOCKED_EVENTS = ['SubscribedButtonClick'];

// Meta event name → GA4 (gtag) event name, so Google sees the funnel (not just
// pageviews). Purchase is intentionally absent — the backend sends GA4 purchase
// server-side (Measurement Protocol) and GA4 doesn't cleanly dedupe client +
// server purchases, so firing it here too would double-count revenue.
const GA4_EVENT = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Search: 'search',
  AddToWishlist: 'add_to_wishlist',
};

// Map the Meta custom_data shape to GA4's items[] (item_id/quantity/name).
function ga4Items(params) {
  const contents = Array.isArray(params.contents) ? params.contents : null;
  const rows = contents && contents.length
    ? contents.map((c) => ({ item_id: String(c.id), quantity: c.quantity || 1 }))
    : (Array.isArray(params.content_ids) ? params.content_ids : []).map((id) => ({ item_id: String(id), quantity: 1 }));
  if (rows.length === 1 && params.content_name) rows[0].item_name = params.content_name;
  return rows;
}

// First-party funnel relay — records view/cart/checkout into our own DB
// (/api/i/e — a neutral path ad blockers don't match) so the admin Traffic &
// Conversion report can build a full funnel independent of Meta/Google (and of
// ad blockers). Keyed to the session_id cookie when the browser sends it, else
// to the first-party copy of the visit id (utm_session_id, saved by
// utmTracker) — cookie-blocking browsers never send the api cookie. Brand via header.
const FP_EVENT = { ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', AddToWishlist: 'add_to_wishlist', Search: 'search', ViewCart: 'view_cart', AddShippingInfo: 'add_shipping_info', AddPaymentInfo: 'add_payment_info' };
function fpSessionId() {
  try { return localStorage.getItem('utm_session_id') || undefined; } catch (_) { return undefined; }
}
// The visit ping may still be in flight when the first event fires (landing
// straight on a product page), so wait briefly for it; after ~3s send anyway.
function fpVisitReady() {
  try { return !!sessionStorage.getItem('visit_tracked'); } catch (_) { return true; }
}
// Product id for view/cart events (content_ids carry the catalogue product id).
function fpProductId(name, params) {
  if (name !== 'view_item' && name !== 'add_to_cart') return undefined;
  const ids = Array.isArray(params.content_ids) ? params.content_ids : [];
  const first = ids.length ? ids[0] : (Array.isArray(params.contents) && params.contents[0] ? params.contents[0].id : undefined);
  return /^[1-9]\d{0,9}$/.test(String(first)) ? Number(first) : undefined;
}
function fpTrack(event, params, tries = 0) {
  if (typeof window === 'undefined') return;
  const name = FP_EVENT[event];
  if (!name) return;
  try {
    if (tries < 6 && !fpVisitReady()) { setTimeout(() => fpTrack(event, params, tries + 1), 500); return; }
    fetch(`${API_URL}/api/i/e`, {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND_NAME },
      body: JSON.stringify({ event: name, value: Number(params.value || 0), session_id: fpSessionId(), product_id: fpProductId(name, params) }),
    }).catch(() => {});
  } catch (_) { /* never throw */ }
}

// Mirror a funnel event to GA4. Safe/no-op if gtag isn't present.
function ga4Track(event, params) {
  if (typeof window === 'undefined') return;
  const name = GA4_EVENT[event];
  if (!name) return;
  try {
    // GA4's recommended `search` event carries only the term (no value/items).
    if (name === 'search') {
      gtagTrack(name, { search_term: String(params.search_string || '') });
      return;
    }
    gtagTrack(name, {
      currency: params.currency || 'INR',
      value: Number(params.value || 0),
      items: ga4Items(params),
    });
  } catch (_) { /* never throw */ }
}

function makeEventId(event) {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${event}_${Date.now()}_${rnd}`;
}

function readCookie(name) {
  if (typeof document === 'undefined') return undefined;
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch (_) { return undefined; }
}

function readFbc() {
  const cookie = readCookie('_fbc');
  if (cookie) return cookie;
  try {
    const click = new URLSearchParams(window.location.search).get('fbclid') || localStorage.getItem('fbclid');
    if (click) return `fb.1.${Date.now()}.${click}`;
  } catch (_) { /* blocked storage */ }
  return undefined;
}

function rememberedBuyer() {
  try {
    const buyer = JSON.parse(localStorage.getItem('fb_am') || 'null') || {};
    const out = {};
    if (/^[a-f0-9]{64}$/.test(buyer.em || '')) out.em = buyer.em;
    if (/^[a-f0-9]{64}$/.test(buyer.ph || '')) out.ph = buyer.ph;
    return out;
  } catch (_) { return {}; }
}

// Browser ad/analytics ids for server-side attribution on order/checkout
// requests (what Shopify's Meta & Google apps attach): Meta _fbp/_fbc and the
// GA4 client id from the `_ga` cookie (`GA1.1.<id>` → `<id>`), plus whether the
// shopper allowed marketing cookies. Only ids that exist are returned; never throws.
export function trackingIds() {
  // marketing_consent: the server sends Meta a Purchase only when true, as Shopify does.
  const out = { marketing_consent: hasMarketingConsent() };
  try {
    const fbp = readCookie('_fbp');
    if (fbp) out.fbp = fbp;
    const fbc = readFbc();
    if (fbc) out.fbc = fbc;
    // Anonymous visitor id (_mvid, set by the store's edge): Meta external_id.
    const vid = readCookie('_mvid');
    if (vid && /^[a-f0-9]{64}$/.test(vid)) out.visitor_id = vid;
    // The visit (traffic report), so Shiprocket Checkout orders link to it.
    const sid = localStorage.getItem('utm_session_id');
    if (sid) out.utm_session_id = sid;
    // GA4 session (cookie _ga_<stream>), so the server purchase joins this visit.
    const gs = (document.cookie.match(/(?:^|; )_ga_[A-Z0-9]+=([^;]*)/) || [])[1] || '';
    const sess = decodeURIComponent(gs).match(/^GS1\.\d+\.(\d+)\.(\d+)/) || decodeURIComponent(gs).match(/^GS2\.\d+\.s(\d+)\$o(\d+)/);
    if (sess) { out.ga_session_id = sess[1]; out.ga_session_number = sess[2]; }
    const ga = readCookie('_ga');
    const m = ga && ga.match(/^GA\d+\.\d+\.(.+)$/);
    if (m && m[1]) out.ga_client_id = m[1];
  } catch (_) { /* never throw */ }
  return out;
}

function hasMarketingConsent() {
  try { return !!getConsent().marketing; } catch (_) { return false; }
}

// Fire-and-forget relay to the Conversions API. keepalive lets it complete even
// if the page is navigating away (e.g. InitiateCheckout → redirect to payment).
// Sent only with marketing consent (DPDP) — the browser pixel is a queue-only
// stub until consent, so the server copy must not go out without it either.
function relayToCapi(event, eventID, params, sourceUrl) {
  try {
    if (!hasMarketingConsent()) return;
    const u = { ...rememberedBuyer(), ...((typeof window !== 'undefined' && window.__fbUser) || {}) };
    const body = JSON.stringify({
      event_name: event,
      event_id: eventID,
      event_source_url: sourceUrl || (typeof window !== 'undefined' ? window.location.href : undefined),
      custom_data: params,
      user_data: { em: u.em, ph: u.ph, fn: u.fn, ln: u.ln, external_id: u.external_id, visitor_id: (readCookie('_mvid') || '').match(/^[a-f0-9]{64}$/) ? readCookie('_mvid') : undefined },
      fbp: readCookie('_fbp'),
      fbc: readFbc(),
    });
    fetch(`${API_URL}/api/facebook-pixel/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND_NAME },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  } catch {
    /* analytics must never break the shopping flow */
  }
}

// Keep early Meta events until the pixel loads, without repeating GA4 or
// first-party events. Preserve the original page and shared browser/server ID.
const pendingMeta = [];
let metaWaiting = false;
function sendMeta(event, params, eventID, sourceUrl) {
  try { window.fbq('track', event, params, { eventID }); } catch (_) { return false; }
  if (RELAY_EVENTS.has(event)) relayToCapi(event, eventID, params, sourceUrl);
  return true;
}
function holdMeta(event, params, eventID) {
  if (pendingMeta.length < 50) pendingMeta.push({ event, params, eventID, url: window.location.href, at: Date.now() });
  if (metaWaiting) return;
  metaWaiting = true;
  let tries = 0;
  const flush = () => {
    if (typeof window.fbq !== 'function' || !hasMarketingConsent()) return false;
    for (const row of pendingMeta.splice(0)) {
      if (row.at >= Date.now() - 600000) sendMeta(row.event, row.params, row.eventID, row.url);
    }
    metaWaiting = false;
    window.removeEventListener('brand-fbq-ready', flush);
    return true;
  };
  window.addEventListener('brand-fbq-ready', flush);
  const tick = () => {
    if (flush()) return;
    if (++tries >= 600) {
      pendingMeta.length = 0;
      metaWaiting = false;
      window.removeEventListener('brand-fbq-ready', flush);
      return;
    }
    setTimeout(tick, 1000);
  };
  setTimeout(tick, 500);
}

export function fbqTrack(event, params = {}, options = {}) {
  if (typeof window === 'undefined') return false;
  if (BLOCKED_EVENTS.includes(event)) return false;

  // GA4 (Google) mirror — independent of the Meta pixel (either may be absent).
  if (options.ga4 !== false) ga4Track(event, params);

  // First-party funnel event → our own DB (fires regardless of Meta/GA presence).
  fpTrack(event, params);

  const eventID = options.eventID || makeEventId(event);
  if (typeof window.fbq !== 'function') {
    holdMeta(event, params, eventID);
    return false;
  }
  return sendMeta(event, params, eventID, window.location.href);
}

// The cart drawer counts as a page: Meta PageView in the browser + its
// Conversions API copy (one event id; the relay needs marketing consent) and
// a view_cart row in our own funnel events. The GA4 page_view is sent by the
// caller with the virtual /cart address.
export function trackCartPageView() {
  if (typeof window === 'undefined') return;
  try { fpTrack('ViewCart', {}); } catch (_) { /* never throw */ }
  try { if (hasMarketingConsent()) fbqTrack('PageView', {}, { ga4: false }); } catch (_) { /* never throw */ }
}

// Shipping step done (Place order pressed): add_shipping_info in our own
// funnel events. AddPaymentInfo reaches them through fbqTrack.
export function trackShippingInfoFp(value) {
  try { fpTrack('AddShippingInfo', { value }); } catch (_) { /* never throw */ }
}

// The first-load PageView is sent by the pixel snippet in _document with the
// event id window.__fbPv0; send its Conversions API copy (consent-gated).
export function relayFirstPageView() {
  if (typeof window === 'undefined' || !window.__fbPv0) return;
  const id = window.__fbPv0;
  window.__fbPv0 = null; // once
  try { relayToCapi('PageView', id, {}); } catch (_) { /* never throw */ }
}

// Browser Purchase waits for a late-loaded pixel, as on Morbix. The backend
// remains authoritative for GA4 and CAPI; reuse its Meta event id for dedupe.
const pendingPurchases = new Map();
export function fbPurchase(orderNumber, params = {}) {
  if (typeof window === 'undefined' || !orderNumber || orderNumber === '—') return Promise.resolve(false);
  const order = String(orderNumber);
  const key = `cc-purchase-fired:${order}`;
  try { if (sessionStorage.getItem(key) === '1') return Promise.resolve(true); } catch { /* optional storage */ }
  if (pendingPurchases.has(order)) return pendingPurchases.get(order);
  const send = new Promise((resolve) => {
    let tries = 0;
    const attempt = () => {
      if (typeof window.fbq === 'function' && hasMarketingConsent()) {
        if (fbqTrack('Purchase', { ...params, order_id: order }, { eventID: `Purchase_${order}` })) {
          try { sessionStorage.setItem(key, '1'); } catch { /* optional storage */ }
          resolve(true); return;
        }
      }
      if (++tries >= 120) { resolve(false); return; }
      setTimeout(attempt, 1000);
    };
    // Schedule once so even a synchronous pixel stub cannot race map insertion.
    setTimeout(attempt, 0);
  });
  pendingPurchases.set(order, send);
  send.then((sent) => { if (!sent) pendingPurchases.delete(order); });
  return send;
}
