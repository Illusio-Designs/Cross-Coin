const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../../Backend');
function load(file, mocks) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
    module, exports: module.exports, URL,
    require(name) { assert.ok(name in mocks, `Unexpected dependency ${name}`); return mocks[name]; },
  });
  return module.exports;
}
function setup() {
  const settings = new Map();
  const tiers = [];
  let nextId = 1;
  let failImage = false;
  const imageService = load('services/bundleImageService.js', {
    '../model/brandSettingModel': { BrandSetting: {
      findAll: async ({ where }) => [...settings.values()].filter(s => s.brand_id === where.brand_id && where.key.includes(s.key)),
      upsert: async (value, options) => {
        assert.ok(options.transaction);
        if (failImage) throw new Error('Storage failure');
        settings.set(`${value.brand_id}:${value.key}`, value);
      },
      destroy: async ({ where, transaction }) => { assert.ok(transaction); settings.delete(`${where.brand_id}:${where.key}`); },
    } },
  });
  const model = {
    sequelize: { transaction: async callback => {
      const settingsBefore = new Map(settings), tiersBefore = tiers.slice();
      try { return await callback({ id: 'transaction' }); }
      catch (error) { settings.clear(); for (const [key,value] of settingsBefore) settings.set(key,value); tiers.splice(0,tiers.length,...tiersBefore); throw error; }
    } },
    create: async (values, options) => {
      assert.ok(options.transaction);
      const row = { id: nextId++, ...values, toJSON() { const { toJSON, update, destroy, ...values } = this; return values; },
        async update(values, options) { assert.ok(options.transaction); Object.assign(this, values); },
        async destroy(options) { assert.ok(options.transaction); tiers.splice(tiers.indexOf(this),1); },
      };
      tiers.push(row); return row;
    },
    findByPk: async id => tiers.find(t => t.id === id),
    findAll: async ({ where }) => tiers.filter(t => t.brand_id === where.brand_id && (!('product_id' in where) || t.product_id === where.product_id) && (!where.is_active || t.is_active)),
  };
  const controller = load('controller/bundleController.js', {
    sequelize: { Op: { lte: Symbol('lte') } }, '../model/bundleTierModel.js': { BundleTier: model },
    '../config/logging.js': { logger: { error() {} } }, '../services/bundleImageService.js': imageService,
  });
  return { controller, imageService, tiers, settings, failImage() { failImage = true; } };
}
const response = () => ({ code: 200, vary() {}, set() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const body = (brand = 7) => ({ brand_id: brand, scope: 'store', pairs: 2, discount_percent: 15, image_url: 'https://ik.imagekit.io/banner.webp' });

test('image upload associations persist through create, public list, edit and removal', async () => {
  const { controller } = setup();
  const created = response(); await controller.createBundleTier({ body: body() }, created);
  assert.equal(created.code, 201);
  const id = created.body.tier.id;
  const listed = response(); await controller.getPublicPackTiers({ brandId: 7, query: {} }, listed);
  assert.equal(listed.body.tiers[0].image_url, body().image_url);
  const updated = response(); await controller.updateBundleTier({ params: { id }, body: { image_url: 'https://ik.imagekit.io/replacement.webp' } }, updated);
  const admin = response(); await controller.listBundleTiers({ query: { brand_id: 7 } }, admin);
  assert.equal(admin.body.tiers[0].image_url, 'https://ik.imagekit.io/replacement.webp');
  await controller.updateBundleTier({ params: { id }, body: { image_url: null } }, response());
  const cleared = response(); await controller.getPublicPackTiers({ brandId: 7, query: {} }, cleared);
  assert.equal(cleared.body.tiers[0].image_url, null);
});
test('images remain with their tier ID and cannot leak between brands', async () => {
  const { controller, settings } = setup();
  await controller.createBundleTier({ body: body(7) }, response());
  await controller.createBundleTier({ body: { ...body(8), image_url: 'https://ik.imagekit.io/brand-eight.webp' } }, response());
  const listed = response(); await controller.getPublicPackTiers({ brandId: 8, query: {} }, listed);
  assert.equal(listed.body.tiers.length, 1);
  assert.equal(listed.body.tiers[0].image_url, 'https://ik.imagekit.io/brand-eight.webp');
  await controller.deleteBundleTier({ params: { id: 1 } }, response());
  assert.equal(settings.has('7:BUNDLE_TIER_IMAGE_1'), false);
  assert.equal(settings.has('8:BUNDLE_TIER_IMAGE_2'), true);
});
test('invalid image URLs are rejected before creating a tier', async () => {
  const { controller, tiers } = setup();
  for (const image of ['javascript:bad','//unsafe.example/image','https://user:password@example.com/image']) {
    const res = response(); await controller.createBundleTier({ body: { ...body(), image_url: image } }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(tiers.length, 0);
});
test('failed image persistence rolls back tier creation', async () => {
  const { controller, tiers, failImage } = setup(); failImage();
  const res = response(); await controller.createBundleTier({ body: body() }, res);
  assert.equal(res.code, 500);
  assert.equal(tiers.length, 0);
});
