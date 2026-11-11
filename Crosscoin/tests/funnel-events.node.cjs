const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/fbqTrack.js'), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/export function /g, 'function ');
function setup() {
  const requests = [], google = [], pixel = [], timers = [], listeners = {};
  const storage = new Map([['visit_tracked', '1'], ['utm_session_id', 'visit-1'], ['fbclid', 'ad-click']]);
  const context = vm.createContext({
    window: { location: { href: 'https://www.crosscoin.in/products/socks', search: '', pathname: '/products/socks' },
      addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: (name) => { delete listeners[name]; } },
    document: { cookie: '_ga=GA1.1.123.456; _ga_TEST=GS2.1.s789$o2' },
    localStorage: { getItem: (key) => storage.get(key) },
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    process: { env: {} }, URLSearchParams, getConsent: () => ({ marketing: true }),
    gtagTrack: (...args) => google.push(args), setTimeout: (fn) => timers.push(fn),
    fetch: (url, args) => { requests.push({ url, headers: args.headers, body: JSON.parse(args.body) }); return Promise.resolve({}); },
  });
  vm.runInContext(source, context);
  return { context, requests, google, pixel, timers, listeners, storage };
}
test('early product/cart/checkout events retain one GA4, first-party and matched Meta pair', () => {
  const s = setup();
  for (const event of ['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search', 'AddToWishlist', 'AddPaymentInfo']) {
    s.context.fbqTrack(event, { content_ids: ['12'], contents: [{ id: '12', quantity: 2 }], value: 799, currency: 'INR' });
  }
  assert.equal(s.requests.length, 6);
  assert.equal(s.google.length, 5);
  s.context.window.location.href = 'https://www.crosscoin.in/other';
  s.context.window.fbq = Object.assign((...args) => s.pixel.push(args), { callMethod() {} });
  s.timers.shift()();
  assert.equal(s.pixel.length, 6);
  const relays = s.requests.filter((r) => r.url.endsWith('/api/facebook-pixel/track'));
  assert.equal(relays.length, 6);
  for (let i = 0; i < relays.length; i++) {
    assert.equal(relays[i].headers['X-Brand-Name'], 'crosscoin');
    assert.equal(relays[i].body.event_id, s.pixel[i][3].eventID);
    assert.equal(relays[i].body.event_source_url, 'https://www.crosscoin.in/products/socks');
  }
  while (s.timers.length) s.timers.shift()();
  assert.equal(s.pixel.length, 6);
  assert.equal(s.google.length, 5);
  assert.equal(s.requests.filter((r) => r.url.endsWith('/api/i/e')).length, 6);
});
test('attribution retains click, visit, GA client/session and remembered buyer', () => {
  const s = setup();
  s.storage.set('fb_am', JSON.stringify({ em: 'a'.repeat(64), ph: 'invalid' }));
  const ids = s.context.trackingIds();
  assert.match(ids.fbc, /^fb\.1\.\d+\.ad-click$/);
  assert.equal(ids.utm_session_id, 'visit-1');
  assert.equal(ids.ga_client_id, '123.456');
  assert.equal(ids.ga_session_id, '789');
  assert.equal(ids.ga_session_number, '2');
  s.context.window.fbq = () => {};
  s.context.fbqTrack('AddToCart', { value: 799 });
  const relay = s.requests.find((r) => r.url.endsWith('/api/facebook-pixel/track'));
  assert.equal(relay.body.user_data.em, 'a'.repeat(64));
  assert.equal(relay.body.user_data.ph, undefined);
});
test('Purchase fires once with server event ID, without another GA4 or CAPI purchase', async () => {
  const s = setup();
  s.context.window.fbq = Object.assign((...args) => s.pixel.push(args), { callMethod() {} });
  const pending = s.context.fbPurchase('CC-42', { value: 799, currency: 'INR' });
  s.timers.shift()();
  assert.equal(await pending, true);
  await s.context.fbPurchase('CC-42', { value: 799 });
  assert.equal(s.pixel.length, 1);
  assert.equal(s.pixel[0][3].eventID, 'Purchase_CC-42');
  assert.equal(s.google.length, 0);
  assert.equal(s.requests.length, 0);
});
test('pixel ready notification flushes page views once; polling does not repeat them', () => {
  const s = setup();
  s.context.fbqTrack('PageView', {}, { ga4: false });
  s.context.window.fbq = Object.assign((...args) => s.pixel.push(args), { callMethod() {} });
  s.listeners['brand-fbq-ready']();
  while (s.timers.length) s.timers.shift()();
  assert.equal(s.pixel.length, 1);
  assert.equal(s.requests.length, 1);
  assert.equal(s.google.length, 0);
  assert.equal(s.requests[0].body.event_name, 'PageView');
});
test('cart view records the first-party visit and Meta PageView without starting checkout', () => {
  const s = setup();
  s.context.window.fbq = Object.assign((...args) => s.pixel.push(args), { callMethod() {} });
  s.context.trackCartPageView();
  assert.equal(s.requests.filter((r) => r.body.event === 'view_cart').length, 1);
  assert.equal(s.pixel.length, 1);
  assert.equal(s.pixel[0][1], 'PageView');
  assert.equal(s.requests.some((r) => r.body.event === 'begin_checkout'), false);
});
