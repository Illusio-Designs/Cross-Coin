jest.mock('../../model/paymentModel.js', () => ({ Payment: { findOne: jest.fn() } }));
jest.mock('../../model/orderModel.js', () => ({ Order: {} }));
jest.mock('../../model/userModel.js', () => ({ User: {} }));
jest.mock('../../model/guestUserModel.js', () => ({ GuestUser: {} }));
jest.mock('../../model/orderItemModel.js', () => ({ OrderItem: {} }));
jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../services/razorpayService.js', () => ({}));
jest.mock('../../services/settingsHelper.js', () => ({ getSetting: async () => 'fixture-secret' }));
jest.mock('../../services/paymentsAdminService.js', () => ({ findMissingRazorpayOrders: jest.fn() }));
jest.mock('../../services/stockReservationService.js', () => ({ getReservationByRazorpayOrder: jest.fn() }));
jest.mock('../../services/orderCreationService.js', () => ({}));
jest.mock('../../services/prepaidOrderRecovery.js', () => ({ handleCapture: jest.fn() }));
jest.mock('../../config/logging.js', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
jest.mock('../../integration/facebookPixel.js', () => ({}));
jest.mock('../../integration/googleAnalytics.js', () => ({}));

const crypto = require('node:crypto');
const { razorpayWebhook, adminMissingRazorpayOrders } = require('../../controller/paymentController.js');
const { sequelize } = require('../../config/db.js');
const { handleCapture } = require('../../services/prepaidOrderRecovery.js');
const { findMissingRazorpayOrders } = require('../../services/paymentsAdminService.js');

function fixture() {
  const payment = { id: 'pay_fixture123', order_id: 'order_fixture123', amount: 44910, currency: 'INR', status: 'captured' };
  const body = { event: 'payment.captured', payload: { payment: { entity: payment } } };
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = crypto.createHmac('sha256', 'fixture-secret').update(rawBody).digest('hex');
  const req = { body, rawBody, headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': 'evt_fixture' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { payment, req, res };
}

beforeEach(() => {
  jest.clearAllMocks();
  sequelize.query.mockResolvedValue([[]]);
});

test('a signed unmatched capture starts order creation before the webhook acknowledges it', async () => {
  const { payment, req, res } = fixture();
  await razorpayWebhook(req, res);
  expect(handleCapture).toHaveBeenCalledWith(payment);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(handleCapture.mock.invocationCallOrder[0]).toBeLessThan(res.status.mock.invocationCallOrder[0]);
});

test('a database failure leaves the Razorpay event retryable', async () => {
  const { req, res } = fixture();
  handleCapture.mockRejectedValueOnce(new Error('database unavailable'));
  await razorpayWebhook(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(sequelize.query.mock.calls.some(([sql]) => sql.includes('INSERT IGNORE INTO webhooks_log'))).toBe(false);
});

test('an invalid Razorpay signature cannot queue a payment', async () => {
  const { req, res } = fixture();
  req.headers['x-razorpay-signature'] = 'invalid';
  await razorpayWebhook(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(handleCapture).not.toHaveBeenCalled();
});

test('the day check uses IST midnight and ends on the selected day', async () => {
  const { res } = fixture();
  await adminMissingRazorpayOrders({ query: { date: '2025-02-01' } }, res);
  expect(findMissingRazorpayOrders).toHaveBeenCalledWith({ from: Date.parse('2025-01-31T18:30:00Z') / 1000,
    until: Date.parse('2025-02-01T18:29:59Z') / 1000 });
});

test('an impossible historical date is rejected before reaching Razorpay', async () => {
  const { res } = fixture();
  await adminMissingRazorpayOrders({ query: { date: '2025-02-30' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(findMissingRazorpayOrders).not.toHaveBeenCalled();
});
