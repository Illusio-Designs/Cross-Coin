#!/usr/bin/env node
/**
 * gen-product-feeds — generate the Google Merchant + Meta Commerce product feed
 * routes for every storefront from one set of templates.
 *
 * Each brand exposes two URLs that serve the SAME RSS 2.0 (g: namespace) feed
 * (Google Merchant Center and Meta both accept it):
 *   /google-merchant.xml   and   /facebook-catalog.xml
 *
 * App-router brands get lib/productFeed.js + two thin Route Handlers; the
 * pages-router brand (Gripzus) gets a getServerSideProps page + a re-export.
 * Crosscoin is the hand-tuned reference (own product category) and is left
 * alone. Brand differences are only the slug / domain / display name.
 *
 * Usage:  node scripts/gen-product-feeds.mjs
 * After editing a template in scripts/feed-templates/, re-run and commit.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const libTpl = readFileSync(join(ROOT, 'scripts/feed-templates/productFeed.template.js'), 'utf8');
const pageTpl = readFileSync(join(ROOT, 'scripts/feed-templates/gm-page.template.js'), 'utf8');

const sub = (tpl, slug, domain, name) =>
  tpl.replaceAll('__SLUG__', slug).replaceAll('__DOMAIN__', domain).replaceAll('__NAME__', name);

const routeFile = (label, path) =>
  `// ${label} product feed → /${path}\n` +
  `// Google Merchant Center + Meta Commerce both accept this RSS 2.0 (g:) feed.\n` +
  `import { feedResponse } from '../../lib/productFeed';\n\n` +
  `export const dynamic = 'force-dynamic';\n\n` +
  `export async function GET() {\n  return feedResponse();\n}\n`;

const fbReexport =
  `/**\n` +
  ` * Meta / Facebook Commerce catalog feed → /facebook-catalog.xml\n` +
  ` * Same feed as /google-merchant.xml (Meta accepts the Google product-feed\n` +
  ` * format), under a Meta-friendly URL. Single source: re-exports the Google route.\n` +
  ` */\n` +
  `export { getServerSideProps, default } from './google-merchant.xml.js';\n`;

// App-router brands: [dir, slug, domain, displayName]
const APP = [
  ['Morbix',   'morbix',   'www.morbixsocks.com', 'Morbix'],
  ['Soxbae',   'soxbae',   'www.soxbaesocks.com', 'Soxbae'],
  ['Knitwink', 'knitwink', 'knitwink.com',        'Knitwink'],
  ['Velmique', 'velmique', 'velmique.com',        'Velmique'],
  ['Velquira', 'velquira', 'www.velquira.in',     'Velquira'],
];
// Pages-router brands (Crosscoin is the hand-tuned reference — not generated).
const PAGES = [
  ['Gripzus', 'gripzus', 'gripzus.com', 'Gripzus'],
];

const write = (p, c) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, c); console.log('wrote', p.replace(ROOT + '/', '')); };

for (const [dir, slug, domain, name] of APP) {
  write(join(ROOT, dir, 'lib/productFeed.js'), sub(libTpl, slug, domain, name));
  write(join(ROOT, dir, 'app/google-merchant.xml/route.js'), routeFile('Google Merchant', 'google-merchant.xml'));
  write(join(ROOT, dir, 'app/facebook-catalog.xml/route.js'), routeFile('Meta / Facebook catalog', 'facebook-catalog.xml'));
}
for (const [dir, slug, domain, name] of PAGES) {
  write(join(ROOT, dir, 'src/pages/google-merchant.xml.js'), sub(pageTpl, slug, domain, name));
  write(join(ROOT, dir, 'src/pages/facebook-catalog.xml.js'), fbReexport);
}
console.log('\nDone. Crosscoin is the hand-tuned reference and was not touched.');
