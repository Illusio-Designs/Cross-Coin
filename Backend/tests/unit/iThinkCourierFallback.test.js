jest.mock('../../services/settingsHelper.js', () => ({
  getSetting: jest.fn(async (_brand, key, fallback) => ({
    ITHINK_WAREHOUSE_PINCODE: '363641',
    COURIER_EXCLUDE: 'dtdc',
  }[key] ?? fallback)),
}));
jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../services/integrationQueue.js', () => ({ registerProcessor: jest.fn() }));
jest.mock('../../services/jobRunService.js', () => ({ acquireLock: jest.fn(async () => ({})), releaseLock: jest.fn() }));
jest.mock('../../services/pickupScheduleService.js', () => ({ shouldHoldForPickup: jest.fn(async () => null) }));

const shipping = require('../../controller/orderShippingController.js');
const { IThinkService } = require('../../services/iThinkService.js');
const order = {
  id: 101,
  order_number: 'ORDER-TEST',
  payment_type: 'cod',
  final_amount: 499,
  OrderItems: [{ quantity: 1 }],
  ShippingAddress: { pincode: '422010' },
};
const rejected = { success: false, courierRejected: true, error: 'Route rejected by carrier' };
const matrix = {
  data: {
    422010: {
      Xpressbees: { mode: 'Surface', pickup: 'Y', cod: 'N', prepaid: 'N' },
      Delhivery: {
        Surface: { cod: 'Y', prepaid: 'Y', pickup: 'N' },
        Air: { cod: 'Y', prepaid: 'Y' },
      },
      BlueDart: { mode: 'Surface', cod: 'N', prepaid: 'Y' },
      DTDC: { mode: 'Surface', cod: 'Y', prepaid: 'Y' },
    },
  },
};

function providerWith(rates = [], reply = matrix) {
  return {
    getAvailableCouriers: jest.fn().mockResolvedValue(rates),
    checkServiceability: jest.fn().mockResolvedValue(reply),
  };
}

afterEach(() => jest.restoreAllMocks());

test('keeps the manual selection when iThink books it and reports the assigned courier', async () => {
  const provider = providerWith();
  const book = jest.spyOn(shipping, 'enhancedSyncSingleOrder').mockResolvedValue({
    success: true, courier: 'iThink assigned courier', waybill: 'AWB1',
  });
  await expect(shipping.autoSelectCourierWithFallback(order, provider, null, {
    logistics: 'Xpressbees', s_type: 'Surface',
  })).resolves.toMatchObject({ success: true, courier: 'iThink assigned courier' });
  expect(book).toHaveBeenCalledWith(order, null, provider, 'ithink', 'xpressbees', 'surface');
  expect(provider.getAvailableCouriers).not.toHaveBeenCalled();
});

test('checks both pincodes and books a matrix courier when the selected courier is rejected', async () => {
  const provider = providerWith([{ logistics: 'Xpressbees', service_type: 'Surface', cod: 'Y', rate: 81 }]);
  const book = jest.spyOn(shipping, 'enhancedSyncSingleOrder')
    .mockResolvedValueOnce(rejected)
    .mockResolvedValueOnce(rejected)
    .mockResolvedValueOnce({ success: true, courier: 'Delhivery Air', waybill: 'AWB2' });
  const result = await shipping.autoSelectCourierWithFallback(order, provider, null, {
    logistics: 'Xpressbees', s_type: 'Surface',
  });
  expect(provider.getAvailableCouriers).toHaveBeenCalledWith(expect.objectContaining({
    sourcePincode: '363641', destinationPincode: '422010', paymentMode: 'COD',
  }));
  expect(provider.checkServiceability).toHaveBeenCalledWith('363641', '422010');
  expect(book.mock.calls.map((call) => call.slice(-2))).toEqual([
    ['xpressbees', 'surface'], ['delhivery', 'surface'], ['delhivery', 'air'],
  ]);
  expect(result).toMatchObject({ success: true, courier: 'Delhivery Air', result: { waybill: 'AWB2' } });
});

test('checks the matrix when the rate endpoint lists carriers that cannot carry this payment mode', async () => {
  const provider = providerWith([{ logistics: 'BlueDart', service_type: 'Surface', cod: 'N', prepaid: 'Y', rate: 81 }]);
  const book = jest.spyOn(shipping, 'enhancedSyncSingleOrder').mockResolvedValue({ success: true, waybill: 'AWB3' });
  await expect(shipping.autoSelectCourierWithFallback(order, provider)).resolves.toMatchObject({ success: true });
  expect(book).toHaveBeenCalledTimes(1);
  expect(book).toHaveBeenCalledWith(order, null, provider, 'ithink', 'delhivery', 'surface');
});

test('stops on an uncertain booking rather than asking another courier to create a second shipment', async () => {
  const provider = providerWith();
  const result = { success: false, requiresReview: true, error: 'AWB unconfirmed' };
  const book = jest.spyOn(shipping, 'enhancedSyncSingleOrder').mockResolvedValue(result);
  await expect(shipping.autoSelectCourierWithFallback(order, provider, null, { logistics: 'Xpressbees' })).resolves.toEqual(result);
  expect(book).toHaveBeenCalledTimes(1);
  expect(provider.getAvailableCouriers).not.toHaveBeenCalled();
  expect(provider.checkServiceability).not.toHaveBeenCalled();
});

test('an unavailable matrix is retryable and names both ends of the route', async () => {
  await expect(shipping.autoSelectCourierWithFallback(order, providerWith([], { message: 'Temporarily unavailable' })))
    .resolves.toMatchObject({ success: false, permanent: false, error: expect.stringContaining('pickup 363641 → delivery 422010 (COD)') });
});

test('a booking rejection containing the pickup pincode labels the destination correctly', async () => {
  const provider = new IThinkService();
  jest.spyOn(provider, 'initialize').mockResolvedValue(undefined);
  jest.spyOn(provider, 'validateOrderData').mockImplementation(() => {});
  jest.spyOn(provider, 'formatOrderDataForIThink').mockReturnValue({ data: { shipments: [{ pin: '422010' }] } });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  provider.axiosInstance = { post: jest.fn().mockResolvedValue({
    status: 200,
    data: { status: 'error', data: { 1: { status: 'error', remark: 'Pincode 363641 not serviceable' } } },
  }) };
  await expect(provider.createForwardOrder({ orderId: 'ORDER-TEST', logistics: 'xpressbees', customer_PinCode: '422010' }))
    .resolves.toMatchObject({ success: false, courierRejected: true, message: 'iThink rejected xpressbees for the route to delivery pincode 422010.' });
});

test('an accepted response without an AWB is flagged for review', async () => {
  const provider = new IThinkService();
  jest.spyOn(provider, 'initialize').mockResolvedValue(undefined);
  jest.spyOn(provider, 'validateOrderData').mockImplementation(() => {});
  jest.spyOn(provider, 'formatOrderDataForIThink').mockReturnValue({ data: { shipments: [{ pin: '422010' }] } });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  provider.axiosInstance = { post: jest.fn().mockResolvedValue({
    status: 200,
    data: { status: 'success', data: { 1: { status: 'success' } } },
  }) };
  await expect(provider.createForwardOrder({ orderId: 'ORDER-TEST', logistics: 'xpressbees', customer_PinCode: '422010' }))
    .resolves.toMatchObject({ success: false, courierRejected: false, requiresReview: true });
});

test('the actual queue processor runs manual selections through iThink fallback', async () => {
  const { Order } = require('../../model/orderModel.js');
  const { registerProcessor } = require('../../services/integrationQueue.js');
  const { releaseLock } = require('../../services/jobRunService.js');
  const { registerWorkers } = require('../../services/integrationQueueWorkers.js');
  const provider = providerWith();
  jest.spyOn(Order, 'findByPk').mockResolvedValue(order);
  jest.spyOn(shipping, 'resolveProviderForOrder').mockResolvedValue({ name: 'ithink', service: provider });
  const book = jest.spyOn(shipping, 'enhancedSyncSingleOrder')
    .mockResolvedValueOnce(rejected)
    .mockResolvedValueOnce({ success: true, courier: 'Delhivery Surface', waybill: 'AWB4' });
  registerWorkers();
  const processor = registerProcessor.mock.calls.find(([name]) => name === 'shipping:sync-order')[2];
  await expect(processor({ data: { orderId: order.id, logistics: 'Xpressbees', serviceType: 'surface' } }))
    .resolves.toMatchObject({ success: true, courier: 'Delhivery Surface', waybill: 'AWB4' });
  expect(book.mock.calls.map((call) => call.slice(-2))).toEqual([
    ['xpressbees', 'surface'], ['delhivery', 'surface'],
  ]);
  expect(releaseLock).toHaveBeenCalledTimes(1);
});

test.each([
  { remark: '422010 is non-serviceable pincode', expected: { courierRejected: true, requiresReview: false } },
  { remark: '422010 is non serviceable pincode', expected: { courierRejected: true, requiresReview: false } },
  {
    remark: "Delhivery Logistics Error : Crashing while saving package due to exception '422010 is non serviceable pincode'. Package might have been partially saved.",
    expected: { courierRejected: false, requiresReview: true },
  },
])('classifies iThink reply: $remark', async ({ remark, expected }) => {
  const provider = new IThinkService();
  jest.spyOn(provider, 'initialize').mockResolvedValue(undefined);
  jest.spyOn(provider, 'validateOrderData').mockImplementation(() => {});
  jest.spyOn(provider, 'formatOrderDataForIThink').mockReturnValue({ data: { shipments: [{ pin: '422010' }] } });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  provider.axiosInstance = { post: jest.fn().mockResolvedValue({
    status: 200,
    data: { status: 'error', data: { 1: { status: 'error', remark } } },
  }) };
  await expect(provider.createForwardOrder({ orderId: 'ORDER-TEST', logistics: 'delhivery', customer_PinCode: '422010' }))
    .resolves.toMatchObject({ success: false, ...expected });
});

test('the worker holds an already queued retry when the saved reply says the package might exist', async () => {
  const { Order } = require('../../model/orderModel.js');
  const { registerProcessor } = require('../../services/integrationQueue.js');
  const { registerWorkers } = require('../../services/integrationQueueWorkers.js');
  const previousError = '422010 is non serviceable pincode. Package might have been partially saved.';
  const update = jest.fn().mockResolvedValue(undefined);
  jest.spyOn(Order, 'findByPk').mockResolvedValue({ ...order, shipping_sync_error: previousError, update });
  const resolve = jest.spyOn(shipping, 'resolveProviderForOrder');
  registerWorkers();
  const processor = registerProcessor.mock.calls.find(([name]) => name === 'shipping:sync-order')[2];
  await expect(processor({ data: { orderId: order.id } })).resolves.toMatchObject({ requiresReview: true });
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ shipping_sync_status: 'failed', pickup_hold_until: null }));
  expect(resolve).not.toHaveBeenCalled();
});
