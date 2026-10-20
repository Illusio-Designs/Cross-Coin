// Product report — GET /api/reports/products
//
// Params: startDate, endDate (IST days), brandId, sort, productId (adds the
// detail panel; with part=detail ONLY the panel is computed — used on row clicks).
//
// Every sales number counts order lines on orders PLACED in the range
// (cancelled left out), so units match the Overview's "Top products":
//   units / gross    quantity and price × quantity
//   net sales        gross − the line's own discount (order-level coupons are
//                    not split per product)
//   returned %       units on orders the customer sent back ÷ delivered units
//   RTO %            units on courier returns ÷ (delivered + RTO units)
//   (same order stages as the Overview — salesReportService STAGE_SQL; returns
//   are whole-order today, the storefronts never send per-item lists)
//   margin %         admin only: (net − cost price × units) ÷ net, over lines
//                    whose variant has a cost price
//
// Views to purchase (funnel_events by product_id — only tracked from the date
// in `funnelSince`): sessions that viewed / added to cart; "checkout" is
// sessions that added the product to cart and then started checkout in the
// same visit (begin_checkout has no product). Bought = orders containing the
// product placed on/after tracking began, so conversion compares like with like.
const { sequelize } = require('../../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../../config/logging.js');
const { parseRange, canSeeCost, brandOf, PLACED_SQL } = require('./common.js');
const { STAGE_SQL } = require('../salesReportService.js');

const LIMIT = 200;
const DAY = 864e5;
const SORTS = ['units', 'net', 'returns', 'rto', 'margin', 'rating', 'stock', 'views', 'conversion'];
const REASONS = {
  damaged: 'arrived damaged', defective: 'defective', wrong: 'wrong item sent',
  notdesc: 'not as described', changed: 'changed their mind', other: 'other',
};

const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round(num(v) * 100) / 100;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const istYmd = (d) => (d ? new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 10) : null);
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// Distinct sessions for one event; rows without a session count one each.
const sessions = (ev) =>
  `(COUNT(DISTINCT CASE WHEN fe.event = '${ev}' THEN NULLIF(fe.session_id, '') END)
    + SUM(fe.event = '${ev}' AND NULLIF(fe.session_id, '') IS NULL))`;

// Product belongs to a store: linked in product_brands, or its own brand_id
// when it has no store links at all (same rule as the SEO / attributes pages).
const IN_BRAND = `(EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :brandId AND (pb.status IS NULL OR pb.status = 'active'))
   OR (p.brand_id = :brandId AND NOT EXISTS (SELECT 1 FROM product_brands pb2 WHERE pb2.product_id = p.id)))`;

// "Black · M" from a variation's attributes JSON ({colour:["Black"], size:["M"], _images:…}).
function variantLabel(attrs, fallback) {
  let a = attrs;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { return a.trim() || fallback; } }
  if (!a || typeof a !== 'object') return fallback;
  const rank = (k) => (/colou?r/i.test(k) ? 0 : /size/i.test(k) ? 1 : 2);
  const parts = Object.keys(a).filter((k) => !k.startsWith('_')).sort((x, y) => rank(x) - rank(y))
    .map((k) => (Array.isArray(a[k]) ? a[k].join(', ') : (a[k] && typeof a[k] === 'object' ? '' : String(a[k] ?? ''))))
    .filter((s) => s.trim());
  return parts.length ? parts.join(' · ') : fallback;
}

// Per-product (or per-variant) sales on placed orders in a range.
function salesSql({ by, brandId, pid, limit }) {
  const col = by === 'variant' ? 'oi.variation_id' : 'oi.product_id';
  return `SELECT ${col} AS id,
          SUM(oi.quantity) AS units, COUNT(DISTINCT o.id) AS orders,
          SUM(oi.price * oi.quantity) AS gross,
          SUM(oi.price * oi.quantity - COALESCE(oi.discount, 0)) AS net,
          SUM(CASE WHEN ${STAGE_SQL} IN ('delivered','returned') THEN oi.quantity ELSE 0 END) AS delivered_units,
          SUM(CASE WHEN ${STAGE_SQL} = 'returned' THEN oi.quantity ELSE 0 END) AS returned_units,
          SUM(CASE WHEN ${STAGE_SQL} = 'rto' THEN oi.quantity ELSE 0 END) AS rto_units,
          SUM(CASE WHEN ${STAGE_SQL} = 'rto' AND LOWER(o.payment_type) = 'cod' THEN oi.quantity ELSE 0 END) AS rto_cod_units,
          SUM(CASE WHEN pv.cost_price IS NOT NULL THEN oi.quantity ELSE 0 END) AS costed_units,
          SUM(CASE WHEN pv.cost_price IS NOT NULL THEN oi.price * oi.quantity - COALESCE(oi.discount, 0) ELSE 0 END) AS costed_net,
          SUM(COALESCE(pv.cost_price, 0) * oi.quantity) AS cost,
          COUNT(DISTINCT CASE WHEN o.created_at >= :trackFrom THEN o.id END) AS bought_tracked
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN (SELECT DISTINCT order_id FROM returns) rt ON rt.order_id = o.id
     LEFT JOIN product_variations pv ON pv.id = oi.variation_id
    WHERE o.created_at BETWEEN :start AND :end AND ${PLACED_SQL}
      ${brandId ? 'AND o.brand_id = :brandId' : ''} ${pid ? 'AND oi.product_id = :pid' : ''}
    GROUP BY ${col} ORDER BY units DESC ${limit ? `LIMIT ${Number(limit)}` : ''}`;
}

// Viewing / add-to-cart sessions per product.
function funnelSql({ brandId, pid, limit }) {
  return `SELECT fe.product_id AS id, ${sessions('view_item')} AS views, ${sessions('add_to_cart')} AS carts
     FROM funnel_events fe
    WHERE ${pid ? 'fe.product_id = :pid' : 'fe.product_id IS NOT NULL'}
      AND fe.event IN ('view_item','add_to_cart') AND fe.created_at BETWEEN :start AND :end
      ${brandId ? 'AND fe.brand_id = :brandId' : ''}
    GROUP BY fe.product_id ORDER BY views DESC ${limit ? `LIMIT ${Number(limit)}` : ''}`;
}

// Sessions that added the product to cart and later started checkout.
function checkoutSql({ brandId, pid }) {
  return `SELECT a.product_id AS id, COUNT(DISTINCT a.session_id) AS checkouts
     FROM funnel_events a
    WHERE ${pid ? 'a.product_id = :pid' : 'a.product_id IS NOT NULL'}
      AND a.event = 'add_to_cart' AND a.created_at BETWEEN :start AND :end
      AND a.session_id IS NOT NULL AND a.session_id <> ''
      ${brandId ? 'AND a.brand_id = :brandId' : ''}
      AND EXISTS (SELECT 1 FROM funnel_events c
                   WHERE c.session_id = a.session_id AND c.event = 'begin_checkout'
                     AND c.created_at >= a.created_at AND c.created_at <= :end)
    GROUP BY a.product_id`;
}

const rates = (s) => {
  const delivered = num(s?.delivered_units), returned = num(s?.returned_units), rto = num(s?.rto_units);
  return { deliveredUnits: delivered, returnedUnits: returned, rtoUnits: rto, returnRate: pct(returned, delivered), rtoRate: pct(rto, delivered + rto) };
};

// Plain-language advice for the detail panel, most urgent first.
function tipsFor(d, days) {
  const tips = [];
  const f = d.funnel;
  if (d.stock <= 0 && d.units > 0) tips.push({ tone: 'bad', text: 'Out of stock. Restock it, or pause ads that send shoppers to it.' });
  if (d.returnRate != null && d.returnRate >= 10) {
    const top = d.returnReasons[0];
    tips.push({ tone: 'bad', text: `About 1 in ${Math.max(2, Math.round(100 / d.returnRate))} delivered is sent back${top ? `: “${top.label}” is the top reason` : ''}. ${top && ['notdesc', 'wrong'].includes(top.reason) ? 'Check the photos and description match the product.' : top && ['damaged', 'defective'].includes(top.reason) ? 'Check the packing and quality before dispatch.' : 'Check the size guide and description.'}` });
  }
  if (d.rtoRate != null && d.rtoRate >= 15) {
    const codShare = d.rtoUnits ? Math.round((d.rtoCodUnits / d.rtoUnits) * 100) : 0;
    tips.push({ tone: 'bad', text: `${d.rtoRate}% of shipped units come back undelivered (RTO)${codShare >= 60 ? `, mostly cash-on-delivery orders (${codShare}%)` : ''}. Confirm COD orders by call or WhatsApp before shipping.` });
  }
  const perDay = d.units / days;
  if (d.stock > 0 && perDay > 0 && d.stock / perDay < 7) {
    tips.push({ tone: 'warn', text: `Only ${d.stock} left — about ${Math.max(1, Math.round(d.stock / perDay))} day${Math.round(d.stock / perDay) === 1 ? '' : 's'} of sales at the current pace. Restock soon.` });
  }
  if (f && f.views >= 50 && f.carts / f.views < 0.05) {
    tips.push({ tone: 'warn', text: `Seen by ${f.views} shoppers, but under 5% add it to cart. Try better photos or a lower price.` });
  }
  if (f && f.checkouts >= 10 && f.bought / f.checkouts < 0.4) {
    tips.push({ tone: 'warn', text: 'Many start checkout with it but don’t order. Check the delivery fee and whether cash on delivery is offered.' });
  }
  if (!tips.length) {
    if (f && f.views > 0 && f.bought > 0) tips.push({ tone: 'good', text: `Healthy: about 1 in ${Math.max(1, Math.round(f.views / f.bought))} viewers buys it.` });
    else if (d.units > 0) tips.push({ tone: 'good', text: 'No warning signs in this period.' });
    else tips.push({ tone: 'mute', text: 'No orders for this product in this period.' });
  }
  return tips;
}

exports.handler = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const brandId = brandOf(req.query);
    const showCost = canSeeCost(req.user);
    const pidN = Number.parseInt(req.query.productId, 10);
    const pid = Number.isFinite(pidN) && pidN > 0 ? pidN : null;
    let sort = SORTS.includes(req.query.sort) ? req.query.sort : 'units';
    if (sort === 'margin' && !showCost) sort = 'units';

    const span = end.getTime() - start.getTime() + 1;
    const days = Math.max(1, Math.round(span / DAY));
    const prev = { start: new Date(start.getTime() - span), end: new Date(start.getTime() - 1) };
    const d30 = new Date(end.getTime() - 30 * DAY + 1);

    // When product-level funnel tracking began (needed to compare "bought" fairly).
    const [fs] = await q('SELECT MIN(created_at) AS first FROM funnel_events WHERE product_id IS NOT NULL', {});
    const trackStart = fs?.first ? new Date(fs.first) : null;
    const trackFrom = trackStart && trackStart > start ? trackStart : start;
    // No tracking yet → nothing counts as "bought since tracking".
    const R = { start, end, brandId, pid, trackFrom: trackStart ? trackFrom : new Date(end.getTime() + 1) };
    const funnelOn = !!trackStart && trackStart <= end;

    // part=detail (with productId) → only the detail panel, for row clicks.
    const listPart = !(pid && req.query.part === 'detail');
    const scope = brandId ? `AND ${IN_BRAND}` : '';
    const [salesRows, funnelRows, checkoutRows, [tot], [prevTot], [active], [notSold]] = !listPart
      ? [[], [], [], [{}], [{}], [{}], [{}]]
      : await Promise.all([
      q(salesSql({ brandId, limit: LIMIT }), R),
      funnelOn ? q(funnelSql({ brandId, limit: LIMIT }), R) : [],
      funnelOn ? q(checkoutSql({ brandId }), R) : [],
      q(`SELECT COUNT(DISTINCT oi.product_id) AS products, SUM(oi.quantity) AS units,
                SUM(oi.price * oi.quantity) AS gross, SUM(oi.price * oi.quantity - COALESCE(oi.discount, 0)) AS net
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE o.created_at BETWEEN :start AND :end AND ${PLACED_SQL} ${brandId ? 'AND o.brand_id = :brandId' : ''}`, R),
      q(`SELECT SUM(oi.quantity) AS units FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE o.created_at BETWEEN :start AND :end AND ${PLACED_SQL} ${brandId ? 'AND o.brand_id = :brandId' : ''}`, { ...prev, brandId }),
      q(`SELECT COUNT(*) AS n FROM products p WHERE p.status = 'active' ${scope}`, R),
      // Active products (older than 30 days) with no order in the 30 days to the end date.
      q(`SELECT COUNT(*) AS products, SUM(COALESCE(st.stock, 0) > 0) AS with_stock,
                SUM(COALESCE(st.stock, 0)) AS stock_units, SUM(COALESCE(st.value, 0)) AS stock_value,
                SUM(COALESCE(st.uncosted, 0)) AS uncosted_units
           FROM products p
           LEFT JOIN (SELECT productId, SUM(GREATEST(stock, 0)) AS stock,
                             SUM(GREATEST(stock, 0) * COALESCE(cost_price, 0)) AS value,
                             SUM(CASE WHEN cost_price IS NULL THEN GREATEST(stock, 0) ELSE 0 END) AS uncosted
                        FROM product_variations WHERE status IS NULL OR status = 'active' GROUP BY productId) st ON st.productId = p.id
          WHERE p.status = 'active' ${scope}
            AND COALESCE(p.created_at, p.createdAt) <= :d30
            AND NOT EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
                             WHERE oi.product_id = p.id AND o.created_at BETWEEN :d30 AND :end AND ${PLACED_SQL}
                             ${brandId ? 'AND o.brand_id = :brandId' : ''})`, { ...R, d30 }),
    ]);

    // Product list = top sellers ∪ most-viewed (so "seen but never bought" shows up), top 200.
    const sales = new Map(salesRows.map((r) => [Number(r.id), r]));
    const funnel = new Map(funnelRows.map((r) => [Number(r.id), r]));
    const checkout = new Map(checkoutRows.map((r) => [Number(r.id), num(r.checkouts)]));
    const allIds = [...new Set([...sales.keys(), ...funnel.keys()])].filter((id) => id > 0)
      .sort((a, b) => num(sales.get(b)?.units) - num(sales.get(a)?.units) || num(funnel.get(b)?.views) - num(funnel.get(a)?.views));
    const ids = allIds.slice(0, LIMIT);
    const infoIds = pid && !ids.includes(pid) ? [...ids, pid] : ids;

    const none = [];
    const [info, stock, ratings, wish, images] = infoIds.length ? await Promise.all([
      q(`SELECT p.id, p.name, p.status, c.name AS category, COALESCE(b.display_name, b.name) AS own_brand,
                (SELECT GROUP_CONCAT(DISTINCT COALESCE(b2.display_name, b2.name) ORDER BY b2.id SEPARATOR ', ')
                   FROM product_brands pb JOIN brands b2 ON b2.id = pb.brand_id
                  WHERE pb.product_id = p.id AND (pb.status IS NULL OR pb.status = 'active')) AS brands
           FROM products p LEFT JOIN categories c ON c.id = p.categoryId LEFT JOIN brands b ON b.id = p.brand_id
          WHERE p.id IN (:ids)`, { ids: infoIds }),
      q(`SELECT productId AS id, SUM(GREATEST(stock, 0)) AS stock, GROUP_CONCAT(sku SEPARATOR ' ') AS skus
           FROM product_variations WHERE productId IN (:ids) AND (status IS NULL OR status = 'active') GROUP BY productId`, { ids: infoIds }),
      q(`SELECT productId AS id, AVG(rating) AS rating, COUNT(*) AS reviews FROM reviews
          WHERE status = 'approved' AND productId IN (:ids) GROUP BY productId`, { ids: infoIds }),
      q('SELECT productId AS id, COUNT(*) AS n FROM wishlists WHERE productId IN (:ids) GROUP BY productId', { ids: infoIds })
        .catch(() => null), // table missing on an older install → no wishlist column
      q(`SELECT product_id AS id, image_url FROM product_images
          WHERE product_id IN (:ids) AND (status IS NULL OR status = 'active') AND image_url IS NOT NULL AND image_url <> ''
          ORDER BY product_id, is_primary DESC, (product_variation_id IS NULL) DESC, display_order, id`, { ids: infoIds }),
    ]) : [none, none, none, [], none];

    const byId = (rows) => new Map((rows || []).map((r) => [Number(r.id), r]));
    const infoM = byId(info), stockM = byId(stock), ratingM = byId(ratings), wishM = wish ? byId(wish) : null;
    const imgM = new Map();
    for (const r of images) if (!imgM.has(Number(r.id))) imgM.set(Number(r.id), r.image_url);

    const build = (id, s, f, chk) => {
      const p = infoM.get(id) || {};
      const units = num(s?.units), net = r2(s?.net), views = f ? num(f.views) : 0, carts = f ? num(f.carts) : 0;
      const bought = num(s?.bought_tracked);
      const row = {
        id, name: p.name || `Product #${id}`, active: p.status === 'active',
        brand: p.brands || p.own_brand || null, category: p.category || null, image: imgM.get(id) || null,
        skus: stockM.get(id)?.skus || '',
        units, orders: num(s?.orders), grossSales: r2(s?.gross), netSales: net,
        ...rates(s), rtoCodUnits: num(s?.rto_cod_units),
        rating: ratingM.has(id) ? Math.round(num(ratingM.get(id).rating) * 10) / 10 : null,
        reviews: num(ratingM.get(id)?.reviews),
        wishlist: wishM ? num(wishM.get(id)?.n) : null,
        stock: num(stockM.get(id)?.stock),
        views, carts, checkouts: chk || 0, bought,
        cartRate: pct(carts, views), conversion: views > 0 ? pct(bought, views) : null,
      };
      if (showCost) {
        const cu = num(s?.costed_units), cn = num(s?.costed_net);
        row.cost = r2(s?.cost);
        row.margin = cu > 0 && cn > 0 ? pct(cn - num(s?.cost), cn) : null;
        row.uncostedUnits = units - cu;
      }
      return row;
    };

    const products = ids.map((id) => build(id, sales.get(id), funnel.get(id), checkout.get(id)));
    const key = { units: 'units', net: 'netSales', returns: 'returnRate', rto: 'rtoRate', margin: 'margin', rating: 'rating', stock: 'stock', views: 'views', conversion: 'conversion' }[sort];
    const val = (r) => (r[key] == null ? -Infinity : r[key]);
    products.sort((a, b) => (sort === 'stock' ? val(a) - val(b) : val(b) - val(a)) || b.units - a.units);

    // ── Detail panel for one product ──
    let detail = null;
    if (pid) {
      const [[ps], [pf], [pc], vSales, variations, reasons] = await Promise.all([
        q(salesSql({ brandId, pid }), R),
        funnelOn ? q(funnelSql({ brandId, pid }), R) : [],
        funnelOn ? q(checkoutSql({ brandId, pid }), R) : [],
        q(salesSql({ by: 'variant', brandId, pid }), R),
        q(`SELECT id, sku, attributes, stock, status FROM product_variations WHERE productId = :pid ORDER BY id`, { pid }),
        q(`SELECT r.reason, COUNT(DISTINCT r.id) AS n FROM returns r JOIN orders o ON o.id = r.order_id
            WHERE o.created_at BETWEEN :start AND :end AND ${PLACED_SQL} ${brandId ? 'AND o.brand_id = :brandId' : ''}
              AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = :pid)
            GROUP BY r.reason ORDER BY n DESC`, R),
      ]);
      const base = build(pid, ps, pf || null, num(pc?.checkouts));
      const vMap = new Map(vSales.map((v) => [v.id == null ? 0 : Number(v.id), v]));
      const variants = variations
        .filter((v) => vMap.has(Number(v.id)) || v.status !== 'inactive')
        .map((v) => {
          const s = vMap.get(Number(v.id));
          return { id: v.id, label: variantLabel(v.attributes, v.sku || `Variant #${v.id}`), sku: v.sku || '', units: num(s?.units), ...rates(s), stock: Math.max(0, num(v.stock)), active: v.status !== 'inactive' };
        });
      // Lines sold without a variant id (old orders) or for a deleted variant.
      for (const [vid, s] of vMap) {
        if (!variations.some((v) => Number(v.id) === vid)) {
          variants.push({ id: vid || null, label: vid ? `Deleted variant #${vid}` : 'No variant recorded', sku: '', units: num(s.units), ...rates(s), stock: null, active: false });
        }
      }
      variants.forEach((v) => { v.share = pct(v.units, base.units); });
      variants.sort((a, b) => b.units - a.units || num(b.stock) - num(a.stock));
      const returnReasons = reasons.map((r) => ({ reason: r.reason, label: REASONS[r.reason] || r.reason, count: num(r.n) }));
      detail = {
        ...base,
        funnel: funnelOn ? { views: base.views, carts: base.carts, checkouts: base.checkouts, bought: base.bought } : null,
        variants, returnReasons,
      };
      detail.tips = tipsFor(detail, days);
    }

    const units = num(tot?.units), prevUnits = num(prevTot?.units);
    const notSold30 = { products: num(notSold?.products), withStock: num(notSold?.with_stock), stockUnits: num(notSold?.stock_units), since: istYmd(d30) };
    if (showCost) { notSold30.stockValue = r2(notSold?.stock_value); notSold30.uncostedUnits = num(notSold?.uncosted_units); }

    const head = { success: true, range: { start, end, days }, brandId, sort, canSeeCost: showCost, funnelSince: istYmd(trackStart), funnelTracked: funnelOn };
    if (!listPart) return res.json({ ...head, detail });
    return res.json({
      ...head,
      kpis: {
        productsSold: num(tot?.products), activeProducts: num(active?.n),
        units, prevUnits, unitsDelta: prevUnits ? Math.round(((units - prevUnits) / prevUnits) * 1000) / 10 : null,
        netSales: r2(tot?.net), grossSales: r2(tot?.gross),
        notSold30,
      },
      totalProducts: Math.max(allIds.length, num(tot?.products)),
      limited: allIds.length > LIMIT || num(tot?.products) > LIMIT,
      products,
      detail,
    });
  } catch (err) {
    logger.error(`[reports/products] ${err.message}`);
    return res.status(500).json({ success: false, message: 'Could not load the product report.' });
  }
};

// Exposed for tests.
exports._variantLabel = variantLabel;
