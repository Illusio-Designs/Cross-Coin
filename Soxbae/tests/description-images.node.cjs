const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../components/product/ProductShowcase.jsx'), 'utf8');
const start = source.indexOf('function tidyDescription(');
const end = source.indexOf('\n// Soxbae PDP', start);
const context = vm.createContext({});
const helper = fs.readFileSync(path.join(__dirname, '../lib/descriptionImages.js'), 'utf8').replace(/^export /gm, '');
vm.runInContext(helper + source.slice(start, end), context);
test('stored URLs stay available and only unsigned API uploads get responsive copies', () => {
  for (const url of ['https://ik.imagekit.io/store/infographic.png?tr=q-90&amp;v=2', 'https://api.crosscoin.in/api/uploads/products/comfort.png', 'https://cdn.example.com/uploads/comfort.png?signature=keep', 'https://api.crosscoin.in/api/uploads/products/comfort.png?signature=keep', '/customer-foot-comfort-statistics.png']) {
    for (const quote of ['"', "'"]) {
      const html = `<p><img src=${quote}${url}${quote} alt="Product infographic"></p>`;
      const result = context.withLazyDescriptionImages(context.tidyDescription(html));
      assert.ok(result.includes(`src=${quote}${url}${quote}`));
      assert.ok(result.includes('loading="lazy"'));
      assert.ok(!result.includes('data-src'));
      assert.equal(result.includes('srcset'), url.startsWith('https://api.crosscoin.in/api/uploads/') && !url.includes('?'));
    }
  }
});
test('existing loading settings and rich description text are preserved', () => {
  const result = context.withLazyDescriptionImages(context.tidyDescription('<h1>About this product</h1><p>Comfort details</p><img loading="eager" src="https://cdn.example.com/p.png">'));
  assert.ok(result.includes('<h3 class="rt-h1">About this product</h3>'));
  assert.ok(result.includes('<p>Comfort details</p>'));
  assert.equal((result.match(/loading=/g) || []).length, 1);
  assert.ok(result.includes('loading="eager"'));
});

test('description image loading works with legacy quotes and preserves responsive classes and dimensions', () => {
  const image = `<img alt='A > B; loading="caption text"' class="rte-img only-mobile" height="1800" width="1040" src='/chart.png'>`;
  const html = context.withLazyDescriptionImages(image);
  assert.ok(html.includes('loading="lazy"'));
  assert.ok(html.includes('fetchpriority="low"'));
  assert.ok(html.includes('decoding="async"'));
  assert.ok(html.includes(image.slice(4)));
});
