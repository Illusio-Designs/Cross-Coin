const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function tracker({ ready = true, blockedStorage = false } = {}) {
  const events = [];
  const listeners = new Map();
  const stored = new Map();
  const window = { __brandGa4Ready: ready, addEventListener: (name, fn) => listeners.set(name, fn) };
  if (ready) window.gtag = (...args) => events.push(args);
  const source = fs.readFileSync(path.join(__dirname, '../../shared/frontend/pixel.js'), 'utf8').replace(/export /g, '');
  const context = { window, process: { env: {} }, sessionStorage: {
    getItem(key) { if (blockedStorage) throw new Error('blocked'); return stored.get(key); },
    setItem(key, value) { if (blockedStorage) throw new Error('blocked'); stored.set(key, value); },
  } };
  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.purchase = fbPurchase;', context);
  return { events, purchase: context.purchase, ready() {
    window.gtag = (...args) => events.push(args);
    window.__brandGa4Ready = true;
    listeners.get('brand-ga4-ready')?.();
  } };
}
test('storage denial does not drop or duplicate a GA4 purchase', () => {
  const t = tracker({ blockedStorage: true });
  t.purchase('MOR-101', { value: 599 });
  t.purchase('MOR-101', { value: 599 });
  assert.equal(t.events.length, 1);
  assert.equal(t.events[0][1], 'purchase');
  assert.equal(t.events[0][2].transaction_id, 'MOR-101');
  assert.equal(t.events[0][2].value, 599);
});
test('purchase before GA4 initialization is delivered once after readiness', () => {
  const t = tracker({ ready: false });
  t.purchase('MOR-102', { value: 799 });
  t.purchase('MOR-102', { value: 799 });
  assert.equal(t.events.length, 0);
  t.ready();
  t.ready();
  assert.equal(t.events.length, 1);
  assert.equal(t.events[0][2].transaction_id, 'MOR-102');
});
test('placeholder order numbers do not create purchases', () => {
  const t = tracker();
  t.purchase('—', { value: 1 });
  t.purchase(null, { value: 1 });
  assert.equal(t.events.length, 0);
});
