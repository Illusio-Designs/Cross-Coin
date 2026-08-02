// Meta Pixel — Manual Advanced Matching.
//
// Re-initialises the pixel with the logged-in user's raw email / phone / name.
// The browser pixel SHA-256-hashes em/ph/fn/ln automatically (external_id is
// sent as-is). This improves match quality, conversion attribution and the
// share of events that can be deduplicated against the Conversions API.
// The pixel id is exposed by _document as window._fbqId. No-op on admin/auth.
export function fbAdvancedMatching(user) {
  if (typeof window === 'undefined' || !window.fbq || !window._fbqId || !user) return;

  const path = window.location.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/auth')) return;

  const email = (user.email || '').trim().toLowerCase();
  let phone = String(user.phone || '').replace(/\D/g, '');
  if (phone && phone.length === 10) phone = '91' + phone; // add country code
  if (!email && !phone) return;

  const key = email + '|' + phone;
  if (window.__fbAmKey === key) return; // don't re-init for the same user
  window.__fbAmKey = key;

  const name = String(user.username || user.name || '').trim().toLowerCase();
  const [fn, ...rest] = name.split(/\s+/).filter(Boolean);
  const data = {};
  if (email) data.em = email;
  if (phone) data.ph = phone;
  if (fn) data.fn = fn;
  if (rest.length) data.ln = rest.join(' ');
  if (user.id) data.external_id = String(user.id);

  // Expose to the CAPI relay (utils/pixel.js) so server-side events carry the
  // same match keys and dedupe/attribution improve.
  window.__fbUser = data;

  try { window.fbq('init', window._fbqId, data); } catch { /* non-fatal */ }
}
