/**
 * Smoke tests for the fail-closed admin token gate used by /api/metrics
 * (and the pattern behind /api/cron/run). Getting this wrong either exposes
 * infra/queue data publicly or locks out legitimate monitoring.
 */

const { checkToken } = require('../../middleware/adminAuth.js');

describe('checkToken', () => {
  test('matching token → ok', () => {
    expect(checkToken({ presented: 'abc', expected: 'abc', isProduction: true }).ok).toBe(true);
  });

  test('wrong token → 401', () => {
    const r = checkToken({ presented: 'nope', expected: 'abc', isProduction: true });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
  });

  test('missing presented token → 401 (when a token is configured)', () => {
    const r = checkToken({ presented: '', expected: 'abc', isProduction: true });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
  });

  test('FAIL CLOSED: no token configured in production → 503 (never public)', () => {
    const r = checkToken({ presented: '', expected: undefined, isProduction: true });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
  });

  test('no token configured in dev → open (convenience)', () => {
    expect(checkToken({ presented: '', expected: undefined, isProduction: false }).ok).toBe(true);
  });
});
