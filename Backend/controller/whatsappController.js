'use strict';

const { WhatsappConversation, WhatsappMessage, WhatsappCannedResponse, WhatsappBroadcast } = require('../model/whatsappConversationModel.js');
const whatsappService = require('../services/whatsappService.js');
const { logger } = require('../config/logging.js');
const { Op } = require('sequelize');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function errMsg(err) {
  return err?.response?.data?.error?.message || err?.message || 'Unknown error';
}

// `brandId` query/body param: absent, '', 'all' or 0 → null (= all brands).
// One WhatsApp number serves every brand, so "no brand" must never silently
// mean brand 1.
function brandParam(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s || s === 'all' || s === '0') return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

// WhatsApp's 24-hour customer-service window: free-form messages are only
// delivered within 24 h of the customer's last message.
async function replyWindow(conv) {
  const { sequelize } = require('../config/db.js');
  const [row] = await sequelize.query(
    `SELECT MAX(createdAt) AS at FROM whatsapp_messages WHERE conversation_id = :id AND direction = 'inbound'`,
    { replacements: { id: conv.id }, type: require('sequelize').QueryTypes.SELECT });
  const fromMsgs = row?.at ? new Date(row.at) : null;
  const fromConv = conv.last_inbound_at ? new Date(conv.last_inbound_at) : null;
  const last = fromMsgs && fromConv ? (fromMsgs > fromConv ? fromMsgs : fromConv) : (fromMsgs || fromConv);
  const closesAt = last ? new Date(last.getTime() + WINDOW_MS) : null;
  return { open: !!closesAt && closesAt > new Date(), closesAt, lastInboundAt: last };
}

function windowClosedResponse(res, win) {
  return res.status(409).json({
    success: false,
    code: 'WINDOW_CLOSED',
    message: 'It has been more than 24 hours since this customer last wrote, so WhatsApp only allows an approved template. Send a template instead.',
    window_closes_at: win.closesAt,
    last_inbound_at: win.lastInboundAt,
  });
}

// Stamp a staff reply on the conversation (inbox "waiting" + SLA first response).
function staffReplyUpdate(conv, preview) {
  const now = new Date();
  const upd = { last_message: preview, last_message_at: now, last_reply_at: now };
  if (!conv.first_response_at) upd.first_response_at = now;
  return upd;
}

// Shared-number mode: one verified WhatsApp number serves every brand, so we
// can't tell the brand from the number. Attribute an inbound message to the
// brand of the customer's MOST RECENT order. Shipping / guest phones are
// encrypted at rest, so orders are matched by the keyed phone hash (and the
// plain account phone) — see whatsappService.ordersForPhones. Falls back to the
// shared default brand when the customer has no orders yet.
async function recentOrdersByPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return [];
  const rows = await whatsappService.ordersForPhones([digits]);
  return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function resolveBrandByPhone(phone) {
  const DEFAULT_BRAND = Number(process.env.WHATSAPP_SHARED_BRAND_ID) || 1;
  try {
    const [latest] = await recentOrdersByPhone(phone);
    if (latest?.brand_id) return latest.brand_id;
  } catch (e) {
    logger.warn('[WhatsApp] brand resolve by phone failed: ' + e.message);
  }
  return DEFAULT_BRAND;
}

// When a message references a specific order number (e.g. a COD confirm/reject
// button whose payload is `confirm_cod_SB-MSVFVW56-232508`, or text that quotes
// the order id), attribute the thread to THAT order's brand. This is more
// precise than resolveBrandByPhone, which returns the customer's most-recent
// order across ALL brands — so a Soxbae address confirmation from a customer
// whose latest order was CrossCoin would otherwise be mis-tagged CrossCoin.
async function resolveBrandByOrderRef(text) {
  try {
    const m = String(text || '').toUpperCase().match(/\b([A-Z]{2,4}-[A-Z0-9]{5,}-[A-Z0-9]{4,})\b/);
    if (!m) return null;
    const { Order } = require('../model/orderModel.js');
    const order = await Order.findOne({ where: { order_number: m[1] }, attributes: ['brand_id'] });
    return order?.brand_id || null;
  } catch (e) {
    logger.warn('[WhatsApp] brand resolve by order ref failed: ' + e.message);
    return null;
  }
}

// WhatsApp only includes a customer's profile name in the webhook when they've
// set one and their privacy allows it — so many threads have no name and the
// inbox falls back to showing the raw phone number. When we have no name, look
// one up from the customer's most recent order (shipping name, then guest
// record, then account), matched by phone hash.
async function resolveCustomerNameByPhone(phone) {
  try {
    const orders = await recentOrdersByPhone(phone);
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const { GuestUser } = require('../model/guestUserModel.js');
    for (const o of orders.slice(0, 3)) {
      if (o.shipping_address_id) {
        const a = await ShippingAddress.findByPk(o.shipping_address_id, { attributes: ['id', 'full_name'] });
        const n = a?.full_name?.trim();
        if (n) return n;
      }
      if (o.guest_user_id) {
        const g = await GuestUser.findByPk(o.guest_user_id);
        const n = g ? [g.firstName, g.lastName].filter(Boolean).join(' ').trim() : '';
        if (n) return n;
      }
    }
  } catch (e) {
    logger.warn('[WhatsApp] name resolve by phone failed: ' + e.message);
  }
  return null;
}

// Detect the brand from the message TEXT. Every storefront's WhatsApp widget
// opens with "Hi! I need help with <Brand> [order]." — a stronger signal than
// the phone lookup for a first-time customer (who has no order yet), and the
// reason a Morbix chat used to show the CrossCoin badge. Matches brand name /
// display name / domain (alphanumerics only) as a substring of the text.
let _brandTokenCache = null;
let _brandTokenCacheAt = 0;
async function getBrandTokens() {
  const now = Date.now();
  if (_brandTokenCache && now - _brandTokenCacheAt < 5 * 60 * 1000) return _brandTokenCache;
  try {
    const Brand = require('../model/brandModel.js');
    const brands = await Brand.findAll({ attributes: ['id', 'name', 'display_name', 'domain'] });
    _brandTokenCache = brands.map((b) => {
      const domainWord = String(b.domain || '').toLowerCase().replace(/^www\./, '').split('.')[0];
      const tokens = [b.name, b.display_name, domainWord]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter((t) => t.length >= 4);
      return { id: b.id, tokens: [...new Set(tokens)] };
    });
    _brandTokenCacheAt = now;
  } catch (e) {
    logger.warn('[WhatsApp] brand token load failed: ' + e.message);
    _brandTokenCache = _brandTokenCache || [];
  }
  return _brandTokenCache;
}
async function detectBrandFromText(text) {
  if (!text) return null;
  const hay = String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!hay) return null;
  const brands = await getBrandTokens();
  for (const b of brands) {
    if (b.tokens.some((tok) => hay.includes(tok))) return b.id;
  }
  return null;
}

// Re-attribute conversations still tagged with the shared default brand to the
// brand they actually belong to. Two signals, in priority order:
//   1) ANY inbound text that names a brand (scan every message, not just the
//      first — the brand word is often not in the opening "Hi" message).
//   2) Else the brand of the customer's most recent order (matched by phone).
// Chats with neither signal (generic message, no orders) correctly stay on the
// default — a shared number has no other way to know their brand. Idempotent and
// re-runnable; returns the count changed.
exports.reattributeBrands = async () => {
  const DEFAULT_BRAND = Number(process.env.WHATSAPP_SHARED_BRAND_ID) || 1;
  // Both models live in whatsappConversationModel.js — there is no separate
  // whatsappMessageModel.js file (the wrong path made this backfill crash on
  // every boot with "Cannot find module", so no old chat was ever re-tagged).
  const { WhatsappConversation, WhatsappMessage } = require('../model/whatsappConversationModel.js');
  const convs = await WhatsappConversation.findAll({
    where: { brand_id: DEFAULT_BRAND },
    attributes: ['id', 'brand_id', 'customer_phone'],
  });
  let updated = 0;
  for (const conv of convs) {
    try {
      let brandId = null;

      // 1) Scan ALL inbound text messages for a brand name.
      const msgs = await WhatsappMessage.findAll({
        where: { conversation_id: conv.id, direction: 'inbound', type: 'text' },
        order: [['id', 'ASC']],
        attributes: ['body'],
      });
      for (const m of msgs) {
        const b = await detectBrandFromText(m.body);
        if (b) { brandId = b; break; }
      }

      // 2) Else fall back to the brand of their most recent order (by phone).
      //    resolveBrandByPhone returns DEFAULT_BRAND when no order matches, so
      //    only apply a real, non-default match.
      if (!brandId) {
        const b = await resolveBrandByPhone(conv.customer_phone);
        if (b && b !== DEFAULT_BRAND) brandId = b;
      }

      if (brandId && brandId !== conv.brand_id) {
        await conv.update({ brand_id: brandId });
        updated++;
      }
    } catch (_) { /* skip a bad row, keep going */ }
  }
  return updated;
};

// One-time (and re-runnable) backfill: fill in a real name for existing chats
// that have none (they show a bare phone number in the inbox), by looking the
// customer up in their order/guest records. Only touches nameless rows.
exports.backfillCustomerNames = async () => {
  const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
  const convs = await WhatsappConversation.findAll({
    where: { [Op.or]: [{ customer_name: null }, { customer_name: '' }] },
    attributes: ['id', 'customer_phone'],
  });
  let updated = 0;
  for (const conv of convs) {
    try {
      const name = await resolveCustomerNameByPhone(conv.customer_phone);
      if (name) { await conv.update({ customer_name: name }); updated++; }
    } catch (_) { /* skip a bad row, keep going */ }
  }
  return updated;
};

// ─── Webhook: verify (GET) ────────────────────────────────────────────────────
exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'crosscoin_wa_verify';
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Forbidden' });
};


// ─── Stats ────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    // No brandId = every brand (one shared number).
    const brandId = brandParam(req.query.brandId);
    const { Op, fn, col } = require('sequelize');
    const { sequelize } = require('../config/db.js');

    // whatsapp_messages has no brand_id — it belongs to a conversation, which
    // does. Scope every message metric to the selected brand's conversations.
    const brandMsgWhere = brandId ? {
      conversation_id: {
        [Op.in]: sequelize.literal(`(SELECT id FROM whatsapp_conversations WHERE brand_id = ${Number(brandId)})`),
      },
    } : {};
    const convWhere = brandId ? { brand_id: brandId } : {};

    const [
      totalConversations,
      openConversations,
      resolvedConversations,
      totalMessages,
      outboundByStatus,
      last7Days,
    ] = await Promise.all([
      WhatsappConversation.count({ where: convWhere }),
      WhatsappConversation.count({ where: { ...convWhere, status: 'open' } }),
      WhatsappConversation.count({ where: { ...convWhere, status: 'resolved' } }),
      WhatsappMessage.count({ where: brandMsgWhere }),
      // One grouped scan (uses idx_wa_msg_dir_status) for the whole outbound
      // status breakdown instead of three separate full-table counts.
      WhatsappMessage.findAll({
        where: { direction: 'outbound', ...brandMsgWhere },
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      // messages per day for last 7 days (uses idx_wa_msg_sent_at)
      WhatsappMessage.findAll({
        where: {
          direction: 'outbound',
          sent_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          ...brandMsgWhere,
        },
        // Bucket by the IST calendar day (sent_at is stored in UTC).
        attributes: [
          [sequelize.literal('DATE(DATE_ADD(sent_at, INTERVAL 330 MINUTE))'), 'day'],
          [fn('COUNT', col('id')), 'count'],
        ],
        group: [sequelize.literal('DATE(DATE_ADD(sent_at, INTERVAL 330 MINUTE))')],
        order: [[sequelize.literal('DATE(DATE_ADD(sent_at, INTERVAL 330 MINUTE))'), 'ASC']],
        raw: true,
      }),
    ]);

    // Fold the grouped rows into the individual metrics the UI expects.
    const statusCounts = outboundByStatus.reduce((acc, r) => {
      acc[r.status] = Number(r.count) || 0;
      return acc;
    }, {});
    const sentMessages      = outboundByStatus.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
    const deliveredMessages = statusCounts.delivered || 0;
    const readMessages      = statusCounts.read || 0;

    // A message that was read is also delivered, but its stored status is only
    // the LATEST state ('read'), so it drops out of the 'delivered' bucket.
    // Count delivered-or-beyond for the delivery rate, otherwise every read
    // message makes the rate look worse than it is.
    const deliveryRate = sentMessages > 0 ? (((deliveredMessages + readMessages) / sentMessages) * 100).toFixed(1) : '0.0';
    const readRate     = sentMessages > 0 ? ((readMessages     / sentMessages) * 100).toFixed(1) : '0.0';
    const unreadCount  = await WhatsappConversation.sum('unread_count', { where: convWhere }) || 0;

    res.json({
      success: true,
      stats: {
        totalConversations,
        openConversations,
        resolvedConversations,
        totalMessages,
        sentMessages,
        deliveredMessages,
        readMessages,
        deliveryRate,
        readRate,
        unreadCount,
        last7Days,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Conversations ────────────────────────────────────────────────────────────
// Server-side inbox list: search (name / phone digits / last message / order
// number), status + quick filters, per-filter counts and per-row reply-window,
// waiting and latest-order info. Two indexed SQL statements + one model read +
// one grouped order lookup per page (no per-row queries).
const CONV_FILTERS = new Set(['all', 'unread', 'waiting', 'window_closed', 'has_order']);

// whatsapp_conversations is utf8mb4_unicode_ci while users / shipping_addresses
// / guest_users may be utf8mb4_general_ci; comparing their columns directly
// fails with "Illegal mix of collations". Cast the conversation side to the
// OTHER column's own collation (read once) so its index is still used.
let _collations = null;
// Collation + character set of the phone columns we match conversations
// against. Older tables can be latin1 while whatsapp_conversations is utf8mb4,
// and MySQL refuses `utf8mb4_expr COLLATE latin1_swedish_ci` — so match()
// converts the conversation's value into the column's character set first
// (phones and hashes are plain ASCII, nothing is lost).
async function phoneCollations() {
  if (_collations) return _collations;
  const { sequelize } = require('../config/db.js');
  const rows = await sequelize.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLLATION_NAME AS coll, CHARACTER_SET_NAME AS cs FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND ((TABLE_NAME = 'users' AND COLUMN_NAME = 'phone')
          OR (TABLE_NAME IN ('shipping_addresses', 'guest_users') AND COLUMN_NAME IN ('phone', 'phone_hash')))`,
    { type: require('sequelize').QueryTypes.SELECT });
  const ok = (v) => /^[a-z0-9_]+$/i.test(String(v || ''));
  const get = (t, c) => {
    const r = rows.find((x) => x.t === t && x.c === c);
    return ok(r?.coll) && ok(r?.cs) ? { coll: r.coll, cs: r.cs } : { coll: 'utf8mb4_unicode_ci', cs: 'utf8mb4' };
  };
  _collations = {
    users_phone: get('users', 'phone'),
    sa_hash: get('shipping_addresses', 'phone_hash'),
    sa_phone: get('shipping_addresses', 'phone'),
    gu_hash: get('guest_users', 'phone_hash'),
  };
  return _collations;
}
// `expr` re-encoded and collated like column `c` (from phoneCollations()).
const asColumn = (expr, c) => `CONVERT(${expr} USING ${c.cs}) COLLATE ${c.coll}`;

async function buildConversationList(query, { defaultLimit = 30 } = {}) {
  const { sequelize } = require('../config/db.js');
  const { QueryTypes } = require('sequelize');
  const brandId = brandParam(query.brandId);
  const status  = ['open', 'resolved', 'all'].includes(query.status) ? query.status : 'open';
  const filter  = CONV_FILTERS.has(query.filter) ? query.filter : 'all';
  const page    = Math.max(1, parseInt(query.page, 10) || 1);
  const limit   = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const q       = String(query.q || '').trim().slice(0, 100);
  const cut24   = new Date(Date.now() - WINDOW_MS);

  const base = [];
  const repl = { cut24, limit, offset: (page - 1) * limit };
  if (brandId) { base.push('c.brand_id = :brandId'); repl.brandId = brandId; }
  if (status !== 'all') { base.push('c.status = :status'); repl.status = status; }
  if (q) {
    const ors = ['c.customer_name LIKE :ql', 'c.last_message LIKE :ql'];
    repl.ql = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 3) { ors.push('c.customer_phone LIKE :qd'); repl.qd = `%${digits}%`; }
    const orderPhones = await whatsappService.phonesForOrderSearch(q).catch(() => []);
    if (orderPhones.length) {
      repl.orderPhones = orderPhones.flatMap((p) => [p, `91${p}`, `+91${p}`]);
      ors.push('c.customer_phone IN (:orderPhones)');
    }
    base.push(`(${ors.join(' OR ')})`);
  }
  const baseSql = base.length ? base.join(' AND ') : '1=1';

  const WAITING = '(c.last_inbound_at IS NOT NULL AND (c.last_reply_at IS NULL OR c.last_reply_at < c.last_inbound_at))';
  const CLOSED  = '(c.last_inbound_at IS NULL OR c.last_inbound_at < :cut24)';
  const hasKey = !!require('../utils/encryption.js').phoneHash('9999999999');
  const col = await phoneCollations();
  const P10 = 'RIGHT(c.customer_phone, 10)';
  const HAS_ORDER = `(EXISTS (SELECT 1 FROM users u JOIN orders o ON o.user_id = u.id
                        WHERE u.phone IN (${asColumn(P10, col.users_phone)}, ${asColumn(`CONCAT('91', ${P10})`, col.users_phone)}, ${asColumn(`CONCAT('+91', ${P10})`, col.users_phone)}))
     OR ${hasKey
    ? `(c.phone_hash IS NOT NULL AND (EXISTS (SELECT 1 FROM shipping_addresses a JOIN orders o ON o.shipping_address_id = a.id WHERE a.phone_hash = ${asColumn('c.phone_hash', col.sa_hash)})
          OR EXISTS (SELECT 1 FROM guest_users g JOIN orders o ON o.guest_user_id = g.id WHERE g.phone_hash = ${asColumn('c.phone_hash', col.gu_hash)})))`
    : `EXISTS (SELECT 1 FROM shipping_addresses a JOIN orders o ON o.shipping_address_id = a.id WHERE a.phone = ${asColumn(P10, col.sa_phone)})`})`;
  const filterSql = { all: '1=1', unread: 'c.unread_count > 0', waiting: WAITING, window_closed: CLOSED, has_order: HAS_ORDER }[filter];

  const [countRow] = await sequelize.query(
    `SELECT COUNT(*) AS all_n,
            SUM(c.unread_count > 0) AS unread_n,
            SUM(${WAITING}) AS waiting_n,
            SUM(${CLOSED}) AS closed_n,
            SUM(${HAS_ORDER}) AS has_order_n,
            SUM(${filterSql}) AS filtered_n
       FROM whatsapp_conversations c WHERE ${baseSql}`,
    { replacements: repl, type: QueryTypes.SELECT });
  const idRows = await sequelize.query(
    `SELECT c.id FROM whatsapp_conversations c
      WHERE ${baseSql} AND ${filterSql}
      ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC
      LIMIT :limit OFFSET :offset`,
    { replacements: repl, type: QueryTypes.SELECT });

  const ids = idRows.map((r) => r.id);
  const rows = ids.length ? await WhatsappConversation.findAll({ where: { id: ids } }) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  // Latest order per customer — one grouped lookup for the whole page.
  const p10 = (ph) => String(ph || '').replace(/\D/g, '').slice(-10);
  let latest = new Map();
  try { latest = await whatsappService.latestOrderByPhone(ordered.map((c) => p10(c.customer_phone))); } catch (e) {
    logger.warn('[WhatsApp] inbox latest-order lookup failed: ' + e.message);
  }
  let stageOf = null;
  try { stageOf = require('../services/chatContextService.js').stageOf; } catch (_) {}

  const now = Date.now();
  const conversations = ordered.map((c) => {
    const j = c.toJSON();
    const li = c.last_inbound_at ? new Date(c.last_inbound_at) : null;
    const lr = c.last_reply_at ? new Date(c.last_reply_at) : null;
    const closes = li ? new Date(li.getTime() + WINDOW_MS) : null;
    const o = latest.get(p10(c.customer_phone));
    const st = o && stageOf ? stageOf(o.status, o.payment_type) : null;
    return {
      ...j,
      window_open: !!closes && closes.getTime() > now,
      window_closes_at: closes,
      last_inbound_at: li,
      waiting_since: li && (!lr || lr < li) ? li : null,
      latest_order: o ? {
        order_number: o.order_number,
        stage: st ? st.key : null,
        stage_label: st ? st.label : null,
        status: o.status,
        created_at: o.created_at,
      } : null,
    };
  });

  // Fill phone_hash for rows that predate the column (cheap, page-sized).
  const missingHash = ordered.filter((c) => !c.phone_hash);
  if (missingHash.length) {
    const { phoneHash } = require('../utils/encryption.js');
    setImmediate(() => {
      for (const c of missingHash) {
        const h = phoneHash(c.customer_phone);
        if (h) WhatsappConversation.update({ phone_hash: h }, { where: { id: c.id } }).catch(() => {});
      }
    });
  }

  const total = Number(countRow?.filtered_n) || 0;
  return {
    conversations,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
    counts: {
      all: Number(countRow?.all_n) || 0,
      unread: Number(countRow?.unread_n) || 0,
      waiting: Number(countRow?.waiting_n) || 0,
      window_closed: Number(countRow?.closed_n) || 0,
      has_order: Number(countRow?.has_order_n) || 0,
    },
  };
}

exports.getConversations = async (req, res) => {
  try {
    const data = await buildConversationList(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error('[WhatsApp] getConversations failed: ' + err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Messages ─────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  // Timing so we can SEE where the time goes: X-DB-Ms is the actual DB work,
  // X-Handler-Ms the whole handler. Read them in the browser Network tab. If
  // X-Handler-Ms is small but the request feels slow, the time is in the
  // network / auth / Passenger cold-start, not this query.
  const t0 = Date.now();
  let dbMs = 0;
  res.setHeader('Access-Control-Expose-Headers', 'X-DB-Ms, X-Handler-Ms');
  try {
    const { id } = req.params;

    // Paginated: newest LIMIT by default; ?before=<messageId> loads the previous
    // page (for "load older"). hasMore tells the client whether to keep the
    // "Load older messages" control visible.
    const LIMIT = 40;
    const before = parseInt(req.query.before) || null;
    const where = { conversation_id: id };
    if (before) where.id = { [Op.lt]: before };

    // The conversation lookup and the messages query are independent — on a
    // remote DB each await is a network round-trip, so run them in parallel
    // instead of back-to-back (halves the latency for this endpoint).
    const tDb = Date.now();
    const [conv, rowsRaw] = await Promise.all([
      WhatsappConversation.findByPk(id),
      WhatsappMessage.findAll({ where, order: [['id', 'DESC']], limit: LIMIT + 1 }),
    ]);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    let rows = rowsRaw;
    const hasMore = rows.length > LIMIT;
    if (hasMore) rows = rows.slice(0, LIMIT);
    rows.reverse(); // chronological (oldest → newest)

    // Attach quoted message data for replies
    const quotedIds = rows.filter(m => m.quoted_message_id).map(m => m.quoted_message_id);
    let quotedMap = {};
    if (quotedIds.length > 0) {
      const quotedMsgs = await WhatsappMessage.findAll({ where: { id: quotedIds } });
      quotedMsgs.forEach(q => { quotedMap[q.id] = q; });
    }
    dbMs = Date.now() - tDb;
    const brandIdForMedia = conv.brand_id || 1;
    const messagesWithQuotes = rows.map(m => {
      const plain = m.toJSON();
      if (m.quoted_message_id && quotedMap[m.quoted_message_id]) {
        plain._quotedMsg = quotedMap[m.quoted_message_id].toJSON();
      }
      // For media messages the media id/url lives in the JSON `body`. Attach a
      // ready-to-use, signed, short-lived proxy URL so the browser can render the
      // media without putting the session JWT in the URL. The frontend prefers
      // this when present and falls back to the legacy ?token= URL otherwise.
      try {
        if (plain.body) {
          const parsed = JSON.parse(plain.body);
          if (parsed && typeof parsed === 'object' && parsed.url) {
            const { exp, sig } = signMediaAccess(parsed.url, brandIdForMedia);
            plain._mediaUrl = `/api/whatsapp/media/${encodeURIComponent(parsed.url)}?brandId=${brandIdForMedia}&exp=${exp}&sig=${sig}`;
          }
        }
      } catch (_) { /* not JSON media — frontend falls back to getProxyUrl */ }
      return plain;
    });

    // Clearing the unread badge is a side effect the client doesn't wait on —
    // fire it off without blocking the response (saves a round-trip on open).
    // Only write when there's actually something to clear.
    if (!before && conv.unread_count > 0) {
      conv.unread_count = 0; // reflect in the response payload immediately
      conv.update({ unread_count: 0 }).catch(() => {});
    }

    res.setHeader('X-DB-Ms', String(dbMs));
    res.setHeader('X-Handler-Ms', String(Date.now() - t0));
    res.json({ success: true, conversation: conv, messages: messagesWithQuotes, hasMore });
  } catch (err) {
    res.setHeader('X-Handler-Ms', String(Date.now() - t0));
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Live inbox stream (long-poll) ───────────────────────────────────────────
// GET /api/whatsapp/stream?brandId=&status=&since=<ISO>[&wait=0]
// Returns the current conversation list; if nothing is newer than `since`, holds
// the request open (~25s) and returns the instant an inbound message arrives.
// cPanel-safe (plain HTTP, no SSE/WebSocket), and holds no DB connection while
// parked. The client reconnects after each response for a live inbox.
exports.streamUpdates = async (req, res) => {
  try {
    const notificationService = require('../services/notificationService.js');
    const wait       = req.query.wait !== '0';
    const sinceTs    = req.query.since ? new Date(req.query.since) : null;
    // Same filters/search/brand rules as GET /conversations (brandId absent =
    // all brands); first page only.
    const fetchList = () => buildConversationList({ ...req.query, page: 1 }, { defaultLimit: 40 });

    let data = await fetchList();
    const newest = data.conversations[0]?.last_message_at ? new Date(data.conversations[0].last_message_at) : null;
    const hasNew = !sinceTs || (newest && newest > sinceTs);

    if (wait && !hasNew) {
      let closed = false;
      req.on('close', () => { closed = true; });
      await notificationService.waitForWhatsApp(25000);
      if (closed) return;
      await new Promise((r) => setTimeout(r, 150));
      data = await fetchList();
    }

    res.json({ success: true, ...data, serverTime: new Date() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send reply ───────────────────────────────────────────────────────────────
exports.sendReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, brandId = 1, quotedWaMessageId } = req.body;

    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    // Free text is only delivered inside the 24-hour window — refuse up front
    // instead of saving a bubble Meta will reject.
    const win = await replyWindow(conv);
    if (!win.open) return windowClosedResponse(res, win);

    const text = message.trim();

    // Resolve the quoted message's DB id (only when the agent is replying to one).
    let quotedMsgDbId = null;
    if (quotedWaMessageId) {
      const quotedMsg = await WhatsappMessage.findOne({ where: { wa_message_id: quotedWaMessageId }, attributes: ['id'] });
      quotedMsgDbId = quotedMsg?.id || null;
    }

    // Save the row and respond BEFORE the Meta round-trip. Previously the response
    // waited for the full send to Meta (0.5–2s), so the agent's bubble sat on the
    // "sending" clock the whole time — the "send takes too long" complaint. Now the
    // Meta send runs in the background and writes its result back to this same row:
    // wa_message_id (so delivered/read webhooks can match it) on success, status
    // 'failed' on error (retryable from the chat, like the WhatsApp app).
    const saved = await WhatsappMessage.create({
      conversation_id:   id,
      wa_message_id:     null,
      direction:         'outbound',
      type:              'text',
      body:              text,
      quoted_message_id: quotedMsgDbId,
      status:            'sent',
      sent_at:           new Date(),
      sent_by:           req.user?.id || null,
    });

    res.json({ success: true, message: saved });

    setImmediate(async () => {
      try {
        const result = await whatsappService.sendTextMessage(conv.customer_phone, text, conv.brand_id || brandId, quotedWaMessageId || null, { staff: true });
        if (result?.rate_limited) {
          await saved.update({ status: 'failed', error_reason: 'Hourly message limit for this number reached' }).catch(() => {});
          logger.warn(`[WhatsApp] reply to ${conv.customer_phone} hit the hourly rate limit (10/hour) — marked failed`);
          return;
        }
        // Store Meta's message id so sent/delivered/read status webhooks match this row.
        const waId = result?.messages?.[0]?.id || null;
        if (waId) await saved.update({ wa_message_id: waId }).catch(() => {});

        // Conversation metadata + SLA first-response stamp (genuine agent reply).
        await conv.update(staffReplyUpdate(conv, text)).catch(() => {});
      } catch (err) {
        await saved.update({ status: 'failed', error_reason: String(errMsg(err)).slice(0, 255) }).catch(() => {});
        logger.error(`[WhatsApp] background reply send failed for ${conv.customer_phone}: ${errMsg(err)}`);
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Send a media reply (image / video / audio / document) ────────────────────
// Agent attaches a file in the composer → we upload it to Meta, send it to the
// customer, and store it just like an inbound media message so it renders in the
// thread. Uploads/sends on the conversation's OWN brand (shared number).
exports.sendMediaReply = async (req, res) => {
  try {
    const { id } = req.params;
    const caption = (req.body.caption || '').trim();
    const file = req.file;
    if (!file || !file.buffer) return res.status(400).json({ success: false, message: 'No file attached' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const win = await replyWindow(conv);
    if (!win.open) return windowClosedResponse(res, win);

    const brandId = conv.brand_id || parseInt(req.body.brandId) || 1;
    const kind = whatsappService.mediaKindFromMime(file.mimetype);

    const mediaId = await whatsappService.uploadMedia(file.buffer, file.mimetype, file.originalname, brandId);
    const result = await whatsappService.sendMediaMessage(
      conv.customer_phone,
      { mediaId, kind, caption, filename: file.originalname },
      brandId,
    );

    // Store in the same JSON shape inbound media uses, so MsgContent renders it.
    const body = JSON.stringify({
      url: mediaId,
      mime: file.mimetype,
      caption: kind === 'document' ? file.originalname : (caption || null),
      text: caption || null,
    });
    const preview = kind === 'image' ? '📷 Photo'
      : kind === 'video' ? '🎥 Video'
      : kind === 'audio' ? '🎤 Audio'
      : `📎 ${file.originalname}`;

    const saved = await WhatsappMessage.create({
      conversation_id: id,
      wa_message_id:   result?.messages?.[0]?.id || null,
      direction:       'outbound',
      type:            kind,
      body,
      status:          'sent',
      sent_at:         new Date(),
      sent_by:         req.user?.id || null,
    });
    await conv.update(staffReplyUpdate(conv, caption || preview));

    res.json({ success: true, message: saved });
  } catch (err) {
    logger.error('[WhatsApp] sendMediaReply failed:', errMsg(err));
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Resolve conversation ─────────────────────────────────────────────────────
exports.resolveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    // Doubles as re-open: pass { status: 'open' } to move a resolved chat back.
    const target = req.body?.status === 'open' ? 'open' : 'resolved';
    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    await conv.update({ status: target });
    logger.info(`[WhatsApp] conversation ${id} → ${target}`);
    res.json({ success: true, status: conv.status });
  } catch (err) {
    logger.error(`[WhatsApp] resolve/reopen failed for ${req.params.id}: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send an approved template in a chat (works after the 24 h window) ────────
async function latestOrderForConv(conv) {
  try {
    const ctx = await require('../services/chatContextService.js').getChatContext(conv.id);
    const o = ctx?.orders?.[0];
    return o ? { ...o, customerName: ctx.address?.name || null } : null;
  } catch (_) { return null; }
}

exports.getTemplateOptions = async (req, res) => {
  try {
    const conv = await WhatsappConversation.findByPk(req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const latest = await latestOrderForConv(conv);
    const { templates, error } = await whatsappService.templateOptionsForConversation(conv, latest);
    const win = await replyWindow(conv);
    res.json({ success: true, templates, window_open: win.open, window_closes_at: win.closesAt, ...(error ? { error } : {}) });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

exports.sendTemplateMessage = async (req, res) => {
  try {
    const conv = await WhatsappConversation.findByPk(req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const templateName = String(req.body.templateName || req.body.template_name || '').trim();
    if (!templateName) return res.status(400).json({ success: false, message: 'templateName is required' });
    const latest = await latestOrderForConv(conv);
    let prep;
    try {
      prep = await whatsappService.prepareTemplateSend(conv, templateName, Array.isArray(req.body.params) ? req.body.params : undefined, latest);
    } catch (e) {
      return res.status(e.status || 500).json({ success: false, message: e.message });
    }
    let result;
    try {
      result = await whatsappService.sendTemplate(conv.customer_phone, prep.metaName, prep.params, prep.brandId, { ...prep.opts, staff: true });
    } catch (e) {
      const reason = whatsappService.metaError(e);
      await WhatsappMessage.create({
        conversation_id: conv.id, direction: 'outbound', type: 'template', body: prep.renderedBody,
        status: 'failed', sent_at: new Date(), template_name: prep.metaName, sent_by: req.user?.id || null,
        error_reason: String(reason).slice(0, 255),
      }).catch(() => {});
      return res.status(502).json({ success: false, message: `WhatsApp did not accept the message: ${reason}` });
    }
    if (result?.rate_limited) {
      return res.status(429).json({ success: false, message: 'Hourly message limit for this customer reached. Try again later.' });
    }
    const saved = await WhatsappMessage.create({
      conversation_id: conv.id,
      wa_message_id: result?.messages?.[0]?.id || null,
      direction: 'outbound',
      type: 'template',
      body: prep.renderedBody,
      status: 'sent',
      sent_at: new Date(),
      template_name: prep.metaName,
      sent_by: req.user?.id || null,
    });
    await conv.update(staffReplyUpdate(conv, prep.renderedBody.slice(0, 1000)));
    res.json({ success: true, message: saved });
  } catch (err) {
    logger.error('[WhatsApp] sendTemplateMessage failed: ' + errMsg(err));
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Templates ────────────────────────────────────────────────────────────────
// Meta's list + our ready-made defaults not created yet (status 'missing'),
// each with { title, used_by, read_rate } and status approved|pending|rejected|missing
// (raw Meta status kept as meta_status). ?force=1 re-reads statuses from Meta.
exports.listTemplates = async (req, res) => {
  try {
    const brandId = brandParam(req.query.brandId);
    const force = ['1', 'true', 'yes'].includes(String(req.query.force).toLowerCase());
    const data = await whatsappService.listTemplatesEnriched(brandId, { force });
    if (data.error && !data.templates.some((t) => t.status !== 'missing')) {
      return res.status(502).json({ success: false, message: `Could not read templates from WhatsApp: ${data.error}`, ...data });
    }
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

exports.submitMissingTemplates = async (req, res) => {
  try {
    const brandId = brandParam(req.body?.brandId);
    const r = await whatsappService.submitMissingTemplates(brandId);
    const created = r.results.filter((x) => x && x.status === 'created').length;
    const failed = r.results.filter((x) => x && x.status === 'error').length;
    res.json({ success: true, summary: { submitted: r.submitted.length, created, failed }, ...r });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Automations ──────────────────────────────────────────────────────────────
exports.getAutomations = async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    const report = await whatsappService.getAutomationReport({ days, brandId: brandParam(req.query.brandId) });
    res.json({ success: true, ...report });
  } catch (err) {
    logger.error('[WhatsApp] automations report failed: ' + err.message);
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

exports.setAutomation = async (req, res) => {
  try {
    const { key } = req.params;
    if (!whatsappService.AUTOMATIONS.some((a) => a.key === key)) {
      return res.status(404).json({ success: false, message: 'Unknown automatic message' });
    }
    if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ success: false, message: 'enabled (true/false) is required' });
    await whatsappService.setAutomationEnabled(key, req.body.enabled);
    logger.info(`[WhatsApp] automation ${key} → ${req.body.enabled ? 'on' : 'off'} by user ${req.user?.id}`);
    res.json({ success: true, key, enabled: req.body.enabled });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;
    const { name, category, language, components } = req.body;
    if (!name || !components?.length) {
      return res.status(400).json({ success: false, message: 'name and components are required' });
    }
    const result = await whatsappService.createTemplate({ name, category, language, components }, brandId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId) || 1;
    const { name } = req.params;
    const result = await whatsappService.deleteTemplate(name, brandId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// GET /templates/defaults — the canonical template definitions (names, category,
// preview) so the dashboard can list them and seed/update them individually.
exports.listDefaultTemplates = async (req, res) => {
  try {
    // Brand-aware when the dashboard passes ?brandId= (it does): names and
    // button URLs then show the brand's real domain template, so seeding by
    // the displayed name matches what gets created.
    const brandId = parseInt(req.query.brandId, 10);
    const defaults = Number.isFinite(brandId)
      ? await whatsappService.listBrandTemplateDefs(brandId)
      : whatsappService.listDefaultTemplateDefs();
    res.json({ success: true, defaults });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// POST /templates/seed — seed default templates. Pass body.names (array) to seed
// only those (single or a selected batch); omit to seed them all.
exports.seedTemplates = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;
    const names = Array.isArray(req.body.names) && req.body.names.length ? req.body.names : null;
    const results = await whatsappService.seedDefaultTemplates(brandId, names);
    const created  = results.filter(r => r.status === 'created').length;
    const skipped  = results.filter(r => r.status === 'already_exists').length;
    const failed   = results.filter(r => r.status === 'error').length;
    res.json({ success: true, summary: { created, skipped, failed }, results });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// PUT /templates/sync-all — delete + recreate default templates for re-approval.
// Pass body.names (array) to update only those; omit to update them all.
exports.syncAllTemplates = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;
    const names = Array.isArray(req.body.names) && req.body.names.length ? req.body.names : null;
    const results = await whatsappService.updateAllTemplates(brandId, names);
    const updated = results.filter(r => r.status === 'updated').length;
    const failed  = results.filter(r => r.status === 'error').length;
    res.json({ success: true, summary: { updated, failed, total: results.length }, results });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// PUT /templates/:name — delete + recreate a single named template
exports.updateTemplate = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId || req.query.brandId) || 1;
    const { name } = req.params;
    if (!name) return res.status(400).json({ success: false, message: 'Template name is required' });
    const result = await whatsappService.updateTemplate(name, brandId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Test connection ──────────────────────────────────────────────────────────
exports.testConnection = async (req, res) => {
  try {
    const { phone, brandId = 1 } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    const result = await whatsappService.testConnection(phone, parseInt(brandId));
    res.json({ success: true, message: 'Test message sent successfully', result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Auto-reply bot ───────────────────────────────────────────────────────────
// Called from receiveWebhook when an inbound message matches a keyword
// Resolve the correct brand's name + bare domain for auto-reply copy, so a
// shared WhatsApp number never shows "Cross Coin" to a Soxbae/Morbix/etc shopper.
async function brandCopy(brandId) {
  let name = null;
  try {
    const Brand = require('../model/brandModel.js');
    const b = await Brand.findByPk(brandId, { attributes: ['display_name', 'name'] });
    name = b && (b.display_name || b.name);
  } catch (_) { /* fall back below */ }
  const url = await whatsappService.getBrandDomain(brandId);
  return { name: name || 'our store', url };
}

// Keyword replies are saved to the chat (automation key 'chat_auto_replies').
// hi / track / return obey the on/off switch; STOP / START / CANCEL are always
// handled because they change the customer's state.
async function handleAutoReply(phone, text, brandId) {
  const lower = (text || '').toLowerCase().trim();
  const say = (msg, gate = true) => whatsappService.sendAutoText('chat_auto_replies', phone, msg, brandId, { gate });
  try {
    const { name: storeName, url: storeUrl } = await brandCopy(brandId);
    if (lower === 'track' || lower.startsWith('track ') || lower.includes('track my order') || lower.includes('where is my order')) {
      if (!(await whatsappService.isAutomationEnabled('chat_auto_replies'))) return;
      const { Order } = require('../model/orderModel.js');
      const [latest] = await recentOrdersByPhone(phone);
      const order = latest ? await Order.findByPk(latest.id) : null;
      if (order) {
        const trackUrl = await whatsappService.getTrackingUrl(order.brand_id || brandId, order.order_number);
        const reply = `📦 Your latest order *#${order.order_number}*\nStatus: *${order.status}*\nAWB: ${order.shipping_waybill || order.tracking_number || 'Not assigned yet'}\n\nTrack here: ${trackUrl}`;
        await say(reply);
        return;
      }
      await say(`We couldn't find an order linked to this number. Please share your order number and we'll help you right away!`);
      return;
    }

    if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
      await say(`👋 Hi! Welcome to *${storeName}*.\n\nHow can we help you today?\n\nReply with:\n• *track* — Track your order\n• *return* — Returns & refunds\n• *help* — Talk to our team`);
      return;
    }

    if (lower === 'return' || lower.includes('return') || lower.includes('exchange')) {
      await say(`↩️ *Returns & Refunds*\n\nWe accept returns within 7 days of delivery.\n\nTo initiate a return, please share your order number and reason.\n\nOr visit: https://${storeUrl}/policy`);
      return;
    }

    // One thread per phone on the shared number → opt-out is per PHONE (all
    // brands), never scoped by brand_id.
    const variants = (() => { const d = String(phone).replace(/\D/g, ''); const t = d.slice(-10); return [...new Set([d, t, `91${t}`, `+91${t}`])]; })();
    // STOP / opt-out words are handled (and confirmed) by
    // whatsappInsightsService.handleInboundAutomation before this runs; this is
    // only a silent safety net so the flag is set phone-wide even if an admin
    // removed "stop" from the opt-out word list.
    if (lower === 'stop' || lower === 'unsubscribe') {
      await WhatsappConversation.update({ opted_out: true }, { where: { customer_phone: variants } });
      return;
    }

    if (lower === 'start' || lower === 'subscribe') {
      await WhatsappConversation.update({ opted_out: false }, { where: { customer_phone: variants } });
      await say(`✅ You're now subscribed to ${storeName} WhatsApp updates. You'll receive order notifications and offers.`, false);
      return;
    }

    // Cancel window — customer replies CANCEL within 2h of placing a COD order.
    // Goes through the normal cancel (transaction, stock + coupon + points
    // restore, courier cancel, order.cancelled event).
    if (lower === 'cancel' || lower === 'cancel order') {
      try {
        const { Order } = require('../model/orderModel.js');
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const candidates = (await recentOrdersByPhone(phone)).filter((o) =>
          String(o.payment_type).toLowerCase() === 'cod'
          && ['awaiting_confirmation', 'confirmed', 'pending'].includes(String(o.status))
          && new Date(o.created_at).getTime() >= twoHoursAgo);
        const target = candidates[0] ? await Order.findByPk(candidates[0].id) : null;
        if (!target) {
          await say(`Your order is already being processed and cannot be cancelled via WhatsApp.\n\nTo cancel, please contact our support team with your order number.`, false);
          return;
        }
        const orderService = require('../services/orderService.js');
        await orderService.cancelOrder(target.id, { reason: 'Cancelled by customer via WhatsApp', cancelledBy: null, isAdmin: false });
        // order.cancelled sends the "Order cancelled" template; only add a text
        // when that automatic message is switched off.
        if (!(await whatsappService.isAutomationEnabled('order_cancelled'))) {
          await say(`✅ Your order *#${target.order_number}* has been cancelled.\n\nIf you have any questions, reply *help* to talk to our team.`, false);
        }
        logger.info(`Order ${target.order_number} cancelled via WhatsApp by …${String(phone).slice(-4)}`);
      } catch (cancelErr) {
        logger.error('WA cancel order error: ' + cancelErr.message);
        await say(`Sorry, we couldn't cancel this order on WhatsApp. Please contact support with your order number.`, false).catch(() => {});
      }
      return;
    }
  } catch (err) {
    logger.warn('Auto-reply error: ' + err.message);
  }
}

// Patch receiveWebhook to call auto-reply
// ─── COD address confirmation from a customer's WhatsApp reply ────────────────
// Handles a free-text YES/NO and a quick-reply button tap (payload
// "confirm_cod_<orderNumber>" / "reject_cod_<orderNumber>"): confirms the
// address, advances the order to `confirmed`, and fires order.confirmed so the
// shipping sync can proceed. Called from the LIVE webhook handler below.
async function processCodReply(phone, kind, value, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { sequelize: sq } = require('../config/db.js');
  const { Op: OpCod } = require('sequelize');
  const whatsappSvc = require('../services/whatsappService.js');
  const notificationService = require('../services/notificationService.js');

  let pendingOrder = null;
  let intent = null; // 'confirm' | 'reject'

  if (kind === 'button') {
    const payload = String(value || '');
    if (payload.startsWith('confirm_cod_')) intent = 'confirm';
    else if (payload.startsWith('reject_cod_')) intent = 'reject';
    if (!intent) return;
    const orderNumber = payload.replace(/^(confirm|reject)_cod_/, '');
    pendingOrder = await Order.findOne({
      where: { order_number: orderNumber, status: 'awaiting_confirmation', payment_type: 'cod', cod_address_confirmed: false },
    });
  } else {
    const normalised = String(value || '').trim().toLowerCase().replace(/[.!]+$/, '');
    // Only clear, intentional affirmations — ambiguous one-word fillers ('ok',
    // 'okay', 'ha', 'right', 'correct', 'y') were removed because a customer with
    // a pending COD order typing them in casual chat would silently auto-confirm
    // (and dispatch) the order. The quick-reply Confirm button (handled above) is
    // the primary, unambiguous path.
    const confirmKeywords  = ['yes', 'confirm', 'confirmed', 'haan', 'haan ji', 'sahi hai', 'theek hai', 'yes confirm', 'confirm order'];
    // EXACT whole-message match for BOTH intents. The old reject rule used
    // includes(), so an innocent "can I change the color?" matched "change" and
    // dropped the order into the wrong-address capture flow (next message stored
    // as a shipping address). Exact match removes those false positives.
    const rejectionKeywords = ['no', 'n', 'nahi', 'nahi ji', 'nope', 'wrong', 'incorrect', 'galat', 'wrong address', 'galat address', 'change address', 'update address', 'different address', 'change', 'update'];
    if (confirmKeywords.includes(normalised)) intent = 'confirm';
    else if (rejectionKeywords.includes(normalised)) intent = 'reject';
    if (!intent) return;
    // Shipping phones are encrypted → match orders by phone hash. Prefer the
    // order the most recent COD-confirmation message was about.
    const mine = (await recentOrdersByPhone(phone)).filter((o) =>
      o.status === 'awaiting_confirmation' && String(o.payment_type).toLowerCase() === 'cod');
    if (!mine.length) return;
    let preferred = null;
    try {
      const { WhatsappConversation: WC, WhatsappMessage: WM } = require('../model/whatsappConversationModel.js');
      const d = String(phone).replace(/\D/g, ''); const t10 = d.slice(-10);
      const conv = await WC.findOne({ where: { customer_phone: [...new Set([d, t10, `91${t10}`, `+91${t10}`])] }, attributes: ['id'] });
      if (conv) {
        const last = await WM.findOne({
          where: { conversation_id: conv.id, direction: 'outbound', template_name: { [OpCod.like]: 'cod_order_confirmation%' } },
          order: [['id', 'DESC']], attributes: ['body'],
        });
        if (last?.body) preferred = mine.find((o) => String(last.body).includes(o.order_number)) || null;
      }
    } catch (_) { /* fall back to the newest */ }
    const pick = preferred || mine[0];
    pendingOrder = await Order.findOne({
      where: { id: pick.id, status: 'awaiting_confirmation', payment_type: 'cod', cod_address_confirmed: false },
    });
  }

  if (!pendingOrder) return;

  if (intent === 'confirm') {
    const t = await sq.transaction();
    try {
      // Conditional atomic update: only the FIRST confirmation wins. Two inbound
      // confirmations racing (button tap + "yes", or a Meta double-delivery
      // across parallel requests) both read status='awaiting_confirmation'
      // before either commits; without this guard both would emit order.confirmed
      // → duplicate confirmation message + shipping sync run twice (double ship).
      const [affected] = await Order.update(
        { cod_address_confirmed: true, cod_address_confirmed_at: new Date(), status: 'confirmed' },
        { where: { id: pendingOrder.id, status: 'awaiting_confirmation', cod_address_confirmed: false }, transaction: t }
      );
      if (!affected) { await t.rollback(); return; } // already confirmed by a concurrent reply
      await OrderStatusHistory.create({
        order_id: pendingOrder.id, status: 'confirmed',
        notes: `Auto-confirmed: customer ${kind === 'button' ? 'tapped Confirm Address' : 'replied YES'} via WhatsApp`,
        updated_by: null,
      }, { transaction: t });
      await t.commit();
    } catch (txErr) { await t.rollback(); throw txErr; }

    // Emitting order.confirmed sends the 'order_confirmation' (thank-you +
    // processing) template — no separate text here, so the customer gets ONE
    // clean confirmation message per the merged-stage design.
    const orderEmitter = require('../services/orderEvents.js');
    setImmediate(() => { try { pendingOrder._customerConfirmed = true; orderEmitter.emit('order.confirmed', pendingOrder); } catch (e) { logger.warn('[WhatsApp] order.confirmed emit failed: ' + e.message); } });
    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_confirmed' });
    logger.info(`[WhatsApp] COD address confirmed → order ${pendingOrder.order_number}`);
  } else {
    // Wrong address → ask for the corrected address and remember which order the
    // customer's next message should update.
    const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
    await WhatsappConversation.update({ awaiting_address_for: pendingOrder.order_number }, { where: { customer_phone: phone } });
    const addr = await ShippingAddress.findByPk(pendingOrder.shipping_address_id).catch(() => null);
    const firstName = (addr?.full_name || '').split(' ')[0] || 'there';
    await whatsappSvc.sendAddressRequest(phone, { name: firstName, orderNumber: pendingOrder.order_number }, brandId);
    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_rejected' });
    logger.warn(`[WhatsApp] COD address rejected → requested new address for ${pendingOrder.order_number}`);
  }
}

// ─── Capture a customer's corrected delivery address (Wrong Address flow) ─────
// Fired when the customer's text reply arrives while their conversation is
// flagged awaiting_address_for a specific order. Updates the shipping address
// (+ extracts the pincode) and re-sends the COD confirmation so they can confirm.
async function captureNewAddress(phone, addressText, orderNumber, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
  const whatsappSvc = require('../services/whatsappService.js');

  // Clear the flag first so we never double-capture the same reply.
  await WhatsappConversation.update({ awaiting_address_for: null }, { where: { customer_phone: phone } });

  const order = await Order.findOne({ where: { order_number: orderNumber, status: 'awaiting_confirmation', payment_type: 'cod' } });
  if (!order) return;
  const addr = await ShippingAddress.findByPk(order.shipping_address_id);
  if (!addr) return;

  // A NEW address row for this order — never edit the shared address-book row
  // (it is also used by the customer's other orders and invoices). Rejects a
  // reply without a full address / PIN and asks again.
  const r = await require('../services/ndrService.js').applyNewAddressToOrder(order.id, addressText);
  if (!r.ok) {
    await WhatsappConversation.update({ awaiting_address_for: orderNumber }, { where: { customer_phone: phone } });
    return whatsappSvc.sendTextMessage(phone, r.message, brandId);
  }

  const firstName = (addr.full_name || '').split(' ')[0] || 'there';
  await whatsappSvc.sendCodConfirmation(phone, {
    name: firstName,
    orderNumber: order.order_number,
    amount: parseFloat(order.final_amount).toFixed(2),
    fullAddress: r.address.text,
  }, brandId);
  logger.info(`[WhatsApp] Captured corrected COD address for ${orderNumber} (pincode ${r.address.pincode})`);
}

// ─── Webhook: receive (POST) ──────────────────────────────────────────────────
// Always responds 200 immediately so Meta doesn't retry, then processes the
// batch (inbound messages + status updates) asynchronously.
exports.receiveWebhook = async (req, res) => {
  res.status(200).json({ status: 'ok' });
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;
    // Only a signature-VERIFIED webhook may trigger automated outbound messages
    // or mutate orders. When WHATSAPP_WEBHOOK_SECRET is unset the signature
    // middleware lets the request through (so inbound messages still record
    // during setup) but marks it unverified — we then record the message but do
    // NOT run the COD confirm/cancel/restock flow or the auto-reply bot, closing
    // the forged-COD / spoofed-inbound attack. Set the secret to re-enable them.
    const trusted = req.webhookVerified !== false;
    if (!trusted) logger.warn('[WhatsApp] unverified webhook — recording message only, skipping COD/auto-reply. Set WHATSAPP_WEBHOOK_SECRET to enable.');
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        for (const msg of (value.messages || [])) {
         // Isolate each message: one bad row (e.g. a duplicate-key race on a Meta
         // redelivery, or a malformed payload) must NOT abort the rest of the
         // batch. We already returned 200, so Meta will never retry — an uncaught
         // throw here would permanently drop every remaining message/status in
         // this same webhook payload (silent inbound/status loss under load).
         try {
          const phone       = msg.from;
          const waMessageId = msg.id;
          const sentAt      = new Date(parseInt(msg.timestamp) * 1000);

          // ── De-duplicate FIRST (Meta webhooks are at-least-once) ─────────
          // The same messages[].id is redelivered on any timeout/retry. Doing
          // this before the brand/name resolvers below (which run un-indexable
          // LIKE scans over shipping_addresses + guest_users) means a retry
          // storm doesn't re-run those scans just to discard the row. Without
          // the guard a redelivery also double-bumped unread and re-fired the
          // auto-reply / COD handlers.
          if (waMessageId) {
            const seen = await WhatsappMessage.findOne({ where: { wa_message_id: waMessageId }, attributes: ['id'] });
            if (seen) {
              logger.info(`WhatsApp inbound [${phone}] duplicate ${waMessageId} — skipped`);
              continue;
            }
          }

          // Live WhatsApp profile name (cheap — it's already in the webhook
          // payload). The expensive brand/name lookups from the customer's orders
          // are deferred below and run only for a genuinely NEW conversation.
          const waName = value.contacts?.find(c => c.wa_id === phone)?.profile?.name || null;

          // ── Resolve message type + body + media_url ──────────────────────
          let msgType = 'text';
          let text    = '';
          let mediaUrl = null;
          let mediaMime = null;
          let mediaCaption = null;
          let buttonPayload = null;

          switch (msg.type) {
            case 'text':
              msgType  = 'text';
              text     = msg.text?.body || '';
              break;
            case 'image':
              msgType      = 'image';
              mediaUrl     = msg.image?.url || msg.image?.id || null;
              mediaMime    = msg.image?.mime_type || 'image/jpeg';
              mediaCaption = msg.image?.caption || null;
              text         = mediaCaption || '📷 Image';
              break;
            case 'audio':
            case 'voice':
              msgType  = 'audio';
              mediaUrl = msg.audio?.url || msg.audio?.id || msg.voice?.url || msg.voice?.id || null;
              mediaMime = msg.audio?.mime_type || msg.voice?.mime_type || 'audio/ogg';
              text     = '🎤 Voice message';
              break;
            case 'video':
              msgType      = 'video';
              mediaUrl     = msg.video?.url || msg.video?.id || null;
              mediaMime    = msg.video?.mime_type || 'video/mp4';
              mediaCaption = msg.video?.caption || null;
              text         = mediaCaption || '🎥 Video';
              break;
            case 'document':
              msgType      = 'document';
              mediaUrl     = msg.document?.url || msg.document?.id || null;
              mediaMime    = msg.document?.mime_type || 'application/octet-stream';
              mediaCaption = msg.document?.filename || msg.document?.caption || null;
              text         = mediaCaption || '📎 Document';
              break;
            case 'sticker':
              msgType  = 'image';
              mediaUrl = msg.sticker?.url || msg.sticker?.id || null;
              text     = '🎭 Sticker';
              break;
            case 'location':
              msgType = 'text';
              text    = `📍 Location: ${msg.location?.name || ''} (${msg.location?.latitude}, ${msg.location?.longitude})`;
              break;
            case 'contacts':
              msgType = 'text';
              text    = `👤 Contact: ${msg.contacts?.[0]?.name?.formatted_name || 'Shared contact'}`;
              break;
            case 'reaction':
              msgType = 'reaction';
              text    = msg.reaction?.emoji || '👍';
              break;
            case 'button':
              // Quick-reply button tap (e.g. COD "Confirm Address").
              msgType       = 'button';
              buttonPayload = msg.button?.payload || msg.button?.text || '';
              text          = msg.button?.text || 'Button tap';
              break;
            case 'interactive':
              // Interactive reply (button_reply / list_reply) also carries a payload.
              msgType       = 'button';
              buttonPayload = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || '';
              text          = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || 'Selection';
              break;
            default:
              msgType = 'text';
              text    = `[${msg.type}]`;
          }

          // Only true media types store a JSON metadata blob in `body`; reactions
          // store the emoji, buttons store their payload, everything else the text.
          const MEDIA_TYPES = ['image', 'video', 'audio', 'document'];
          const bodyContent = MEDIA_TYPES.includes(msgType)
            ? JSON.stringify({ url: mediaUrl, mime: mediaMime, caption: mediaCaption, text })
            : (msgType === 'button' ? (buttonPayload || text) : text);

          // A bracketed token like "[unsupported]" is our marker for a format the
          // Cloud API can't deliver (polls, view-once, newer interactive types).
          // Keep the marker in `body` (the chat bubble renders it nicely) but show
          // a human label in the inbox preview instead of the raw token.
          const lastMsgPreview = /^\[[a-z_]+\]$/i.test(text)
            ? (text === '[unsupported]'
                ? 'Unsupported message'
                : text.replace(/^\[|\]$/g, '').replace(/_/g, ' ') + ' message')
            : text;

          // Prefer the brand the customer NAMED in this text ("...my Morbix
          // order") over the phone-based guess — that's what makes the inbox
          // badge show the right brand. Only override on an explicit mention so
          // a later "yes" doesn't flip an already-attributed conversation back.
          const namedBrand = msgType === 'text' ? await detectBrandFromText(text) : null;
          // An order number in the message (COD confirm/reject button payload,
          // or quoted in text) is the strongest brand signal — it pins the
          // thread to that exact order's brand (so a Soxbae address confirmation
          // is tagged Soxbae, not the customer's most-recent brand).
          const refBrand = await resolveBrandByOrderRef(buttonPayload || text);
          const resolvedBrand = refBrand || namedBrand;

          // ── Hot path: find the existing thread by its INDEXED phone FIRST ──
          // A shared number across 7 brands takes a high inbound volume, and the
          // resolveBrandByPhone / resolveCustomerNameByPhone helpers run
          // un-indexable `LIKE '%digits'` scans over orders⋈shipping_addresses
          // and orders⋈guest_users that grow with total order count. For a thread
          // we've already seen we already know the brand + name, so skip those
          // scans entirely and pay for them only when a brand-new customer first
          // writes. This was the main source of WhatsApp DB load.
          let conv = await WhatsappConversation.findOne({ where: { customer_phone: phone } });
          let created = false;
          if (!conv) {
            // New customer → now (and only now) resolve brand + name from orders.
            const phoneBrand  = resolvedBrand || await resolveBrandByPhone(phone);
            const contactName = waName || await resolveCustomerNameByPhone(phone);
            const fc = await WhatsappConversation.findOrCreate({
              where: { customer_phone: phone },
              defaults: { brand_id: phoneBrand, customer_name: contactName, wa_contact_id: phone, last_message: lastMsgPreview, last_message_at: sentAt, last_inbound_at: sentAt, unread_count: 1, status: 'open' },
            });
            conv = fc[0]; created = fc[1]; // created=false only if a concurrent inbound won the race
          }
          if (!created) {
            const upd = { status: 'open' };
            // Any customer message (re)opens the 24-hour reply window.
            const prevIn = conv.last_inbound_at ? new Date(conv.last_inbound_at) : null;
            if (!prevIn || sentAt > prevIn) upd.last_inbound_at = sentAt;
            // Fill the name only when we actually have a better one; never run an
            // extra order scan for a thread that already has a name.
            if (waName && waName !== conv.customer_name) upd.customer_name = waName;
            else if (!conv.customer_name) {
              const nm = await resolveCustomerNameByPhone(phone);
              if (nm) upd.customer_name = nm;
            }
            if (resolvedBrand) upd.brand_id = resolvedBrand; // re-attribute on an explicit brand mention OR an order reference
            // A reaction (👍) is not a "message": it must not become the inbox
            // preview nor mark the thread unread.
            if (msgType !== 'reaction') {
              upd.last_message = lastMsgPreview;
              // Never move the inbox timestamp backwards on an out-of-order
              // delivery (Meta can deliver an older message after a newer one),
              // which would misorder the DESC inbox and confuse the stream `since`.
              const prevAt = conv.last_message_at ? new Date(conv.last_message_at) : null;
              upd.last_message_at = (prevAt && sentAt < prevAt) ? prevAt : sentAt;
              // Atomic increment so two concurrent inbound webhooks can't both
              // read the same base value and lose a count.
              upd.unread_count = WhatsappConversation.sequelize.literal('unread_count + 1');
            }
            await conv.update(upd);
          }

          // The brand for COD confirmations and the auto-reply bot is the thread's
          // attributed brand — no re-resolving by phone on every message.
          const effectiveBrand = conv.brand_id || resolvedBrand || 1;

          await WhatsappMessage.create({
            conversation_id: conv.id,
            wa_message_id:   waMessageId,
            direction:       'inbound',
            type:            msgType,
            body:            bodyContent,
            status:          'received',
            sent_at:         sentAt,
          });

          const notificationService = require('../services/notificationService.js');
          notificationService.emitNewWhatsApp(phone, lastMsgPreview);
          logger.info(`WhatsApp inbound [${phone}] (${msgType}): ${lastMsgPreview}`);

          // COD flow:
          //  • if we're awaiting a corrected address from this customer, their
          //    next text IS the new address → capture it and re-confirm;
          //  • otherwise a text YES/NO or "Confirm Address" button advances the
          //    pending COD order to `confirmed`.
          if (trusted && msgType === 'text' && text && String(conv.awaiting_address_for || '').startsWith('ndr:')) {
            // Failed delivery: the customer tapped Change Address; this is it.
            const _orderNo = conv.awaiting_address_for.slice(4);
            setImmediate(() => require('../services/ndrService.js').onNewAddress(_orderNo, text, phone, effectiveBrand).catch(e => logger.error('[WhatsApp] NDR address error: ' + e.message)));
          } else if (trusted && msgType === 'text' && text && conv.awaiting_address_for) {
            const _orderNo = conv.awaiting_address_for;
            setImmediate(() => captureNewAddress(phone, text, _orderNo, effectiveBrand).catch(e => logger.error('[WhatsApp] capture address error: ' + e.message)));
          } else if (trusted && msgType === 'button' && /^ndr_(retry|address|cancel)_/.test(buttonPayload || '')) {
            const [, _choice, _orderNo] = buttonPayload.match(/^ndr_(retry|address|cancel)_(.+)$/);
            setImmediate(() => require('../services/ndrService.js').onCustomerChoice(_orderNo, _choice, phone, effectiveBrand).catch(e => logger.error('[WhatsApp] NDR reply error: ' + e.message)));
          } else if (trusted && msgType === 'text' && text) {
            setImmediate(() => processCodReply(phone, 'text', text, effectiveBrand).catch(e => logger.error('[WhatsApp] COD text reply error: ' + e.message)));
          } else if (trusted && msgType === 'button' && buttonPayload) {
            setImmediate(() => processCodReply(phone, 'button', buttonPayload, effectiveBrand).catch(e => logger.error('[WhatsApp] COD button reply error: ' + e.message)));
          }

          // Inbound automation (opt-out words, "where is my order", away
          // message — whatsappInsightsService) first; if it didn't answer, the
          // keyword bot. Plain text that isn't a captured address only, and only
          // on a verified webhook (never let a spoofed inbound make our number
          // send to an attacker-chosen recipient).
          if (trusted && msgType !== 'reaction') {
            setImmediate(async () => {
              let auto = { handled: false };
              try { auto = await require('../services/whatsappInsightsService.js').handleInboundAutomation(conv, { type: msgType, body: text, awaitingAddress: !!conv.awaiting_address_for }); } catch (e) { logger.warn('[WhatsApp] inbound automation error: ' + e.message); }
              if (!auto.handled && msg.type === 'text' && !conv.awaiting_address_for) await handleAutoReply(phone, text, effectiveBrand).catch(() => {});
            });
          }
         } catch (msgErr) {
          logger.error(`[WhatsApp] webhook message handler error (${msg?.id || 'no-id'}): ${msgErr.message}`);
         }
        }
        // Meta status updates: sent → delivered → read. (first_response_at is
        // stamped when an AGENT sends a reply — see sendReply — not on the
        // delivery of automated notifications, so SLA stays meaningful.)
        //
        // Apply monotonically: Meta can deliver `read` and then a delayed
        // `delivered` for the same message. Only advance the stored status,
        // never regress it (which would skew the delivered/read stats), while
        // `failed` always wins (terminal error).
        //
        // Batch the reads: Meta packs many status updates into one webhook, so
        // load every referenced message in a single IN(...) query instead of a
        // findOne per status (was N serial round-trips per webhook under volume).
        const statuses = value.statuses || [];
        if (statuses.length) {
          const RANK = { received: 0, sent: 1, delivered: 2, read: 3 };
          let byWaId = new Map();
          try {
            const ids = [...new Set(statuses.map(s => s.id).filter(Boolean))];
            if (ids.length) {
              const rows = await WhatsappMessage.findAll({ where: { wa_message_id: ids }, attributes: ['id', 'wa_message_id', 'status'] });
              byWaId = new Map(rows.map(r => [r.wa_message_id, { id: r.id, status: r.status }]));
            }
          } catch (e) {
            logger.error(`[WhatsApp] webhook status batch-read error: ${e.message}`);
          }
          for (const status of statuses) {
            // Isolate each status — a throw must not drop the rest of this
            // already-200'd payload.
            try {
              const existing = byWaId.get(status.id);
              if (!existing) continue;
              const cur = existing.status;
              const next = status.status;
              let shouldApply;
              if (cur === 'failed') shouldApply = false;              // failed is terminal
              else if (next === 'failed') shouldApply = true;         // a failure always wins
              else shouldApply = (RANK[next] ?? -1) > (RANK[cur] ?? -1); // otherwise only advance
              if (shouldApply) {
                // Log WHY a send failed so it's diagnosable (kept out of `body`
                // so the agent's original text is never clobbered).
                if (next === 'failed' && Array.isArray(status.errors) && status.errors.length) {
                  const e = status.errors[0];
                  logger.warn(`[WhatsApp] message ${status.id} failed: ${(e.title || e.message || 'error')}${e.code ? ' (code ' + e.code + ')' : ''}`);
                }
                const statusUpd = { status: next };
                if (next === 'failed' && Array.isArray(status.errors) && status.errors.length) {
                  const e = status.errors[0];
                  statusUpd.error_reason = String(e.error_data?.details || e.title || e.message || 'Failed').slice(0, 240) + (e.code ? ` (code ${e.code})` : '');
                }
                await WhatsappMessage.update(statusUpd, { where: { id: existing.id } });
                existing.status = next; // keep the map current if the same id recurs in this batch
              }
            } catch (statusErr) {
              logger.error(`[WhatsApp] webhook status handler error (${status?.id || 'no-id'}): ${statusErr.message}`);
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error('WhatsApp webhook error: ' + err.message);
  }
};

// ─── Set conversation brand ───────────────────────────────────────────────────
// Manual override for the inbox brand badge: a shared number can't always detect
// the brand from the message or an order, so let staff set it explicitly.
exports.setConversationBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brandId = parseInt(req.body.brandId);
    if (!brandId) return res.status(400).json({ success: false, message: 'brandId is required' });
    const [updated] = await WhatsappConversation.update({ brand_id: brandId }, { where: { id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, brand_id: brandId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Private agent note on a conversation ─────────────────────────────────────
exports.setConversationNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = typeof req.body.note === 'string' ? req.body.note.slice(0, 5000) : '';
    const [updated] = await WhatsappConversation.update({ agent_notes: note }, { where: { id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, agent_notes: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Canned Responses ─────────────────────────────────────────────────────────
// Quick replies are shared by every brand ({brand} fills in per customer), so
// no brandId = all of them. Each has a category tab and a `uses` counter.
const CANNED_CATEGORIES = ['orders', 'returns', 'products', 'other'];
const cleanCategory = (c) => (CANNED_CATEGORIES.includes(String(c || '').toLowerCase()) ? String(c).toLowerCase() : 'other');
const cleanShortcut = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '');

exports.getCannedResponses = async (req, res) => {
  try {
    const brandId = brandParam(req.query.brandId);
    const where = brandId ? { brand_id: brandId } : {};
    if (req.query.category && CANNED_CATEGORIES.includes(req.query.category)) where.category = req.query.category;
    const rows = await WhatsappCannedResponse.findAll({ where, order: [['uses', 'DESC'], ['shortcut', 'ASC']] });
    res.json({ success: true, cannedResponses: rows, categories: CANNED_CATEGORIES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCannedResponse = async (req, res) => {
  try {
    const { shortcut, title, body, category } = req.body;
    const brandId = brandParam(req.body.brandId) || 1;
    if (!shortcut || !title || !body) return res.status(400).json({ success: false, message: 'shortcut, title and body are required' });
    const row = await WhatsappCannedResponse.create({
      brand_id: brandId, shortcut: cleanShortcut(shortcut), title, body, category: cleanCategory(category), created_by: req.user?.id || null,
    });
    res.json({ success: true, cannedResponse: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCannedResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { shortcut, title, body, category } = req.body;
    const upd = {};
    if (shortcut != null) upd.shortcut = cleanShortcut(shortcut);
    if (title != null) upd.title = title;
    if (body != null) upd.body = body;
    if (category != null) upd.category = cleanCategory(category);
    const row = await WhatsappCannedResponse.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.update(upd);
    res.json({ success: true, cannedResponse: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markCannedResponseUsed = async (req, res) => {
  try {
    const [n] = await WhatsappCannedResponse.update(
      { uses: WhatsappCannedResponse.sequelize.literal('uses + 1') },
      { where: { id: req.params.id }, silent: true });
    if (!n) return res.status(404).json({ success: false, message: 'Not found' });
    const row = await WhatsappCannedResponse.findByPk(req.params.id, { attributes: ['id', 'uses'] });
    res.json({ success: true, id: row.id, uses: row.uses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCannedResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await WhatsappCannedResponse.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Seed default canned responses ───────────────────────────────────────────
exports.seedCannedResponses = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;

    // Brand-neutral: one shared number serves every store, so the wording uses
    // the {name} {order} {courier} {tracking_link} {brand} placeholders the
    // inbox fills per customer (never a hard-coded store name or URL).
    const defaults = [
      // Orders
      { category: 'orders', shortcut: '/track',       title: 'Track Order',         body: `📦 Hi {name}, your order {order} is with {courier}. Track it here: {tracking_link}` },
      { category: 'orders', shortcut: '/orderstatus', title: 'Order Status',        body: `✅ Your order {order} is being processed. You'll get a shipping message with tracking details once it's dispatched — usually within 1-2 working days. 😊` },
      { category: 'orders', shortcut: '/delay',       title: 'Order Delay',         body: `🙏 Sorry for the delay with order {order}. Our team is on it and it will be dispatched within 24 hours. Thank you for your patience!` },
      { category: 'orders', shortcut: '/shipped',     title: 'Order Shipped',       body: `🚚 Good news {name}! Order {order} has shipped with {courier}.\n\nTrack here: {tracking_link}` },
      { category: 'orders', shortcut: '/cancel',      title: 'Cancel Order',        body: `We're sorry to hear you'd like to cancel. Orders can be cancelled before dispatch; once shipped it isn't possible.\n\nPlease share your order number and we'll check it for you.` },
      { category: 'orders', shortcut: '/address',     title: 'Change Address',      body: `📍 The address can be changed only *before the order is dispatched*. Please share the new address for {order} with house number, landmark and PIN code.` },
      // Returns & refunds
      { category: 'returns', shortcut: '/return',     title: 'Return Policy',       body: `↩️ You can request a return within *7 days* of delivery for a wrong, damaged or defective item.\n\nPlease share:\n1. Order number\n2. A photo of the product\n3. Reason for return` },
      { category: 'returns', shortcut: '/refund',     title: 'Refund Status',       body: `💰 Refunds reach your original payment method in *5-7 working days* after we receive the returned item. Please share your order number to check the status.` },
      { category: 'returns', shortcut: '/damaged',    title: 'Damaged Product',     body: `😔 We're really sorry you received a damaged product, {name}! Please share the order number and clear photos of the damage — we'll arrange a replacement or refund right away.` },
      // Payment / product
      { category: 'other', shortcut: '/payment',      title: 'Payment Methods',     body: `💳 *Payment options at {brand}:*\n\n• UPI (GPay, PhonePe, Paytm)\n• Credit/Debit Card\n• Net Banking\n• Cash on Delivery (COD)\n\nAll online payments are 100% secure. 🔒` },
      { category: 'other', shortcut: '/cod',          title: 'COD Info',            body: `🏠 *Cash on Delivery is available!* Just pick COD at checkout and keep the amount ready at delivery.` },
      { category: 'other', shortcut: '/paymentfail',  title: 'Payment Failed',      body: `❌ Sorry your payment didn't go through! Please check your balance or try another method.\n\nIf money was deducted but no order was placed, it is refunded automatically in 5-7 days.` },
      { category: 'products', shortcut: '/size',      title: 'Size Guide',          body: `📏 Tell us your shoe size and we'll recommend the right {brand} size for you. When in doubt, size up! 😊` },
      { category: 'products', shortcut: '/stock',     title: 'Stock Availability',  body: `🔍 Let me check the stock for you! Please share the product name or link.` },
      { category: 'products', shortcut: '/restock',   title: 'Restock Notification', body: `🔔 Noted! We'll message you here as soon as this product is back in stock.` },
      { category: 'products', shortcut: '/bulk',      title: 'Bulk Order',          body: `📦 *Bulk orders welcome!* For 10+ pairs we offer special pricing. Please share the product, quantity and when you need it — we'll reply with a quote within 24 hours.` },
      { category: 'other', shortcut: '/shipping',     title: 'Shipping Info',       body: `🚚 We ship across India 🇮🇳 — delivery usually takes 3-7 working days.` },
      // General
      { category: 'other', shortcut: '/hi',           title: 'Welcome Greeting',    body: `👋 Hi {name}! Welcome to *{brand}*. How can I help you today?` },
      { category: 'other', shortcut: '/thanks',       title: 'Thank You',           body: `🙏 Happy to help, {name}! Anything else, just message here. — Team {brand}` },
    ];

    // Create-only: a default whose shortcut already exists is skipped, so
    // re-seeding never overwrites a reply staff have edited.
    let created = 0; let skipped = 0;
    for (const cr of defaults) {
      const existing = await WhatsappCannedResponse.findOne({ where: { brand_id: brandId, shortcut: cr.shortcut } });
      if (!existing) {
        await WhatsappCannedResponse.create({ brand_id: brandId, ...cr });
        created++;
      } else {
        skipped++;
      }
    }
    res.json({ success: true, summary: { created, skipped, updated: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Broadcast Campaigns ──────────────────────────────────────────────────────
async function brandNameMap() {
  try {
    const Brand = require('../model/brandModel.js');
    const rows = await Brand.findAll({ attributes: ['id', 'name', 'display_name'] });
    return Object.fromEntries(rows.map((b) => [b.id, b.display_name || b.name]));
  } catch (_) { return {}; }
}

exports.getBroadcasts = async (req, res) => {
  try {
    const brandId = brandParam(req.query.brandId);
    const rows = await WhatsappBroadcast.findAll({ order: [['createdAt', 'DESC']], limit: 200 });
    const brands = await brandNameMap();
    const items = rows.map((r) => ({ row: r, aud: whatsappService.audienceLabel(r.audience_filter, brands) }))
      // A brand view shows that brand's broadcasts; all-brand broadcasts only in the all view.
      .filter(({ row, aud }) => !brandId || aud.brandId === brandId || (!aud.type && row.brand_id === brandId))
      .slice(0, 100);
    const results = await whatsappService.broadcastResults(items.map((x) => x.row.id));
    const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const summary = { sent_30d: 0, broadcasts_30d: 0, delivered_30d: 0, read_30d: 0, orders: 0, sales: 0, stop_replies: 0 };
    const broadcasts = items.map(({ row, aud }) => {
      const r = results.get(row.id) || {};
      const j = row.toJSON();
      if (new Date(row.createdAt).getTime() >= since30 && row.status !== 'cancelled') {
        summary.broadcasts_30d++; summary.sent_30d += row.sent_count || 0;
        summary.delivered_30d += r.delivered || 0; summary.read_30d += r.read || 0;
        summary.orders += r.orders || 0; summary.sales += r.sales || 0; summary.stop_replies += r.stop_replies || 0;
      }
      return {
        ...j,
        audience_type: aud.type,
        audience_label: aud.label,
        audience_brand_id: aud.brandId,
        brand_label: aud.brand_label,
        delivered: r.delivered || 0,
        read: r.read || 0,
        orders: r.orders || 0,
        sales: r.sales || 0,
        stop_replies: r.stop_replies || 0,
        can_cancel: ['scheduled', 'draft', 'paused', 'running'].includes(row.status),
      };
    });
    summary.read_pct = summary.delivered_30d ? Math.round((summary.read_30d / summary.delivered_30d) * 100) : null;
    summary.stop_pct = summary.sent_30d ? Math.round((summary.stop_replies / summary.sent_30d) * 1000) / 10 : null;
    res.json({ success: true, broadcasts, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBroadcastAudience = async (req, res) => {
  try {
    const type = String(req.query.type || 'all');
    if (!whatsappService.AUDIENCES[type]) return res.status(400).json({ success: false, message: 'Unknown audience type' });
    const data = await whatsappService.audienceCount(type, brandParam(req.query.brandId));
    res.json({ success: true, type, label: whatsappService.AUDIENCES[type].label, ...data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /broadcasts { name, template_name, audience:{type, brandId}, scheduled_at|null, params? }
// (legacy camelCase templateName / audienceFilter / scheduledAt / brandId still
// accepted). scheduled_at null = send now — it starts by itself (no /run call
// needed); outside 10:00–20:00 IST it waits for the next sending window.
exports.createBroadcast = async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const templateName = String(b.template_name || b.templateName || '').trim();
    if (!name || !templateName) return res.status(400).json({ success: false, message: 'name and template_name are required' });
    const audIn = (b.audience && typeof b.audience === 'object') ? b.audience
      : (b.audienceFilter && typeof b.audienceFilter === 'object') ? b.audienceFilter : {};
    const type = String(audIn.type || 'all');
    if (!whatsappService.AUDIENCES[type]) return res.status(400).json({ success: false, message: 'Unknown audience type' });
    const audBrand = brandParam(audIn.brandId != null ? audIn.brandId : b.brandId);
    const params = Array.isArray(b.params) ? b.params.map((p) => String(p == null ? '' : p)) : null;

    // Store the EXACT approved name Meta knows ("popup_coupon" → "popup_coupon_v2").
    const resolvedTemplate = await whatsappService.resolveApprovedTemplateName(templateName, audBrand || whatsappService.SHARED_WA_BRAND_ID);
    if (!resolvedTemplate) {
      return res.status(400).json({ success: false, message: `"${templateName}" is not an approved WhatsApp template. Pick one from the Templates list.` });
    }
    const check = await whatsappService.checkBroadcastParams(resolvedTemplate, params);
    if (!check.ok) return res.status(400).json({ success: false, message: `This template also needs: ${check.missing.join(', ')}`, needs: check.missing });

    const rawWhen = b.scheduled_at !== undefined ? b.scheduled_at : b.scheduledAt;
    let when = rawWhen ? new Date(rawWhen) : new Date();
    if (rawWhen && Number.isNaN(when.getTime())) return res.status(400).json({ success: false, message: 'scheduled_at is not a valid date' });
    const sendNow = !rawWhen || when.getTime() <= Date.now();
    if (sendNow) when = new Date();

    const row = await WhatsappBroadcast.create({
      brand_id: audBrand || whatsappService.SHARED_WA_BRAND_ID,
      name: name.slice(0, 150),
      template_name: resolvedTemplate,
      audience_filter: JSON.stringify({ type, brandId: audBrand, ...(params ? { params } : {}) }),
      status: 'scheduled',
      scheduled_at: when,
      created_by: req.user?.id || null,
    });
    const startsAt = whatsappService.nextSendingTime(when);
    if (sendNow && whatsappService.isSendingHours()) {
      setImmediate(() => whatsappService.runBroadcastJob(row.id).catch((e) => logger.error(`[Broadcast ${row.id}] start failed: ${e.message}`)));
    }
    res.json({ success: true, broadcast: row, starts_at: startsAt, waits_for_sending_hours: startsAt.getTime() > when.getTime() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelBroadcast = async (req, res) => {
  try {
    const [n] = await WhatsappBroadcast.update(
      { status: 'cancelled' },
      { where: { id: req.params.id, status: ['scheduled', 'draft', 'paused', 'running'] } });
    if (!n) {
      const row = await WhatsappBroadcast.findByPk(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'Broadcast not found' });
      return res.status(409).json({ success: false, message: `This broadcast is already ${row.status}.` });
    }
    res.json({ success: true, status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Legacy "run" for drafts (admin). Atomic: only a draft/scheduled/paused
// broadcast can start; a running or finished one gets 409.
exports.runBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const [n] = await WhatsappBroadcast.update(
      { status: 'scheduled', scheduled_at: new Date() },
      { where: { id, status: ['draft', 'scheduled', 'paused'] } });
    if (!n) {
      const row = await WhatsappBroadcast.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Broadcast not found' });
      return res.status(409).json({ success: false, message: `This broadcast is already ${row.status}.` });
    }
    if (!whatsappService.isSendingHours()) {
      return res.json({ success: true, message: 'Broadcasts only go out between 10 am and 8 pm — it will start then.', starts_at: whatsappService.nextSendingTime() });
    }
    setImmediate(() => whatsappService.runBroadcastJob(id).catch((e) => logger.error(`[Broadcast ${id}] start failed: ${e.message}`)));
    res.json({ success: true, message: 'Broadcast started' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SLA / Analytics ─────────────────────────────────────────────────────────
exports.getSLAStats = async (req, res) => {
  try {
    const brandId = brandParam(req.query.brandId); // null = all brands
    const { sequelize: sq } = require('../config/db.js');

    // Average first response time in minutes
    const avgResponseTime = await WhatsappConversation.findOne({
      where: { ...(brandId ? { brand_id: brandId } : {}), first_response_at: { [Op.ne]: null } },
      attributes: [[sq.fn('AVG', sq.fn('TIMESTAMPDIFF', sq.literal('SECOND'), sq.col('createdAt'), sq.col('first_response_at'))), 'avg_seconds']],
      raw: true,
    });

    const avgSeconds = parseFloat(avgResponseTime?.avg_seconds || 0);
    res.json({
      success: true,
      sla: {
        avgFirstResponseMinutes: avgSeconds > 0 ? (avgSeconds / 60).toFixed(1) : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send catalog-FREE product card(s): photo + name/price + product link ─────
// No WhatsApp catalog / retailer_id needed — we send the product image by URL
// with a caption linking to the storefront. Works for every brand immediately.
exports.sendProductLink = async (req, res) => {
  try {
    const { id } = req.params;
    const productIds = Array.isArray(req.body.productIds)
      ? req.body.productIds
      : (req.body.productId ? [req.body.productId] : []);
    if (!productIds.length) return res.status(400).json({ success: false, message: 'productIds required' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const win = await replyWindow(conv);
    if (!win.open) return windowClosedResponse(res, win);
    const brand = conv.brand_id || parseInt(req.body.brandId) || 1;

    const { Product } = require('../model/productModel.js');
    const { ProductVariation } = require('../model/productVariationModel.js');
    const { ProductImage } = require('../model/productImageModel.js');
    // The brand's LIVE domain + its own PDP route (Brand.domain was seeded
    // with dead domains for several stores).
    const storeUrl = await whatsappService.getBrandDomain(brand);

    let sent = 0, lastSaved = null;
    for (const pid of productIds) {
      const product = await Product.findByPk(pid);
      if (!product) continue;
      const variation = await ProductVariation.findOne({ where: { productId: pid }, order: [['id', 'ASC']] });
      const image = await ProductImage.findOne({ where: { product_id: pid } });
      const price = variation?.price || product.price || null;
      let img = image?.image_url || null;
      if (img && !/^https?:\/\//i.test(img)) img = `https://${storeUrl}/${String(img).replace(/^\//, '')}`;
      const url = await whatsappService.getProductUrl(brand, product.slug);
      const caption = `*${product.name}*${price ? `\n💰 ₹${price}` : ''}\n\n🛒 View & order:\n${url}`;

      let result;
      if (img) result = await whatsappService.sendImageLink(conv.customer_phone, img, caption, brand);
      else result = await whatsappService.sendTextMessage(conv.customer_phone, caption, brand, null, { staff: true });
      if (result?.rate_limited) return res.status(429).json({ success: false, message: 'Hourly message limit reached for this customer. Try again later.' });

      lastSaved = await WhatsappMessage.create({
        conversation_id: id,
        wa_message_id:   result?.messages?.[0]?.id || null,
        direction:       'outbound',
        type:            img ? 'image' : 'text',
        body:            img ? JSON.stringify({ url: img, mime: 'image/jpeg', caption, text: caption }) : caption,
        status:          'sent',
        sent_at:         new Date(),
        sent_by:         req.user?.id || null,
      });
      sent++;
    }
    if (!sent) return res.status(400).json({ success: false, message: 'None of the selected products could be found' });

    await conv.update(staffReplyUpdate(conv, sent > 1 ? `🛍️ ${sent} products shared` : '🛍️ Product shared'));
    res.json({ success: true, sent, message: lastSaved });
  } catch (err) {
    logger.error('[WhatsApp] sendProductLink failed:', errMsg(err));
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Media proxy — fetches media from Meta and streams to browser ─────────────
// GET /api/whatsapp/media/:mediaId?brandId=1
// The browser cannot call Meta directly (needs auth token), so we proxy it.
//
// WhatsApp media is IMMUTABLE — a given media id always returns the same bytes —
// so we cache the downloaded bytes on disk keyed by the stable media id. Opening
// an OLD chat used to re-hit Meta twice per item (resolve URL + download) on
// every view; after the first fetch it now streams straight from local disk.
const _mediaPath = require('path');
const _mediaFs = require('fs');
const _mediaCrypto = require('crypto');
const WA_MEDIA_CACHE_DIR = _mediaPath.join(require('../utils/uploadsDir.js'), 'wa-media');
try { _mediaFs.mkdirSync(WA_MEDIA_CACHE_DIR, { recursive: true }); } catch (_) {}

// ── Media cache size/age cap ──────────────────────────────────────────────────
// The cache is a convenience, not storage — bound it so it can never fill the
// disk. Prune runs lazily (throttled to ~1/hour), triggered by cache activity,
// so there's no always-on timer. Tunable via env.
const WA_MEDIA_MAX_BYTES = Number(process.env.WA_MEDIA_MAX_BYTES) || 500 * 1024 * 1024; // 500 MB
const WA_MEDIA_MAX_AGE_MS = Number(process.env.WA_MEDIA_MAX_AGE_DAYS || 30) * 24 * 60 * 60 * 1000;
const WA_MEDIA_PRUNE_EVERY_MS = 60 * 60 * 1000; // at most once an hour
let _mediaLastPrune = 0;
let _mediaPruning = false;

async function pruneMediaCache() {
  if (_mediaPruning) return;
  _mediaPruning = true;
  try {
    const fsp = _mediaFs.promises;
    const names = await fsp.readdir(WA_MEDIA_CACHE_DIR);
    const now = Date.now();
    const entries = [];
    let total = 0;
    for (const name of names) {
      const full = _mediaPath.join(WA_MEDIA_CACHE_DIR, name);
      let st; try { st = await fsp.stat(full); } catch { continue; }
      if (!st.isFile()) continue;
      // Sweep orphaned temp files (a crash mid-download) after 10 minutes.
      if (name.endsWith('.tmp')) {
        if (now - st.mtimeMs > 10 * 60 * 1000) { try { await fsp.unlink(full); } catch {} }
        continue;
      }
      // Cache entries are the bytes files (no extension); .ct sidecars ride along.
      if (name.endsWith('.ct')) continue;
      total += st.size;
      entries.push({ full, size: st.size, mtime: st.mtimeMs });
    }
    // 1) Age out anything older than the max age (removes bytes + its .ct).
    for (const e of entries) {
      if (now - e.mtime > WA_MEDIA_MAX_AGE_MS) {
        try { await fsp.unlink(e.full); total -= e.size; e.deleted = true; } catch {}
        try { await fsp.unlink(e.full + '.ct'); } catch {}
      }
    }
    // 2) If still over the size cap, delete oldest-first until under it.
    if (total > WA_MEDIA_MAX_BYTES) {
      const live = entries.filter(e => !e.deleted).sort((a, b) => a.mtime - b.mtime);
      for (const e of live) {
        if (total <= WA_MEDIA_MAX_BYTES) break;
        try { await fsp.unlink(e.full); total -= e.size; } catch {}
        try { await fsp.unlink(e.full + '.ct'); } catch {}
      }
    }
  } catch (err) {
    logger.warn('[MediaCache] prune failed: ' + err.message);
  } finally {
    _mediaPruning = false;
  }
}

// Kick a prune at most once an hour, off the request path (never awaited).
function maybePruneMediaCache() {
  const now = Date.now();
  if (now - _mediaLastPrune < WA_MEDIA_PRUNE_EVERY_MS) return;
  _mediaLastPrune = now;
  setImmediate(() => { pruneMediaCache().catch(() => {}); });
}

// The stable Meta media id is the cache key. Full CDN URLs expire but carry the
// id in the `mid` param; bare ids are used directly; anything else is hashed.
function waMediaCacheKey(decoded) {
  try {
    if (decoded.startsWith('http')) {
      const mid = new URL(decoded).searchParams.get('mid');
      if (mid) return mid;
      return _mediaCrypto.createHash('sha1').update(decoded).digest('hex');
    }
  } catch (_) { /* fall through */ }
  return decoded;
}
function waMediaCachePaths(key) {
  const hash = _mediaCrypto.createHash('sha1').update(String(key)).digest('hex');
  const base = _mediaPath.join(WA_MEDIA_CACHE_DIR, hash);
  // Unique temp per request so two simultaneous first-views of the same media
  // never interleave writes into one temp file; whichever finishes renames to
  // the same final path (identical bytes, so last-writer-wins is safe).
  const tmp = `${base}.${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.tmp`;
  return { bin: base, ct: base + '.ct', tmp };
}

// Only ever fetch media (with the Meta bearer token attached) from Meta/Facebook
// hosts. Without this, a caller-supplied full URL (the no-`mid` branch below)
// let the proxy send our WhatsApp access token to ANY host (token exfiltration)
// and reach internal/link-local addresses (SSRF).
function isAllowedMediaHost(urlStr) {
  let h;
  try { h = new URL(urlStr).hostname.toLowerCase(); } catch { return false; }
  // Reject raw IPs outright (blocks 169.254.x, 127.x, 10.x, 192.168.x, etc.).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':')) return false;
  return (
    h === 'graph.facebook.com' ||
    h === 'lookaside.fbsbx.com' ||
    h.endsWith('.fbcdn.net') ||
    h.endsWith('.facebook.com') ||
    h.endsWith('.fbsbx.com')
  );
}

// ── Signed, short-lived media-access URLs ───────────────────────────────────
// Browser <img>/<audio>/<video> tags cannot send an Authorization header, so the
// media proxy historically accepted the session JWT in the ?token= query string.
// That leaks the full session JWT into server logs, browser history and Referer
// headers. Instead we embed a short-lived HMAC signature scoped to a single
// (mediaId, brandId): it grants read access to exactly that one media item for a
// bounded window and carries no session secret. The ?token= path is kept as a
// backward-compatible fallback so existing links never break.
const MEDIA_URL_TTL_MS = 24 * 60 * 60 * 1000; // ~24h

function mediaUrlSecret() {
  return process.env.MEDIA_URL_SECRET || process.env.JWT_SECRET || '';
}

function mediaAccessSig(mediaId, brandId, exp) {
  return _mediaCrypto
    .createHmac('sha256', mediaUrlSecret())
    .update(`${mediaId}|${brandId}|${exp}`)
    .digest('hex');
}

// Produce an {exp, sig} pair authorizing read access to (mediaId, brandId).
function signMediaAccess(mediaId, brandId) {
  const exp = Date.now() + MEDIA_URL_TTL_MS;
  return { exp, sig: mediaAccessSig(mediaId, brandId, exp) };
}

// Validate a signature: not expired, and a constant-time match. Returns a boolean
// and never throws or logs the signature/secret.
function verifyMediaAccess(mediaId, brandId, exp, sig) {
  try {
    const secret = mediaUrlSecret();
    if (!secret || !mediaId || !exp || !sig) return false;
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum < Date.now()) return false; // bad/expired
    const expected = mediaAccessSig(mediaId, brandId, expNum);
    const a = Buffer.from(String(sig), 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false; // timingSafeEqual requires equal length
    return _mediaCrypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

exports.signMediaAccess = signMediaAccess;
exports.verifyMediaAccess = verifyMediaAccess;

exports.proxyMedia = async (req, res) => {
  maybePruneMediaCache(); // bound the cache size; runs off-thread, at most 1/hour
  try {
    const { mediaId } = req.params;
    const brandId = parseInt(req.query.brandId) || 1;

    // Decode in case it was URL-encoded (full Facebook URLs)
    const decoded = decodeURIComponent(mediaId);

    // ── Cache hit: serve the bytes straight from disk, no Meta round-trip ──
    const cacheKey = waMediaCacheKey(decoded);
    const paths = waMediaCachePaths(cacheKey);
    try {
      // Async fs so a cache hit never blocks the event loop on disk I/O under
      // concurrent media loads (was statSync + readFileSync on the request thread).
      const stat = await _mediaFs.promises.stat(paths.bin);
      if (stat.size > 0) {
        let ct = 'application/octet-stream';
        try { ct = (await _mediaFs.promises.readFile(paths.ct, 'utf8')) || ct; } catch (_) {}
        res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'private, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('X-Media-Cache', 'HIT');
        _mediaFs.createReadStream(paths.bin).pipe(res);
        return;
      }
    } catch (_) { /* miss — fall through to fetch */ }

    let downloadUrl, mimeType;

    if (decoded.startsWith('http')) {
      // Full Facebook CDN URL — extract the media ID from the `mid` query param
      // Facebook CDN URLs expire but the mid can be used to re-fetch via Meta API
      try {
        const urlObj = new URL(decoded);
        const mid = urlObj.searchParams.get('mid');
        if (mid) {
          logger.info(`[MediaProxy] Extracted mid from expired URL: ${mid}`);
          const result = await whatsappService.getMediaUrl(mid, brandId);
          downloadUrl = result.url;
          mimeType = result.mimeType;
        } else {
          // No mid param — try direct fetch with auth
          downloadUrl = decoded;
          mimeType = 'application/octet-stream';
        }
      } catch (urlErr) {
        downloadUrl = decoded;
        mimeType = 'application/octet-stream';
      }
    } else {
      // Meta media ID — resolve to download URL first
      logger.info(`[MediaProxy] Calling Meta API for media ID: "${decoded}"`);
      try {
        const result = await whatsappService.getMediaUrl(decoded, brandId);
        downloadUrl = result.url;
        mimeType = result.mimeType;
        logger.info(`[MediaProxy] Got download URL: ${downloadUrl?.substring(0, 80)}`);
      } catch (metaErr) {
        logger.error(`[MediaProxy] Meta API error for ID "${decoded}": ${metaErr?.response?.data ? JSON.stringify(metaErr.response.data) : metaErr.message}`);
        throw metaErr;
      }
    }

    // Stream the bytes back to the browser
    // Never attach the Meta token to a non-Meta host (SSRF / token exfiltration).
    if (!isAllowedMediaHost(downloadUrl)) {
      logger.warn('[MediaProxy] blocked non-Meta media host: ' + String(downloadUrl).slice(0, 120));
      return res.status(400).json({ success: false, message: 'Invalid media URL' });
    }
    const { stream, contentType, contentLength } = await whatsappService.downloadMedia(downloadUrl, brandId);
    const finalType = contentType || mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', finalType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Media-Cache', 'MISS');

    // Tee the download to disk while streaming to the browser: the write costs
    // nothing extra on the response, and the next view of this item is a cache
    // hit. Only promote the temp file to the cache if the download completed in
    // full (a client abort or upstream error must not leave a truncated file).
    let cacheOk = true;
    let downloadComplete = false;
    const cacheStream = _mediaFs.createWriteStream(paths.tmp);
    cacheStream.on('error', () => {
      cacheOk = false;
      try { _mediaFs.unlink(paths.tmp, () => {}); } catch (_) {}
    });
    cacheStream.on('finish', () => {
      if (!cacheOk || !downloadComplete) {
        try { _mediaFs.unlink(paths.tmp, () => {}); } catch (_) {}
        return;
      }
      try {
        _mediaFs.renameSync(paths.tmp, paths.bin);
        _mediaFs.writeFile(paths.ct, finalType, () => {});
      } catch (_) { try { _mediaFs.unlink(paths.tmp, () => {}); } catch (__) {} }
    });

    stream.on('end', () => { downloadComplete = true; });
    stream.on('error', () => {
      cacheOk = false;
      try { cacheStream.destroy(); } catch (_) {}
      if (!res.headersSent) res.status(500);
      res.end();
    });

    stream.pipe(res);
    if (cacheOk) stream.pipe(cacheStream);
  } catch (err) {
    logger.error('Media proxy error: ' + err.message);
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// Sync all products to WhatsApp catalog
exports.syncProductsCatalog = async (req, res) => {
  try {
    const { brandId = 1 } = req.body;
    const result = await whatsappService.syncProductsToCatalog(brandId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};
