const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { phoneHash } = require('../utils/encryption.js');
const { getRtoRiskLevel } = require('./orderService.js');

/**
 * Customer profile — everything about one shopper on one page (staff open it
 * before calling a COD customer or handling a complaint).
 *
 * Identity: a registered user (users are per brand, so the same phone can be
 * several user rows), guest checkouts and orders shipped to the same phone are
 * the SAME person. Phones on guest_users / shipping_addresses are encrypted,
 * so they're matched on phone_hash (HMAC of the last 10 digits); users.phone
 * and whatsapp_conversations.customer_phone are plain.
 *
 * Money and stage rules mirror the Orders desk (orderController DESK_STAGES)
 * and the sales report (salesReportService):
 *   delivered  → reached the customer (incl. later returned)
 *   spent      → delivered value − refunds on those orders
 *   refunds    → payments rows with amount_paid < 0 (paise, status <> 'failed')
 *                + refunded COD returns (returns.refund_amount, rupees)
 */

const ORDER_CAP = 500;     // orders read for the stats
const LIST_CAP = 50;       // orders returned in the list
const MSG_CAP = 10;

const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round(num(v) * 100) / 100;
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const isCod = (t) => String(t || '').toLowerCase() === 'cod';
const cleanName = (n) => String(n || '').replace(/\s*\(\+?[\d\s-]{6,}\)\s*$/, '').trim();
const inr = (v) => `₹${Math.round(num(v)).toLocaleString('en-IN')}`;

// Same buckets as the Orders desk / sales report STAGE_SQL.
function stageOf(status, hasReturn) {
  const s = String(status || '').toLowerCase();
  if (['cancelled', 'order cancelled'].includes(s)) return 'cancelled';
  if (['awaiting_confirmation', 'pending'].includes(s)) return 'to_confirm';
  if (['confirmed', 'processing', 'booked', 'pickup initiated', 'manifested'].includes(s)) return 'to_ship';
  if (['shipped', 'in transit', 'out for delivery'].includes(s)) return 'in_transit';
  if (['undelivered', 'exception'].includes(s)) return 'problems';
  if (s === 'delivered') return 'delivered';
  if (['return_initiated', 'returned_rto'].includes(s) && hasReturn) return 'returned';
  if (['rto', 'rto delivered', 'returned_rto'].includes(s)) return 'rto';
  return 'other';
}
const STAGE_LABEL = {
  to_confirm: 'To confirm', to_ship: 'To ship', in_transit: 'In transit', problems: 'Delivery problem',
  delivered: 'Delivered', returned: 'Returned', rto: 'RTO', cancelled: 'Cancelled', other: 'Other',
};
const STAGE_TONE = {
  to_confirm: 'warn', to_ship: 'info', in_transit: 'info', problems: 'bad',
  delivered: 'ok', returned: 'violet', rto: 'bad', cancelled: 'muted', other: 'muted',
};

function agoText(d) {
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'less than an hour ago';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function parseMsgBody(body, type) {
  let text = body || '';
  if (/^\s*\{/.test(text)) {
    try { const j = JSON.parse(text); text = j.text || j.caption || j.body || `[${type}]`; } catch { /* keep raw */ }
  }
  if (!text) text = `[${type || 'message'}]`;
  return String(text).slice(0, 600);
}

// No DATA_ENCRYPTION_KEY (dev/test) → phones are stored plain: match digits.
function plainPhoneWhere(p10) {
  const { fn, col, where, Op } = require('sequelize');
  return where(fn('REGEXP_REPLACE', col('phone'), '[^0-9]', ''), { [Op.like]: `%${p10}` });
}

// ── Resolve who we're looking at ─────────────────────────────────────────
async function findUsersByPhone(p10) {
  if (p10.length !== 10) return [];
  return q(`SELECT id, username, email, phone, loyalty_points, source_brand_id, createdAt
              FROM users WHERE REGEXP_REPLACE(phone, '[^0-9]', '') LIKE :like AND role = 'consumer'`, { like: `%${p10}` });
}

async function findGuestsByPhone(p10, hash) {
  if (p10.length !== 10) return [];
  const { GuestUser } = require('../model/associations.js');
  // Hash match when the key is configured; plain match for legacy unencrypted rows.
  const where = hash
    ? { phoneHashValue: hash }
    : plainPhoneWhere(p10);
  return GuestUser.findAll({ where, order: [['created_at', 'DESC']], limit: 50 }).catch(() => []);
}

async function resolve({ kind, id, phone }) {
  const { User, GuestUser, ShippingAddress } = require('../model/associations.js');
  let anchor = null; // { kind, id }
  let p10 = '';
  let users = [];
  let guests = [];
  let lead = null;

  if (kind === 'user') {
    const u = await User.findByPk(id, { attributes: ['id', 'username', 'email', 'phone', 'loyalty_points', 'source_brand_id', 'createdAt'] });
    if (!u) return null;
    anchor = { kind: 'user', id: u.id };
    p10 = last10(u.phone);
    users = [u.get({ plain: true })];
  } else if (kind === 'guest') {
    const g = await GuestUser.findByPk(id);
    if (!g) return null;
    anchor = { kind: 'guest', id: g.id };
    p10 = last10(g.phone);
    guests = [g];
  } else {
    p10 = last10(phone);
    if (p10.length !== 10) return null;
  }

  const hash = p10.length === 10 ? phoneHash(p10) : null;
  if (p10.length === 10) {
    const more = await findUsersByPhone(p10);
    for (const u of more) if (!users.some((x) => x.id === u.id)) users.push(u);
    const g2 = await findGuestsByPhone(p10, hash);
    for (const g of g2) if (!guests.some((x) => x.id === g.id)) guests.push(g);
  }

  // Shipping addresses with this phone (orders can be shipped to the phone even
  // when the account / guest record carries another number).
  let addrIds = [];
  if (p10.length === 10) {
    const where = hash ? { phone_hash: hash } : plainPhoneWhere(p10);
    const rows = await ShippingAddress.findAll({ where, attributes: ['id'], limit: 500 }).catch(() => []);
    addrIds = rows.map((r) => r.id);
  }

  if (!anchor) {
    // kind=phone → best match: a registered account (most orders), else the
    // newest guest, else just the phone (orders shipped to it).
    if (users.length) {
      const counts = await q(`SELECT user_id, COUNT(*) AS n FROM orders WHERE user_id IN (:ids) GROUP BY user_id`, { ids: users.map((u) => u.id) });
      const n = (uid) => num(counts.find((c) => c.user_id === uid)?.n);
      users.sort((a, b) => n(b.id) - n(a.id));
      anchor = { kind: 'user', id: users[0].id };
    } else if (guests.length) {
      anchor = { kind: 'guest', id: guests[0].id };
    } else if (addrIds.length) {
      anchor = { kind: 'phone', id: null };
    } else {
      // A lead (left a cart / gave the phone in the popup) — no orders, but
      // staff open them from the Customers list to call.
      lead = await findLead(p10, hash);
      if (!lead) return null;
      anchor = { kind: 'phone', id: null };
    }
  }
  // Keep the anchor user first (its name / email / since lead the header).
  if (anchor.kind === 'user') users.sort((a, b) => (a.id === anchor.id ? -1 : b.id === anchor.id ? 1 : 0));
  if (anchor.kind === 'guest') guests.sort((a, b) => (a.id === anchor.id ? -1 : b.id === anchor.id ? 1 : 0));
  return { anchor, p10, users, guests, addrIds, lead };
}

// Newest abandoned cart / popup sign-up for a phone that has no account,
// guest checkout or order.
async function findLead(p10, hash) {
  if (p10.length !== 10) return null;
  const carts = await q(
    hash
      ? `SELECT customer_name, cart_value, updated_at FROM abandoned_carts WHERE phone_hash = :hash ORDER BY updated_at DESC LIMIT 1`
      : `SELECT customer_name, cart_value, updated_at FROM abandoned_carts WHERE REGEXP_REPLACE(phone, '[^0-9]', '') LIKE :like ORDER BY updated_at DESC LIMIT 1`,
    { hash, like: `%${p10}` }
  ).catch(() => []);
  const pops = await q(
    `SELECT createdAt FROM lead_captures WHERE REGEXP_REPLACE(phone, '[^0-9]', '') LIKE :like ORDER BY createdAt DESC LIMIT 1`,
    { like: `%${p10}` }
  ).catch(() => []);
  if (!carts[0] && !pops[0]) return null;
  return {
    name: carts[0]?.customer_name || null,
    cartValue: carts[0] ? num(carts[0].cart_value) : null,
    cartAt: carts[0]?.updated_at || null,
    signedUpAt: pops[0]?.createdAt || null,
  };
}

// ── Build the profile ────────────────────────────────────────────────────
async function getCustomerProfile({ kind, id, phone }) {
  const who = await resolve({ kind, id, phone });
  if (!who) return null;
  const { anchor, p10, users, guests, addrIds, lead } = who;
  const userIds = users.map((u) => u.id);
  const guestIds = guests.map((g) => g.id);

  const conds = [];
  if (userIds.length) conds.push('o.user_id IN (:userIds)');
  if (guestIds.length) conds.push('o.guest_user_id IN (:guestIds)');
  if (addrIds.length) conds.push('o.shipping_address_id IN (:addrIds)');
  const orders = conds.length ? await q(
    `SELECT o.id, o.order_number, o.brand_id, b.name AS brand_name, b.display_name AS brand_display,
            o.status, o.payment_type, o.payment_status, o.final_amount, o.created_at, o.notes,
            o.rto_risk_score, o.shipping_address_id, o.user_id, o.guest_user_id
       FROM orders o LEFT JOIN brands b ON b.id = o.brand_id
      WHERE ${conds.join(' OR ')}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ${ORDER_CAP}`,
    { userIds, guestIds, addrIds }
  ) : [];
  const orderIds = orders.map((o) => o.id);
  const ids = orderIds.length ? orderIds : [0];

  const [returns, payRefunds, ndrCases, undelivered, addresses, convs] = await Promise.all([
    q(`SELECT r.id, r.return_number, r.order_id, r.status, r.is_cod, r.reason, r.resolution, r.upi_id,
              r.requested_amount, r.refund_amount, r.created_at, r.refunded_at
         FROM returns r WHERE r.order_id IN (:ids) ORDER BY r.created_at DESC`, { ids }).catch(() => []),
    q(`SELECT p.id, p.order_id, p.payment_type, p.amount_paid, p.status, p.payment_gateway, p.transaction_id, p.created_at
         FROM payments p WHERE p.order_id IN (:ids) AND p.amount_paid < 0 ORDER BY p.created_at DESC`, { ids }).catch(() => []),
    q(`SELECT id, order_id, status, attempts, reason, customer_action, created_at
         FROM ndr_cases WHERE order_id IN (:ids) ORDER BY id DESC`, { ids }).catch(() => []),
    q(`SELECT order_id, COUNT(*) AS n FROM order_status_history
        WHERE order_id IN (:ids) AND status = 'undelivered' GROUP BY order_id`, { ids }).catch(() => []),
    loadAddresses(orders, userIds, guestIds),
    p10.length === 10
      ? q(`SELECT id, unread_count, last_message_at, updatedAt FROM whatsapp_conversations
            WHERE RIGHT(customer_phone, 10) = :p10 ORDER BY COALESCE(last_message_at, updatedAt) DESC LIMIT 1`, { p10 }).catch(() => [])
      : [],
  ]);

  // Per-order lookups.
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const returnsByOrder = new Map();
  for (const r of returns) returnsByOrder.set(r.order_id, [...(returnsByOrder.get(r.order_id) || []), r]);
  const refundByOrder = new Map();
  const addRefund = (oid, amt) => refundByOrder.set(oid, num(refundByOrder.get(oid)) + num(amt));
  for (const p of payRefunds) if (p.status !== 'failed') addRefund(p.order_id, isCod(p.payment_type) ? -num(p.amount_paid) : -num(p.amount_paid) / 100);
  for (const r of returns) if (r.status === 'refunded' && num(r.is_cod) === 1) addRefund(r.order_id, r.refund_amount);
  const failedByOrder = new Map();
  // Failed attempts per order: the most of (cases opened, courier attempt
  // count on a case, 'undelivered' history rows) — they describe the same events.
  const caseCount = new Map();
  for (const c of ndrCases) {
    caseCount.set(c.order_id, num(caseCount.get(c.order_id)) + 1);
    failedByOrder.set(c.order_id, Math.max(num(failedByOrder.get(c.order_id)), num(caseCount.get(c.order_id)), num(c.attempts)));
  }
  for (const u of undelivered) failedByOrder.set(u.order_id, Math.max(num(failedByOrder.get(u.order_id)), num(u.n)));

  // Stats.
  const st = { orders: orders.length, delivered: 0, waiting: 0, toConfirm: 0, deliveredValue: 0, refunds: 0, rto: 0, cancelled: 0, returned: 0 };
  const rows = orders.map((o) => {
    const stage = stageOf(o.status, returnsByOrder.has(o.id));
    const total = r2(o.final_amount);
    if (stage === 'delivered' || stage === 'returned') {
      st.delivered += 1; st.deliveredValue += total; st.refunds += num(refundByOrder.get(o.id));
      if (stage === 'returned') st.returned += 1;
    } else if (['to_confirm', 'to_ship', 'in_transit', 'problems'].includes(stage)) {
      st.waiting += 1;
      if (stage === 'to_confirm') st.toConfirm += 1;
    } else if (stage === 'rto') st.rto += 1;
    else if (stage === 'cancelled') st.cancelled += 1;
    return {
      id: o.id,
      orderNumber: o.order_number,
      brand: o.brand_display || o.brand_name || null,
      brandId: o.brand_id,
      at: o.created_at,
      paymentType: isCod(o.payment_type) ? 'COD' : 'Prepaid',
      paymentStatus: o.payment_status,
      status: o.status,
      stage,
      stageLabel: STAGE_LABEL[stage],
      tone: STAGE_TONE[stage],
      total,
      refunded: r2(refundByOrder.get(o.id)),
      failedDeliveries: num(failedByOrder.get(o.id)),
    };
  });

  const failedTotal = [...failedByOrder.values()].reduce((a, b) => a + b, 0);
  // Open cases on orders that are still out for delivery (a case left open on
  // an order that has since been delivered / returned is stale).
  const openNdr = ndrCases.filter((c) => c.status !== 'closed'
    && ['to_ship', 'in_transit', 'problems'].includes(stageOf(orderById.get(c.order_id)?.status, false)));

  // Refund still owed: returns received but not refunded, plus prepaid orders
  // cancelled / RTO'd and still paid with no return (DESK_STAGES.refund_due).
  let refundDue = 0;
  for (const r of returns) if (r.status === 'received') refundDue += num(r.refund_amount) || num(r.requested_amount);
  const prepaidDue = orders.filter((o) =>
    ['cancelled', 'order cancelled', 'returned_rto', 'rto delivered'].includes(String(o.status).toLowerCase())
    && ['paid', 'refund_pending'].includes(String(o.payment_status).toLowerCase())
    && !isCod(o.payment_type) && !returnsByOrder.has(o.id));
  for (const o of prepaidDue) refundDue += Math.max(0, num(o.final_amount) - num(refundByOrder.get(o.id)));

  const spent = r2(st.deliveredValue - st.refunds);
  const last = orders[0] || null;
  const stats = {
    orders: st.orders,
    delivered: st.delivered,
    waiting: st.waiting,
    toConfirm: st.toConfirm,
    cancelled: st.cancelled,
    spent,
    deliveredValue: r2(st.deliveredValue),
    refunded: r2(st.refunds),
    avgOrder: st.delivered ? r2(spent / st.delivered) : 0,
    rto: st.rto,
    failedDeliveries: failedTotal,
    ordersWithFailedDelivery: failedByOrder.size,
    returns: returns.length,
    refundDue: r2(refundDue),
    lastOrderAt: last ? last.created_at : null,
    lastOrderNumber: last ? last.order_number : null,
    ordersCapped: orders.length >= ORDER_CAP,
  };

  // Returns & refunds.
  const returnRows = returns.map((r) => ({
    id: r.id,
    returnNumber: r.return_number,
    orderNumber: orderById.get(r.order_id)?.order_number || null,
    status: r.status,
    isCod: num(r.is_cod) === 1,
    reason: r.reason,
    resolution: r.resolution,
    upiId: num(r.is_cod) === 1 ? r.upi_id || null : null,
    requestedAmount: r2(r.requested_amount),
    refundAmount: r.refund_amount == null ? null : r2(r.refund_amount),
    at: r.created_at,
    refundedAt: r.refunded_at,
  }));
  const refundRows = payRefunds.map((p) => ({
    id: p.id,
    orderNumber: orderById.get(p.order_id)?.order_number || null,
    amount: r2(isCod(p.payment_type) ? -num(p.amount_paid) : -num(p.amount_paid) / 100),
    status: p.status,
    gateway: p.payment_gateway || null,
    reference: p.transaction_id || null,
    at: p.created_at,
  }));

  // WhatsApp.
  let chat = null;
  if (convs[0]) {
    const msgs = await q(
      `SELECT direction, type, body, COALESCE(sent_at, createdAt) AS at
         FROM whatsapp_messages WHERE conversation_id = :cid ORDER BY id DESC LIMIT ${MSG_CAP}`,
      { cid: convs[0].id }
    ).catch(() => []);
    chat = {
      conversationId: convs[0].id,
      unread: num(convs[0].unread_count),
      lastAt: convs[0].last_message_at || convs[0].updatedAt,
      messages: msgs.reverse().map((m) => ({ direction: m.direction, type: m.type, text: parseMsgBody(m.body, m.type), at: m.at })),
    };
  }

  // Addresses — failed deliveries per address.
  const addrRows = addresses.map((a) => {
    const used = orders.filter((o) => a.ids.includes(o.shipping_address_id));
    return {
      name: a.name,
      line: a.line,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      orders: used.length,
      failedDeliveries: used.reduce((s, o) => s + num(failedByOrder.get(o.id)), 0),
      lastUsedAt: used[0]?.created_at || null,
    };
  }).sort((a, b) => b.orders - a.orders || new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0));

  // Header.
  const firstUser = users[0] || null;
  const firstGuest = guests[0] || null;
  const latestAddr = addresses.find((a) => a.ids.includes(last?.shipping_address_id)) || addresses[0] || null;
  const guestName = firstGuest ? [firstGuest.firstName, firstGuest.lastName].filter(Boolean).join(' ') : '';
  const name = cleanName((anchor.kind === 'guest' ? guestName : firstUser?.username) || firstUser?.username || guestName || latestAddr?.name || lead?.name) || 'Customer';
  const phoneShown = (anchor.kind === 'guest' ? firstGuest?.phone : firstUser?.phone) || firstUser?.phone || firstGuest?.phone || latestAddr?.phone || (p10 || null);
  const email = (anchor.kind === 'guest' ? firstGuest?.email : firstUser?.email) || firstUser?.email || firstGuest?.email || null;
  const sinceCandidates = [
    ...users.map((u) => u.createdAt),
    ...guests.map((g) => g.get('created_at') || g.get('createdAt')),
    orders.length ? orders[orders.length - 1].created_at : null,
    lead?.cartAt, lead?.signedUpAt,
  ].filter(Boolean).map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()));
  const since = sinceCandidates.length ? new Date(Math.min(...sinceCandidates)) : null;

  const brandNames = new Set(orders.map((o) => o.brand_display || o.brand_name).filter(Boolean));
  const srcBrands = users.map((u) => u.source_brand_id).filter(Boolean);
  if (srcBrands.length) {
    const bs = await q(`SELECT id, name, display_name FROM brands WHERE id IN (:ids)`, { ids: srcBrands }).catch(() => []);
    for (const b of bs) brandNames.add(b.display_name || b.name);
  }

  const riskOrder = orders.find((o) => !['cancelled', 'rto'].includes(stageOf(o.status, false))) || last;
  const rtoRisk = riskOrder && riskOrder.rto_risk_score != null
    ? { level: getRtoRiskLevel(num(riskOrder.rto_risk_score)), score: num(riskOrder.rto_risk_score) }
    : null;

  const customer = {
    kind: anchor.kind,
    id: anchor.id,
    name,
    phone: phoneShown || null,
    email: email || null,
    since,
    brands: [...brandNames],
    registered: users.length > 0,
    userIds,
    guestIds,
    loyaltyPoints: users.length ? users.reduce((s, u) => s + num(u.loyalty_points), 0) : null,
    rtoRisk,
    repeatBuyer: st.delivered >= 2,
  };

  // "Before you call".
  const summary = [];
  for (const o of rows.filter((r) => r.stage === 'to_confirm' && r.paymentType === 'COD').slice(0, 3)) {
    summary.push(`COD order ${o.orderNumber} (${inr(o.total)}) is waiting to be confirmed — placed ${agoText(o.at)}.`);
  }
  for (const o of rows.filter((r) => r.stage === 'problems').slice(0, 3)) {
    summary.push(`Order ${o.orderNumber} couldn't be delivered — courier marked it ${orderById.get(o.id).status}.`);
  }
  for (const c of openNdr.slice(0, 3)) {
    const on = orderById.get(c.order_id)?.order_number;
    summary.push(`Open failed-delivery case on ${on}${c.reason ? ` (${c.reason})` : ''}${c.customer_action ? ` — customer chose ${String(c.customer_action).replace(/_/g, ' ')}` : ''}.`);
  }
  for (const r of returnRows.filter((x) => x.status === 'received')) {
    const amt = r.refundAmount ?? r.requestedAmount;
    summary.push(`Return ${r.returnNumber} received — refund of ${inr(amt)} is due${r.upiId ? ` to UPI ${r.upiId}` : ''}.`);
  }
  for (const r of returnRows.filter((x) => ['requested', 'under_review'].includes(x.status))) {
    summary.push(`Return ${r.returnNumber} (order ${r.orderNumber}) is waiting for review.`);
  }
  for (const o of prepaidDue.slice(0, 3)) {
    summary.push(`Prepaid order ${o.order_number} was ${stageOf(o.status, false) === 'cancelled' ? 'cancelled' : 'returned by the courier'} — ${inr(num(o.final_amount) - num(refundByOrder.get(o.id)))} still to refund.`);
  }
  if (chat && chat.unread > 0) summary.push(`${chat.unread} unread WhatsApp message${chat.unread === 1 ? '' : 's'} from this customer.`);
  if (orders.length) {
    const bits = [`${st.delivered} of ${orders.length} order${orders.length === 1 ? '' : 's'} delivered`];
    if (failedTotal) bits.push(`${failedTotal} failed deliver${failedTotal === 1 ? 'y' : 'ies'}`);
    if (st.rto) bits.push(`${st.rto} RTO`);
    if (st.cancelled) bits.push(`${st.cancelled} cancelled`);
    summary.push(`${bits.join(', ')}.`);
    if (orders.length === 1) summary.push('First order — new customer.');
  } else {
    summary.push('No orders yet.');
    if (lead?.cartAt) summary.push(`Left a cart${lead.cartValue ? ` worth ${inr(lead.cartValue)}` : ''} ${agoText(lead.cartAt)} without ordering.`);
    else if (lead?.signedUpAt) summary.push(`Gave their number in the website popup ${agoText(lead.signedUpAt)}.`);
  }

  const notes = orders.filter((o) => o.notes && String(o.notes).trim()).slice(0, 3)
    .map((o) => ({ orderNumber: o.order_number, text: String(o.notes).trim().slice(0, 500), at: o.created_at }));

  return {
    customer,
    stats,
    orders: rows.slice(0, LIST_CAP),
    returns: returnRows,
    refunds: refundRows,
    chat,
    addresses: addrRows,
    summary,
    notes,
  };
}

// Distinct addresses (decrypted via the model getters) used by these orders,
// plus the account's / guest's saved ones. Grouped by street|city|pincode.
async function loadAddresses(orders, userIds, guestIds) {
  const { ShippingAddress } = require('../model/associations.js');
  const { Op } = require('sequelize');
  const or = [];
  const usedIds = [...new Set(orders.map((o) => o.shipping_address_id).filter(Boolean))];
  if (usedIds.length) or.push({ id: { [Op.in]: usedIds } });
  if (userIds.length) or.push({ user_id: { [Op.in]: userIds } });
  if (guestIds.length) or.push({ guest_user_id: { [Op.in]: guestIds } });
  if (!or.length) return [];
  const rows = await ShippingAddress.findAll({ where: { [Op.or]: or }, order: [['id', 'DESC']], limit: 200 }).catch(() => []);
  const groups = new Map();
  for (const a of rows) {
    const key = [a.address, a.city, a.pincode].map((s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')).join('|');
    const g = groups.get(key);
    if (g) { g.ids.push(a.id); continue; }
    groups.set(key, {
      ids: [a.id],
      name: cleanName(a.full_name),
      line: [a.address, a.landmark].filter(Boolean).join(', '),
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      phone: a.phone || null,
    });
  }
  return [...groups.values()];
}

module.exports = { getCustomerProfile, stageOf, cleanName };
