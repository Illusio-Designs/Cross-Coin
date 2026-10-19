const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { phoneHash, decrypt } = require('../utils/encryption.js');
const { cleanName } = require('./customerProfileService.js');

/**
 * Customers list — one row per shopper across registered accounts, guest
 * checkouts and leads (abandoned carts + popup phone sign-ups), for the
 * Dashboard Customers page (GET /api/admin/customers) and its CSV export.
 *
 * Identity: the same rules as the customer profile (customerProfileService) —
 * users are per brand, so the same phone can be several user rows; guests,
 * carts and leads with that phone are the SAME person. Everything with a
 * phone groups on a "phone key"; rows with no usable phone stay on their own
 * (see pkNum below for the BIGINT person key).
 *   key = phone_hash (HMAC of the last 10 digits) when DATA_ENCRYPTION_KEY is
 *         set — guest_users / abandoned_carts carry it; users.phone and
 *         lead_captures.phone are plain, so their hashes are cached in
 *         customer_phone_keys (synced lazily, below).
 *       = the plain last 10 digits when no key is configured (dev / test,
 *         where phones are stored unencrypted).
 *
 * Money mirrors the profile: spent = delivered value − refunds on those orders
 * (payments.amount_paid < 0 — paise for prepaid, rupees for COD — plus
 * refunded COD returns). Orders count once, for the account / guest that
 * placed them.
 *
 * Schema (lazy, once per process, never destructive):
 *   CREATE TABLE IF NOT EXISTS customer_phone_keys (
 *     src VARCHAR(8), src_id INT, pkey CHAR(64) NULL, sig CHAR(32),
 *     PRIMARY KEY (src, src_id), KEY idx_cpk_pkey (pkey))
 *   src = 'user' (users.phone) | 'lead' (lead_captures.phone); sig = MD5 of the
 *   phone the key was made from (+ a key fingerprint), so an edited phone or a
 *   rotated key is re-keyed and an erased phone is dropped. Holds hashes only —
 *   never a phone number.
 */

const SEGMENTS = ['all', 'repeat', 'vip', 'lapsed', 'risky', 'leads'];
const SORTS = ['spent', 'recent', 'newest'];
const VIP_SPEND = 3000;
const LAPSED_DAYS = 60;
const EXPORT_CAP = 50000;
const SYNC_EVERY_MS = 20 * 1000;

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const exec = (sql, replacements = {}) => sequelize.query(sql, { replacements });
const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round(num(v) * 100) / 100;
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);

// Hash mode when the encryption key is configured (phoneHash returns null without it).
const hashMode = () => phoneHash('9999999999') !== null;

// ── Schema + phone-key cache ─────────────────────────────────────────────
let _schemaPromise = null;
function ensureSchema() {
  if (!_schemaPromise) {
    _schemaPromise = exec(`CREATE TABLE IF NOT EXISTS customer_phone_keys (
        src VARCHAR(8) NOT NULL,
        src_id INT NOT NULL,
        pkey CHAR(64) NULL,
        sig CHAR(32) NOT NULL,
        PRIMARY KEY (src, src_id),
        KEY idx_cpk_pkey (pkey)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch((e) => {
      _schemaPromise = null; // retry on the next call
      throw e;
    });
  }
  return _schemaPromise;
}

const KEY_SOURCES = {
  user: { table: 'users', id: 'id', phone: 'phone' },
  lead: { table: 'lead_captures', id: 'id', phone: 'phone' },
};

// sig also covers the key, so rotating DATA_ENCRYPTION_KEY re-keys every row.
async function syncSource(src) {
  const { table, id, phone } = KEY_SOURCES[src];
  const fp = phoneHash('0000000000').slice(0, 16);
  // Drop keys whose source row / phone is gone (erased account, deleted lead).
  const gone = await q(
    `SELECT k.src_id AS id FROM customer_phone_keys k
       LEFT JOIN ${table} t ON t.${id} = k.src_id
      WHERE k.src = :src AND (t.${id} IS NULL OR t.${phone} IS NULL OR t.${phone} = '')`, { src });
  for (let i = 0; i < gone.length; i += 1000) {
    await exec(`DELETE FROM customer_phone_keys WHERE src = :src AND src_id IN (:ids)`,
      { src, ids: gone.slice(i, i + 1000).map((r) => r.id) });
  }
  // New or changed phones → (re)compute the hash.
  for (;;) {
    const rows = await q(
      `SELECT t.${id} AS id, t.${phone} AS phone, MD5(CONCAT(t.${phone}, :fp)) AS sig FROM ${table} t
         LEFT JOIN customer_phone_keys k ON k.src = :src AND k.src_id = t.${id}
        WHERE t.${phone} IS NOT NULL AND t.${phone} <> '' AND (k.src_id IS NULL OR k.sig <> MD5(CONCAT(t.${phone}, :fp)))
        LIMIT 2000`, { src, fp });
    if (!rows.length) break;
    const values = rows.map((r) => [src, r.id, phoneHash(r.phone), r.sig]);
    await sequelize.query(
      `INSERT INTO customer_phone_keys (src, src_id, pkey, sig) VALUES ${values.map(() => '(?, ?, ?, ?)').join(', ')}
       ON DUPLICATE KEY UPDATE pkey = VALUES(pkey), sig = VALUES(sig)`,
      { replacements: values.flat() }
    );
    if (rows.length < 2000) break;
  }
}

let _lastSync = 0;
let _syncing = null;
async function syncPhoneKeys() {
  if (!hashMode()) return;
  if (_syncing) return _syncing;
  if (Date.now() - _lastSync < SYNC_EVERY_MS) return;
  _syncing = (async () => {
    try {
      await syncSource('user');
      await syncSource('lead');
      _lastSync = Date.now();
    } finally {
      _syncing = null;
    }
  })();
  return _syncing;
}

// ── SQL pieces ───────────────────────────────────────────────────────────
const plainKey = (col) =>
  `(CASE WHEN CHAR_LENGTH(REGEXP_REPLACE(${col}, '[^0-9]', '')) >= 10 THEN RIGHT(REGEXP_REPLACE(${col}, '[^0-9]', ''), 10) END)`;

function keyExprs(hash) {
  return hash
    ? { user: 'uk.pkey', guest: 'g.phone_hash', cart: 'ac.phone_hash', lead: 'lk.pkey',
        userJoin: `LEFT JOIN customer_phone_keys uk ON uk.src = 'user' AND uk.src_id = u.id`,
        leadJoin: `LEFT JOIN customer_phone_keys lk ON lk.src = 'lead' AND lk.src_id = l.id` }
    : { user: plainKey('u.phone'), guest: plainKey('g.phone'), cart: plainKey('ac.phone'), lead: plainKey('l.phone'),
        userJoin: '', leadJoin: '' };
}

const DELIVERED = `(o.status = 'delivered' OR (o.status IN ('return_initiated', 'returned_rto') AND COALESCE(rt.n, 0) > 0))`;
const RTO = `(o.status IN ('rto', 'rto delivered') OR (o.status = 'returned_rto' AND COALESCE(rt.n, 0) = 0))`;

const ORDER_BY = {
  spent: 'x.spent DESC, x.last_at DESC, x.pk',
  recent: '(x.last_at IS NULL), x.last_at DESC, x.since DESC, x.pk',
  newest: 'x.since DESC, x.pk',
};
const SEG_WHERE = {
  all: '1 = 1', repeat: 'x.s_repeat = 1', vip: 'x.s_vip = 1', lapsed: 'x.s_lapsed = 1', risky: 'x.s_risky = 1', leads: 'x.s_leads = 1',
};

const escLike = (s) => String(s).replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Turn the search box into SQL conditions. A 10-digit number is a phone
 * (matched by key, plus the accounts / guests whose orders were shipped to
 * it); shorter digit runs match plain phones partially; an exact order number
 * finds whoever placed it; anything else matches name / email.
 */
async function buildSearch(raw, hash) {
  const text = String(raw || '').trim().slice(0, 100);
  if (!text) return null;
  const digits = text.replace(/\D/g, '');
  const phoneLike = /^[\d\s+()-]+$/.test(text);
  const s = { like: `%${escLike(text)}%`, digitsLike: null, phonePk: null, uids: [], gids: [] };

  if (phoneLike && digits.length >= 10) {
    const p10 = digits.slice(-10);
    const key = hash ? phoneHash(p10) : p10;
    s.phonePk = pkForKey(key);
    s.like = null;
    // Orders shipped to this phone (address phones are encrypted → by hash).
    const addrs = await q(
      hash
        ? `SELECT id, user_id, guest_user_id FROM shipping_addresses WHERE phone_hash = :key LIMIT 500`
        : `SELECT id, user_id, guest_user_id FROM shipping_addresses WHERE ${plainKey('phone')} = :key LIMIT 500`,
      { key }
    ).catch(() => []);
    if (addrs.length) {
      const owners = await q(
        `SELECT DISTINCT user_id, guest_user_id FROM orders WHERE shipping_address_id IN (:ids) LIMIT 500`,
        { ids: addrs.map((a) => a.id) }
      ).catch(() => []);
      for (const r of [...addrs, ...owners]) {
        if (r.user_id) s.uids.push(r.user_id);
        if (r.guest_user_id) s.gids.push(r.guest_user_id);
      }
    }
  } else if (phoneLike && digits.length >= 4) {
    s.digitsLike = `%${digits}%`;
    s.like = null;
  } else {
    const ord = await q(`SELECT user_id, guest_user_id FROM orders WHERE order_number = :n LIMIT 5`, { n: text }).catch(() => []);
    for (const r of ord) {
      if (r.user_id) s.uids.push(r.user_id);
      if (r.guest_user_id) s.gids.push(r.guest_user_id);
    }
  }
  s.uids = [...new Set(s.uids)];
  s.gids = [...new Set(s.gids)];
  return s;
}

/**
 * Person key as a BIGINT (small, fast GROUP BY / join keys):
 *   phone   → the first 15 hex digits of the key read as a number (a hash
 *             prefix — 60 bits, collisions negligible; the plain 10 digits
 *             in dev read as hex are unique)
 *   user without a phone  → −user id
 *   guest without a phone → −(guest id + 10^12)
 */
const pkNum = (keyExpr) => `CAST(CONV(LEFT(${keyExpr}, 15), 16, 10) AS SIGNED)`;
const GUEST_PK_OFFSET = 1000000000000;
const pkForKey = (key) => (key ? BigInt(`0x${String(key).slice(0, 15)}`).toString() : null);

// Every identity row (account, guest, cart, popup lead) with its person key.
function membersSql(k, hits = {}) {
  return `
  SELECT COALESCE(${pkNum(k.user)}, -u.id) AS pk, 'u' AS src, u.id AS sid, u.id AS okey,
         u.source_brand_id AS brand_id, u.createdAt AS at, ${hits.u || '0'} AS hit
    FROM users u ${k.userJoin}
   WHERE u.role = 'consumer' AND u.deleted_at IS NULL
  UNION ALL
  SELECT COALESCE(${pkNum(k.guest)}, -(g.id + ${GUEST_PK_OFFSET})), 'g', g.id, -g.id, NULL, g.created_at, ${hits.g || '0'}
    FROM guest_users g
  UNION ALL
  SELECT ${pkNum(k.cart)}, 'c', ac.id, NULL, ac.brand_id, ac.created_at, ${hits.c || '0'}
    FROM abandoned_carts ac WHERE ${k.cart} IS NOT NULL
  UNION ALL
  SELECT ${pkNum(k.lead)}, 'l', l.id, NULL, l.brand_id, l.createdAt, ${hits.l || '0'}
    FROM lead_captures l ${k.leadJoin} WHERE ${k.lead} IS NOT NULL`;
}

/**
 * The one query: orders aggregated per account / guest → identities grouped
 * into people → segment flags, with all six segment counts as window totals
 * over the filtered set (so the tiles and the page come from one statement).
 */
function buildQuery({ brandId, search, segment, sort, hash, limit, offset }) {
  const k = keyExprs(hash);
  const rep = { cutoff: new Date(Date.now() - LAPSED_DAYS * 86400000), vip: VIP_SPEND };
  if (brandId) rep.brandId = brandId;

  // Per-member search hit (0 when not searching).
  const hits = {};
  if (search) {
    const u = []; const g = []; const c = []; const l = [];
    if (search.like) {
      rep.like = search.like;
      u.push('u.username LIKE :like', 'u.email LIKE :like');
      g.push(`CONCAT_WS(' ', g.first_name, g.last_name) LIKE :like`, 'g.email LIKE :like');
      c.push('ac.customer_name LIKE :like');
    }
    if (search.digitsLike) {
      rep.digitsLike = search.digitsLike;
      u.push(`REGEXP_REPLACE(u.phone, '[^0-9]', '') LIKE :digitsLike`);
      l.push(`REGEXP_REPLACE(l.phone, '[^0-9]', '') LIKE :digitsLike`);
      if (!hash) {
        g.push(`REGEXP_REPLACE(g.phone, '[^0-9]', '') LIKE :digitsLike`);
        c.push(`REGEXP_REPLACE(ac.phone, '[^0-9]', '') LIKE :digitsLike`);
      }
    }
    if (search.uids.length) { rep.hitUids = search.uids; u.push('u.id IN (:hitUids)'); }
    if (search.gids.length) { rep.hitGids = search.gids; g.push('g.id IN (:hitGids)'); }
    const or = (a) => (a.length ? `(${a.join(' OR ')})` : '0');
    Object.assign(hits, { u: or(u), g: or(g), c: or(c), l: or(l) });
  }

  const where = [];
  if (brandId) where.push('(p.in_brand = 1 OR p.orders > 0)');
  if (search) {
    // phonePk is a digits-only BIGINT we computed — inlined so it is compared as an integer.
    where.push(search.phonePk ? `(p.hit = 1 OR p.pk = ${search.phonePk})` : 'p.hit = 1');
  }

  const sql = `
WITH oagg AS (
  SELECT IF(o.user_id IS NOT NULL, o.user_id, -o.guest_user_id) AS okey,
         COUNT(*) AS orders,
         SUM(${DELIVERED}) AS delivered,
         SUM(CASE WHEN ${DELIVERED} THEN o.final_amount - COALESCE(pr.amt, 0) - COALESCE(rt.cod_refund, 0) ELSE 0 END) AS spent,
         SUM(${RTO}) AS rto,
         SUM(COALESCE(rt.n, 0)) AS returns_n,
         MAX(o.created_at) AS last_at,
         MIN(o.created_at) AS first_at,
         MAX(CAST(UNIX_TIMESTAMP(o.created_at) AS SIGNED) * 1000000000 + o.id) AS last_key
    FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(CASE WHEN payment_type = 'cod' THEN -amount_paid ELSE -amount_paid / 100 END) AS amt
        FROM payments WHERE amount_paid < 0 AND status <> 'failed' GROUP BY order_id
    ) pr ON pr.order_id = o.id
    LEFT JOIN (
      SELECT order_id, COUNT(*) AS n,
             SUM(CASE WHEN status = 'refunded' AND is_cod = 1 THEN COALESCE(refund_amount, 0) ELSE 0 END) AS cod_refund
        FROM returns GROUP BY order_id
    ) rt ON rt.order_id = o.id
   WHERE (o.user_id IS NOT NULL OR o.guest_user_id IS NOT NULL)${brandId ? ' AND o.brand_id = :brandId' : ''}
   GROUP BY okey
),
members AS (${membersSql(k, hits)}
),
people AS (
  SELECT m.pk,
         MIN(CASE WHEN m.src = 'u' THEN m.sid END) AS uid,
         MAX(CASE WHEN m.src = 'g' THEN m.sid END) AS gid,
         MAX(CASE WHEN m.src = 'c' THEN m.sid END) AS cid,
         MAX(CASE WHEN m.src = 'l' THEN m.sid END) AS lid,
         SUM(m.src = 'u') AS n_users,
         MIN(m.at) AS first_seen,
         MAX(m.hit) AS hit,
         ${brandId ? 'MAX(m.brand_id = :brandId)' : '0'} AS in_brand,
         COALESCE(SUM(a.orders), 0) AS orders,
         COALESCE(SUM(a.delivered), 0) AS delivered,
         COALESCE(SUM(a.spent), 0) AS spent,
         COALESCE(SUM(a.rto), 0) AS rto,
         COALESCE(SUM(a.returns_n), 0) AS returns_n,
         MAX(a.last_at) AS last_at,
         MIN(a.first_at) AS first_at,
         MAX(a.last_key) AS last_key
    FROM members m LEFT JOIN oagg a ON a.okey = m.okey
   GROUP BY m.pk
),
flagged AS (
  SELECT p.pk, p.uid, p.gid, p.cid, p.lid, p.n_users, p.orders, p.delivered, p.spent, p.rto, p.returns_n, p.last_at,
         MOD(p.last_key, 1000000000) AS last_order_id,
         LEAST(p.first_seen, COALESCE(p.first_at, p.first_seen)) AS since,
         (p.delivered >= 2) AS s_repeat,
         (p.spent > :vip) AS s_vip,
         (p.orders > 0 AND p.last_at < :cutoff) AS s_lapsed,
         (p.rto >= 2) AS s_risky,
         (p.orders = 0) AS s_leads
    FROM people p
   ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
)
SELECT CAST(x.pk AS CHAR) AS pk_s, x.* FROM (
  SELECT f.*,
         COUNT(*) OVER () AS c_all, SUM(f.s_repeat) OVER () AS c_repeat, SUM(f.s_vip) OVER () AS c_vip,
         SUM(f.s_lapsed) OVER () AS c_lapsed, SUM(f.s_risky) OVER () AS c_risky, SUM(f.s_leads) OVER () AS c_leads
    FROM flagged f
) x
WHERE ${SEG_WHERE[segment]}
ORDER BY ${ORDER_BY[sort]}
LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
  return { sql, rep };
}

// Counts only — used when the requested page is past the end (no rows to
// carry the window totals).
function countsQuery(built) {
  const sql = built.sql.replace(/SELECT CAST\(x\.pk AS CHAR\) AS pk_s, x\.\* FROM \([\s\S]*$/, `
SELECT COUNT(*) AS c_all, SUM(s_repeat) AS c_repeat, SUM(s_vip) AS c_vip, SUM(s_lapsed) AS c_lapsed,
       SUM(s_risky) AS c_risky, SUM(s_leads) AS c_leads FROM flagged`);
  return { sql, rep: built.rep };
}

const countsOf = (r) => ({
  all: num(r?.c_all), repeat: num(r?.c_repeat), vip: num(r?.c_vip),
  lapsed: num(r?.c_lapsed), risky: num(r?.c_risky), leads: num(r?.c_leads),
});

// ── Row details (names, contacts, brands) for a page of people ───────────
const maskPhone = (p) => {
  const d = last10(p);
  return d.length === 10 ? `${d.slice(0, 2)}•• ••${d.slice(6)}` : null;
};
const maskEmail = (e) => {
  const s = String(e || '');
  const at = s.indexOf('@');
  if (at < 1) return null;
  return `${s.slice(0, Math.min(2, at))}•••${s.slice(at)}`;
};

/**
 * Members of the given people (all their accounts, guest checkouts, carts and
 * leads) — for the brand list. pks = null loads everyone (CSV export).
 */
async function loadMembers(pks, hash) {
  if (pks && !pks.length) return new Map();
  const safe = pks ? pks.filter((x) => /^-?\d+$/.test(x)) : null;
  const rows = await q(`SELECT CAST(m.pk AS CHAR) AS pk, m.src, m.sid, m.brand_id FROM (${membersSql(keyExprs(hash))}) m
    ${safe ? `WHERE m.pk IN (${safe.join(',')})` : ''}`);
  const byPk = new Map();
  for (const r of rows) {
    if (!byPk.has(r.pk)) byPk.set(r.pk, { uids: [], gids: [], brandIds: new Set() });
    const e = byPk.get(r.pk);
    if (r.src === 'u') e.uids.push(r.sid);
    if (r.src === 'g') e.gids.push(r.sid);
    if (r.brand_id) e.brandIds.add(r.brand_id);
  }
  return byPk;
}

async function loadDetails(rows, hash, membersByPk = null) {
  const uids = rows.map((r) => r.uid).filter(Boolean);
  const gids = rows.map((r) => r.gid).filter(Boolean);
  const cids = rows.map((r) => r.cid).filter(Boolean);
  const lids = rows.map((r) => r.lid).filter(Boolean);
  const lastIds = rows.map((r) => num(r.last_order_id)).filter(Boolean);
  const members = membersByPk || await loadMembers(rows.map((r) => r.pk_s), hash);
  const pageMembers = rows.map((r) => members.get(r.pk_s)).filter(Boolean);
  const allU = [...new Set(pageMembers.flatMap((m) => m.uids))];
  const allG = [...new Set(pageMembers.flatMap((m) => m.gids))];
  const ownerConds = [];
  if (allU.length) ownerConds.push('user_id IN (:allU)');
  if (allG.length) ownerConds.push('guest_user_id IN (:allG)');

  const [users, guests, carts, leads, brands, lastOrders, orderBrands] = await Promise.all([
    uids.length ? q(`SELECT id, username, email, phone FROM users WHERE id IN (:uids)`, { uids }) : [],
    gids.length ? q(`SELECT id, first_name, last_name, email, phone FROM guest_users WHERE id IN (:gids)`, { gids }) : [],
    cids.length ? q(`SELECT id, customer_name, phone, updated_at FROM abandoned_carts WHERE id IN (:cids)`, { cids }) : [],
    lids.length ? q(`SELECT id, phone, createdAt FROM lead_captures WHERE id IN (:lids)`, { lids }) : [],
    q(`SELECT id, name, display_name FROM brands`),
    lastIds.length ? q(`SELECT id, order_number FROM orders WHERE id IN (:lastIds)`, { lastIds }) : [],
    ownerConds.length
      ? q(`SELECT DISTINCT user_id, guest_user_id, brand_id FROM orders WHERE ${ownerConds.join(' OR ')}`, { allU, allG })
      : [],
  ]);
  const byId = (list) => new Map(list.map((x) => [x.id, x]));
  const brandsByOwner = new Map();
  for (const o of orderBrands) {
    const key = o.user_id ? `u${o.user_id}` : `g${o.guest_user_id}`;
    if (!brandsByOwner.has(key)) brandsByOwner.set(key, new Set());
    if (o.brand_id) brandsByOwner.get(key).add(o.brand_id);
  }
  return {
    users: byId(users), guests: byId(guests), carts: byId(carts), leads: byId(leads), brands: byId(brands),
    lastOrders: byId(lastOrders), members, brandsByOwner,
  };
}

function brandNamesFor(r, d) {
  const m = d.members.get(r.pk_s);
  const ids = new Set();
  if (m) {
    // Order brands first (where they actually bought), then sign-up / cart brands.
    for (const u of m.uids) for (const b of d.brandsByOwner.get(`u${u}`) || []) ids.add(b);
    for (const g of m.gids) for (const b of d.brandsByOwner.get(`g${g}`) || []) ids.add(b);
    for (const b of m.brandIds) ids.add(b);
  }
  return [...ids].map((id) => { const b = d.brands.get(id); return b ? (b.display_name || b.name) : null; }).filter(Boolean);
}

function shapeRow(r, d) {
  const u = r.uid ? d.users.get(r.uid) : null;
  const g = r.gid ? d.guests.get(r.gid) : null;
  const c = r.cid ? d.carts.get(r.cid) : null;
  const l = r.lid ? d.leads.get(r.lid) : null;
  const guestName = g ? [g.first_name, g.last_name].filter(Boolean).join(' ') : '';
  const name = cleanName(u?.username || guestName || c?.customer_name) || (u || g ? 'Customer' : null);
  const phone = [u?.phone, decrypt(g?.phone), decrypt(c?.phone), l?.phone].map(last10).find((p) => p.length === 10) || null;
  const email = u?.email || g?.email || null;
  const kind = r.uid ? 'registered' : r.gid ? 'guest' : 'lead';
  return {
    key: r.uid ? `u${r.uid}` : r.gid ? `g${r.gid}` : r.cid ? `c${r.cid}` : `l${r.lid}`,
    kind,
    name,
    phone,
    email,
    brands: brandNamesFor(r, d),
    orders: num(r.orders),
    delivered: num(r.delivered),
    spent: r2(r.spent),
    rto: num(r.rto),
    returns: num(r.returns_n),
    lastOrderAt: r.last_at || null,
    lastOrderNumber: d.lastOrders.get(num(r.last_order_id))?.order_number || null,
    lastCartAt: c?.updated_at || null,
    leadAt: l?.createdAt || null,
    since: r.since || null,
    accounts: num(r.n_users),
    userId: r.uid || null,
    // What the profile page opens with (sessionStorage 'obz-customer').
    open: r.uid ? { kind: 'user', id: r.uid } : r.gid ? { kind: 'guest', id: r.gid } : (phone ? { kind: 'phone', phone } : null),
  };
}

// The list shows contacts masked; the full phone only travels for a lead
// (it is how the profile page finds them — staff can see it there anyway).
function toListRow(c) {
  const { phone, email, ...rest } = c;
  const contact = [maskPhone(phone), maskEmail(email)].filter(Boolean).join(' · ') || null;
  return { ...rest, contact };
}

function parseParams(query = {}) {
  const segment = SEGMENTS.includes(query.segment) ? query.segment : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'spent';
  const brandId = parseInt(query.brandId, 10) || null;
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  return { segment, sort, brandId, limit, page, q: String(query.q || '') };
}

// ── Public API ───────────────────────────────────────────────────────────
async function listCustomers(query) {
  const p = parseParams(query);
  await ensureSchema();
  await syncPhoneKeys();
  const hash = hashMode();
  const search = await buildSearch(p.q, hash);
  const built = buildQuery({ ...p, search, hash, offset: (p.page - 1) * p.limit });
  const rows = await q(built.sql, built.rep);
  let counts;
  if (rows.length) counts = countsOf(rows[0]);
  else {
    const c = countsQuery(built);
    counts = countsOf((await q(c.sql, c.rep))[0]);
  }
  const details = await loadDetails(rows, hash);
  const total = counts[p.segment];
  return {
    page: p.page,
    limit: p.limit,
    total,
    pages: Math.max(1, Math.ceil(total / p.limit)),
    counts,
    rows: rows.map((r) => toListRow(shapeRow(r, details))),
  };
}

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // no formula injection in Excel
  return `"${s.replace(/"/g, '""')}"`;
};
// Calendar date in India time.
const ymd = (d) => (d ? new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 10) : '');
const KIND_LABEL = { registered: 'Registered', guest: 'Guest', lead: 'Lead' };

/** Stream the current filter (all pages, up to EXPORT_CAP rows) as CSV. */
async function streamCustomersCsv(query, res) {
  const p = parseParams(query);
  await ensureSchema();
  await syncPhoneKeys();
  const hash = hashMode();
  const search = await buildSearch(p.q, hash);
  const built = buildQuery({ ...p, search, hash, limit: EXPORT_CAP, offset: 0 });
  const rows = await q(built.sql, built.rep);

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="customers-${p.segment}-${stamp}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.write('﻿' + ['Name', 'Phone', 'Email', 'Account', 'Brands', 'Orders', 'Delivered', 'Spent (₹)',
    'Last order date', 'Last order number', 'RTO', 'Returns', 'Customer since'].map(csvCell).join(',') + '\n');

  // One pass over every identity for a big export instead of one per chunk.
  const members = rows.length > 500 ? await loadMembers(null, hash) : null;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const d = await loadDetails(chunk, hash, members);
    const lines = chunk.map((r) => {
      const c = shapeRow(r, d);
      return [c.name, c.phone, c.email, KIND_LABEL[c.kind], c.brands.join(' / '), c.orders, c.delivered, c.spent,
        ymd(c.lastOrderAt), c.lastOrderNumber, c.rto, c.returns, ymd(c.since)].map(csvCell).join(',');
    });
    if (!res.write(lines.join('\n') + '\n')) await new Promise((ok) => res.once('drain', ok));
  }
  if (rows.length >= EXPORT_CAP) {
    logger.warn(`Customer export capped at ${EXPORT_CAP} rows`);
  }
  res.end();
}

module.exports = { listCustomers, streamCustomersCsv };
