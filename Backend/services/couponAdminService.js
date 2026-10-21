'use strict';

// ── Coupons admin: list + stats, 30-day summary, automation dependencies ──────
// Used by controller/couponController.js (admin routes) and by validateCoupon /
// getPublicCoupons for the per-store restriction.
//
// Stats come from coupon_usages joined to orders that are not cancelled (an
// order cancel also deletes its usage row — the join is belt and braces).
// "Sales with it" is orders.final_amount (rupees, what the customer paid).
//
// Per-store restriction lives in its own table so the coupons model (read by
// checkout, crons and order code) does not change shape:
//   coupon_brands (coupon_id, brand_id) — no rows = works on every store.
// coupons.brand_id stays the "home" store; the win-back cron matches it.

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const CANCELLED = ['cancelled', 'order cancelled'];
const DAY_MS = 24 * 60 * 60 * 1000;
const STATUSES = ['live', 'scheduled', 'off', 'ended'];

// ── Schema (once per process) ────────────────────────────────────────────────
let _schema = null;
function ensureSchema() {
  if (!_schema) {
    _schema = sequelize.query(
      `CREATE TABLE IF NOT EXISTS coupon_brands (
         coupon_id INT NOT NULL,
         brand_id INT NOT NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (coupon_id, brand_id),
         KEY coupon_brands_brand (brand_id)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ).catch((e) => { _schema = null; throw e; });
  }
  return _schema;
}

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const toInt = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const idList = (v) => {
  let arr = v;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = arr.split(','); } }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(toInt).filter(Boolean))];
};
const parseJsonArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

// Status as staff see it. Ended wins (a switched-off coupon past its end date
// is "ended": switching it on would not help).
const STATUS_SQL = `CASE
  WHEN c.status = 'expired' OR c.endDate < :now OR (c.usageLimit IS NOT NULL AND c.usageCount >= c.usageLimit) THEN 'ended'
  WHEN c.status = 'inactive' THEN 'off'
  WHEN c.startDate > :now THEN 'scheduled'
  ELSE 'live' END`;

function statusOf(c, now = new Date()) {
  const end = c.endDate ? new Date(c.endDate) : null;
  const start = c.startDate ? new Date(c.startDate) : null;
  if (c.status === 'expired' || (end && end < now) || (c.usageLimit && Number(c.usageCount) >= Number(c.usageLimit))) return 'ended';
  if (c.status === 'inactive') return 'off';
  if (start && start > now) return 'scheduled';
  return 'live';
}

// ── Brands ───────────────────────────────────────────────────────────────────
async function brandMap() {
  const rows = await q('SELECT id, name, display_name, slug, status FROM brands ORDER BY id');
  return new Map(rows.map((b) => [Number(b.id), { id: Number(b.id), name: b.display_name || b.name, slug: b.slug, active: b.status === 'active' }]));
}

// coupon id -> [brand ids]; coupons with no rows are absent (= every store).
async function brandIdsFor(couponIds) {
  if (!couponIds.length) return new Map();
  await ensureSchema();
  const rows = await q('SELECT coupon_id, brand_id FROM coupon_brands WHERE coupon_id IN (:ids) ORDER BY brand_id', { ids: couponIds });
  const out = new Map();
  for (const r of rows) {
    const k = Number(r.coupon_id);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(Number(r.brand_id));
  }
  return out;
}

async function setCouponBrands(couponId, brandIds, transaction) {
  await ensureSchema();
  await sequelize.query('DELETE FROM coupon_brands WHERE coupon_id = :id', { replacements: { id: couponId }, transaction });
  if (brandIds.length) {
    await sequelize.query(
      `INSERT INTO coupon_brands (coupon_id, brand_id) VALUES ${brandIds.map((_, i) => `(:id, :b${i})`).join(', ')}`,
      { replacements: { id: couponId, ...Object.fromEntries(brandIds.map((b, i) => [`b${i}`, b])) }, transaction }
    );
  }
}

// Storefront check (validateCoupon / listing). Fails open: a missing table or a
// DB hiccup must never block checkout.
async function allowedOnBrand(couponId, brandId) {
  if (!brandId) return true;
  try {
    const ids = (await brandIdsFor([couponId])).get(Number(couponId));
    return !ids || ids.includes(Number(brandId));
  } catch { return true; }
}

async function couponIdsBlockedForBrand(brandId) {
  if (!brandId) return new Set();
  try {
    await ensureSchema();
    const rows = await q(
      `SELECT DISTINCT coupon_id FROM coupon_brands
        WHERE coupon_id NOT IN (SELECT coupon_id FROM coupon_brands WHERE brand_id = :b)`, { b: brandId });
    return new Set(rows.map((r) => Number(r.coupon_id)));
  } catch { return new Set(); }
}

// ── "Works on" (categories / products) — enforced in couponRulesService ─────
async function namesFor(kind, ids) {
  if (!ids.length) return new Map();
  const rows = kind === 'category'
    ? await q('SELECT id, name FROM categories WHERE id IN (:ids)', { ids })
    : await q('SELECT id, name FROM products WHERE id IN (:ids)', { ids });
  return new Map(rows.map((r) => [Number(r.id), r.name]));
}

// Searchable pickers for the form. ids= resolves names for chips already chosen.
async function picker({ kind, search, ids }) {
  const want = idList(ids);
  const s = String(search || '').trim().slice(0, 80);
  if (kind === 'category') {
    const where = want.length ? 'c.id IN (:want)' : s ? 'c.name LIKE :s' : '1=1';
    return q(
      `SELECT c.id, c.name, c.status, p.name AS parent FROM categories c LEFT JOIN categories p ON p.id = c.parentId
        WHERE ${where} ORDER BY c.status = 'active' DESC, c.name LIMIT 40`, { want, s: `%${s}%` });
  }
  const where = want.length ? 'p.id IN (:want)' : s ? '(p.name LIKE :s OR p.slug LIKE :s)' : '1=1';
  return q(
    `SELECT p.id, p.name, p.status, COALESCE(b.display_name, b.name) AS brand FROM products p LEFT JOIN brands b ON b.id = p.brand_id
      WHERE ${where} ORDER BY p.status = 'active' DESC, p.name LIMIT 40`, { want, s: `%${s}%` });
}

// ── Automations that hand out a coupon code ──────────────────────────────────
// Every place a code is sent or shown without staff typing it:
//  • Abandoned-cart WhatsApp — cart rules coupon (cartRecoveryService, default CART10)
//  • Win-back WhatsApp — one code for all stores (cart rules winbackCoupon, default CART10);
//    the cron sends when a live coupon with that code works on the store
//    (couponForStore: no store list = every store; config/cronJobs.js winback)
//  • Website pop-up — POPUP_COUPON_CODE env (default PREPAID10), shown on the site
//    and sent on WhatsApp (leadController.capturePhoneLead)
//  • Exit pop-up — storefronts prefer CART10 from the public list, otherwise any
//    live code (soft: never broken by CART10 being off)
async function automationRefs(brands) {
  const whatsappService = require('./whatsappService.js');
  const { getCartRules } = require('./cartRecoveryService.js');
  const settingsHelper = require('./settingsHelper.js');
  const on = async (key) => { try { return await whatsappService.isAutomationEnabled(key); } catch { return true; } };

  const refs = [];
  const rules = await getCartRules({ fresh: true }).catch(() => ({ coupon: 'CART10' }));
  refs.push({ key: 'abandoned_cart', label: 'Abandoned-cart WhatsApp', code: String(rules.coupon || 'CART10').toUpperCase(), brandId: null, enabled: await on('abandoned_cart') });

  const winOn = await on('win_back');
  const winCode = String(rules.winbackCoupon || 'CART10').toUpperCase();
  for (const b of brands.values()) {
    if (!b.active) continue;
    const code = winCode;
    refs.push({ key: 'win_back', label: 'Win-back WhatsApp', code, brandId: b.id, enabled: winOn });
  }

  refs.push({ key: 'popup', label: 'Website pop-up', code: String(process.env.POPUP_COUPON_CODE || 'PREPAID10').trim().toUpperCase(), brandId: null, enabled: true });
  refs.push({ key: 'exit_popup', label: 'Exit pop-up', code: 'CART10', brandId: null, enabled: true, soft: true });
  return refs;
}

// code -> [{ key, text, enabled }] e.g. "Abandoned-cart WhatsApp",
// "Win-back WhatsApp · all stores". Win-back is one code for every store, so it
// is listed once (the cron uses any coupon with the code that works on a store).
function usedByIndex(refs, brands) {
  return (code) => {
    const c = String(code).toUpperCase();
    const out = [];
    let winDone = false;
    for (const r of refs) {
      if (r.code !== c) continue;
      if (r.key === 'win_back') {
        if (winDone) continue;
        winDone = true;
        out.push({ key: r.key, text: `${r.label} · all stores${r.enabled ? '' : ' (switched off)'}`, enabled: r.enabled, soft: !!r.soft, brandId: null });
        continue;
      }
      const text = `${r.label}${r.brandId ? ` · ${brands.get(r.brandId)?.name || `store ${r.brandId}`}` : ''}${r.enabled ? '' : ' (switched off)'}`;
      out.push({ key: r.key, text, enabled: r.enabled, soft: !!r.soft, brandId: r.brandId || null });
    }
    return out;
  };
}

// ── List with per-coupon stats ───────────────────────────────────────────────
function scopeSql({ search, brandId }) {
  const where = [];
  if (search) where.push('(c.code LIKE :search OR c.description LIKE :search)');
  if (brandId) {
    where.push(`(NOT EXISTS (SELECT 1 FROM coupon_brands cb WHERE cb.coupon_id = c.id)
               OR EXISTS (SELECT 1 FROM coupon_brands cb WHERE cb.coupon_id = c.id AND cb.brand_id = :brandId))`);
  }
  return where;
}

function statsSql(brandId) {
  return `SELECT u.couponId, COUNT(*) AS used, SUM(u.disc) AS discount, SUM(o.final_amount) AS sales
            FROM (SELECT couponId, orderId, SUM(discountAmount) AS disc FROM coupon_usages
                   WHERE orderId IS NOT NULL AND usedAt >= :usedFrom GROUP BY couponId, orderId) u
            JOIN orders o ON o.id = u.orderId
           WHERE o.status NOT IN (:cancelled) AND o.created_at >= :from${brandId ? ' AND o.brand_id = :brandId' : ''}
           GROUP BY u.couponId`;
}

async function listCoupons({ tab = 'live', search = '', brandId = null, page = 1, limit = 25, days = 30 } = {}) {
  await ensureSchema();
  const now = new Date();
  const from = new Date(now.getTime() - days * DAY_MS);
  const repl = {
    now, from, usedFrom: new Date(from.getTime() - 2 * DAY_MS), cancelled: CANCELLED,
    brandId, search: search ? `%${search}%` : null,
  };
  const where = scopeSql({ search, brandId });
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRows = await q(`SELECT st, COUNT(*) AS n FROM (SELECT ${STATUS_SQL} AS st FROM coupons c ${whereSql}) x GROUP BY st`, repl);
  const counts = { live: 0, scheduled: 0, off: 0, ended: 0, all: 0 };
  for (const r of countRows) { counts[r.st] = Number(r.n); counts.all += Number(r.n); }

  const tabWhere = STATUSES.includes(tab) ? [...where, `${STATUS_SQL} = :tab`] : where;
  const total = STATUSES.includes(tab) ? counts[tab] : counts.all;
  const offset = (page - 1) * limit;
  const rows = await q(
    `SELECT c.*, ${STATUS_SQL} AS st, COALESCE(s.used, 0) AS used, COALESCE(s.discount, 0) AS discountGiven, COALESCE(s.sales, 0) AS sales
       FROM coupons c LEFT JOIN (${statsSql(brandId)}) s ON s.couponId = c.id
      ${tabWhere.length ? `WHERE ${tabWhere.join(' AND ')}` : ''}
      ORDER BY FIELD(${STATUS_SQL}, 'live', 'scheduled', 'off', 'ended'), used DESC, c.createdAt DESC
      LIMIT :limit OFFSET :offset`,
    { ...repl, tab, limit, offset });

  const brands = await brandMap();
  const ids = rows.map((r) => Number(r.id));
  const [restrictions, refs] = await Promise.all([brandIdsFor(ids), automationRefs(brands)]);
  const usedBy = usedByIndex(refs, brands);
  const catIds = [...new Set(rows.flatMap((r) => idList(r.applicableCategories)))];
  const prodIds = [...new Set(rows.flatMap((r) => idList(r.applicableProducts)))];
  const [catNames, prodNames] = await Promise.all([namesFor('category', catIds), namesFor('product', prodIds)]);

  const coupons = rows.map((r) => {
    const restricted = restrictions.get(Number(r.id)) || [];
    return {
      id: Number(r.id),
      code: r.code,
      description: r.description,
      type: r.type,
      value: Number(r.value),
      minPurchase: r.minPurchase == null ? null : Number(r.minPurchase),
      maxDiscount: r.maxDiscount == null ? null : Number(r.maxDiscount),
      paymentModeRestriction: r.paymentModeRestriction || 'all',
      firstOrderOnly: !!r.firstOrderOnly,
      tieredDiscounts: parseJsonArray(r.tieredDiscounts),
      quantityBasedDiscounts: parseJsonArray(r.quantityBasedDiscounts),
      startDate: r.startDate,
      endDate: r.endDate,
      usageLimit: r.usageLimit == null ? null : Number(r.usageLimit),
      usageCount: Number(r.usageCount || 0),
      perUserLimit: r.perUserLimit == null ? null : Number(r.perUserLimit),
      status: r.status,
      state: r.st,
      brandId: Number(r.brand_id),
      brands: restricted.map((id) => ({ id, name: brands.get(id)?.name || `Store ${id}` })),
      categories: idList(r.applicableCategories).map((id) => ({ id, name: catNames.get(id) || `Category ${id}` })),
      products: idList(r.applicableProducts).map((id) => ({ id, name: prodNames.get(id) || `Product ${id}` })),
      usedBy: usedBy(r.code),
      stats: { used: Number(r.used), discount: Math.round(Number(r.discountGiven)), sales: Math.round(Number(r.sales)) },
    };
  });

  return {
    coupons,
    counts,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    period: { days, from },
  };
}

// ── 30-day summary ───────────────────────────────────────────────────────────
async function summary({ brandId = null, days = 30 } = {}) {
  await ensureSchema();
  const now = new Date();
  const from = new Date(now.getTime() - days * DAY_MS);
  const repl = { now, from, usedFrom: new Date(from.getTime() - 2 * DAY_MS), cancelled: CANCELLED, brandId, soon: new Date(now.getTime() + 7 * DAY_MS) };
  const [o] = await q(
    `SELECT COUNT(*) AS orders,
            SUM(CASE WHEN u.orderId IS NOT NULL THEN 1 ELSE 0 END) AS couponOrders,
            COALESCE(SUM(u.disc), 0) AS discount,
            COALESCE(SUM(CASE WHEN u.orderId IS NOT NULL THEN o.final_amount ELSE 0 END), 0) AS sales
       FROM orders o
       LEFT JOIN (SELECT orderId, SUM(discountAmount) AS disc FROM coupon_usages
                   WHERE orderId IS NOT NULL AND usedAt >= :usedFrom GROUP BY orderId) u ON u.orderId = o.id
      WHERE o.created_at >= :from AND o.status NOT IN (:cancelled)${brandId ? ' AND o.brand_id = :brandId' : ''}`, repl);
  const where = scopeSql({ brandId });
  const [c] = await q(
    `SELECT SUM(${STATUS_SQL} = 'live') AS live,
            SUM(${STATUS_SQL} = 'scheduled' AND c.startDate <= :soon) AS startingSoon
       FROM coupons c ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, repl);
  const orders = Number(o.orders || 0);
  const couponOrders = Number(o.couponOrders || 0);
  const discount = Math.round(Number(o.discount || 0));
  const sales = Math.round(Number(o.sales || 0));
  return {
    days,
    orders,
    couponOrders,
    couponShare: orders ? Math.round((couponOrders / orders) * 1000) / 10 : 0,
    discount,
    sales,
    salesPerRupee: discount ? Math.round((sales / discount) * 10) / 10 : null,
    liveCodes: Number(c.live || 0),
    startingSoon: Number(c.startingSoon || 0),
  };
}

// ── Dependency check ─────────────────────────────────────────────────────────
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

async function dependencies() {
  await ensureSchema();
  const { Coupon } = require('../model/couponModel.js');
  const now = new Date();
  const brands = await brandMap();
  const refs = (await automationRefs(brands)).filter((r) => r.enabled && !r.soft);
  const codes = [...new Set(refs.map((r) => r.code))];
  const coupons = codes.length ? await Coupon.findAll({ where: { code: codes } }) : [];
  // A code can exist more than once (one per store). Win-back looks for the
  // store's own row, like the cron; elsewhere prefer a row that is on.
  const byCode = new Map();
  for (const c of coupons) {
    const k = String(c.code).toUpperCase();
    if (!byCode.has(k)) byCode.set(k, []);
    byCode.get(k).push(c);
  }
  const pick = (code, brandId) => {
    const rows = byCode.get(code) || [];
    return (brandId && rows.find((c) => Number(c.brand_id) === brandId))
      || rows.find((c) => statusOf(c, now) === 'live') || rows[0] || null;
  };
  const restrictions = await brandIdsFor(coupons.map((c) => c.id));
  const activeBrands = [...brands.values()].filter((b) => b.active);
  const bName = (id) => brands.get(Number(id))?.name || `store ${id}`;

  // Win-back only matters for stores whose signed-in customers order.
  const winRows = await q(
    `SELECT DISTINCT brand_id FROM orders WHERE user_id IS NOT NULL AND created_at >= :from AND status NOT IN (:cancelled)`,
    { from: new Date(now.getTime() - 90 * DAY_MS), cancelled: CANCELLED });
  const winBrands = new Set(winRows.map((r) => Number(r.brand_id)));

  const warnings = [];
  const push = (ref, brandId, problem, message, fix, c) => warnings.push({
    key: `${ref.key}:${brandId || 'all'}:${ref.code}`,
    automation: ref.key, automationLabel: ref.label, brandId, brandName: brandId ? bName(brandId) : null,
    code: ref.code, couponId: c ? c.id : null, problem, message, fix,
  });

  for (const ref of refs) {
    if (ref.key === 'win_back' && !winBrands.has(ref.brandId)) continue;
    let c = pick(ref.code, null);
    if (ref.key === 'win_back') {
      // Same rule as the win-back cron: a coupon with this code that works on this store.
      const found = await couponForStore(ref.code, ref.brandId, now);
      if (found.coupon) c = found.coupon;
    }
    const B = ref.brandId ? bName(ref.brandId) : '';
    const lead = ref.key === 'win_back' ? `Win-back is skipping ${B}` : ref.key === 'abandoned_cart' ? 'Abandoned-cart messages' : 'Website pop-up';
    const subject = ref.key === 'win_back' ? `its offer code ${ref.code}` : ref.key === 'abandoned_cart' ? `the code they send, ${ref.code},` : `the code it gives visitors, ${ref.code},`;
    const effect = ref.key === 'win_back' ? `so no ${B} customer gets the win-back message` : 'so people get a code that fails at checkout';
    const say = (problem) => `${lead}: ${subject} ${problem}, ${effect}.`;

    if (!c) {
      push(ref, ref.brandId, 'missing', say("doesn't exist yet"),
        { action: 'create', label: `Create ${ref.code}`, code: ref.code, brandIds: [] }, null);
      continue;
    }
    const st = statusOf(c, now);
    const allowed = restrictions.get(c.id);
    if (st === 'ended') {
      const why = c.usageLimit && Number(c.usageCount) >= Number(c.usageLimit)
        ? `has been used all ${c.usageLimit} times` : c.status === 'expired' ? 'is marked as ended' : `ended on ${fmtDay(c.endDate)}`;
      push(ref, ref.brandId, 'ended', say(why), { action: 'edit', label: 'Change end date or limit', couponId: c.id }, c);
      continue;
    }

    if (ref.key === 'win_back') {
      // One win-back code for every store: it only has to work on this store.
      const notHere = allowed && !allowed.includes(ref.brandId);
      if (st === 'off' || notHere) {
        push(ref, ref.brandId, st === 'off' ? 'off' : 'wrong_brand',
          say(st === 'off' ? 'is switched off' : `doesn't work on ${B}`),
          { action: 'switch_on', label: st === 'off' ? 'Switch it back on' : 'Let it work on every store', couponId: c.id, allBrands: !!notHere }, c);
        continue;
      }
    } else {
      const left = allowed ? activeBrands.filter((b) => !allowed.includes(b.id)) : [];
      if (st === 'off' || left.length) {
        push(ref, null, st === 'off' ? 'off' : 'not_on_brand',
          say(st === 'off' ? 'is switched off' : `doesn't work on ${left.map((b) => b.name).join(', ')}`),
          { action: 'switch_on', label: st === 'off' ? 'Switch it back on' : 'Let it work on every store', couponId: c.id, allBrands: left.length > 0 }, c);
        continue;
      }
    }
    if (st === 'scheduled') {
      push(ref, ref.brandId, 'not_started',
        `${ref.key === 'win_back' ? `Win-back for ${B}` : lead}: ${subject.replace(/,$/, '')} only starts on ${fmtDay(c.startDate)} — until then it won't work.`,
        { action: 'edit', label: 'Change start date', couponId: c.id }, c);
    }
  }
  return { warnings, checkedAt: now };
}

// The coupon called `code` that customers of `brandId` can actually use — the
// same rule as checkout: its store list (coupon_brands) is empty (every store)
// or includes the store. Prefers a live one. Returns { coupon, status } where
// status is live | off | scheduled | ended | not_here | missing.
async function couponForStore(code, brandId, now = new Date()) {
  const { Coupon } = require('../model/couponModel.js');
  await ensureSchema();
  const rows = await Coupon.findAll({ where: { code } });
  if (!rows.length) return { coupon: null, status: 'missing' };
  const allowed = await brandIdsFor(rows.map((c) => c.id));
  const usable = rows.filter((c) => { const a = allowed.get(c.id); return !a || a.includes(Number(brandId)); });
  if (!usable.length) return { coupon: rows[0], status: 'not_here' };
  const rank = { live: 0, scheduled: 1, off: 2, ended: 3 };
  usable.sort((a, b) => (rank[statusOf(a, now)] ?? 9) - (rank[statusOf(b, now)] ?? 9));
  return { coupon: usable[0], status: statusOf(usable[0], now) };
}

// One-click fix from the warnings banner: switch the coupon on and, when asked,
// make it usable for a store (home store for win-back, or every store).
async function switchOn(id, { brandId = null, owner = false, allBrands = false } = {}) {
  const { Coupon } = require('../model/couponModel.js');
  await ensureSchema();
  const c = await Coupon.findByPk(id);
  if (!c) return { status: 404, message: 'Coupon not found' };
  const now = new Date();
  if ((c.endDate && new Date(c.endDate) < now) || (c.usageLimit && Number(c.usageCount) >= Number(c.usageLimit))) {
    return { status: 409, message: `${c.code} has ended — open it and set a new end date or limit first.` };
  }
  const b = toInt(brandId);
  const brands = b ? await brandMap() : null;
  if (b && !brands.has(b)) return { status: 400, message: 'Unknown store' };
  await sequelize.transaction(async (t) => {
    await c.update({ status: 'active', ...(owner && b ? { brand_id: b } : {}) }, { transaction: t });
    if (allBrands) {
      await sequelize.query('DELETE FROM coupon_brands WHERE coupon_id = :id', { replacements: { id: c.id }, transaction: t });
    } else if (b) {
      const allowed = (await brandIdsFor([c.id])).get(c.id);
      if (allowed && !allowed.includes(b)) {
        await sequelize.query('INSERT IGNORE INTO coupon_brands (coupon_id, brand_id) VALUES (:id, :b)', { replacements: { id: c.id, b }, transaction: t });
      }
    }
  });
  return { status: 200, coupon: c };
}

// ── Create / update input ────────────────────────────────────────────────────
// Produces exactly what checkout reads:
//   tieredDiscounts         [{ minAmount, discount }]   ₹ off once the cart reaches minAmount
//   quantityBasedDiscounts  [{ minQuantity, discount }] ₹ off once the cart has that many items
// (both: discount is a flat rupee amount; the highest tier reached applies).
// `value` must be > 0 for every type, so tier types store their biggest discount.
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const money = (v) => (v === '' || v == null ? null : Number(v));

async function normaliseInput(body, existing = null) {
  const b = body || {};
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  const pick = (k, fallback) => (has(k) ? b[k] : fallback);
  const out = {};

  const code = String(pick('code', existing ? existing.code : '') || '').trim().toUpperCase();
  if (!existing || code !== existing.code) {
    if (!CODE_RE.test(code)) return { error: 'Use 3–32 capital letters, numbers, - or _ for the code (no spaces).' };
  }
  out.code = code;

  const type = pick('type', existing ? existing.type : 'percentage');
  if (!['percentage', 'fixed', 'tiered', 'quantity_based'].includes(type)) return { error: 'Pick a discount type.' };
  out.type = type;

  if (type === 'percentage' || type === 'fixed') {
    const value = Number(pick('value', existing ? existing.value : NaN));
    if (!Number.isFinite(value) || value <= 0) return { error: 'Enter how much the discount is.' };
    if (type === 'percentage' && value > 100) return { error: 'A percentage discount must be between 1 and 100.' };
    out.value = value;
    out.tieredDiscounts = null;
    out.quantityBasedDiscounts = null;
  } else {
    const field = type === 'tiered' ? 'tieredDiscounts' : 'quantityBasedDiscounts';
    const minKey = type === 'tiered' ? 'minAmount' : 'minQuantity';
    const raw = parseJsonArray(pick(field, existing ? existing[field] : []));
    const tiers = raw.map((t) => ({ [minKey]: Number(t && t[minKey]), discount: Number(t && t.discount) }));
    if (!tiers.length) return { error: 'Add at least one step.' };
    for (const t of tiers) {
      if (!Number.isFinite(t[minKey]) || t[minKey] <= 0 || (type === 'quantity_based' && !Number.isInteger(t[minKey]))) {
        return { error: type === 'tiered' ? 'Each step needs a cart amount above ₹0.' : 'Each step needs a whole number of items.' };
      }
      if (!Number.isFinite(t.discount) || t.discount <= 0) return { error: 'Each step needs a discount above ₹0.' };
      if (type === 'tiered' && t.discount >= t.minAmount) return { error: 'A step’s discount must be less than its cart amount.' };
    }
    if (new Set(tiers.map((t) => t[minKey])).size !== tiers.length) return { error: 'Two steps have the same starting point.' };
    tiers.sort((x, y) => x[minKey] - y[minKey]);
    out[field] = tiers;
    out[type === 'tiered' ? 'quantityBasedDiscounts' : 'tieredDiscounts'] = null;
    out.value = Math.max(...tiers.map((t) => t.discount));
  }

  const minPurchase = money(pick('minPurchase', existing ? existing.minPurchase : null));
  if (minPurchase != null && (!Number.isFinite(minPurchase) || minPurchase < 0)) return { error: 'Minimum order can’t be negative.' };
  out.minPurchase = minPurchase || null;
  const maxDiscount = type === 'percentage' ? money(pick('maxDiscount', existing ? existing.maxDiscount : null)) : null;
  if (maxDiscount != null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) return { error: 'Maximum discount can’t be negative.' };
  out.maxDiscount = maxDiscount || null;

  for (const [k, label] of [['usageLimit', 'Total uses'], ['perUserLimit', 'Uses per customer']]) {
    const v = money(pick(k, existing ? existing[k] : null));
    if (v != null && (!Number.isInteger(v) || v < 1)) return { error: `${label} must be a whole number of at least 1 (or empty for no limit).` };
    out[k] = v;
  }

  const start = new Date(pick('startDate', existing ? existing.startDate : null));
  const end = new Date(pick('endDate', existing ? existing.endDate : null));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: 'Pick a start and an end date.' };
  if (end <= start) return { error: 'The end date must be after the start date.' };
  out.startDate = start;
  out.endDate = end;

  const status = pick('status', existing ? existing.status : 'active');
  out.status = ['active', 'inactive', 'expired'].includes(status) ? status : 'active';
  // Re-opening an "expired" coupon by moving its end date forward makes it usable again.
  if (out.status === 'expired' && end > new Date() && has('endDate')) out.status = 'active';
  const pm = pick('paymentModeRestriction', existing ? existing.paymentModeRestriction : 'all');
  out.paymentModeRestriction = ['all', 'cod', 'prepaid'].includes(pm) ? pm : 'all';
  out.firstOrderOnly = !!pick('firstOrderOnly', existing ? existing.firstOrderOnly : false);
  const desc = pick('description', existing ? existing.description : null);
  out.description = desc == null ? null : String(desc).trim().slice(0, 500) || null;

  // Categories / products: keep only ids that exist.
  for (const [k, table] of [['applicableCategories', 'categories'], ['applicableProducts', 'products']]) {
    const ids = idList(pick(k, existing ? existing[k] : null));
    if (!ids.length) { out[k] = null; continue; }
    const rows = await q(`SELECT id FROM ${table} WHERE id IN (:ids)`, { ids });
    const found = new Set(rows.map((r) => Number(r.id)));
    const kept = ids.filter((id) => found.has(id));
    out[k] = kept.length ? kept : null;
  }

  // Stores: [] = every store. Home store (coupons.brand_id) stays when it is
  // still allowed; otherwise the first allowed store.
  let brandIds = null;
  if (has('brandIds')) {
    const brands = await brandMap();
    brandIds = idList(b.brandIds).filter((id) => brands.has(id));
    if (brandIds.length) out.brand_id = existing && brandIds.includes(Number(existing.brand_id)) ? Number(existing.brand_id) : brandIds[0];
    else if (!existing) out.brand_id = 1;
  } else if (!existing) {
    out.brand_id = 1;
  }
  return { data: out, brandIds };
}

module.exports = {
  ensureSchema,
  statusOf,
  listCoupons,
  summary,
  dependencies,
  switchOn,
  couponForStore,
  normaliseInput,
  setCouponBrands,
  brandIdsFor,
  allowedOnBrand,
  couponIdsBlockedForBrand,
  picker,
  automationRefs,
  usedByIndex,
  brandMap,
};
