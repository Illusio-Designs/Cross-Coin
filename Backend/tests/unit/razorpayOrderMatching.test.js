jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
const { sequelize } = require('../../config/db.js');
const { findRazorpayOrderMatches } = require('../../services/razorpayOrderMatching.js');

const captured = { id: 'pay_fixture123', order_id: 'order_fixture123' };
const linked = (overrides) => ({
  id: 1, order_id: 10, linked_order_id: 10, order_brand_id: 8, brand_id: 8,
  amount_paid: 49900, status: 'successful', ...overrides,
});

beforeEach(() => jest.resetAllMocks());

test('uses the exact payment ID when the gateway order ID also matches another brand', async () => {
  sequelize.query.mockResolvedValueOnce([
    linked({ transaction_id: captured.id }),
    linked({ id: 2, order_id: 20, linked_order_id: 20, brand_id: 7, order_brand_id: 7, razorpay_order_id: captured.order_id }),
  ]);
  const match = (await findRazorpayOrderMatches([captured])).get(captured.id);
  expect(match).toMatchObject({ linked: { order_id: 10 }, brandId: 8, issue: null });
  expect(sequelize.query.mock.calls[0][1].replacements).toEqual({ paymentIds: [captured.id], orderRefs: [captured.order_id] });
});

test('finds an existing order when the Razorpay order ID was saved in the transaction field', async () => {
  sequelize.query.mockResolvedValueOnce([linked({ transaction_id: captured.order_id })]);
  const match = (await findRazorpayOrderMatches([captured])).get(captured.id);
  expect(match).toMatchObject({ linked: { order_id: 10 }, brandId: 8, issue: null });
});

test('flags a different payment ID on the same order even if an older row has no payment ID', async () => {
  sequelize.query.mockResolvedValueOnce([
    linked({ transaction_id: null, razorpay_order_id: captured.order_id }),
    linked({ id: 2, transaction_id: 'pay_other123', razorpay_order_id: captured.order_id }),
  ]);
  const match = (await findRazorpayOrderMatches([captured])).get(captured.id);
  expect(match.linked.transaction_id).toBe('pay_other123');
  expect(match.issue).toMatch(/different payment ID/);
});

test('finds an order from a checkout retry through its saved reservation', async () => {
  sequelize.query.mockResolvedValueOnce([
    { id: 2, brand_id: 8, razorpay_order_id: captured.order_id, reservation_id: 'reservation-fixture' },
  ]).mockResolvedValueOnce([
    linked({ reservation_id: 'reservation-fixture', razorpay_order_id: 'order_retry', transaction_id: 'pay_retry123' }),
  ]);
  const match = (await findRazorpayOrderMatches([captured])).get(captured.id);
  expect(match.linked.order_id).toBe(10);
  expect(match.issue).toMatch(/different payment ID/);
});

test('treats a mismatched order brand as a conflict and a gateway-only payment as unknown', async () => {
  const gatewayOnly = { id: 'pay_unassigned' };
  sequelize.query.mockResolvedValueOnce([linked({ transaction_id: captured.id, order_brand_id: 4 })]);
  const matches = await findRazorpayOrderMatches([captured, gatewayOnly]);
  expect(matches.get(captured.id)).toMatchObject({ linked: null, issue: expect.stringMatching(/conflicting/) });
  expect(matches.get(gatewayOnly.id)).toMatchObject({ hasLocalPayment: false, brandId: null, issue: null });
});

test('an exact gateway ID matches Shiprocket even when its provider transaction ID differs', async () => {
  sequelize.query.mockResolvedValueOnce([linked({
    transaction_id: 'shiprocket-fixture-1', razorpay_payment_id: captured.id, payment_gateway: 'CustomCheckout',
  })]);
  const match = (await findRazorpayOrderMatches([{ ...captured, status: 'captured', currency: 'INR', amount: 49900 }])).get(captured.id);
  expect(match).toMatchObject({ linked: { order_id: 10 }, savedPaymentId: captured.id, issue: null });
  expect(sequelize.query.mock.calls[0][0]).toContain('p.razorpay_payment_id IN (:paymentIds)');
});

test('matching payment IDs with different amounts remain in review', async () => {
  sequelize.query.mockResolvedValueOnce([linked({ transaction_id: captured.id })]);
  const match = (await findRazorpayOrderMatches([{ ...captured, status: 'captured', currency: 'INR', amount: 49910 }])).get(captured.id);
  expect(match.linked.order_id).toBe(10);
  expect(match.issue).toMatch(/amount differs/);
});
