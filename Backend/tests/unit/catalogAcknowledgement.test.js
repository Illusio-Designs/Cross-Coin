jest.mock('axios', () => ({ post: jest.fn() }), { virtual: true });
jest.mock('sequelize', () => ({ QueryTypes: { SELECT: 'SELECT', INSERT: 'INSERT' } }), { virtual: true });
jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn().mockResolvedValue([]) } }));
jest.mock('../../model/associations.js', () => ({ Product: { findByPk: jest.fn(), addHook: jest.fn() }, Category: { addHook: jest.fn() } }));
jest.mock('../../services/settingsHelper.js', () => ({ getSetting: jest.fn().mockResolvedValue('fixture-key') }));
jest.mock('../../config/logging.js', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));
const axios = require('axios');
const { Product } = require('../../model/associations');
const { sequelize } = require('../../config/db');
const { pushProduct } = require('../../services/customCheckoutService');
beforeEach(() => {
  jest.clearAllMocks();
  Product.findByPk.mockResolvedValue({ id: 1, name: 'Socks', status: 'active', Brands: [{ id: 2, name: 'Soxbae' }], ProductVariations: [{ id: 12, price: 499, stock: 20, attributes: { size: 'Free Size' } }] });
});
test.each([{ success: false }, { status: false }, { status: 'FAILED' }, { result: { success: false } }, { data: { status: 'error' } }])('HTTP 200 with explicit rejection %j is not cached as an accepted catalog', async (data) => {
  axios.post.mockResolvedValue({ status: 200, data });
  const result = await pushProduct(1, 2);
  expect(result).toEqual(expect.objectContaining({ code: 'CHECKOUT_CATALOG_REJECTED', status: 502 }));
  expect(result.pushed).toBeUndefined();
  expect(sequelize.query).not.toHaveBeenCalled();
});
test('explicit provider acceptance records a successful push', async () => {
  axios.post.mockResolvedValue({ status: 200, data: { success: true } });
  expect(await pushProduct(1, 2)).toEqual({ pushed: true });
});
