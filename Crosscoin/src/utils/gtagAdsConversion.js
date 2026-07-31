// Google Ads conversion tracking.
//
// In Google Ads every event is its own conversion action with its own label,
// so labels are configured as a map (GOOGLE_ADS_CONVERSION_LABELS in Brand
// Settings → Analytics, a JSON object keyed by event name). _document injects
// the account id + label map into the page:
//   window.__gAdsId            → 'AW-…'
//   window.__gAdsLabels        → { purchase: 'AbC…', add_to_cart: 'DeF…', … }
//   window.__gAdsPurchaseLabel → legacy single purchase label (fallback)
//
// Each call is a no-op unless a label exists for that event, so it's safe to
// call on every funnel step. Supported event keys mirror the GA4 events:
//   view_item, add_to_cart, begin_checkout, add_shipping_info,
//   add_payment_info, purchase.
export function gtagAdsConversion(event, { value, currency = 'INR', transaction_id } = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;

  const id = window.__gAdsId;
  const labels = window.__gAdsLabels || {};
  const label = labels[event] || (event === 'purchase' ? window.__gAdsPurchaseLabel : null);
  if (!id || !label) return; // no conversion action configured for this event

  const path = window.location.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/auth')) return;

  try {
    const params = { send_to: `${id}/${label}` };
    if (value != null) params.value = value;
    if (currency) params.currency = currency;
    if (transaction_id) params.transaction_id = transaction_id;
    window.gtag('event', 'conversion', params);
  } catch (_) {}
}

// Backward-compatible helper for the purchase conversion.
export function gtagAdsPurchase(args) {
  return gtagAdsConversion('purchase', args);
}
