const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../lib/api/shiprocketCheckout.js'), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const diagnosticSource = fs.readFileSync(path.join(__dirname, '../lib/checkoutDiagnostics.js'), 'utf8').replace(/^export /gm, '');
function setup({ response, sdk, debug = false } = {}) {
  const requests = [], openings = [], stored = [];
  const context = vm.createContext({
    URL, Event, navigator: { userAgent: 'Version/18.0 Mobile Safari/605.1.15', cookieEnabled: true },
    API_URL: 'https://api.test', BRAND: 'soxbae', trackingIds: () => ({ fbp: 'fixture' }),
    window: { atob, isSecureContext: true, location: { origin: 'https://www.soxbae.com', href: 'https://www.soxbae.com/products/socks' + (debug ? '?checkout_debug=1' : '') },
      HeadlessCheckout: { addToCart: (...args) => { openings.push(args); return sdk?.(...args); } } },
    sessionStorage: { setItem: (...args) => stored.push(args) },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (response instanceof Error) throw response;
      return response || { ok: true, json: async () => ({ success: true, token: 'fixture-token' }) };
    },
  });
  vm.runInContext(diagnosticSource, context);
  vm.runInContext(source, context);
  return { open: context.openShiprocketCheckout, report: context.readCheckoutDiagnostic, requests, openings, stored };
}
test('Buy Now and cart use Soxbae brand, correct return URL and session source', async () => {
  for (const source of ['buy-now', 'cart']) {
    const c = setup();
    await c.open({}, [{ variationId: 12, quantity: 2 }], source);
    const request = c.requests[0], payload = JSON.parse(request.options.body);
    assert.equal(request.options.headers['X-Brand-Name'], 'soxbae');
    assert.equal(payload.redirect_url, 'https://www.soxbae.com/order-confirmation');
    assert.deepEqual(payload.items, [{ variant_id: '12', quantity: 2 }]);
    assert.equal(c.openings[0][1], 'fixture-token');
    assert.deepEqual(c.stored[0], ['soxbae-sr-source', source]);
  }
});
test('duplicate cart lines for the same variation become one provider line', async () => {
  const c = setup();
  await c.open({}, [{ variationId: 12, quantity: 2 }, { variationId: '12', quantity: 1 }], 'cart');
  assert.deepEqual(JSON.parse(c.requests[0].options.body).items, [{ variant_id: '12', quantity: 3 }]);
});
test('rapid taps share one opening and remain pending until SDK settles', async () => {
  let finish;
  const c = setup({ sdk: () => new Promise((resolve) => { finish = resolve; }) });
  const a = c.open({}, [{ variationId: 12, quantity: 1 }]);
  const b = c.open({}, [{ variationId: 12, quantity: 1 }]);
  assert.equal(a, b);
  let settled = false; a.then(() => { settled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(c.requests.length, 1); assert.equal(c.openings.length, 1); assert.equal(settled, false);
  finish(); await a; assert.equal(settled, true);
});
test('asynchronous SDK failure reaches the caller and a later tap can retry', async () => {
  let count = 0;
  const c = setup({ sdk: () => ++count === 1 ? Promise.reject(new Error('SDK failed')) : Promise.resolve() });
  await assert.rejects(c.open({}, [{ variationId: 12, quantity: 1 }]), /SDK failed/);
  await c.open({}, [{ variationId: 12, quantity: 1 }]);
  assert.equal(c.requests.length, 2);
});
test('failed catalog or token response never opens the provider', async () => {
  for (const response of [
    { ok: false, json: async () => ({ success: false, message: 'Products could not sync' }) },
    { ok: true, json: async () => ({ success: true }) },
    { ok: false, json: async () => ({ success: true, token: 'invalid' }) },
    new Error('Network failed'),
  ]) {
    const c = setup({ response });
    await assert.rejects(c.open({}, [{ variationId: 12, quantity: 1 }]));
    assert.equal(c.openings.length, 0);
  }
});
test('invalid product options and quantities are rejected before token creation', async () => {
  for (const lines of [[], [{ variationId: null, quantity: 1 }], [{ variationId: 'bad', quantity: 1 }], [{ variationId: 1, quantity: 0 }], [{ variationId: 1, quantity: 1.5 }]]) {
    const c = setup(); await assert.rejects(c.open({}, lines)); assert.equal(c.requests.length, 0);
  }
});
test('Safari diagnostic captures cookie flags, selected options and token expiry without token or claims', async () => {
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120, customer: 'PRIVATE-CUSTOMER' })).toString('base64url')}.signature`;
  const c = setup({ debug: true, response: { ok: true, status: 200, json: async () => ({ success: true, token }) } });
  await c.open({}, [{ variationId: 12, quantity: 1 }]);
  const report = c.report();
  assert.equal(report.browser, 'Safari');
  const requested = report.stages.find((stage) => stage.stage === 'token_requested');
  assert.equal(requested.cookiesEnabled, true); assert.equal(requested.secureContext, true);
  assert.equal(requested.variantIds[0], '12');
  const metadata = report.stages.find((stage) => stage.stage === 'token_metadata');
  assert.equal(metadata.tokenFormat, 'jwt'); assert.ok(metadata.tokenSecondsRemaining > 0 && metadata.tokenSecondsRemaining <= 120);
  assert.ok(!JSON.stringify(report).includes(token)); assert.ok(!JSON.stringify(report).includes('PRIVATE-CUSTOMER'));
});

test('all checkout entry points prevent native form or link navigation', async () => {
  const c = setup(); let prevented = 0, stopped = 0;
  await c.open({ preventDefault() { prevented++; }, stopPropagation() { stopped++; } }, [{ variationId: 696, quantity: 1 }]);
  assert.equal(prevented, 1); assert.equal(stopped, 1);
  assert.equal(c.openings.length, 1);
});
test('backend rejection code survives into the phone diagnostic', async () => {
  const c = setup({ debug: true, response: { ok: false, status: 502, json: async () => ({ success: false, code: 'CHECKOUT_CATALOG_REJECTED', message: 'Catalog rejected' }) } });
  await assert.rejects(c.open({}, [{ variationId: 696, quantity: 1 }]));
  assert.equal(c.report().stages.at(-1).code, 'CHECKOUT_CATALOG_REJECTED');
  assert.equal(c.openings.length, 0);
});
