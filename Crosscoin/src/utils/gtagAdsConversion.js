// Google Ads purchase-conversion tracking.
//
// The Ads account id and the purchase conversion label are injected into the
// page by _document (window.__gAdsId / window.__gAdsPurchaseLabel), sourced
// from Brand Settings. This is a no-op until a GOOGLE_ADS_CONVERSION_LABEL is
// configured, so it's safe to call on every successful order.
export function gtagAdsPurchase({ transaction_id, value, currency = 'INR' }) {
  if (typeof window === 'undefined' || !window.gtag) return;

  const id = window.__gAdsId;
  const label = window.__gAdsPurchaseLabel;
  if (!id || !label) return; // conversion action not set up yet

  const path = window.location.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/auth')) return;

  try {
    window.gtag('event', 'conversion', {
      send_to: `${id}/${label}`,
      value,
      currency,
      transaction_id,
    });
  } catch (_) {}
}
