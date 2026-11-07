// Opt-in checkout troubleshooting. Never store tokens, cookies, customer data,
// request bodies or provider response bodies; only the explicitly listed fields.
const KEY = 'soxbae-checkout-diagnostic-v1';
let memoryReport = null;
const STAGES = new Set(['button_tapped', 'opening_started', 'token_requested', 'sdk_ready', 'token_response', 'sdk_open_requested', 'sdk_call_returned', 'opening_failed']);
export const DIAGNOSTIC_EVENT = 'soxbae-checkout-diagnostic';
export function checkoutDiagnosticsEnabled() {
  return typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('checkout_debug') === '1';
}
export function readCheckoutDiagnostic() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') || memoryReport; } catch { return memoryReport; }
}
function save(report) {
  memoryReport = report;
  try { sessionStorage.setItem(KEY, JSON.stringify(report)); } catch { /* optional storage */ }
  try { window.dispatchEvent(new Event(DIAGNOSTIC_EVENT)); } catch { /* non-browser test */ }
}
export function startCheckoutDiagnostic(source, { preserveTap = false } = {}) {
  if (!checkoutDiagnosticsEnabled()) return;
  const previous = readCheckoutDiagnostic();
  if (preserveTap && previous?.stages?.at(-1)?.stage === 'button_tapped' && Date.now() - Date.parse(previous.startedAt) < 10000) return;
  save({ version: 2, source: source === 'cart' ? 'cart' : 'buy-now', origin: window.location.origin,
    path: window.location.pathname, startedAt: new Date().toISOString(), stages: [] });
}
export function checkoutDiagnosticStep(stage, fields = {}) {
  if (!checkoutDiagnosticsEnabled() || !STAGES.has(stage)) return;
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
export function checkoutFallbackUrl(href, { includeTrace = true } = {}) {
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) {
    if (/^attributes\[fastrr_redirect(?:_uuid|_time)?\]$/.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.delete('checkout_trace');
  const report = readCheckoutDiagnostic();
  if (includeTrace && url.searchParams.get('checkout_debug') === '1' && report?.stages?.length) {
    // This contains only opt-in, allowlisted diagnostics. No SDK access token,
    // customer information or tracking identifiers are put in the return URL.
    url.searchParams.set('checkout_trace', JSON.stringify({ version: 2, source: report.source, startedAt: report.startedAt, stages: report.stages.slice(-12) }));
  }
  return url.href;
}
function traceFromUrl(url) {
  const raw = url.searchParams.get('checkout_trace');
  if (!raw || raw.length > 5000) return null;
  try {
    const value = JSON.parse(raw);
    if (value.version !== 2 || !Array.isArray(value.stages)) return null;
    const stages = value.stages.filter((step) => step && STAGES.has(step.stage)).slice(-12).map((step) => {
      const safe = { stage: step.stage };
      if (typeof step.at === 'string' && /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(step.at)) safe.at = step.at;
      for (const key of ['httpStatus', 'itemCount', 'productCount', 'tokenPresent', 'catalogReady']) {
        if (typeof step[key] === 'boolean' || typeof step[key] === 'number') safe[key] = step[key];
      }
      if (step.code === 'CHECKOUT_OPEN_FAILED') safe.code = step.code;
      return safe;
    });
    return { version: 2, source: value.source === 'cart' ? 'cart' : 'buy-now',
      ...(typeof value.startedAt === 'string' && /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(value.startedAt) ? { startedAt: value.startedAt } : {}),
      origin: window.location.origin, path: window.location.pathname, stages, traceRecoveredFromReturnUrl: true };
  } catch { return null; }
}
export function recordCheckoutReturn() {
  if (!checkoutDiagnosticsEnabled()) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('attributes[fastrr_redirect]')) return;
  const ids = url.searchParams.getAll('attributes[fastrr_redirect_uuid]').filter((id) => /^[a-zA-Z0-9-]{1,80}$/.test(id));
  const report = traceFromUrl(url) || readCheckoutDiagnostic() || { version: 2, origin: window.location.origin, path: window.location.pathname, stages: [] };
  report.providerReturned = true;
  report.redirectIds = ids.slice(-6);
  report.returnedAt = new Date().toISOString();
  save(report);
  // The report preserves the provider references; the next attempt starts with
  // a clean fallback URL rather than repeatedly appending the same parameters.
  window.history.replaceState(window.history.state, '', checkoutFallbackUrl(url.href, { includeTrace: false }));
}
