'use strict';

/**
 * "Problems to sort out" desk (Dashboard → Orders → Problems).
 *
 * One server-paged queue of everything that needs staff after a parcel left
 * the warehouse:
 *   • ndr     — failed deliveries (ndr_cases still open)
 *   • return  — customer returns before the parcel is back
 *   • refund  — money owed: returns received at the warehouse, and gateway
 *               refunds Razorpay refused (order refund_pending + failed row)
 *
 * Plus one detail call per item (timeline, addresses, refund maths, customer,
 * WhatsApp chat, available actions) and the brand's return-charge presets.
 *
 * Schema (created lazily, once per process — see ensureSchema):
 *   exception_events                 (desk / courier / customer actions log)
 *   ndr_cases.old_shipping_address_id, new_shipping_address_id, address_note
 */

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { phoneHash } = require('../utils/encryption.js');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const inr = (v) => `₹${Math.round(num(v)).toLocaleString('en-IN')}`;
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const isCod = (t) => String(t || '').toLowerCase() === 'cod';

// ── Schema ─────────────────────────────────────────────────────────────────
let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await require('./ndrService.js').ensureTable();
      await sequelize.query(`CREATE TABLE IF NOT EXISTS exception_events (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        kind VARCHAR(10) NOT NULL,
        ref_id INT NOT NULL,
        order_id INT NULL,
        text VARCHAR(500) NOT NULL,
        tone VARCHAR(10) NULL,
        actor_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_exc_ev_ref (kind, ref_id),
        KEY idx_exc_ev_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      const cols = await q(`SELECT LOWER(column_name) AS c FROM information_schema.columns
                             WHERE table_schema = DATABASE() AND table_name = 'ndr_cases'`);
      const have = new Set(cols.map((r) => r.c));
      for (const [c, def] of [['old_shipping_address_id', 'INT NULL'], ['new_shipping_address_id', 'INT NULL'], ['address_note', 'VARCHAR(255) NULL']]) {
        if (!have.has(c)) await sequelize.query(`ALTER TABLE ndr_cases ADD COLUMN ${c} ${def}`);
      }
      const idx = await q(`SELECT DISTINCT index_name AS i FROM information_schema.statistics
                            WHERE table_schema = DATABASE() AND table_name = 'ndr_cases'`);
      if (!idx.some((r) => r.i === 'idx_ndr_brand_status')) {
        await sequelize.query('ALTER TABLE ndr_cases ADD INDEX idx_ndr_brand_status (brand_id, status)');
      }
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

// Best-effort action log shown on the item's timeline.
async function logEvent(kind, refId, orderId, text, { tone = null, actorId = null } = {}) {
  try {
    await ensureSchema();
    await sequelize.query(
      'INSERT INTO exception_events (kind, ref_id, order_id, text, tone, actor_id) VALUES (?, ?, ?, ?, ?, ?)',
      { replacements: [kind, refId, orderId || null, String(text).slice(0, 500), tone, actorId || null] }
    );
  } catch (e) {
    logger.warn(`exception event skipped (${kind} ${refId}): ${e.message}`);
  }
}

// ── Return-charge presets (per brand, brand_settings key/value) ─────────────
const CHARGE_KEYS = {
  shipping: ['RETURN_CHARGE_SHIPPING', 79, 'Return shipping deducted from a return refund (₹)'],
  gatewayPercent: ['RETURN_CHARGE_GATEWAY_PERCENT', 2, 'Payment gateway fee deducted from a prepaid return refund (%)'],
  restock: ['RETURN_CHARGE_RESTOCK', 99, 'Restocking fee deducted from a return refund (₹)'],
};
async function getReturnCharges(brandId) {
  const settingsHelper = require('./settingsHelper.js');
  const out = {};
  for (const [k, [key, def]] of Object.entries(CHARGE_KEYS)) {
    const v = await settingsHelper.getSetting(brandId || 1, key, null, { brandOnly: true });
    const n = Number(v);
    out[k] = v !== null && v !== '' && Number.isFinite(n) && n >= 0 ? n : def;
  }
  return out;
}
async function setReturnCharges(brandId, values) {
  const { BrandSetting } = require('../model/brandSettingModel.js');
  const settingsHelper = require('./settingsHelper.js');
  for (const [k, [key, , description]] of Object.entries(CHARGE_KEYS)) {
    if (values[k] === undefined || values[k] === null || values[k] === '') continue;
    const n = Number(values[k]);
    if (!Number.isFinite(n) || n < 0 || (k === 'gatewayPercent' ? n > 50 : n > 100000)) {
      const e = new Error(`Enter a valid number for ${k === 'gatewayPercent' ? 'gateway fee %' : k}.`);
      e.status = 400;
      throw e;
    }
    const value = String(Math.round(n * 100) / 100);
    const row = await BrandSetting.findOne({ where: { brand_id: brandId, key } });
    if (row) await row.update({ value, is_encrypted: false });
    else await BrandSetting.create({ brand_id: brandId, key, value, category: 'general', description, is_encrypted: false });
  }
  settingsHelper.clearCache(brandId);
  return getReturnCharges(brandId);
}

// ── Queue ──────────────────────────────────────────────────────────────────

// Cancelled / returned prepaid orders whose money is still owed (same rule as
// the Orders desk's old "Refunds due" tab), plus refunds Razorpay refused.
const REFUND_DUE_ORDER_STATUSES = "'cancelled','order cancelled','returned_rto','rto delivered'";

// Every branch yields the same columns. needs_you = staff must act now
// (1) vs. waiting on the customer / courier (0).
const UNION_SQL = `
  SELECT 'ndr' AS kind, 'ndr' AS src, c.id AS ref_id, c.order_id, COALESCE(c.brand_id, o.brand_id) AS brand_id,
         c.status, c.created_at AS opened_at, c.updated_at AS since_at,
         CASE WHEN c.status IN ('address_updated','cancel_requested','needs_action') THEN 1
              WHEN c.status = 'reattempt_requested' AND c.sent_to_courier_at IS NULL THEN 1
              WHEN c.status = 'awaiting_customer' AND c.updated_at < NOW() - INTERVAL 24 HOUR THEN 1
              ELSE 0 END AS needs_you,
         o.order_number, CAST(NULL AS CHAR(40)) AS return_number, COALESCE(c.awb, o.shipping_waybill) AS awb, o.shipping_waybill AS order_awb,
         c.attempts, c.reason, c.customer_action, c.sent_to_courier_at AS sent_at, c.reattempt_date,
         c.courier_response, CAST(NULL AS DECIMAL(12,2)) AS amount, CAST(NULL AS SIGNED) AS is_cod, CAST(NULL AS CHAR(40)) AS pickup_status
    FROM ndr_cases c JOIN orders o ON o.id = c.order_id
   WHERE c.status <> 'closed'
  UNION ALL
  SELECT IF(r.status = 'received', 'refund', 'return'), 'return', r.id, r.order_id, COALESCE(r.brand_id, o.brand_id),
         r.status, r.created_at, r.updated_at,
         CASE WHEN r.status IN ('requested','under_review','received') THEN 1
              WHEN r.status = 'approved' AND r.pickup_awb IS NULL THEN 1
              WHEN r.status = 'picked_up' AND r.pickup_status = 'delivered_to_warehouse' THEN 1
              WHEN r.status = 'pickup_scheduled' AND r.updated_at < NOW() - INTERVAL 4 DAY THEN 1
              ELSE 0 END,
         o.order_number, r.return_number, r.pickup_awb, o.shipping_waybill,
         NULL, r.reason, NULL, NULL, NULL,
         NULL, COALESCE(r.refund_amount, r.requested_amount), r.is_cod, r.pickup_status
    FROM returns r JOIN orders o ON o.id = r.order_id
   WHERE r.status IN ('requested','under_review','approved','pickup_scheduled','picked_up','received')
  UNION ALL
  SELECT 'refund', 'order', o.id, o.id, o.brand_id,
         IF(pf.order_id IS NULL, 'refund_due', 'refund_failed'),
         COALESCE(pf.failed_at, (SELECT MAX(h.created_at) FROM order_status_history h
                                  WHERE h.order_id = o.id AND LOWER(h.status) IN (${REFUND_DUE_ORDER_STATUSES})), o.updated_at),
         o.updated_at, 1,
         o.order_number, NULL, o.shipping_waybill, o.shipping_waybill,
         NULL, NULL, NULL, NULL, NULL,
         NULL, COALESCE(-pf.amt / 100, o.final_amount), 0, NULL
    FROM orders o
    LEFT JOIN (SELECT order_id, MAX(created_at) AS failed_at, MIN(amount_paid) AS amt
                 FROM payments WHERE amount_paid < 0 AND status = 'failed' GROUP BY order_id) pf ON pf.order_id = o.id
   WHERE ((LOWER(o.status) IN (${REFUND_DUE_ORDER_STATUSES}) AND LOWER(o.payment_status) IN ('paid','refund_pending')
           AND LOWER(o.payment_type) <> 'cod')
          OR (LOWER(o.payment_status) = 'refund_pending' AND pf.order_id IS NOT NULL))
     AND NOT EXISTS (SELECT 1 FROM returns r2 WHERE r2.order_id = o.id AND r2.status NOT IN ('refunded','rejected'))`;

// Order ids whose customer has this phone (encrypted columns → phone_hash;
// plain fallback when no encryption key is configured).
async function orderIdsForPhone(p10) {
  const h = phoneHash(p10);
  const rows = await q(
    `SELECT o.id FROM orders o
       LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN users u ON u.id = o.user_id
      WHERE ${h ? 'sa.phone_hash = :h OR g.phone_hash = :h OR' : `REGEXP_REPLACE(sa.phone, '[^0-9]', '') LIKE :like OR REGEXP_REPLACE(g.phone, '[^0-9]', '') LIKE :like OR`}
            RIGHT(REGEXP_REPLACE(u.phone, '[^0-9]', ''), 10) = :p10
      LIMIT 500`,
    { h, p10, like: `%${p10}` }
  );
  const ret = await q(`SELECT order_id AS id FROM returns WHERE RIGHT(payout_phone, 10) = :p10 LIMIT 100`, { p10 }).catch(() => []);
  return [...new Set([...rows, ...ret].map((r) => r.id))];
}

async function buildFilters({ brandId, search }) {
  const where = [];
  const repl = {};
  if (brandId) { where.push('x.brand_id = :brandId'); repl.brandId = brandId; }
  const s = String(search || '').trim().replace(/^#/, '');
  if (s) {
    const parts = ['x.order_number LIKE :like', 'x.return_number LIKE :like', 'x.awb LIKE :like', 'x.order_awb LIKE :like'];
    repl.like = `%${s}%`;
    const digits = s.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 13 && /^[+\d\s-]+$/.test(s)) {
      const ids = await orderIdsForPhone(digits.slice(-10));
      if (ids.length) { parts.push('x.order_id IN (:phoneIds)'); repl.phoneIds = ids; }
    }
    where.push(`(${parts.join(' OR ')})`);
  }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', repl };
}

const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

function ndrStep(r) {
  switch (r.status) {
    case 'awaiting_customer':
      return r.customer_action === 'new_address' ? 'Customer is typing a new address' : 'Waiting for the customer’s reply';
    case 'reattempt_requested':
      return r.sent_at
        ? `Reattempt requested${r.reattempt_date ? ` for ${day(r.reattempt_date)}` : ''} — waiting for the courier`
        : 'Customer chose: deliver again';
    case 'address_updated': return 'Customer chose: new address';
    case 'cancel_requested': return 'Customer chose: cancel — send it back (RTO)';
    case 'needs_action':
      return String(r.courier_response || '').startsWith(require('./ndrService.js').REATTEMPT_FAILED)
        ? 'The reattempt failed too — decide what to do'
        : 'Courier didn’t accept the request — needs you';
    case 'rto_requested': return 'Return to us (RTO) requested — waiting for the courier';
    default: return 'Closed';
  }
}

function returnStep(r) {
  switch (r.status) {
    case 'requested': case 'under_review': return 'Waiting for your approval';
    case 'approved': return r.awb ? `Pickup booked · AWB ${r.awb}` : 'Approved — pickup not booked yet';
    case 'pickup_scheduled': {
      const st = String(r.pickup_status || '').toLowerCase();
      return `Pickup booked${r.awb ? ` · AWB ${r.awb}` : ''}${st && st !== 'scheduled' ? ` · courier: ${r.pickup_status}` : ''}`;
    }
    case 'picked_up':
      return r.pickup_status === 'delivered_to_warehouse' ? 'Courier says it’s back — check it & mark received' : 'Picked up — on its way back to us';
    case 'received': return `Parcel received — refund ${inr(r.amount)} due`;
    case 'refunded': return 'Refunded';
    case 'rejected': return 'Rejected';
    default: return String(r.status || '').replace(/_/g, ' ');
  }
}

function stepOf(r) {
  if (r.src === 'ndr') return ndrStep(r);
  if (r.src === 'order') {
    return r.status === 'refund_failed'
      ? `Razorpay refused the refund — ${inr(r.amount)} still owed`
      : `Order ${String(r.order_status || '').toLowerCase().includes('cancel') ? 'cancelled' : 'returned'} — refund ${inr(r.amount)} not sent yet`;
  }
  return returnStep(r);
}

function urgencyOf(r, ageHours) {
  if (!Number(r.needs_you)) return 'waiting';
  return ageHours >= 48 ? 'high' : 'normal';
}

const TYPES = { all: null, ndr: 'ndr', return: 'return', refund: 'refund' };

async function listQueue({ type = 'all', brandId = null, search = '', page = 1, limit = 25 } = {}) {
  await ensureSchema();
  const kind = Object.prototype.hasOwnProperty.call(TYPES, type) ? TYPES[type] : null;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const { where, repl } = await buildFilters({ brandId, search });

  const countRows = await q(
    `SELECT x.kind, COUNT(*) AS n, SUM(x.needs_you) AS needs FROM (${UNION_SQL}) x ${where} GROUP BY x.kind`, repl);
  const counts = { all: 0, ndr: 0, return: 0, refund: 0 };
  const needsYou = { all: 0, ndr: 0, return: 0, refund: 0 };
  for (const c of countRows) {
    counts[c.kind] = num(c.n); counts.all += num(c.n);
    needsYou[c.kind] = num(c.needs); needsYou.all += num(c.needs);
  }
  const total = kind ? counts[kind] : counts.all;

  const kindSql = kind ? `${where ? `${where} AND` : 'WHERE'} x.kind = :kind` : where;
  const rows = await q(
    `SELECT x.*, o.payment_type, o.final_amount, o.courier_name, o.shipping_address_id, o.guest_user_id, o.user_id, o.status AS order_status
       FROM (${UNION_SQL}) x JOIN orders o ON o.id = x.order_id
       ${kindSql}
      ORDER BY x.needs_you DESC, x.opened_at ASC, x.ref_id ASC
      LIMIT :lim OFFSET :off`,
    { ...repl, kind, lim, off: (pg - 1) * lim }
  );

  // Names / cities through the models (address phone is encrypted at rest).
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { GuestUser } = require('../model/guestUserModel.js');
  const addrIds = [...new Set(rows.map((r) => r.shipping_address_id).filter(Boolean))];
  const addrs = addrIds.length ? await ShippingAddress.findAll({ where: { id: addrIds }, attributes: ['id', 'full_name', 'city'] }) : [];
  const addrById = new Map(addrs.map((a) => [a.id, a]));
  const guestIds = [...new Set(rows.filter((r) => !addrById.has(r.shipping_address_id) && r.guest_user_id).map((r) => r.guest_user_id))];
  const guests = guestIds.length ? await GuestUser.findAll({ where: { id: guestIds }, attributes: ['id', 'firstName', 'lastName'] }) : [];
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const userIds = [...new Set(rows.filter((r) => !addrById.has(r.shipping_address_id) && !r.guest_user_id && r.user_id).map((r) => r.user_id))];
  const users = userIds.length ? await q('SELECT id, username FROM users WHERE id IN (:ids)', { ids: userIds }) : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const now = Date.now();
  const items = rows.map((r) => {
    const a = addrById.get(r.shipping_address_id);
    const g = guestById.get(r.guest_user_id);
    const name = a?.full_name || (g ? [g.firstName, g.lastName].filter(Boolean).join(' ') : null) || userById.get(r.user_id)?.username || 'Customer';
    const cod = r.src === 'return' ? !!Number(r.is_cod) : isCod(r.payment_type);
    const amount = r.src === 'ndr' ? num(r.final_amount) : num(r.amount);
    const ageHours = Math.max(0, Math.floor((now - new Date(r.opened_at).getTime()) / 3600000));
    return {
      id: `${r.src}-${r.ref_id}`,
      kind: r.kind,
      src: r.src,
      refId: r.ref_id,
      orderId: r.order_id,
      orderNumber: r.order_number,
      returnNumber: r.return_number || null,
      title: r.src === 'ndr' ? `${r.order_number} · ${r.courier_name || 'Courier'}`
        : r.src === 'order' ? `${r.order_number} · ${r.status === 'refund_failed' ? 'refund failed' : 'refund due'}`
        : `${r.return_number} · ${r.order_number}`,
      customer: { name, city: a?.city || null },
      payment: { cod, amount, label: `${cod ? 'COD' : 'Prepaid'} ${inr(amount)}` },
      step: stepOf(r),
      status: r.status,
      openedAt: r.opened_at,
      ageHours,
      needsYou: !!Number(r.needs_you),
      urgency: urgencyOf(r, ageHours),
      attempts: r.attempts != null ? num(r.attempts) : null,
    };
  });

  return { items, counts, needsYou, page: pg, limit: lim, total, totalPages: Math.max(1, Math.ceil(total / lim)) };
}

// ── Detail ─────────────────────────────────────────────────────────────────
const STATUS_TEXT = {
  pending: 'Order placed', awaiting_confirmation: 'Order placed — waiting for COD confirmation', confirmed: 'Order confirmed',
  processing: 'Being packed', manifested: 'Booked with the courier', booked: 'Booked with the courier',
  'pickup initiated': 'Courier pickup started', shipped: 'Shipped', 'in transit': 'In transit',
  'out for delivery': 'Out for delivery', undelivered: 'Delivery attempt failed', delivered: 'Delivered',
  rto: 'Coming back to us (RTO)', 'rto delivered': 'RTO parcel back at the warehouse', return_initiated: 'Return started',
  returned_rto: 'Return completed', cancelled: 'Cancelled', 'order cancelled': 'Cancelled', exception: 'Courier reported a problem',
};
const STATUS_TONE = { undelivered: 'bad', rto: 'bad', 'rto delivered': 'warn', cancelled: 'bad', 'order cancelled': 'bad', delivered: 'good', exception: 'bad' };
const REASONS = {
  damaged: 'Damaged / leaking', defective: 'Defective', wrong: 'Wrong product',
  notdesc: 'Not as described', changed: 'Changed mind', other: 'Other',
};

function historyItem(h) {
  const st = String(h.status || '').toLowerCase();
  const notes = String(h.notes || '');
  // Staff / system notes that describe something specific (refunds, address
  // changes) read better than the bare status.
  if (/refund|return .* (requested|rejected|completed)/i.test(notes) && !/^Shipping webhook/i.test(notes)) {
    return { at: h.created_at, text: notes.replace(/\s+/g, ' ').slice(0, 220), tone: /fail/i.test(notes) ? 'bad' : 'muted' };
  }
  const moved = notes.match(/^Delivery address changed \(([^)]+)\)/);
  if (moved) return { at: h.created_at, text: `New delivery address saved — ${moved[1]}`, tone: 'good' };
  let text = STATUS_TEXT[st] || (st ? st[0].toUpperCase() + st.slice(1).replace(/_/g, ' ') : 'Update');
  if (st === 'undelivered' || st === 'exception' || st === 'rto') {
    const m = notes.match(/(?:RTO Reason|Remark):\s*(.+?)(?:\s+-\s+[A-Z][\w ]+:|$)/);
    if (m && m[1].trim()) text += ` — “${m[1].trim().slice(0, 120)}”`;
  }
  return { at: h.created_at, text, tone: STATUS_TONE[st] || 'muted' };
}

function parseMsgBody(body, type) {
  let text = body || '';
  if (/^\s*\{/.test(text)) {
    try { const j = JSON.parse(text); text = j.text || j.caption || j.body || j.title || ''; } catch { /* keep raw */ }
  }
  if (!text) text = `[${type || 'message'}]`;
  return String(text).replace(/\s+/g, ' ').slice(0, 200);
}

const fmtAddress = (a) => (a ? [a.address, a.landmark, [a.city, a.state].filter(Boolean).join(', '), a.pincode].filter(Boolean).join('\n') : '');
const maskPhone = (p) => { const d = last10(p); return d.length === 10 ? `${d.slice(0, 2)}•• ••${d.slice(6)}` : ''; };

async function loadOrderContext(orderId) {
  const { Order } = require('../model/orderModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { GuestUser } = require('../model/guestUserModel.js');
  const order = await Order.findByPk(orderId);
  if (!order) return null;
  const addr = order.shipping_address_id ? await ShippingAddress.findByPk(order.shipping_address_id) : null;
  const guest = order.guest_user_id ? await GuestUser.findByPk(order.guest_user_id).catch(() => null) : null;
  const [user] = order.user_id ? await q('SELECT id, username, phone FROM users WHERE id = :id', { id: order.user_id }) : [];
  const phone = addr?.phone || guest?.phone || user?.phone || null;
  const name = addr?.full_name || (guest ? [guest.firstName, guest.lastName].filter(Boolean).join(' ') : null) || user?.username || 'Customer';
  return { order, addr, guest, user, phone, name };
}

async function customerSummary(ctx, excludeReturnId) {
  const { order, phone, name, addr } = ctx;
  let idWhere; const r = {};
  if (order.user_id) { idWhere = 'o.user_id = :uid'; r.uid = order.user_id; }
  else if (order.guest_user_id) { idWhere = 'o.guest_user_id = :gid'; r.gid = order.guest_user_id; }
  else if (phoneHash(phone)) {
    idWhere = '(o.id = :oid OR o.shipping_address_id IN (SELECT id FROM shipping_addresses WHERE phone_hash = :ph))';
    r.oid = order.id; r.ph = phoneHash(phone);
  } else { idWhere = 'o.id = :oid'; r.oid = order.id; }
  const [s] = await q(
    `SELECT COUNT(*) AS orders,
            SUM(LOWER(o.status) IN ('rto','rto delivered') OR (LOWER(o.status) = 'returned_rto' AND NOT EXISTS (SELECT 1 FROM returns rr WHERE rr.order_id = o.id))) AS rto,
            SUM(LOWER(o.status) = 'delivered') AS delivered
       FROM orders o WHERE ${idWhere}`, r);
  const [rt] = await q(
    `SELECT COUNT(*) AS n FROM returns rt JOIN orders o ON o.id = rt.order_id WHERE ${idWhere} AND rt.id <> :ex`,
    { ...r, ex: excludeReturnId || 0 });
  const p10 = last10(phone);
  return {
    name,
    phone: p10.length === 10 ? p10 : null,
    phoneMasked: maskPhone(phone),
    city: addr?.city || null,
    orders: num(s?.orders),
    delivered: num(s?.delivered),
    rto: num(s?.rto),
    returnsBefore: num(rt?.n),
    profile: order.user_id ? { kind: 'user', id: order.user_id }
      : order.guest_user_id ? { kind: 'guest', id: order.guest_user_id }
      : (p10.length === 10 ? { kind: 'phone', phone: p10 } : null),
  };
}

async function findConversation(phone, brandId) {
  const p10 = last10(phone);
  if (p10.length !== 10) return null;
  const h = phoneHash(p10);
  const [c] = await q(
    `SELECT id, brand_id FROM whatsapp_conversations
      WHERE ${h ? 'phone_hash = :h OR ' : ''}customer_phone IN (:p10, :p91)
      ORDER BY (brand_id <=> :b) DESC, last_message_at DESC LIMIT 1`,
    { h, p10, p91: `91${p10}`, b: brandId || null }
  ).catch(() => []);
  return c ? c.id : null;
}

async function waTimeline(conversationId, since) {
  if (!conversationId) return [];
  const rows = await q(
    `SELECT direction, type, body, template_name, COALESCE(sent_at, createdAt) AS at
       FROM whatsapp_messages
      WHERE conversation_id = :c AND COALESCE(sent_at, createdAt) >= :since
        AND (direction = 'inbound' OR template_name IS NOT NULL)
      ORDER BY id DESC LIMIT 8`,
    { c: conversationId, since }
  ).catch(() => []);
  return rows.reverse().map((m) => (m.direction === 'inbound'
    ? { at: m.at, text: `Customer on WhatsApp: “${parseMsgBody(m.body, m.type)}”`, tone: 'good', source: 'whatsapp' }
    : { at: m.at, text: `WhatsApp sent: ${String(m.template_name).replace(/[_-]+/g, ' ')}`, tone: 'muted', source: 'whatsapp' }));
}

async function eventsFor(kind, refId) {
  const rows = await q(
    `SELECT e.text, e.tone, e.created_at AS at, u.username AS actor
       FROM exception_events e LEFT JOIN users u ON u.id = e.actor_id
      WHERE e.kind = :kind AND e.ref_id = :id ORDER BY e.id ASC LIMIT 100`,
    { kind, id: refId }
  );
  return rows.map((e) => ({ at: e.at, text: e.actor ? `${e.text} — by ${e.actor}` : e.text, tone: e.tone || 'muted' }));
}

async function historyFor(orderId, since) {
  const rows = await q(
    `SELECT status, notes, created_at FROM order_status_history
      WHERE order_id = :id ${since ? 'AND created_at >= :since' : ''} ORDER BY created_at ASC, id ASC LIMIT 200`,
    { id: orderId, since }
  );
  const out = [];
  for (const h of rows) {
    const it = historyItem(h);
    if (out.length && out[out.length - 1].text === it.text) continue; // duplicate scans
    out.push(it);
  }
  return out;
}

const byTime = (a, b) => new Date(a.at) - new Date(b.at);

function orderSummary(order) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentType: order.payment_type,
    paymentStatus: order.payment_status,
    cod: isCod(order.payment_type),
    amount: num(order.final_amount),
    courier: order.courier_name || null,
    awb: order.shipping_waybill || order.tracking_number || null,
    brandId: order.brand_id || null,
    createdAt: order.created_at || order.createdAt,
  };
}

async function ndrDetail(id) {
  const ndrService = require('./ndrService.js');
  const c = await ndrService.getCase(id);
  if (!c) return null;
  const ctx = await loadOrderContext(c.order_id);
  if (!ctx) return null;
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const oldAddr = c.old_shipping_address_id ? await ShippingAddress.findByPk(c.old_shipping_address_id) : null;
  const newAddr = c.new_shipping_address_id ? await ShippingAddress.findByPk(c.new_shipping_address_id) : null;
  const conversationId = await findConversation(ctx.phone, ctx.order.brand_id);
  const shippedSince = new Date(new Date(c.created_at).getTime() - 10 * 86400000);
  const [hist, events, wa, customer] = await Promise.all([
    historyFor(c.order_id, shippedSince),
    eventsFor('ndr', c.id),
    waTimeline(conversationId, new Date(new Date(c.created_at).getTime() - 3600000)),
    customerSummary(ctx),
  ]);
  const timeline = [...hist, ...events, ...wa].sort(byTime);
  if (c.status === 'closed' && c.resolved_at && !events.some((e) => /^Marked done/.test(e.text))) {
    timeline.push({ at: c.resolved_at, text: `Closed — ${c.resolved_note || 'done'}`, tone: 'good' });
  }

  const row = { ...c, src: 'ndr', sent_at: c.sent_to_courier_at };
  const waitingCourier = (c.status === 'reattempt_requested' && c.sent_to_courier_at) || c.status === 'rto_requested';
  const addresses = {
    onOrder: fmtAddress(oldAddr || (newAddr ? null : ctx.addr)) || null,
    fromCustomer: newAddr ? fmtAddress(newAddr) : (c.new_address || null),
    applied: !!newAddr,
    note: c.address_note || (c.new_address && !newAddr ? 'Not saved on the order yet — save it before reattempting.' : null),
  };
  if (!addresses.onOrder && ctx.addr) addresses.onOrder = fmtAddress(ctx.addr);

  let actions = [];
  let ask = '';
  let help = '';
  if (c.status === 'closed') {
    ask = 'This case is closed.';
    help = c.resolved_note || '';
  } else if (waitingCourier) {
    actions = c.status === 'rto_requested' ? ['mark_done'] : ['rto', 'mark_done'];
    ask = c.status === 'rto_requested' ? 'Waiting for the courier to send it back' : 'Waiting for the courier’s next attempt';
    help = 'This stays here until the courier’s next update — delivered closes it, another failed attempt brings it back to you.';
  } else if (c.status === 'address_updated') {
    actions = ['new_address', 'reattempt', 'rto', 'mark_done'];
    ask = 'Send the new address to the courier?';
    help = 'After you send it, this stays here until the courier tries again — so you’ll see if the next attempt fails too. iThink’s API can’t change the address: also paste it in the iThink panel (NDR → edit address).';
  } else if (c.status === 'cancel_requested') {
    actions = ['rto', 'reattempt', 'new_address', 'mark_done'];
    ask = 'The customer doesn’t want it — send it back to us?';
    help = 'RTO returns the parcel to the warehouse. It can’t be undone.';
  } else if (c.status === 'awaiting_customer') {
    actions = ['reattempt', 'new_address', 'rto', 'mark_done'];
    ask = c.customer_action === 'new_address' ? 'The customer is sending a new address — or act now:' : 'No answer yet — what should we do?';
    help = 'If nobody acts in about 48 hours, the courier usually returns the parcel.';
  } else {
    actions = ['reattempt', 'new_address', 'rto', 'mark_done'];
    ask = c.status === 'needs_action' ? 'The courier needs an instruction' : 'Ask the courier to deliver again?';
    help = c.courier_response && c.status === 'needs_action' && !String(c.courier_response).startsWith(ndrService.REATTEMPT_FAILED)
      ? 'iThink didn’t accept the last request automatically. Do it in the iThink panel (NDR section), then press Mark done.'
      : 'After you send it, this stays here until the courier tries again.';
  }

  return {
    id: `ndr-${c.id}`,
    kind: 'ndr',
    src: 'ndr',
    refId: c.id,
    status: c.status,
    title: `${ctx.order.order_number} · ${ctx.order.courier_name || 'Courier'}`,
    sub: `${c.attempts > 1 ? `${c.attempts} failed attempts` : 'One failed attempt'}${c.reason ? ` — last: “${c.reason}”` : ''}.`,
    step: ndrStep(row),
    openedAt: c.created_at,
    order: orderSummary(ctx.order),
    customer,
    conversationId,
    timeline,
    addresses,
    ndr: {
      attempts: c.attempts, reason: c.reason, customerAction: c.customer_action, reattemptDate: c.reattempt_date,
      sentToCourierAt: c.sent_to_courier_at, courierResponse: c.courier_response, awb: c.awb || ctx.order.shipping_waybill,
      waitingCourier: !!waitingCourier,
    },
    actions, ask, help,
  };
}

async function refundInfo(ret, order) {
  const { Payment } = require('../model/paymentModel.js');
  const { Op } = require('sequelize');
  const payment = await Payment.findOne({
    where: { order_id: order.id, status: { [Op.in]: ['successful', 'completed', 'refund_pending', 'partial_refund', 'refunded'] }, amount_paid: { [Op.gt]: 0 } },
    order: [['createdAt', 'DESC']],
  });
  const gateway = !!payment && (String(payment.transaction_id || '').startsWith('pay_')
    || String(payment.payment_gateway || '').toLowerCase() === 'customcheckout');
  const eligible = num(ret ? ret.requested_amount : 0) || num(order.final_amount);
  const charges = await getReturnCharges(order.brand_id || (ret && ret.brand_id) || 1);
  return {
    gateway,
    paidVia: gateway ? (String(payment.payment_gateway || '').toLowerCase() === 'customcheckout' ? 'Paid online (checkout partner)' : 'Paid online (Razorpay)')
      : 'Cash on delivery — refund by UPI',
    eligible,
    charges: {
      shipping: charges.shipping,
      gatewayPercent: charges.gatewayPercent,
      gatewayAmount: gateway ? Math.round(eligible * charges.gatewayPercent / 100) : 0,
      restock: charges.restock,
    },
    refundAmount: ret && ret.refund_amount != null ? num(ret.refund_amount) : eligible,
    chargesDeducted: ret && ret.charges_deducted != null ? num(ret.charges_deducted) : 0,
  };
}

async function returnDetail(id) {
  const { Return } = require('../model/returnModel.js');
  const ret = await Return.findByPk(id);
  if (!ret) return null;
  const openedAt = ret.createdAt;
  let photoPaths = ret.photos;
  if (typeof photoPaths === 'string') { try { photoPaths = JSON.parse(photoPaths); } catch { photoPaths = []; } }
  if (!Array.isArray(photoPaths)) photoPaths = [];
  const ctx = await loadOrderContext(ret.order_id);
  if (!ctx) return null;
  const imagekit = require('./imagekitService.js');
  const url = (p, size) => { try { return imagekit.getOptimizedUrl(p, size); } catch { return p; } };
  const conversationId = await findConversation(ctx.phone, ctx.order.brand_id);
  const deliveredFrom = new Date(new Date(openedAt).getTime() - 20 * 86400000);
  const [hist, events, wa, customer, refund, reviewer] = await Promise.all([
    historyFor(ret.order_id, deliveredFrom),
    eventsFor('return', ret.id),
    waTimeline(conversationId, new Date(new Date(openedAt).getTime() - 3600000)),
    customerSummary(ctx, ret.id),
    refundInfo(ret, ctx.order),
    ret.reviewed_by ? q('SELECT username FROM users WHERE id = :id', { id: ret.reviewed_by }).then((r) => r[0]?.username || null) : null,
  ]);
  const derived = [{ at: openedAt, text: `Return requested — “${REASONS[ret.reason] || ret.reason}”${ret.note ? ` · ${String(ret.note).slice(0, 120)}` : ''}`, tone: 'warn' }];
  if (ret.reviewed_at) {
    derived.push({
      at: ret.reviewed_at,
      text: ret.status === 'rejected'
        ? `Rejected${ret.admin_note ? ` — “${ret.admin_note}”` : ''}${reviewer ? ` — by ${reviewer}` : ''}`
        : `Approved${reviewer ? ` — by ${reviewer}` : ''}`,
      tone: ret.status === 'rejected' ? 'bad' : 'good',
    });
  }
  if (ret.refunded_at) derived.push({ at: ret.refunded_at, text: `Refunded ${inr(ret.refund_amount)}`, tone: 'good' });
  // Return lifecycle notes in the order history duplicate the derived items.
  const histKeep = hist.filter((h) => !/^Return (started|completed)$/.test(h.text) && !/^Return .* (requested|rejected)/i.test(h.text));
  const timeline = [...histKeep, ...derived, ...events, ...wa].sort(byTime);

  let actions = [];
  let ask = '';
  let help = '';
  const s = ret.status;
  if (s === 'requested' || s === 'under_review') {
    actions = ['approve', 'reject'];
    ask = 'Approve the return and book a pickup?';
    help = 'Approving books the reverse pickup with the courier (when auto pickup is on). You set the refund amount after the parcel is back and checked.';
  } else if (s === 'approved' || s === 'pickup_scheduled') {
    actions = ['picked_up', 'receive', 'reject'];
    ask = ret.pickup_awb ? 'Waiting for the courier to collect it' : 'Arrange the pickup';
    help = ret.pickup_awb ? `Pickup AWB ${ret.pickup_awb}. The courier’s updates move it along automatically.` : 'The pickup wasn’t booked automatically — book it in the courier panel, then mark it picked up.';
  } else if (s === 'picked_up') {
    actions = ['receive'];
    ask = 'Parcel on its way back — mark it received when it arrives';
    help = 'Check the item first. Untick “back in stock” if it can’t be sold again.';
  } else if (s === 'received') {
    actions = ['refund'];
    ask = refund.gateway ? `Refund ${inr(refund.refundAmount)} to the original payment?` : `Pay ${inr(refund.refundAmount)} to the customer’s UPI?`;
    help = refund.gateway
      ? 'Deductions come from the brand’s return charges. The customer gets a WhatsApp when the refund goes through.'
      : 'Send the money by UPI first, upload the payment screenshot, then confirm here.';
  } else {
    ask = s === 'refunded' ? 'Refunded — nothing left to do.' : 'Rejected — nothing left to do.';
  }

  return {
    id: `return-${ret.id}`,
    kind: s === 'received' ? 'refund' : 'return',
    src: 'return',
    refId: ret.id,
    status: s,
    title: `${ret.return_number} · ${ctx.order.order_number}`,
    sub: `${REASONS[ret.reason] || ret.reason}${photoPaths.length ? ` · ${photoPaths.length} photo${photoPaths.length === 1 ? '' : 's'}` : ''}${reviewer ? ` · reviewed by ${reviewer}` : ''}`,
    step: returnStep({ status: s, awb: ret.pickup_awb, pickup_status: ret.pickup_status, amount: refund.refundAmount }),
    openedAt,
    order: orderSummary(ctx.order),
    customer,
    conversationId,
    timeline,
    return: {
      returnNumber: ret.return_number,
      reason: REASONS[ret.reason] || ret.reason,
      note: ret.note || null,
      photos: photoPaths.map((p) => url(p, 'medium')),
      isCod: !!ret.is_cod,
      upiId: ret.upi_id || null,
      payoutPhone: ret.payout_phone || null,
      payoutProof: ret.payout_proof ? url(ret.payout_proof, 'large') : null,
      pickupAwb: ret.pickup_awb || null,
      pickupStatus: ret.pickup_status || null,
      adminNote: ret.admin_note || null,
      reviewedBy: reviewer,
      reviewedAt: ret.reviewed_at || null,
      refundedAt: ret.refunded_at || null,
    },
    refund,
    actions, ask, help,
  };
}

async function orderRefundDetail(orderId) {
  const ctx = await loadOrderContext(orderId);
  if (!ctx) return null;
  const { order } = ctx;
  const failed = await q(
    `SELECT -amount_paid / 100 AS amount, notes, created_at FROM payments
      WHERE order_id = :id AND amount_paid < 0 AND status = 'failed' ORDER BY id ASC`, { id: order.id });
  const st = String(order.status || '').toLowerCase();
  const pay = String(order.payment_status || '').toLowerCase();
  const [openReturn] = await q(`SELECT id FROM returns WHERE order_id = :id AND status NOT IN ('refunded','rejected') LIMIT 1`, { id: order.id });
  // An open return is refunded from the return itself (after the parcel is back).
  const due = !openReturn && ((['cancelled', 'order cancelled', 'returned_rto', 'rto delivered'].includes(st) && ['paid', 'refund_pending'].includes(pay) && !isCod(order.payment_type))
    || (pay === 'refund_pending' && failed.length > 0));
  if (!due && !failed.length) return null;
  const conversationId = await findConversation(ctx.phone, order.brand_id);
  const since = new Date(new Date(failed.length ? failed[0].created_at : (order.updated_at || order.updatedAt || Date.now())).getTime() - 15 * 86400000);
  const [hist, wa, customer, refund] = await Promise.all([
    historyFor(order.id, since),
    waTimeline(conversationId, since),
    customerSummary(ctx),
    refundInfo(null, order),
  ]);
  const fails = failed.map((f) => ({ at: f.created_at, text: `Razorpay refused a refund of ${inr(f.amount)}${f.notes ? ` — ${String(f.notes).slice(0, 120)}` : ''}`, tone: 'bad' }));
  const owed = failed.length ? num(failed[failed.length - 1].amount) : num(order.final_amount);
  const wasFailed = failed.length > 0;
  let actions = [];
  let ask = 'Nothing left to do.';
  let help = '';
  if (due && refund.gateway) {
    actions = ['retry_refund'];
    ask = wasFailed ? `Retry the ${inr(owed)} refund via Razorpay?` : `Refund ${inr(owed)} to the original payment?`;
    help = wasFailed ? 'If Razorpay refuses again, pay the customer by UPI and note it on the order.' : 'Refunds the full amount through Razorpay. The customer gets a WhatsApp when it goes through.';
  } else if (due) {
    ask = `${inr(owed)} is owed but there’s no online payment to refund`;
    help = 'Pay the customer by UPI or bank transfer, then note it on the order.';
  }
  return {
    id: `order-${order.id}`,
    kind: 'refund',
    src: 'order',
    refId: order.id,
    status: due ? (wasFailed ? 'refund_failed' : 'refund_due') : order.payment_status,
    title: `${order.order_number} · ${wasFailed ? 'refund failed' : 'refund due'}`,
    sub: `${STATUS_TEXT[st] || order.status} · ${refund.paidVia}`,
    step: !due ? 'Refund sorted'
      : wasFailed ? `Razorpay refused the refund — ${inr(owed)} still owed`
      : `${STATUS_TEXT[st] || order.status} — refund ${inr(owed)} not sent yet`,
    openedAt: failed.length ? failed[failed.length - 1].created_at : (order.updated_at || order.updatedAt),
    order: orderSummary(order),
    customer,
    conversationId,
    timeline: [...hist, ...fails, ...wa].sort(byTime),
    refund: { ...refund, refundAmount: owed },
    actions, ask, help,
  };
}

async function getDetail(src, id) {
  await ensureSchema();
  const n = parseInt(id, 10);
  if (!n) return null;
  if (src === 'ndr') return ndrDetail(n);
  if (src === 'return') return returnDetail(n);
  if (src === 'order') return orderRefundDetail(n);
  return null;
}

module.exports = { ensureSchema, logEvent, listQueue, getDetail, getReturnCharges, setReturnCharges, CHARGE_KEYS };
