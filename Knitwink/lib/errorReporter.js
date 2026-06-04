/**
 * Global error reporter — drains storefront errors to either Sentry
 * (when wired via sentryAdapter) or the backend's /api/client-errors
 * endpoint as a fallback sink.
 *
 *   import { installErrorReporter } from '@/lib/errorReporter';
 *   import { tryInitSentry } from '@/lib/sentryAdapter';
 *
 *   useEffect(() => {
 *     installErrorReporter(tryInitSentry() || undefined);
 *   }, []);
 *
 * What gets reported:
 *   1. Window-level uncaught errors (window.error)
 *   2. Unhandled promise rejections (window.unhandledrejection)
 *   3. Anything pushed to window.__knitwinkErrors by ErrorBoundary
 *
 * Throttling: same-message errors firing in <2s of each other are
 * collapsed into one report. Prevents a render-loop bug from DDoSing
 * the sink.
 */

const SEEN = new Map();   // message → last-reported timestamp
const SAME_MSG_WINDOW_MS = 2000;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'knitwink';

function shouldReport(message) {
  if (!message) return false;
  const now = Date.now();
  const last = SEEN.get(message);
  if (last && now - last < SAME_MSG_WINDOW_MS) return false;
  SEEN.set(message, now);
  // Garbage collect old keys.
  if (SEEN.size > 100) {
    for (const [k, t] of SEEN) {
      if (now - t > 60_000) SEEN.delete(k);
    }
  }
  return true;
}

async function defaultSink(payload) {
  // Fire-and-forget POST to /api/client-errors. Never blocks UI.
  try {
    await fetch(`${API_URL}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND_NAME },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch { /* swallow — never let the sink crash the app */ }
}

let installed = false;

export function installErrorReporter(customSink) {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  const sink = customSink || defaultSink;

  window.addEventListener('error', (e) => {
    const msg = e?.message || String(e?.error || 'window-error');
    if (!shouldReport(msg)) return;
    sink({
      kind: 'window-error',
      message: msg,
      stack: e?.error?.stack,
      href: window.location.href,
      ua: navigator.userAgent,
      at: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason;
    const msg = (reason && (reason.message || String(reason))) || 'unhandled-rejection';
    if (!shouldReport(msg)) return;
    sink({
      kind: 'unhandled-rejection',
      message: msg,
      stack: reason?.stack,
      href: window.location.href,
      ua: navigator.userAgent,
      at: new Date().toISOString(),
    });
  });

  // Also drain whatever ErrorBoundary already buffered.
  window.addEventListener('knitwink:error', (e) => {
    const { error, errorInfo } = e?.detail || {};
    const msg = error?.toString() || 'react-render-error';
    if (!shouldReport(msg)) return;
    sink({
      kind: 'react-render-error',
      message: msg,
      stack: errorInfo?.componentStack,
      href: window.location.href,
      ua: navigator.userAgent,
      at: new Date().toISOString(),
    });
  });
}
