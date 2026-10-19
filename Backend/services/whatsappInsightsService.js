'use strict';

// WhatsApp Studio — abandoned carts, analytics, settings and the inbound
// automations (away message, order-status reply, opt-out words).
//
// Schema: this service owns a few additive columns and creates them lazily,
// once per process, in ensureSchema() (guarded CREATE TABLE IF NOT EXISTS /
// information_schema checks + ALTER ADD — never destructive):
//   whatsapp_settings               key/value JSON store shared with the automations page
//   whatsapp_messages.sent_by       staff user id that sent a reply (analytics "by team member")
//   whatsapp_messages.auto_kind     'away' | 'order_status' | 'opt_out' for our own automatic replies
//   whatsapp_messages.error_code    Meta error code of a failed send
//   whatsapp_messages.error_text    Meta error title of a failed send
//   whatsapp_messages index on createdAt (every report here windows on it)
//   abandoned_carts.link_opened_at  first time the recovery link was opened
//
// Times are stored in UTC (Sequelize default); every day/hour bucket here is
// computed in IST (UTC+05:30).

const axios = require('axios');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { phoneHash, decrypt } = require('../utils/encryption.js');
const recovery = require('./cartRecoveryService.js');

const IST_MS = 330 * 60000;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const FIRST_REPLY_TARGET_MIN = 30;
const SALES_LOOKBACK_MS = 3 * DAY;
const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const exec = (sql, replacements = {}) => sequelize.query(sql, { replacements });

// ─── Schema (lazy, once per process) ──────────────────────────────────────────
let _schemaPromise = null;
function ensureSchema() {
  if (!_schemaPromise) {
    _schemaPromise = _ensureSchema().catch((e) => {
      _schemaPromise = null; // retry on the next call
      throw e;
    });
  }
  return _schemaPromise;
}

async function _ensureSchema() {
  await exec(`CREATE TABLE IF NOT EXISTS whatsapp_settings (
      \`key\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`value\` TEXT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const cols = await q(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND ((TABLE_NAME = 'whatsapp_messages' AND COLUMN_NAME IN ('sent_by','auto_kind','error_code','error_text'))
          OR (TABLE_NAME = 'abandoned_carts' AND COLUMN_NAME = 'link_opened_at'))`);
  const have = new Set(cols.map((r) => `${r.t}.${r.c}`));
  const msgAdds = [];
  if (!have.has('whatsapp_messages.sent_by')) msgAdds.push('ADD COLUMN sent_by INT NULL');
  if (!have.has('whatsapp_messages.auto_kind')) msgAdds.push('ADD COLUMN auto_kind VARCHAR(20) NULL');
  if (!have.has('whatsapp_messages.error_code')) msgAdds.push('ADD COLUMN error_code INT NULL');
  if (!have.has('whatsapp_messages.error_text')) msgAdds.push('ADD COLUMN error_text VARCHAR(255) NULL');
  if (msgAdds.length) await exec(`ALTER TABLE whatsapp_messages ${msgAdds.join(', ')}`);
  if (!have.has('abandoned_carts.link_opened_at')) {
    try {
      await exec('ALTER TABLE abandoned_carts ADD COLUMN link_opened_at DATETIME NULL');
    } catch (e) {
      // Table may not exist yet on a fresh DB (index.js creates it at startup).
      if (!/doesn't exist/i.test(e.message)) throw e;
    }
  }

  const idx = await q(
    `SELECT INDEX_NAME AS n FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_messages' AND COLUMN_NAME = 'createdAt' AND SEQ_IN_INDEX = 1`);
  if (!idx.length) await exec('ALTER TABLE whatsapp_messages ADD INDEX idx_wa_msg_created (createdAt)');
  logger.info('✓ WhatsApp insights schema ensured');
}

// ─── whatsapp_settings key/value (JSON) ───────────────────────────────────────
const _settingCache = new Map(); // key → { at, value }
const SETTING_TTL_MS = 30 * 1000;

async function readSetting(key, fallback = null) {
  const hit = _settingCache.get(key);
  if (hit && Date.now() - hit.at < SETTING_TTL_MS) return hit.value;
  let value = fallback;
  try {
    const rows = await q('SELECT `value` FROM whatsapp_settings WHERE `key` = :key LIMIT 1', { key });
    if (rows[0] && rows[0].value != null) value = JSON.parse(rows[0].value);
  } catch (_) { /* table missing / bad JSON → fallback */ }
  _settingCache.set(key, { at: Date.now(), value });
  return value;
}

async function writeSetting(key, value) {
  await ensureSchema();
  await exec(
    'INSERT INTO whatsapp_settings (`key`, `value`, updated_at) VALUES (:key, :value, :now) ' +
    'ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = VALUES(updated_at)',
    { key, value: JSON.stringify(value), now: new Date() });
  _settingCache.delete(key);
}

// ─── Small helpers ────────────────────────────────────────────────────────────
const p10Of = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : '';
};
const phoneVariants = (p10) => [p10, `91${p10}`, `+91${p10}`, `0${p10}`];
const maskPhone = (phone) => {
  const p = p10Of(phone);
  return p ? `+91 ${p.slice(0, 2)}•• ••${p.slice(-4)}` : null;
};
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);
const toDate = (v) => (v instanceof Date ? v : new Date(v));

function parseBrandId(raw) {
  if (raw == null || raw === '' || raw === 'all') return null;
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseDays(raw, allowed = [1, 7, 30], dflt = 7) {
  const n = parseInt(raw, 10);
  return allowed.includes(n) ? n : dflt;
}

// IST calendar parts of an instant.
function ist(d) {
  const x = new Date(toDate(d).getTime() + IST_MS);
  return {
    y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), h: x.getUTCHours(), min: x.getUTCMinutes(),
    dow: (x.getUTCDay() + 6) % 7, // Mon = 0
    ymd: x.toISOString().slice(0, 10),
  };
}

// [from, to) for "today" / "last 7 days" / "last 30 days" in IST, plus the
// same-length window just before it.
function periodRange(days, now = new Date()) {
  const p = ist(now);
  const from = new Date(Date.UTC(p.y, p.m, p.d - (days - 1)) - IST_MS);
  const prevFrom = new Date(from.getTime() - days * DAY);
  return { from, to: now, prevFrom, prevTo: from };
}

const istTime = (d) => {
  try {
    return toDate(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (_) {
    const p = ist(d);
    return `${((p.h + 11) % 12) + 1}:${String(p.min).padStart(2, '0')} ${p.h < 12 ? 'am' : 'pm'}`;
  }
};

async function brandMap() {
  const rows = await q('SELECT id, COALESCE(display_name, name) AS name FROM brands ORDER BY id');
  return new Map(rows.map((b) => [Number(b.id), b.name]));
}

// Rows of whatsapp_messages that count as a person on our team answering the
// customer: not our own automatic replies, not an automated template (unless a
// staff member sent it from the inbox — then sent_by is set), not failed.
const HUMAN_OUT_SQL = `direction = 'outbound' AND auto_kind IS NULL AND status <> 'failed' AND (sent_by IS NOT NULL OR type <> 'template')`;
const isHumanOut = (m) => m.direction === 'outbound' && !m.auto_kind && m.status !== 'failed' && (m.sent_by != null || m.type !== 'template');
const isCustomerIn = (m) => m.direction === 'inbound' && m.type !== 'reaction';

// ─── Sales from WhatsApp ──────────────────────────────────────────────────────
// Orders created in [from, to) whose customer got an outbound WhatsApp message
// in the 3 days before ordering. Customers are matched by phone the same way
// the inbox does: account phone (plain), guest phone or shipping phone (hash).
async function salesFromWhatsApp(from, to, brandId) {
  const outs = await q(
    `SELECT c.customer_phone AS phone, m.createdAt AS at
       FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
      WHERE m.direction = 'outbound' AND m.status <> 'failed'
        AND m.createdAt >= :start AND m.createdAt < :to`,
    { start: new Date(from.getTime() - SALES_LOOKBACK_MS), to });
  const byP10 = new Map();
  for (const r of outs) {
    const p = p10Of(r.phone);
    if (!p) continue;
    if (!byP10.has(p)) byP10.set(p, []);
    byP10.get(p).push(toDate(r.at).getTime());
  }
  const result = { total: 0, count: 0, byBrand: new Map() };
  if (!byP10.size) return result;
  const hashToP10 = new Map();
  for (const p of byP10.keys()) { const h = phoneHash(p); if (h) hashToP10.set(h, p); }

  const orders = await q(
    `SELECT o.id, o.brand_id, o.final_amount, o.created_at, RIGHT(u.phone, 10) AS up, g.phone_hash AS gh, a.phone_hash AS ah
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
      WHERE o.created_at >= :from AND o.created_at < :to
        AND o.status NOT IN ('cancelled', 'order cancelled')
        AND (o.payment_status IS NULL OR o.payment_status <> 'failed')
        ${brandId ? 'AND o.brand_id = :brandId' : ''}`,
    { from, to, brandId });
  for (const o of orders) {
    const p = (o.up && byP10.has(o.up) && o.up) || hashToP10.get(o.ah) || hashToP10.get(o.gh);
    if (!p) continue;
    const t = toDate(o.created_at).getTime();
    if (!byP10.get(p).some((x) => x < t && x >= t - SALES_LOOKBACK_MS)) continue;
    const amt = Number(o.final_amount) || 0;
    result.total += amt;
    result.count += 1;
    const b = Number(o.brand_id) || 1;
    result.byBrand.set(b, (result.byBrand.get(b) || 0) + amt);
  }
  result.total = Math.round(result.total);
  return result;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
async function getAnalytics({ days: rawDays, brandId: rawBrand } = {}) {
  await ensureSchema();
  const days = parseDays(rawDays);
  const brandId = parseBrandId(rawBrand);
  const now = new Date();
  const { from, to, prevFrom, prevTo } = periodRange(days, now);
  const brandSql = brandId ? 'AND c.brand_id = :brandId' : '';

  const [msgs, prevRows, waitingRows, brands, sales] = await Promise.all([
    q(`SELECT m.id, m.conversation_id AS cid, m.direction, m.type, m.status, m.createdAt AS at, m.sent_by, m.auto_kind, c.brand_id
         FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
        WHERE m.createdAt >= :from AND m.createdAt < :to ${brandSql}
        ORDER BY m.conversation_id, m.id`, { from, to, brandId }),
    q(`SELECT COUNT(DISTINCT m.conversation_id) AS n
         FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
        WHERE m.direction = 'inbound' AND m.type <> 'reaction' AND m.createdAt >= :prevFrom AND m.createdAt < :prevTo ${brandSql}`,
      { prevFrom, prevTo, brandId }),
    waitingNow(brandId),
    brandMap(),
    salesFromWhatsApp(from, to, brandId),
  ]);

  // Was each conversation already waiting on us when the period started?
  const cids = [...new Set(msgs.map((m) => m.cid))];
  const priorWaiting = new Map(); // cid → time the customer started waiting
  if (cids.length) {
    const prior = await q(
      `SELECT m.conversation_id AS cid, m.direction, m.createdAt AS at
         FROM whatsapp_messages m
         JOIN (SELECT conversation_id, MAX(id) AS id FROM whatsapp_messages
                WHERE conversation_id IN (:cids) AND createdAt < :from
                  AND ((direction = 'inbound' AND type <> 'reaction') OR (${HUMAN_OUT_SQL}))
                GROUP BY conversation_id) x ON x.id = m.id`, { cids, from });
    for (const r of prior) if (r.direction === 'inbound') priorWaiting.set(r.cid, toDate(r.at));
  }

  const chats = new Set();
  const chatsByBrand = new Map();
  const replies = []; // { brand, mins, agent, cid }
  let missed = 0; // unanswered questions already older than the target
  const missedByBrand = new Map();
  const funnel = { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 };
  const fByBrand = new Map(); // brand → { sent, read, failed }
  const heatKeys = new Set();
  const heat = Array.from({ length: 7 }, () => new Array(12).fill(0));

  let i = 0;
  while (i < msgs.length) {
    const cid = msgs[i].cid;
    const brand = Number(msgs[i].brand_id) || 1;
    let waiting = priorWaiting.has(cid) ? { start: priorWaiting.get(cid), inPeriod: false } : null;
    let pendingOut = []; // outbound messages not yet answered by the customer
    for (; i < msgs.length && msgs[i].cid === cid; i++) {
      const m = msgs[i];
      const at = toDate(m.at);
      if (isCustomerIn(m)) {
        chats.add(cid);
        if (!chatsByBrand.has(brand)) chatsByBrand.set(brand, new Set());
        chatsByBrand.get(brand).add(cid);
        const p = ist(at);
        const bucket = Math.floor((((p.h - 8) % 24 + 24) % 24) / 2);
        const k = `${cid}|${p.ymd}|${bucket}`;
        if (!heatKeys.has(k)) { heatKeys.add(k); heat[p.dow][bucket] += 1; }
        if (!waiting) waiting = { start: at, inPeriod: true };
        for (const o of pendingOut) if (at - o.at <= DAY) { funnel.replied += 1; }
        pendingOut = [];
      } else if (m.direction === 'outbound') {
        funnel.sent += 1;
        const fb = fByBrand.get(brand) || { sent: 0, read: 0, failed: 0 };
        fb.sent += 1;
        if (m.status === 'delivered' || m.status === 'read') funnel.delivered += 1;
        if (m.status === 'read') { funnel.read += 1; fb.read += 1; }
        if (m.status === 'failed') { funnel.failed += 1; fb.failed += 1; } else pendingOut.push({ at });
        fByBrand.set(brand, fb);
        if (isHumanOut(m) && waiting) {
          if (waiting.inPeriod) replies.push({ brand, mins: (at - waiting.start) / 60000, agent: m.sent_by == null ? null : Number(m.sent_by), cid });
          waiting = null;
        }
      }
    }
    if (waiting && waiting.inPeriod && now - waiting.start > FIRST_REPLY_TARGET_MIN * 60000) {
      missed += 1;
      missedByBrand.set(brand, (missedByBrand.get(brand) || 0) + 1);
    }
  }

  const replyMins = replies.map((r) => r.mins);
  const withinTarget = replyMins.filter((x) => x <= FIRST_REPLY_TARGET_MIN).length;

  // Waiting right now (open chats whose last customer message has no reply).
  const waitList = waitingRows;
  const waitingByBrand = new Map();
  for (const w of waitList) waitingByBrand.set(w.brand_id, (waitingByBrand.get(w.brand_id) || 0) + 1);

  // By brand.
  const brandIds = brandId ? [brandId] : [...brands.keys()];
  const by_brand = brandIds.map((b) => {
    const fb = fByBrand.get(b) || { sent: 0, read: 0, failed: 0 };
    const mins = replies.filter((r) => r.brand === b).map((r) => r.mins);
    return {
      brand_id: b,
      name: brands.get(b) || `Brand ${b}`,
      chats: (chatsByBrand.get(b) || new Set()).size,
      first_reply_median_min: round1(median(mins)),
      unanswered: waitingByBrand.get(b) || 0,
      read_rate: pct(fb.read, fb.sent - fb.failed),
      sales: Math.round(sales.byBrand.get(b) || 0),
    };
  }).sort((a, b) => b.chats - a.chats || b.sales - a.sales || a.brand_id - b.brand_id);

  // By team member (who sent the reply that answered a waiting customer).
  const agents = new Map(); // id|null → { closed:Set, mins:[] }
  for (const r of replies) {
    const key = r.agent;
    if (!agents.has(key)) agents.set(key, { closed: new Set(), mins: [] });
    agents.get(key).closed.add(r.cid);
    agents.get(key).mins.push(r.mins);
  }
  const agentIds = [...agents.keys()].filter((x) => x != null);
  const names = agentIds.length
    ? new Map((await q('SELECT id, username FROM users WHERE id IN (:ids)', { ids: agentIds })).map((u) => [Number(u.id), u.username]))
    : new Map();
  const by_agent = [...agents.entries()].map(([id, a]) => ({
    user_id: id,
    name: id == null ? 'Not recorded' : (names.get(id) || `User ${id}`),
    closed: a.closed.size,
    first_reply_median_min: round1(median(a.mins)),
  })).sort((a, b) => (a.user_id == null) - (b.user_id == null) || b.closed - a.closed);

  const heatmap = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 12; h++) heatmap.push({ day: d, hour_bucket: h, chats: heat[d][h] });

  return {
    days,
    from,
    to,
    kpis: {
      chats: chats.size,
      chats_prev: Number(prevRows[0]?.n) || 0,
      first_reply_median_min: round1(median(replyMins)),
      first_reply_target_min: FIRST_REPLY_TARGET_MIN,
      within_target_pct: pct(withinTarget, replyMins.length + missed),
      waiting_now: waitList.length,
      waiting_over_4h: waitList.filter((w) => now - w.since > 4 * HOUR).length,
      sales: sales.total,
      sales_orders: sales.count,
    },
    funnel,
    heatmap,
    by_brand,
    by_agent,
  };
}

// Open chats where the customer's last message is newer than our team's last
// reply (our own automatic replies don't count as an answer).
async function waitingNow(brandId) {
  const rows = await q(
    `SELECT c.id, c.brand_id,
            (SELECT MAX(createdAt) FROM whatsapp_messages WHERE conversation_id = c.id AND direction = 'inbound' AND type <> 'reaction') AS li,
            (SELECT MAX(createdAt) FROM whatsapp_messages WHERE conversation_id = c.id AND ${HUMAN_OUT_SQL}) AS lo
       FROM whatsapp_conversations c
      WHERE c.status = 'open' ${brandId ? 'AND c.brand_id = :brandId' : ''}`, { brandId });
  return rows
    .filter((r) => r.li && (!r.lo || toDate(r.li) > toDate(r.lo)))
    .map((r) => ({ id: r.id, brand_id: Number(r.brand_id) || 1, since: toDate(r.li) }));
}

// ─── Abandoned carts ──────────────────────────────────────────────────────────
const CART_TABS = { all: null, wait: ['wait'], sent: ['sent', 'clicked'], won: ['won'], none: ['none', 'stop'] };

async function getCarts({ days: rawDays, status: rawStatus, brandId: rawBrand } = {}) {
  await ensureSchema();
  const days = parseDays(rawDays);
  const brandId = parseBrandId(rawBrand);
  const tab = Object.prototype.hasOwnProperty.call(CART_TABS, rawStatus) ? rawStatus : 'all';
  const now = new Date();
  const { from } = periodRange(days, now);
  const rules = await recovery.getCartRules({ fresh: true });
  const brands = await brandMap();
  const brandSql = brandId ? 'AND brand_id = :brandId' : '';

  const carts = await q(
    `SELECT id, brand_id, user_id, phone, phone_hash, customer_name, cart_summary, item_count, cart_value,
            status, wa_sent, created_at, updated_at, link_opened_at
       FROM abandoned_carts
      WHERE updated_at >= :from ${brandSql}
      ORDER BY updated_at DESC
      LIMIT 2000`, { from, brandId });

  // Logged-in shoppers whose server cart can't be messaged (no phone on the
  // account) — the hourly cart cron skips them, so show them as "No number".
  const noPhoneCarts = await q(
    `SELECT c.id, c.user_id, c.updated_at, u.username,
            MIN(p.brand_id) AS brand_id, SUM(ci.quantity) AS qty,
            SUM(COALESCE(ci.price, 0) * ci.quantity) AS value,
            SUBSTRING(GROUP_CONCAT(CONCAT(COALESCE(p.name, 'Item'), ' ×', ci.quantity) ORDER BY ci.id SEPARATOR ', '), 1, 200) AS items
       FROM carts c
       JOIN users u ON u.id = c.user_id
       JOIN cart_items ci ON ci.cart_id = c.id
       LEFT JOIN products p ON p.id = ci.product_id
      WHERE c.status = 'active' AND c.updated_at >= :from AND c.updated_at < :hourAgo
        AND (u.phone IS NULL OR u.phone = '')
        AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = c.user_id AND o.created_at >= c.updated_at)
      GROUP BY c.id, c.user_id, c.updated_at, u.username
      ${brandId ? 'HAVING MIN(p.brand_id) = :brandId' : ''}
      ORDER BY c.updated_at DESC
      LIMIT 500`, { from, hourAgo: new Date(now.getTime() - HOUR), brandId }).catch((e) => {
    logger.warn('[wa-insights] no-phone carts query failed: ' + e.message);
    return [];
  });

  // Decrypt phones once.
  for (const c of carts) {
    let plain = null;
    try { plain = c.phone ? decrypt(c.phone) : null; } catch (_) { plain = null; }
    c.p10 = p10Of(plain);
  }
  const p10s = [...new Set(carts.map((c) => c.p10).filter(Boolean))];

  // Conversations (opt-out + chat link) for these phones — indexed IN lookup.
  const convByP10 = new Map();
  if (p10s.length) {
    const variants = p10s.flatMap(phoneVariants);
    const convs = await q(
      `SELECT id, customer_phone, opted_out FROM whatsapp_conversations WHERE customer_phone IN (:variants)`, { variants });
    for (const cv of convs) convByP10.set(p10Of(cv.customer_phone), cv);
  }

  // Delivery status of the recovery template (when the sender recorded it in the
  // chat): earliest outbound template after the cart was left.
  const convIds = [...convByP10.values()].map((c) => c.id);
  const tplByConv = new Map();
  if (convIds.length) {
    const tpls = await q(
      `SELECT conversation_id AS cid, status, createdAt AS at FROM whatsapp_messages
        WHERE conversation_id IN (:convIds) AND direction = 'outbound' AND type = 'template' AND createdAt >= :start
        ORDER BY id`, { convIds, start: new Date(from.getTime() - DAY) });
    for (const t of tpls) {
      if (!tplByConv.has(t.cid)) tplByConv.set(t.cid, []);
      tplByConv.get(t.cid).push({ status: t.status, at: toDate(t.at) });
    }
  }

  // Orders placed by these shoppers (to show which order recovered the cart).
  const ordersByKey = new Map(); // p10 → [{ order_number, amount, at, brand_id }]
  if (p10s.length) {
    const hashes = p10s.map((p) => phoneHash(p)).filter(Boolean);
    const hashToP10 = new Map(p10s.map((p) => [phoneHash(p), p]));
    const userIds = [...new Set(carts.map((c) => c.user_id).filter(Boolean))];
    const ors = hashes.length ? await q(
      `SELECT o.order_number, o.final_amount, o.created_at, o.brand_id, o.user_id, a.phone_hash AS ah, g.phone_hash AS gh
         FROM orders o
         LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
         LEFT JOIN guest_users g ON g.id = o.guest_user_id
        WHERE o.created_at >= :start
          AND (a.phone_hash IN (:hashes) OR g.phone_hash IN (:hashes) ${userIds.length ? 'OR o.user_id IN (:userIds)' : ''})
        ORDER BY o.created_at`,
      { start: new Date(from.getTime() - 30 * DAY), hashes, userIds }) : [];
    const userToP10 = new Map(carts.filter((c) => c.user_id && c.p10).map((c) => [Number(c.user_id), c.p10]));
    for (const o of ors) {
      const p = hashToP10.get(o.ah) || hashToP10.get(o.gh) || userToP10.get(Number(o.user_id));
      if (!p) continue;
      if (!ordersByKey.has(p)) ordersByKey.set(p, []);
      ordersByKey.get(p).push({ order_number: o.order_number, amount: Math.round(Number(o.final_amount) || 0), at: toDate(o.created_at), brand_id: Number(o.brand_id) || 1 });
    }
  }

  const backstopMs = recovery.backstopDelayMin() * 60000;
  const rows = [];
  for (const c of carts) {
    const brand = Number(c.brand_id) || 1;
    const leftAt = toDate(c.updated_at);
    const value = Math.round(Number(c.cart_value) || 0);
    const conv = c.p10 ? convByP10.get(c.p10) : null;
    const waSent = !!Number(c.wa_sent);
    const opened = c.link_opened_at ? toDate(c.link_opened_at) : null;
    let wa; let result; let waSendAt = null; let order = null; let noNumber = false;

    if (c.status === 'recovered') {
      // markRecovered() bumps updated_at to the order time, so look for the
      // order between the first capture and shortly after that.
      const list = (ordersByKey.get(c.p10) || []).filter((o) => o.brand_id === brand
        && o.at >= new Date(toDate(c.created_at).getTime() - 10 * 60000) && o.at <= new Date(leftAt.getTime() + HOUR));
      order = list[list.length - 1] || null;
    }

    if (!c.p10) {
      wa = 'none'; result = 'No phone number'; noNumber = true;
    } else if (c.status === 'recovered' && waSent) {
      wa = 'won';
      result = order ? `Ordered ${order.order_number} · ₹${order.amount.toLocaleString('en-IN')}` : 'Ordered';
    } else if (c.status === 'recovered') {
      wa = 'none'; result = order ? `Ordered ${order.order_number} before we messaged` : 'Ordered before we messaged';
    } else if (conv && Number(conv.opted_out)) {
      wa = 'stop'; result = 'Opted out of WhatsApp offers';
    } else if (waSent && opened) {
      wa = 'clicked'; result = `Opened ${istTime(opened)}, didn’t order yet`;
    } else if (waSent) {
      wa = 'sent';
      const tpl = conv && (tplByConv.get(conv.id) || []).find((t) => t.at >= new Date(leftAt.getTime() - 2 * DAY));
      result = !tpl ? 'Sent, link not opened yet'
        : tpl.status === 'read' ? 'Read, no click yet'
          : tpl.status === 'delivered' ? 'Delivered, not read yet'
            : tpl.status === 'failed' ? 'Message failed to deliver'
              : 'Sent, link not opened yet';
    } else if (rules.minValue > 0 && value < rules.minValue) {
      wa = 'none'; result = `Under ₹${rules.minValue.toLocaleString('en-IN')} — skipped`;
    } else {
      const due = recovery.nextSendAt(leftAt, rules);
      const sendAt = new Date(Math.max(due.getTime(), leftAt.getTime() + backstopMs));
      const window = recovery.cronWindow(rules, now);
      if (leftAt < window.from) {
        wa = 'none'; result = 'Too old to message';
      } else {
        wa = 'wait';
        waSendAt = sendAt;
        result = sendAt > now ? `Sends at ${istTime(sendAt)}` : 'Sending shortly';
      }
    }

    rows.push({
      id: c.id,
      name: c.customer_name || 'Shopper',
      phone_masked: c.p10 ? maskPhone(c.p10) : null,
      brand_id: brand,
      brand: brands.get(brand) || `Brand ${brand}`,
      items_label: c.cart_summary || (c.item_count ? `${c.item_count} item${c.item_count === 1 ? '' : 's'}` : 'Items'),
      value,
      left_at: leftAt,
      wa,
      wa_send_at: waSendAt,
      result,
      conversation_id: conv ? conv.id : null,
      order_number: wa === 'won' && order ? order.order_number : null,
      _opened: !!opened,
      _sent: waSent,
      _noNumber: noNumber,
      _sales: wa === 'won' && order ? order.amount : 0,
    });
  }

  for (const s of noPhoneCarts) {
    const brand = Number(s.brand_id) || 1;
    rows.push({
      id: `u${s.id}`,
      name: s.username || 'Shopper',
      phone_masked: null,
      brand_id: brand,
      brand: brands.get(brand) || `Brand ${brand}`,
      items_label: s.items || `${Number(s.qty) || 0} items`,
      value: Math.round(Number(s.value) || 0),
      left_at: toDate(s.updated_at),
      wa: 'none',
      wa_send_at: null,
      result: 'No phone number on the account',
      conversation_id: null,
      order_number: null,
      _opened: false, _sent: false, _noNumber: true, _sales: 0,
    });
  }
  rows.sort((a, b) => b.left_at - a.left_at);

  const flow = {
    left: rows.length,
    messaged: rows.filter((r) => r._sent).length,
    no_number: rows.filter((r) => r._noNumber).length,
    opened: rows.filter((r) => r._sent && r._opened).length,
    ordered: rows.filter((r) => r.wa === 'won').length,
    sales: rows.reduce((n, r) => n + r._sales, 0),
  };
  const counts = {};
  for (const [k, g] of Object.entries(CART_TABS)) counts[k] = g ? rows.filter((r) => g.includes(r.wa)).length : rows.length;

  const g = CART_TABS[tab];
  const out = rows.filter((r) => !g || g.includes(r.wa)).slice(0, 300).map((r) => {
    const { _opened, _sent, _noNumber, _sales, ...rest } = r; // eslint-disable-line no-unused-vars
    return rest;
  });
  return { days, flow, counts, rows: out, rules };
}

// POST /carts/:id/send-now — send the recovery message for one cart right away.
async function sendCartNow(id) {
  await ensureSchema();
  const { AbandonedCart } = require('../model/abandonedCartModel.js');
  const row = await AbandonedCart.findByPk(Number(id));
  if (!row) return { status: 404, body: { success: false, message: 'Cart not found' } };
  if (row.status === 'recovered') return { status: 409, body: { success: false, code: 'ALREADY_ORDERED', message: 'This shopper has already ordered' } };
  const p10 = p10Of(row.phone);
  if (!p10) return { status: 409, body: { success: false, code: 'NO_NUMBER', message: 'No phone number for this cart' } };
  const convs = await q('SELECT id, opted_out FROM whatsapp_conversations WHERE customer_phone IN (:v)', { v: phoneVariants(p10) });
  if (convs.some((c) => Number(c.opted_out))) {
    return { status: 409, body: { success: false, code: 'OPTED_OUT', message: 'This customer opted out of WhatsApp offers' } };
  }
  const rules = await recovery.getCartRules({ fresh: true });
  const whatsappService = require('./whatsappService.js');
  const token = await recovery.ensureToken(row);
  let result;
  try {
    result = await whatsappService.sendAbandonedCart(p10, {
      customerName: row.customerName,
      itemsSummary: row.cartSummary || 'your items',
      total: row.cartValue != null ? Number(row.cartValue).toFixed(0) : undefined,
      couponCode: rules.coupon,
      recoverToken: token,
    }, row.brandId || 1);
  } catch (e) {
    const metaMsg = typeof whatsappService.metaError === 'function' ? whatsappService.metaError(e) : e.message;
    return { status: 502, body: { success: false, code: 'SEND_FAILED', message: `WhatsApp didn’t accept the message: ${metaMsg}` } };
  }
  if (result && result.rate_limited) {
    return { status: 429, body: { success: false, code: 'RATE_LIMITED', message: 'This customer already got 10 messages in the last hour. Try again later.' } };
  }
  // silent: keep updated_at (= when the cart was left) as it is.
  await row.update({ status: 'messaged', waSent: true }, { silent: true });
  return { status: 200, body: { success: true, wa_message_id: result?.messages?.[0]?.id || null, conversation_id: convs[0]?.id || null } };
}

async function saveCartRules(input) {
  const rules = recovery.normaliseCartRules({ ...(await recovery.getCartRules({ fresh: true })), ...(input || {}) });
  // Clearing quiet hours explicitly (null / '') must win over the stored value.
  if (input && (input.quietStart === null || input.quietStart === '' || input.quietEnd === null || input.quietEnd === '')) {
    rules.quietStart = null; rules.quietEnd = null;
  }
  await writeSetting(recovery.CART_RULES_KEY, rules);
  recovery.clearCartRulesCache();
  return rules;
}

// ─── Settings: away message / auto order status / opt-out words ──────────────
const INBOX_KEY = 'inbox_automation';
const DEFAULT_INBOX = Object.freeze({
  away: { enabled: false, start: '10:00', end: '20:00', text: 'Thanks for your message! We’re offline right now and will reply after {start}.' },
  auto_order_status: { enabled: true },
  opt_out_words: ['STOP', 'UNSUBSCRIBE', 'OPT OUT'],
});

function normaliseInbox(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const a = r.away && typeof r.away === 'object' ? r.away : {};
  const away = {
    enabled: typeof a.enabled === 'boolean' ? a.enabled : DEFAULT_INBOX.away.enabled,
    start: HHMM_RE.test(a.start || '') ? a.start : DEFAULT_INBOX.away.start,
    end: HHMM_RE.test(a.end || '') ? a.end : DEFAULT_INBOX.away.end,
    text: typeof a.text === 'string' && a.text.trim() ? a.text.trim().slice(0, 600) : DEFAULT_INBOX.away.text,
  };
  if (away.start === away.end) away.end = DEFAULT_INBOX.away.end === away.start ? DEFAULT_INBOX.away.start : DEFAULT_INBOX.away.end;
  const s = r.auto_order_status && typeof r.auto_order_status === 'object' ? r.auto_order_status : {};
  const auto_order_status = { enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_INBOX.auto_order_status.enabled };
  let words = Array.isArray(r.opt_out_words) ? r.opt_out_words : DEFAULT_INBOX.opt_out_words;
  words = [...new Set(words.map((w) => String(w || '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 40)).filter(Boolean))].slice(0, 30);
  return { away, auto_order_status, opt_out_words: words };
}

async function getInboxSettings() {
  return normaliseInbox(await readSetting(INBOX_KEY, null));
}

// Validates the body of PUT /settings. Returns { error } or { settings }.
async function saveInboxSettings(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (b.away) {
    if (b.away.start != null && !HHMM_RE.test(b.away.start)) return { error: 'Opening time must look like 10:00' };
    if (b.away.end != null && !HHMM_RE.test(b.away.end)) return { error: 'Closing time must look like 20:00' };
    if (b.away.start && b.away.end && b.away.start === b.away.end) return { error: 'Opening and closing time can’t be the same' };
    if (b.away.text != null && typeof b.away.text !== 'string') return { error: 'Away message must be text' };
    if (typeof b.away.text === 'string' && b.away.text.length > 600) return { error: 'Away message is too long (600 characters max)' };
  }
  if (b.opt_out_words != null && !Array.isArray(b.opt_out_words)) return { error: 'opt_out_words must be a list' };
  const cur = await getInboxSettings();
  const merged = normaliseInbox({
    away: { ...cur.away, ...(b.away || {}) },
    auto_order_status: { ...cur.auto_order_status, ...(b.auto_order_status || {}) },
    opt_out_words: b.opt_out_words != null ? b.opt_out_words : cur.opt_out_words,
  });
  if (!merged.opt_out_words.length) return { error: 'Keep at least one opt-out word' };
  await writeSetting(INBOX_KEY, merged);
  return { settings: merged };
}

// ─── Settings: number health ──────────────────────────────────────────────────
let _healthCache = null; // { at, ttl, data }
const HEALTH_TTL_MS = 10 * 60 * 1000;
const HEALTH_FAIL_TTL_MS = 2 * 60 * 1000;
const graphHttp = axios.create({ timeout: 8000 });

const QUALITY = { GREEN: 'high', YELLOW: 'medium', RED: 'low' };
function tierLimit(tier) {
  const t = String(tier || '').toUpperCase();
  if (!t) return null;
  if (t === 'TIER_UNLIMITED' || t === 'UNLIMITED') return 'unlimited';
  const m = /^TIER_(\d+)(K|M)?$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * (m[2] === 'M' ? 1000000 : m[2] === 'K' ? 1000 : 1);
}

async function _graphHealth() {
  const out = { phone: null, display_name: null, verified: null, quality: null, messaging_limit: null, messaging_limit_tier: null, name_status: null, token_expires_at: null, token_never_expires: null };
  const errors = [];
  const whatsappService = require('./whatsappService.js');
  let creds;
  try {
    creds = await whatsappService.getCredentials(Number(process.env.WHATSAPP_SHARED_BRAND_ID) || 1);
  } catch (e) {
    return { ...out, error: 'WhatsApp isn’t connected yet (no access token or phone number id in settings)' };
  }
  try {
    const r = await graphHttp.get(`${GRAPH_API_URL}/${creds.phoneNumberId}`, {
      params: { fields: 'display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status,code_verification_status' },
      headers: { Authorization: `Bearer ${creds.token}` },
    });
    const d = r.data || {};
    out.phone = d.display_phone_number || null;
    out.display_name = d.verified_name || null;
    out.name_status = d.name_status || null;
    out.verified = d.name_status ? d.name_status === 'APPROVED' : (d.code_verification_status ? d.code_verification_status === 'VERIFIED' : null);
    out.quality = QUALITY[String(d.quality_rating || '').toUpperCase()] || (d.quality_rating ? String(d.quality_rating).toLowerCase() : null);
    out.messaging_limit_tier = d.messaging_limit_tier || null;
    out.messaging_limit = tierLimit(d.messaging_limit_tier);
  } catch (e) {
    errors.push(`Couldn’t read the number from WhatsApp: ${typeof whatsappService.metaError === 'function' ? whatsappService.metaError(e) : e.message}`);
  }
  // Token expiry needs an app access token (app id + app secret).
  const appId = process.env.WHATSAPP_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || process.env.WHATSAPP_WEBHOOK_SECRET;
  if (appId && appSecret) {
    try {
      const r = await graphHttp.get(`${GRAPH_API_URL}/debug_token`, { params: { input_token: creds.token, access_token: `${appId}|${appSecret}` } });
      const exp = Number(r.data?.data?.expires_at);
      if (exp === 0) { out.token_never_expires = true; out.token_expires_at = null; } else if (exp > 0) { out.token_never_expires = false; out.token_expires_at = new Date(exp * 1000); }
    } catch (e) { /* expiry is optional */ }
  }
  return errors.length ? { ...out, error: errors.join('; ') } : out;
}

async function getHealth({ refresh = false } = {}) {
  await ensureSchema();
  let graph;
  if (!refresh && _healthCache && Date.now() - _healthCache.at < _healthCache.ttl) {
    graph = _healthCache.data;
  } else {
    try { graph = await _graphHealth(); } catch (e) { graph = { error: e.message }; }
    _healthCache = { at: Date.now(), ttl: graph.error ? HEALTH_FAIL_TTL_MS : HEALTH_TTL_MS, data: graph };
  }
  // Local numbers (never cached — cheap, indexed).
  const [used] = await q(
    `SELECT COUNT(DISTINCT conversation_id) AS n FROM whatsapp_messages
      WHERE direction = 'outbound' AND status <> 'failed' AND createdAt >= :since`, { since: new Date(Date.now() - DAY) });
  // Last webhook from Meta: newest inbound message, or newest status receipt on
  // a recent outbound message (receipts bump updatedAt).
  const [hook] = await q(
    `SELECT MAX(CASE WHEN direction = 'inbound' THEN createdAt
                     WHEN status IN ('delivered','read','failed') THEN updatedAt END) AS at
       FROM (SELECT direction, status, createdAt, updatedAt FROM whatsapp_messages ORDER BY id DESC LIMIT 2000) t`);
  return {
    phone: graph.phone ?? null,
    display_name: graph.display_name ?? null,
    verified: graph.verified ?? null,
    quality: graph.quality ?? null,
    messaging_limit: graph.messaging_limit ?? null,
    messaging_limit_tier: graph.messaging_limit_tier ?? null,
    used_today: Number(used?.n) || 0,
    last_webhook_at: hook?.at ? toDate(hook.at) : null,
    token_expires_at: graph.token_expires_at ?? null,
    token_never_expires: graph.token_never_expires ?? null,
    checked_at: new Date(_healthCache.at),
    ...(graph.error ? { error: graph.error } : {}),
  };
}

// ─── Settings: failed sends ───────────────────────────────────────────────────
const META_ERRORS = {
  131026: 'Number isn’t on WhatsApp (or can’t receive messages)',
  131047: 'More than 24 hours since the customer’s last message — send a template instead',
  131049: 'WhatsApp held it back to avoid too many offers to this customer',
  131050: 'Customer stopped marketing messages from us',
  131051: 'Message type isn’t supported',
  131052: 'Couldn’t download the customer’s media',
  131053: 'Couldn’t upload the media file',
  131056: 'Too many messages to this customer in a short time',
  131048: 'WhatsApp paused sending — too many messages flagged as spam',
  130429: 'WhatsApp paused sending — too many in one minute',
  131042: 'Payment problem on the WhatsApp Business account',
  131031: 'WhatsApp Business account is locked',
  131000: 'WhatsApp had a temporary problem',
  131016: 'WhatsApp service was unavailable',
  131008: 'Template is missing a value',
  131009: 'Template value isn’t valid',
  132000: 'Template values don’t match the approved template',
  132001: 'Template doesn’t exist or isn’t approved in this language',
  132005: 'Template text is too long after filling in the values',
  132007: 'Template content breaks WhatsApp’s rules',
  132012: 'Template value is in the wrong format',
  132015: 'Template is paused by WhatsApp (low quality)',
  132016: 'Template is disabled by WhatsApp',
  133010: 'Our WhatsApp number isn’t registered',
  368: 'Our number is temporarily blocked for breaking WhatsApp rules',
  470: 'More than 24 hours since the customer’s last message — send a template instead',
  100: 'WhatsApp rejected the message (invalid parameter)',
  190: 'WhatsApp access token expired — renew it in Meta Business settings',
};

function describeFailure(code, text) {
  const c = Number(code);
  if (c && META_ERRORS[c]) return META_ERRORS[c];
  if (text) return String(text).slice(0, 200);
  return null;
}

// For the status webhook: store WHY a send failed so Settings → Failed sends
// can explain it. `errors` is Meta's statuses[].errors array. Never throws.
async function recordSendFailure(messageId, errors) {
  try {
    if (!messageId) return;
    await ensureSchema();
    const e = Array.isArray(errors) && errors.length ? errors[0] : (errors && typeof errors === 'object' ? errors : null);
    const code = e && Number(e.code) ? Number(e.code) : null;
    const text = e ? String(e.title || e.message || e.error_data?.details || '').slice(0, 255) || null : null;
    await exec('UPDATE whatsapp_messages SET error_code = :code, error_text = :text WHERE id = :id', { id: messageId, code, text });
  } catch (err) {
    logger.warn('[wa-insights] recordSendFailure failed: ' + err.message);
  }
}

const AUTO_LABEL = { away: 'Away message', order_status: 'Order status reply', opt_out: 'Opt-out confirmation' };

async function getFailed({ hours: rawHours, brandId: rawBrand } = {}) {
  await ensureSchema();
  const hours = Math.min(Math.max(parseInt(rawHours, 10) || 24, 1), 24 * 30);
  const brandId = parseBrandId(rawBrand);
  const since = new Date(Date.now() - hours * HOUR);
  const rows = await q(
    `SELECT m.id, m.conversation_id, m.type, m.body, m.createdAt AS at, m.error_code, m.error_text, m.auto_kind,
            c.customer_name, c.customer_phone, c.brand_id, c.opted_out
       FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
      WHERE m.createdAt >= :since AND m.direction = 'outbound' AND m.status = 'failed'
        ${brandId ? 'AND c.brand_id = :brandId' : ''}
      ORDER BY m.id DESC
      LIMIT 200`, { since, brandId });
  const brands = await brandMap();
  const failed = rows.map((r) => {
    let snippet = String(r.body || '');
    if (/^\s*\{/.test(snippet)) {
      try { const j = JSON.parse(snippet); snippet = j.caption || j.text || j.filename || ''; } catch (_) { /* keep */ }
    }
    snippet = snippet.replace(/\s+/g, ' ').trim();
    const kind = r.auto_kind ? AUTO_LABEL[r.auto_kind] || 'Automatic reply'
      : r.type === 'template' ? 'Template' : r.type === 'text' ? 'Reply' : `${r.type[0].toUpperCase()}${r.type.slice(1)}`;
    const who = r.customer_name || maskPhone(r.customer_phone) || 'Customer';
    const reason = describeFailure(r.error_code, r.error_text)
      || (Number(r.opted_out) ? 'Customer opted out' : 'WhatsApp didn’t say why');
    return {
      id: r.id,
      conversation_id: r.conversation_id,
      what: `${kind} · ${who}`,
      preview: snippet.slice(0, 80),
      customer_name: r.customer_name || null,
      phone_masked: maskPhone(r.customer_phone),
      brand: brands.get(Number(r.brand_id)) || null,
      error_code: r.error_code || null,
      reason,
      at: toDate(r.at),
    };
  });
  return { hours, total: failed.length, failed };
}

async function getOptedOut({ brandId: rawBrand } = {}) {
  const brandId = parseBrandId(rawBrand);
  const rows = await q(
    `SELECT id, customer_name, customer_phone, brand_id, updatedAt
       FROM whatsapp_conversations WHERE opted_out = 1 ${brandId ? 'AND brand_id = :brandId' : ''}
      ORDER BY updatedAt DESC LIMIT 1000`, { brandId });
  const brands = await brandMap();
  return {
    total: rows.length,
    customers: rows.map((r) => ({
      conversation_id: r.id,
      name: r.customer_name || null,
      phone_masked: maskPhone(r.customer_phone),
      brand_id: Number(r.brand_id) || 1,
      brand: brands.get(Number(r.brand_id)) || null,
      updated_at: toDate(r.updatedAt),
    })),
  };
}

// ─── Settings: test send ──────────────────────────────────────────────────────
// Sends an approved template (or, without templateName, the old plain test
// text — only delivered inside the 24-hour window) to any number.
async function sendTest({ phone, templateName, brandId: rawBrand, params } = {}) {
  const p = p10Of(phone);
  if (!p && String(phone || '').replace(/\D/g, '').length < 10) return { status: 400, body: { success: false, message: 'Enter a valid phone number' } };
  const to = String(phone).replace(/\D/g, '').length > 10 ? String(phone).replace(/\D/g, '') : p;
  const brandId = parseBrandId(rawBrand) || 1;
  const whatsappService = require('./whatsappService.js');
  const err = (e) => (typeof whatsappService.metaError === 'function' ? whatsappService.metaError(e) : e.message);
  try {
    let result;
    let used = null;
    if (!templateName) {
      result = await whatsappService.testConnection(to, brandId);
    } else {
      const name = String(templateName).trim();
      const list = (await whatsappService.listTemplates(brandId))?.data || [];
      const tpl = list.find((t) => t.name === name);
      if (!tpl) return { status: 404, body: { success: false, message: `Template “${name}” isn’t on the WhatsApp account` } };
      if (String(tpl.status).toUpperCase() !== 'APPROVED') {
        return { status: 409, body: { success: false, message: `Template “${name}” isn’t approved yet (${String(tpl.status).toLowerCase()})` } };
      }
      const body = (tpl.components || []).find((c) => String(c.type).toUpperCase() === 'BODY');
      const n = new Set(String(body?.text || '').match(/\{\{\s*\d+\s*\}\}/g) || []).size;
      const examples = body?.example?.body_text?.[0] || [];
      const vals = Array.from({ length: n }, (_, i) => String((Array.isArray(params) && params[i]) || examples[i] || 'Test'));
      result = await whatsappService.sendTemplate(to, name, vals, brandId, { urlParam: 'TEST' });
      used = name;
    }
    if (result && result.rate_limited) return { status: 429, body: { success: false, message: 'This number already got 10 messages in the last hour' } };
    return { status: 200, body: { success: true, sent_to: maskPhone(to) || to, template: used, wa_message_id: result?.messages?.[0]?.id || null, at: new Date() } };
  } catch (e) {
    return { status: 502, body: { success: false, message: `WhatsApp didn’t accept the test: ${err(e)}` } };
  }
}

// ─── Inbound automations ──────────────────────────────────────────────────────
// Order-status questions: English + common Hinglish. Kept deliberately narrow
// so "I want to order", "how to order" or "cancel my order" never trigger it.
const ORDER_WORD = '(?:order|parcel|package|pkg|shipment|delivery|saman|samaan|courier)';
const ORDER_STATUS_PATTERNS = [
  new RegExp(`\\b(?:where|wher|whr|wer)(?:'?s| is| s)?\\s+(?:is\\s+)?(?:my|mera|meri|the|our)\\s+${ORDER_WORD}`),
  new RegExp(`\\b${ORDER_WORD}\\s+(?:ka\\s+|ki\\s+)?(?:status|update|tracking)\\b`),
  new RegExp(`\\b(?:status|update|tracking)\\s+(?:of|for|on)\\s+(?:my|the|mera|meri)?\\s*${ORDER_WORD}`),
  new RegExp(`\\btrack(?:ing)?\\s+(?:my\\s+|mera\\s+|the\\s+)?${ORDER_WORD}`),
  new RegExp(`\\b${ORDER_WORD}\\s+(?:kab|kb|kitne din me|kitne dino me)\\b`),
  /\b(?:kab|kb)\s+(?:tak\s+)?(?:aayega|ayega|aaega|aega|aayegi|ayegi|aaegi|aegi|milega|milegi|pahunchega|pahuchega|deliver)/,
  new RegExp(`\\b${ORDER_WORD}\\s+(?:kaha|kahan|kidhar|kaha pe|kahan pe)\\b`),
  new RegExp(`\\b(?:mera|meri)\\s+${ORDER_WORD}\\s+(?:abhi\\s+)?(?:tak\\s+)?(?:nahi|nhi|nai|nahin)\\s+(?:aaya|aya|aayi|ayi|mila|mili)`),
  new RegExp(`\\b(?:not|never|still not|haven'?t|have not|didn'?t|did not)\\s+(?:yet\\s+)?(?:received|got|get)\\s+(?:my\\s+|the\\s+)?${ORDER_WORD}`),
  new RegExp(`\\b${ORDER_WORD}\\s+(?:not|still not|is not|isn'?t|has not|hasn'?t)\\s+(?:yet\\s+)?(?:received|delivered|arrived|come|reached|shipped|dispatched)`),
  new RegExp(`\\bwhen\\s+(?:will|would|do|does|can)\\s+(?:i|we)\\s+(?:get|receive)\\s+(?:my|the|our)\\s+${ORDER_WORD}`),
  new RegExp(`\\bwhen\\s+(?:will|would|does|is)\\s+(?:my|the|our)\\s+${ORDER_WORD}\\s+(?:arrive|come|reach|be delivered|get delivered|ship|be shipped|dispatch|be dispatched)`),
  new RegExp(`\\b(?:has|is|was)\\s+(?:my|the)\\s+${ORDER_WORD}\\s+(?:been\\s+)?(?:shipped|dispatched|delivered)`),
  /^(?:track|tracking|order status|status)$/,
];
const ORDER_STATUS_EXCLUDE = /\b(?:cancel|cancell?ation|return|refund|exchange|replace|replacement)\b/;

function normaliseText(text) {
  return String(text || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function isOrderStatusQuery(text) {
  const t = normaliseText(text);
  if (!t || t.length > 300) return false;
  if (ORDER_STATUS_EXCLUDE.test(t)) return false;
  return ORDER_STATUS_PATTERNS.some((re) => re.test(t));
}

function matchesOptOut(text, words) {
  const t = normaliseText(text);
  if (!t) return false;
  return (words || []).some((w) => normaliseText(w) === t);
}

function isWithinHours(date, start, end) {
  const s = HHMM_RE.exec(start); const e = HHMM_RE.exec(end);
  if (!s || !e) return true;
  const sm = Number(s[1]) * 60 + Number(s[2]);
  const em = Number(e[1]) * 60 + Number(e[2]);
  const p = ist(date);
  const m = p.h * 60 + p.min;
  return sm < em ? (m >= sm && m < em) : (m >= sm || m < em);
}

const fmt12 = (hhmm) => {
  const m = HHMM_RE.exec(hhmm || '');
  if (!m) return hhmm || '';
  const h = Number(m[1]); const mi = m[2];
  return `${((h + 11) % 12) + 1}${mi === '00' ? '' : `:${mi}`} ${h < 12 ? 'am' : 'pm'}`;
};

const STATUS_WORDS = {
  pending: 'Order received', awaiting_confirmation: 'Waiting for you to confirm', confirmed: 'Confirmed — being packed',
  processing: 'Being packed', booked: 'Packed — waiting for the courier', 'pickup initiated': 'Packed — courier pickup booked',
  manifested: 'Packed — handed to the courier soon', shipped: 'Shipped', 'in transit': 'On the way',
  'out for delivery': 'Out for delivery today', delivered: 'Delivered', undelivered: 'Delivery attempt failed',
  exception: 'Delivery problem — our team is checking', rto: 'Returning to us', 'rto delivered': 'Returned to us',
  return_initiated: 'Return started', returned_rto: 'Returned to us', cancelled: 'Cancelled', 'order cancelled': 'Cancelled',
};

async function latestOrderFor(phone) {
  const p = p10Of(phone);
  if (!p) return null;
  const h = phoneHash(p);
  const rows = await q(
    `SELECT o.order_number, o.status, o.brand_id, o.courier_name, o.shipping_waybill, o.tracking_number, o.created_at
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
      WHERE ${h ? 'a.phone_hash = :h OR g.phone_hash = :h OR ' : ''}RIGHT(u.phone, 10) = :p
      ORDER BY o.created_at DESC LIMIT 1`, { h, p });
  return rows[0] || null;
}

async function brandName(brandId) {
  try {
    const [b] = await q('SELECT COALESCE(display_name, name) AS name FROM brands WHERE id = :id', { id: brandId });
    return b?.name || 'our store';
  } catch (_) { return 'our store'; }
}

const _autoLocks = new Set();

async function recentAuto(convId, kind, sinceMs) {
  const rows = await q(
    'SELECT id FROM whatsapp_messages WHERE conversation_id = :cid AND auto_kind = :kind AND createdAt >= :since LIMIT 1',
    { cid: convId, kind, since: new Date(Date.now() - sinceMs) });
  return rows.length > 0;
}

// Saves our automatic reply in the chat FIRST (so a concurrent inbound sees it
// and doesn't send a second one), then sends it and writes the outcome back.
async function sendAutoText(conv, text, kind, sendText) {
  const now = new Date();
  const [insertId] = await exec(
    `INSERT INTO whatsapp_messages (conversation_id, wa_message_id, direction, type, body, status, sent_at, auto_kind, createdAt, updatedAt)
     VALUES (:cid, NULL, 'outbound', 'text', :body, 'sent', :now, :kind, :now, :now)`,
    { cid: conv.id, body: text, now, kind });
  const rowId = typeof insertId === 'number' ? insertId : insertId?.insertId;
  try {
    const result = await sendText(conv.customer_phone, text, Number(conv.brand_id) || 1);
    if (result && result.rate_limited) {
      await exec(`UPDATE whatsapp_messages SET status = 'failed', error_text = :t WHERE id = :id`,
        { id: rowId, t: 'Hourly limit of 10 messages to this customer reached' });
      return { sent: false, messageId: rowId, error: 'rate_limited' };
    }
    const waId = result?.messages?.[0]?.id || null;
    if (waId) await exec('UPDATE whatsapp_messages SET wa_message_id = :waId WHERE id = :id', { id: rowId, waId }).catch(() => {});
    await exec('UPDATE whatsapp_conversations SET last_message = :text, last_message_at = :now WHERE id = :cid',
      { text: text.slice(0, 1000), now: new Date(), cid: conv.id }).catch(() => {});
    return { sent: true, messageId: rowId, waMessageId: waId };
  } catch (e) {
    await exec(`UPDATE whatsapp_messages SET status = 'failed', error_text = :t WHERE id = :id`,
      { id: rowId, t: String(e.message || 'send failed').slice(0, 255) }).catch(() => {});
    logger.warn(`[wa-insights] ${kind} reply to conversation ${conv.id} failed: ${e.message}`);
    return { sent: false, messageId: rowId, error: e.message };
  }
}

// Called by the webhook for every inbound customer message (after it is saved).
//   conversation — the whatsapp_conversations row (Sequelize instance or plain)
//   message      — { type, body | text, awaitingAddress? }
//   deps         — optional { sendText(phone, text, brandId), now } for tests
// Returns { handled, action }. handled = true means this message was fully
// answered here (opt-out, or an order-status question) and the legacy keyword
// bot must NOT also reply to it. action ∈ 'opt_out' | 'opt_out_repeat' |
// 'order_status' | 'order_status_limited' | 'order_status_off' | 'away' | 'none'.
// Never throws.
async function handleInboundAutomation(conversation, message, deps = {}) {
  const none = { handled: false, action: 'none' };
  try {
    if (!conversation || !message) return none;
    const conv = typeof conversation.get === 'function' ? conversation.get({ plain: true }) : conversation;
    if (!conv.id || !conv.customer_phone) return none;
    const type = message.type || 'text';
    if (type === 'reaction') return none;
    const text = String(message.body != null ? message.body : (message.text || ''));
    const now = deps.now || new Date();
    const sendText = deps.sendText || ((phone, body, brandId) => require('./whatsappService.js').sendTextMessage(phone, body, brandId));
    await ensureSchema();
    const settings = await getInboxSettings();
    // The customer is mid-flow (typing a new delivery address) — stay out of it.
    if (message.awaitingAddress || conv.awaiting_address_for) return none;

    const isText = type === 'text' && text.trim();

    // 1) Opt-out words — whole message match, case-insensitive.
    if (isText && matchesOptOut(text, settings.opt_out_words)) {
      if (Number(conv.opted_out) || conv.opted_out === true) return { handled: true, action: 'opt_out_repeat' };
      const [, meta] = await exec('UPDATE whatsapp_conversations SET opted_out = 1, updatedAt = :now WHERE id = :id AND opted_out = 0', { id: conv.id, now });
      if (meta && !(meta.affectedRows || meta.changedRows)) return { handled: true, action: 'opt_out_repeat' };
      if (typeof conversation.set === 'function') { try { conversation.set('opted_out', true, { raw: true }); } catch (_) { /* ignore */ } }
      const brand = await brandName(Number(conv.brand_id) || 1);
      await sendAutoText(conv,
        `Done — you won’t get offers from ${brand} on WhatsApp any more. You’ll still get updates about your orders. Reply START if you change your mind.`,
        'opt_out', sendText);
      return { handled: true, action: 'opt_out' };
    }

    // 2) "Where is my order?" → latest order stage + tracking link (max once an hour).
    if (isText && isOrderStatusQuery(text)) {
      if (!settings.auto_order_status.enabled) return { handled: true, action: 'order_status_off' };
      const lockKey = `${conv.id}:order_status`;
      if (_autoLocks.has(lockKey) || await recentAuto(conv.id, 'order_status', HOUR)) return { handled: true, action: 'order_status_limited' };
      _autoLocks.add(lockKey);
      try {
        const order = await latestOrderFor(conv.customer_phone);
        const first = String(conv.customer_name || '').trim().split(/\s+/)[0];
        const hi = first && !/^\+?\d/.test(first) ? `Hi ${first}!` : 'Hi!';
        let reply;
        if (order) {
          const b = Number(order.brand_id) || 1;
          const brand = await brandName(b);
          let url = null;
          try { url = await require('./whatsappService.js').getTrackingUrl(b, order.order_number); } catch (_) { /* no link */ }
          const stage = STATUS_WORDS[String(order.status || '').toLowerCase()] || order.status || 'Being processed';
          const awb = order.shipping_waybill || order.tracking_number;
          const lines = [`${hi} Your latest ${brand} order *#${order.order_number}*`, `Status: *${stage}*`];
          if (order.courier_name || awb) lines.push(`Courier: ${[order.courier_name, awb ? `AWB ${awb}` : null].filter(Boolean).join(' · ')}`);
          if (url) lines.push('', `Track it here: ${url}`);
          lines.push('', 'Need anything else? Just reply here and our team will help.');
          reply = lines.join('\n');
        } else {
          reply = `${hi} We couldn’t find an order for this WhatsApp number. Please send your order number and our team will check it for you.`;
        }
        await sendAutoText(conv, reply, 'order_status', sendText);
        return { handled: true, action: 'order_status' };
      } finally {
        _autoLocks.delete(lockKey);
      }
    }

    // 3) Away message — outside opening hours, once per chat every 12 hours.
    if (settings.away.enabled && !isWithinHours(now, settings.away.start, settings.away.end)) {
      const lockKey = `${conv.id}:away`;
      if (_autoLocks.has(lockKey) || await recentAuto(conv.id, 'away', 12 * HOUR)) return none;
      _autoLocks.add(lockKey);
      try {
        const body = settings.away.text
          .replace(/\{start\}/g, fmt12(settings.away.start))
          .replace(/\{end\}/g, fmt12(settings.away.end));
        await sendAutoText(conv, body, 'away', sendText);
        return { handled: false, action: 'away' };
      } finally {
        _autoLocks.delete(lockKey);
      }
    }
    return none;
  } catch (e) {
    logger.warn('[wa-insights] handleInboundAutomation error: ' + e.message);
    return none;
  }
}

// For the inbox reply paths: remember which staff member sent a message.
// Never throws.
async function stampSentBy(messageId, userId) {
  try {
    if (!messageId || !userId) return;
    await ensureSchema();
    await exec('UPDATE whatsapp_messages SET sent_by = :uid WHERE id = :id', { id: messageId, uid: Number(userId) });
  } catch (e) {
    logger.warn('[wa-insights] stampSentBy failed: ' + e.message);
  }
}

module.exports = {
  ensureSchema,
  readSetting,
  writeSetting,
  periodRange,
  // carts
  getCarts,
  sendCartNow,
  saveCartRules,
  // analytics
  getAnalytics,
  salesFromWhatsApp,
  // settings
  getHealth,
  getInboxSettings,
  saveInboxSettings,
  getFailed,
  getOptedOut,
  sendTest,
  describeFailure,
  recordSendFailure,
  // inbound automations
  handleInboundAutomation,
  isOrderStatusQuery,
  matchesOptOut,
  isWithinHours,
  stampSentBy,
  DEFAULT_INBOX,
};
