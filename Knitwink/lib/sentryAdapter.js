/**
 * Sentry adapter — auto-wires Sentry if the SDK is installed, otherwise
 * returns null so the default error reporter sink (POST to
 * /api/client-errors) fires instead.
 *
 * Operator workflow:
 *
 *   npm i @sentry/nextjs
 *   echo 'NEXT_PUBLIC_SENTRY_DSN=https://...' >> .env.local
 *   # restart dev / redeploy — no code changes
 *
 * Use it like:
 *
 *   import { installErrorReporter } from '@/lib/errorReporter';
 *   import { tryInitSentry } from '@/lib/sentryAdapter';
 *
 *   useEffect(() => {
 *     installErrorReporter(tryInitSentry() || undefined);
 *   }, []);
 */

let resolvedSink = undefined;

// Hold the dynamically-imported Sentry module here once it resolves.
// Done lazily because we don't want @sentry/nextjs in the SSR chunk
// (it does Node-level instrumentation at module load) and we don't
// want it in the client chunk either unless a DSN is actually set.
let Sentry = null;

export function tryInitSentry() {
  if (typeof window === 'undefined') return null;
  if (resolvedSink !== undefined) return resolvedSink;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    resolvedSink = null;
    return null;
  }

  // Kick off the dynamic import. While it's in flight we return null
  // — errors fired during the few ms before Sentry loads will fall
  // through to the default sink (POST /api/client-errors).
  if (!Sentry) {
    import('@sentry/nextjs')
      .then((mod) => {
        Sentry = mod;
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
                Sentry.captureException(err, {
                  tags: { kind: payload.kind || 'unknown' },
                  extra: { href: payload.href, ua: payload.ua },
                });
              } else {
                Sentry.captureException(payload);
              }
            } catch { /* never let the sink throw */ }
          };
        } catch { resolvedSink = null; }
      })
      .catch(() => { resolvedSink = null; });
  }
  return null;
}

