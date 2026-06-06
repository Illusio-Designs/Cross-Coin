/**
 * Sentry adapter — auto-wires Sentry if @sentry/nextjs is installed,
 * otherwise returns null so errorReporter falls back to its default
 * `/api/client-errors` sink.
 *
 *   npm i @sentry/nextjs
 *   echo 'NEXT_PUBLIC_SENTRY_DSN=https://...' >> .env.local
 *   # restart dev / redeploy — no code changes
 */

let resolvedSink = undefined;

export function tryInitSentry() {
  if (typeof window === 'undefined') return null;
  if (resolvedSink !== undefined) return resolvedSink;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) { resolvedSink = null; return null; }

  let Sentry;
  try {
    // eslint-disable-next-line global-require
    Sentry = require('@sentry/nextjs');
  } catch {
    resolvedSink = null; return null;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE || '0.1'),
      sendDefaultPii: process.env.NEXT_PUBLIC_SENTRY_PII === 'true',
      release: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
      enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_FORCE === 'true',
    });
    resolvedSink = (payload) => {
      try {
        if (payload && payload.message && payload.stack) {
          const err = new Error(payload.message);
          err.stack = payload.stack;
          Sentry.captureException(err, { tags: { kind: payload.kind || 'unknown' }, extra: { href: payload.href, ua: payload.ua } });
        } else {
          Sentry.captureException(payload);
        }
      } catch { /* never let the sink throw */ }
    };
    return resolvedSink;
  } catch { resolvedSink = null; return null; }
}
