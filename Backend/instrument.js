// Sentry backend init — MUST be required before any other module (see the
// first line of index.js) so the SDK can auto-instrument http/express/etc.
//
// This is a NO-OP unless SENTRY_DSN is set in the environment, so it is safe
// to ship before the DSN exists: nothing sends, nothing breaks. Set SENTRY_DSN
// in the cPanel Node app environment (the Sentry "Express" project's DSN) and
// restart to turn it on — no code change required.
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Keep tracing light on cPanel; errors are unsampled (always captured).
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE || '0.1'),
    // Don't ship PII unless explicitly opted in.
    sendDefaultPii: process.env.SENTRY_PII === 'true',
    release: process.env.APP_VERSION || undefined,
  });
}

module.exports = Sentry;
