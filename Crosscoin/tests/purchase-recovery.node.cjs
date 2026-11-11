const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/purchasePixel.js'), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
function setup(config = { success: true, fb_pixel_id: '123456789' }) {
  const requests = [], scripts = [], events = [], timers = [];
  const context = vm.createContext({ process: { env: {} }, getConsent: () => ({ marketing: true }),
    window: { location: { pathname: '/order-confirmation', hostname: 'www.crosscoin.in' }, dispatchEvent: (event) => events.push(event.type) },
    Event: class { constructor(type) { this.type = type; } },
    document: { querySelector: () => scripts[0], createElement: () => ({ listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, remove() {} }), head: { appendChild: (script) => scripts.push(script) } },
    fetch: async (url, args) => { requests.push({ url, args }); return { ok: true, json: async () => config }; },
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {},
  });
  vm.runInContext(source, context); return { context, scripts, requests, events };
}
test('missing server pixel is recovered from brand config; wait for actual library', async () => {
  const s = setup();
  const a = s.context.ensurePurchasePixel(), b = s.context.ensurePurchasePixel();
  assert.equal(a, b);
  await new Promise(setImmediate);
  assert.equal(s.requests.length, 1);
  assert.equal(s.requests[0].args.headers['X-Brand-Name'], 'crosscoin');
  assert.equal(s.scripts.length, 1);
  assert.equal(s.context.window._fbqId, '123456789');
  assert.equal(s.context.window.fbq.queue[0][0], 'init');
  s.context.window.fbq.callMethod = () => {};
  s.scripts[0].listeners.load();
  assert.equal(await a, true);
  await s.context.ensurePurchasePixel();
  assert.equal(s.scripts.length, 1);
});
test('missing brand pixel ID never initializes another store or reports success', async () => {
  const s = setup({ success: true, fb_pixel_id: null });
  assert.equal(await s.context.ensurePurchasePixel(), false);
  assert.equal(s.scripts.length, 0);
});
test('existing initialized stub reuses its pixel and script', async () => {
  const s = setup();
  s.context.window._fbqId = '987654321'; s.context.window.fbq = () => {};
  const a = s.context.ensurePurchasePixel();
  await new Promise(setImmediate);
  assert.equal(s.requests.length, 0);
  assert.equal(s.scripts.length, 1);
  s.context.window.fbq.callMethod = () => {};
  s.scripts[0].listeners.load();
  assert.equal(await a, true);
});
const handoff = fs.readFileSync(path.join(__dirname, '../src/lib/thankYou.js'), 'utf8').replace(/^export /gm, '');
test('native order handoff survives retries, is cleared only after successful send', () => {
  const data = new Map();
  const context = vm.createContext({ sessionStorage: { getItem: (k) => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: (k) => data.delete(k) } });
  vm.runInContext(handoff, context);
  context.savePurchaseForThankYou('CC-1', { value: 799 });
  assert.equal(context.takePurchaseForThankYou('CC-1').value, 799);
  assert.equal(context.takePurchaseForThankYou('CC-1').value, 799);
  assert.equal(context.takePurchaseForThankYou('CC-2'), null);
  context.completePurchaseForThankYou('CC-1');
  assert.equal(context.takePurchaseForThankYou('CC-1'), null);
});
test('blocked session storage still supports client-side native checkout navigation', () => {
  const context = vm.createContext({ sessionStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  vm.runInContext(handoff, context);
  context.savePurchaseForThankYou('CC-1', { value: 799 });
  assert.equal(context.takePurchaseForThankYou('CC-1').value, 799);
});
