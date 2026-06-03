/**
 * Sentry adapter — auto-wires Sentry if the SDK is installed, otherwise
 * returns null so the default error reporter sink fires instead.
 *
 * Why this file: installing `@sentry/nextjs` requires a `sentry.client.config.js`
 * at the project root and a CLI auth step. We don't want to ship that
 * config unless an operator actually has a DSN. Instead this adapter:
 *
 *   1. Try-loads `@sentry/nextjs` — silently returns null if not installed.
 *   2. Reads `NEXT_PUBLIC_SENTRY_DSN` from env — returns null if absent.
 *   3. Initialises Sentry with sensible defaults.
 *   4. Returns a `captureException` function suitable for installErrorReporter().
 *
 * Operator workflow:
 *
 *   npm i @sentry/nextjs
 *   echo 'NEXT_PUBLIC_SENTRY_DSN=https://...' >> .env.local
 *   # restart dev / redeploy — no code changes
 *
 * Use it like:
 *
 *   import { installErrorReporter } from './errorReporter';
 *   import { tryInitSentry } from './sentryAdapter';
 *
 *   const sentrySink = tryInitSentry();
 *   installErrorReporter(sentrySink || undefined);   // falls back to default sink
 */

let resolvedSink = undefined;

export function tryInitSentry() {
  if (typeof window === 'undefined') return null;
  if (resolvedSink !== undefined) return resolvedSink;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    resolvedSink = null;
    return null;
  }

  let Sentry;
  try {
    // eslint-disable-next-line global-require
    Sentry = require('@sentry/nextjs');
  } catch {
    // SDK not installed — nothing to do.
    resolvedSink = null;
    return null;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE || '0.1'),
      // Don't ship PII unless explicitly opted in.
      sendDefaultPii: process.env.NEXT_PUBLIC_SENTRY_PII === 'true',
      release: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
      // Be quieter in dev.
      enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_FORCE === 'true',
    });

    resolvedSink = (payload) => {
      try {
        // payload is whatever errorReporter passes — keep raw for unhandled
        // rejections / window errors; reconstruct a real Error for renders.
        if (payload && payload.message && payload.stack) {
          const err = new Error(payload.message);
          err.stack = payload.stack;
          Sentry.captureException(err, {
            tags: { kind: payload.kind || 'unknown' },
            extra: { href: payload.href, ua: payload.ua },
          });
        } else {
          Sentry.captureException(payload);
        }
      } catch { /* never let the sink throw */ }
    };
    return resolvedSink;
  } catch {
    resolvedSink = null;
    return null;
  }
}
