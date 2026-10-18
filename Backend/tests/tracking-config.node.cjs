// Run without database, credentials, or installed packages:
// node --test Backend/tests/tracking-config.node.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, mocks, env = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module, exports: module.exports, process: { env }, console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
  }, { filename: file });
  return module.exports;
}
function settings(findOne, env = {}) {
  return load('services/settingsHelper.js', {
    '../model/brandSettingModel': { BrandSetting: { findOne } },
    '../utils/encryption': { decrypt: value => value },
    '../config/logging': { logger: { debug() {} } },
  }, env);
}
function response() {
  return { code: 200, headers: {}, status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    vary(name) { this.headers.Vary = name; },
    set(name, value) { this.headers[name] = value; } };
}

test('brand-only settings ignore global tracking IDs, preserving legacy fallback for other callers', async () => {
  const helper = settings(async () => null, { GTM_ID: 'GTM-GLOBAL' });
  assert.equal(await helper.getSetting(2, 'GTM_ID'), 'GTM-GLOBAL');
  assert.equal(await helper.getSetting(2, 'GTM_ID', null, { brandOnly: true }), null);
});

test('database errors cannot activate a global tracker', async () => {
  const helper = settings(async () => { throw new Error('offline'); }, { GA_MEASUREMENT_ID: 'G-GLOBAL' });
  assert.equal(await helper.getSetting(2, 'GA_MEASUREMENT_ID', null, { brandOnly: true }), null);
});

test('tracking response keeps two brands isolated and leaves missing IDs off', async () => {
  const rows = { '1:GTM_ID': 'GTM-CROSSCOIN', '2:GA_MEASUREMENT_ID': 'G-MORBIX' };
  const helper = settings(async ({ where }) => {
    const value = rows[`${where.brand_id}:${where.key}`];
    return value ? { getDataValue: () => value } : null;
  }, { GTM_ID: 'GTM-GLOBAL', GOOGLE_ADS_ID: 'AW-GLOBAL' });
  const { getTrackingConfig } = load('controller/trackingConfigController.js', { '../services/settingsHelper': helper });
  const crosscoin = response();
  await getTrackingConfig({ brandId: 1 }, crosscoin);
  assert.equal(crosscoin.body.gtm_id, 'GTM-CROSSCOIN');
  const morbix = response();
  await getTrackingConfig({ brandId: 2 }, morbix);
  assert.equal(morbix.body.ga_measurement_id, 'G-MORBIX');
  assert.equal(morbix.body.gtm_id, null);
  assert.equal(morbix.body.google_ads_id, null);
  assert.equal(morbix.headers.Vary, 'X-Brand-Name');
});

test('brand-specific Ads labels retain per-event precedence', async () => {
  const values = { GOOGLE_ADS_CONVERSION_LABEL: 'legacy', GOOGLE_ADS_CONVERSION_LABELS: '{"add_to_cart":"cart"}', GOOGLE_ADS_LABEL_PURCHASE: 'purchase' };
  const { getTrackingConfig } = load('controller/trackingConfigController.js', {
    '../services/settingsHelper': { getSetting: async (_, key) => values[key] },
  });
  const res = response();
  await getTrackingConfig({ brandId: 2 }, res);
  assert.equal(res.body.google_ads_labels.purchase, 'purchase');
  assert.equal(res.body.google_ads_labels.add_to_cart, 'cart');
});

test('missing or unknown brand does not fall back to Crosscoin', async () => {
  const { identifyBrand } = load('middleware/brandMiddleware.js', {
    '../model/brandModel.js': { findOne: async () => null },
  });
  for (const [headers, status] of [[{}, 400], [{ 'x-brand-name': 'unknown' }, 404]]) {
    const res = response();
    await identifyBrand({ headers, query: {}, method: 'GET' }, res, () => assert.fail('must not continue'));
    assert.equal(res.code, status);
  }
});

test('server GA does not send to shared credentials or use brand 1 for an unscoped order', async () => {
  let posts = 0;
  const helper = settings(async () => null, { GA_MEASUREMENT_ID: 'G-GLOBAL', GA_API_SECRET: 'global' });
  const { sendGAEvent } = load('integration/googleAnalytics.js', {
    axios: { post: async () => { posts++; } }, '../services/settingsHelper': helper,
  });
  await sendGAEvent('purchase', {});
  await sendGAEvent('purchase', { brand_id: 2 });
  assert.equal(posts, 0);
});
