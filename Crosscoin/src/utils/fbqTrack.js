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

// Events we mirror to CAPI from the browser. Purchase / AddPaymentInfo /
// AddShippingInfo are intentionally excluded — the server already sends those
// authoritatively at order time (Purchase deduped via `Purchase_<order>`), so
// relaying them again would add redundant server events.
const RELAY_EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search']);

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
// (/api/events/track) so the admin Traffic & Conversion report can build a full
// funnel independent of Meta/Google (and of ad blockers). Keyed to the
// session_id cookie (credentials: 'include'); brand via header.
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
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND_NAME },
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

function makeEventId(event) {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${event}_${Date.now()}_${rnd}`;
}

function readCookie(name) {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

// Fire-and-forget relay to the Conversions API. keepalive lets it complete even
// if the page is navigating away (e.g. InitiateCheckout → redirect to payment).
function relayToCapi(event, eventID, params) {
  try {
    const u = (typeof window !== 'undefined' && window.__fbUser) || {};
    const body = JSON.stringify({
      event_name: event,
      event_id: eventID,
      event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
      custom_data: params,
      user_data: { em: u.em, ph: u.ph, fn: u.fn, ln: u.ln, external_id: u.external_id },
      fbp: readCookie('_fbp'),
      fbc: readCookie('_fbc'),
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

export function fbqTrack(event, params = {}, options = {}) {
  if (typeof window === 'undefined') return false;
  if (BLOCKED_EVENTS.includes(event)) return false;

  // GA4 (Google) mirror — independent of the Meta pixel (either may be absent).
  ga4Track(event, params);

  // First-party funnel event → our own DB (fires regardless of Meta/GA presence).
  fpTrack(event, params);

  if (!window.fbq) return false;
  const eventID = options.eventID || makeEventId(event);
  try {
    // Always pass eventID so the browser event can be deduplicated server-side.
    window.fbq('track', event, params, { eventID });
  } catch (error) {
    return false;
  }

  if (RELAY_EVENTS.has(event)) relayToCapi(event, eventID, params);
  return true;
}
