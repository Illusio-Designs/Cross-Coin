/**
 * Shared-secret gate for internal/admin endpoints (metrics, cron trigger, …).
 *
 * Fails CLOSED in production when the token env var isn't set — so an infra
 * endpoint can never be accidentally exposed publicly just because someone
 * forgot to configure the secret. In non-production it stays open for
 * convenience.
 *
 * Pure + synchronous so it's trivially unit-testable.
 *
 * @returns {{ok: boolean, status?: number, message?: string}}
 */
function checkToken({ presented, expected, isProduction }) {
  if (expected) {
    return presented && presented === expected
      ? { ok: true }
      : { ok: false, status: 401, message: 'Unauthorized' };
  }
  // No token configured.
  if (isProduction) {
    return { ok: false, status: 503, message: 'Endpoint locked: set the required access token env var' };
  }
  return { ok: true };
}

module.exports = { checkToken };
