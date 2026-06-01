/**
 * Webhook signature verification middleware.
 *
 * Returns a per-source middleware function that rejects any request
 * whose configured signature header doesn't match an HMAC-SHA256 of
 * the raw request body using the configured shared secret.
 *
 * Sources configured below:
 *   - whatsapp : header X-Hub-Signature-256, secret WHATSAPP_WEBHOOK_SECRET
 *   - fship    : header X-Fship-Signature,   secret FSHIP_WEBHOOK_SECRET
 *   - ithink   : header X-Ithink-Signature,  secret ITHINK_WEBHOOK_SECRET
 *
 * If the secret env var isn't set the middleware logs a warning and
 * lets the request through — we don't want to break webhook delivery
 * before the operator has configured the secret. Set the secret to
 * the same value you registered with the provider, then this becomes
 * enforcing automatically on the next request.
 *
 * Express must capture the RAW body to compute HMAC. The global
 * express.json() in Backend/index.js already does this via
 *   verify: (req, res, buf) => { req.rawBody = buf; }
 * so no changes are required at mount time.
 */

const crypto = require('crypto');
const { logger } = require('../config/logging.js');

const SOURCES = {
  whatsapp: { header: 'x-hub-signature-256', envKey: 'WHATSAPP_WEBHOOK_SECRET', algo: 'sha256', prefix: 'sha256=' },
  fship:    { header: 'x-fship-signature',   envKey: 'FSHIP_WEBHOOK_SECRET',    algo: 'sha256', prefix: '' },
  ithink:   { header: 'x-ithink-signature',  envKey: 'ITHINK_WEBHOOK_SECRET',   algo: 'sha256', prefix: '' },
};

function verifyWebhookSignature(source) {
  const cfg = SOURCES[source];
  if (!cfg) throw new Error(`Unknown webhook source: ${source}`);

  return function webhookSignatureMiddleware(req, res, next) {
    const secret = process.env[cfg.envKey];

    // No secret configured → log + skip enforcement (avoid breaking webhook
    // delivery during initial setup). Operator should configure the secret
    // in env once the provider dashboard is updated.
    if (!secret) {
      logger.warn(`[webhookSignature:${source}] ${cfg.envKey} not set — accepting unsigned request.`);
      return next();
    }

    const received = (req.headers[cfg.header] || '').toString();
    if (!received) {
      logger.warn(`[webhookSignature:${source}] missing ${cfg.header} header — rejecting.`);
      return res.status(401).json({ success: false, message: 'Missing webhook signature' });
    }

    const raw = req.rawBody
      || (req.body && Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || ''), 'utf8'));
    const computed = cfg.prefix + crypto.createHmac(cfg.algo, secret).update(raw).digest('hex');

    // Constant-time compare to dodge timing attacks.
    const a = Buffer.from(received);
    const b = Buffer.from(computed);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      logger.warn(`[webhookSignature:${source}] HMAC mismatch — rejecting.`);
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
    return next();
  };
}

module.exports = { verifyWebhookSignature };
