// Website content (admin "Website" area: Sliders, Blog, Photos, SEO, Policies).
//
// Schema owned here, created lazily once per process by ensureSchema()
// (information_schema check → ALTER TABLE ADD COLUMN; CREATE TABLE IF NOT EXISTS;
// never destructive):
//   sliders.starts_at   DATETIME NULL  first moment a slide may show (NULL = right away)
//   sliders.ends_at     DATETIME NULL  last moment a slide may show  (NULL = no end)
//   media_assets        photos uploaded straight into the Photos library, so an
//                       upload that is not used anywhere yet still shows up
//                       (and can be deleted) instead of being invisible.
//
// The Photos library itself is computed from references: every image stored on
// a product, slide, category, blog post, SEO page, brand logo, policy or product
// description, plus the library uploads above. A photo is "not used anywhere"
// only when none of those reference its file name — and only then may it be
// deleted.

const fs = require('fs/promises');
const path = require('path');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const exec = (sql, replacements = {}) => sequelize.query(sql, { replacements });

// ─── Schema (lazy, once per process) ──────────────────────────────────────────
let _schemaPromise = null;
function ensureSchema() {
  if (!_schemaPromise) {
    _schemaPromise = _ensureSchema().catch((e) => {
      _schemaPromise = null; // retry on the next call
      throw e;
    });
  }
  return _schemaPromise;
}

async function _ensureSchema() {
  const cols = await q(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sliders' AND COLUMN_NAME IN ('starts_at','ends_at')`);
  const have = new Set(cols.map((r) => r.c));
  const adds = [];
  if (!have.has('starts_at')) adds.push('ADD COLUMN starts_at DATETIME NULL');
  if (!have.has('ends_at')) adds.push('ADD COLUMN ends_at DATETIME NULL');
  if (adds.length) await exec(`ALTER TABLE sliders ${adds.join(', ')}`);

  await exec(`CREATE TABLE IF NOT EXISTS media_assets (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      path VARCHAR(1000) NOT NULL,
      name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      size_bytes INT NULL,
      uploaded_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_media_assets_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

// ─── Image URLs ───────────────────────────────────────────────────────────────
const IK_ENDPOINT = () => (process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf').replace(/\/+$/, '');
const API_BASE = () => (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.crosscoin.in').replace(/\/+$/, '');

// Full, untransformed URL for a stored image value (ImageKit path, full URL,
// legacy /uploads path or a bare file name). `folder` is used for bare names.
function fullUrl(value, folder = 'products') {
  if (!value || typeof value !== 'string') return null;
  let v = value.trim();
  if (/^https?:\/\//i.test(v)) {
    v = v.split('?tr=')[0].split('&tr=')[0];
    // Local fallback files are only reachable under /api/uploads on production.
    return v.replace(/(?<!\/api)\/uploads\//, '/api/uploads/');
  }
  if (v.startsWith('/uploads/')) return `${API_BASE()}/api${v}`;
  if (v.startsWith('/')) return `${IK_ENDPOINT()}${v.split('?tr=')[0]}`;
  return `${IK_ENDPOINT()}/${folder}/${v}`;
}

// Width-only resize (keeps the aspect ratio) for previews.
function previewUrl(value, width = 640, folder = 'products') {
  const u = fullUrl(value, folder);
  if (!u) return null;
  if (!u.startsWith(IK_ENDPOINT()) && !/\/\/ik\.imagekit\.io\//i.test(u)) return u; // not ImageKit: no transforms
  return `${u}${u.includes('?') ? '&' : '?'}tr=w-${width},q-75,f-auto`;
}

// Last path segment without query/hash, lower-cased — the identity of a photo.
// ImageKit makes every upload name unique, so the name is a reliable key (the
// same rule scripts/imagekit-cleanup.js uses).
function baseName(v) {
  if (!v || typeof v !== 'string') return null;
  const s = v.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const seg = s.split('/').pop();
  return seg ? seg.toLowerCase() : null;
}

// Also matches the escaped quotes of HTML stored inside JSON (blog sections).
const IMG_SRC_RE = /<img[^>]+src=\\?["']([^"'\\]+)\\?["']/gi;
function imgSrcs(html) {
  const out = [];
  if (!html || typeof html !== 'string' || !html.includes('<img')) return out;
  let m;
  IMG_SRC_RE.lastIndex = 0;
  while ((m = IMG_SRC_RE.exec(html))) {
    if (!m[1].startsWith('data:')) out.push(m[1]);
  }
  return out;
}

// ─── Sliders: schedule state ─────────────────────────────────────────────────
// draft = switched off; scheduled = on but starts later; ended = on but its
// window is over; live = on the website right now.
function sliderState(s, now = new Date()) {
  if (!s || s.status !== 'active') return 'draft';
  if (s.starts_at && new Date(s.starts_at) > now) return 'scheduled';
  if (s.ends_at && new Date(s.ends_at) < now) return 'ended';
  return 'live';
}

function sliderStateWhere(state, now = new Date()) {
  const started = { [Op.or]: [{ starts_at: null }, { starts_at: { [Op.lte]: now } }] };
  const notEnded = { [Op.or]: [{ ends_at: null }, { ends_at: { [Op.gte]: now } }] };
  switch (state) {
    case 'draft': return { status: 'inactive' };
    case 'scheduled': return { status: 'active', starts_at: { [Op.gt]: now } };
    case 'ended': return { status: 'active', ends_at: { [Op.lt]: now }, [Op.and]: [started] };
    case 'live': return { status: 'active', [Op.and]: [started, notEnded] };
    default: return null;
  }
}

// Within its window right now (used by the public listing).
function inWindow(s, now = new Date()) {
  if (s.starts_at && new Date(s.starts_at) > now) return false;
  if (s.ends_at && new Date(s.ends_at) < now) return false;
  return true;
}

// '' / null / invalid → null; otherwise a Date.
function parseDateInput(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '' || v === 'null') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Photos library ──────────────────────────────────────────────────────────
const USE_KINDS = ['products', 'slides', 'categories', 'posts', 'pages', 'brands', 'policies'];
let _refsCache = null; // { at, data }
const REFS_TTL_MS = 30 * 1000;

function invalidateMediaCache() { _refsCache = null; }

// Build name → entry map from every place an image can be stored. Each source
// is loaded independently; `complete` is false when any source failed, and
// deletes are refused in that case (a missed source could make an in-use
// photo look unused).
async function collectLibrary({ fresh = false } = {}) {
  if (!fresh && _refsCache && Date.now() - _refsCache.at < REFS_TTL_MS) return _refsCache.data;
  await ensureSchema();

  const entries = new Map();
  let complete = true;
  const touch = (value, folder, at) => {
    const key = baseName(value);
    if (!key) return null;
    let e = entries.get(key);
    if (!e) {
      e = { key, name: key, path: value, folder, uploaded_at: null, size_bytes: null, uses: {} };
      for (const k of USE_KINDS) e.uses[k] = new Map();
      entries.set(key, e);
    }
    if (at && (!e.uploaded_at || new Date(at) < new Date(e.uploaded_at))) e.uploaded_at = at;
    return e;
  };
  const use = (value, folder, kind, id, label, at) => {
    const e = touch(value, folder, at);
    if (e && id != null) e.uses[kind].set(String(id), label);
  };

  const sources = [
    ['product photos', async () => {
      const rows = await q(`SELECT pi.image_url AS v, pi.created_at AS at, p.id, p.name
                              FROM product_images pi LEFT JOIN products p ON p.id = pi.product_id`);
      for (const r of rows) use(r.v, 'products', 'products', r.id, r.name || `Product #${r.id}`, r.at);
    }],
    ['product descriptions', async () => {
      const rows = await q(`SELECT id, name, description FROM products WHERE description LIKE '%<img%'`);
      for (const r of rows) for (const src of imgSrcs(r.description)) use(src, 'products', 'products', r.id, r.name);
    }],
    ['product SEO', async () => {
      const rows = await q(`SELECT ps.product_id AS id, ps.og_image AS v, p.name FROM product_seo ps
                              LEFT JOIN products p ON p.id = ps.product_id WHERE ps.og_image IS NOT NULL AND ps.og_image <> ''`);
      for (const r of rows) use(r.v, 'products', 'products', r.id, r.name || `Product #${r.id}`);
    }],
    ['slides', async () => {
      const rows = await q(`SELECT id, title, image, mobile_image, createdAt AS at FROM sliders`);
      for (const r of rows) {
        use(r.image, 'sliders', 'slides', r.id, r.title, r.at);
        use(r.mobile_image, 'sliders', 'slides', r.id, r.title, r.at);
      }
    }],
    ['categories', async () => {
      const rows = await q(`SELECT id, name, image, ogImage FROM categories`);
      for (const r of rows) {
        use(r.image, 'categories', 'categories', r.id, r.name);
        use(r.ogImage, 'categories', 'categories', r.id, r.name);
      }
    }],
    ['blog posts', async () => {
      const rows = await q(`SELECT bp.id, bp.title, bp.hero_image, bp.thumbnail_image, bp.sections, bp.created_at AS at, bs.og_image
                              FROM blog_posts bp LEFT JOIN blog_seo bs ON bs.blog_post_id = bp.id`);
      for (const r of rows) {
        use(r.hero_image, 'blogs', 'posts', r.id, r.title, r.at);
        use(r.thumbnail_image, 'blogs', 'posts', r.id, r.title, r.at);
        use(r.og_image, 'blogs', 'posts', r.id, r.title);
        const secs = typeof r.sections === 'string' ? r.sections : JSON.stringify(r.sections || '');
        for (const src of imgSrcs(secs)) use(src, 'blogs', 'posts', r.id, r.title);
      }
    }],
    ['SEO pages', async () => {
      const rows = await q(`SELECT id, page_name, meta_image FROM seo_metadata WHERE meta_image IS NOT NULL AND meta_image <> ''`);
      for (const r of rows) use(r.meta_image, 'seo', 'pages', r.id, r.page_name);
    }],
    ['brand logos', async () => {
      const rows = await q(`SELECT id, display_name, name, logo_url FROM brands WHERE logo_url IS NOT NULL AND logo_url <> ''`);
      for (const r of rows) use(r.logo_url, 'brands', 'brands', r.id, r.display_name || r.name);
    }],
    ['policies', async () => {
      const rows = await q(`SELECT id, title, content FROM policies WHERE content LIKE '%<img%'`);
      for (const r of rows) for (const src of imgSrcs(r.content)) use(src, 'products', 'policies', r.id, r.title);
    }],
    ['library uploads', async () => {
      const rows = await q(`SELECT id, path, name, original_name, size_bytes, created_at FROM media_assets`);
      for (const r of rows) {
        const e = touch(r.path, 'products', r.created_at);
        if (!e) continue;
        e.asset_ids = (e.asset_ids || []).concat(r.id);
        if (r.size_bytes) e.size_bytes = r.size_bytes;
        if (r.original_name) e.original_name = r.original_name;
        e.path = r.path; // the library upload knows the canonical stored path
      }
    }],
  ];

  for (const [label, fn] of sources) {
    try { await fn(); } catch (e) {
      complete = false;
      logger.warn(`[website media] ${label} could not be read: ${e.message}`);
    }
  }

  const list = [];
  for (const e of entries.values()) {
    const uses = {};
    let useCount = 0;
    for (const k of USE_KINDS) {
      uses[k] = Array.from(e.uses[k], ([id, label]) => ({ id: Number(id) || id, label: label || '' }));
      useCount += uses[k].length;
    }
    const folder = e.folder || 'products';
    list.push({
      key: e.key,
      name: e.original_name || e.name,
      file: e.name,
      path: e.path,
      url: fullUrl(e.path, folder),
      preview: previewUrl(e.path, 480, folder),
      uploaded_at: e.uploaded_at || null,
      size_bytes: e.size_bytes || null,
      in_library: Boolean(e.asset_ids && e.asset_ids.length),
      uses,
      use_count: useCount,
    });
  }
  list.sort((a, b) => {
    const ta = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
    const tb = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
    return tb - ta || a.file.localeCompare(b.file);
  });

  const data = { list, complete };
  _refsCache = { at: Date.now(), data };
  return data;
}

const MEDIA_FILTERS = {
  all: () => true,
  used: (m) => m.use_count > 0,
  unused: (m) => m.use_count === 0,
  products: (m) => m.uses.products.length > 0,
  slides: (m) => m.uses.slides.length > 0,
  posts: (m) => m.uses.posts.length > 0,
};

async function listMedia({ search = '', usage = 'all', page = 1, limit = 24 } = {}) {
  const { list, complete } = await collectLibrary();
  const needle = String(search || '').trim().toLowerCase();
  const matches = needle
    ? list.filter((m) => m.file.includes(needle) || String(m.name).toLowerCase().includes(needle)
      || USE_KINDS.some((k) => m.uses[k].some((u) => String(u.label).toLowerCase().includes(needle))))
    : list;
  const counts = {};
  for (const k of Object.keys(MEDIA_FILTERS)) counts[k] = matches.filter(MEDIA_FILTERS[k]).length;
  const filtered = matches.filter(MEDIA_FILTERS[usage] || MEDIA_FILTERS.all);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  return {
    items: filtered.slice((pg - 1) * lim, pg * lim),
    total: filtered.length,
    page: pg,
    limit: lim,
    counts,
    complete,
  };
}

async function recordUpload({ filePath, originalName, size, userId }) {
  await ensureSchema();
  await exec(
    `INSERT INTO media_assets (path, name, original_name, size_bytes, uploaded_by, created_at)
     VALUES (:path, :name, :orig, :size, :by, NOW())`,
    { path: filePath, name: baseName(filePath) || 'file', orig: originalName ? String(originalName).slice(0, 255) : null, size: size || null, by: userId || null });
  invalidateMediaCache();
}

// Remove the stored file. ImageKit paths are looked up by folder + name (the
// SDK needs a fileId); local fallback files are unlinked from uploads/.
async function deleteStoredFile(stored) {
  const v = String(stored || '');
  const localMatch = v.match(/\/uploads\/([a-z0-9_-]+)\/([^/?#]+)$/i);
  if (localMatch) {
    const full = path.join(require('../utils/uploadsDir.js'), localMatch[1], localMatch[2]);
    await fs.unlink(full).catch((e) => { if (e.code !== 'ENOENT') throw e; });
    return;
  }
  let ikPath = v.split('?')[0];
  if (/^https?:\/\//i.test(ikPath)) {
    const ep = IK_ENDPOINT();
    if (!ikPath.startsWith(ep)) throw new Error('Not an ImageKit file');
    ikPath = ikPath.slice(ep.length);
  }
  if (!ikPath.startsWith('/')) ikPath = `/products/${ikPath}`;
  const folder = path.posix.dirname(ikPath);
  const name = path.posix.basename(ikPath);
  const ik = require('./imagekitService.js').imagekit;
  const files = await ik.listFiles({ path: folder, searchQuery: `name = "${name.replace(/"/g, '')}"` });
  const hit = (files || []).find((f) => f.type !== 'folder' && f.name === name);
  if (hit) await ik.deleteFile(hit.fileId);
}

async function deleteMedia(keys = []) {
  const wanted = Array.from(new Set((keys || []).map((k) => String(k || '').toLowerCase()).filter(Boolean))).slice(0, 200);
  const { list, complete } = await collectLibrary({ fresh: true });
  if (!complete) {
    const err = new Error('Could not check every place photos are used, so nothing was deleted. Try again in a minute.');
    err.status = 503;
    throw err;
  }
  const byKey = new Map(list.map((m) => [m.key, m]));
  const deleted = [];
  const kept = [];
  const failed = [];
  for (const key of wanted) {
    const m = byKey.get(key);
    if (!m) { failed.push({ key, reason: 'Not found' }); continue; }
    if (m.use_count > 0) { kept.push({ key, reason: `Still used in ${m.use_count} place${m.use_count === 1 ? '' : 's'}` }); continue; }
    try {
      const rows = await q(`SELECT id, path FROM media_assets WHERE name = :name`, { name: key });
      for (const r of rows) await deleteStoredFile(r.path);
      await exec(`DELETE FROM media_assets WHERE name = :name`, { name: key });
      deleted.push(key);
    } catch (e) {
      logger.warn(`[website media] delete ${key} failed: ${e.message}`);
      failed.push({ key, reason: 'The photo store did not answer. Try again.' });
    }
  }
  invalidateMediaCache();
  return { deleted, kept, failed };
}

// ─── Policies ────────────────────────────────────────────────────────────────
// Mirrors RETURN_WINDOW_DAYS in controller/returnController.js (owner decision:
// every store accepts returns for 7 days from delivery; not a per-brand setting).
const RETURN_WINDOW_DAYS = 7;
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fourteen: 14, fifteen: 15, thirty: 30 };

// Same slug rule as policyController.slugifyTitle / the storefronts.
const slugifyTitle = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').trim()
  .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

const isReturnsPolicy = (title) => /return|refund|exchange/i.test(String(title || ''));

// Which day counts does the text promise? ("7 days", "7-day", "seven (7) days")
function dayMentions(text) {
  const found = new Set();
  const re = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|thirty)\s*(?:\(\s*\d{1,3}\s*\)\s*)?(?:-|\s)?\s*(?:working\s+|business\s+|calendar\s+)?days?\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : WORD_NUM[raw];
    if (n) found.add(n);
  }
  return Array.from(found).sort((a, b) => a - b);
}

// Only sentences about returns count ("refunds reach your bank in 5–7 days"
// is not the return window).
function returnCheck(text) {
  const sentences = String(text || '').split(/(?<=[.!?])\s+/).filter((x) => /\breturn/i.test(x));
  const days = dayMentions(sentences.join(' '));
  if (!days.length) return { window_days: RETURN_WINDOW_DAYS, mentions: [], state: 'missing' };
  return { window_days: RETURN_WINDOW_DAYS, mentions: days, state: days.includes(RETURN_WINDOW_DAYS) ? 'matches' : 'differs' };
}

// brandId: '' (everything), 'global' (shared policies only) or a brand id
// (that store's own policies plus the shared ones that also serve it).
async function listPolicies({ brandId = '', search = '' } = {}) {
  const { Policy } = require('../model/policyModel.js');
  const where = {};
  const bid = brandId === 'global' ? 'global' : (parseInt(brandId, 10) || null);
  if (bid === 'global') where.brand_id = null;
  else if (bid) where[Op.or] = [{ brand_id: bid }, { brand_id: null }];
  const needle = String(search || '').trim();
  if (needle) where.title = { [Op.like]: `%${needle}%` };
  const rows = await Policy.findAll({ where, order: [['title', 'ASC']] });

  // A shared (all stores) policy wins over a store's own one with the same
  // name (see policyController.getPublicPolicyByName), so flag those.
  const globalSlugs = new Set(rows.filter((r) => r.brand_id == null).map((r) => slugifyTitle(r.title)));
  let sharedSlugs = globalSlugs;
  if (!bid || bid === 'global') {
    const shared = await Policy.findAll({ where: { brand_id: null }, attributes: ['title'] });
    sharedSlugs = new Set(shared.map((r) => slugifyTitle(r.title)));
  }

  const items = rows.map((r) => {
    const text = htmlToText(r.content);
    const slug = slugifyTitle(r.title);
    const item = {
      id: r.id,
      title: r.title,
      slug,
      brand_id: r.brand_id,
      updated_at: r.updatedAt,
      created_at: r.createdAt,
      excerpt: text.slice(0, 180),
      words: text ? text.split(' ').length : 0,
      overridden: r.brand_id != null && sharedSlugs.has(slug),
      uses_gstin_token: /\{\{\s*GSTIN\s*\}\}/.test(r.content || ''),
    };
    if (isReturnsPolicy(r.title)) item.return_check = returnCheck(text);
    return item;
  });
  return { items, total: items.length, return_window_days: RETURN_WINDOW_DAYS };
}

// ─── SEO pages ───────────────────────────────────────────────────────────────
const TITLE_MAX = 60;
const DESC_MAX = 160;

function seoState(r) {
  if (/noindex/i.test(r.robots || '')) return 'hidden';
  if (!r.meta_title || !r.meta_description) return 'fix';
  if (r.meta_title.length > TITLE_MAX || r.meta_description.length > DESC_MAX) return 'fix';
  return 'live';
}

function seoProblem(r) {
  if (!r.meta_title) return 'Title missing';
  if (!r.meta_description) return 'Description missing';
  if (r.meta_title.length > TITLE_MAX) return 'Title too long — Google cuts it off';
  if (r.meta_description.length > DESC_MAX) return 'Description too long — Google cuts it off';
  return null;
}

async function listSeoPages({ brandId, search = '', state = 'all', page = 1, limit = 24 } = {}) {
  const { SeoMetadata } = require('../model/associations.js');
  const where = { brand_id: parseInt(brandId, 10) || 1 };
  const needle = String(search || '').trim();
  if (needle) {
    where[Op.or] = [
      { page_name: { [Op.like]: `%${needle}%` } },
      { meta_title: { [Op.like]: `%${needle}%` } },
      { meta_description: { [Op.like]: `%${needle}%` } },
    ];
  }
  const rows = await SeoMetadata.findAll({
    where,
    attributes: ['id', 'page_name', 'slug', 'meta_title', 'meta_description', 'meta_image', 'robots', 'canonical_url', 'updated_at'],
    order: [['page_name', 'ASC']],
  });
  const all = rows.map((row) => {
    const r = row.toJSON();
    return {
      id: r.id,
      page_name: r.page_name,
      slug: r.slug,
      meta_title: r.meta_title || '',
      meta_description: r.meta_description || '',
      title_length: (r.meta_title || '').length,
      description_length: (r.meta_description || '').length,
      has_image: Boolean(r.meta_image),
      image: r.meta_image ? fullUrl(r.meta_image, 'seo') : null,
      robots: r.robots || '',
      updated_at: r.updated_at || r.updatedAt || null,
      state: seoState(r),
      problem: seoProblem(r),
    };
  });
  const counts = { all: all.length, live: 0, fix: 0, hidden: 0 };
  for (const r of all) counts[r.state] += 1;
  const filtered = state && state !== 'all' ? all.filter((r) => r.state === state) : all;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  return { items: filtered.slice((pg - 1) * lim, pg * lim), total: filtered.length, page: pg, limit: lim, counts, limits: { title: TITLE_MAX, description: DESC_MAX } };
}

module.exports = {
  ensureSchema,
  sliderState,
  sliderStateWhere,
  inWindow,
  parseDateInput,
  previewUrl,
  fullUrl,
  baseName,
  listMedia,
  recordUpload,
  deleteMedia,
  invalidateMediaCache,
  listPolicies,
  listSeoPages,
  RETURN_WINDOW_DAYS,
  _test: { dayMentions, returnCheck, htmlToText, imgSrcs, slugifyTitle },
};
