jest.mock('../../utils/encryption.js', () => ({ phoneHash: jest.fn(() => 'fixture-phone-hash') }));
jest.mock('axios', () => ({}), { virtual: true });
jest.mock('sequelize', () => ({ QueryTypes: {} }), { virtual: true });
jest.mock('../../config/db.js', () => ({ sequelize: { transaction: jest.fn(async (fn) => fn({})) } }));
jest.mock('../../model/associations.js', () => ({
  Product: { addHook: jest.fn() }, Category: { addHook: jest.fn() },
  ProductVariation: { findByPk: jest.fn(), decrement: jest.fn() },
  Order: { findOne: jest.fn(), create: jest.fn() }, OrderItem: { bulkCreate: jest.fn() },
  GuestUser: { findOne: jest.fn(), create: jest.fn() }, ShippingAddress: { create: jest.fn() }, Payment: { create: jest.fn() },
}));
jest.mock('../../model/productBrandModel.js', () => ({ ProductBrand: { findOne: jest.fn() } }));
jest.mock('../../services/settingsHelper.js', () => ({}));
jest.mock('../../config/logging.js', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../../services/orderCreationService.js', () => ({ generateUniqueOrderNumber: jest.fn().mockResolvedValue('CC-TEST-1') }));
jest.mock('../../services/orderEvents.js', () => ({ emit: jest.fn() }));
jest.mock('../../integration/facebookPixel.js', () => ({ sendFacebookEvent: jest.fn() }));
jest.mock('../../integration/googleAnalytics.js', () => ({ sendGAEvent: jest.fn() }));
const models = require('../../model/associations');
const { ProductBrand } = require('../../model/productBrandModel');
const { ingestCheckoutOrder } = require('../../services/customCheckoutService');
const { sendFacebookEvent } = require('../../integration/facebookPixel');
const { sendGAEvent } = require('../../integration/googleAnalytics');
let scheduled, immediate;
beforeEach(() => {
  jest.clearAllMocks(); scheduled = [];
  immediate = jest.spyOn(global, 'setImmediate').mockImplementation((fn) => { scheduled.push(fn); });
  models.Order.findOne.mockResolvedValue(null);
  models.GuestUser.findOne.mockResolvedValue({ id: 9 });
  models.ShippingAddress.create.mockResolvedValue({ id: 10 });
  models.ProductVariation.findByPk.mockResolvedValue({ id: 12, productId: 4, price: '899' });
  ProductBrand.findOne.mockResolvedValue({ price_override: '799' });
  models.Order.create.mockImplementation(async (data) => ({ id: 1, ...data }));
});
afterEach(() => immediate.mockRestore());
const provider = (overrides = {}) => ({ status: 'SUCCESS', platform_order_id: 'provider-test-1', payment_type: 'PREPAID', payment_status: 'success',
  phone: '9999999999', shipping_address: { first_name: 'Test', last_name: 'Buyer', line1: 'Test address', city: 'Test city', state: 'Test state', pincode: '400001' },
  cart_data: { items: [{ variant_id: 12, quantity: 1 }], custom_attributes: { marketing_consent: 'true', fbp: 'test-browser', ga_client_id: 'test-client' } },
  total_amount_payable: 799, ...overrides });
test('799 site price imports against 899 base variation and schedules correctly branded purchase analytics', async () => {
  const result = await ingestCheckoutOrder(1, provider());
  expect(result.order_number).toBe('CC-TEST-1');
  expect(models.Order.create).toHaveBeenCalledWith(expect.objectContaining({ brand_id: 1, final_amount: 799, total_amount: 799 }), expect.anything());
  expect(models.OrderItem.bulkCreate).toHaveBeenCalledWith([expect.objectContaining({ price: 799, subtotal: 799 })], expect.anything());
  await Promise.all(scheduled.map((fn) => fn()));
  expect(sendFacebookEvent).toHaveBeenCalledWith('Purchase', expect.objectContaining({ brand_id: 1, final_amount: 799, fbp: 'test-browser' }));
  expect(sendGAEvent).toHaveBeenCalledWith('purchase', expect.objectContaining({ brand_id: 1, final_amount: 799, ga_client_id: 'test-client' }));
});
test('without a site override the variation price still applies', async () => {
  ProductBrand.findOne.mockResolvedValue(null);
  await ingestCheckoutOrder(2, provider({ total_amount_payable: 899 }));
  expect(models.Order.create).toHaveBeenCalledWith(expect.objectContaining({ brand_id: 2, final_amount: 899 }), expect.anything());
});
test('incorrect provider total is rejected and never saved or tracked', async () => {
  await expect(ingestCheckoutOrder(1, provider({ total_amount_payable: 499 }))).rejects.toThrow('Amount mismatch');
  expect(models.Order.create).not.toHaveBeenCalled(); expect(scheduled).toHaveLength(0);
});
test('duplicate confirmation returns existing order without duplicating items, stock or Purchase', async () => {
  models.Order.findOne.mockResolvedValue({ order_number: 'CC-EXISTING', brand_id: 1 });
  expect(await ingestCheckoutOrder(1, provider())).toEqual({ created: false, order_number: 'CC-EXISTING' });
  expect(models.Order.create).not.toHaveBeenCalled(); expect(models.ProductVariation.decrement).not.toHaveBeenCalled(); expect(scheduled).toHaveLength(0);
});

test('unpaid prepaid return does not create an order, change stock or send Purchase', async () => {
  expect(await ingestCheckoutOrder(1, provider({ payment_status: 'pending' }))).toEqual({ skipped: 'awaiting_payment' });
  expect(models.Order.create).not.toHaveBeenCalled(); expect(models.ProductVariation.decrement).not.toHaveBeenCalled(); expect(scheduled).toHaveLength(0);
});
test('phone-only buyer uses encrypted lookup hash and an internal valid email', async () => {
  models.GuestUser.findOne.mockResolvedValue(null); models.GuestUser.create.mockResolvedValue({ id: 9 });
  await ingestCheckoutOrder(1, provider());
  expect(models.GuestUser.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { phoneHashValue: 'fixture-phone-hash' } }));
  expect(models.GuestUser.create).toHaveBeenCalledWith(expect.objectContaining({ email: expect.stringMatching(/^checkout-[a-f0-9]+@guest\.invalid$/) }), expect.anything());
  expect(models.Payment.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'successful', brand_id: 1 }), expect.anything());
});
test('payment ledger failure rejects the transaction and schedules no success events', async () => {
  models.Payment.create.mockRejectedValueOnce(new Error('ledger unavailable'));
  await expect(ingestCheckoutOrder(1, provider())).rejects.toThrow('ledger unavailable');
  expect(scheduled).toHaveLength(0);
});
test('racing callback acknowledges winner after unique-key rollback', async () => {
  models.Order.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ order_number: 'CC-WINNER', brand_id: 1 });
  models.Order.create.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { name: 'SequelizeUniqueConstraintError' }));
  expect(await ingestCheckoutOrder(1, provider())).toEqual({ created: false, order_number: 'CC-WINNER' });
  expect(scheduled).toHaveLength(0);
});
test('existing provider ID from another store never leaks an order number', async () => {
  models.Order.findOne.mockResolvedValue({ order_number: 'OTHER-ORDER', brand_id: 2 });
  await expect(ingestCheckoutOrder(1, provider())).rejects.toThrow('different store');
  expect(models.Order.create).not.toHaveBeenCalled();
});
test('Meta failure cannot suppress the GA4 Purchase', async () => {
  sendFacebookEvent.mockRejectedValueOnce(new Error('Meta unavailable'));
  await ingestCheckoutOrder(1, provider());
  for (const run of scheduled) await run();
  expect(sendGAEvent).toHaveBeenCalledWith('purchase', expect.objectContaining({ order_number: 'CC-TEST-1', brand_id: 1 }));
});
test('COD saves an unpaid order awaiting address confirmation, with linked payment ledger', async () => {
  await ingestCheckoutOrder(1, provider({payment_type:'COD',payment_status:'pending'}));
  expect(models.Order.create).toHaveBeenCalledWith(expect.objectContaining({payment_type:'cod',payment_status:'pending',status:'awaiting_confirmation',cod_address_confirmed:false}),expect.anything());
  expect(models.Payment.create).toHaveBeenCalledWith(expect.objectContaining({guest_user_id:9,payment_type:'cod',status:'pending'}),expect.anything());
});
