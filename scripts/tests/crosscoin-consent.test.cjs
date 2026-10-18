const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../Crosscoin/src/pages/_document.jsx'), 'utf8');
const start = source.indexOf('"(function(){var P=');
const end = source.indexOf('"})();"', start) + '"})();"'.length;
const bootstrap = vm.runInNewContext(source.slice(start, end), {
  gtmId: 'GTM-BRAND', gaId: 'G-BRAND', adsId: 'AW-BRAND', adsLabel: null,
  adsLabels: null, fbId: 'meta-brand', clarityId: 'clarity-brand',
});
function run(consent, pathname = '/') {
  const scripts = [];
  const ctx = {
    location: { pathname, reload() {} },
    localStorage: { getItem: () => JSON.stringify(consent) },
    document: { createElement: () => ({}), head: { appendChild: s => scripts.push(s.src) } },
    addEventListener() {}, dispatchEvent() {}, Event: class { constructor(type) { this.type = type; } }, requestIdleCallback: fn => fn(),
  };
  ctx.window = ctx;
  vm.runInNewContext(bootstrap, ctx);
  return { scripts, layer: ctx.dataLayer };
}
test('Crosscoin loads Google cookieless tags with all storage denied after rejection', () => {
  const { scripts, layer } = run({ analytics: false, marketing: false });
  assert.equal(scripts.length, 2);
  assert.ok(scripts.some(s => s.includes('gtm.js?id=GTM-BRAND')));
  assert.ok(scripts.some(s => s.includes('gtag/js?id=G-BRAND')));
  assert.equal(layer[0][1], 'default');
  assert.deepEqual(Array.from(Object.values(layer[1][2])), ['denied', 'denied', 'denied', 'denied']);
  assert.ok(layer.some(row => row[0] === 'config' && row[1] === 'G-BRAND'));
});
test('analytics-only acceptance leaves marketing denied and Meta off', () => {
  const { scripts, layer } = run({ analytics: true, marketing: false });
  assert.equal(layer[1][2].analytics_storage, 'granted');
  assert.equal(layer[1][2].ad_storage, 'denied');
  assert.ok(scripts.some(s => s.includes('clarity.ms')));
  assert.ok(!scripts.some(s => s.includes('facebook.net')));
});
test('excluded internal routes do not load Google tracking', () => {
  const { scripts } = run({ analytics: false, marketing: false }, '/dashboard');
  assert.equal(scripts.length, 0);
});
