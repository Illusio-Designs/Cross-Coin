const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/_document.jsx'), 'utf8');
const start = source.indexOf('"(function(){var P=');
const end = source.indexOf('"})();"', start) + '"})();"'.length;
const bootstrap = vm.runInNewContext(source.slice(start, end), {
  gtmId: null, gaId: 'G-FIXTURE', adsId: null, adsLabel: null, adsLabels: null, fbId: 'pixel-fixture', clarityId: null,
});
function setup(pathname) {
  const scripts = [], timers = [], listeners = new Map();
  const context = {
    location: { pathname, search: '' },
    localStorage: { getItem: () => null },
    document: { createElement: () => ({}), head: { appendChild: (s) => scripts.push(s.src) } },
    addEventListener: (name, fn) => listeners.set(name, fn),
    dispatchEvent: (event) => listeners.get(event.type)?.(),
    Event: class { constructor(type) { this.type = type; } }, setTimeout: (fn) => timers.push(fn),
  };
  context.window = context;
  vm.runInNewContext(bootstrap, context);
  return { context, scripts, listeners, timers };
}
for (const pathname of ['/order-confirmation', '/thank-you', '/test/thank-you']) {
  test(`${pathname}: loads real conversion scripts without a tap or 20-second delay`, () => {
    const s = setup(pathname);
    assert.equal(s.scripts.filter((url) => url.includes('fbevents.js')).length, 1);
    assert.equal(s.scripts.filter((url) => url.includes('gtag/js')).length, 1);
    assert.equal(s.timers.length, 0);
  });
}
test('normal pages stay deferred; verified Purchase wakes loader only once', () => {
  const s = setup('/products/socks');
  assert.equal(s.scripts.length, 0);
  s.context.dispatchEvent(new s.context.Event('brand-purchase-ready'));
  s.context.dispatchEvent(new s.context.Event('brand-purchase-ready'));
  for (const fn of s.timers) fn();
  assert.equal(s.scripts.filter((url) => url.includes('fbevents.js')).length, 1);
  assert.equal(s.scripts.filter((url) => url.includes('gtag/js')).length, 1);
});
