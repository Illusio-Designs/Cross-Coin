'use strict';

// Products page (admin) — stock-first list, per-size stock, inline stock edits
// and the "badge set by hand" lock.
//
// Thresholds match the Home "Out of stock → Restock" queue
// (homeTodayService): a size is OUT at 0 and RUNNING LOW below 10. Units sold
// count booked orders (everything except cancelled), the same rule the
// Reports page uses for "booked".
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const badgeConfig = require('../config/badgeConfig');

const LOW_STOCK = 10;            // Home: stock > 0 AND stock < 10
const SLOW_MIN_STOCK = 30;       // "slow mover": at least this many in stock…
const SLOW_DAYS = 180;           // …and more than ~6 months of stock at the 30-day pace
const SOLD_WINDOW_DAYS = 30;
const BOOKED = `(o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled'))`;
const BADGES = ['none', 'new_arrival', 'hot_selling', 'low_stock', 'out_of_stock'];
const MAX_STOCK = 1000000;

const q = (sql, replacements, extra = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT, ...extra });
const num = (v) => Number(v) || 0;
const escLike = (s) => String(s).replace(/[\\%_]/g, (m) => `\\${m}`);

// ── Schema: products.badge_locked (lazy, once per process) ─────────────────
// Runs only from admin request handlers BEFORE any transaction touches
// `products` (ALTER needs a metadata lock an open transaction would hold).
let schemaReady = null;
let columnKnown = false;
async function badgeColumnExists() {
  if (columnKnown) return true;
  const [row] = await q(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'badge_locked'`);
  columnKnown = num(row?.n) > 0;
  return columnKnown;
}
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      if (!(await badgeColumnExists())) {
        await sequelize.query(`ALTER TABLE products ADD COLUMN badge_locked TINYINT(1) NOT NULL DEFAULT 0`);
        columnKnown = true;
      }
    })().catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

// Read-only check, safe inside a transaction (never ALTERs). A missing column
// simply means nothing has been locked yet.
async function isBadgeLocked(productId, transaction = null) {
  if (!(await badgeColumnExists())) return false;
  const [row] = await q(`SELECT badge_locked FROM products WHERE id = ?`, [productId], { transaction });
  return num(row?.badge_locked) === 1;
}

async function setBadgeLocked(productId, locked, transaction = null) {
  if (!(await badgeColumnExists())) {
    if (!locked) return;
    throw new Error('Badge lock is not available yet — please try saving again.');
  }
  await sequelize.query(`UPDATE products SET badge_locked = ? WHERE id = ?`, { replacements: [locked ? 1 : 0, productId], transaction });
}

// Parse { badge_locked, badge } from a create/update form body.
// `provided` is false for callers that never send badge_locked (old clients),
// so their saves keep the automatic badge exactly as before.
function parseBadgeLock(body = {}) {
  if (body.badge_locked === undefined) return { provided: false, locked: false, badge: null };
  const locked = ['1', 'true', 'yes', 'on'].includes(String(body.badge_locked).toLowerCase());
  const badge = BADGES.includes(String(body.badge)) ? String(body.badge) : 'none';
  return { provided: true, locked, badge };
}

// Why a badge is showing, in shop-floor words.
function badgeReason(badge, locked) {
  if (locked) return 'Set by hand — the nightly update leaves it alone';
  switch (badge) {
    case 'out_of_stock': return 'Automatic: every size is sold out';
    case 'new_arrival': return `Automatic: added in the last ${badgeConfig.NEW_ARRIVAL_DAYS} days`;
    case 'hot_selling': return `Automatic: ${badgeConfig.HOT_SELLING_THRESHOLD}+ sold so far`;
    case 'low_stock': return `Automatic: a size has fewer than ${badgeConfig.LOW_STOCK_THRESHOLD} left`;
    default: return 'Automatic: no badge rule applies right now';
  }
}

// "Black · UK 6–10" from a variation's attributes JSON (skips the reserved
// `_images` map).
function variationLabel(raw, sku) {
  let a = raw;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = {}; } }
  if (!a || typeof a !== 'object') a = {};
  const parts = Object.entries(a)
    .filter(([k, v]) => !String(k).startsWith('_') && v != null && String(v).trim() !== '')
    .map(([, v]) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v)))
    .filter(Boolean);
  return parts.join(' · ') || sku || 'Standard';
}

const daysLeft = (stock, sold30) => {
  if (stock <= 0) return 0;
  if (sold30 <= 0) return null; // no sales in 30 days → can't estimate
  return Math.floor(stock / (sold30 / SOLD_WINDOW_DAYS));
};

function thumbUrl(path) {
  if (!path) return null;
  try { return require('./imagekitService.js').getOptimizedUrl(path, 'thumbnail'); } catch { return path; }
}

// ── List ────────────────────────────────────────────────────────────────────
const FILTERS = {
  all: '1=1',
  out: `t.status = 'active' AND t.out_n > 0`,
  low: `t.status = 'active' AND t.low_n > 0`,
  slow: `t.status = 'active' AND t.total_stock >= ${SLOW_MIN_STOCK} AND (t.sold30 = 0 OR t.total_stock * ${SOLD_WINDOW_DAYS} / t.sold30 > ${SLOW_DAYS})`,
  hidden: `t.visible = 0`,
};
const DAYS_SQL = `CASE WHEN t.total_stock <= 0 THEN 0 WHEN t.sold30 > 0 THEN t.total_stock * ${SOLD_WINDOW_DAYS} / t.sold30 ELSE NULL END`;
const SORTS = {
  attention: `(t.status = 'active' AND t.total_stock <= 0) DESC, (${DAYS_SQL}) IS NULL, ${DAYS_SQL} ASC, t.sold30 DESC, t.name ASC`,
  sold: `t.sold30 DESC, t.name ASC`,
  stock: `t.total_stock ASC, t.name ASC`,
  days: `(${DAYS_SQL}) IS NULL, ${DAYS_SQL} ASC, t.name ASC`,
  newest: `t.created_at DESC, t.id DESC`,
  name: `t.name ASC, t.id ASC`,
};

function baseSql({ brandId, search }, R) {
  const where = [];
  if (brandId) where.push(`EXISTS (SELECT 1 FROM product_brands pbx WHERE pbx.product_id = p.id AND pbx.brand_id = :brandId)`);
  if (search) {
    R.q = `%${escLike(search.toLowerCase())}%`;
    // attributes is a utf8mb4_bin JSON column (case-sensitive) → compare lowercased
    where.push(`(p.name LIKE :q OR p.slug LIKE :q OR EXISTS (SELECT 1 FROM product_variations sv
                  WHERE sv.productId = p.id AND (LOWER(sv.sku) LIKE :q OR LOWER(sv.attributes) LIKE :q)))`);
  }
  const visible = `p.status = 'active' AND EXISTS (SELECT 1 FROM product_brands pbv WHERE pbv.product_id = p.id
                     AND pbv.status = 'active'${brandId ? ' AND pbv.brand_id = :brandId' : ''})`;
  return `
    SELECT p.id, p.name, p.slug, p.status, p.badge, ${columnKnown ? 'p.badge_locked' : '0'} AS badge_locked,
           p.created_at, c.name AS category,
           COALESCE(v.total_stock, 0) AS total_stock, v.min_price, v.max_price,
           COALESCE(v.var_n, 0) AS var_n, COALESCE(v.out_n, 0) AS out_n, COALESCE(v.low_n, 0) AS low_n,
           COALESCE(s.sold30, 0) AS sold30,
           (${visible}) AS visible
      FROM products p
      LEFT JOIN categories c ON c.id = p.categoryId
      LEFT JOIN (SELECT productId, SUM(GREATEST(stock, 0)) AS total_stock, MIN(price) AS min_price, MAX(price) AS max_price,
                        COUNT(*) AS var_n, SUM(stock <= 0) AS out_n, SUM(stock > 0 AND stock < :low) AS low_n
                   FROM product_variations GROUP BY productId) v ON v.productId = p.id
      LEFT JOIN (SELECT oi.product_id, SUM(oi.quantity) AS sold30
                   FROM order_items oi JOIN orders o ON o.id = oi.order_id
                  WHERE o.created_at >= :since AND ${BOOKED}
                  GROUP BY oi.product_id) s ON s.product_id = p.id
     WHERE ${where.length ? where.join(' AND ') : '1=1'}`;
}

// Customers who'd get the back-in-stock WhatsApp: saved it (wishlist) or
// have it in an active cart, with a phone on file — the productAlertService
// audience before its anti-spam limits.
async function waitingByProduct(ids) {
  if (!ids.length) return new Map();
  try {
    const rows = await q(
      `SELECT x.pid, COUNT(DISTINCT x.uid) AS n FROM (
         SELECT w.productId AS pid, w.userId AS uid FROM wishlists w WHERE w.productId IN (:ids) AND w.userId IS NOT NULL
         UNION
         SELECT ci.product_id, c.user_id FROM cart_items ci JOIN carts c ON c.id = ci.cart_id
          WHERE ci.product_id IN (:ids) AND c.status = 'active' AND c.user_id IS NOT NULL
       ) x JOIN users u ON u.id = x.uid
      WHERE u.deleted_at IS NULL AND u.phone IS NOT NULL AND u.phone <> ''
      GROUP BY x.pid`, { ids });
    return new Map(rows.map((r) => [num(r.pid), num(r.n)]));
  } catch (_) { return new Map(); }
}

async function listStock({ search = '', brandId = null, stock = 'all', sort = 'attention', page = 1, limit = 25 } = {}) {
  await ensureSchema().catch(() => {});
  const filter = FILTERS[stock] ? stock : 'all';
  const order = SORTS[sort] || SORTS.attention;
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const since = new Date(Date.now() - SOLD_WINDOW_DAYS * 86400000);
  const term = String(search || '').trim().slice(0, 100);

  const R = { brandId, since, low: LOW_STOCK, limit, offset: (page - 1) * limit };
  const listBase = baseSql({ brandId, search: term }, R);
  const tileR = { brandId, since, low: LOW_STOCK };
  const tileBase = baseSql({ brandId, search: '' }, tileR);

  const [rows, [cnt], [tiles]] = await Promise.all([
    q(`SELECT t.* FROM (${listBase}) t WHERE ${FILTERS[filter]} ORDER BY ${order} LIMIT :limit OFFSET :offset`, R),
    q(`SELECT COUNT(*) AS n FROM (${listBase}) t WHERE ${FILTERS[filter]}`, R),
    q(`SELECT COUNT(*) AS all_n,
              COALESCE(SUM(${FILTERS.out}), 0) AS out_n,
              COALESCE(SUM(CASE WHEN t.status = 'active' THEN t.out_n ELSE 0 END), 0) AS out_sizes,
              COALESCE(SUM(${FILTERS.low}), 0) AS low_n,
              COALESCE(SUM(CASE WHEN t.status = 'active' THEN t.low_n ELSE 0 END), 0) AS low_sizes,
              COALESCE(SUM(${FILTERS.slow}), 0) AS slow_n,
              COALESCE(SUM(${FILTERS.hidden}), 0) AS hidden_n
         FROM (${tileBase}) t`, tileR),
  ]);

  const ids = rows.map((r) => num(r.id));
  const [brandRows, imgRows, waiting, waitingOut] = await Promise.all([
    ids.length ? q(`SELECT pb.product_id, pb.status, b.id, b.name, b.display_name, b.slug
                      FROM product_brands pb JOIN brands b ON b.id = pb.brand_id
                     WHERE pb.product_id IN (:ids) ORDER BY b.id`, { ids }) : [],
    ids.length ? q(`SELECT product_id, image_url FROM product_images
                     WHERE product_id IN (:ids) AND (status IS NULL OR status = 'active')
                     ORDER BY product_variation_id IS NOT NULL, is_primary DESC, display_order ASC, id ASC`, { ids }) : [],
    waitingByProduct(ids),
    // Total waiting across every product that is completely sold out (tile note).
    q(`SELECT p.id FROM products p
        WHERE p.status = 'active'${brandId ? ' AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :brandId)' : ''}
          AND EXISTS (SELECT 1 FROM product_variations v WHERE v.productId = p.id)
          AND NOT EXISTS (SELECT 1 FROM product_variations v WHERE v.productId = p.id AND v.stock > 0)`, { brandId })
      .then((r) => waitingByProduct(r.map((x) => num(x.id))))
      .then((m) => [...m.values()].reduce((a, b) => a + b, 0))
      .catch(() => 0),
  ]);

  const brandsBy = new Map();
  for (const b of brandRows) {
    const k = num(b.product_id);
    if (!brandsBy.has(k)) brandsBy.set(k, []);
    brandsBy.get(k).push({ id: num(b.id), name: b.display_name || b.name, slug: b.slug, live: b.status !== 'inactive' });
  }
  const imgBy = new Map();
  for (const im of imgRows) { const k = num(im.product_id); if (!imgBy.has(k)) imgBy.set(k, im.image_url); }

  const items = rows.map((r) => {
    const id = num(r.id);
    const totalStock = num(r.total_stock);
    const sold30 = num(r.sold30);
    const brands = brandsBy.get(id) || [];
    const locked = num(r.badge_locked) === 1;
    let visibility = 'live';
    if (r.status !== 'active') visibility = r.status === 'draft' ? 'draft' : 'off';
    else if (!num(r.visible)) visibility = brands.length ? 'brand_off' : 'no_brand';
    return {
      id, name: r.name, slug: r.slug, status: r.status, category: r.category || null,
      thumb: thumbUrl(imgBy.get(id)),
      brands,
      variationCount: num(r.var_n), outSizes: num(r.out_n), lowSizes: num(r.low_n),
      totalStock, minPrice: r.min_price != null ? Number(r.min_price) : null, maxPrice: r.max_price != null ? Number(r.max_price) : null,
      sold30, daysLeft: daysLeft(totalStock, sold30),
      waiting: waiting.get(id) || 0,
      badge: r.badge || 'none', badgeLocked: locked, badgeReason: badgeReason(r.badge || 'none', locked),
      visible: num(r.visible) === 1, visibility,
    };
  });

  const total = num(cnt?.n);
  return {
    items, total, page, limit, pages: Math.ceil(total / limit),
    counts: {
      all: num(tiles?.all_n), out: num(tiles?.out_n), outSizes: num(tiles?.out_sizes),
      low: num(tiles?.low_n), lowSizes: num(tiles?.low_sizes),
      slow: num(tiles?.slow_n), hidden: num(tiles?.hidden_n), waitingOut,
    },
    rules: { lowStock: LOW_STOCK, slowMinStock: SLOW_MIN_STOCK, slowDays: SLOW_DAYS, soldWindowDays: SOLD_WINDOW_DAYS },
  };
}

// ── Sizes of one product ──────────────────────────────────────────────────
async function getVariations(productId) {
  const pid = parseInt(productId, 10);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  await ensureSchema().catch(() => {});
  const since = new Date(Date.now() - SOLD_WINDOW_DAYS * 86400000);
  const [[product], vars, inCart, waiting] = await Promise.all([
    q(`SELECT id, name, status, badge${columnKnown ? ', badge_locked' : ''} FROM products WHERE id = :pid`, { pid }),
    q(`SELECT v.id, v.sku, v.price, v.comparePrice, v.stock, v.status, v.attributes, COALESCE(s.sold30, 0) AS sold30
         FROM product_variations v
         LEFT JOIN (SELECT oi.variation_id, SUM(oi.quantity) AS sold30
                      FROM order_items oi JOIN orders o ON o.id = oi.order_id
                     WHERE oi.product_id = :pid AND o.created_at >= :since AND ${BOOKED}
                     GROUP BY oi.variation_id) s ON s.variation_id = v.id
        WHERE v.productId = :pid ORDER BY v.id`, { pid, since }),
    q(`SELECT ci.variation_id, COUNT(DISTINCT c.user_id) AS n
         FROM cart_items ci JOIN carts c ON c.id = ci.cart_id JOIN users u ON u.id = c.user_id
        WHERE ci.product_id = :pid AND c.status = 'active' AND u.deleted_at IS NULL AND u.phone IS NOT NULL AND u.phone <> ''
        GROUP BY ci.variation_id`, { pid }).catch(() => []),
    waitingByProduct([pid]),
  ]);
  if (!product) return null;
  const cartBy = new Map(inCart.map((r) => [num(r.variation_id), num(r.n)]));
  const variations = vars.map((v) => {
    const stock = num(v.stock);
    const sold30 = num(v.sold30);
    return {
      id: num(v.id), sku: v.sku, label: variationLabel(v.attributes, v.sku),
      price: v.price != null ? Number(v.price) : null, comparePrice: v.comparePrice != null ? Number(v.comparePrice) : null,
      stock, sold30, daysLeft: daysLeft(stock, sold30), active: v.status !== 'inactive',
      inCarts: cartBy.get(num(v.id)) || 0,
    };
  });
  const totalStock = variations.reduce((a, v) => a + Math.max(0, v.stock), 0);
  const locked = num(product.badge_locked) === 1;
  const badge = product.badge || 'none';
  return {
    product: {
      id: num(product.id), name: product.name, status: product.status, totalStock, waiting: waiting.get(pid) || 0,
      badge, badgeLocked: locked, badgeReason: badgeReason(badge, locked),
    },
    variations,
  };
}

// Validate an inline stock value: a whole number from 0 up.
function parseStock(raw) {
  if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return null;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n <= MAX_STOCK ? n : null;
}

/**
 * Set one size's stock. `expected` (what the admin saw) guards against an
 * order landing in between: if the stored value moved, nothing is written and
 * the caller gets the current number back (409).
 */
async function updateVariationStock(variationId, rawStock, rawExpected) {
  const vid = parseInt(variationId, 10);
  if (!Number.isFinite(vid) || vid <= 0) return { status: 404, body: { success: false, message: 'Size not found' } };
  const stock = parseStock(rawStock);
  if (stock === null) return { status: 400, body: { success: false, message: 'Stock must be a whole number, 0 or more' } };
  const expected = rawExpected === undefined || rawExpected === null || rawExpected === '' ? null : parseStock(rawExpected);

  const { ProductVariation } = require('../model/associations');
  const t = await sequelize.transaction();
  let productId; let before; let productBefore; let productAfter; let sellableBefore; let sellableAfter;
  try {
    const v = await ProductVariation.findByPk(vid, { transaction: t, lock: t.LOCK.UPDATE });
    if (!v) { await t.rollback(); return { status: 404, body: { success: false, message: 'Size not found' } }; }
    before = num(v.stock);
    productId = num(v.productId);
    if (expected !== null && expected !== before) {
      await t.rollback();
      return { status: 409, body: { success: false, code: 'STOCK_CHANGED', current: before,
        message: `Stock changed to ${before} while you were typing (an order or another edit). Check it and try again.` } };
    }
    // `sellable` = active sizes only — the same total productAlertService uses
    // to decide "sold out" vs "in stock".
    const [sums] = await q(
      `SELECT COALESCE(SUM(GREATEST(stock, 0)), 0) AS n,
              COALESCE(SUM(CASE WHEN status = 'active' THEN GREATEST(stock, 0) ELSE 0 END), 0) AS sellable
         FROM product_variations WHERE productId = ?`, [productId], { transaction: t });
    productBefore = num(sums?.n);
    sellableBefore = num(sums?.sellable);
    const delta = stock - Math.max(0, before);
    productAfter = productBefore + delta;
    sellableAfter = sellableBefore + (v.status === 'inactive' ? 0 : delta);
    if (stock !== before) await v.update({ stock }, { transaction: t });
    await t.commit();
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }

  // Side effects after commit — never fail the save because of them.
  const cacheManager = require('./cacheManager.js');
  await Promise.all([cacheManager.invalidate('products:*'), cacheManager.invalidate('product:*')]).catch(() => {});
  try {
    const { Product } = require('../model/productModel.js');
    const product = await Product.findByPk(productId);
    if (product) await require('./badgeService.js').updateBadgeIfChanged(product);
  } catch (_) { /* badge refresh is best effort */ }

  // Back in stock: the whole product was sold out and now has stock. Make
  // sure the alert snapshot knows it was sold out (it may have sold out
  // between cron runs), then run the same check the 30-minute cron uses, for
  // this product only. At night the check waits for the first morning run.
  let restockAlert = null;
  if (sellableBefore <= 0 && sellableAfter > 0) {
    const alerts = require('./productAlertService.js');
    restockAlert = alerts.inSendingHours() ? 'sending' : 'morning';
    alerts.recordSoldOut(productId)
      .then(() => alerts.checkProductNow(productId))
      .catch((e) => {
        try { require('../config/logging.js').logger.warn(`[ProductAlerts] restock check for ${productId} failed: ${e.message}`); } catch { /* ignore */ }
      });
  }

  return {
    status: 200,
    body: { success: true, variation: { id: vid, stock, before }, product: { id: productId, totalStock: productAfter, totalBefore: productBefore }, restockAlert },
  };
}

module.exports = {
  ensureSchema, isBadgeLocked, setBadgeLocked, parseBadgeLock, badgeReason,
  listStock, getVariations, updateVariationStock, parseStock, variationLabel,
  LOW_STOCK, BADGES,
};
