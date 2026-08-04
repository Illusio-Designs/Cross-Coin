/**
 * Lightweight CSRF protection (double-submit cookie pattern).
 *
 * Why this is opt-in: this codebase authenticates dashboard requests
 * with a JWT in the `Authorization: Bearer` header, which the browser
 * does NOT auto-send cross-origin. That makes the classic CSRF
 * threat model (cookie-only auth → forged form post) inapplicable
 * for the JWT routes. For session-cookie routes (admin login, etc.)
 * this middleware adds defence-in-depth.
 *
 * How it works:
 *   1. /api/csrf/token issues a random token, sets it as a NON-HttpOnly
 *      cookie (so JS can read it), and returns it in the JSON body.
 *   2. Frontend reads the cookie and sends it back in the X-CSRF-Token
 *      header on every state-changing request.
 *   3. requireCsrf compares header vs cookie — both must match.
 *
 * Toggle with env `CSRF_REQUIRED=true` to start enforcing. The token
 * endpoint is always live so frontends can prepare for the switch.
 */

const crypto = require('crypto');
const { logger } = require('../config/logging.js');

const COOKIE_NAME = 'cc_csrf';
const HEADER_NAME = 'x-csrf-token';
const TOKEN_TTL_SEC = 12 * 3600; // 12 hours

function issueToken(req, res, next) {
  let token = req.cookies?.[COOKIE_NAME];
  if (!token || token.length < 32) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,           // Frontend reads it to mirror into header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_TTL_SEC * 1000,
      path: '/',
    });
  }
  req._csrfToken = token;
  if (next) next();
  return token;
}

function csrfTokenHandler(req, res) {
  const token = issueToken(req, res);
  res.json({ success: true, data: { csrfToken: token, headerName: HEADER_NAME.toUpperCase() } });
}

function requireCsrf(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (process.env.CSRF_REQUIRED !== 'true') return next();

  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = (req.headers[HEADER_NAME] || '').toString();

  if (!cookieToken || !headerToken) {
    logger.warn(`[csrf] missing token on ${req.method} ${req.path}`);
    return res.status(403).json({ success: false, message: 'CSRF token required' });
  }
  if (cookieToken.length !== headerToken.length
      || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    logger.warn(`[csrf] token mismatch on ${req.method} ${req.path}`);
    return res.status(403).json({ success: false, message: 'CSRF token invalid' });
  }
  next();
}

module.exports = { issueToken, csrfTokenHandler, requireCsrf };
