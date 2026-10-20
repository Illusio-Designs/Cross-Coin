// Dashboard → SEO: one store's SEO score, the four tiles, the "To fix" list,
// and the store-wide SEO details (brand settings with the SEO_ prefix).
//
// "Complete" means the item has its OWN Google title and description. Items
// without them still show on Google (the store falls back to the product name
// and the store-wide defaults), so they are listed as things to improve, not
// errors. Pages hidden from Google (robots noindex) are left out of the score.
// A product belongs to a store the way the storefront sees it: through
// product_brands (or its own brand_id when it has no store links at all).
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const TITLE_MAX = 60;
const DESC_MAX = 160;
// Orders that never turned into a sale don't count as "sold".
const NOT_SOLD = ['cancelled', 'order cancelled', 'pending'];

const blank = (v) => !v || !String(v).trim();

const SEO_KEYS = [
  'SEO_ORGANIZATION_NAME', 'SEO_ORGANIZATION_LOGO', 'SEO_PHONE',
  'SEO_DEFAULT_TITLE_TEMPLATE', 'SEO_DEFAULT_DESCRIPTION', 'SEO_DEFAULT_OG_IMAGE',
  'SEO_RETURN_POLICY_URL', 'SEO_DEFAULT_SHIPPING_PROMISE_DAYS',
  'SEO_SOCIAL_FACEBOOK', 'SEO_SOCIAL_INSTAGRAM', 'SEO_SOCIAL_TWITTER', 'SEO_SOCIAL_YOUTUBE',
  'SEO_ADDRESS_STREET', 'SEO_ADDRESS_CITY', 'SEO_ADDRESS_REGION', 'SEO_ADDRESS_POSTAL', 'SEO_ADDRESS_COUNTRY',
];

function pageGaps(r) {
  const gaps = [];
  if (blank(r.meta_title)) gaps.push('Title');
  else if (r.meta_title.length > TITLE_MAX) gaps.push('Title too long');
  if (blank(r.meta_description)) gaps.push('Description');
  else if (r.meta_description.length > DESC_MAX) gaps.push('Description too long');
  return gaps;
}

async function getOverview(brandId) {
  const b = Number(brandId);
  if (!b) { const e = new Error('Pick a store.'); e.status = 400; throw e; }
  const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  const [products, categories, pages, posts, faqs] = await Promise.all([
    q(`SELECT p.id, p.name, p.slug, ps.meta_title, ps.meta_description, COALESCE(s.sold, 0) AS sold
         FROM products p
         LEFT JOIN product_seo ps ON ps.product_id = p.id
         LEFT JOIN (SELECT oi.product_id, SUM(oi.quantity) AS sold
                      FROM order_items oi JOIN orders o ON o.id = oi.order_id
                     WHERE o.brand_id = :b AND o.created_at >= (NOW() - INTERVAL 30 DAY) AND o.status NOT IN (:notSold)
                     GROUP BY oi.product_id) s ON s.product_id = p.id
        WHERE p.status = 'active'
          AND (EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :b AND (pb.status IS NULL OR pb.status = 'active'))
               OR (p.brand_id = :b AND NOT EXISTS (SELECT 1 FROM product_brands pb2 WHERE pb2.product_id = p.id)))`, { b, notSold: NOT_SOLD }),
    q(`SELECT DISTINCT c.id, c.name, c.slug, c.metaTitle AS meta_title, c.metaDescription AS meta_description, c.seoIndex AS seo_index
         FROM categories c JOIN category_brands cb ON cb.category_id = c.id
        WHERE cb.brand_id = :b AND c.status = 'active' AND (cb.status IS NULL OR cb.status = 'active')`, { b }),
    q(`SELECT id, page_name, slug, meta_title, meta_description, robots FROM seo_metadata WHERE brand_id = :b`, { b }),
    q(`SELECT bp.id, bp.title AS name, bp.slug, bs.meta_title, bs.meta_description
         FROM blog_posts bp JOIN blog_brands bb ON bb.blog_post_id = bp.id
         LEFT JOIN blog_seo bs ON bs.blog_post_id = bp.id
        WHERE bb.brand_id = :b AND bp.status = 'published'`, { b }),
    q(`SELECT attached_to_type, attached_to_id, attached_to_slug, is_active FROM faqs WHERE brand_id = :b`, { b }),
  ]);

  const issues = [];
  let fields = 0;
  let filled = 0;
  const tally = (gapCount, total) => { fields += total; filled += total - gapCount; };

  let productsDone = 0;
  let productsNoDesc = 0;
  for (const p of products) {
    const gaps = [];
    if (blank(p.meta_title)) gaps.push('Title');
    if (blank(p.meta_description)) { gaps.push('Description'); productsNoDesc += 1; }
    tally(gaps.length, 2);
    if (!gaps.length) productsDone += 1;
    else issues.push({ type: 'product', id: p.id, name: p.name, path: `/product/${p.slug}`, gaps, sold: Number(p.sold) || 0 });
  }

  let categoriesDone = 0;
  const categoryIssues = [];
  for (const c of categories) {
    if (c.seo_index === 0 || c.seo_index === false) continue;
    const gaps = [];
    if (blank(c.meta_title)) gaps.push('Title');
    if (blank(c.meta_description)) gaps.push('Description');
    tally(gaps.length, 2);
    if (!gaps.length) categoriesDone += 1;
    else categoryIssues.push({ type: 'category', id: c.id, name: c.name, path: `/collections/${c.slug}`, gaps, sold: null });
  }

  let pagesShown = 0;
  let pagesDone = 0;
  const pageIssues = [];
  for (const r of pages) {
    if (/noindex/i.test(r.robots || '')) continue;
    pagesShown += 1;
    const gaps = pageGaps(r);
    tally(gaps.length, 2);
    if (!gaps.length) pagesDone += 1;
    else pageIssues.push({ type: 'page', id: r.id, name: r.page_name, path: r.slug ? `/${String(r.slug).replace(/^\/+/, '')}` : `/${r.page_name}`, gaps, sold: null });
  }

  const postIssues = [];
  for (const p of posts) {
    const missing = blank(p.meta_description);
    tally(missing ? 1 : 0, 1);
    if (missing) postIssues.push({ type: 'blog', id: p.id, name: p.name, path: `/blog/${p.slug}`, gaps: ['Description'], sold: null });
  }

  // Best sellers first, then categories, pages and posts.
  issues.sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name));
  issues.push(...categoryIssues, ...pageIssues, ...postIssues);

  const live = faqs.filter((f) => f.is_active);
  const productTargets = new Set(live.filter((f) => f.attached_to_type === 'product').map((f) => f.attached_to_id || 'all'));
  const hasSiteFaqs = live.some((f) => f.attached_to_type === 'global');

  const firstCategoryGap = categoryIssues[0];
  const firstPageGap = pageIssues[0];
  return {
    score: fields ? Math.round((100 * filled) / fields) : null,
    toFix: issues.length,
    products: { total: products.length, done: productsDone, missingDescription: productsNoDesc },
    categories: { total: categoryIssues.length + categoriesDone, done: categoriesDone, firstGap: firstCategoryGap ? `${firstCategoryGap.name} has no ${firstCategoryGap.gaps[0].toLowerCase()}` : null },
    pages: { total: pages.length, shown: pagesShown, done: pagesDone, firstGap: firstPageGap ? `${firstPageGap.name}: ${firstPageGap.gaps[0].toLowerCase()} missing` : null },
    faqs: {
      total: faqs.length,
      live: live.length,
      on: [
        productTargets.has('all') ? 'every product' : (productTargets.size ? `${productTargets.size} product${productTargets.size === 1 ? '' : 's'}` : null),
        hasSiteFaqs ? 'the whole site' : null,
      ].filter(Boolean),
    },
    issues: issues.slice(0, 300),
  };
}

// ── Store details (SEO_ brand settings), readable and writable by product managers ──
async function getStoreDetails(brandId) {
  const b = Number(brandId);
  if (!b) { const e = new Error('Pick a store.'); e.status = 400; throw e; }
  const rows = await sequelize.query(
    'SELECT `key`, value FROM brand_settings WHERE brand_id = :b AND `key` IN (:keys)',
    { replacements: { b, keys: SEO_KEYS }, type: QueryTypes.SELECT }
  );
  const values = {};
  for (const r of rows) values[r.key] = r.value || '';
  return { values };
}

async function saveStoreDetails(brandId, input, userId) {
  const b = Number(brandId);
  if (!b) { const e = new Error('Pick a store.'); e.status = 400; throw e; }
  const settingsService = require('./brandSettingsService.js');
  const audit = require('./settingsAuditService.js');
  const { BrandSetting } = require('../model/brandSettingModel.js');
  const changed = [];
  for (const key of Object.keys(input || {})) {
    if (!SEO_KEYS.includes(key)) continue; // only SEO details — never other store settings
    const value = String(input[key] ?? '').trim().slice(0, 1000);
    const row = await BrandSetting.findOne({ where: { brand_id: b, key } });
    const old = row ? (row.getDataValue('value') || '') : '';
    if (old === value) continue;
    if (row) await settingsService.updateSetting(b, key, { value, updated_by: userId || null });
    else await settingsService.createSetting({ brand_id: b, key, value, category: 'seo', is_encrypted: false, updated_by: userId || null });
    await audit.record({ brandId: b, area: 'seo', key, action: row ? 'update' : 'create', oldValue: old, newValue: value, userId, secret: false });
    changed.push(key);
  }
  return { changed, ...(await getStoreDetails(b)) };
}

module.exports = { getOverview, getStoreDetails, saveStoreDetails, SEO_KEYS };
