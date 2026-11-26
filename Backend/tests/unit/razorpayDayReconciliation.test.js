jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../config/logging.js', () => ({ logger: { warn: jest.fn() } }));
jest.mock('../../utils/encryption.js', () => ({}));
jest.mock('../../services/razorpayService.js', () => ({ getInstance: jest.fn() }));
jest.mock('../../services/razorpayOrderMatching.js', () => ({ findRazorpayOrderMatches: jest.fn() }));
jest.mock('../../services/prepaidRecoveryStore.js', () => ({
  readRecoveries: jest.fn(async () => new Map()),
  isCapture: (payment) => payment.amount_refunded === 0,
  queueCaptures: jest.fn(),
}));

const { findMissingRazorpayOrders } = require('../../services/paymentsAdminService.js');
const { getInstance } = require('../../services/razorpayService.js');
const { findRazorpayOrderMatches } = require('../../services/razorpayOrderMatching.js');
const { readRecoveries, queueCaptures } = require('../../services/prepaidRecoveryStore.js');

test('counts unique captures on the selected day and separates verified matches from existing conflicts', async () => {
  const from = 1738341000;
  const until = from + 86399;
  const captured = (id, overrides) => ({
    id, created_at: from, status: 'captured', amount: 44910, currency: 'INR', method: 'upi', amount_refunded: 0, ...overrides,
  });
  const already = captured('pay_existing');
  const missing = captured('pay_missing1');
  const conflictedExisting = captured('pay_conflict');
  const missingOnPageTwo = captured('pay_missing2', { created_at: until, method: 'card' });
  const refunded = captured('pay_refunded', { amount_refunded: 200 });
  const updatedAt = new Date(from * 1000);
  const retryAt = new Date((from + 120) * 1000);
  readRecoveries.mockResolvedValue(new Map([[missing.id, {
    historical: false, state: 'pending', reason: 'Waiting for Shiprocket',
    updated_at: updatedAt, next_at: retryAt, checkout_ref: 'checkout-example', brand_id: 8,
  }]]));
  const list = jest.fn().mockResolvedValueOnce({ items: [
    already, missing, conflictedExisting, refunded, ...Array.from({ length: 96 }, (_, index) =>
      captured(`pay_failed${index}`, { status: 'failed' })),
  ] }).mockResolvedValueOnce({ items: [
    already, missingOnPageTwo, captured('pay_outside1', { created_at: until + 1 }),
  ] });
  getInstance.mockResolvedValue({ payments: { all: list } });
  findRazorpayOrderMatches.mockImplementation(async (payments) => new Map(payments.map(({ id }) => [
    id, id === already.id ? { linked: { order_number: 'CC-1' } }
      : id === conflictedExisting.id ? { hasExistingOrder: true, issue: 'Different linked payment' } : {},
  ])));

  const result = await findMissingRazorpayOrders({ from, until });

  expect(list.mock.calls).toEqual([[{ from, to: until, count: 100, skip: 0 }], [{ from, to: until, count: 100, skip: 100 }]]);
  expect(result.totals).toEqual({ captured: 5, matched: 1, missing: 3, conflicts: 1 });
  expect(result.items.map(({ paymentId, kind, canVerify, method }) => [paymentId, kind, canVerify, method])).toEqual([
    [missing.id, 'missing', true, 'upi'], [conflictedExisting.id, 'conflict', false, 'upi'],
    [refunded.id, 'missing', false, 'upi'], [missingOnPageTwo.id, 'missing', true, 'card'],
  ]);
  expect(readRecoveries).toHaveBeenCalledWith([missing.id, conflictedExisting.id, refunded.id, missingOnPageTwo.id]);
  expect(result.items.find(({ paymentId }) => paymentId === missing.id)).toMatchObject({
    checkoutRef: 'checkout-example', checkoutBrandId: 8,
    recovery: { state: 'pending', reason: 'Waiting for Shiprocket', updatedAt, nextAttemptAt: retryAt },
  });
  expect(queueCaptures).not.toHaveBeenCalled();
});
