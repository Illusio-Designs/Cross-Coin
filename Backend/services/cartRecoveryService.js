'use strict';

// Abandoned-cart recovery links ("Complete Order" WhatsApp button).
//
// WHY: a guest's cart lives in localStorage on the device where they shopped,
// but the WhatsApp button usually opens in WhatsApp's in-app browser (or a
// different browser / phone), where that storage is EMPTY. So the link must
// carry something that lets the storefront rebuild the cart from the server.
//
// HOW: every abandoned_carts row gets an unguessable `recover_token` (144 random
// bits, URL-safe). The WhatsApp button's {{1}} carries that token:
//   https://api.crosscoin.in/api/cart-recover/{{1}}   ({{1}} = token)
//   → 302 https://<brand-domain>/?recover=1&coupon=CART10&cart=<token>
// and the storefront calls GET /api/abandoned-cart/restore/<token> to get the
// line items back. The token is not a sequential id, carries no personal data,
// and stops restoring items TOKEN_TTL_DAYS after the cart was last touched or
// once the shopper has completed an order.

const crypto = require('crypto');
const { logger } = require('../config/logging.js');

const TOKEN_TTL_DAYS = 7;
const MAX_LINES = 30;
const MAX_QTY = 99;
const MAX_LINE_KEYS = 30;
const MAX_STRING = 300;
const MAX_JSON_BYTES = 32 * 1024;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/;
// Keys whose string value is rendered as an <img src>; only http(s) or
// site-relative URLs are kept so a stored line can't carry e.g. a data:/js: URL.
const IMAGE_KEYS = new Set(['image', 'img', 'imageUrl', 'image_url', 'thumbnail']);

function newToken() {
  return crypto.randomBytes(18).toString('base64url'); // 24 URL-safe chars
}

function isToken(v) {
  return TOKEN_RE.test(String(v || ''));
}

const posInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 2147483647 ? n : null;
};

// Shallow, primitives-only copy of a storefront's own cart line, so the store
// can put the line back exactly as the shopper had it (pack ids, tier labels,
// per-store keys) without the server having to know every store's shape.
function sanitizeLine(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (n >= MAX_LINE_KEYS) break;
    if (!KEY_RE.test(k)) continue;
    let val;
    if (v === null || typeof v === 'boolean') val = v;
    else if (typeof v === 'number') { if (!Number.isFinite(v)) continue; val = v; }
    else if (typeof v === 'string') {
      val = v.slice(0, MAX_STRING);
      if (IMAGE_KEYS.has(k) && val && !/^(https?:\/\/|\/(?!\/))/i.test(val)) val = '';
    } else continue; // drop nested objects/arrays/functions
    out[k] = val;
    n++;
  }
  return out;
}

// Storefront payload → stored items. Each entry:
//   { productId, variationId?, quantity, size?, color?, packId?, packSize?, packGroup?, line? }
// Returns null when nothing usable was sent (so callers keep the old snapshot).
function sanitizeItems(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const items = [];
  for (const it of raw.slice(0, MAX_LINES)) {
    if (!it || typeof it !== 'object') continue;
    const productId = posInt(it.productId ?? it.product_id);
    if (!productId) continue;
    const quantity = Math.min(MAX_QTY, posInt(it.quantity ?? it.qty) || 1);
    const entry = { productId, variationId: posInt(it.variationId ?? it.variation_id), quantity };
    for (const k of ['size', 'color', 'packId', 'packGroup']) {
      if (typeof it[k] === 'string' && it[k]) entry[k] = it[k].slice(0, 80);
    }
    const ps = posInt(it.packSize);
    if (ps) entry.packSize = ps;
    const line = sanitizeLine(it.line);
    if (line) entry.line = line;
    items.push(entry);
  }
  if (!items.length) return null;
  // Hard size cap — drop the per-store line snapshots first, then truncate.
  let json = JSON.stringify(items);
  if (json.length > MAX_JSON_BYTES) {
    items.forEach((i) => { delete i.line; });
    json = JSON.stringify(items);
    while (json.length > MAX_JSON_BYTES && items.length > 1) { items.pop(); json = JSON.stringify(items); }
  }
  return items;
}

// Server cart (logged-in shopper) → stored items, for the hourly Cart cron.
function itemsFromServerCart(cartItems) {
  return sanitizeItems((cartItems || []).map((ci) => ({
    productId: ci.product_id ?? ci.productId ?? ci.Product?.id,
    variationId: ci.variation_id ?? ci.variationId ?? null,
    quantity: ci.quantity,
    size: ci.selected_size || undefined,
    packId: ci.packId || ci.pack_id || undefined,
    packSize: ci.packSize || ci.pack_size || undefined,
    packGroup: ci.packGroup || ci.pack_group || undefined,
  })));
}

function isExpired(row) {
  const t = new Date(row.updatedAt || row.updated_at || row.createdAt || 0).getTime();
  return !t || Date.now() - t > TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}

// Make sure a row has a recovery token (rows captured before this existed have
// none). Returns the token, or null if it couldn't be written.
async function ensureToken(row) {
  if (!row) return null;
  if (isToken(row.recoverToken)) return row.recoverToken;
  try {
    const token = newToken();
    // `silent` keeps updated_at (and so the expiry window) unchanged.
    await row.update({ recoverToken: token }, { silent: true });
    return token;
  } catch (e) {
    logger.warn('[cart-recover] could not issue token: ' + e.message);
    return null;
  }
}

async function findByToken(token) {
  if (!isToken(token)) return null;
  const { AbandonedCart } = require('../model/abandonedCartModel.js');
  return AbandonedCart.findOne({ where: { recoverToken: String(token) } });
}

// Logged-in shoppers' server carts (hourly cron) don't come through the capture
// endpoint, so give them a capture row too — reusing the shopper's existing row
// for this brand when there is one — so their WhatsApp link can restore the
// cart on any device. The row is written as already-messaged so the 5-minute
// capture cron never sends a second message for it.
async function tokenForServerCart({ phone, name, brandId, userId, cartItems, summary, value }) {
  try {
    const { AbandonedCart } = require('../model/abandonedCartModel.js');
    const { phoneHash } = require('../utils/encryption.js');
    const digits = String(phone || '').replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) return null;
    const items = itemsFromServerCart(cartItems);
    const where = { phoneHashValue: phoneHash(digits), brandId: brandId || 1 };
    let row = await AbandonedCart.findOne({ where });
    if (!row) {
      row = await AbandonedCart.create({
        ...where, phone: digits, customerName: name || null,
        cartSummary: summary ? String(summary).slice(0, 250) : null,
        itemCount: (items || []).reduce((s, i) => s + i.quantity, 0),
        cartValue: Number(value) || 0, userId: userId || null,
        items, recoverToken: newToken(), status: 'messaged', waSent: true,
      });
      try {
        await require('./whatsappInsightsService.js').ensureSchema();
        const { sequelize } = require('../config/db.js');
        await sequelize.query('UPDATE abandoned_carts SET wa_sent_at = :now, updated_at = updated_at WHERE id = :id', { replacements: { id: row.id, now: new Date() } });
      } catch (_) { /* optional */ }
      return row.recoverToken;
    }
    // Keep a storefront-captured snapshot (richer — it carries the store's own
    // lines) when the row has one; otherwise take the current server cart.
    // `silent` leaves updated_at alone so this doesn't shift the row's own
    // recovery timing.
    const hasStoreSnapshot = (row.items || []).some((i) => i && i.line);
    if (items && !hasStoreSnapshot) await row.update({ items }, { silent: true });
    const token = await ensureToken(row);
    // This is called right before the hourly cron messages the shopper, so
    // mark the capture row messaged too — otherwise the 5-minute capture cron
    // would send the same shopper a second cart message.
    if (row.status === 'pending') await markMessaged(row).catch(() => {});
    return token;
  } catch (e) {
    logger.warn('[cart-recover] server-cart token failed: ' + e.message);
    return null;
  }
}

// Stored items → lines the storefront can drop straight into its cart. Every
// product/variation is re-checked against the DB (exists, same brand, active),
// and name/price/image come from the DB, not from what was captured.
async function buildRestoreLines(row) {
  const items = Array.isArray(row.items) ? row.items : [];
  if (!items.length) return [];
  const { Product, ProductImage, ProductVariation } = require('../model/associations.js');
  let imagekit = null;
  try { imagekit = require('./imagekitService.js'); } catch (_) { /* optional */ }
  const img = (u) => {
    if (!u) return '';
    try { return imagekit ? imagekit.getOptimizedUrl(u, 'medium') : u; } catch (_) { return u; }
  };

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await Product.findAll({
    where: { id: productIds, brand_id: row.brandId || 1 },
    include: [
      { model: ProductImage, as: 'ProductImages' },
      { model: ProductVariation, as: 'ProductVariations', include: [{ model: ProductImage, as: 'VariationImages' }] },
    ],
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p || (p.status && p.status !== 'active')) continue;
    const vars = p.ProductVariations || [];
    let v = it.variationId ? vars.find((x) => x.id === it.variationId) : null;
    if (it.variationId && !v) continue; // variation deleted → drop the line
    if (!v && vars.length) v = vars[0];
    if (v && v.status && v.status !== 'active') continue;

    let attrs = {};
    try { attrs = v && v.attributes ? (typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes) : {}; } catch (_) { attrs = {}; }
    const first = (x) => (Array.isArray(x) ? x[0] : x);
    const pImgs = [...(p.ProductImages || [])].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const vImgs = (v && v.VariationImages) || [];
    const imgRows = vImgs.length ? vImgs : pImgs;
    const images = imgRows.map((r) => ({ image_url: img(r.image_url), alt_text: r.alt_text || null }));

    const line = it.line ? { ...it.line } : null;
    if (line) {
      if (typeof line.name === 'string') line.name = p.name; // never trust captured names
      // An image dropped by sanitizing (or never captured) → the DB image.
      for (const k of IMAGE_KEYS) if (k in line && !line[k]) line[k] = images[0]?.image_url || '';
    }

    lines.push({
      productId: p.id,
      variationId: v ? v.id : null,
      quantity: it.quantity,
      name: p.name,
      slug: p.slug || '',
      image: images[0]?.image_url || '',
      images,
      price: Number(v ? v.price : 0) || 0,
      comparePrice: v && v.comparePrice != null ? Number(v.comparePrice) : null,
      size: it.size || first(attrs.size) || null,
      color: it.color || first(attrs.color) || null,
      packId: it.packId || null,
      packSize: it.packSize || null,
      packGroup: it.packGroup || null,
      stock: v ? v.stock : null,
      line,
    });
  }
  return lines;
}

// ─── Cart recovery rules (WhatsApp Studio → Abandoned carts → Rules) ─────────
// Admins tune the recovery message in the dashboard; the rules live as JSON in
// whatsapp_settings under `cart_rules` (written by whatsappInsightsService).
// Defaults: wait 1 hour after the shopper left (never message someone who is
// still mid-checkout), not between 9 pm and 9 am IST, code CART10, no minimum
// cart value. One message per cart; a shopper messaged in the last 7 days is
// not messaged again.
const CART_RULES_KEY = 'cart_rules';
// winbackCoupon: the code offered in win-back messages (30 days after a
// customer's last order) — one code for every store, like the cart coupon.
const DEFAULT_CART_RULES = Object.freeze({ waitHours: 1, quietStart: '21:00', quietEnd: '09:00', coupon: 'CART10', minValue: 0, winbackCoupon: 'CART10' });
const RESEND_AFTER_DAYS = 7;
const RULES_TTL_MS = 60 * 1000;
const IST_MS = 330 * 60000;
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
let _rulesCache = null; // { at, rules }

function normaliseCartRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_CART_RULES };
  const wh = Number(r.waitHours);
  if (Number.isFinite(wh) && wh >= 0 && wh <= 23) out.waitHours = Math.round(wh * 4) / 4; // quarter-hour steps
  // Quiet hours: absent → defaults; explicitly null/'' → none (send any time).
  if ('quietStart' in r || 'quietEnd' in r) {
    const qs = typeof r.quietStart === 'string' && HHMM_RE.test(r.quietStart) ? r.quietStart : null;
    const qe = typeof r.quietEnd === 'string' && HHMM_RE.test(r.quietEnd) ? r.quietEnd : null;
    if (qs && qe && qs !== qe) { out.quietStart = qs; out.quietEnd = qe; } else { out.quietStart = null; out.quietEnd = null; }
  }
  const coupon = String(r.coupon == null ? '' : r.coupon).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  if (coupon) out.coupon = coupon;
  const wb = String(r.winbackCoupon == null ? '' : r.winbackCoupon).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  if (wb) out.winbackCoupon = wb;
  const mv = Number(r.minValue);
  if (Number.isFinite(mv) && mv >= 0 && mv <= 1000000) out.minValue = Math.round(mv);
  return out;
}

// Never throws: a missing table / bad JSON just means "defaults".
async function getCartRules({ fresh = false } = {}) {
  if (!fresh && _rulesCache && Date.now() - _rulesCache.at < RULES_TTL_MS) return _rulesCache.rules;
  let rules = { ...DEFAULT_CART_RULES };
  try {
    const { sequelize } = require('../config/db.js');
    const { QueryTypes } = require('sequelize');
    const rows = await sequelize.query('SELECT `value` FROM whatsapp_settings WHERE `key` = :k LIMIT 1',
      { replacements: { k: CART_RULES_KEY }, type: QueryTypes.SELECT });
    if (rows[0] && rows[0].value) rules = normaliseCartRules(JSON.parse(rows[0].value));
  } catch (_) { /* table not created yet / unreadable → defaults */ }
  _rulesCache = { at: Date.now(), rules };
  return rules;
}

function clearCartRulesCache() { _rulesCache = null; }

// The win-back coupon code (same for every store).
async function getWinbackCode() {
  const r = await getCartRules().catch(() => DEFAULT_CART_RULES);
  return String((r && r.winbackCoupon) || DEFAULT_CART_RULES.winbackCoupon).toUpperCase();
}

function backstopDelayMin() {
  const n = parseInt(process.env.ABANDONED_CART_DELAY_MIN || '5', 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

const _mins = (hhmm) => { const m = HHMM_RE.exec(hhmm || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const _istMinuteOfDay = (d) => { const x = new Date(d.getTime() + IST_MS); return x.getUTCHours() * 60 + x.getUTCMinutes(); };

// True when `date` falls inside the quiet hours (IST). Handles overnight
// windows such as 21:00 → 09:00.
function isQuietAt(date, rules) {
  const s = _mins(rules && rules.quietStart);
  const e = _mins(rules && rules.quietEnd);
  if (s == null || e == null || s === e) return false;
  const m = _istMinuteOfDay(date);
  return s < e ? (m >= s && m < e) : (m >= s || m < e);
}

// First moment at or after `date` that is outside the quiet hours.
function afterQuietHours(date, rules) {
  if (!isQuietAt(date, rules)) return date;
  const e = _mins(rules.quietEnd);
  const m = _istMinuteOfDay(date);
  let delta = e - m;
  if (delta <= 0) delta += 24 * 60;
  const out = new Date(date.getTime() + delta * 60000);
  out.setUTCSeconds(0, 0);
  return out;
}

// When the recovery message for a cart left at `leftAt` is due under `rules`:
// leftAt + waitHours, pushed to the end of the quiet hours when it lands inside
// them. (The 5-minute cron picks it up on its next run after that.)
function nextSendAt(leftAt, rules = DEFAULT_CART_RULES) {
  const left = new Date(leftAt || Date.now());
  const waitMs = rules.waitHours > 0 ? rules.waitHours * 3600 * 1000 : 0;
  return afterQuietHours(new Date(left.getTime() + waitMs), rules);
}

// Gate every recovery send through this. Returns { ok, reason, sendAt }:
//   reason 'below_min'   — cart value under rules.minValue (never send)
//          'too_soon'    — the wait time hasn't passed yet (send later)
//          'quiet_hours' — inside quiet hours (send later, at sendAt)
function checkSend({ value, leftAt } = {}, rules = DEFAULT_CART_RULES, now = new Date()) {
  const sendAt = nextSendAt(leftAt || now, rules);
  if (rules.minValue > 0 && (Number(value) || 0) < rules.minValue) return { ok: false, reason: 'below_min', sendAt: null };
  if (isQuietAt(now, rules)) return { ok: false, reason: 'quiet_hours', sendAt };
  if (sendAt.getTime() > now.getTime() + 1000) return { ok: false, reason: 'too_soon', sendAt };
  return { ok: true, reason: null, sendAt };
}

// updatedAt range the 5-minute capture cron should scan under these rules:
// old enough for the wait (and the backstop delay), but not so old that a long
// wait + quiet hours pushes the cart outside the old fixed 24 h window.
function cronWindow(rules = DEFAULT_CART_RULES, now = new Date()) {
  const waitMin = Math.max(backstopDelayMin(), Math.round((rules.waitHours || 0) * 60));
  const to = new Date(now.getTime() - waitMin * 60000);
  const from = new Date(now.getTime() - (24 + (rules.waitHours || 0) + 12) * 3600 * 1000);
  return { from, to };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const _q = (sql, replacements) => {
  const { sequelize } = require('../config/db.js');
  const { QueryTypes } = require('sequelize');
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
};
const _ten = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

// When this capture row was last messaged: wa_sent_at (set by markMessaged),
// else — for rows messaged before that column existed — updated_at of a row
// flagged wa_sent. null = never messaged.
async function lastMessagedAt(rowOrId) {
  const id = typeof rowOrId === 'object' && rowOrId ? rowOrId.id : Number(rowOrId);
  if (!id) return null;
  await require('./whatsappInsightsService.js').ensureSchema();
  const [r] = await _q('SELECT wa_sent, wa_sent_at, updated_at, status FROM abandoned_carts WHERE id = :id', { id });
  if (!r) return null;
  if (r.wa_sent_at) return new Date(r.wa_sent_at);
  return Number(r.wa_sent) ? new Date(r.updated_at) : null;
}

// Record a successful recovery send. `silent` keeps updated_at = when the cart
// was left (the dashboard and the timing rules read it).
async function markMessaged(row) {
  await row.update({ status: 'messaged', waSent: true }, { silent: true });
  try {
    await require('./whatsappInsightsService.js').ensureSchema();
    const { sequelize } = require('../config/db.js');
    await sequelize.query('UPDATE abandoned_carts SET wa_sent_at = :now, updated_at = updated_at WHERE id = :id',
      { replacements: { id: row.id, now: new Date() } });
  } catch (e) { logger.warn('[cart-recover] could not stamp wa_sent_at: ' + e.message); }
}

// Has this shopper (same phone, same brand) placed an order after `after`?
// Matches the shipping/guest phone by hash and the account phone by digits.
async function orderedSince({ phone, brandId, after }) {
  const p10 = _ten(phone);
  if (p10.length !== 10) return false;
  const { phoneHash } = require('../utils/encryption.js');
  const h = phoneHash(p10);
  const rows = await _q(
    `SELECT o.id FROM orders o
       LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN users u ON u.id = o.user_id
      WHERE o.brand_id = :brandId AND o.created_at > :after
        AND (${h ? 'a.phone_hash = :h OR g.phone_hash = :h OR ' : ''}RIGHT(u.phone, 10) = :p10)
      LIMIT 1`, { brandId: brandId || 1, after: new Date(after || 0), h, p10 });
  return rows.length > 0;
}

// The full pre-send check for a CAPTURE row (5-minute cron). Call right
// before sendAbandonedCart. Returns { ok, reason, coupon, sendAt }:
//   below_min / too_soon / quiet_hours — from the cart rules (see checkSend)
//   messaged_recently — this shopper got a cart message in the last 7 days
//   ordered           — they ordered after leaving the cart (row is marked recovered)
// Never throws (a failed check → { ok:false, reason:'check_failed' }).
async function checkBeforeSend(row, { now = new Date() } = {}) {
  try {
    const rules = await getCartRules();
    const gate = checkSend({ value: row.cartValue, leftAt: row.updatedAt }, rules, now);
    if (!gate.ok) return { ...gate, coupon: rules.coupon };
    const last = await lastMessagedAt(row);
    if (last && now - last < RESEND_AFTER_DAYS * DAY_MS) return { ok: false, reason: 'messaged_recently', coupon: rules.coupon, sendAt: null };
    if (await orderedSince({ phone: row.phone, brandId: row.brandId, after: row.updatedAt })) {
      const { sequelize } = require('../config/db.js');
      await sequelize.query(`UPDATE abandoned_carts SET status = 'recovered', updated_at = updated_at WHERE id = :id`, { replacements: { id: row.id } });
      return { ok: false, reason: 'ordered', coupon: rules.coupon, sendAt: null };
    }
    return { ok: true, reason: null, coupon: rules.coupon, sendAt: gate.sendAt };
  } catch (e) {
    logger.warn('[cart-recover] pre-send check failed: ' + e.message);
    return { ok: false, reason: 'check_failed', coupon: DEFAULT_CART_RULES.coupon, sendAt: null };
  }
}

// The same check for the HOURLY server-cart cron (logged-in shoppers). Skips
// when the shopper's capture row for this brand was messaged in the last 24 h
// (so a logged-in shopper never gets two cart messages), when they ordered
// after leaving the cart, or when the cart rules say not now / never.
// Returns { ok, reason, coupon }. Never throws.
async function shouldSendServerCart({ phone, brandId, value, leftAt, now = new Date() } = {}) {
  try {
    const rules = await getCartRules();
    const gate = checkSend({ value, leftAt }, rules, now);
    if (!gate.ok) return { ok: false, reason: gate.reason, coupon: rules.coupon };
    const p10 = _ten(phone);
    if (p10.length !== 10) return { ok: false, reason: 'no_number', coupon: rules.coupon };
    const { phoneHash } = require('../utils/encryption.js');
    const h = phoneHash(p10);
    if (h) {
      await require('./whatsappInsightsService.js').ensureSchema();
      const rows = await _q(
        `SELECT id FROM abandoned_carts WHERE phone_hash = :h AND brand_id = :b AND wa_sent = 1
            AND COALESCE(wa_sent_at, updated_at) >= :since LIMIT 1`,
        { h, b: brandId || 1, since: new Date(now.getTime() - DAY_MS) });
      if (rows.length) return { ok: false, reason: 'messaged_recently', coupon: rules.coupon };
    }
    if (await orderedSince({ phone: p10, brandId, after: leftAt })) return { ok: false, reason: 'ordered', coupon: rules.coupon };
    return { ok: true, reason: null, coupon: rules.coupon };
  } catch (e) {
    logger.warn('[cart-recover] server-cart check failed: ' + e.message);
    return { ok: false, reason: 'check_failed', coupon: DEFAULT_CART_RULES.coupon };
  }
}

// Capture endpoint: should a fresh capture re-arm this row (status pending →
// the cron messages it again)? Not when it was messaged in the last 7 days.
async function canRearm(row, now = new Date()) {
  try {
    const last = await lastMessagedAt(row);
    return !last || now - last >= RESEND_AFTER_DAYS * DAY_MS;
  } catch (_) { return false; }
}

// Stamp the first time a recovery link was opened (the /api/cart-recover
// redirect, or the storefront's restore call). Never moves updated_at — that
// column drives the recovery timing and token expiry. Never throws.
async function markLinkOpened(rowOrId) {
  try {
    const id = typeof rowOrId === 'object' && rowOrId ? rowOrId.id : Number(rowOrId);
    if (!id) return false;
    await require('./whatsappInsightsService.js').ensureSchema();
    const { sequelize } = require('../config/db.js');
    const [, meta] = await sequelize.query(
      'UPDATE abandoned_carts SET link_opened_at = :now, updated_at = updated_at WHERE id = :id AND link_opened_at IS NULL',
      { replacements: { id, now: new Date() } });
    return !!(meta && (meta.affectedRows || meta.changedRows));
  } catch (e) {
    logger.warn('[cart-recover] could not record link open: ' + e.message);
    return false;
  }
}

module.exports = {
  getWinbackCode,
  CART_RULES_KEY,
  DEFAULT_CART_RULES,
  normaliseCartRules,
  getCartRules,
  clearCartRulesCache,
  backstopDelayMin,
  isQuietAt,
  nextSendAt,
  checkSend,
  cronWindow,
  markLinkOpened,
  lastMessagedAt,
  markMessaged,
  orderedSince,
  checkBeforeSend,
  shouldSendServerCart,
  canRearm,
  RESEND_AFTER_DAYS,
  TOKEN_TTL_DAYS,
  newToken,
  isToken,
  isExpired,
  sanitizeItems,
  itemsFromServerCart,
  ensureToken,
  findByToken,
  tokenForServerCart,
  buildRestoreLines,
};
