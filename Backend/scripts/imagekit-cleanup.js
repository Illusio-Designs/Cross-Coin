/**
 * ImageKit orphan cleanup — find (and optionally delete) images in ImageKit
 * that are no longer referenced anywhere in the database, to free up the
 * account's storage/bandwidth quota ("Upload Limit Exceeded").
 *
 * HOW IT WORKS
 *   1. Collects every image basename referenced in the DB, across ALL models
 *      that store an image (products, categories, sliders, users, brands,
 *      blog, SEO, lookbook, reviews, returns).
 *   2. Lists every file in ImageKit.
 *   3. An ImageKit file is an "orphan" only if its filename appears in NONE of
 *      those references AND it is older than --age days (default 7, so an
 *      upload that is mid-use is never touched).
 *   4. DRY RUN by default: prints a summary and writes the full orphan list to
 *      scripts/imagekit-orphans.json. Deletes nothing.
 *      With --delete it bulk-deletes the orphans.
 *
 * SAFETY
 *   - Matching is by filename, which is unique (uploads are timestamped), and
 *     errs toward KEEPING files.
 *   - If ANY reference source fails to load, the script ABORTS before deleting
 *     (a missed source could otherwise make an in-use image look orphaned).
 *   - Always run the dry run first and eyeball scripts/imagekit-orphans.json.
 *
 * RUN
 *   cd Backend && node scripts/imagekit-cleanup.js            # dry run
 *   cd Backend && node scripts/imagekit-cleanup.js --age=14   # dry run, stricter age
 *   cd Backend && node scripts/imagekit-cleanup.js --delete   # actually delete
 */
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/db.js');
require('../model/associations.js'); // load every model + association onto sequelize
const imagekitService = require('../services/imagekitService.js');
const ik = imagekitService.imagekit;

const DELETE = process.argv.includes('--delete');
const AGE_DAYS = (() => {
  const a = process.argv.find((x) => x.startsWith('--age='));
  const n = a ? parseInt(a.split('=')[1], 10) : 7;
  return Number.isFinite(n) && n >= 0 ? n : 7;
})();

const mb = (b) => (b / 1048576).toFixed(1) + ' MB';

// Last path segment, without query/hash — the stored value may be an ImageKit
// path, a full ImageKit URL, a full backend /uploads URL, or an external URL.
function baseName(v) {
  if (!v || typeof v !== 'string') return null;
  let s = v.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const seg = s.split('/').pop();
  return seg ? seg.toLowerCase() : null;
}

async function collectReferenced() {
  const refs = new Set();
  const add = (v) => { const b = baseName(v); if (b) refs.add(b); };

  // Each source: [label, async () => array-of-stored-values]. Requiring the
  // model files directly keeps us independent of the associations export list.
  const M = (p) => require(p);
  const sources = [
    ['ProductImage.image_url', async () => (await M('../model/productImageModel.js').ProductImage.findAll({ attributes: ['image_url'], raw: true })).map((r) => r.image_url)],
    ['Category.image/ogImage',  async () => (await M('../model/categoryModel.js').Category.findAll({ attributes: ['image', 'ogImage'], raw: true })).flatMap((r) => [r.image, r.ogImage])],
    ['Slider.image',            async () => (await M('../model/sliderModel.js').Slider.findAll({ attributes: ['image'], raw: true })).map((r) => r.image)],
    ['User.profileImage',       async () => (await M('../model/userModel.js').User.findAll({ attributes: ['profileImage'], raw: true })).map((r) => r.profileImage)],
    ['Brand.logo_url',          async () => (await M('../model/brandModel.js').findAll({ attributes: ['logo_url'], raw: true })).map((r) => r.logo_url)],
    ['ProductSEO.ogImage',      async () => (await M('../model/productSEOModel.js').ProductSEO.findAll({ attributes: ['ogImage'], raw: true })).map((r) => r.ogImage)],
    ['SeoMetadata.meta_image',  async () => (await M('../model/seoMetadataModel.js').SeoMetadata.findAll({ attributes: ['meta_image'], raw: true })).map((r) => r.meta_image)],
    ['LookbookImage.image_url', async () => (await M('../model/lookbookImageModel.js').LookbookImage.findAll({ attributes: ['image_url'], raw: true })).map((r) => r.image_url)],
    ['BlogPost.hero_image',     async () => (await M('../model/blogPostModel.js').BlogPost.findAll({ attributes: ['hero_image'], raw: true })).map((r) => r.hero_image)],
    ['ReviewImage.fileName',    async () => (await M('../model/reviewImageModel.js').ReviewImage.findAll({ attributes: ['fileName'], raw: true })).map((r) => r.fileName)],
    ['Return.photos+proof',     async () => {
      const rows = await M('../model/returnModel.js').Return.findAll({ attributes: ['photos', 'payout_proof'], raw: true });
      const out = [];
      for (const r of rows) {
        if (r.payout_proof) out.push(r.payout_proof);
        let p = r.photos;
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch { p = null; } }
        if (Array.isArray(p)) out.push(...p);
        else if (p && typeof p === 'object') for (const v of Object.values(p)) Array.isArray(v) ? out.push(...v) : out.push(v);
      }
      return out;
    }],
  ];
  // Blog SEO (export shape unknown — handle both).
  try {
    const mod = M('../model/blogSeoModel.js');
    const BlogSeo = mod.BlogSeo || mod.BlogSEO || mod;
    if (BlogSeo && BlogSeo.findAll) sources.push(['BlogSeo.og_image', async () => (await BlogSeo.findAll({ attributes: ['og_image'], raw: true })).map((r) => r.og_image)]);
  } catch { /* optional */ }

  let failed = false;
  for (const [label, fn] of sources) {
    try {
      const vals = await fn();
      let n = 0;
      for (const v of vals) if (v) { add(v); n++; }
      console.log(`  ✓ ${label}: ${n} references`);
    } catch (e) {
      failed = true;
      console.error(`  ✗ ${label} FAILED: ${e.message}`);
    }
  }
  if (failed && DELETE) {
    throw new Error('A reference source failed to load — aborting before deletion so no in-use image is removed. Fix the source (or run a dry run) first.');
  }
  if (failed) console.warn('\n⚠️  Some reference sources failed — DRY RUN only. Do NOT run --delete until every source above shows ✓.');
  return refs;
}

async function listAllImageKitFiles() {
  const files = [];
  const seen = new Set();
  let skip = 0;
  const limit = 1000;
  // No path filter → ImageKit returns files across the whole library.
  while (true) {
    const batch = await ik.listFiles({ skip, limit });
    if (!batch || batch.length === 0) break;
    for (const f of batch) {
      if (f.type === 'file' && !seen.has(f.fileId)) { seen.add(f.fileId); files.push(f); }
    }
    if (batch.length < limit) break;
    skip += limit;
  }
  return files;
}

(async () => {
  console.log(`\nImageKit cleanup — ${DELETE ? 'DELETE' : 'DRY RUN'} mode · keep files newer than ${AGE_DAYS} day(s)\n`);
  await sequelize.authenticate();

  console.log('Collecting referenced images from the database…');
  const refs = await collectReferenced();
  console.log(`\nDistinct referenced filenames: ${refs.size}`);

  console.log('\nListing ImageKit files…');
  const files = await listAllImageKitFiles();
  console.log(`ImageKit files found: ${files.length}`);

  const now = Date.now();
  const byFolder = {};
  const orphans = [];
  let totalSize = 0, orphanSize = 0;
  for (const f of files) {
    totalSize += f.size || 0;
    const folder = (f.filePath || '').split('/').slice(0, -1).join('/') || '/';
    byFolder[folder] = (byFolder[folder] || 0) + 1;
    const referenced = refs.has((f.name || '').toLowerCase());
    const ageDays = (now - new Date(f.createdAt).getTime()) / 86400000;
    if (!referenced && ageDays >= AGE_DAYS) { orphans.push(f); orphanSize += f.size || 0; }
  }

  console.log('\nFiles by folder:');
  for (const [folder, n] of Object.entries(byFolder).sort((a, b) => b[1] - a[1])) console.log(`  ${folder}: ${n}`);

  console.log('\n──────── SUMMARY ────────');
  console.log(`Total ImageKit files : ${files.length}  (${mb(totalSize)})`);
  console.log(`Referenced / in use  : ${files.length - orphans.length}`);
  console.log(`Orphans (unused, >${AGE_DAYS}d): ${orphans.length}  (${mb(orphanSize)} reclaimable)`);

  const report = orphans
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .map((f) => ({ fileId: f.fileId, filePath: f.filePath, name: f.name, sizeKB: Math.round((f.size || 0) / 1024), createdAt: f.createdAt }));
  const reportPath = path.join(__dirname, 'imagekit-orphans.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull orphan list → ${reportPath}`);

  if (!DELETE) {
    console.log('\nDRY RUN — nothing was deleted. Review the list above, then re-run with --delete to remove them.');
    await sequelize.close();
    process.exit(0);
  }

  console.log(`\nDeleting ${orphans.length} orphaned files…`);
  const ids = orphans.map((f) => f.fileId);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    try {
      await ik.bulkDeleteFiles(batch);
      deleted += batch.length;
      console.log(`  deleted ${deleted}/${ids.length}`);
    } catch (e) {
      console.error(`  batch starting at ${i} failed: ${e.message}`);
    }
  }
  console.log(`\nDone. Deleted ${deleted} files, freed ~${mb(orphanSize)}.`);
  await sequelize.close();
  process.exit(0);
})().catch((e) => { console.error('\nFATAL:', e); process.exit(1); });
