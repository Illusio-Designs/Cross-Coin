const { verifyShiprocketRecovery } = require('../../utils/shiprocketPaymentRecovery.js');
const shiprocketOnly = require('../../middleware/shiprocketCheckoutOnly.js');

const capture = { id: 'pay_fixture123', order_id: 'order_fixture123', amount: 44910 };
const order = (payment) => ({
  platform_order_id: 'platform-1', payment_status: 'success', payment_type: 'PREPAID',
  total_amount_payable: '449.10', payments: [payment],
});

test('accepts the captured Razorpay ID on a verified Shiprocket order', () => {
  expect(() => verifyShiprocketRecovery(order({ txn_id: 'provider-ref', pg_transaction_id: capture.id }), 'platform-1', capture)).not.toThrow();
});

test.each(['pg_order_id', 'gateway_order_id', 'txn_id'])(
  'accepts a matching Razorpay order ID in %s when no payment ID was saved',
  (field) => {
    expect(() => verifyShiprocketRecovery(order({ [field]: capture.order_id }), 'platform-1', capture)).not.toThrow();
  },
);

test('rejects a different captured payment ID even if the Razorpay order ID matches', () => {
  const other = order({ pg_transaction_id: 'pay_different', pg_order_id: capture.order_id });
  expect(() => verifyShiprocketRecovery(other, 'platform-1', capture)).toThrow('does not match');
});

test('rejects conflicting Razorpay order IDs even when the payment ID matches', () => {
  const other = order({ razorpay_payment_id: capture.id, pg_order_id: capture.order_id, gateway_order_id: 'order_different' });
  expect(() => verifyShiprocketRecovery(other, 'platform-1', capture)).toThrow('does not match');
});

test('rejects a different amount or Shiprocket order', () => {
  const correct = order({ pg_transaction_id: capture.id });
  expect(() => verifyShiprocketRecovery(correct, 'platform-2', capture)).toThrow('different order');
  expect(() => verifyShiprocketRecovery({ ...correct, total_amount_payable: 449.11 }, 'platform-1', capture)).toThrow('amount');
});

test('uses Razorpay capture as payment proof for an open Shiprocket checkout', () => {
  const pending = { ...order({ pg_transaction_id: capture.id }), status: 'PENDING', payment_status: 'pending' };
  expect(() => verifyShiprocketRecovery(pending, 'platform-1', capture)).not.toThrow();
  expect(() => verifyShiprocketRecovery({ ...pending, status: 'CANCELLED' }, 'platform-1', capture)).toThrow('checkout is closed');
});

test('rejects COD and ambiguous multiple payment attempts', () => {
  expect(() => verifyShiprocketRecovery(order({ pg_transaction_id: capture.id, payment_method: 'COD' }), 'platform-1', capture)).toThrow('does not match');
  const ambiguous = order({ pg_transaction_id: capture.id, status: 'captured' });
  ambiguous.payments.push({ pg_transaction_id: 'pay_another', status: 'captured' });
  expect(() => verifyShiprocketRecovery(ambiguous, 'platform-1', capture)).toThrow('does not match');
});

test.each(['crosscoin', 'morbix', 'soxbae', 'velmique', undefined])('blocks native checkout for %s', (slug) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  shiprocketOnly({ brand: slug ? { slug } : null }, res, next);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(next).not.toHaveBeenCalled();
});

test.each(['gripzus', 'knitwink', 'velquira'])('preserves checkout for unconfigured brand %s', (slug) => {
  const next = jest.fn();
  shiprocketOnly({ brand: { slug } }, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
});
