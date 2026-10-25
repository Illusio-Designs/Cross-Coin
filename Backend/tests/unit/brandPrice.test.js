jest.mock('../../model/productBrandModel.js', () => ({ ProductBrand: { findOne: jest.fn() } }));
const { ProductBrand } = require('../../model/productBrandModel.js');
const { applyBrandPrice, createBrandPriceResolver } = require('../../utils/brandPrice.js');
beforeEach(() => jest.clearAllMocks());
const product = { price: '899', variations: [{ id: 7, price: '899', stock: 12 }], Brands: [{ id: 1, ProductBrand: { price_override: '799.00' } }, { id: 2, ProductBrand: { price_override: null } }] };
test('site price replaces displayed variation price without changing other brands or source records', () => {
  expect(applyBrandPrice(product, 1).price).toBe(799);
  expect(applyBrandPrice(product, 1).variations[0]).toEqual({ id: 7, price: 799, stock: 12 });
  expect(applyBrandPrice(product, 2).variations[0].price).toBe('899');
  expect(product.variations[0].price).toBe('899');
});
test('checkout resolves same 799 price from database, once per product per request', async () => {
  ProductBrand.findOne.mockResolvedValue({ price_override: '799' });
  const price = createBrandPriceResolver(1);
  expect(await price(10, '899')).toBe(799);
  expect(await price(10, '999')).toBe(799);
  expect(ProductBrand.findOne).toHaveBeenCalledTimes(1);
  expect(ProductBrand.findOne.mock.calls[0][0].where).toEqual({ product_id: 10, brand_id: 1, status: 'active' });
});
test.each([null, '', '0', '-2', 'invalid'])('empty or invalid site price %s preserves variation price', async (override) => {
  ProductBrand.findOne.mockResolvedValue({ price_override: override });
  expect(await createBrandPriceResolver(2)(10, '899')).toBe(899);
});
test('missing brand association preserves variation price', async () => {
  ProductBrand.findOne.mockResolvedValue(null);
  expect(await createBrandPriceResolver(2)(10, '899')).toBe(899);
});
