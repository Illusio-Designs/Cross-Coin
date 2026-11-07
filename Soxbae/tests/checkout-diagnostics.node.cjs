const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../lib/checkoutDiagnostics.js'), 'utf8').replace(/^export /gm, '');
function setup(href) {
  const storage = new Map(); const url = new URL(href);
  const context = vm.createContext({ URL, Event,
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    window: { location: { href, origin: url.origin, pathname: url.pathname }, dispatchEvent() {}, history: { state: {}, replaceState(state, title, next) { context.window.location.href = next; } } },
  });
  vm.runInContext(source, context);
  return { context, storage };
}
test('normal visits do not record diagnostic data', () => {
  const { context, storage } = setup('https://www.soxbae.com/products/socks');
  context.startCheckoutDiagnostic('buy-now'); context.checkoutDiagnosticStep('token_response', { tokenPresent: true });
  assert.equal(storage.size, 0);
});
test('debug report stores safe stage metadata and rejects raw tokens, bodies and customer details', () => {
  const { context } = setup('https://www.soxbae.com/products/socks?checkout_debug=1&email=private@example.test');
  context.startCheckoutDiagnostic('buy-now');
  context.checkoutDiagnosticStep('token_response', { httpStatus: 200, tokenPresent: true, token: 'secret-token', email: 'private@example.test', response: { key: 'secret-key' } });
  const report = JSON.stringify(context.readCheckoutDiagnostic());
  assert.ok(report.includes('token_response')); assert.ok(report.includes('www.soxbae.com'));
  for (const value of ['secret-token', 'private@example.test', 'secret-key', '"response":']) assert.ok(!report.includes(value));
});
test('fallback URL removes repeated provider parameters while preserving test mode and product selection', () => {
  const { context } = setup('https://www.soxbae.com/products/socks');
  const url = new URL(context.checkoutFallbackUrl('https://www.soxbae.com/products/socks?checkout_debug=1&color=Black&attributes[fastrr_redirect]=1&attributes[fastrr_redirect_uuid]=abc&attributes[fastrr_redirect_uuid]=def&attributes[fastrr_redirect_time]=now'));
  assert.equal(url.searchParams.get('checkout_debug'), '1'); assert.equal(url.searchParams.get('color'), 'Black');
  assert.ok(!url.searchParams.has('attributes[fastrr_redirect_uuid]'));
  assert.ok(!url.searchParams.has('attributes[fastrr_redirect_time]'));
});
test('provider return keeps original stages across reload and records safe provider references', () => {
  const { context } = setup('https://www.soxbae.com/products/socks?checkout_debug=1');
  context.startCheckoutDiagnostic('cart'); context.checkoutDiagnosticStep('sdk_open_requested');
  context.window.location.href += '&attributes[fastrr_redirect]=1&attributes[fastrr_redirect_uuid]=79d5427d';
  context.recordCheckoutReturn();
  const report = context.readCheckoutDiagnostic();
  assert.equal(report.source, 'cart'); assert.equal(report.stages[0].stage, 'sdk_open_requested');
  assert.equal(report.providerReturned, true); assert.equal(report.redirectIds[0], '79d5427d');
  assert.equal(new URL(context.window.location.href).searchParams.get('checkout_debug'), '1');
  assert.ok(!context.window.location.href.includes('fastrr_redirect'));
});
