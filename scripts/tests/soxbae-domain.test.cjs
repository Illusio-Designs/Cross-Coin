const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../..');

test('Soxbae feed emits product and channel links on soxbae.com', async () => {
  const source = fs.readFileSync(path.join(root, 'Soxbae/lib/productFeed.js'), 'utf8')
    .replace('export async function feedResponse', 'async function feedResponse');
  const context = { process: { env: {} }, Response, fetch: async (_, options) => {
    assert.equal(options.headers['X-Brand-Name'], 'soxbae');
    return { ok: true, json: async () => ({ data: { products: [{ id: 7, slug: 'ankle-socks', name: 'Ankle socks', image: 'https://example.com/socks.jpg', variations: [{ id: 9, price: 199, stock: 3 }] }] } }) };
  } };
  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.feed = feedResponse;', context);
  const xml = await (await context.feed()).text();
  const productLinks = [...xml.matchAll(/<g:link>(.*?)<\/g:link>/g)].map(match => match[1]);
  assert.ok(productLinks.length > 0, 'feed must contain a product');
  for (const link of productLinks) assert.equal(new URL(link).origin, 'https://soxbae.com');
  assert.ok(xml.includes('<link>https://soxbae.com</link>'));
  assert.ok(!xml.includes('soxbaesocks.com'));
});

test('Soxbae deployment and robots use the same website domain', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'Soxbae/vercel.json'), 'utf8'));
  for (const env of [config.env, config.build.env]) {
    assert.equal(env.NEXT_PUBLIC_SITE_URL, 'https://soxbae.com');
    assert.equal(env.NEXT_PUBLIC_FRONTEND_URL, 'https://soxbae.com');
  }
  const source = fs.readFileSync(path.join(root, 'Soxbae/app/robots.js'), 'utf8').replace('export default function robots', 'function robots');
  const context = { process: { env: {} } };
  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.result = robots();', context);
  assert.equal(context.result.sitemap, 'https://soxbae.com/sitemap.xml');
  assert.equal(context.result.host, 'https://soxbae.com');
});
