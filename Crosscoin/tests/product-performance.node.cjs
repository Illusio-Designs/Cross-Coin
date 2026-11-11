const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const imageSource = fs.readFileSync(path.join(root, 'src/utils/imageUtils.js'), 'utf8').replace(/^export /gm, '');
const image = vm.createContext({ URL, process: { env: {} } });
vm.runInContext(imageSource, image);
test('both backend upload paths receive responsive transforms rather than full originals', () => {
  for (const prefix of ['/uploads/', '/api/uploads/']) {
    const url = `https://api.crosscoin.in${prefix}products/pack.png?version=2`;
    assert.equal(image.ikTransform(url, 640), `https://api.crosscoin.in${prefix}products/pack.png?tr=w-640,q-72,f-auto&version=2`);
    assert.ok(image.ikSrcSet(url, [480, 640]).includes('640w'));
  }
});
test('CDN transforms preserve other URL parameters and replace old transforms', () => {
  assert.equal(image.ikTransform('https://ik.imagekit.io/store/p.png?v=2&tr=w-200#photo', 800), 'https://ik.imagekit.io/store/p.png?tr=w-800,q-72,f-auto&v=2#photo');
  const external = 'https://other.example/api/uploads/signed.png?signature=original';
  assert.equal(image.ikTransform(external, 800), external);
});
test('responsive copies retain artwork while each stays below a tenth of original size', () => {
  const original = fs.statSync(path.join(root, 'public/crosscoin-socks-comparison.png')).size;
  for (const width of [640, 960, 1600]) {
    const file = fs.readFileSync(path.join(root, `public/crosscoin-socks-comparison-${width}.webp`));
    assert.equal(file.toString('ascii', 8, 12), 'WEBP');
    assert.ok(file.length < original / 10);
  }
});
const layout = fs.readFileSync(path.join(root, 'src/components/test/TestLayout.jsx'), 'utf8');
const leadStart = layout.indexOf('  useEffect(() => {', layout.indexOf('// Start the lead offer'));
const leadEnd = layout.indexOf('\n  const submitLead', leadStart);
function popup(drawer = false, route = '/products/socks') {
  const listeners = new Map(), timers = [];
  let opened = false;
  const context = vm.createContext({ drawer, router: { asPath: route },
    localStorage: { getItem: () => null }, document: { visibilityState: 'visible' },
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) },
    useEffect: (effect) => effect(), setTimeout: (fn) => timers.push(fn), clearTimeout() {},
    setLead: (update) => { opened = update({ open: false }).open; },
  });
  vm.runInContext(layout.slice(leadStart, leadEnd), context);
  return { listeners, timers, opened: () => opened };
}
test('untouched landing page schedules no popup; interacting arms one delayed offer', () => {
  const s = popup();
  assert.equal(s.timers.length, 0);
  s.listeners.get('pointerdown')();
  assert.equal(s.timers.length, 1);
  assert.equal(s.listeners.size, 0);
  s.timers[0]();
  assert.equal(s.opened(), true);
});
test('checkout and confirmation pages do not arm a lead popup', () => {
  for (const s of [popup(true), popup(false, '/order-confirmation?oid=fixture'), popup(false, '/thank-you')]) {
    assert.equal(s.listeners.size, 0);
    assert.equal(s.timers.length, 0);
  }
});
