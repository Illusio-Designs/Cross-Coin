#!/usr/bin/env node
/**
 * sync-frontend-shared — single source of truth for frontend code that is
 * otherwise copy-pasted across the 7 storefronts.
 *
 * WHY A CODEGEN SCRIPT (not a shared npm package): each storefront is a
 * SEPARATE Vercel project whose Root Directory is its own folder, so a build
 * for e.g. Morbix/ cannot import files outside Morbix/. A real shared package
 * would need workspace + Vercel dashboard changes on all 7 projects at once,
 * with no staging to catch a mistake. Instead we keep ONE canonical copy in
 * shared/frontend/ and stamp it into every brand folder. Each brand still owns
 * its file on disk, so every build is byte-identical to before — zero deploy
 * risk — while there is only one place to edit.
 *
 * Usage:
 *   node scripts/sync-frontend-shared.mjs          # write brand copies
 *   node scripts/sync-frontend-shared.mjs --check   # exit 1 if any copy drifted
 *
 * After editing anything in shared/frontend/, run this and commit the result.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

// Per-brand: slug (X-Brand-Name / tag) + folder base ('src/' for pages-router).
const BRANDS = {
  Crosscoin: { slug: 'crosscoin', base: 'src/' },
  Gripzus:   { slug: 'gripzus',   base: 'src/' },
  Morbix:    { slug: 'morbix',    base: '' },
  Soxbae:    { slug: 'soxbae',    base: '' },
  Knitwink:  { slug: 'knitwink',  base: '' },
  Velmique:  { slug: 'velmique',  base: '' },
  Velquira:  { slug: 'velquira',  base: '' },
};

// Edge request-hook file name per brand, by installed Next.js major version:
// Knitwink is on Next 16 (`proxy`), the rest on 14/15 (`middleware`).
const EDGE_FILE = {
  Crosscoin: 'middleware', Gripzus: 'middleware', Morbix: 'middleware', Soxbae: 'middleware',
  Velmique: 'middleware', Velquira: 'middleware', Knitwink: 'proxy',
};

// Retired mixed-case page paths per brand → their lowercase replacements
// (redirected 301 by the edge file; see shared/frontend/visitCounter.js).
const LEGACY_PATHS = {
  Crosscoin: {
    '/Products': '/products', '/Collections': '/collections', '/Wishlist': '/wishlist',
    '/SearchResults': '/search', '/OrderTracking': '/track-order', '/Contact': '/contact', '/About': '/about',
  },
};

// Shared file → { source, dest(base, brand), brands?, vars?(brand) }
// (brands omitted = all 7; vars = extra placeholder → value replacements)
const FILES = [
  {
    source: 'shared/frontend/GoogleTagManager.jsx',
    dest: (base) => `${base}components/GoogleTagManager.jsx`,
    brands: ['Gripzus', 'Morbix', 'Soxbae', 'Knitwink', 'Velmique', 'Velquira'],
  },
  {
    source: 'shared/frontend/googleTagManager.mjs',
    dest: (base) => `${base}utils/googleTagManager.mjs`,
    brands: ['Gripzus', 'Morbix', 'Soxbae', 'Knitwink', 'Velmique', 'Velquira'],
  },
  {
    source: 'shared/frontend/pixel.js',
    dest: (base) => `${base}utils/pixel.js`,
    // Crosscoin has its own tracking layer and does not use pixel.js.
    brands: ['Gripzus', 'Morbix', 'Soxbae', 'Knitwink', 'Velmique', 'Velquira'],
  },
  {
    // Customer-facing order / payment / return status labels (all 7).
    source: 'shared/frontend/orderStatus.js',
    dest: (base) => `${base}utils/orderStatus.js`,
  },
  {
    source: 'shared/frontend/SentryInit.jsx',
    dest: (base) => `${base}components/SentryInit.jsx`,
  },
  {
    // WhatsApp abandoned-cart recovery link: read ?recover/&cart, fetch the
    // server-side cart by token, build the capture items (all 7).
    source: 'shared/frontend/cartRecovery.js',
    dest: (base) => `${base}utils/cartRecovery.js`,
  },
  {
    // Edge visit counter (POST /api/i/v on every real page load), placed next
    // to app/ or pages/. Next 16 renamed the middleware file convention to
    // `proxy` (export `proxy`); Next 14/15 use `middleware`.
    source: 'shared/frontend/visitCounter.js',
    dest: (base, brand) => `${base}${EDGE_FILE[brand]}.js`,
    vars: (brand) => ({ __HANDLER__: EDGE_FILE[brand], __LEGACY_PATHS__: JSON.stringify(LEGACY_PATHS[brand] || {}) }),
  },
];

const banner = (source) =>
  `// @generated — DO NOT EDIT. Source: ${source}\n` +
  `// Edit that file then run: node scripts/sync-frontend-shared.mjs\n`;

let drift = 0;
let wrote = 0;

for (const file of FILES) {
  const template = readFileSync(join(ROOT, file.source), 'utf8');
  const brands = file.brands || Object.keys(BRANDS);
  for (const brand of brands) {
    const { slug, base } = BRANDS[brand];
    let body = template.replaceAll('__BRAND__', slug);
    for (const [k, v] of Object.entries(file.vars ? file.vars(brand) : {})) body = body.replaceAll(k, v);
    const out = banner(file.source) + body;
    const rel = file.dest(base, brand);
    const destPath = join(ROOT, brand, rel);
    let current = null;
    try { current = readFileSync(destPath, 'utf8'); } catch (_) {}
    if (current === out) continue;
    if (check) {
      console.error(`DRIFT: ${brand}/${rel} is out of sync with ${file.source}`);
      drift++;
    } else {
      writeFileSync(destPath, out);
      console.log(`wrote ${brand}/${rel}`);
      wrote++;
    }
  }
}

if (check) {
  if (drift) { console.error(`\n${drift} file(s) out of sync — run: node scripts/sync-frontend-shared.mjs`); process.exit(1); }
  console.log('All brand copies are in sync with shared/frontend/.');
} else {
  console.log(wrote ? `\nSynced ${wrote} file(s).` : 'Already up to date.');
}
