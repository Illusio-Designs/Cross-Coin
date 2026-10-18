const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../..');
function browser() {
  const events = [];
  const context = {
    process: { env: {} },
    window: { __brandGa4Ready: true, gtag: (...args) => events.push(args), location: { pathname: '/' }, addEventListener() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    fetch: async () => ({}),
  };
  vm.createContext(context);
  return { events, context };
}
const payload = { content_ids: ['11'], contents: [{ id: '11', quantity: 2 }], content_name: 'Socks', value: 598, currency: 'INR' };
for (const brand of ['Morbix', 'Soxbae', 'Knitwink', 'Velmique', 'Velquira', 'Gripzus']) {
  test(`${brand}: Google ecommerce events work independently of the Meta pixel`, () => {
    const { context, events } = browser();
    const file = `${brand}/${brand === 'Gripzus' ? 'src/' : ''}utils/pixel.js`;
    const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/export /g, '');
    vm.runInContext(source + '\nglobalThis.api = { fbTrack, viewCart, addShippingInfo, addPaymentInfo, fbPurchase };', context);
    const api = context.api;
    api.fbTrack('ViewContent', payload);
    api.fbTrack('AddToCart', payload);
    api.viewCart(payload);
    api.fbTrack('InitiateCheckout', payload);
    api.addShippingInfo(payload);
    api.addPaymentInfo(payload);
    api.fbPurchase('TEST-ORDER-1', payload);
    assert.deepEqual(events.map(row => row[1]), ['view_item', 'add_to_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase']);
    assert.ok(events.every(row => row[2].currency === 'INR' && row[2].value === 598));
    assert.equal(events.at(-1)[2].transaction_id, 'TEST-ORDER-1');
    assert.equal(events.at(-1)[2].items[0].quantity, 2);
  });
}
test('Crosscoin: its separate utilities send Google funnel and purchase events', () => {
  const { context, events } = browser();
  for (const file of ['Crosscoin/src/utils/gtagTrack.js', 'Crosscoin/src/utils/fbqTrack.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8').replace(/export /g, '').replace("import { gtagTrack } from './gtagTrack';", ''), context);
  }
  context.payload = payload;
  vm.runInContext("fbqTrack('ViewContent', payload); fbqTrack('AddToCart', payload); fbqTrack('InitiateCheckout', payload); gtagTrack('purchase', {transaction_id:'TEST-CROSS-1', value:598, currency:'INR'});", context);
  assert.deepEqual(events.map(row => row[1]), ['view_item', 'add_to_cart', 'begin_checkout', 'purchase']);
});

for (const brand of ['Morbix', 'Soxbae', 'Knitwink', 'Velmique', 'Velquira', 'Gripzus']) {
  test(`${brand}: early page views and shopping events flush once after GA4 initializes`, () => {
    const { context, events } = browser();
    const listeners = new Map();
    context.window.gtag = null;
    context.window.__brandGa4Ready = false;
    context.window.addEventListener = (name, fn) => listeners.set(name, fn);
    const file = `${brand}/${brand === 'Gripzus' ? 'src/' : ''}utils/pixel.js`;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8').replace(/export /g, ''), context);
    context.payload = payload;
    vm.runInContext("trackPageView('/products'); trackPageView('/products'); fbTrack('ViewContent', payload); fbTrack('AddToCart', payload); viewCart(payload);", context);
    assert.equal(events.length, 0);
    context.window.gtag = (...args) => events.push(args);
    context.window.__brandGa4Ready = true;
    listeners.get('brand-ga4-ready')();
    listeners.get('brand-ga4-ready')();
    assert.deepEqual(events.map(row => row[1]), ['page_view', 'view_item', 'add_to_cart', 'view_cart']);
    vm.runInContext("trackPageView('/collections'); trackPageView('/collections'); trackPageView('/products');", context);
    assert.equal(events.filter(row => row[1] === 'page_view').length, 3);
  });
}
test('Crosscoin cart emits one begin_checkout while keeping the Meta checkout event', () => {
  const { context, events } = browser();
  const metaEvents = [];
  context.window.fbq = (...args) => metaEvents.push(args);
  context.window.location.href = 'https://crosscoin.in';
  context.document = { cookie: '' };
  for (const file of ['Crosscoin/src/utils/gtagTrack.js', 'Crosscoin/src/utils/fbqTrack.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8').replace(/export /g, '').replace("import { gtagTrack } from './gtagTrack';", ''), context);
  }
  const cart = fs.readFileSync(path.join(root, 'Crosscoin/src/components/cart/CartDrawer.jsx'), 'utf8');
  const start = cart.indexOf("    fbqTrack('InitiateCheckout', {");
  const end = cart.indexOf("    gtagAdsConversion('begin_checkout'", start);
  context.activeItems = [{ id: 11, quantity: 2, name: 'Socks' }];
  context.activeTotal = 598;
  context.getPrice = () => 299;
  vm.runInContext('(function(){' + cart.slice(start, end) + '})();', context);
  assert.equal(events.filter(row => row[1] === 'begin_checkout').length, 1);
  assert.equal(metaEvents.filter(row => row[1] === 'InitiateCheckout').length, 1);
});
test('Crosscoin buffers early purchases and deduplicates them even when storage is blocked', () => {
  const { context, events } = browser();
  const listeners = new Map();
  context.window.gtag = null;
  context.window.__brandGa4Ready = false;
  context.window.addEventListener = (name, fn) => listeners.set(name, fn);
  context.sessionStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  vm.runInContext(fs.readFileSync(path.join(root, 'Crosscoin/src/utils/gtagTrack.js'), 'utf8').replace(/export /g, ''), context);
  vm.runInContext("gtagTrack('add_to_cart', {value:299}); gtagTrack('purchase', {transaction_id:'CROSS-101'}); gtagTrack('purchase', {transaction_id:'CROSS-101'});", context);
  assert.equal(events.length, 0);
  context.window.gtag = (...args) => events.push(args);
  context.window.__brandGa4Ready = true;
  listeners.get('brand-ga4-ready')();
  listeners.get('brand-ga4-ready')();
  assert.deepEqual(events.map(row => row[1]), ['add_to_cart', 'purchase']);
  context.window.location.pathname = '/dashboard';
  vm.runInContext("gtagTrack('page_view', {});", context);
  assert.equal(events.length, 2);
});
