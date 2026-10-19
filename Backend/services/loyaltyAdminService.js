'use strict';

/**
 * Dashboard → Loyalty points.
 *
 *   summary          — points out there (+ ₹ value at checkout), earned / spent
 *                      in 30 days, customers with points / 100+, points
 *                      expiring in the next 30 days, the rules, and the last
 *                      run of the 2 am expiry job (job_runs 'loyalty-expiry').
 *   listTransactions — server-paged history with customer search, real order
 *                      numbers and the staff member behind each adjustment.
 *   getRules / setRules — the four rules. They live in brand_settings (per
 *                      brand, read by settingsHelper with env / default
 *                      fallback), so admins can change them here.
 *   customerCard     — name, masked contact and balance for the give/take form.
 *
 * Points are one balance per customer account (users.loyalty_points); a
 * customer account belongs to one brand (users.source_brand_id), so the brand
 * filter scopes balances by account and history by loyalty_transactions.brand_id.
 *
 * Schema: loyaltyService.ensureSchema (created_by column, 'reversed' type,
 * created_at index).
 */

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const settingsHelper = require('./settingsHelper');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const brandOf = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const maskPhone = (p) => { const d = last10(p); return d.length === 10 ? `${d.slice(0, 2)}•• ••${d.slice(6)}` : null; };
const maskEmail = (e) => {
  const s = String(e || ''); const at = s.indexOf('@');
  if (at < 1) return null;
  return `${s.slice(0, Math.min(2, at))}•••${s.slice(at)}`;
};
const LIVE_USER = 'u.deleted_at IS NULL AND u.deletedAt IS NULL';

const { ensureSchema, expiringBetween } = require('./loyaltyService');

// ── Rules ──────────────────────────────────────────────────────────────────
// Same keys, defaults and parsing as loyaltyService / loyaltyController.
const RULES = [
  { field: 'earnRate', key: 'LOYALTY_EARN_RATE', def: 10, min: 1, max: 100000 },        // ₹ per point earned
  { field: 'redeemRate', key: 'LOYALTY_REDEEM_RATE', def: 1, min: 1, max: 100 },        // points per ₹1 off
  { field: 'maxRedeemPercent', key: 'LOYALTY_MAX_REDEEM_PERCENT', def: 20, min: 1, max: 100 },
  { field: 'expiryDays', key: 'LOYALTY_POINTS_EXPIRY_DAYS', def: 365, min: 1, max: 3650 },
];
const posInt = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };

async function activeBrands() {
  return q("SELECT id, COALESCE(NULLIF(display_name, ''), name) AS name FROM brands WHERE status = 'active' ORDER BY id");
}

/** { brandId: { earnRate, redeemRate, maxRedeemPercent, expiryDays, source } } */
async function rulesFor(brandIds) {
  if (!brandIds.length) return {};
  const rows = await q('SELECT brand_id, `key`, value FROM brand_settings WHERE brand_id IN (:ids) AND `key` IN (:keys)',
    { ids: brandIds, keys: RULES.map((r) => r.key) });
  const out = {};
  for (const id of brandIds) {
    const r = { source: {} };
    for (const rule of RULES) {
      const row = rows.find((x) => x.brand_id === id && x.key === rule.key && x.value != null && x.value !== '');
      const env = process.env[rule.key];
      r[rule.field] = posInt(row ? row.value : env, rule.def);
      r.source[rule.field] = row ? 'brand' : env ? 'server' : 'default';
    }
    out[id] = r;
  }
  return out;
}

async function getRules(brandId) {
  const brands = await activeBrands();
  const ids = brandId ? [brandId] : brands.map((b) => b.id);
  if (!ids.length) ids.push(1);
  const all = await rulesFor(ids);
  const list = ids.map((id) => ({ brandId: id, brand: brands.find((b) => b.id === id)?.name || `Brand ${id}`, ...all[id] }));
  const sig = (r) => RULES.map((x) => r[x.field]).join('|');
  const same = list.every((r) => sig(r) === sig(list[0]));
  const { source, ...rules } = list[0];
  return { editable: true, storedIn: 'brand settings', same, rules: { ...rules, source }, perBrand: same ? [] : list };
}

async function setRules(brandId, body, actorId) {
  const vals = {};
  for (const rule of RULES) {
    const n = Number(body[rule.field]);
    if (!Number.isInteger(n) || n < rule.min || n > rule.max) {
      const what = { earnRate: '“Earn” (₹ for one point)', redeemRate: '“Worth” (points for ₹1 off)', maxRedeemPercent: '“Max per order” (%)', expiryDays: '“Expire after” (days)' }[rule.field];
      return { ok: false, message: `${what} must be a whole number from ${rule.min} to ${rule.max.toLocaleString('en-IN')}.` };
    }
    vals[rule.key] = String(n);
  }
  const ids = brandId ? [brandId] : (await activeBrands()).map((b) => b.id);
  const { BrandSetting } = require('../model/brandSettingModel');
  await sequelize.transaction(async (t) => {
    for (const id of ids) {
      for (const [key, value] of Object.entries(vals)) {
        const row = await BrandSetting.findOne({ where: { brand_id: id, key }, transaction: t });
        if (row) await row.update({ value, is_encrypted: false, updated_by: actorId || null }, { transaction: t });
        else await BrandSetting.create({ brand_id: id, key, value, is_encrypted: false, category: 'general', description: 'Loyalty points rule', updated_by: actorId || null }, { transaction: t });
      }
    }
  });
  ids.forEach((id) => settingsHelper.clearCache(id));
  return { ok: true, brands: ids.length };
}

// ── Summary ────────────────────────────────────────────────────────────────
async function summary(query = {}) {
  await ensureSchema();
  const brandId = brandOf(query.brandId);
  const now = new Date();
  const repl = { brandId, since: new Date(now.getTime() - 30 * 86400000), now, until: new Date(now.getTime() + 30 * 86400000) };
  const bU = brandId ? 'AND u.source_brand_id = :brandId' : '';
  const bT = brandId ? 'AND lt.brand_id = :brandId' : '';

  const [balances, [earned], [spent], [expiring], rules, runs] = await Promise.all([
    q(`SELECT COALESCE(u.source_brand_id, 1) AS b, COUNT(*) AS n, SUM(u.loyalty_points) AS pts,
              SUM(CASE WHEN u.loyalty_points >= 100 THEN 1 ELSE 0 END) AS n100
         FROM users u WHERE u.loyalty_points > 0 AND ${LIVE_USER} ${bU}
        GROUP BY COALESCE(u.source_brand_id, 1)`, repl),
    q(`SELECT COALESCE(SUM(lt.points), 0) AS pts, COUNT(DISTINCT lt.order_id) AS orders FROM loyalty_transactions lt
        WHERE lt.type = 'earned' AND lt.created_at >= :since ${bT}`, repl),
    q(`SELECT COALESCE(SUM(-lt.points), 0) AS pts, COUNT(*) AS times FROM loyalty_transactions lt
        WHERE lt.type = 'redeemed' AND lt.created_at >= :since ${bT}`, repl),
    expiringBetween(repl.until, brandId).then((r) => [r]),
    getRules(brandId),
    require('./jobRunService.js').recentRuns(['loyalty-expiry'], 1).catch(() => ({ 'loyalty-expiry': [] })),
  ]);

  // ₹ value: each account's points at its own brand's redeem rate.
  const rateBy = await rulesFor([...new Set(balances.map((r) => num(r.b)))]);
  let pts = 0; let value = 0; let customers = 0; let n100 = 0;
  for (const r of balances) {
    pts += num(r.pts); customers += num(r.n); n100 += num(r.n100);
    value += num(r.pts) / (rateBy[num(r.b)]?.redeemRate || 1);
  }
  const lastRun = (runs['loyalty-expiry'] || [])[0] || null;
  return {
    outstanding: { points: pts, value: Math.round(value) },
    earned30: { points: num(earned.pts), orders: num(earned.orders) },
    spent30: { points: num(spent.pts), times: num(spent.times) },
    customers: { withPoints: customers, canRedeem100: n100 },
    expiring30: { points: num(expiring.points), customers: num(expiring.customers) },
    rules,
    expiryJob: lastRun ? { at: lastRun.started_at, status: lastRun.status, summary: lastRun.summary } : null,
  };
}

// ── History ────────────────────────────────────────────────────────────────
const TAB_TYPE = { earned: 'earned', spent: 'redeemed', staff: 'adjusted', expired: 'expired' };
const DEFAULT_ADJUST = /^Manual adjustment by admin #/;

function describe(r) {
  const pts = num(r.points);
  const staff = r.staff_name ? String(r.staff_name).split(/\s+/)[0] : null;
  const reason = r.description && !DEFAULT_ADJUST.test(r.description) ? r.description : null;
  switch (r.type) {
    case 'earned': return { what: 'Earned — order delivered', reason: null };
    case 'redeemed': return { what: 'Spent at checkout', reason: null };
    case 'refunded': return { what: 'Given back — order cancelled', reason: null };
    case 'expired': return { what: 'Expired — not used in time', reason: null };
    case 'reversed': return { what: 'Taken back — order refunded or returned', reason: null };
    case 'adjusted': return { what: `${pts >= 0 ? 'Given' : 'Taken back'}${staff ? ` by ${staff}` : ' by staff'}`, reason };
    default: return { what: r.type, reason: r.description || null };
  }
}

async function listTransactions(query = {}) {
  await ensureSchema();
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const where = ['1=1'];
  const repl = { limit, offset: (page - 1) * limit };
  const brandId = brandOf(query.brandId);
  if (brandId) { where.push('lt.brand_id = :brandId'); repl.brandId = brandId; }
  const type = TAB_TYPE[query.tab] || (['earned', 'redeemed', 'expired', 'adjusted', 'refunded', 'reversed'].includes(query.type) ? query.type : null);
  if (type) { where.push('lt.type = :type'); repl.type = type; }
  if (brandOf(query.userId)) { where.push('lt.user_id = :userId'); repl.userId = brandOf(query.userId); }
  if (brandOf(query.orderId)) { where.push('lt.order_id = :orderId'); repl.orderId = brandOf(query.orderId); }
  if (query.startDate) { where.push('lt.created_at >= :startDate'); repl.startDate = new Date(query.startDate); }
  if (query.endDate) { where.push('lt.created_at <= :endDate'); repl.endDate = new Date(query.endDate); }
  const s = String(query.q || '').trim().replace(/^#/, '');
  if (s) {
    const p10 = last10(s);
    if (/^\+?[\d\s-]{10,16}$/.test(s) && p10.length === 10) {
      where.push("RIGHT(REGEXP_REPLACE(u.phone, '[^0-9]', ''), 10) = :p10"); repl.p10 = p10;
    } else {
      where.push('(u.username LIKE :like OR u.email LIKE :like OR o.order_number LIKE :like)'); repl.like = `%${s}%`;
    }
  }
  const from = `FROM loyalty_transactions lt
                LEFT JOIN users u ON u.id = lt.user_id
                LEFT JOIN orders o ON o.id = lt.order_id
               WHERE ${where.join(' AND ')}`;
  const [rows, [{ n }]] = await Promise.all([
    q(`SELECT lt.id, lt.user_id, lt.order_id, lt.type, lt.points, lt.balance_after, lt.description, lt.created_at,
              u.username, u.phone, u.email, o.order_number, s.username AS staff_name
         ${from.replace('WHERE', 'LEFT JOIN users s ON s.id = lt.created_by\n               WHERE')}
        ORDER BY lt.created_at DESC, lt.id DESC LIMIT :limit OFFSET :offset`, repl),
    q(`SELECT COUNT(*) AS n ${from}`, repl),
  ]);
  const total = num(n);
  return {
    page, limit, total, pages: Math.max(1, Math.ceil(total / limit)),
    rows: rows.map((r) => {
      const d = describe(r);
      return {
        id: r.id, userId: r.user_id, type: r.type,
        customer: r.username || (r.user_id ? `Customer ${r.user_id}` : 'Deleted customer'),
        contact: maskPhone(r.phone) || maskEmail(r.email),
        what: d.what, reason: d.reason,
        orderId: r.order_id || null, orderNumber: r.order_number || null,
        points: num(r.points), balance: num(r.balance_after), at: r.created_at,
      };
    }),
  };
}

// ── Give / take form ───────────────────────────────────────────────────────
async function customerCard(userId) {
  const id = brandOf(userId);
  if (!id) return null;
  const [u] = await q(`SELECT u.id, u.username, u.phone, u.email, u.loyalty_points, u.source_brand_id,
                              COALESCE(NULLIF(b.display_name, ''), b.name) AS brand
                         FROM users u LEFT JOIN brands b ON b.id = u.source_brand_id
                        WHERE u.id = :id AND ${LIVE_USER}`, { id });
  if (!u) return null;
  return { id: u.id, name: u.username, contact: maskPhone(u.phone) || maskEmail(u.email), points: num(u.loyalty_points), brandId: u.source_brand_id || null, brand: u.brand || null };
}

module.exports = { ensureSchema, summary, listTransactions, getRules, setRules, customerCard, RULES };
