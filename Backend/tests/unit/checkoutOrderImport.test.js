jest.mock('axios', () => ({}), { virtual: true });
jest.mock('sequelize', () => ({ QueryTypes: {} }), { virtual: true });
jest.mock('../../config/db.js', () => ({ sequelize: { transaction: jest.fn(async (fn) => fn({})) } }));
jest.mock('../../model/associations.js', () => ({
  Product: { addHook: jest.fn() }, Category: { addHook: jest.fn() },
  ProductVariation: { findByPk: jest.fn(), decrement: jest.fn() },
  Order: { findOne: jest.fn(), create: jest.fn() }, OrderItem: { bulkCreate: jest.fn() },
  GuestUser: { findOne: jest.fn() }, ShippingAddress: { create: jest.fn() }, Payment: { create: jest.fn() },
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
  models.Order.findOne.mockResolvedValue({ order_number: 'CC-EXISTING' });
  expect(await ingestCheckoutOrder(1, provider())).toEqual({ created: false, order_number: 'CC-EXISTING' });
  expect(models.Order.create).not.toHaveBeenCalled(); expect(models.ProductVariation.decrement).not.toHaveBeenCalled(); expect(scheduled).toHaveLength(0);
});
