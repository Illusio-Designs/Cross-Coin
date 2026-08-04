/**
 * Smoke tests for role-based access control. Multi-role support (a user with a
 * primary `role` plus a `roles[]` array) is security-critical — a bug here
 * either locks out staff or grants access it shouldn't. These lock in the
 * effectiveRoles / hasAnyRole logic and the guard middlewares.
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const auth = require('../../middleware/authMiddleware.js');

describe('effectiveRoles', () => {
  test('empty for no user', () => {
    expect(auth.effectiveRoles(null)).toEqual([]);
    expect(auth.effectiveRoles(undefined)).toEqual([]);
  });
  test('single primary role', () => {
    expect(auth.effectiveRoles({ role: 'admin' })).toEqual(['admin']);
  });
  test('unions primary role + roles[] and de-dupes', () => {
    const roles = auth.effectiveRoles({ role: 'order_manager', roles: ['product_manager', 'order_manager'] });
    expect(roles.sort()).toEqual(['order_manager', 'product_manager']);
  });
  test('ignores a non-array roles field', () => {
    expect(auth.effectiveRoles({ role: 'admin', roles: 'oops' })).toEqual(['admin']);
  });
});

describe('hasAnyRole', () => {
  test('true when any effective role is allowed', () => {
    expect(auth.hasAnyRole({ role: 'consumer', roles: ['order_manager'] }, ['order_manager'])).toBe(true);
  });
  test('false when none match', () => {
    expect(auth.hasAnyRole({ role: 'consumer' }, ['admin', 'order_manager'])).toBe(false);
  });
  test('false for no user', () => {
    expect(auth.hasAnyRole(null, ['admin'])).toBe(false);
  });
});

/* Guard middlewares — fake req/res/next. */
function run(mw, user) {
  const req = { user };
  let statusCode = 200; let body = null;
  const res = { status(c) { statusCode = c; return this; }, json(b) { body = b; return this; } };
  const next = jest.fn();
  mw(req, res, next);
  return { passed: next.mock.calls.length === 1, statusCode, body };
}

describe('guard middlewares', () => {
  test('isAdmin: admin passes, order_manager blocked', () => {
    expect(run(auth.isAdmin, { role: 'admin' }).passed).toBe(true);
    const blocked = run(auth.isAdmin, { role: 'order_manager' });
    expect(blocked.passed).toBe(false);
    expect(blocked.statusCode).toBe(403);
  });

  test('isOrderManager: order_manager via roles[] passes; product_manager blocked', () => {
    expect(run(auth.isOrderManager, { role: 'consumer', roles: ['order_manager'] }).passed).toBe(true);
    expect(run(auth.isOrderManager, { role: 'product_manager' }).passed).toBe(false);
  });

  test('isStaff: any staff role passes, consumer blocked', () => {
    expect(run(auth.isStaff, { role: 'product_manager' }).passed).toBe(true);
    expect(run(auth.isStaff, { role: 'consumer' }).passed).toBe(false);
  });

  test('admin passes every guard (superset)', () => {
    for (const g of [auth.isAdmin, auth.isStaff, auth.isProductManager, auth.isOrderManager, auth.isWhatsappManager]) {
      expect(run(g, { role: 'admin' }).passed).toBe(true);
    }
  });

  test('missing user is rejected (401/403), never passed through', () => {
    const r = run(auth.isAdmin, undefined);
    expect(r.passed).toBe(false);
    expect([401, 403]).toContain(r.statusCode);
  });
});
