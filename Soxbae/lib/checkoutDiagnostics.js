// Opt-in checkout troubleshooting. Never store tokens, cookies, customer data,
// request bodies or provider response bodies; only the explicitly listed fields.
const KEY = 'soxbae-checkout-diagnostic-v1';
export const DIAGNOSTIC_EVENT = 'soxbae-checkout-diagnostic';
export function checkoutDiagnosticsEnabled() {
  return typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('checkout_debug') === '1';
}
export function readCheckoutDiagnostic() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function save(report) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(report));
    window.dispatchEvent(new Event(DIAGNOSTIC_EVENT));
  } catch { /* storage can be disabled in private browsers */ }
}
export function startCheckoutDiagnostic(source) {
  if (!checkoutDiagnosticsEnabled()) return;
  save({ version: 1, source: source === 'cart' ? 'cart' : 'buy-now', origin: window.location.origin,
    path: window.location.pathname, startedAt: new Date().toISOString(), stages: [] });
}
export function checkoutDiagnosticStep(stage, fields = {}) {
  if (!checkoutDiagnosticsEnabled()) return;
  const report = readCheckoutDiagnostic();
  if (!report) return;
  const safe = {};
  for (const key of ['httpStatus', 'itemCount', 'productCount', 'tokenPresent', 'catalogReady']) {
    if (typeof fields[key] === 'boolean' || typeof fields[key] === 'number') safe[key] = fields[key];
  }
  if (/^[A-Z0-9_]{1,60}$/.test(fields.code || '')) safe.code = fields.code;
  report.stages = [...(report.stages || []).slice(-23), { stage, at: new Date().toISOString(), ...safe }];
  save(report);
}
export function checkoutFallbackUrl(href) {
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) {
    if (/^attributes\[fastrr_redirect(?:_uuid|_time)?\]$/.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}
export function recordCheckoutReturn() {
  if (!checkoutDiagnosticsEnabled()) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('attributes[fastrr_redirect]')) return;
  const ids = url.searchParams.getAll('attributes[fastrr_redirect_uuid]').filter((id) => /^[a-zA-Z0-9-]{1,80}$/.test(id));
  const report = readCheckoutDiagnostic() || { version: 1, origin: window.location.origin, path: window.location.pathname, stages: [] };
  report.providerReturned = true;
  report.redirectIds = ids.slice(-6);
  report.returnedAt = new Date().toISOString();
  save(report);
  // The report preserves the provider references; the next attempt starts with
  // a clean fallback URL rather than repeatedly appending the same parameters.
  window.history.replaceState(window.history.state, '', checkoutFallbackUrl(url.href));
}
