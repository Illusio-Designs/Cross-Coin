// Inventory report — days of stock left for every active variant, what to
// reorder, and stock that is not selling.
//
// GET /api/reports/inventory?brandId=&filter=all|action|over&q=&window=7|30|90&limit=
//
// One row per ACTIVE variation of an ACTIVE product:
//   sold        = units on orders placed in the last `window` India days
//                 (cancelled left out) MINUS units on orders that came back —
//                 courier RTO or a customer return (same order stages as the
//                 Reports overview, salesReportService.STAGE_SQL)
//   per day     = sold ÷ window
//   days left   = stock ÷ per day (null = ∞, nothing sold)
//   sell-through= sold ÷ (sold + stock now)
//   revenue     = order_items.subtotal on those kept units (drives ABC)
//   value       = stock × cost price (admins only)
//
// Stock is one pool shared by every store a product is listed in, so sales
// count orders from EVERY store even when one brand is picked — otherwise
// days left would be overstated. The brand picker only chooses which
// variants are listed (products that store sells).
//
// ABC by revenue in the window, over every listed variant (before search):
//   A = top 80% of cumulative revenue, B = next 15%, C = the rest (incl. 0).
// Grade A variants are told to reorder at 14 days left instead of 7.
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../config/db.js');
const { logger } = require('../../config/logging.js');
const { parseRange, canSeeCost, brandOf, PLACED_SQL } = require('./common.js');
const { STAGE_SQL } = require('../salesReportService.js');
const { variationLabel } = require('../productStockService.js');

const WINDOWS = [7, 30, 90];
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 20000;          // CSV export asks for everything
const REORDER_DAYS = 7;
const REORDER_DAYS_A = 14;
const LOW_DAYS = 21;
const OVER_DAYS = 120;

const num = (v) => Number(v) || 0;
const r1 = (v) => Math.round(num(v) * 10) / 10;
const r2 = (v) => Math.round(num(v) * 100) / 100;
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// Sorting order of the statuses — most urgent first.
const RANK = { out: 0, reorder: 1, low: 2, over: 3, dead: 4, ok: 5 };
const ACTION = new Set(['out', 'reorder', 'low']);
const SLOW = new Set(['over', 'dead']);

function statusOf({ stock, sold, daysLeft, grade }, windowDays) {
  if (stock <= 0) return { key: 'out', label: 'Out of stock' };
  if (sold <= 0) return { key: 'dead', label: `No sales in ${windowDays} days` };
  if (daysLeft < (grade === 'A' ? REORDER_DAYS_A : REORDER_DAYS)) return { key: 'reorder', label: 'Reorder now' };
  if (daysLeft < LOW_DAYS) return { key: 'low', label: 'Low' };
  if (daysLeft > OVER_DAYS) return { key: 'over', label: 'Too much stock' };
  return { key: 'ok', label: 'Healthy' };
}

// Shoppers waiting for a product: saved it (wishlist) or have it in an active
// cart, with a phone on file — the people the back-in-stock WhatsApp alert
// (productAlertService) goes to. Product-level: wishlists have no variant.
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
  } catch (e) {
    logger.warn(`inventory report: waiting shoppers unavailable: ${e.message}`);
    return new Map();
  }
}

// Today and window start as IST calendar dates (YYYY-MM-DD).
function windowDates(days) {
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const startD = new Date(`${today}T00:00:00.000Z`);
  startD.setUTCDate(startD.getUTCDate() - (days - 1));
  return { from: startD.toISOString().slice(0, 10), to: today };
}

async function handler(req, res) {
  try {
    const query = req.query || {};
    const admin = canSeeCost(req.user);
    const brandId = brandOf(query);
    const windowDays = WINDOWS.includes(Number(query.window)) ? Number(query.window) : 30;
    const filter = ['all', 'action', 'over'].includes(query.filter) ? query.filter : 'all';
    const term = String(query.q || '').trim().toLowerCase().slice(0, 100);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const { from, to } = windowDates(windowDays);
    const { start, end } = parseRange({ startDate: from, endDate: to });

    // Products a store sells: listed in product_brands (live), or — for
    // products with no store links at all — their own brand_id.
    const brandWhere = brandId
      ? `AND (EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :brandId AND (pb.status IS NULL OR pb.status = 'active'))
              OR (p.brand_id = :brandId AND NOT EXISTS (SELECT 1 FROM product_brands pb2 WHERE pb2.product_id = p.id)))`
      : '';

    const [variants, sales, brandRows] = await Promise.all([
      q(`SELECT v.id, v.productId AS product_id, v.sku, v.stock, v.cost_price, v.attributes,
                p.name AS product, p.brand_id
           FROM product_variations v
           JOIN products p ON p.id = v.productId
          WHERE v.status = 'active' AND p.status = 'active' ${brandWhere}`, { brandId }),
      // Every store's orders (shared stock). Kept = not RTO / not returned.
      q(`SELECT oi.variation_id,
                SUM(oi.quantity) AS placed_units,
                SUM(CASE WHEN st.stage IN ('rto','returned') THEN oi.quantity ELSE 0 END) AS back_units,
                SUM(CASE WHEN st.stage IN ('rto','returned') THEN 0 ELSE oi.subtotal END) AS revenue
           FROM (SELECT o.id, ${STAGE_SQL} AS stage
                   FROM orders o
                   LEFT JOIN (SELECT DISTINCT order_id FROM returns) rt ON rt.order_id = o.id
                  WHERE o.created_at BETWEEN :start AND :end AND ${PLACED_SQL}) st
           JOIN order_items oi ON oi.order_id = st.id
          WHERE oi.variation_id IS NOT NULL
          GROUP BY oi.variation_id`, { start, end }),
      // Store names per product (live listings), primary brand as fallback.
      q(`SELECT pb.product_id, COALESCE(b.display_name, b.name) AS name
           FROM product_brands pb JOIN brands b ON b.id = pb.brand_id
          WHERE (pb.status IS NULL OR pb.status = 'active')
          ORDER BY pb.product_id, b.id`),
    ]);

    const allBrands = await q(`SELECT id, COALESCE(display_name, name) AS name FROM brands`);
    const brandName = new Map(allBrands.map((b) => [num(b.id), b.name]));
    const storesOf = new Map();
    for (const b of brandRows) {
      const k = num(b.product_id);
      if (!storesOf.has(k)) storesOf.set(k, []);
      storesOf.get(k).push(b.name);
    }
    const salesBy = new Map(sales.map((s) => [num(s.variation_id), s]));

    // ── Base rows (every listed variant) ──
    let rows = variants.map((v) => {
      const id = num(v.id);
      const s = salesBy.get(id);
      const placedUnits = num(s?.placed_units);
      const backUnits = num(s?.back_units);
      const sold = Math.max(0, placedUnits - backUnits);
      const stock = num(v.stock);
      const perDay = sold / windowDays;
      const daysLeft = stock <= 0 ? 0 : (perDay > 0 ? stock / perDay : null);
      const stockPos = Math.max(0, stock);
      const row = {
        id, productId: num(v.product_id), product: v.product,
        variant: variationLabel(v.attributes, v.sku), sku: v.sku || '',
        brand: (storesOf.get(num(v.product_id)) || [brandName.get(num(v.brand_id)) || '—']).join(', '),
        stock, sold, placedUnits, returnedUnits: backUnits,
        perDay: r2(perDay), daysLeft: daysLeft === null ? null : r1(daysLeft),
        sellThrough: sold + stockPos > 0 ? r1((sold / (sold + stockPos)) * 100) : null,
        revenue: r2(s?.revenue),
      };
      if (admin) {
        row.costPrice = v.cost_price == null ? null : Number(v.cost_price);
        row.value = row.costPrice == null ? null : r2(stockPos * row.costPrice);
      }
      return row;
    });

    // ── ABC grades by revenue (over all listed variants) ──
    const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);
    const byRevenue = [...rows].sort((a, b) => b.revenue - a.revenue);
    let cum = 0;
    for (const r of byRevenue) {
      const before = totalRevenue > 0 ? cum / totalRevenue : 1;
      if (r.revenue <= 0) r.grade = 'C';
      else r.grade = before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C';
      cum += r.revenue;
    }

    // ── Status ──
    for (const r of rows) {
      const st = statusOf(r, windowDays);
      r.status = st.key; r.statusLabel = st.label;
    }

    // ── Shoppers waiting on out-of-stock products ──
    const outProductIds = [...new Set(rows.filter((r) => r.status === 'out').map((r) => r.productId))];
    const waiting = await waitingByProduct(outProductIds);
    for (const r of rows) if (r.status === 'out') r.waiting = waiting.get(r.productId) || 0;

    // ── KPIs + ABC cards: whole store, not narrowed by search or chip ──
    const sum = (list, f) => list.reduce((a, r) => a + f(r), 0);
    const outRows = rows.filter((r) => r.status === 'out');
    const deadRows = rows.filter((r) => r.status === 'dead');
    const kpis = {
      variants: rows.length,
      unitsInStock: sum(rows, (r) => Math.max(0, r.stock)),
      reorderNow: rows.filter((r) => r.status === 'reorder').length,
      low: rows.filter((r) => r.status === 'low').length,
      outOfStock: outRows.length,
      outWithRequests: outRows.filter((r) => r.waiting > 0).length,
      waitingShoppers: [...waiting.values()].reduce((a, b) => a + b, 0),
      notSelling: deadRows.length,
      notSellingUnits: sum(deadRows, (r) => Math.max(0, r.stock)),
      tooMuch: rows.filter((r) => r.status === 'over').length,
    };
    if (admin) {
      kpis.stockValue = r2(sum(rows, (r) => r.value || 0));
      kpis.notSellingValue = r2(sum(deadRows, (r) => r.value || 0));
      kpis.missingCost = rows.filter((r) => r.costPrice == null && r.stock > 0).length;
    }
    const abc = { totalRevenue: r2(totalRevenue) };
    for (const g of ['A', 'B', 'C']) {
      const list = rows.filter((r) => r.grade === g);
      const revenue = sum(list, (r) => r.revenue);
      abc[g] = { count: list.length, revenue: r2(revenue), share: totalRevenue > 0 ? r1((revenue / totalRevenue) * 100) : 0 };
    }

    // ── Search → chip counts → chip filter ──
    if (term) {
      rows = rows.filter((r) => `${r.product} ${r.variant} ${r.sku} ${r.brand}`.toLowerCase().includes(term));
    }
    const counts = {
      all: rows.length,
      action: rows.filter((r) => ACTION.has(r.status)).length,
      over: rows.filter((r) => SLOW.has(r.status)).length,
    };
    if (filter === 'action') rows = rows.filter((r) => ACTION.has(r.status));
    else if (filter === 'over') rows = rows.filter((r) => SLOW.has(r.status));

    // ── Most urgent first ──
    const tied = (r) => (admin ? (r.value || 0) : Math.max(0, r.stock));
    rows.sort((a, b) => {
      if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
      switch (a.status) {
        case 'out': return b.revenue - a.revenue || (b.waiting || 0) - (a.waiting || 0) || a.product.localeCompare(b.product);
        case 'reorder': case 'low': case 'ok': return a.daysLeft - b.daysLeft || b.revenue - a.revenue;
        case 'over': return b.daysLeft - a.daysLeft || tied(b) - tied(a);
        default: return tied(b) - tied(a) || a.product.localeCompare(b.product);
      }
    });

    const total = rows.length;
    res.json({
      success: true,
      window: windowDays, from, to, filter, q: term,
      canSeeCost: admin,
      thresholds: { reorder: REORDER_DAYS, reorderA: REORDER_DAYS_A, low: LOW_DAYS, over: OVER_DAYS },
      kpis, abc, counts,
      total, limited: total > limit,
      rows: rows.slice(0, limit),
    });
  } catch (err) {
    logger.error(`inventory report failed: ${err.message}`, { stack: err.stack });
    res.status(500).json({ success: false, message: 'Could not load the inventory report' });
  }
}

module.exports = { handler };
