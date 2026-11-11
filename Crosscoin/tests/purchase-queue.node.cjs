const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const file = fs.readFileSync(path.join(__dirname, '../src/utils/fbqTrack.js'), 'utf8');
const source = file.slice(file.indexOf('const pendingPurchases =')).replace('export function', 'function');
function setup() {
  const calls = [], timers = [], storage = new Map();
  const context = vm.createContext({ window: {}, sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    hasMarketingConsent: () => true, setTimeout: (fn) => { timers.push(fn); },
    fbqTrack: (event, params, options) => { calls.push({ event, params, options }); return true; } });
  vm.runInContext(source, context); return { context, calls, timers, storage };
}
test('late pixel still receives one Purchase and only then marks it sent', async () => {
  const { context, calls, timers, storage } = setup();
  const a = context.fbPurchase('CC-1', { value: 799 }); const b = context.fbPurchase('CC-1', { value: 799 });
  assert.equal(a, b); timers.shift()(); assert.equal(calls.length, 0); assert.equal(storage.size, 0);
  context.window.fbq = Object.assign(() => {}, { callMethod() {} }); timers.shift()(); assert.equal(await a, true);
  assert.equal(calls.length, 1); assert.equal(calls[0].options.eventID, 'Purchase_CC-1'); assert.equal(calls[0].params.order_id, 'CC-1');
  await context.fbPurchase('CC-1', { value: 799 }); assert.equal(calls.length, 1);
});
test('missing order reference never schedules or sends Purchase', async () => {
  const { context, timers, calls } = setup(); assert.equal(await context.fbPurchase('', {}), false);
  assert.equal(timers.length, 0); assert.equal(calls.length, 0);
});

test('queue-only stub does not count as a sent Purchase', async () => {
  const { context, calls, timers, storage } = setup();
  context.window.fbq = () => {};
  const pending = context.fbPurchase('CC-stub', { value: 799 });
  timers.shift()();
  assert.equal(calls.length, 0); assert.equal(storage.size, 0);
  context.window.fbq.callMethod = () => {};
  timers.shift()();
  assert.equal(await pending, true); assert.equal(calls.length, 1);
});
