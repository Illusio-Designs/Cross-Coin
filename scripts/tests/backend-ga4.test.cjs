const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const backend = path.join(__dirname, '../../Backend');
function load(file, mocks, env = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(backend, file), 'utf8'), {
    module, exports: module.exports, process: { env },
    console: { log() {}, warn() {}, error() {} },
    require(name) { assert.ok(name in mocks, `Unexpected dependency: ${name}`); return mocks[name]; },
  });
  return module.exports;
}
function setup({ secret = true, failNetwork = false } = {}) {
  const requests = [];
  const reads = [];
  const helper = load('services/settingsHelper.js', {
    '../model/brandSettingModel': { BrandSetting: { findOne: async ({ where }) => {
      reads.push(where);
      if (where.brand_id !== 7) return null;
      const value = where.key === 'GA_MEASUREMENT_ID' ? 'G-TESTONLY' : secret && where.key === 'GA_API_SECRET' ? 'encrypted-test-value' : null;
      return value ? { is_encrypted: where.key === 'GA_API_SECRET', getDataValue: () => value } : null;
    } } },
    '../utils/encryption': { decrypt: value => { assert.equal(value, 'encrypted-test-value'); return 'test-only-api-secret'; } },
  }, { GA_API_SECRET: 'must-not-use-global', GA_MEASUREMENT_ID: 'G-GLOBAL' });
  const sender = load('integration/googleAnalytics.js', {
    '../services/settingsHelper': helper,
    axios: { post: async (url, data) => {
      requests.push({ url: new URL(url), data });
      if (failNetwork) throw new Error('network unavailable');
      return { status: 204 };
    } },
  });
  return { ...sender, requests, reads };
}
const order = {
  brand_id: 7, order_number: 'TEST-COD-101', final_amount: '599.00', currency: 'INR',
  email: 'not-forwarded@example.invalid', phone: 'not-forwarded',
  items: [{ product_id: 3, name: 'Test socks', quantity: 2, price: '299.50' }],
};
test('COD purchase uses the brand measurement ID and decrypted secret with the GA4 payload', async () => {
  const t = setup();
  await t.sendGAEvent('purchase', order);
  assert.equal(t.requests.length, 1);
  const { url, data } = t.requests[0];
  assert.equal(url.origin + url.pathname, 'https://www.google-analytics.com/mp/collect');
  assert.equal(url.searchParams.get('measurement_id'), 'G-TESTONLY');
  assert.equal(url.searchParams.get('api_secret'), 'test-only-api-secret');
  assert.equal(data.events[0].name, 'purchase');
  const params = data.events[0].params;
  assert.equal(params.transaction_id, order.order_number);
  assert.equal(params.value, 599);
  assert.equal(params.currency, 'INR');
  assert.equal(params.items[0].item_id, '3');
  assert.equal(params.items[0].quantity, 2);
  assert.equal(params.items[0].price, 299.5);
  assert.ok(!JSON.stringify(data).includes(order.email));
  assert.ok(t.reads.every(row => row.brand_id === 7));
});
test('missing brand secret skips delivery rather than borrowing global credentials', async () => {
  const t = setup({ secret: false });
  await t.sendGAEvent('purchase', order);
  assert.equal(t.requests.length, 0);
});
test('another brand cannot send through the configured brand credentials', async () => {
  const t = setup();
  await t.sendGAEvent('purchase', { ...order, brand_id: 8 });
  assert.equal(t.requests.length, 0);
});
test('browser client ID is preserved when supplied', async () => {
  const t = setup();
  await t.sendGAEvent('purchase', { ...order, ga_client_id: '12345.67890' });
  assert.equal(t.requests[0].data.client_id, '12345.67890');
});
test('Google network failure does not reject completed checkout work', async () => {
  const t = setup({ failNetwork: true });
  await assert.doesNotReject(t.sendGAEvent('purchase', order));
});
