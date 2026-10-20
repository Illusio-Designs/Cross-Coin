// Coupon report — GET /api/reports/coupons?startDate=&endDate=&brandId=&code=
//
// Whether each code brings new buyers or just gives away margin.
//
// How a coupon reaches an order (checked against the order-creation code):
//   • Store checkout (controller/orderController.createOrder for COD,
//     services/orderCreationService for prepaid): the verified coupon is saved
//     on orders.coupon_id and orders.discount_amount is that coupon's discount
//     (couponRulesService). A coupon_usages row is written with the SAME amount,
//     so orders.discount_amount is used here (no extra join, same figure).
//   • Partner checkout (services/customCheckoutService): orders.coupon_id is
//     NULL and the code(s) are only written into orders.notes as
//     "Custom checkout order … / coupon CODE[,CODE2]". The first code is read
//     from there and matched to the coupons table by code. Its discount is the
//     partner's total_discount, which may include the partner's own offers.
//   • NOT coupons (never counted as a code):
//       – prepaid instant discount: discount_amount > 0 with no coupon
//         (checkoutController; it never stacks with a coupon);
//       – pack / bundle-tier and "Build Your Pack" prices: already baked into
//         order_items.price, so they are not in discount_amount at all;
//       – loyalty points: never redeemed at checkout (loyaltyService.debitPoints
//         has no caller), so they discount nothing.
//     Orders with a discount but no code are shown as one "No code" row.
//
// Orders counted: every PLACED order in the range (all but cancelled), by the
// India day it was placed. Stages (delivered / RTO) use the Overview's rules
// (salesReportService STAGE_SQL), so RTO % matches the Overview.
//
// Per code:
//   order value (gross) = Σ orders.total_amount (items, before discount, no shipping)
//   discount given      = Σ orders.discount_amount
//   net sales           = gross − discount (what the items sold for after the code)
//   AOV                 = net sales ÷ orders
//   new buyers          = orders that are the customer's FIRST placed order
//                         (identity rule below; with a store picked, first at that store)
//   RTO %               = RTO ÷ (delivered + RTO)  — closed shipments only
//   COD %               = COD orders ÷ orders
//   margin left % (admin only) =
//       (net sales on orders that were not RTO'd − cost of goods on them
//        − shipping ₹90 × orders) ÷ order value
//     i.e. what is left of each ₹100 of order value after the discount,
//     product cost, shipping and the value lost to RTO. Before ad spend,
//     payment fees and packing; customer returns are not taken off.
//
// Identity (same rule as the Customer report): a customer is a phone number
// (last 10 digits) from the order's shipping address, else the account phone,
// else the guest-checkout phone; hashed phones when DATA_ENCRYPTION_KEY is set.
// No usable phone → the account (u<id>) / guest (g<id>) / the order itself.
//
// Cost: one grouped pass over placed orders up to the end date (first order per
// customer) joined to the in-range orders; everything else is aggregated in SQL
// and only per-code rows come back. ?code= returns just that code's detail
// (top products + latest orders, LIMITed).

const { sequelize } = require('../../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../../config/logging.js');
const { parseRange, canSeeCost, brandOf, PLACED_SQL } = require('./common.js');
const { STAGE_SQL, JOINS } = require('../salesReportService.js');
const { phoneHash } = require('../../utils/encryption.js');

// Same per-order shipping figure the Revenue & Profit report starts from
// (controller/reportsController.getRevenueProfit → defaults.shippingPerOrder);
// it already covers the return leg of an RTO.
const SHIPPING_PER_ORDER = 90;

// ── Verdict thresholds (one tag per code, first rule that matches wins) ──────
//  1. "Ended"              the coupon is past its end date / use limit / marked expired
//  2. "Too few orders"     fewer than MIN_ORDERS orders in the range — rates mean little
//  3. "Losing money"       admin only: margin left < LOSING_MARGIN % (after discount,
//                          goods, shipping and RTO; under 5% payment fees, packing and
//                          ads take the rest, so the order loses money)
//  4. "High RTO"           RTO ≥ HIGH_RTO % with ≥ MIN_CLOSED closed shipments
//                          (the non-admin stand-in for the margin tags; admins see it too)
//  5. "Recovers carts"     the code the abandoned-cart WhatsApp sends (cart rules, default CART10)
//  6. "Brings new buyers"  ≥ NEW_BUYERS % of its orders are first orders
//  7. "Raises basket size" AOV or units per order ≥ BASKET_LIFT × the same figure on
//                          orders WITHOUT a code in the same range and store
//  8. "Thin margin"        admin only: margin left < THIN_MARGIN %
//  9. "No clear gain"      none of the above
const MIN_ORDERS = 5;
const LOSING_MARGIN = 5;
const THIN_MARGIN = 15;
const HIGH_RTO = 25;
const MIN_CLOSED = 5;
const NEW_BUYERS = 60;
const BASKET_LIFT = 1.2;

const DETAIL_PRODUCTS = 5;
const DETAIL_ORDERS = 8;

const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => Number(v) || 0;
const r0 = (v) => Math.round(num(v));
const r1 = (v) => Math.round(num(v) * 10) / 10;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const inr = (v) => `₹${Math.round(num(v)).toLocaleString('en-IN')}`;

// ── Identity (mirrors services/reports/customerReport.js) ───────────────────
const hashMode = () => phoneHash('9999999999') !== null;
let keysTable = { ok: false, at: 0 };
async function haveKeysTable() {
  if (keysTable.ok || Date.now() - keysTable.at < 60000) return keysTable.ok;
  const r = await q(`SELECT COUNT(*) AS n FROM information_schema.tables
                      WHERE table_schema = DATABASE() AND table_name = 'customer_phone_keys'`).catch(() => [{ n: 0 }]);
  keysTable = { ok: num(r[0]?.n) > 0, at: Date.now() };
  return keysTable.ok;
}
const plainKey = (col) =>
  `(CASE WHEN ${col} NOT LIKE '%:%' AND CHAR_LENGTH(REGEXP_REPLACE(${col}, '[^0-9]', '')) >= 10 THEN RIGHT(REGEXP_REPLACE(${col}, '[^0-9]', ''), 10) END)`;
function identity(alias, hash, keys) {
  const o = alias;
  const sa = `${alias}sa`, u = `${alias}u`, g = `${alias}g`, uk = `${alias}uk`;
  const fallback = `CONCAT('u', ${o}.user_id), CONCAT('g', ${o}.guest_user_id), CONCAT('o', ${o}.id)`;
  if (hash) {
    return {
      key: `COALESCE(CONVERT(${sa}.phone_hash USING utf8mb4)${keys ? `, ${uk}.pkey` : ''}, CONVERT(${g}.phone_hash USING utf8mb4), ${fallback})`,
      joins: `LEFT JOIN shipping_addresses ${sa} ON ${sa}.id = ${o}.shipping_address_id
        LEFT JOIN guest_users ${g} ON ${g}.id = ${o}.guest_user_id
        ${keys ? `LEFT JOIN customer_phone_keys ${uk} ON ${uk}.src = 'user' AND ${uk}.src_id = ${o}.user_id` : ''}`,
    };
  }
  return {
    key: `COALESCE(${plainKey(`${sa}.phone`)}, ${plainKey(`${u}.phone`)}, ${plainKey(`${g}.phone`)}, ${fallback})`,
    joins: `LEFT JOIN shipping_addresses ${sa} ON ${sa}.id = ${o}.shipping_address_id
      LEFT JOIN users ${u} ON ${u}.id = ${o}.user_id
      LEFT JOIN guest_users ${g} ON ${g}.id = ${o}.guest_user_id`,
  };
}

// ── Which code an order used ─────────────────────────────────────────────────
// Partner-checkout orders carry the code only in notes ("… / coupon CODE,CODE2").
const PARTNER_SQL = `(o.coupon_id IS NULL AND o.notes LIKE 'Custom checkout order %/ coupon %')`;
const NOTE_CODE_SQL = `UPPER(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(o.notes, '/ coupon ', -1), ',', 1), ' ', 1)))`;
// 'C:<CODE>' for a coupon, 'OTHER' for a discount with no code, 'NONE' otherwise.
const GROUP_SQL = `CASE
    WHEN o.coupon_id IS NOT NULL THEN CONCAT('C:', COALESCE(NULLIF(UPPER(TRIM(c.code)), ''), CONCAT('#', o.coupon_id)))
    WHEN ${PARTNER_SQL} AND ${NOTE_CODE_SQL} <> '' THEN CONCAT('C:', ${NOTE_CODE_SQL})
    WHEN COALESCE(o.discount_amount, 0) > 0 THEN 'OTHER'
    ELSE 'NONE' END`;
const SOURCE_SQL = `CASE WHEN o.coupon_id IS NOT NULL THEN 'site' WHEN ${PARTNER_SQL} THEN 'partner' ELSE NULL END`;

// ── Coupon wording ───────────────────────────────────────────────────────────
const jsonArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};
function ruleText(c, cartCode) {
  if (!c) return 'Used at the partner checkout (no matching coupon here)';
  const parts = [];
  const min = num(c.minPurchase) > 0 ? ` above ${inr(c.minPurchase)}` : '';
  if (c.type === 'percentage') {
    parts.push(`${r1(c.value)}% off${num(c.maxDiscount) > 0 ? ` up to ${inr(c.maxDiscount)}` : ''}${min}`);
  } else if (c.type === 'fixed') {
    parts.push(`${inr(c.value)} off${min}`);
  } else if (c.type === 'tiered') {
    const t = jsonArray(c.tieredDiscounts).filter((x) => num(x.discount) > 0)
      .sort((a, b) => num(a.minAmount) - num(b.minAmount));
    parts.push(t.length
      ? t.slice(0, 3).map((x) => `${inr(x.discount)} off above ${inr(x.minAmount)}`).join(', ') + (t.length > 3 ? ', …' : '')
      : 'Tiered discount');
  } else if (c.type === 'quantity_based') {
    const t = jsonArray(c.quantityBasedDiscounts).filter((x) => num(x.discount) > 0)
      .sort((a, b) => num(a.minQuantity) - num(b.minQuantity));
    parts.push(t.length
      ? t.slice(0, 3).map((x) => `${inr(x.discount)} off on ${r0(x.minQuantity)}+ items`).join(', ') + (t.length > 3 ? ', …' : '')
      : 'Discount by number of items');
  } else {
    parts.push('Discount code');
  }
  if (c.firstOrderOnly) parts.push('first order only');
  if (c.paymentModeRestriction === 'prepaid') parts.push('prepaid only');
  if (c.paymentModeRestriction === 'cod') parts.push('COD only');
  if (cartCode && String(c.code).trim().toUpperCase() === cartCode) parts.push('abandoned-cart WhatsApp');
  return parts.join(' · ');
}

// Staff-facing status, same rules as the Coupons page (couponAdminService.statusOf).
const STATE_LABEL = { live: 'Active', scheduled: 'Not started', off: 'Switched off', ended: 'Ended' };
function stateOf(c) {
  if (!c) return null;
  try { return require('../couponAdminService.js').statusOf(c); } catch { /* fall through */ }
  const now = new Date();
  if (c.status === 'expired' || (c.endDate && new Date(c.endDate) < now)) return 'ended';
  if (c.status === 'inactive') return 'off';
  return 'live';
}

async function cartCouponCode() {
  try {
    const { getCartRules } = require('../cartRecoveryService.js');
    const rules = await getCartRules();
    return String(rules?.coupon || 'CART10').trim().toUpperCase();
  } catch { return 'CART10'; }
}

// ── Figures for one group ────────────────────────────────────────────────────
function figures(g, admin) {
  const orders = num(g.orders);
  const gross = num(g.gross);
  const discount = num(g.discount);
  const net = gross - discount;
  const units = num(g.units);
  const closed = num(g.delivered) + num(g.rto);
  const out = {
    orders,
    units,
    unitsPerOrder: orders ? Math.round((units / orders) * 100) / 100 : 0,
    gross: r0(gross),
    discount: r0(discount),
    discountPct: pct(discount, gross),
    netSales: r0(net),
    aov: orders ? r0(net / orders) : 0,
    newBuyers: num(g.new_buyers),
    newPct: pct(num(g.new_buyers), orders),
    delivered: num(g.delivered),
    rto: num(g.rto),
    closed,
    rtoPct: pct(num(g.rto), closed),
    cod: num(g.cod),
    codPct: pct(num(g.cod), orders),
    firstUsed: g.first_at || null,
    lastUsed: g.last_at || null,
  };
  // Where each ₹100 of order value goes.
  const per100 = (v) => (gross > 0 ? Math.round((v / gross) * 1000) / 10 : 0);
  if (admin) {
    const cogs = num(g.cogs_kept);
    const shipping = SHIPPING_PER_ORDER * orders;
    const rtoLost = num(g.rto_net);
    const left = net - rtoLost - cogs - shipping;
    out.cogs = r0(cogs);
    out.shippingCost = r0(shipping);
    out.rtoLost = r0(rtoLost);
    out.leftOver = r0(left);
    out.marginPct = pct(left, gross);
    out.unitsWithoutCost = num(g.units_without_cost);
    const d = per100(discount), c = per100(cogs), s = per100(shipping + rtoLost);
    out.split = [
      { key: 'discount', label: 'Discount', value: d },
      { key: 'cost', label: 'Product cost', value: c },
      { key: 'shipping', label: 'Shipping + RTO loss', value: s },
      { key: 'left', label: left >= 0 ? 'Left over' : 'Loss', value: per100(left) },
    ];
  } else {
    const d = per100(discount);
    out.split = [
      { key: 'discount', label: 'Discount', value: d },
      { key: 'rest', label: 'Rest of the order value', value: gross > 0 ? Math.round((100 - d) * 10) / 10 : 0 },
    ];
  }
  return out;
}

function verdictFor(f, { admin, ended, isCart, base }) {
  const enough = f.orders >= MIN_ORDERS;
  const highRto = f.closed >= MIN_CLOSED && f.rtoPct >= HIGH_RTO;
  const lift = (a, b) => b > 0 && a >= b * BASKET_LIFT;
  if (ended) return { key: 'ended', text: 'Ended', tone: 'neutral' };
  if (!enough) return { key: 'few', text: 'Too few orders', tone: 'neutral' };
  if (admin && f.marginPct < LOSING_MARGIN) return { key: 'losing', text: 'Losing money', tone: 'problem' };
  if (highRto) return { key: 'rto', text: 'High RTO', tone: 'problem' };
  if (isCart) return { key: 'cart', text: 'Recovers carts', tone: 'done' };
  if (f.newPct >= NEW_BUYERS) return { key: 'new', text: 'Brings new buyers', tone: 'done' };
  if (lift(f.aov, base.aov) || lift(f.unitsPerOrder, base.unitsPerOrder)) return { key: 'basket', text: 'Raises basket size', tone: 'progress' };
  if (admin && f.marginPct < THIN_MARGIN) return { key: 'thin', text: 'Thin margin', tone: 'needs' };
  return { key: 'flat', text: 'No clear gain', tone: 'neutral' };
}

// "9 in 10 orders with this code were…" / "Almost every order with this code was…"
const tenths = (p) => {
  const n = Math.round(p / 10);
  if (n >= 10) return 'Almost every order with this code was';
  if (n <= 0) return 'Almost no order with this code was';
  return `${n} in 10 orders with this code were`;
};
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

// One or two plain sentences for the detail panel.
function noteFor(f, v, { admin, base, coupon }) {
  const s = [];
  switch (v.key) {
    case 'ended':
      s.push(`This code has ended${coupon?.endDate ? ` (end date ${fmtDay(coupon.endDate)})` : ''}. It still had ${f.orders.toLocaleString('en-IN')} order${f.orders === 1 ? '' : 's'} in this period.`);
      break;
    case 'few':
      s.push(`Only ${f.orders} order${f.orders === 1 ? '' : 's'} used it in this period — too few to judge yet.`);
      break;
    case 'losing':
      s.push(`After the ${f.discountPct}% discount, product cost, shipping and RTO, only ₹${Math.max(0, f.marginPct)} of every ₹100 is left — not enough to cover payment fees, packing and ads.`);
      break;
    case 'rto':
      s.push(`${f.rtoPct}% of its shipped orders came back undelivered (RTO), against ${base.rtoPct}% for orders without a code.`);
      break;
    case 'cart':
      s.push('This is the code the abandoned-cart WhatsApp sends: these shoppers left their cart and came back to buy with it.');
      break;
    case 'new':
      s.push(`${tenths(f.newPct)} a first order (${f.newPct}%, against ${base.newPct}% without a code). It is bringing in new customers.`);
      break;
    case 'basket':
      s.push(`Baskets are bigger with it: ${f.unitsPerOrder} items and ${inr(f.aov)} per order, against ${base.unitsPerOrder} items and ${inr(base.aov)} without a code.`);
      break;
    case 'thin':
      s.push(`₹${f.marginPct} of every ₹100 is left after the discount, product cost, shipping and RTO. ${num(coupon?.minPurchase) > 0 ? `Raising the minimum order above ${inr(coupon.minPurchase)} or lowering the discount` : 'A minimum order value or a smaller discount'} would leave more.`);
      break;
    default:
      s.push(`It brings no more new buyers or bigger baskets than orders without a code (${f.newPct}% new, ${inr(f.aov)} per order). The discount mostly goes to people who would have bought anyway.`);
  }
  if (v.key !== 'rto' && f.closed >= MIN_CLOSED && f.rtoPct >= HIGH_RTO) {
    s.push(`${f.rtoPct}% of its shipped orders were RTO${f.codPct >= 50 ? ` and ${f.codPct}% were COD` : ''}.`);
  }
  if (admin && f.unitsWithoutCost > 0) {
    s.push(`${f.unitsWithoutCost} unit${f.unitsWithoutCost === 1 ? ' has' : 's have'} no cost price, so the margin is higher than it really is.`);
  }
  return s.join(' ');
}

// ── Per-order rows → per-group aggregates ────────────────────────────────────
async function groupRows({ start, end, brandId, admin }) {
  const hash = hashMode();
  const keys = hash && (await haveKeysTable());
  const idIn = identity('o', hash, keys);
  const idAll = identity('ko', hash, keys);
  const brandSql = brandId ? ' AND o.brand_id = :brandId' : '';
  const koBrand = brandId ? ' AND ko.brand_id = :brandId' : '';
  const KO_PLACED = PLACED_SQL.replace(/\bo\./g, 'ko.');

  const sql = `
    SELECT grp,
           GROUP_CONCAT(DISTINCT src) AS sources,
           COUNT(*) AS orders,
           SUM(gross) AS gross, SUM(disc) AS discount, SUM(units) AS units,
           SUM(is_cod) AS cod,
           SUM(stage IN ('delivered','returned')) AS delivered,
           SUM(stage = 'rto') AS rto,
           SUM(CASE WHEN stage = 'rto' THEN gross - disc ELSE 0 END) AS rto_net,
           SUM(is_new) AS new_buyers,
           ${admin ? `SUM(CASE WHEN stage = 'rto' THEN 0 ELSE cost END) AS cogs_kept,
           SUM(nocost) AS units_without_cost,` : ''}
           MIN(created_at) AS first_at, MAX(created_at) AS last_at
      FROM (
        SELECT ${GROUP_SQL} AS grp, ${SOURCE_SQL} AS src,
               o.created_at,
               COALESCE(o.total_amount, 0) AS gross,
               COALESCE(o.discount_amount, 0) AS disc,
               COALESCE(it.units, 0) AS units,
               COALESCE(it.cost, 0) AS cost,
               COALESCE(it.nocost, 0) AS nocost,
               CASE WHEN LOWER(o.payment_type) = 'cod' THEN 1 ELSE 0 END AS is_cod,
               ${STAGE_SQL} AS stage,
               CASE WHEN f.first_at IS NULL OR o.created_at <= f.first_at THEN 1 ELSE 0 END AS is_new
          FROM orders o
          ${idIn.joins}
          ${JOINS}
          LEFT JOIN coupons c ON c.id = o.coupon_id
          LEFT JOIN (
            SELECT oi.order_id,
                   SUM(oi.quantity) AS units,
                   SUM(COALESCE(pv.cost_price, 0) * oi.quantity) AS cost,
                   SUM(CASE WHEN pv.cost_price IS NULL OR pv.cost_price = 0 THEN oi.quantity ELSE 0 END) AS nocost
              FROM orders ox
              JOIN order_items oi ON oi.order_id = ox.id
              LEFT JOIN product_variations pv ON pv.id = oi.variation_id
             WHERE ox.created_at BETWEEN :start AND :end
             GROUP BY oi.order_id
          ) it ON it.order_id = o.id
          LEFT JOIN (
            SELECT ${idAll.key} AS ck, MIN(ko.created_at) AS first_at
              FROM orders ko
              ${idAll.joins}
             WHERE ${KO_PLACED} AND ko.created_at <= :end${koBrand}
             GROUP BY ck
          ) f ON f.ck = ${idIn.key}
         WHERE o.created_at BETWEEN :start AND :end AND ${PLACED_SQL}${brandSql}
      ) x
     GROUP BY grp`;
  const repl = { start, end };
  if (brandId) repl.brandId = brandId;
  return q(sql, repl);
}

async function couponsByCode(codes, brandId) {
  if (!codes.length) return new Map();
  const rows = await q(
    `SELECT id, code, type, value, minPurchase, maxDiscount, paymentModeRestriction, firstOrderOnly,
            tieredDiscounts, quantityBasedDiscounts, startDate, endDate, usageLimit, usageCount,
            status, description, brand_id, createdAt
       FROM coupons WHERE UPPER(TRIM(code)) IN (:codes)`, { codes });
  // Several coupons can share a code (one per store): prefer the picked store's,
  // then one that is live, then the newest.
  const rank = (c) => (brandId && Number(c.brand_id) === brandId ? 4 : 0) + (stateOf(c) === 'live' ? 2 : 0);
  const out = new Map();
  for (const c of rows) {
    const k = String(c.code).trim().toUpperCase();
    const cur = out.get(k);
    if (!cur || rank(c) > rank(cur) || (rank(c) === rank(cur) && new Date(c.createdAt) > new Date(cur.createdAt))) out.set(k, c);
  }
  return out;
}

// ── Detail for one code ──────────────────────────────────────────────────────
async function detail({ start, end, brandId, code }) {
  const grp = `C:${code}`;
  const repl = { start, end, grp };
  if (brandId) repl.brandId = brandId;
  const where = `o.created_at BETWEEN :start AND :end AND ${PLACED_SQL}${brandId ? ' AND o.brand_id = :brandId' : ''}
                 AND ${GROUP_SQL} = :grp`;
  const [products, recent] = await Promise.all([
    q(`SELECT p.id, p.name, SUM(oi.quantity) AS units, SUM(oi.subtotal) AS value
         FROM orders o
         LEFT JOIN coupons c ON c.id = o.coupon_id
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE ${where}
        GROUP BY p.id, p.name
        ORDER BY units DESC, value DESC
        LIMIT ${DETAIL_PRODUCTS}`, repl),
    q(`SELECT o.id, o.order_number, o.created_at, o.payment_type, o.final_amount, o.discount_amount, ${STAGE_SQL} AS stage
         FROM orders o
         LEFT JOIN coupons c ON c.id = o.coupon_id
         ${JOINS}
        WHERE ${where}
        ORDER BY o.created_at DESC
        LIMIT ${DETAIL_ORDERS}`, repl),
  ]);
  return {
    code,
    products: products.map((p) => ({ id: p.id, name: p.name || `Product ${p.id}`, units: num(p.units), value: r0(p.value) })),
    recentOrders: recent.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      placedAt: o.created_at,
      payment: String(o.payment_type || '').toLowerCase() === 'cod' ? 'COD' : 'Prepaid',
      amount: r0(o.final_amount),
      discount: r0(o.discount_amount),
      stage: o.stage,
    })),
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────
async function handler(req, res) {
  try {
    const query = req.query || {};
    const { start, end } = parseRange(query);
    const brandId = brandOf(query);
    const admin = canSeeCost(req.user);
    const ymd = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
    const range = { startDate: ymd(start), endDate: ymd(end) };

    const code = String(query.code || '').trim().toUpperCase().slice(0, 60);
    if (code) {
      return res.json({ success: true, range, brandId, detail: await detail({ start, end, brandId, code }) });
    }

    const [groups, cartCode] = await Promise.all([groupRows({ start, end, brandId, admin }), cartCouponCode()]);

    const byGrp = new Map(groups.map((g) => [g.grp, g]));
    const sum = (list, k) => list.reduce((a, g) => a + num(g[k]), 0);
    const codeGroups = groups.filter((g) => String(g.grp).startsWith('C:'));
    const noCode = groups.filter((g) => !String(g.grp).startsWith('C:'));
    const merged = (list) => {
      const out = {};
      for (const k of ['orders', 'gross', 'discount', 'units', 'cod', 'delivered', 'rto', 'rto_net', 'new_buyers', 'cogs_kept', 'units_without_cost']) out[k] = sum(list, k);
      return out;
    };

    // Baseline: orders WITHOUT a code (incl. the prepaid instant discount ones).
    const base = figures(merged(noCode), false);
    const baseline = {
      orders: base.orders, aov: base.aov, unitsPerOrder: base.unitsPerOrder,
      newPct: base.newPct, rtoPct: base.rtoPct, codPct: base.codPct,
    };

    const codes = codeGroups.map((g) => String(g.grp).slice(2)).filter((c) => !c.startsWith('#'));
    const meta = await couponsByCode(codes, brandId);

    const rows = codeGroups.map((g) => {
      const codeText = String(g.grp).slice(2);
      const coupon = meta.get(codeText) || null;
      const f = figures(g, admin);
      const state = stateOf(coupon);
      const isCart = codeText === cartCode;
      const verdict = verdictFor(f, { admin, ended: state === 'ended', isCart, base });
      const sources = String(g.sources || '').split(',').filter(Boolean);
      return {
        key: codeText, // pass back as ?code= for the detail
        code: codeText.startsWith('#') ? `Deleted coupon ${codeText}` : codeText,
        couponId: coupon ? coupon.id : null,
        rule: ruleText(coupon, cartCode),
        description: coupon?.description || null,
        state,
        stateLabel: state ? STATE_LABEL[state] : 'Not in coupons',
        startDate: coupon?.startDate || null,
        endDate: coupon?.endDate || null,
        source: sources.length > 1 ? 'both' : (sources[0] || 'site'),
        isCartCode: isCart,
        ...f,
        verdict,
        note: noteFor(f, verdict, { admin, base: baseline, coupon }),
      };
    }).sort((a, b) => b.orders - a.orders || b.discount - a.discount);

    // Discounts with no code (prepaid instant discount; partner-checkout offers
    // with no code). Pack prices and loyalty never reach discount_amount.
    const other = byGrp.get('OTHER');
    let otherDiscounts = null;
    if (other && num(other.orders) > 0) {
      const f = figures(other, admin);
      otherDiscounts = {
        label: 'No code — prepaid / checkout discount',
        rule: 'Prepaid instant discount, or a partner-checkout offer without a code',
        ...f,
      };
    }

    const all = merged(groups);
    const codeAll = merged(codeGroups);
    const kpis = {
      orders: num(all.orders),
      grossSales: r0(all.gross),
      codeOrders: num(codeAll.orders),
      codeOrdersPct: pct(num(codeAll.orders), num(all.orders)),
      discount: r0(codeAll.discount),
      discountPctOfGross: pct(num(codeAll.discount), num(all.gross)),
      newBuyers: num(codeAll.new_buyers),
      newBuyersPct: pct(num(codeAll.new_buyers), num(codeAll.orders)),
      codes: rows.length,
    };
    if (admin) {
      const losing = rows.filter((r) => r.verdict.key === 'losing');
      kpis.losingMoney = { count: losing.length, codes: losing.map((r) => r.code).slice(0, 5) };
    } else {
      const high = rows.filter((r) => r.closed >= MIN_CLOSED && r.rtoPct >= HIGH_RTO);
      kpis.highRto = { count: high.length, codes: high.map((r) => r.code).slice(0, 5) };
    }

    const out = {
      success: true,
      range,
      brandId,
      canSeeCost: admin,
      cartCode,
      thresholds: {
        minOrders: MIN_ORDERS, newBuyersPct: NEW_BUYERS, basketLiftPct: Math.round((BASKET_LIFT - 1) * 100),
        highRtoPct: HIGH_RTO, ...(admin ? { losingMarginPct: LOSING_MARGIN, thinMarginPct: THIN_MARGIN } : {}),
      },
      kpis,
      baseline,
      rows,
      otherDiscounts,
    };
    if (admin) out.assumptions = { shippingPerOrder: SHIPPING_PER_ORDER };
    return res.json(out);
  } catch (error) {
    logger.error('Coupon report failed: ' + error.message);
    return res.status(500).json({ success: false, message: 'Failed to build the coupon report' });
  }
}

module.exports = { handler };
