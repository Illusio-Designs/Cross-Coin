jest.mock('../../model/brandModel.js', () => ({ findAll: jest.fn() }));
jest.mock('../../model/orderModel.js', () => ({ Order: { findAll: jest.fn() } }));
jest.mock('../../services/settingsHelper.js', () => ({ getSetting: jest.fn() }));
jest.mock('../../services/customCheckoutService.js', () => ({
  listCheckoutOrders: jest.fn(),
  isCodOrder: (order) => order.payment_method === 'COD',
  parseAttrs: (attrs) => attrs || {},
}));
jest.mock('../../controller/customCheckoutController.js', () => ({ verifyAndIngest: jest.fn(), fetchProviderOrder: jest.fn() }));
jest.mock('../../config/logging.js', () => ({ logger: { warn: jest.fn() } }));

const { Op } = require('sequelize');
const Brand = require('../../model/brandModel.js');
const { Order } = require('../../model/orderModel.js');
const settings = require('../../services/settingsHelper.js');
const shiprocket = require('../../services/customCheckoutService.js');
const { verifyAndIngest, fetchProviderOrder } = require('../../controller/customCheckoutController.js');
const { reconcileShiprocketOrders, findShiprocketOrderForPayment } = require('../../services/shiprocketOrderReconciliation.js');

beforeEach(() => {
  jest.resetAllMocks();
  Brand.findAll.mockResolvedValue([{ id: 1, slug: 'morbix' }, { id: 2, slug: 'other' }]);
  settings.getSetting.mockImplementation(async (brandId) => brandId === 1 ? 'true' : 'false');
  Order.findAll.mockResolvedValue([]);
  verifyAndIngest.mockResolvedValue({ created: true });
});

test('recovers a missing current order once and ignores saved, COD, failed and older orders', async () => {
  shiprocket.listCheckoutOrders.mockResolvedValue({ result: { orders: [
    { platform_order_id: 'saved', payment_status: 'success' },
    { platform_order_id: 'missing', payment_status: 'success' },
    { platform_order_id: 'missing', payment_status: 'success' },
    { platform_order_id: 'cod', payment_status: 'success', payment_method: 'COD' },
    { platform_order_id: 'failed', payment_status: 'failed' },
    { platform_order_id: 'old', payment_status: 'success', created_at: '2000-01-01T00:00:00Z' },
  ] } });
  Order.findAll.mockResolvedValue([{ idempotency_key: 'cco:saved' }]);

  await expect(reconcileShiprocketOrders()).resolves.toMatchObject({ status: 'ok', summary: expect.stringContaining('1 recovered') });
  expect(shiprocket.listCheckoutOrders).toHaveBeenCalledTimes(1);
  expect(Order.findAll).toHaveBeenCalledWith(expect.objectContaining({
    where: { idempotency_key: { [Op.in]: ['cco:saved', 'cco:missing'] } },
  }));
  expect(verifyAndIngest).toHaveBeenCalledTimes(1);
  expect(verifyAndIngest).toHaveBeenCalledWith(1, 'missing', null, { prepaidOnly: true, since: expect.any(Number) });

  Order.findAll.mockResolvedValue([{ idempotency_key: 'cco:saved' }, { idempotency_key: 'cco:missing' }]);
  await reconcileShiprocketOrders();
  expect(verifyAndIngest).toHaveBeenCalledTimes(1);
});

test('reports an import failure and still recovers the other orders', async () => {
  shiprocket.listCheckoutOrders.mockResolvedValue({ data: [
    { platform_order_id: 'incomplete' },
    { platform_order_id: 'confirmed' },
  ] });
  verifyAndIngest.mockRejectedValueOnce(new Error('Provider order has no items'));

  await expect(reconcileShiprocketOrders()).resolves.toMatchObject({
    status: 'partial',
    summary: expect.stringContaining('1 recovered'),
    error: 'morbix order incomplete: Provider order has no items',
  });
});

test('finds the exact Razorpay order reference in another store and verifies its checkout', async () => {
  settings.getSetting.mockResolvedValue('true');
  const payment = { id: 'pay_fixture123', order_id: 'order_fixture123', amount: 44910 };
  const detail = { platform_order_id: 'provider-1', payment_status: 'success', total_amount_payable: 449.1,
    payments: [{ gateway_order_id: payment.order_id }] };
  shiprocket.listCheckoutOrders.mockImplementation(async (brandId) => ({ orders: brandId === 2 ? [detail] : [] }));
  fetchProviderOrder.mockResolvedValue(detail);

  await expect(findShiprocketOrderForPayment(payment)).resolves.toMatchObject({ brandId: 2, id: 'provider-1' });
  expect(fetchProviderOrder).toHaveBeenCalledWith(2, 'provider-1');
});

test('requires the captured payment reference even when the checkout amount matches', async () => {
  const payment = { id: 'pay_fixture123', order_id: 'order_fixture123', amount: 44910 };
  const summary = { platform_order_id: 'provider-1', payment_status: 'success', total_amount_payable: 449.1 };
  shiprocket.listCheckoutOrders.mockResolvedValue({ orders: [summary] });
  fetchProviderOrder.mockResolvedValue({ ...summary, payments: [{ gateway_order_id: 'order_different' }] });

  await expect(findShiprocketOrderForPayment(payment)).rejects.toThrow('No verified Shiprocket checkout');
});
