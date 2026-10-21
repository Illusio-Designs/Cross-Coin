// @generated — DO NOT EDIT. Source: shared/frontend/pixel.js
// Edit that file then run: node scripts/sync-frontend-shared.mjs
// Guarded Meta Pixel event helper + Conversions API relay.
//
// Fires the browser pixel with a shared eventID and mirrors the funnel events to
// the shared backend CAPI endpoint (/api/facebook-pixel/track) so Meta
// deduplicates browser + server and coverage improves. Brand is sent via the
// X-Brand-Name header so each storefront's own Pixel/CAPI is used.
//
// SAFE BY DESIGN: every path is wrapped so analytics can never break checkout.
// Purchase is intentionally NOT relayed here — the backend already sends it
// server-side at order time.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'gripzus';
// PageView: every page (metaPageView) and the cart drawer (cartPageView).
const RELAY_EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search', 'AddPaymentInfo', 'AddToWishlist', 'PageView']);

// Meta event names map to Google ecommerce events. Purchase is sent separately
// with the order number as transaction_id for reconciliation.
const GA4_EVENT = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Search: 'search',
  AddToWishlist: 'add_to_wishlist',
};

function readCookie(name) {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

// Map the Meta custom_data shape to GA4's items[] (item_id/quantity/name).
function ga4Items(params) {
  const contents = Array.isArray(params.contents) ? params.contents : null;
  const rows = contents && contents.length
    ? contents.map((c) => ({ item_id: String(c.id), quantity: c.quantity || 1 }))
    : (Array.isArray(params.content_ids) ? params.content_ids : []).map((id) => ({ item_id: String(id), quantity: 1 }));
  // Single-item events carry a name — attach it so GA4 shows a real product.
  if (rows.length === 1 && params.content_name) rows[0].item_name = params.content_name;
  return rows;
}

// First-party funnel relay — records view/cart/checkout into our own DB
// (/api/i/e — a neutral path ad blockers don't match) so the admin Traffic &
// Conversion report can build a full funnel independent of Meta/Google (and of
// ad blockers that drop pixels). Keyed to the session_id cookie when the browser
// sends it, else to the first-party copy of the visit id (utm_session_id, saved
// by VisitTracker) — the api cookie is third-party on brand domains, so Safari
// and other cookie-blocking browsers never send it. Brand via header.
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
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify({ event: name, value: Number(params.value || 0), session_id: fpSessionId(), product_id: fpProductId(name, params) }),
    }).catch(() => {});
  } catch (_) { /* never throw */ }
}

// Buffer early interactions until the brand's direct GA4 config is queued.
const pendingGoogleEvents = [];
let googleReadyListenerAdded = false;
function googleEvent(name, params) {
  if (typeof window === 'undefined') return;
  if (!window.gtag || !window.__brandGa4Ready) {
    if (pendingGoogleEvents.length < 100) pendingGoogleEvents.push([name, params]);
    if (!googleReadyListenerAdded) {
      googleReadyListenerAdded = true;
      window.addEventListener('brand-ga4-ready', () => {
        if (!window.gtag || !window.__brandGa4Ready) return;
        for (const [event, data] of pendingGoogleEvents.splice(0)) googleEvent(event, data);
      });
    }
    return;
  }
  try { window.gtag('event', name, params); } catch (_) {}
}
let lastGooglePage = null;
export function trackPageView(pagePath) {
  if (typeof window === 'undefined' || !pagePath || lastGooglePage === pagePath) return;
  lastGooglePage = pagePath;
  googleEvent('page_view', { page_path: pagePath });
}

// Mirror a funnel event to GA4. Safe/no-op if gtag isn't present.
function ga4Track(event, params) {
  if (typeof window === 'undefined') return;
  const name = GA4_EVENT[event];
  if (!name) return;
  try {
    googleEvent(name, name === 'search'
      ? { search_term: params.search_string || '' }
      : { currency: params.currency || 'INR', value: Number(params.value || 0), items: ga4Items(params) });
  } catch (_) { /* never throw */ }
}

export function fbTrack(event, params = {}) {
  if (typeof window === 'undefined') return;

  // GA4 (Google) — mirror the funnel so Google sees shopping behaviour, not just
  // pageviews. Independent of the Meta pixel below (either may be absent).
  ga4Track(event, params);

  // First-party funnel event → our own DB (fires regardless of Meta/GA presence).
  fpTrack(event, params);

  // Meta: the pixel loads after the tracking config, cookie consent and page
  // load — later than an event fired on mount (ViewContent on a product page
  // someone lands on). Hold such events and send them once fbq exists, instead
  // of dropping them (and their CAPI copy). Without marketing consent fbq never
  // appears, so held events are never sent.
  if (!window.fbq) { holdMeta(event, params); return; }
  sendMeta(event, params, window.location.href);
}

// Meta pixel + CAPI relay only (no GA4 / first-party copy) — held until the
// pixel exists, like fbTrack.
function metaTrack(event, params) {
  if (typeof window === 'undefined') return;
  if (!window.fbq) { holdMeta(event, params); return; }
  sendMeta(event, params, window.location.href);
}

const pendingMeta = [];
let metaWaiting = false;
function flushMeta() {
  if (!window.fbq) return false;
  metaWaiting = false;
  const cutoff = Date.now() - 10 * 60 * 1000; // older than 10 min: stale, drop
  for (const [ev, p, url, at] of pendingMeta.splice(0)) if (at >= cutoff) sendMeta(ev, p, url);
  return true;
}
function holdMeta(event, params) {
  if (pendingMeta.length < 50) pendingMeta.push([event, params, window.location.href, Date.now()]);
  if (metaWaiting) return;
  metaWaiting = true;
  // Analytics dispatches 'brand-fbq-ready' right after fbq('init'); the poll is
  // a fallback (consent given later, or the event missed), for up to 10 min.
  window.addEventListener('brand-fbq-ready', flushMeta, { once: true });
  let tries = 0;
  const tick = () => { if (flushMeta() || ++tries > 600) return; setTimeout(tick, 1000); };
  setTimeout(tick, 500);
}

function sendMeta(event, params, url) {
  const eventID = `${event}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    window.fbq('track', event, params, { eventID });
  } catch (_) { /* never throw */ }

  if (!RELAY_EVENTS.has(event)) return;
  try {
    const u = window.__fbUser || {};
    fetch(`${API_URL}/api/facebook-pixel/track`, {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify({
        event_name: event,
        event_id: eventID,
        event_source_url: url || window.location.href,
        custom_data: params,
        user_data: { em: u.em, ph: u.ph, fn: u.fn, ln: u.ln, external_id: u.external_id },
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
      }),
    }).catch(() => {});
  } catch (_) { /* never throw */ }
}

// GA4 view_cart — fired when the cart drawer/page opens with items in it. This
// is GA4-ONLY: Meta has no standard ViewCart event, so the pixel is
// intentionally not touched here. Pass the same {content_ids, contents, value,
// currency} shape used for the other funnel events. Safe/no-op without gtag and
// fully wrapped, so it can never break the cart UI.
export function viewCart(params = {}) {
  if (typeof window === 'undefined') return;
  try {
    googleEvent('view_cart', {
      currency: params.currency || 'INR',
      value: Number(params.value || 0),
      items: ga4Items(params),
    });
  } catch (_) { /* never throw */ }
}

// GA4 add_shipping_info — fired when the shopper commits a valid shipping
// address + delivery method (just before the order is placed). GA4-ONLY, like
// view_cart; pass {contents, value, currency, shipping_tier}. Wrapped + no-op
// without gtag so it can never break checkout.
export function addShippingInfo(params = {}) {
  if (typeof window === 'undefined') return;
  try {
    googleEvent('add_shipping_info', {
      currency: params.currency || 'INR',
      value: Number(params.value || 0),
      shipping_tier: params.shipping_tier || undefined,
      items: ga4Items(params),
    });
  } catch (_) { /* never throw */ }
  fpTrack('AddShippingInfo', params); // our own funnel events
}

// GA4 add_payment_info — fired when the payment method is chosen (cod/prepaid),
// just before the order is placed. GA4-ONLY; pass {contents, value, currency,
// payment_type}. Wrapped + no-op without gtag.
export function addPaymentInfo(params = {}) {
  if (typeof window === 'undefined') return;
  try {
    googleEvent('add_payment_info', {
      currency: params.currency || 'INR',
      value: Number(params.value || 0),
      payment_type: params.payment_type || undefined,
      items: ga4Items(params),
    });
  } catch (_) { /* never throw */ }
  fpTrack('AddPaymentInfo', params); // our own funnel events
  // Meta AddPaymentInfo (pixel + CAPI, one event id) for COD and prepaid —
  // as Shopify's Meta app sends it when payment details are submitted.
  try {
    metaTrack('AddPaymentInfo', {
      content_ids: params.content_ids, contents: params.contents, content_type: 'product',
      value: Number(params.value || 0), currency: params.currency || 'INR',
    });
  } catch (_) { /* never throw */ }
}

// Meta PageView for every page, first load included: browser pixel + its
// Conversions API copy under one event id, like Shopify's Meta app. Held
// until the pixel loads (which needs marketing consent); each path once.
let lastMetaPath = null;
export function metaPageView(path) {
  if (typeof window === 'undefined' || !path || path === lastMetaPath) return;
  lastMetaPath = path;
  try { metaTrack('PageView', {}); } catch (_) { /* never throw */ }
}

// The cart drawer counts as a page: one page view each time it opens, at a
// virtual /cart address, even with an empty bag. GA4 page_view; Meta PageView
// in the browser + its Conversions API copy (one event id, only with marketing
// consent: held until the pixel loads, which needs consent); and a view_cart
// row in our own funnel events.
export function cartPageView() {
  if (typeof window === 'undefined') return;
  try {
    googleEvent('page_view', {
      page_location: window.location.origin + '/cart',
      page_path: '/cart',
      page_title: 'Cart',
    });
  } catch (_) { /* never throw */ }
  try { metaTrack('PageView', {}); } catch (_) { /* never throw */ }
  try { fpTrack('ViewCart', {}); } catch (_) { /* never throw */ }
}

// Search results shown for a query (Meta Search + CAPI, GA4 search with the
// term, first-party search). Call once per submitted query.
export function trackSearch(term) {
  const q = String(term || '').trim();
  if (!q) return;
  fbTrack('Search', { search_string: q.slice(0, 100), content_type: 'product' });
}

// Product saved to the wishlist (Meta AddToWishlist + CAPI, GA4
// add_to_wishlist, first-party add_to_wishlist).
export function trackWishlist(product = {}) {
  if (!product || product.id == null) return;
  fbTrack('AddToWishlist', {
    content_ids: [String(product.id)], content_type: 'product', content_name: product.name || undefined,
    value: Number(product.price || 0), currency: 'INR', contents: [{ id: String(product.id), quantity: 1 }],
  });
}

// Browser ids to send with an order / checkout request, so the server-side
// Purchase matches this shopper: Meta _fbp/_fbc and the GA4 client id. Also
// whether the shopper allowed marketing cookies: the Meta pixel only loads
// with that consent, so fbq existing means yes. The server sends Meta a
// Purchase only when this is true, as Shopify does.
export function trackingIds() {
  if (typeof window === 'undefined') return {};
  const out = { marketing_consent: !!window.fbq };
  const fbp = readCookie('_fbp'); if (fbp) out.fbp = fbp;
  const fbc = readCookie('_fbc'); if (fbc) out.fbc = fbc;
  const ga = readCookie('_ga'); // GA1.1.<client id>
  const m = ga && ga.match(/^GA\d\.\d\.(.+)$/);
  if (m) out.ga_client_id = m[1];
  return out;
}

// Purchase — fired browser-side on the order-confirmation (thank-you) view.
//
// The eventID is DETERMINISTIC (`Purchase_<order_number>`) and matches the
// backend's server-side Purchase event id exactly, so Meta deduplicates the
// two into one conversion instead of double-counting. Because the server
// already sends Purchase via the Conversions API, this is intentionally NOT
// relayed again here — the browser pixel is the second, deduped leg.
export function fbPurchase(orderNumber, params = {}) {
  if (typeof window === 'undefined') return;
  if (!orderNumber || orderNumber === '—') return; // no real order → skip

  // GA4 purchase is sent by the server only (with this shopper's GA client id,
  // see trackingIds) — as Shopify does — so it is never counted twice.

  // Meta: the server sends Purchase via CAPI with the same event id; this is
  // the browser leg. Held until the pixel exists instead of being dropped.
  const send = () => { try { window.fbq('track', 'Purchase', params, { eventID: `Purchase_${orderNumber}` }); } catch (_) { /* never throw */ } };
  if (window.fbq) { send(); return; }
  let tries = 0;
  const wait = () => { if (window.fbq) { send(); return; } if (++tries < 120) setTimeout(wait, 1000); };
  setTimeout(wait, 500);
}
