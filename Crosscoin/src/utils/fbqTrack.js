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
  if (typeof window === 'undefined' || !window.fbq) return false;
  if (BLOCKED_EVENTS.includes(event)) return false;

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
