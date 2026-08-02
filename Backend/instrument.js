// Sentry backend init — MUST be required before any other module (see the
// first line of index.js) so the SDK can auto-instrument http/express/etc.
//
// DSN resolution: prefer the SENTRY_DSN env var (so it can be rotated or
// disabled without a code change); fall back to the project DSN below so it
// works on cPanel without an extra env step. A DSN is a send-only ingest key,
// safe to embed in a private repo.
//
// Enabled only in production (or when SENTRY_FORCE=true) so local dev and the
// test suite don't spam the project.
const Sentry = require('@sentry/node');

const DSN = process.env.SENTRY_DSN
  || 'https://6d7846406261c25dac778ea438dcd09e@o4511839897387008.ingest.us.sentry.io/4511839942082560';

const enabled = !!DSN
  && (process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE === 'true');

if (enabled) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'production',
    // Keep tracing light on cPanel; errors are unsampled (always captured).
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE || '0.1'),
    // Don't ship PII unless explicitly opted in.
    sendDefaultPii: process.env.SENTRY_PII === 'true',
    release: process.env.APP_VERSION || undefined,
  });
}

module.exports = Sentry;
