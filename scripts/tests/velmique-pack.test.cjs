const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../..');
const tiers = [{ pairs: 2, off: 15 }, { pairs: 3, off: 20 }];
function frontend() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'Velmique/lib/packPricing.js'), 'utf8').replace(/export /g, '') + '\nglobalThis.api={packPercent,pricePackCart};', context);
  return context.api;
}
function backend() {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'Backend/utils/mixPackPricing.js'), 'utf8'), {
    module, exports: module.exports,
    require: () => ({ packDiscountPercent: async (brand, count) => {
      assert.equal(brand, 7);
      return frontend().packPercent(count, tiers);
    } }),
  });
  return module.exports;
}

test('two and three fragrance packs match backend unit rounding and configured discounts', async () => {
  const front = frontend(), server = backend();
  for (const count of [2, 3, 4]) {
    const items = Array.from({ length: count }, (_, index) => ({ id: index, price: 499.99, quantity: 1, packGroup: 'pack-1' }));
    const payload = items.map(item => ({ quantity: item.quantity, pack_group: item.packGroup }));
    const discounts = await server.getMixPackDiscounts(payload, 7);
    const priced = front.pricePackCart(items, tiers);
    for (let i = 0; i < count; i++) assert.equal(priced[i].price, server.mixPackUnitPrice(items[i].price, payload[i], discounts));
    assert.equal(priced[0].packDiscount, count === 2 ? 15 : 20);
  }
});
test('separate packs do not combine to unlock a higher discount and loose lines remain full price', async () => {
  const items = [{ price: 100, quantity: 1, packGroup: 'one' }, { price: 100, quantity: 1, packGroup: 'two' }, { price: 100, quantity: 3 }];
  const priced = frontend().pricePackCart(items, tiers);
  assert.equal(priced.reduce((sum, item) => sum + item.price * item.quantity, 0), 500);
  const server = backend();
  const discounts = await server.getMixPackDiscounts(items.map(i => ({ quantity: i.quantity, pack_group: i.packGroup })), 7);
  assert.equal(discounts.get('one'), 0);
  assert.equal(discounts.get('two'), 0);
});
test('removing an item or changing quantity recalculates the discount without compounding', () => {
  const front = frontend();
  const priced = front.pricePackCart([{ price: 100, quantity: 3, packGroup: 'pack' }], tiers);
  assert.equal(priced[0].price, 80);
  const reduced = front.pricePackCart([{ ...priced[0], quantity: 2 }], tiers);
  assert.equal(reduced[0].price, 85);
  const single = front.pricePackCart([{ ...reduced[0], quantity: 1 }], tiers);
  assert.equal(single[0].price, 100);
});
test('client-selected group names cannot alter the pricing maps', async () => {
  const server = backend();
  const items = [{ pack_group: '__proto__', quantity: 2 }, { pack_group: 'constructor', quantity: 1 }];
  const discounts = await server.getMixPackDiscounts(items, 7);
  assert.equal(server.mixPackUnitPrice(100, items[0], discounts), 85);
  assert.equal(server.mixPackUnitPrice(100, items[1], discounts), null);
});
test('tier threshold order matches the backend even if a higher tier has a lower percentage', () => {
  assert.equal(frontend().packPercent(3, [{ pairs: 2, off: 20 }, { pairs: 3, off: 15 }]), 15);
});
test('public homepage endpoint exposes only valid banner images for the selected brand', async () => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'Backend/controller/homeContentController.js'), 'utf8'), {
    module, exports: module.exports, URL,
    require: () => ({ getSetting: async (brand, key, fallback, options) => {
      assert.equal(brand, 7); assert.equal(options.brandOnly, true);
      return key === 'HOME_BUNDLE_IMAGE_1' ? 'https://ik.imagekit.io/banner.webp' : 'javascript:bad';
    } }),
  });
  const res = { vary() {}, set() {}, json(body) { this.body = body; }, status() { return this; } };
  await module.exports.getHomeBundleContent({ brandId: 7 }, res);
  assert.equal(res.body.images[0], 'https://ik.imagekit.io/banner.webp');
  assert.equal(res.body.images[1], null);
  assert.deepEqual(Object.keys(res.body), ['success', 'images']);
});
test('editing a pack tier invalidates cached server pricing immediately', async () => {
  let percent = 15;
  const module = { exports: {} };
  const mock = {
    findOne: async () => ({ discount_percent: percent, pairs: 2 }),
    findByPk: async () => ({ update: async patch => { percent = patch.discount_percent; } }),
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'Backend/controller/bundleController.js'), 'utf8'), {
    module, exports: module.exports,
    require(name) {
      if (name === 'sequelize') return { Op: { lte: Symbol('lte') } };
      if (name.includes('bundleTierModel')) return { BundleTier: mock };
      return { logger: { error() {} } };
    },
  });
  assert.equal(await module.exports.packDiscountPercent(7, 2), 15);
  const res = { json(body) { this.body = body; }, status() { return this; } };
  await module.exports.updateBundleTier({ params: { id: 1 }, body: { discount_percent: 18 } }, res);
  assert.equal(res.body.success, true);
  assert.equal(await module.exports.packDiscountPercent(7, 2), 18);
});
