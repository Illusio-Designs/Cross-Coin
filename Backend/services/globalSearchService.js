/**
 * "Search everything" for the admin Dashboard (GET /api/search?q=).
 *
 * One query string → grouped results: customers, orders, WhatsApp chats and
 * returns. Each group is capped and every lookup is built to hit an index:
 *   - order_number / return_number / AWB: exact or prefix match (unique or
 *     secondary index). A contains-match on order_number is only a fallback
 *     when the prefix found nothing (staff often type just the tail "0001").
 *   - Phone (10 digits): users.phone and whatsapp_conversations.customer_phone
 *     are plain text, matched with IN (variants) so their unique indexes apply.
 *     guest_users.phone and shipping_addresses.phone are AES-encrypted with a
 *     random IV, so they're matched through their deterministic `phone_hash`.
 *   - Name / email: email prefix (indexed); name contains-match on the
 *     customer tables (bounded by LIMIT).
 *
 * Role gating is done by the caller via `scope` — a group the user can't see
 * is never queried at all.
 */
const { sequelize } = require('../config/db.js');
const { phoneHash } = require('../utils/encryption.js');

const LIMITS = { customers: 5, orders: 8, chats: 5, returns: 5 };
const MAX_Q = 100;

const COD = new Set(['cod', 'COD']);

// Same rules as DESK_STAGES in controller/orderController.js, expressed as a
// per-row classifier so each search result carries the Orders-desk stage.
function orderStage(o) {
  const s = String(o.status || '').toLowerCase();
  if (['awaiting_confirmation', 'pending'].includes(s)) {
    return COD.has(o.payment_type)
      ? { stage: 'to_confirm', stageLabel: 'To confirm' }
      : { stage: 'pending', stageLabel: 'Payment pending' };
  }
  if (['confirmed', 'processing', 'booked', 'pickup initiated', 'manifested'].includes(s)) return { stage: 'to_ship', stageLabel: 'To ship' };
  if (['shipped', 'in transit', 'out for delivery'].includes(s)) return { stage: 'in_transit', stageLabel: s === 'out for delivery' ? 'Out for delivery' : 'In transit' };
  if (['undelivered', 'exception'].includes(s)) return { stage: 'problems', stageLabel: 'Delivery problem' };
  if (s === 'delivered') return { stage: 'delivered', stageLabel: 'Delivered' };
  if (['return_initiated', 'returned_rto'].includes(s)) return { stage: 'returns', stageLabel: s === 'return_initiated' ? 'Return started' : 'Returned' };
  if (['cancelled', 'order cancelled'].includes(s)) return { stage: 'cancelled_rto', stageLabel: 'Cancelled' };
  if (['rto', 'rto delivered'].includes(s)) return { stage: 'cancelled_rto', stageLabel: 'RTO' };
  return { stage: 'other', stageLabel: s || 'Unknown' };
}

const RETURN_LABELS = {
  requested: 'Requested',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  received: 'Received',
  refunded: 'Refunded',
};

const likeEscape = (s) => String(s).replace(/[\\%_]/g, (c) => `\\${c}`);
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const uniq = (arr) => [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ''))];

// Stored phone spellings we may meet for one 10-digit number, so equality /
// IN lookups (which use the index) cover them without a RIGHT()/LIKE scan.
const phoneVariants = (d10) => [d10, `91${d10}`, `+91${d10}`, `0${d10}`, `+91 ${d10}`];

async function select(sql, replacements) {
  return sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
}

function waPreview(text) {
  let t = text || '';
  if (/^\s*\{/.test(t)) {
    try { const j = JSON.parse(t); t = j.text || j.caption || j.body || '[message]'; } catch { /* keep raw */ }
  }
  return String(t).replace(/\s+/g, ' ').trim().slice(0, 140);
}

/**
 * Find the customer identities (users / guests / shipping addresses) the
 * query points at. Shared by the Customers, Orders and Chats groups.
 */
async function matchIdentities(q, { phone10, hash, isText }) {
  const ids = { users: new Set(), guests: new Set(), addresses: new Set() };
  const like = `%${likeEscape(q)}%`;
  const prefix = `${likeEscape(q)}%`;
  const jobs = [];

  if (phone10) {
    jobs.push(select(
      `SELECT id FROM users WHERE phone IN (:v) AND deleted_at IS NULL LIMIT 50`,
      { v: phoneVariants(phone10) }
    ).then((r) => r.forEach((x) => ids.users.add(x.id))));
    if (hash) {
      jobs.push(select(`SELECT id FROM guest_users WHERE phone_hash = :h LIMIT 50`, { h: hash })
        .then((r) => r.forEach((x) => ids.guests.add(x.id))));
      jobs.push(select(
        `SELECT id, user_id, guest_user_id FROM shipping_addresses WHERE phone_hash = :h LIMIT 50`, { h: hash }
      ).then((r) => r.forEach((x) => {
        ids.addresses.add(x.id);
        if (x.user_id) ids.users.add(x.user_id);
        if (x.guest_user_id) ids.guests.add(x.guest_user_id);
      })));
    }
  }

  if (isText) {
    const isEmailish = q.includes('@');
    jobs.push(select(
      isEmailish
        ? `SELECT id FROM users WHERE email LIKE :prefix AND deleted_at IS NULL LIMIT 20`
        : `SELECT id FROM users WHERE (username LIKE :like OR email LIKE :prefix) AND deleted_at IS NULL LIMIT 20`,
      { like, prefix }
    ).then((r) => r.forEach((x) => ids.users.add(x.id))));
    jobs.push(select(
      isEmailish
        ? `SELECT id FROM guest_users WHERE email LIKE :prefix LIMIT 20`
        : `SELECT id FROM guest_users
            WHERE email LIKE :prefix OR CONCAT_WS(' ', first_name, last_name) LIKE :like
            ORDER BY id DESC LIMIT 20`,
      { like, prefix }
    ).then((r) => r.forEach((x) => ids.guests.add(x.id))));
    if (!isEmailish) {
      jobs.push(select(
        `SELECT id, user_id, guest_user_id FROM shipping_addresses WHERE full_name LIKE :like ORDER BY id DESC LIMIT 30`,
        { like }
      ).then((r) => r.forEach((x) => {
        ids.addresses.add(x.id);
        if (x.user_id) ids.users.add(x.user_id);
        if (x.guest_user_id) ids.guests.add(x.guest_user_id);
      })));
    }
  }

  await Promise.all(jobs);
  return { users: [...ids.users], guests: [...ids.guests], addresses: [...ids.addresses] };
}

async function searchOrders(q, ids, { isCode }) {
  const prefix = `${likeEscape(q)}%`;
  const parts = [];
  const repl = { prefix, q, lim: LIMITS.orders };
  if (isCode) {
    // Index-friendly: unique order_number index + idx_orders_shipping_waybill.
    parts.push(`SELECT id FROM orders WHERE order_number LIKE :prefix`);
    parts.push(`SELECT id FROM orders WHERE shipping_waybill LIKE :prefix`);
  }
  if (ids.users.length) { parts.push(`SELECT id FROM orders WHERE user_id IN (:u)`); repl.u = ids.users; }
  if (ids.guests.length) { parts.push(`SELECT id FROM orders WHERE guest_user_id IN (:g)`); repl.g = ids.guests; }
  if (ids.addresses.length) { parts.push(`SELECT id FROM orders WHERE shipping_address_id IN (:a)`); repl.a = ids.addresses; }

  let orderIds = [];
  if (parts.length) {
    const rows = await select(
      `SELECT DISTINCT id FROM (${parts.join(' UNION ')}) m ORDER BY id DESC LIMIT :lim`, repl
    );
    orderIds = rows.map((r) => r.id);
  }
  // Fallback: the tail of an order number ("0001") — a contains-match scan,
  // only run when the indexed lookups found nothing.
  if (!orderIds.length && isCode && q.length >= 3) {
    const rows = await select(
      `SELECT id FROM orders WHERE order_number LIKE :like ORDER BY id DESC LIMIT :lim`,
      { like: `%${likeEscape(q)}%`, lim: LIMITS.orders }
    );
    orderIds = rows.map((r) => r.id);
  }
  if (!orderIds.length) return [];

  const rows = await select(
    `SELECT o.id, o.order_number, o.final_amount, o.payment_type, o.payment_status, o.status,
            o.created_at, o.shipping_waybill, o.brand_id,
            COALESCE(b.display_name, b.name) AS brand,
            COALESCE(sa.full_name, u.username, CONCAT_WS(' ', g.first_name, g.last_name)) AS customer_name
       FROM orders o
       LEFT JOIN brands b ON b.id = o.brand_id
       LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
      WHERE o.id IN (:ids)
      ORDER BY o.id DESC`,
    { ids: orderIds }
  );
  return rows.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    brand: o.brand || null,
    brand_id: o.brand_id,
    customer_name: o.customer_name || null,
    final_amount: o.final_amount !== null ? Number(o.final_amount) : null,
    payment_type: o.payment_type,
    payment_status: o.payment_status,
    status: o.status,
    ...orderStage(o),
    created_at: o.created_at,
    awb: o.shipping_waybill || null,
  }));
}

async function customerStats(column, ids) {
  if (!ids.length) return new Map();
  const rows = await select(
    `SELECT ${column} AS cid, COUNT(*) AS n,
            SUM(CASE WHEN status IN ('cancelled','order cancelled') THEN 0 ELSE final_amount END) AS spent
       FROM orders WHERE ${column} IN (:ids) GROUP BY ${column}`,
    { ids }
  );
  return new Map(rows.map((r) => [r.cid, { orders: Number(r.n) || 0, spent: Number(r.spent) || 0 }]));
}

async function searchCustomers(ids) {
  const out = [];
  const userIds = ids.users.slice(0, 40);
  const guestIds = ids.guests.slice(0, 40);

  const [users, guests] = await Promise.all([
    userIds.length
      ? select(
        `SELECT id, username, email, phone FROM users
          WHERE id IN (:ids) AND role = 'consumer' AND deleted_at IS NULL
          ORDER BY id DESC LIMIT :lim`,
        { ids: userIds, lim: LIMITS.customers }
      )
      : [],
    guestIds.length
      // Through the model so the phone getter decrypts it — never return ciphertext.
      ? require('../model/guestUserModel.js').GuestUser.findAll({
        where: { id: guestIds },
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        order: [['id', 'DESC']],
        limit: LIMITS.customers,
      })
      : [],
  ]);

  const [uStats, gStats] = await Promise.all([
    customerStats('user_id', users.map((u) => u.id)),
    customerStats('guest_user_id', guests.map((g) => g.id)),
  ]);

  for (const u of users) {
    const s = uStats.get(u.id) || { orders: 0, spent: 0 };
    out.push({
      kind: 'user', id: u.id, name: u.username || null, email: u.email || null,
      phone: last10(u.phone) || null, orders: s.orders, total_spent: s.spent,
    });
  }
  for (const g of guests) {
    const s = gStats.get(g.id) || { orders: 0, spent: 0 };
    const phone = g.phone; // decrypted by the model getter (null if undecryptable)
    out.push({
      kind: 'guest', id: g.id,
      name: [g.firstName, g.lastName].filter(Boolean).join(' ').trim() || null,
      email: g.email || null,
      phone: phone ? last10(phone) || null : null,
      orders: s.orders, total_spent: s.spent,
    });
  }
  // Customers with orders first, then most recent.
  out.sort((a, b) => (b.orders - a.orders) || (b.id - a.id));
  return out.slice(0, LIMITS.customers);
}

async function searchChats(q, { phone10, digits, isText }, extraPhones) {
  const conds = [];
  const repl = { lim: LIMITS.chats };
  const phoneList = uniq([phone10, ...extraPhones].map(last10).filter((p) => p.length === 10)).slice(0, 30);
  if (phoneList.length) {
    conds.push(`customer_phone IN (:pv)`);
    repl.pv = phoneList.flatMap(phoneVariants);
  }
  if (!phone10 && digits.length >= 5) {
    // Partial number typed — table is one row per customer, LIMIT-bounded.
    conds.push(`customer_phone LIKE :dlike`);
    repl.dlike = `%${digits}%`;
  }
  if (isText) {
    conds.push(`customer_name LIKE :like`);
    repl.like = `%${likeEscape(q)}%`;
  }
  if (!conds.length) return [];
  const rows = await select(
    `SELECT id, customer_phone, customer_name, last_message, last_message_at, unread_count, status
       FROM whatsapp_conversations
      WHERE ${conds.join(' OR ')}
      ORDER BY last_message_at IS NULL, last_message_at DESC LIMIT :lim`,
    repl
  );
  // Unnamed chats: borrow the registered customer's name for the same number.
  const unnamed = uniq(rows.filter((c) => !c.customer_name).map((c) => last10(c.customer_phone)).filter((p) => p.length === 10));
  const nameByPhone = new Map();
  if (unnamed.length) {
    const users = await select(
      `SELECT phone, username FROM users WHERE phone IN (:pv) AND deleted_at IS NULL`,
      { pv: unnamed.flatMap(phoneVariants) }
    ).catch(() => []);
    users.forEach((u) => { if (u.username && !nameByPhone.has(last10(u.phone))) nameByPhone.set(last10(u.phone), u.username); });
  }
  return rows.map((c) => ({
    conversation_id: c.id,
    name: c.customer_name || nameByPhone.get(last10(c.customer_phone)) || null,
    phone: c.customer_phone,
    last_message: waPreview(c.last_message),
    last_message_at: c.last_message_at,
    unread: Number(c.unread_count) || 0,
    status: c.status,
  }));
}

async function searchReturns(q, { isCode }, orderIds) {
  const parts = [];
  const repl = { lim: LIMITS.returns, prefix: `${likeEscape(q)}%`, q };
  if (isCode) {
    parts.push(`SELECT id FROM returns WHERE return_number LIKE :prefix`);
    parts.push(`SELECT id FROM returns WHERE pickup_awb = :q`);
  }
  if (orderIds.length) { parts.push(`SELECT id FROM returns WHERE order_id IN (:oids)`); repl.oids = orderIds; }
  if (!parts.length) return [];
  const rows = await select(
    `SELECT r.id, r.return_number, r.status, r.refund_amount, r.requested_amount, r.created_at,
            r.order_id, o.order_number
       FROM returns r LEFT JOIN orders o ON o.id = r.order_id
      WHERE r.id IN (SELECT id FROM (${parts.join(' UNION ')}) m)
      ORDER BY r.id DESC LIMIT :lim`,
    repl
  );
  return rows.map((r) => ({
    id: r.id,
    return_number: r.return_number,
    order_id: r.order_id,
    order_number: r.order_number || null,
    status: r.status,
    statusLabel: RETURN_LABELS[r.status] || r.status,
    amount: r.refund_amount !== null ? Number(r.refund_amount) : (r.requested_amount !== null ? Number(r.requested_amount) : null),
    created_at: r.created_at,
  }));
}

/**
 * @param {string} rawQ
 * @param {{ orders: boolean, chats: boolean }} scope  what the caller may see
 *   (orders ⇒ orders + returns + customers; chats ⇒ WhatsApp conversations)
 */
async function globalSearch(rawQ, scope) {
  const q = String(rawQ || '').trim().slice(0, MAX_Q);
  const groups = { customers: [], orders: [], chats: [], returns: [] };
  if (q.length < 2) return { q, groups };

  const digits = q.replace(/\D/g, '');
  const looksLikePhone = /^[+\d\s().-]+$/.test(q) && digits.length >= 10 && digits.length <= 13;
  const phone10 = looksLikePhone ? digits.slice(-10) : null;
  const hash = phone10 ? phoneHash(phone10) : null;
  // A single token with a digit/dash (order number, AWB, return number).
  const isCode = !/\s/.test(q) && /[\d-]/.test(q);
  // Anything with letters can be a name / email.
  const isText = /[a-z@]/i.test(q);
  const ctx = { phone10, hash, digits, isText, isCode };

  const ids = (scope.orders || scope.chats)
    ? await matchIdentities(q, ctx)
    : { users: [], guests: [], addresses: [] };

  if (scope.orders) {
    const [orders, customers] = await Promise.all([
      searchOrders(q, ids, ctx),
      searchCustomers(ids),
    ]);
    groups.orders = orders;
    groups.customers = customers;
    groups.returns = await searchReturns(q, ctx, orders.map((o) => o.id));
  }

  if (scope.chats) {
    // Chats for customers found by name/email too (their phones are known).
    let extraPhones = groups.customers.map((c) => c.phone);
    if (!scope.orders && isText && ids.users.length) {
      const rows = await select(`SELECT phone FROM users WHERE id IN (:ids) LIMIT 20`, { ids: ids.users.slice(0, 20) });
      extraPhones = rows.map((r) => r.phone);
    }
    groups.chats = await searchChats(q, ctx, extraPhones);
  }

  return { q, groups };
}

module.exports = { globalSearch, orderStage, LIMITS };
