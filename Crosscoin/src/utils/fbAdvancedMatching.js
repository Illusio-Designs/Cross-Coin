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

  try { window.fbq('init', window._fbqId, data); } catch { /* non-fatal */ }

  // Expose the same identifiers (raw) for the Conversions API relay in
  // fbqTrack — the server hashes them. Improves server-event match quality.
  window.__fbUser = {
    em: email || undefined,
    ph: phone || undefined,
    fn: fn || undefined,
    ln: rest.length ? rest.join(' ') : undefined,
    external_id: user.id ? String(user.id) : undefined,
  };
}

// After an order: the buyer's hashed email / phone (SHA-256, from our server's
// order confirmation). Kept on this device (localStorage fb_am) so the pixel
// starts with them on later visits too (_document reads it), and re-inits the
// pixel now so this page's Purchase matches as well as the server's.
const AM_KEY = 'fb_am';
export function rememberBuyer(keys = {}) {
  if (typeof window === 'undefined') return;
  const am = {};
  if (/^[a-f0-9]{64}$/.test(keys.em || '')) am.em = keys.em;
  if (/^[a-f0-9]{64}$/.test(keys.ph || '')) am.ph = keys.ph;
  if (!am.em && !am.ph) return;
  try { localStorage.setItem(AM_KEY, JSON.stringify(am)); } catch (_) { /* blocked */ }
  window.__fbUser = { ...am, ...(window.__fbUser || {}) };
  try { if (window.fbq && window._fbqId) window.fbq('init', window._fbqId, am); } catch (_) { /* non-fatal */ }
}
