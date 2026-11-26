jest.mock('../../model/associations.js', () => ({
  Product: { findAll: jest.fn() },
  ProductVariation: { findAll: jest.fn() },
  Brand: {},
}));
jest.mock('../../model/abandonedCartModel.js', () => ({ AbandonedCart: { findOrCreate: jest.fn() } }));
jest.mock('../../utils/encryption.js', () => ({ phoneHash: jest.fn(() => 'private-fixture-hash') }));
jest.mock('../../services/customCheckoutService.js', () => ({
  parseAttrs: jest.fn((attrs) => attrs || {}),
  noteProviderCall: jest.fn(),
}));
jest.mock('../../services/cartRecoveryService.js', () => ({
  sanitizeItems: (lines) => lines.map(({ productId, variationId, quantity }) => ({ productId, variationId, quantity })),
  newToken: () => 'fixture-token',
  isToken: (token) => token === 'fixture-token',
  canRearm: jest.fn(() => true),
}));
jest.mock('../../config/logging.js', () => ({ logger: { error: jest.fn() } }));

const { Product, ProductVariation } = require('../../model/associations.js');
const { AbandonedCart } = require('../../model/abandonedCartModel.js');
const { abandonedWebhook } = require('../../controller/customCheckoutController.js');

let response;
let deferred;
const items = [{ productId: 5, variationId: 42, quantity: 2 }];
const fixture = () => ({
  brandId: 8,
  body: { data: {
    contact: 'buyer9876543210@example.invalid',
    customer: { phoneNumber: '+91 9876543210', firstName: 'Test', lastName: 'Buyer' },
    cart_data: { subtotal: '598.00', lineItems: [{ sku: 'DEMO-42', quantity: 2 }] },
    total_amount_payable: '449.10',
  } },
});

beforeEach(() => {
  jest.clearAllMocks();
  deferred = jest.spyOn(global, 'setImmediate').mockImplementation(() => {});
  response = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  Product.findAll.mockResolvedValue([{ id: 5, name: 'Test fragrance' }]);
  ProductVariation.findAll.mockResolvedValue([{ id: 42, productId: 5, sku: 'DEMO-42', price: 299 }]);
  AbandonedCart.findOrCreate.mockResolvedValue([{}, true]);
});
afterEach(() => deferred.mockRestore());

test('a nested Shiprocket cart is saved for the correct store with recovery lines and the payable total', async () => {
  await abandonedWebhook(fixture(), response);
  expect(Product.findAll).toHaveBeenCalledWith(expect.objectContaining({
    include: [expect.objectContaining({ as: 'Brands', where: { id: 8 }, required: true })],
  }));
  expect(AbandonedCart.findOrCreate).toHaveBeenCalledWith({
    where: { phoneHashValue: 'private-fixture-hash', brandId: 8 },
    defaults: expect.objectContaining({
      phone: '9876543210', customerName: 'Test Buyer', cartSummary: 'Test fragrance ×2',
      status: 'pending', waSent: false, items, itemCount: 2, cartValue: 449.1, recoverToken: 'fixture-token',
    }),
  });
  expect(response.json).toHaveBeenCalledWith({ ok: true, saved: true });
});

test('an identical callback leaves the recovery clock alone', async () => {
  const update = jest.fn();
  AbandonedCart.findOrCreate.mockResolvedValue([{
    update, phone: '9876543210', customerName: 'Test Buyer', cartSummary: 'Test fragrance ×2',
    itemCount: 2, cartValue: '449.10', items, status: 'pending', waSent: false, recoverToken: 'fixture-token',
  }, false]);
  await abandonedWebhook(fixture(), response);
  expect(update).not.toHaveBeenCalled();
});

test('a partial callback cannot replace the original cart with a foreign-store line', async () => {
  Product.findAll.mockResolvedValue([]);
  const update = jest.fn();
  AbandonedCart.findOrCreate.mockResolvedValue([{
    update, phone: '9876543210', customerName: 'Test Buyer', items, status: 'pending',
    cartValue: '599.00', recoverToken: 'fixture-token',
  }, false]);
  await abandonedWebhook(fixture(), response);
  expect(update).toHaveBeenCalledWith({ cartValue: 449.1 });
});

test('a payload without a usable shopper phone does not create a recovery cart', async () => {
  const req = fixture();
  delete req.body.data.customer.phoneNumber;
  await abandonedWebhook(req, response);
  expect(response.json).toHaveBeenCalledWith({ ok: true, skipped: 'no phone' });
  expect(AbandonedCart.findOrCreate).not.toHaveBeenCalled();
});
