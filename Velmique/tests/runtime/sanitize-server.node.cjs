// Exercise the real server dependency. The existing Jest smoke tests mock it
// and cannot catch an import-time ERR_REQUIRE_ESM that blanks the storefront.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const DOMPurify = require('isomorphic-dompurify');
for (const file of ['sanitizeHtml.js', 'richHtml.js']) {
  test(`${file}: actual server sanitizer loads, preserves product markup and blocks executable HTML`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../../lib', file), 'utf8')
      .replace(/^import DOMPurify from .*;\n/, '').replace(/^export /gm, '');
    const context = vm.createContext({ DOMPurify });
    vm.runInContext(source, context);
    const html = context.sanitizeRich('<h2>Product details</h2><p>Perfume notes</p><img src="https://example.com/perfume.png" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">Unsafe link</a>');
    assert.ok(html.includes('<h2>Product details</h2>'));
    assert.ok(html.includes('<p>Perfume notes</p>'));
    assert.ok(html.includes('https://example.com/perfume.png'));
    assert.ok(!/onerror|<script|javascript:/i.test(html));
    assert.equal(context.richHtml('<p>Safe</p>').dangerouslySetInnerHTML.__html, '<p>Safe</p>');
  });
}
