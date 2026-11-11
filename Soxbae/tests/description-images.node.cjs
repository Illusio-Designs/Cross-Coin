const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../components/product/ProductShowcase.jsx'), 'utf8');
const start = source.indexOf('function tidyDescription(');
const end = source.indexOf('\nfunction DescriptionHtml(', start);
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
test('admin image URLs remain directly loadable without transforms or observer activation', () => {
  for (const url of ['https://ik.imagekit.io/store/infographic.png?tr=q-90&amp;v=2', 'https://api.crosscoin.in/api/uploads/products/comfort.png', 'https://cdn.example.com/uploads/comfort.png?signature=keep', '/customer-foot-comfort-statistics.png']) {
    for (const quote of ['"', "'"]) {
      const html = `<p><img src=${quote}${url}${quote} alt="Product infographic"></p>`;
      const result = context.tidyDescription(html);
      assert.ok(result.includes(`src=${quote}${url}${quote}`));
      assert.ok(result.includes('loading="lazy"'));
      assert.ok(!result.includes('data-src'));
      assert.ok(!result.includes('srcset'));
    }
  }
});
test('existing loading settings and rich description text are preserved', () => {
  const result = context.tidyDescription('<h1>About this product</h1><p>Comfort details</p><img loading="eager" src="https://cdn.example.com/p.png">');
  assert.ok(result.includes('<h3 class="rt-h1">About this product</h3>'));
  assert.ok(result.includes('<p>Comfort details</p>'));
  assert.equal((result.match(/loading=/g) || []).length, 1);
  assert.ok(result.includes('loading="eager"'));
});
