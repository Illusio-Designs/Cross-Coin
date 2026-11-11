const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/shiprocketCheckout.js'), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/export (async function|function|const) /g, '$1 ');
function setup() {
  const requests = [], scripts = [], timers = [], listeners = {}, opens = [];
  let now = 100000;
  const context = vm.createContext({
    window: { location: { origin: 'https://www.crosscoin.in', href: 'https://www.crosscoin.in/products/socks' },
      addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: (name) => { delete listeners[name]; },
      requestIdleCallback: (fn) => timers.push(fn) },
    document: { querySelector: () => null, createElement: () => ({}), head: { appendChild: () => {} }, body: { appendChild: (s) => scripts.push(s) } },
    Date: { now: () => now }, process: { env: {} }, trackingIds: () => ({ utm_session_id: 'visit-1' }),
    sessionStorage: { setItem: () => {} }, setTimeout: (fn) => timers.push(fn),
    fetch: async (url, args) => { requests.push({ url, args }); return { json: async () => url.endsWith('/status') ? { enabled: true } : { success: true, token: 'fresh-token' } }; },
  });
  vm.runInContext(source, context);
  return { context, requests, scripts, timers, listeners, opens, advance: () => { now += 31000; } };
}
test('preload waits for shopping interaction and creates no checkout token', () => {
  const s = setup();
  s.context.preloadShiprocket();
  assert.equal(s.scripts.length, 0);
  const onTouch = s.listeners.touchstart;
  assert.equal(s.timers.length, 0);
  onTouch();
  onTouch();
  assert.equal(s.scripts.length, 1);
  assert.equal(s.requests.length, 0);
});
test('recent enabled check is reused; stale status is refreshed', async () => {
  const s = setup();
  await s.context.shiprocketEnabled();
  await s.context.shiprocketEnabled();
  assert.equal(s.requests.length, 1);
  s.advance();
  await s.context.shiprocketEnabled();
  assert.equal(s.requests.length, 2);
});
test('opening reuses warmed SDK and requests a fresh token with actual lines', async () => {
  const s = setup();
  s.context.preloadShiprocket();
  s.listeners.pointerdown();
  s.context.window.HeadlessCheckout = { addToCart: (...args) => s.opens.push(args) };
  s.scripts[0].onload();
  await s.context.openShiprocketCheckout({}, [{ variationId: 12, quantity: 2 }], 'cart');
  assert.equal(s.scripts.length, 1);
  assert.equal(s.requests.length, 1);
  assert.ok(s.requests[0].url.endsWith('/token'));
  const body = JSON.parse(s.requests[0].args.body);
  assert.deepEqual(body.items, [{ variant_id: '12', quantity: 2 }]);
  assert.equal(body.redirect_url, 'https://www.crosscoin.in/order-confirmation');
  assert.equal(body.custom_attributes.utm_session_id, 'visit-1');
  assert.equal(s.opens.length, 1);
  assert.equal(s.opens[0][1], 'fresh-token');
});
