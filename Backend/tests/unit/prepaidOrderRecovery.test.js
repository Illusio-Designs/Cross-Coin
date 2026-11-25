jest.mock('../../services/prepaidRecoveryStore.js', () => ({
  ensureSchema: jest.fn(), query: jest.fn(), rows: jest.fn(), queueCaptures: jest.fn(), readCheckouts: jest.fn(),
  validCheckoutRef: (ref) => typeof ref === 'string' && /^[a-zA-Z0-9_-]+$/.test(ref),
  isCapture: (payment) => payment?.status === 'captured' && !payment.amount_refunded,
}));
jest.mock('../../services/razorpayService.js', () => ({ getPayment: jest.fn(), getOrder: jest.fn() }));
jest.mock('../../services/razorpayOrderMatching.js', () => ({ findRazorpayOrderMatches: jest.fn() }));
jest.mock('../../services/stockReservationService.js', () => ({ getReservationByRazorpayOrder: jest.fn() }));
jest.mock('../../controller/customCheckoutController.js', () => ({ fetchProviderOrder: jest.fn(), ingestVerifiedOrder: jest.fn() }));
jest.mock('../../services/customCheckoutService.js', () => ({ parseAttrs: () => ({}), isCodOrder: () => false, verifyRecoveryPrices: jest.fn() }));
jest.mock('../../services/errorReporter.js', () => ({ notify: jest.fn() }));
jest.mock('../../config/db.js', () => ({ sequelize: { transaction: async (fn) => fn({ fixture: true }) } }));
jest.mock('../../model/orderModel.js', () => ({ Order: { findOne: jest.fn() } }));
jest.mock('../../config/logging.js', () => ({ logger: { warn: jest.fn() } }));
jest.mock('../../services/paymentsAdminService.js', () => ({ scanRazorpayCaptures: jest.fn() }));

const store = require('../../services/prepaidRecoveryStore.js');
const razorpay = require('../../services/razorpayService.js');
const { findRazorpayOrderMatches } = require('../../services/razorpayOrderMatching.js');
const { fetchProviderOrder, ingestVerifiedOrder } = require('../../controller/customCheckoutController.js');
const { notify } = require('../../services/errorReporter.js');
const { Order } = require('../../model/orderModel.js');
const recovery = require('../../services/prepaidOrderRecovery.js');

const payment = { id: 'pay_fixture123', order_id: 'order_fixture123', status: 'captured', currency: 'INR', amount: 44910 };
const details = {
  platform_order_id: 'fixture-checkout', payment_status: 'success', total_amount_payable: 449.1,
  payments: [{ pg_order_id: payment.order_id }],
  shipping_address: { first_name: 'Test', phone: '9876543210', line1: 'Test street', city: 'City', state: 'State', pincode: '400001' },
  cart_data: { items: [{ variant_id: 42, quantity: 1, price: 449.1 }] },
};

let current;
beforeEach(() => {
  jest.resetAllMocks();
  current = { payment_id: payment.id, gateway_order_id: payment.order_id, amount_paise: 44910, state: 'pending', attempts: 0 };
  razorpay.getPayment.mockResolvedValue(payment);
  razorpay.getOrder.mockResolvedValue({ id: payment.order_id });
  findRazorpayOrderMatches.mockResolvedValue(new Map([[payment.id, {}]]));
  store.readCheckouts.mockResolvedValue([{ brand_id: 8, checkout_ref: details.platform_order_id }]);
  fetchProviderOrder.mockResolvedValue(details);
  ingestVerifiedOrder.mockResolvedValue({ created: true, order_number: 'VQ-42' });
  Order.findOne.mockResolvedValue({ id: 42, order_number: 'VQ-42' });
  store.query.mockImplementation(async (sql, replacements) => {
    if (sql.includes('UPDATE prepaid_recovery SET lease =')) current.lease = replacements.lease;
    if (sql.includes('UPDATE prepaid_recovery SET state =')) {
      current.state = replacements.state;
      current.attempts = replacements.attempt;
    }
  });
  store.rows.mockImplementation(async (sql) => {
    if (sql.includes('FROM prepaid_recovery WHERE')) return [{ ...current }];
    return [];
  });
});

test('an early capture remains retryable and imports once verified checkout data becomes available', async () => {
  fetchProviderOrder.mockResolvedValueOnce({ ...details, payment_status: 'pending' });
  await expect(recovery.manual(payment.id)).resolves.toMatchObject({ state: 'pending' });
  expect(ingestVerifiedOrder).not.toHaveBeenCalled();
  await expect(recovery.manual(payment.id)).resolves.toMatchObject({ state: 'recovered', order: { id: 42 } });
  expect(ingestVerifiedOrder).toHaveBeenCalledWith(8, details.platform_order_id, details, payment, { prepaidOnly: true, recovery: true });
  expect(store.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO prepaid_recovery_attempts'),
    expect.objectContaining({ state: 'recovered', orderId: 42, checkoutRef: details.platform_order_id }), expect.anything());
});

test('exhausted checkout retries leave a review record and alert the administrator', async () => {
  current.attempts = 6;
  store.readCheckouts.mockResolvedValue([]);
  await expect(recovery.manual(payment.id)).resolves.toMatchObject({ state: 'needs_manual_review' });
  expect(ingestVerifiedOrder).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith('Prepaid order needs review', expect.arrayContaining([payment.id]),
    { dedupeKey: `prepaid-recovery:${payment.id}` });
});

test('verification rejects missing customer data before creating an order', async () => {
  fetchProviderOrder.mockResolvedValue({ ...details, shipping_address: {} });
  await expect(recovery.manual(payment.id, { verifyOnly: true })).rejects.toThrow('original customer name');
  expect(ingestVerifiedOrder).not.toHaveBeenCalled();
});

test('an on-demand checkout check returns the verified summary without queuing or creating an order', async () => {
  await expect(recovery.manual(payment.id, { verifyOnly: true })).resolves.toMatchObject({
    checkoutRef: details.platform_order_id, brandId: 8, orderBrandId: 8, itemCount: 1,
  });
  expect(store.queueCaptures).not.toHaveBeenCalled();
  expect(ingestVerifiedOrder).not.toHaveBeenCalled();
});

test('a payment already linked to an order returns the order without importing again', async () => {
  findRazorpayOrderMatches.mockResolvedValue(new Map([[payment.id, { linked: { linked_order_id: 42, order_number: 'VQ-42' } }]]));
  await expect(recovery.manual(payment.id)).resolves.toMatchObject({ state: 'matched', order: { id: 42 } });
  expect(ingestVerifiedOrder).not.toHaveBeenCalled();
});

test('a worker without the database schedule lease cannot process another order', async () => {
  await expect(recovery.run()).resolves.toMatchObject({ status: 'skipped' });
  expect(ingestVerifiedOrder).not.toHaveBeenCalled();
});

test('the worker ignores a previously scheduled backfill and only claims current records', async () => {
  const { scanRazorpayCaptures } = require('../../services/paymentsAdminService.js');
  store.rows.mockImplementation(async (sql) => sql.includes('FROM prepaid_recovery_schedule')
    ? [{ scan_period: 30, recent_due: 0 }] : []);
  await expect(recovery.run()).resolves.toMatchObject({ status: 'ok' });
  expect(store.query).toHaveBeenCalledWith(expect.stringContaining("WHERE historical = FALSE AND state = 'pending'"), expect.anything());
  expect(scanRazorpayCaptures).not.toHaveBeenCalled();
  expect(ingestVerifiedOrder).not.toHaveBeenCalled();
});
