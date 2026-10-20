// Customer report — GET /api/reports/customers
//
// Who buys, who comes back, and who to reward or win back.
//
// Identity: a customer is a phone number (last 10 digits) — the same rule as
// the Customers page / customer profile (customerListService,
// customerProfileService). The phone comes from the order's shipping address,
// else the account's phone, else the guest checkout's phone. Phones on
// shipping_addresses / guest_users are encrypted, so with DATA_ENCRYPTION_KEY
// set we group on their phone_hash (HMAC of the last 10 digits) and on the
// account-phone hashes cached in customer_phone_keys; without a key (dev/test)
// phones are plain and we group on the digits. An order with no usable phone
// falls back to its account (u<id>) or guest checkout (g<id>).
//
// Orders counted: every PLACED order (all but cancelled). With a brand picked,
// everything — including "first order" — is about that brand only.
//
// Money is the Overview's net sales (salesReportService): delivered orders
// (incl. ones later returned) minus refunds. RTO / "refused" uses the same
// stage rules (STAGE_SQL): a courier return with no customer return row.
//
// Cost: each query below is ONE grouped pass over the orders table (joined to
// its address / account / guest, plus the returns & refunds aggregates for the
// money queries). The summary runs two (per-customer + per-order window), the
// list one more; nothing per customer. The list returns at most `limit` rows.

const { sequelize } = require('../../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../../config/logging.js');
const { parseRange, brandOf, PLACED_SQL } = require('./common.js');
const { STAGE_SQL, JOINS, REFUND_SQL } = require('../salesReportService.js');
const { phoneHash, decrypt } = require('../../utils/encryption.js');
const { TZ_OFFSET } = require('../../utils/dateRange.js');

const SEGMENTS = ['top', 'lapsed', 'new'];
const LIST_LIMIT = 50;
const EXPORT_LIMIT = 1000;
const MONTHS = 6;
const LAPSED_MIN_DAYS = 30;
const NEW_DAYS = 7;
const RTO_TAG_AT = 2;

const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round(num(v) * 100) / 100;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const cleanName = (n) => String(n || '').replace(/\s*\(\+?[\d\s-]{6,}\)\s*$/, '').trim();

// ── Identity ────────────────────────────────────────────────────────────
const hashMode = () => phoneHash('9999999999') !== null;

// customer_phone_keys is created by the Customers page on first use.
let keysTable = { ok: false, at: 0 };
async function haveKeysTable() {
  if (keysTable.ok || Date.now() - keysTable.at < 60000) return keysTable.ok;
  const r = await q(`SELECT COUNT(*) AS n FROM information_schema.tables
                      WHERE table_schema = DATABASE() AND table_name = 'customer_phone_keys'`).catch(() => [{ n: 0 }]);
  keysTable = { ok: num(r[0]?.n) > 0, at: Date.now() };
  return keysTable.ok;
}

// Last 10 digits of a plain phone column (skips encrypted iv:tag:data values).
const plainKey = (col) =>
  `(CASE WHEN ${col} NOT LIKE '%:%' AND CHAR_LENGTH(REGEXP_REPLACE(${col}, '[^0-9]', '')) >= 10 THEN RIGHT(REGEXP_REPLACE(${col}, '[^0-9]', ''), 10) END)`;

function identity(hash, keys) {
  const fallback = `CONCAT('u', o.user_id), CONCAT('g', o.guest_user_id), CONCAT('o', o.id)`;
  if (hash) {
    return {
      key: `COALESCE(CONVERT(sa.phone_hash USING utf8mb4)${keys ? ', uk.pkey' : ''}, CONVERT(g.phone_hash USING utf8mb4), ${fallback})`,
      joins: `LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
        LEFT JOIN guest_users g ON g.id = o.guest_user_id
        ${keys ? `LEFT JOIN customer_phone_keys uk ON uk.src = 'user' AND uk.src_id = o.user_id` : ''}`,
    };
  }
  return {
    key: `COALESCE(${plainKey('sa.phone')}, ${plainKey('u.phone')}, ${plainKey('g.phone')}, ${fallback})`,
    joins: `LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN guest_users g ON g.id = o.guest_user_id`,
  };
}

// One row per placed order with its customer key (ck). money → also its
// stage and refunds (salesReportService rules).
function ordersCte({ id, money, brandId }) {
  return `SELECT o.id, o.created_at, o.final_amount, ${id.key} AS ck
      ${money ? `, ${STAGE_SQL} AS stage, ${REFUND_SQL} AS refund` : ''}
    FROM orders o
    ${id.joins}
    ${money ? JOINS : ''}
   WHERE ${PLACED_SQL} AND o.created_at <= :upto${brandId ? ' AND o.brand_id = :brandId' : ''}`;
}

const DELIVERED = `stage IN ('delivered','returned')`;
const NET = `(final_amount - refund)`;
const IN_RANGE = `created_at BETWEEN :start AND :end`;

// ── Months (business time zone) ─────────────────────────────────────────
const offMin = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(TZ_OFFSET);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 330;
})();
const ymOf = (d) => new Date(new Date(d).getTime() + offMin * 60000).toISOString().slice(0, 7);
const addMonths = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const monthStart = (ym) => new Date(`${ym}-01T00:00:00.000${TZ_OFFSET}`);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monLabel = (ym) => MON[Number(ym.slice(5, 7)) - 1];
const monYearLabel = (ym) => `${monLabel(ym)} ${ym.slice(0, 4)}`;
const YM = (col) => `DATE_FORMAT(CONVERT_TZ(${col}, '+00:00', :tz), '%Y-%m')`;
const YM6 = (col) => `DATE_FORMAT(CONVERT_TZ(${col}, '+00:00', :tz), '%Y%m')`;

// ── Summary: KPIs, monthly bars, cohorts ────────────────────────────────
async function summary({ start, end, brandId, id }) {
  // Everything is "as of" the month that holds the end date.
  const anchor = ymOf(end);
  const upto = new Date(monthStart(addMonths(anchor, 1)).getTime() - 1);
  const barsFrom = monthStart(addMonths(anchor, -(MONTHS - 1)));
  const rep = { start, end, upto, tz: TZ_OFFSET, barsFrom };
  if (brandId) rep.brandId = brandId;

  const repeatCols = Array.from({ length: MONTHS + 1 }, (_, k) =>
    `SUM(PERIOD_DIFF(${YM6('second_at')}, ${YM6('first_at')}) = ${k}) AS rep${k}`).join(',\n      ');

  // Per customer (first order, second order, in-range figures) → grouped by
  // first-order month. KPIs are the sums over the groups.
  const custSql = `
WITH ko AS (${ordersCte({ id, money: true, brandId })}),
s AS (SELECT ko.*, ROW_NUMBER() OVER (PARTITION BY ck ORDER BY created_at, id) AS seq FROM ko),
c AS (
  SELECT ck,
         MIN(created_at) AS first_at,
         MIN(CASE WHEN seq = 2 THEN created_at END) AS second_at,
         SUM(${IN_RANGE}) AS r_n,
         SUM(${IN_RANGE} AND ${DELIVERED}) AS r_del,
         SUM(CASE WHEN ${IN_RANGE} AND ${DELIVERED} THEN ${NET} ELSE 0 END) AS r_net,
         SUM(CASE WHEN ${IN_RANGE} THEN final_amount ELSE 0 END) AS r_val
    FROM s GROUP BY ck
)
SELECT ${YM('first_at')} AS first_ym,
      COUNT(*) AS buyers,
      ${repeatCols},
      SUM(r_n > 0 AND first_at >= :start) AS new_c,
      SUM(r_n > 0 AND first_at < :start) AS ret_c,
      SUM(CASE WHEN first_at >= :start THEN r_n ELSE 0 END) AS new_orders,
      SUM(CASE WHEN first_at < :start THEN r_n ELSE 0 END) AS ret_orders,
      SUM(CASE WHEN first_at >= :start THEN r_del ELSE 0 END) AS new_del,
      SUM(CASE WHEN first_at < :start THEN r_del ELSE 0 END) AS ret_del,
      SUM(CASE WHEN first_at >= :start THEN r_net ELSE 0 END) AS new_net,
      SUM(CASE WHEN first_at < :start THEN r_net ELSE 0 END) AS ret_net,
      SUM(CASE WHEN first_at >= :start THEN r_val ELSE 0 END) AS new_val,
      SUM(CASE WHEN first_at < :start THEN r_val ELSE 0 END) AS ret_val
  FROM c GROUP BY first_ym`;

  // Per order: is it the customer's first order (new) or a later one (returning)?
  const monthSql = `
WITH ko AS (${ordersCte({ id, money: false, brandId })}),
s AS (SELECT created_at, ROW_NUMBER() OVER (PARTITION BY ck ORDER BY created_at, id) AS seq FROM ko)
SELECT ${YM('created_at')} AS ym, SUM(seq = 1) AS new_orders, SUM(seq > 1) AS ret_orders
  FROM s WHERE created_at >= :barsFrom GROUP BY ym`;

  const [groups, monthRows] = await Promise.all([q(custSql, rep), q(monthSql, rep)]);

  // KPIs.
  const t = { new_c: 0, ret_c: 0, new_orders: 0, ret_orders: 0, new_del: 0, ret_del: 0, new_net: 0, ret_net: 0, new_val: 0, ret_val: 0 };
  for (const g of groups) for (const k of Object.keys(t)) t[k] += num(g[k]);
  const customers = t.new_c + t.ret_c;
  const revenue = t.new_net + t.ret_net;
  const kpis = {
    customers,
    new: t.new_c,
    returning: t.ret_c,
    newShare: pct(t.new_c, customers),
    returningShare: pct(t.ret_c, customers),
    orders: { new: t.new_orders, returning: t.ret_orders },
    deliveredOrders: { new: t.new_del, returning: t.ret_del },
    orderValue: { new: r2(t.new_val), returning: r2(t.ret_val) },
    revenue: { total: r2(revenue), new: r2(t.new_net), returning: r2(t.ret_net), returningShare: pct(t.ret_net, revenue) },
    aov: { new: t.new_del ? r2(t.new_net / t.new_del) : 0, returning: t.ret_del ? r2(t.ret_net / t.ret_del) : 0 },
  };

  // Monthly bars — last 6 months up to the anchor month, gaps filled with 0.
  const byYm = new Map(monthRows.map((m) => [m.ym, m]));
  const months = Array.from({ length: MONTHS }, (_, i) => {
    const ym = addMonths(anchor, i - (MONTHS - 1));
    const m = byYm.get(ym) || {};
    const n = num(m.new_orders); const r = num(m.ret_orders);
    return { ym, label: monLabel(ym), newOrders: n, returningOrders: r, orders: n + r, returningShare: pct(r, n + r) };
  });

  // Cohorts — the 6 first-order months before the anchor month. Cell k =
  // share who ordered a 2nd time by the end of month+k (cumulative; a repeat
  // in the first month counts from M1). Months after the anchor stay null.
  const byFirst = new Map(groups.map((g) => [g.first_ym, g]));
  const cohorts = Array.from({ length: MONTHS }, (_, i) => {
    const ym = addMonths(anchor, i - MONTHS);
    const g = byFirst.get(ym) || {};
    const buyers = num(g.buyers);
    let cum = num(g.rep0);
    const cells = [];
    for (let k = 1; k <= MONTHS; k += 1) {
      cum += num(g[`rep${k}`]);
      const future = addMonths(ym, k) > anchor;
      cells.push(future ? null : { pct: buyers ? pct(cum, buyers) : null, customers: cum, partial: addMonths(ym, k) === anchor });
    }
    return { ym, label: monYearLabel(ym), buyers, cells };
  });

  return { anchorMonth: anchor, kpis, months, cohorts, cohortBasis: 'cumulative' };
}

// ── Customer lists ──────────────────────────────────────────────────────
const ORDER_BY = {
  top: 'r_net DESC, r_val DESC, last_at DESC',
  lapsed: 'net DESC, n DESC, last_at DESC',
  new: 'first_at DESC',
};

const maskPhone = (d) => (d && d.length === 10 ? `${d.slice(0, 2)}•••••${d.slice(7)}` : null);
const isCod = (t) => String(t || '').toLowerCase() === 'cod';

async function customerList({ start, end, brandId, id, segment, limit }) {
  const now = new Date();
  const rep = { start, end, upto: now, now, weekAgo: new Date(now.getTime() - NEW_DAYS * 86400000), minDays: LAPSED_MIN_DAYS };
  if (brandId) rep.brandId = brandId;

  // Rows of the picked segment come first; when it is empty the first row of
  // another segment still carries the three counts (filtered out below).
  const sql = `
WITH ko AS (${ordersCte({ id, money: true, brandId })}),
c AS (
  SELECT ck,
         COUNT(*) AS n,
         MIN(created_at) AS first_at,
         MAX(created_at) AS last_at,
         SUM(stage = 'rto') AS rto,
         SUM(CASE WHEN ${DELIVERED} THEN ${NET} ELSE 0 END) AS net,
         SUM(final_amount) AS val,
         SUM(${IN_RANGE}) AS r_n,
         SUM(CASE WHEN ${IN_RANGE} AND ${DELIVERED} THEN ${NET} ELSE 0 END) AS r_net,
         SUM(CASE WHEN ${IN_RANGE} THEN final_amount ELSE 0 END) AS r_val,
         MOD(MAX(CAST(UNIX_TIMESTAMP(created_at) AS SIGNED) * 1000000000 + id), 1000000000) AS last_id,
         MOD(MIN(CAST(UNIX_TIMESTAMP(created_at) AS SIGNED) * 1000000000 + id), 1000000000) AS first_id
    FROM ko GROUP BY ck
),
f AS (
  SELECT c.*,
         TIMESTAMPDIFF(SECOND, last_at, :now) / 86400 AS days_since,
         CASE WHEN n >= 2 THEN TIMESTAMPDIFF(SECOND, first_at, last_at) / 86400 / (n - 1) END AS gap_days
    FROM c
),
x AS (
  SELECT f.*,
         (r_n > 0) AS s_top,
         (n >= 2 AND days_since >= :minDays AND days_since > 2 * gap_days) AS s_lapsed,
         (first_at >= :weekAgo) AS s_new
    FROM f
)
SELECT y.* FROM (
  SELECT x.*, SUM(s_top) OVER () AS c_top, SUM(s_lapsed) OVER () AS c_lapsed, SUM(s_new) OVER () AS c_new FROM x
) y
ORDER BY y.s_${segment} DESC, ${ORDER_BY[segment]}
LIMIT ${Number(limit)}`;

  const raw = await q(sql, rep);
  const counts = { top: num(raw[0]?.c_top), lapsed: num(raw[0]?.c_lapsed), new: num(raw[0]?.c_new) };
  const rows = raw.filter((r) => num(r[`s_${segment}`]) === 1);

  // Name, city, phone and profile link from the latest order; COD from the first.
  const ids = [...new Set(rows.flatMap((r) => [num(r.last_id), num(r.first_id)]).filter(Boolean))];
  const details = ids.length ? await q(
    `SELECT o.id, o.order_number, o.payment_type, o.user_id, o.guest_user_id,
            sa.full_name, sa.city, sa.phone AS sa_phone,
            u.username, u.phone AS u_phone,
            g.first_name, g.last_name, g.phone AS g_phone
       FROM orders o
       LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
      WHERE o.id IN (:ids)`, { ids }) : [];
  const byId = new Map(details.map((d) => [d.id, d]));

  return {
    segment,
    limit,
    counts,
    rows: rows.map((r) => {
      const d = byId.get(num(r.last_id)) || {};
      const first = byId.get(num(r.first_id)) || {};
      const phone = [decrypt(d.sa_phone), d.u_phone, decrypt(d.g_phone)].map(last10).find((p) => p.length === 10) || null;
      const guestName = [d.first_name, d.last_name].filter(Boolean).join(' ');
      const name = cleanName(d.full_name) || cleanName(d.username) || cleanName(guestName) || 'Customer';
      const n = num(r.n);
      const gap = r.gap_days == null ? null : Number(r.gap_days);
      const daysSince = Math.max(0, Math.floor(num(r.days_since)));
      const rto = num(r.rto);
      const atRisk = n >= 2 && daysSince >= LAPSED_MIN_DAYS && num(r.days_since) > 2 * gap;
      const firstInRange = new Date(r.first_at) >= start;

      const tags = [];
      if (segment === 'lapsed') {
        const every = Math.round(gap);
        tags.push(every >= 1
          ? { text: `Usually every ${every} day${every === 1 ? '' : 's'}`, tone: num(r.days_since) >= 3 * gap ? 'problem' : 'needs' }
          : { text: `All ${n} orders on one day`, tone: 'needs' });
      } else if (segment === 'new') {
        tags.push({ text: isCod(first.payment_type) ? 'First order · COD' : 'First order', tone: 'progress' });
      } else if (atRisk) tags.push({ text: 'Due to reorder', tone: 'needs' });
      else if (n >= 2) tags.push({ text: 'Repeat buyer', tone: 'done' });
      else tags.push({ text: firstInRange ? 'New customer' : 'One order', tone: firstInRange ? 'progress' : 'neutral' });
      if (rto >= RTO_TAG_AT) tags.unshift({ text: 'Often refuses COD', tone: 'problem' });

      // Top = figures for the picked dates; the other lists = all time.
      const inRange = segment === 'top';
      return {
        id: num(r.last_id),
        name,
        phone: maskPhone(phone),
        city: d.city || null,
        orders: inRange ? num(r.r_n) : n,
        spent: r2(inRange ? r.r_net : r.net),
        ordered: r2(inRange ? r.r_val : r.val),
        lifetimeOrders: n,
        lifetimeSpent: r2(r.net),
        firstOrderAt: r.first_at,
        lastOrderAt: r.last_at,
        lastOrderNumber: d.order_number || null,
        daysSince,
        usualGapDays: gap == null ? null : Math.round(gap * 10) / 10,
        rto,
        tags,
        open: d.user_id ? { kind: 'user', id: d.user_id } : d.guest_user_id ? { kind: 'guest', id: d.guest_user_id } : null,
      };
    }),
  };
}

// ── Handler ─────────────────────────────────────────────────────────────
async function handler(req, res) {
  try {
    const query = req.query || {};
    const { start, end } = parseRange(query);
    const brandId = brandOf(query);
    const part = ['summary', 'list'].includes(query.part) ? query.part : 'all';
    const segment = SEGMENTS.includes(query.segment) ? query.segment : 'top';
    const limit = Math.min(EXPORT_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || LIST_LIMIT));
    const hash = hashMode();
    const id = identity(hash, hash ? await haveKeysTable() : false);

    const [sum, list] = await Promise.all([
      part !== 'list' ? summary({ start, end, brandId, id }) : null,
      part !== 'summary' ? customerList({ start, end, brandId, id, segment, limit }) : null,
    ]);
    res.json({
      success: true,
      range: { start, end },
      brandId,
      ...(sum || {}),
      ...(list ? { list } : {}),
    });
  } catch (err) {
    logger.error(`Customer report failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Could not load the customer report' });
  }
}

module.exports = { handler };
