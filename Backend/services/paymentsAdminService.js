'use strict';

/**
 * Dashboard → Payments.
 *
 *   listPayments   — one server-paged list: every payments row (online, COD
 *                    collected, refunds) plus open COD orders that have no
 *                    payment row yet ("COD — to collect"), with a plain-English
 *                    "why" for failures, pendings and refunds.
 *   summary        — the tiles: collected online (+ method split), COD with
 *                    couriers, refunded, failed % (and how many retried and
 *                    paid), and the nightly 3 am Razorpay check (job_runs).
 *   mismatches     — payments that are pending/failed here but captured at
 *                    Razorpay (a dry-run of paymentReconciliationService,
 *                    cached 10 min), plus orders the check marked paid after
 *                    they were auto-cancelled.
 *   fixMismatch    — "Mark paid & confirm": reconcileOrderPayment with the
 *                    admin as actor (idempotent, audit-logged).
 *
 * Units: gateway rows store amount_paid in PAISE (refund rows negative); COD
 * rows (created on delivery) store RUPEES. Orders are in rupees. Status
 * 'failed' never counts as money.
 *
 * Schema (lazy, once per process — see ensureSchema):
 *   payments.pay_method VARCHAR(20) NULL   — upi | card | netbanking | wallet | …
 *                                            filled from Razorpay (backfill + checks)
 *   INDEX idx_payments_created (created_at), INDEX idx_payments_txn (transaction_id)
 */

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { phoneHash } = require('../utils/encryption.js');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (v) => Math.round(num(v) * 100) / 100;
const inr = (v) => `₹${Math.round(Math.abs(num(v))).toLocaleString('en-IN')}`;

const COLLECTED = "('successful','completed','refunded','partial_refund','refund_pending')";
const COD_OPEN = "('awaiting_confirmation','pending','confirmed','processing','booked','pickup initiated','manifested','in transit','shipped','out for delivery','undelivered','exception')";
const COD_WITH_COURIER = "('booked','pickup initiated','manifested','in transit','shipped','out for delivery','undelivered')";
const AMOUNT = "CASE WHEN p.payment_type = 'cod' THEN p.amount_paid ELSE p.amount_paid / 100 END";
const TABS = ['all', 'paid', 'failed', 'pending', 'refund', 'cod', 'cancelled'];
const IST_MS = 330 * 60000;

// ── Schema ─────────────────────────────────────────────────────────────────
let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const cols = await q(`SELECT LOWER(column_name) AS c FROM information_schema.columns
                             WHERE table_schema = DATABASE() AND table_name = 'payments'`);
      if (!cols.some((r) => r.c === 'pay_method')) {
        await sequelize.query('ALTER TABLE payments ADD COLUMN pay_method VARCHAR(20) NULL');
      }
      const idx = await q(`SELECT DISTINCT index_name AS i FROM information_schema.statistics
                            WHERE table_schema = DATABASE() AND table_name = 'payments'`);
      const have = new Set(idx.map((r) => r.i));
      if (!have.has('idx_payments_created')) await sequelize.query('ALTER TABLE payments ADD INDEX idx_payments_created (created_at)');
      if (!have.has('idx_payments_txn')) await sequelize.query('ALTER TABLE payments ADD INDEX idx_payments_txn (transaction_id)');
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const PERIODS = { 1: 1, 7: 7, 30: 30 };
/** Start of the period: IST midnight, (days - 1) days ago. */
function periodStart(period) {
  const days = PERIODS[period] || 7;
  const istNow = new Date(Date.now() + IST_MS);
  const ymd = istNow.toISOString().slice(0, 10);
  return new Date(new Date(`${ymd}T00:00:00.000+05:30`).getTime() - (days - 1) * 86400000);
}
const brandOf = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);

function normMethod(m) {
  const s = String(m || '').toLowerCase().trim();
  if (!s || s === '-') return null;
  if (s.includes('upi')) return 'upi';
  if (s.includes('card')) return 'card';
  if (s.includes('net')) return 'netbanking';
  if (s.includes('wallet')) return 'wallet';
  if (s.includes('emi')) return 'emi';
  if (s.includes('later')) return 'paylater';
  if (s === 'cod') return 'cod';
  return 'other';
}
const METHOD_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Netbanking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay later', other: 'Other', cod: 'Cash on delivery' };

function rowMethod(r) {
  if (r.payment_type === 'cod') return 'cod';
  if (r.pay_method) return normMethod(r.pay_method);
  if (r.payment_gateway === 'CustomCheckout') {
    const m = String(r.notes || '').match(/method\s+([\w-]+)/i);
    if (m) return normMethod(m[1]);
  }
  if (['upi', 'credit_card', 'debit_card', 'wallet'].includes(r.payment_type)) return normMethod(r.payment_type);
  return null;
}

/** Razorpay / bank failure text → one short line staff understand. */
function failureReason(notes) {
  const raw = String(notes || '').trim();
  const text = raw.replace(/^[A-Z_]+:\s*/, '');
  const t = text.toLowerCase();
  if (!raw || /^payment failed( via webhook)?$/i.test(raw)) return 'Payment failed — Razorpay gave no reason';
  if (/insufficient|not enough balance|low balance/.test(t)) return 'Bank declined — not enough balance';
  if (/cancel|closed|abandon|dropped|user.*(exit|back)|by the user/.test(t)) return 'Customer closed the payment page';
  if (/timed? ?out|time out|expired/.test(t)) return 'Payment timed out at the bank';
  if (/otp|authenticat|3ds|3-d secure|verification/.test(t)) return 'OTP / card check failed';
  if (/limit/.test(t)) return 'Over the card or UPI limit';
  if (/(invalid|incorrect|wrong).*(vpa|upi|card|cvv|expiry|pin)|(vpa|upi id).*(invalid|incorrect)/.test(t)) return 'Wrong card or UPI details';
  if (/pin/.test(t)) return 'Wrong UPI PIN';
  if (/declined|rejected|refused|not allowed|blocked/.test(t)) return 'Bank declined the payment';
  if (/risk|fraud|suspicious/.test(t)) return 'Blocked by Razorpay as risky';
  if (/bank.*(down|unavailable)|server|gateway error|technical/.test(t)) return 'Bank or gateway had a technical problem';
  return text.length > 110 ? `${text.slice(0, 107)}…` : text;
}

const minutesSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 60000);

/** Status shown on the row + the "why" line. */
function describe(r) {
  const amt = num(r.amount);
  const orderCancelled = ['cancelled', 'order cancelled'].includes(String(r.order_status || '').toLowerCase());
  const orderPaid = ['paid', 'refunded', 'partial_refund', 'refund_pending'].includes(String(r.order_payment_status || '').toLowerCase());
  if (r.src === 'c') {
    const shipped = /booked|pickup|manifested|transit|shipped|out for delivery|undelivered/.test(String(r.order_status || ''));
    return { kind: 'cod', why: shipped ? 'Courier collects on delivery' : 'Not shipped yet — collected on delivery' };
  }
  if (amt < 0) {
    const reason = String(r.notes || '').replace(/^Refund for order [^:]+:\s*/i, '').replace(/\s*·\s*FAILED:.*$/i, '').trim();
    if (r.status === 'failed') return { kind: 'refund_failed', why: 'Razorpay refused this refund — issue it again from Orders → Problems' };
    const partial = r.order_final != null && Math.abs(amt) < num(r.order_final) - 0.5;
    return { kind: partial ? 'partial' : 'refund', why: reason || (partial ? 'Part of the order refunded' : 'Order refunded') };
  }
  switch (r.status) {
    case 'successful':
    case 'completed':
      if (r.payment_type === 'cod') return { kind: 'cod_paid', why: 'Collected by the courier on delivery' };
      if (orderCancelled) return { kind: 'paid', why: 'Order cancelled after the customer paid — refund or re-open it' };
      return { kind: 'paid', why: '' };
    case 'refunded':
    case 'partial_refund': {
      const m = String(r.notes || '').match(/refund: ₹([\d.]+).*?Reason:\s*(.+)$/i);
      return { kind: r.status === 'refunded' ? 'paid_refunded' : 'paid_part_refunded', why: m ? `Refunded ${inr(m[1])} · ${m[2]}` : 'Money was refunded later' };
    }
    case 'refund_pending':
      return { kind: 'refund_due', why: 'Refund owed — the last refund attempt didn’t go through' };
    case 'failed': {
      const base = failureReason(r.notes);
      if (r.order_id && orderPaid) return { kind: 'failed', why: `${base}. Customer retried and paid.` };
      if (orderCancelled) return { kind: 'failed', why: `${base}. Order cancelled.` };
      return { kind: 'failed', why: base };
    }
    case 'pending': {
      if (!r.order_id) return { kind: 'pending', why: 'Customer opened the payment page — no order yet' };
      if (orderCancelled) return { kind: 'pending', why: 'Never paid — order auto-cancelled after 30 min' };
      const left = 30 - minutesSince(r.created_at);
      return { kind: 'pending', why: left > 0 ? `Customer hasn’t finished paying — auto-cancels in ${left} min` : 'Not paid — will be cancelled at the next clean-up' };
    }
    case 'cancelled':
      return { kind: 'cancelled', why: r.notes ? String(r.notes).slice(0, 110) : 'Payment cancelled' };
    default:
      return { kind: r.status || 'other', why: r.notes ? String(r.notes).slice(0, 110) : '' };
  }
}

async function orderIdsForPhone(p10) {
  const h = phoneHash(p10);
  const rows = await q(
    `SELECT o.id FROM orders o
       LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN users u ON u.id = o.user_id
      WHERE ${h ? 'sa.phone_hash = :h OR g.phone_hash = :h OR' : "REGEXP_REPLACE(sa.phone, '[^0-9]', '') LIKE :like OR REGEXP_REPLACE(g.phone, '[^0-9]', '') LIKE :like OR"}
            RIGHT(REGEXP_REPLACE(u.phone, '[^0-9]', ''), 10) = :p10
      ORDER BY o.id DESC LIMIT 500`,
    { h, p10, like: `%${p10}` }
  );
  return rows.map((r) => r.id);
}

// ── List ───────────────────────────────────────────────────────────────────
async function listPayments(query = {}) {
  await ensureSchema();
  const tab = TABS.includes(query.tab) ? query.tab : 'all';
  const period = String(query.period || '7');
  const brandId = brandOf(query.brandId);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const search = String(query.q || '').trim().replace(/^#/, '');

  const repl = { since: periodStart(period), limit, offset: (page - 1) * limit };
  const pw = []; // payments-row filters
  const cw = []; // open-COD-order filters
  if (brandId) { pw.push('p.brand_id = :brandId'); cw.push('o.brand_id = :brandId'); repl.brandId = brandId; }

  if (search) {
    const p10 = last10(search);
    const looksPhone = /^\+?[\d\s-]{10,16}$/.test(search) && p10.length === 10;
    if (looksPhone) {
      const ids = await orderIdsForPhone(p10);
      repl.ids = ids.length ? ids : [0];
      pw.push('p.order_id IN (:ids)'); cw.push('o.id IN (:ids)');
    } else {
      repl.qExact = search; repl.qLike = `%${search}%`;
      pw.push('(p.transaction_id = :qExact OR p.razorpay_order_id = :qExact OR o.order_number LIKE :qLike)');
      cw.push('o.order_number LIKE :qLike');
    }
  } else {
    pw.push('p.created_at >= :since'); cw.push('o.created_at >= :since');
  }

  const tabWhere = {
    all: null,
    paid: "p.status IN ('successful','completed') AND p.amount_paid > 0",
    failed: "p.status = 'failed' AND p.amount_paid > 0",
    pending: "p.status = 'pending'",
    refund: "(p.amount_paid < 0 OR p.status = 'refund_pending')",
    cod: "p.payment_type = 'cod'",
    cancelled: "p.status = 'cancelled'",
  }[tab];
  if (tabWhere) pw.push(tabWhere);
  const withCod = tab === 'all' || tab === 'cod';

  const paySql = `SELECT 'p' AS src, p.id, p.order_id, p.payment_type, p.payment_gateway, ${AMOUNT} AS amount, p.status,
                         p.transaction_id, p.razorpay_order_id, p.notes, p.pay_method, p.created_at, p.brand_id
                    FROM payments p LEFT JOIN orders o ON o.id = p.order_id
                   WHERE ${pw.join(' AND ') || '1=1'}`;
  const codSql = `SELECT 'c' AS src, NULL AS id, o.id AS order_id, 'cod' AS payment_type, NULL AS payment_gateway, o.final_amount AS amount,
                         'cod_open' AS status, NULL AS transaction_id, NULL AS razorpay_order_id, NULL AS notes, NULL AS pay_method,
                         o.created_at, o.brand_id
                    FROM orders o
                   WHERE o.payment_type = 'cod' AND o.status IN ${COD_OPEN}
                     AND NOT EXISTS (SELECT 1 FROM payments px WHERE px.order_id = o.id)
                     ${cw.length ? `AND ${cw.join(' AND ')}` : ''}`;
  const union = withCod ? `${paySql} UNION ALL ${codSql}` : paySql;

  const [rows, [{ n }]] = await Promise.all([
    q(`SELECT x.*, o.order_number, o.status AS order_status, o.payment_status AS order_payment_status, o.final_amount AS order_final,
              COALESCE(NULLIF(u.username, ''), NULLIF(TRIM(CONCAT(COALESCE(g.first_name, ''), ' ', COALESCE(g.last_name, ''))), ''), sa.full_name) AS customer,
              b.name AS brand_name
         FROM (${union}) x
         LEFT JOIN orders o ON o.id = x.order_id
         LEFT JOIN users u ON u.id = o.user_id
         LEFT JOIN guest_users g ON g.id = o.guest_user_id
         LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
         LEFT JOIN brands b ON b.id = x.brand_id
        ORDER BY x.created_at DESC, x.id DESC
        LIMIT :limit OFFSET :offset`, repl),
    q(`SELECT COUNT(*) AS n FROM (${union}) x`, repl),
  ]);

  const total = num(n);
  return {
    tab, period: PERIODS[period] ? Number(period) : 7, searchedAllDates: !!search,
    page, limit, total, pages: Math.max(1, Math.ceil(total / limit)),
    rows: rows.map((r) => {
      const d = describe(r);
      const m = rowMethod(r);
      return {
        key: r.src === 'c' ? `c${r.order_id}` : `p${r.id}`,
        id: r.id,
        kind: d.kind,
        why: d.why,
        amount: r2(r.amount),
        method: m,
        methodLabel: m ? METHOD_LABEL[m] : 'Online',
        ref: r.src === 'c' ? null : (r.transaction_id && !/^COD-/.test(r.transaction_id) ? r.transaction_id : r.razorpay_order_id || null),
        orderId: r.order_id || null,
        orderNumber: r.order_number || null,
        customer: r.customer ? String(r.customer).trim() : null,
        brand: r.brand_name || null,
        at: r.created_at,
      };
    }),
  };
}

// ── Summary (tiles) ────────────────────────────────────────────────────────
async function summary(query = {}) {
  await ensureSchema();
  const brandId = brandOf(query.brandId);
  const since = periodStart(String(query.period || '7'));
  const repl = { since, brandId };
  const bP = brandId ? 'AND p.brand_id = :brandId' : '';
  const bO = brandId ? 'AND o.brand_id = :brandId' : '';

  const [methods, [cod], [ref], [fail], [due], runs, [fixed]] = await Promise.all([
    q(`SELECT CASE WHEN p.pay_method IS NOT NULL THEN p.pay_method
                   WHEN p.payment_gateway = 'CustomCheckout' AND p.notes LIKE '%method %' THEN TRIM(SUBSTRING_INDEX(p.notes, 'method ', -1))
                   WHEN p.payment_type IN ('upi','credit_card','debit_card','wallet') THEN p.payment_type
                   ELSE NULL END AS m,
              COUNT(*) AS n, COALESCE(SUM(p.amount_paid), 0) / 100 AS amt
         FROM payments p
        WHERE p.payment_type <> 'cod' AND p.amount_paid > 0 AND p.status IN ${COLLECTED} AND p.created_at >= :since ${bP}
        GROUP BY m`, repl),
    q(`SELECT COUNT(*) AS n, COALESCE(SUM(o.final_amount), 0) AS amt FROM orders o
        WHERE o.payment_type = 'cod' AND o.status IN ${COD_WITH_COURIER} ${bO}`, repl),
    q(`SELECT COUNT(*) AS n, COALESCE(SUM(-p.amount_paid), 0) / 100 AS amt FROM payments p
        WHERE p.amount_paid < 0 AND p.status <> 'failed' AND p.payment_type <> 'cod' AND p.created_at >= :since ${bP}`, repl),
    q(`SELECT COUNT(*) AS failed, COUNT(DISTINCT p.order_id) AS orders,
              COUNT(DISTINCT CASE WHEN o.payment_status IN ('paid','refunded','partial_refund','refund_pending') THEN p.order_id END) AS retried_paid
         FROM payments p LEFT JOIN orders o ON o.id = p.order_id
        WHERE p.status = 'failed' AND p.amount_paid > 0 AND p.payment_type <> 'cod' AND p.created_at >= :since ${bP}`, repl),
    q(`SELECT COUNT(*) AS n FROM orders o WHERE o.payment_status = 'refund_pending' ${bO}`, repl),
    require('./jobRunService.js').recentRuns(['payment-reconciliation'], 1).catch(() => ({ 'payment-reconciliation': [] })),
    q(`SELECT COUNT(DISTINCT a.order_id) AS n FROM order_audit_logs a JOIN orders o ON o.id = a.order_id
        WHERE a.action = 'payment_reconciled' AND a.created_at >= :week ${bO}`, { ...repl, week: new Date(Date.now() - 7 * 86400000) }).catch(() => [{ n: 0 }]),
  ]);

  const split = {};
  let collected = 0; let collectedCount = 0; let known = 0;
  for (const r of methods) {
    const k = normMethod(r.m);
    collected += num(r.amt); collectedCount += num(r.n);
    if (k) { split[k] = (split[k] || 0) + num(r.amt); known += num(r.amt); }
  }
  const methodSplit = Object.entries(split)
    .sort((a, b) => b[1] - a[1])
    .map(([k, amt]) => ({ method: k, label: METHOD_LABEL[k] || k, amount: r2(amt), pct: known ? Math.round((amt / known) * 100) : 0 }));

  const failed = num(fail.failed);
  const lastRun = (runs['payment-reconciliation'] || [])[0] || null;

  // Fill in missing UPI / card info in the background for the next load.
  backfillMethods(brandId, since).catch(() => {});

  return {
    collectedOnline: { amount: r2(collected), count: collectedCount, knownShare: collected ? Math.round((known / collected) * 100) : 0, split: methodSplit },
    codToCollect: { amount: r2(cod.amt), orders: num(cod.n) },
    refunded: { amount: r2(ref.amt), count: num(ref.n), owed: num(due.n) },
    failed: {
      attempts: failed,
      pct: failed + collectedCount ? Math.round((failed / (failed + collectedCount)) * 1000) / 10 : 0,
      orders: num(fail.orders),
      retriedPaid: num(fail.retried_paid),
    },
    nightlyCheck: lastRun ? { at: lastRun.started_at, status: lastRun.status, summary: lastRun.summary, error: lastRun.error } : null,
    fixedThisWeek: num(fixed && fixed.n),
  };
}

// ── UPI / card backfill (Razorpay payment.method) ──────────────────────────
let backfilling = false;
const brandDown = new Map(); // brandId -> until (ms) after a Razorpay error
async function backfillMethods(brandId, since) {
  if (backfilling) return;
  backfilling = true;
  try {
    const rows = await q(
      `SELECT p.id, p.transaction_id, p.brand_id FROM payments p
        WHERE p.pay_method IS NULL AND p.payment_type <> 'cod' AND p.amount_paid > 0 AND p.transaction_id LIKE 'pay\\_%'
          AND (p.payment_gateway IS NULL OR p.payment_gateway <> 'CustomCheckout')
          AND p.status IN ${COLLECTED} AND p.created_at >= :since ${brandId ? 'AND p.brand_id = :brandId' : ''}
        ORDER BY p.id DESC LIMIT 20`, { since, brandId });
    const razorpay = require('./razorpayService.js');
    for (const r of rows) {
      const b = r.brand_id || 1;
      if ((brandDown.get(b) || 0) > Date.now()) continue;
      try {
        const pay = await razorpay.getPayment(r.transaction_id, b);
        if (pay && pay.method) await sequelize.query('UPDATE payments SET pay_method = ? WHERE id = ? AND pay_method IS NULL', { replacements: [String(pay.method).slice(0, 20), r.id] });
      } catch (e) {
        brandDown.set(b, Date.now() + 10 * 60000);
        logger.debug(`[payments] method backfill skipped for brand ${b}: ${e.message}`);
      }
    }
  } finally {
    backfilling = false;
  }
}

// ── "Doesn't match Razorpay" ───────────────────────────────────────────────
const CACHE_MS = 10 * 60000;
const cache = new Map(); // brandKey -> { at, data }
const inflight = new Map();

async function runCheck(brandId) {
  const { reconcileOrderPayment, reconcileOrphanPayment } = require('./paymentReconciliationService.js');
  const since = new Date(Date.now() - 72 * 3600000);
  const cands = await q(
    `SELECT p.order_id, MAX(p.id) AS pid FROM payments p
      WHERE p.status IN ('pending','failed') AND p.payment_type <> 'cod' AND p.amount_paid > 0 AND p.order_id IS NOT NULL
        AND (p.payment_gateway IS NULL OR p.payment_gateway <> 'CustomCheckout')
        AND p.created_at >= :since ${brandId ? 'AND p.brand_id = :brandId' : ''}
      GROUP BY p.order_id ORDER BY pid DESC LIMIT 40`, { since, brandId });

  const found = []; const errors = [];
  let i = 0;
  const worker = async () => {
    while (i < cands.length) {
      const c = cands[i++];
      try {
        const res = await reconcileOrderPayment(c.order_id, { dryRun: true });
        if (!res.success) errors.push(res.error);
        else if (res.wouldCorrect && res.to === 'successful') found.push({ orderId: c.order_id, res });
        if (res.remote && res.remote.method && res.remote.status === 'captured') {
          sequelize.query('UPDATE payments SET pay_method = ? WHERE id = ? AND pay_method IS NULL', { replacements: [String(res.remote.method).slice(0, 20), c.pid] }).catch(() => {});
        }
      } catch (e) { errors.push(e.message); }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  const ids = found.map((f) => f.orderId);
  const details = ids.length ? await q(
    `SELECT o.id, o.order_number, o.status, o.final_amount, b.name AS brand_name,
            COALESCE(NULLIF(u.username, ''), NULLIF(TRIM(CONCAT(COALESCE(g.first_name, ''), ' ', COALESCE(g.last_name, ''))), ''), sa.full_name) AS customer
       FROM orders o LEFT JOIN users u ON u.id = o.user_id LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id LEFT JOIN brands b ON b.id = o.brand_id
      WHERE o.id IN (:ids)`, { ids }) : [];
  const byId = new Map(details.map((d) => [d.id, d]));

  const items = found.map(({ orderId, res }) => {
    const o = byId.get(orderId) || {};
    const cancelled = ['cancelled', 'order cancelled'].includes(o.status);
    return {
      key: `o${orderId}`, orderId, orderNumber: o.order_number || res.order?.order_number || null,
      customer: o.customer || null, brand: o.brand_name || null,
      amount: res.remote?.amount ?? r2(o.final_amount),
      methodLabel: METHOD_LABEL[normMethod(res.remote?.method)] || 'Online',
      capturedAt: res.remote?.at || null,
      here: res.from,
      note: cancelled ? 'The order was auto-cancelled meanwhile — confirming puts it back if the items are still in stock.' : null,
    };
  });

  // Orders an earlier check (nightly or another admin) marked paid after they were auto-cancelled.
  const cancelledPaid = await q(
    `SELECT o.id, o.order_number, o.final_amount, b.name AS brand_name, MAX(a.created_at) AS fixed_at,
            COALESCE(NULLIF(u.username, ''), NULLIF(TRIM(CONCAT(COALESCE(g.first_name, ''), ' ', COALESCE(g.last_name, ''))), ''), sa.full_name) AS customer,
            (SELECT px.pay_method FROM payments px WHERE px.order_id = o.id AND px.amount_paid > 0 ORDER BY px.id DESC LIMIT 1) AS pay_method
       FROM order_audit_logs a JOIN orders o ON o.id = a.order_id
       LEFT JOIN users u ON u.id = o.user_id LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id LEFT JOIN brands b ON b.id = o.brand_id
      WHERE a.action = 'payment_reconciled' AND a.created_at >= :since2
        AND o.status IN ('cancelled','order cancelled') AND o.payment_status = 'paid' AND o.payment_type <> 'cod'
        AND NOT EXISTS (SELECT 1 FROM payments r WHERE r.order_id = o.id AND r.amount_paid < 0 AND r.status <> 'failed')
        ${brandId ? 'AND o.brand_id = :brandId' : ''}
      GROUP BY o.id ORDER BY fixed_at DESC LIMIT 20`, { since2: new Date(Date.now() - 14 * 86400000), brandId }).catch(() => []);
  for (const o of cancelledPaid) {
    if (items.some((x) => x.orderId === o.id)) continue;
    items.push({
      key: `o${o.id}`, orderId: o.id, orderNumber: o.order_number, customer: o.customer || null, brand: o.brand_name || null,
      amount: r2(o.final_amount), methodLabel: METHOD_LABEL[normMethod(o.pay_method)] || 'Online',
      capturedAt: null, fixedAt: o.fixed_at, here: 'cancelled',
      note: 'Payment was found later, but the order had been auto-cancelled — confirm it to ship, or refund the customer.',
    });
  }

  // Charged, but no order: payment-first checkouts captured after the session expired.
  const orphans = await q(
    `SELECT p.id, p.amount_paid, p.created_at, u.username AS customer, b.name AS brand_name
       FROM payments p LEFT JOIN users u ON u.id = p.user_id LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.order_id IS NULL AND p.reservation_id IS NOT NULL AND p.razorpay_order_id IS NOT NULL
        AND p.status IN ('pending','failed') AND p.amount_paid > 0
        AND p.created_at >= :since AND p.created_at <= :quiet ${brandId ? 'AND p.brand_id = :brandId' : ''}
      ORDER BY p.id DESC LIMIT 30`, { since, quiet: new Date(Date.now() - 20 * 60000), brandId });
  for (const o of orphans) {
    try {
      const res = await reconcileOrphanPayment(o.id, { dryRun: true });
      if (!res.success) { errors.push(res.error); continue; }
      if (!res.wouldCorrect) continue;
      items.push({
        key: `p${o.id}`, orderId: null, paymentId: o.id, orderNumber: null, customer: o.customer || null, brand: o.brand_name || null,
        amount: res.remote?.amount ?? r2(num(o.amount_paid) / 100),
        methodLabel: METHOD_LABEL[normMethod(res.remote?.method)] || 'Online',
        capturedAt: res.remote?.at || null, here: 'no_order', canCreate: !!res.canCreate,
        note: res.canCreate
          ? 'Charged, but no order was made — the checkout timed out before the payment came through.'
          : 'Charged, but no order was made and the checkout details weren’t saved — refund the customer.',
      });
    } catch (e) { errors.push(e.message); }
  }

  const uniqErrors = [...new Set(errors.filter(Boolean))];
  return {
    checkedAt: new Date().toISOString(),
    checked: cands.length + orphans.length,
    items,
    couldNotCheck: errors.length,
    errorHint: uniqErrors.length ? uniqErrors[0].replace(/^Razorpay lookup failed:\s*/, '').slice(0, 160) : null,
  };
}

async function mismatches({ brandId: rawBrand, refresh } = {}) {
  await ensureSchema();
  const brandId = brandOf(rawBrand);
  const key = brandId || 'all';
  const hit = cache.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && (age < CACHE_MS) && !(refresh && age > 30000)) return { ...hit.data, cached: true };
  if (inflight.has(key)) return inflight.get(key);
  const p = runCheck(brandId)
    .then((data) => { cache.set(key, { at: Date.now(), data }); return { ...data, cached: false }; })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

const dropFromCache = (pred) => { for (const v of cache.values()) v.data.items = v.data.items.filter((x) => !pred(x)); };

/**
 * Fix one "doesn't match Razorpay" item. Idempotent; returns a plain-English message.
 *   { orderId }                          — "Mark paid & confirm"
 *   { paymentId, action: 'create' }      — charged with no order: make the order
 *   { paymentId, action: 'refund' }      — charged with no order: give the money back
 */
async function fixMismatch({ orderId, paymentId, action } = {}, actor) {
  if (paymentId) return fixOrphan(parseInt(paymentId, 10), action, actor);
  return fixOrder(orderId, actor);
}

async function fixOrphan(id, action, actor) {
  const { reconcileOrphanPayment, refundOrphanPayment } = require('./paymentReconciliationService.js');
  if (!id) return { ok: false, status: 400, message: 'Which payment? The payment id is missing.' };
  if (!['create', 'refund'].includes(action)) return { ok: false, status: 400, message: 'Choose “Create the order” or “Refund”.' };
  const res = action === 'refund' ? await refundOrphanPayment(id, actor) : await reconcileOrphanPayment(id, { actor });
  dropFromCache((x) => x.paymentId === id);
  if (!res.success) return { ok: false, status: res.needsRefund ? 409 : 502, message: `Couldn’t ${action === 'refund' ? 'refund' : 'create the order'}: ${String(res.error || '').replace(/^Razorpay lookup failed:\s*/, '')}.` };
  if (res.skipped) return { ok: true, changed: false, message: `Nothing to do — ${res.reason}.` };
  if (res.refunded) return { ok: true, changed: true, message: `Refund of ${inr(res.amount)} sent to the customer’s original payment method.` };
  return { ok: true, changed: true, message: res.orderAction === 'created' ? `Order ${res.order.order_number} created and confirmed.` : `Order ${res.order.order_number} already existed — the payment is now linked.` };
}

async function fixOrder(orderId, actor) {
  const { reconcileOrderPayment } = require('./paymentReconciliationService.js');
  const id = parseInt(orderId, 10);
  if (!id) return { ok: false, status: 400, message: 'Which order? The order id is missing.' };
  const [o] = await q('SELECT order_number FROM orders WHERE id = :id', { id });
  if (!o) return { ok: false, status: 404, message: 'That order no longer exists.' };
  const n = o.order_number;
  const res = await reconcileOrderPayment(id, { actor, reopenCancelled: true });
  dropFromCache((x) => x.orderId === id);

  if (!res.success) return { ok: false, status: 502, message: `Couldn’t check ${n} with Razorpay: ${String(res.error || '').replace(/^Razorpay lookup failed:\s*/, '')}` };
  if (res.skipped) {
    if (res.reason === 'already in sync') return { ok: true, changed: false, message: `${n} is already marked paid — nothing to change.` };
    if (/non-terminal/.test(res.reason || '')) return { ok: false, status: 409, message: `Razorpay hasn’t captured the money for ${n} yet (status “${res.remote?.status}”) — nothing changed.` };
    return { ok: false, status: 409, message: `${n}: ${res.reason}.` };
  }
  if (res.to !== 'successful') return { ok: true, changed: true, message: `Razorpay says ${n} is “${res.remote?.status}”, so it was marked ${res.to}.` };
  if (res.outOfStock && res.outOfStock.length) {
    return { ok: true, changed: true, message: `${n} is marked paid but stays cancelled — out of stock: ${res.outOfStock.slice(0, 3).join(', ')}. Refund the customer from Orders → Problems.` };
  }
  if (res.orderAction === 'reopened') return { ok: true, changed: true, message: `${n} is marked paid and re-opened as confirmed.` };
  if (res.orderAction === 'confirmed') return { ok: true, changed: true, message: `${n} is marked paid and confirmed.` };
  return { ok: true, changed: true, message: `${n} is marked paid.` };
}

module.exports = { ensureSchema, listPayments, summary, mismatches, fixMismatch, failureReason };
