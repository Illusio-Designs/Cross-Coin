/**
 * Lightweight error reporter — drains window.__crosscoinErrors and
 * forwards each entry to whatever monitor is configured.
 *
 * Why this exists: ErrorBoundary already collects render errors into
 * window.__crosscoinErrors (max 20) and dispatches a 'crosscoin:error'
 * event. The axios interceptor surfaces API failures to toasts. What's
 * missing is a single place to ship those signals to a real monitor.
 *
 * A custom sink can be passed — installErrorReporter((entry) => ...) — to
 * forward entries to any monitor. Without one, it logs to console in dev and
 * posts to /api/client-errors in prod (a tiny endpoint that just writes to
 * logger.error). No PII is ever included.
 *
 * Call installErrorReporter() once from _app.jsx, AFTER
 * installLinkHardening() and installApiInterceptors().
 */

let installed = false;

function defaultSink(payload) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[errorReporter]', payload);
    return;
  }
  // Best-effort POST. Failure is silent — the boundary already
  // showed the user UI; this is purely for ops visibility.
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    fetch(`${apiUrl}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}

export function installErrorReporter(customSink) {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const sink = typeof customSink === 'function' ? customSink : defaultSink;

  // Drain whatever buffered in the ring before we hooked.
  const buffered = Array.isArray(window.__crosscoinErrors) ? [...window.__crosscoinErrors] : [];
  buffered.forEach((entry) => sink(entry));
  window.__crosscoinErrors = [];

  // Real-time path: the boundary dispatches this on every catch.
  window.addEventListener('crosscoin:error', (event) => {
    const { error, errorInfo } = event.detail || {};
    sink({
      kind: 'render',
      message: error?.toString() || 'Unknown render error',
      stack: errorInfo?.componentStack || error?.stack || null,
      href: window.location.href,
      at: new Date().toISOString(),
      ua: navigator.userAgent,
    });
  });

  // Catch promise rejections that nobody handled (the axios interceptor
  // catches API ones; this is for everything else).
  window.addEventListener('unhandledrejection', (event) => {
    sink({
      kind: 'unhandled-rejection',
      message: event.reason?.toString() || 'Unhandled promise rejection',
      stack: event.reason?.stack || null,
      href: window.location.href,
      at: new Date().toISOString(),
      ua: navigator.userAgent,
    });
  });

  // Catch synchronous errors outside React's reconciler.
  window.addEventListener('error', (event) => {
    // Skip "Script error." cross-origin noise that gives no useful info.
    if (!event.error && event.message === 'Script error.') return;
    sink({
      kind: 'window-error',
      message: event.message,
      stack: event.error?.stack || null,
      source: event.filename,
      line: event.lineno,
      col: event.colno,
      href: window.location.href,
      at: new Date().toISOString(),
      ua: navigator.userAgent,
    });
  });
}
