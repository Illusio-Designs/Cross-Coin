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
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'morbix';
const RELAY_EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search']);

// Meta event name → GA4 (gtag) ecommerce event name. Purchase is intentionally
// absent: the backend already sends GA4 purchase server-side (Measurement
// Protocol), and GA4 does not cleanly dedupe client + server purchases, so
// firing it here too would double-count revenue.
const GA4_EVENT = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Search: 'search',
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
// (/api/events/track) so the admin Traffic & Conversion report can build a
// full funnel independent of Meta/Google (and of ad blockers that drop pixels).
// Keyed to the session_id cookie (credentials: 'include'); brand via header.
const FP_EVENT = { ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', AddToWishlist: 'add_to_wishlist', Search: 'search' };
function fpTrack(event, params) {
  if (typeof window === 'undefined') return;
  const name = FP_EVENT[event];
  if (!name) return;
  try {
    fetch(`${API_URL}/api/events/track`, {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify({ event: name, value: Number(params.value || 0) }),
    }).catch(() => {});
  } catch (_) { /* never throw */ }
}

// Mirror a funnel event to GA4. Safe/no-op if gtag isn't present.
function ga4Track(event, params) {
  if (typeof window === 'undefined' || !window.gtag) return;
  const name = GA4_EVENT[event];
  if (!name) return;
  try {
    window.gtag('event', name, {
      currency: params.currency || 'INR',
      value: Number(params.value || 0),
      items: ga4Items(params),
    });
  } catch (_) { /* never throw */ }
}

export function fbTrack(event, params = {}) {
  if (typeof window === 'undefined') return;

  // GA4 (Google) — mirror the funnel so Google sees shopping behaviour, not just
  // pageviews. Independent of the Meta pixel below (either may be absent).
  ga4Track(event, params);

  // First-party funnel event → our own DB (fires regardless of Meta/GA presence).
  fpTrack(event, params);

  if (!window.fbq) return;
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
        event_source_url: window.location.href,
        custom_data: params,
        user_data: { em: u.em, ph: u.ph, fn: u.fn, ln: u.ln, external_id: u.external_id },
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
      }),
    }).catch(() => {});
  } catch (_) { /* never throw */ }
}

// Purchase — fired browser-side on the order-confirmation (thank-you) view.
//
// The eventID is DETERMINISTIC (`Purchase_<order_number>`) and matches the
// backend's server-side Purchase event id exactly, so Meta deduplicates the
// two into one conversion instead of double-counting. Because the server
// already sends Purchase via the Conversions API, this is intentionally NOT
// relayed again here — the browser pixel is the second, deduped leg.
export function fbPurchase(orderNumber, params = {}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (!orderNumber || orderNumber === '—') return; // no real order → skip
  try {
    window.fbq('track', 'Purchase', params, { eventID: `Purchase_${orderNumber}` });
  } catch (_) { /* never throw */ }
}
