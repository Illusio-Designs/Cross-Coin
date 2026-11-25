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

test('reads the full selected day, counts unique captures and omits all payments with existing orders', async () => {
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
  expect(result.totals).toEqual({ captured: 5, matched: 2, missing: 3 });
  expect(result.items.map(({ paymentId, canVerify, method }) => [paymentId, canVerify, method])).toEqual([
    [missing.id, true, 'upi'], [refunded.id, false, 'upi'], [missingOnPageTwo.id, true, 'card'],
  ]);
  expect(readRecoveries).toHaveBeenCalledWith([missing.id, refunded.id, missingOnPageTwo.id]);
  expect(queueCaptures).not.toHaveBeenCalled();
});
