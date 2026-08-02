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
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || '__BRAND__';
const RELAY_EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search']);

function readCookie(name) {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function fbTrack(event, params = {}) {
  if (typeof window === 'undefined' || !window.fbq) return;
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
