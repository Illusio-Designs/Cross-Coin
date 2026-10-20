const crypto = require('crypto');

// Shared secret between the storefront edge counter and POST /api/i/v.
// When VISIT_INGEST_KEY is set on the backend, a request must carry the same
// value in X-Visit-Key. When it is unset every request is accepted (same as
// the browser counter /api/i/pv). Compared in constant time via fixed-length
// digests, so neither the value nor its length leaks through timing.
function visitKeyOk(req) {
  const expected = process.env.VISIT_INGEST_KEY;
  if (!expected) return true;
  const given = req && req.headers ? req.headers['x-visit-key'] : '';
  if (!given || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(expected).digest();
  const b = crypto.createHash('sha256').update(given).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { visitKeyOk };
