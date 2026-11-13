const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../..');
function load(folder, brand, origin) {
  const requests = [], openings = [];
  const rel = folder === 'Crosscoin' ? 'src/lib/shiprocketCheckout.js' : folder === 'Gripzus' ? 'src/services/shiprocketCheckout.js' : 'lib/api/shiprocketCheckout.js';
  const source = fs.readFileSync(path.join(root, folder, rel), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const context = vm.createContext({
    process: { env: { NEXT_PUBLIC_BRAND_NAME: brand } }, URL, URLSearchParams,
    API_URL: 'https://api.crosscoin.in', BRAND: brand,
    trackingIds: () => ({ fbp: 'fixture-fbp', ga_client_id: '123.456', utm_session_id: 'fixture-visit', marketing_consent: true }),
    startCheckoutDiagnostic() {}, checkoutDiagnosticStep() {}, checkoutFallbackUrl: (url) => url,
    window: { location: { origin, href: origin + '/products/socks' }, HeadlessCheckout: { addToCart: (...args) => openings.push(args) } },
    sessionStorage: { setItem() {} },
    fetch: async (url, args) => { requests.push({ url, args }); return { ok: true, status: 200, json: async () => ({ success: true, result: { token: 'fixture-token' } }) }; },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../shared/frontend/buyingFlow.js'), 'utf8').replace(/^export /gm, ''), context);
  vm.runInContext(source, context);
  return { open: context.openShiprocketCheckout, requests, openings };
}
for (const source of ['buy-now', 'cart']) {
  for (const quantity of [1, 2, 3]) {
    test(`${source}, quantity ${quantity}: same provider contract on all seven stores`, async () => {
      let reference;
      for (const [folder, brand, origin] of [['Morbix','morbix','https://www.morbixsocks.com'],['Soxbae','soxbae','https://www.soxbae.com'],['Crosscoin','crosscoin','https://www.crosscoin.in'],['Knitwink','knitwink','https://knitwink.com'],['Velmique','velmique','https://velmique.co.in'],['Velquira','velquira','https://velquira.in'],['Gripzus','gripzus','https://gripzus.com']]) {
        const c = load(folder, brand, origin);
        await c.open({ preventDefault() {}, stopPropagation() {} }, [{ variationId: 696, quantity }], source);
        assert.equal(c.requests.length, 1);
        assert.equal(c.openings.length, 1);
        const { url, args } = c.requests[0];
        const body = JSON.parse(args.body);
        assert.equal(url, 'https://api.crosscoin.in/api/custom-checkout/token');
        assert.equal(args.headers['X-Brand-Name'], brand);
        assert.equal(body.redirect_url, origin + '/order-confirmation');
        assert.equal(c.openings[0][1], 'fixture-token');
        assert.equal(c.openings[0][2].fallbackUrl, origin + '/products/socks');
        delete body.redirect_url;
        if (reference) assert.deepEqual(body, reference); else reference = body;
      }
    });
  }
}
