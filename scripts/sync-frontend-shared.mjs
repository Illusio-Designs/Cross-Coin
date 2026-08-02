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

// Shared file → { source, dest(base), brands? }  (brands omitted = all 7)
const FILES = [
  {
    source: 'shared/frontend/pixel.js',
    dest: (base) => `${base}utils/pixel.js`,
    // Crosscoin has its own tracking layer and does not use pixel.js.
    brands: ['Gripzus', 'Morbix', 'Soxbae', 'Knitwink', 'Velmique', 'Velquira'],
  },
  {
    source: 'shared/frontend/SentryInit.jsx',
    dest: (base) => `${base}components/SentryInit.jsx`,
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
    const out = banner(file.source) + template.replaceAll('__BRAND__', slug);
    const destPath = join(ROOT, brand, file.dest(base));
    let current = null;
    try { current = readFileSync(destPath, 'utf8'); } catch (_) {}
    if (current === out) continue;
    if (check) {
      console.error(`DRIFT: ${brand}/${file.dest(base)} is out of sync with ${file.source}`);
      drift++;
    } else {
      writeFileSync(destPath, out);
      console.log(`wrote ${brand}/${file.dest(base)}`);
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
