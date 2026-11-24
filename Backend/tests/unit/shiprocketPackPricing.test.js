const { pricePackItems, readPackQuote, signPackQuote } = require('../../utils/shiprocketPackPricing.js');

const sku = (productId, price = 999) => ({ productId, name: `Product ${productId}`, image: 'https://example.com/product.webp', price, stock: 7 });
const variants = new Map([['11', sku(1)], ['12', sku(2)], ['13', sku(1)]]);
const line = (variant_id, quantity, group) => ({ variant_id, quantity, ...group });
const prices = (items) => items.map((item) => item.catalog_data.price);

test('store-wide pack uses its own group quantity and leaves a loose item at catalog price', async () => {
  const items = await pricePackItems([line('11', 1, { pack_group: 'duo' }), line('12', 1, { pack_group: 'duo' }), line('13', 1)],
    variants, async () => null, async (count) => count === 2 ? 20 : 30);
  expect(prices(items)).toEqual([799.2, 799.2, 999]);
});

test('a mixed-colour fixed price bundle uses one tier and distributes the paise', async () => {
  const getUnit = jest.fn(async () => 499 / 3);
  const items = await pricePackItems([line('11', 2, { pack_id: 'one' }), line('13', 1, { pack_id: 'one' })], variants, getUnit, async () => 0);
  expect(getUnit).toHaveBeenCalledWith(1, 3);
  expect(prices(items)).toEqual([166.33, 166.34]);
  expect(items.reduce((sum, i) => sum + Math.round(i.catalog_data.price * 100) * i.quantity, 0)).toBe(49900);
});

test('loose and pack quantities for a shared variant resolve to one averaged provider line', async () => {
  const items = await pricePackItems([line('11', 2, { pack_id: 'two' }), line('11', 1)], variants, async () => 600, async () => 0);
  expect(items).toEqual([expect.objectContaining({ variant_id: '11', quantity: 3, catalog_data: expect.objectContaining({ price: 733 }) })]);
});

test('missing bundle tiers and insufficient aggregate stock block checkout', async () => {
  await expect(pricePackItems([line('11', 2, { pack_id: 'invalid' })], variants, async () => null, async () => 0)).rejects.toThrow('bundle quantity');
  await expect(pricePackItems([line('11', 7), line('11', 1)], variants, async () => null, async () => 0)).rejects.toThrow('enough stock');
});

test('quotes bind the original prices, brand and quantities', () => {
  const items = [{ variant_id: '11', quantity: 2, catalog_data: { price: 99.45 } }];
  const quote = signPackQuote(items, 1, 'fixture-secret');
  expect(readPackQuote(quote, items, 1, 'fixture-secret').get('11')).toEqual({ quantity: 2, paise: 9945 });
  expect(() => readPackQuote(quote, items, 2, 'fixture-secret')).toThrow('Invalid pack quote signature');
  expect(() => readPackQuote(quote.replace('9945', '1500'), items, 1, 'fixture-secret')).toThrow('Invalid pack quote signature');
  expect(() => readPackQuote(quote, [{ variant_id: '11', quantity: 3 }], 1, 'fixture-secret')).toThrow('changed the quantities');
});
