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
      return row.recoverToken;
    }
    // Keep a storefront-captured snapshot (richer — it carries the store's own
    // lines) when the row has one; otherwise take the current server cart.
    // `silent` leaves updated_at alone so this doesn't shift the row's own
    // recovery timing.
    const hasStoreSnapshot = (row.items || []).some((i) => i && i.line);
    if (items && !hasStoreSnapshot) await row.update({ items }, { silent: true });
    return ensureToken(row);
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
// The defaults reproduce the behaviour from before the rules existed: message
// right away (the capture endpoint sends immediately, the 5-minute cron is the
// backstop after ABANDONED_CART_DELAY_MIN), any time of day, code CART10, no
// minimum cart value.
const CART_RULES_KEY = 'cart_rules';
const DEFAULT_CART_RULES = Object.freeze({ waitHours: 0, quietStart: null, quietEnd: null, coupon: 'CART10', minValue: 0 });
const RULES_TTL_MS = 60 * 1000;
const IST_MS = 330 * 60000;
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
let _rulesCache = null; // { at, rules }

function normaliseCartRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_CART_RULES };
  const wh = Number(r.waitHours);
  if (Number.isFinite(wh) && wh >= 0 && wh <= 23) out.waitHours = Math.round(wh * 4) / 4; // quarter-hour steps
  const qs = typeof r.quietStart === 'string' && HHMM_RE.test(r.quietStart) ? r.quietStart : null;
  const qe = typeof r.quietEnd === 'string' && HHMM_RE.test(r.quietEnd) ? r.quietEnd : null;
  if (qs && qe && qs !== qe) { out.quietStart = qs; out.quietEnd = qe; }
  const coupon = String(r.coupon == null ? '' : r.coupon).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  if (coupon) out.coupon = coupon;
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

// When the recovery message for a cart left at `leftAt` is due under `rules`.
// waitHours 0 = "right away" (sent on capture; the cron backstop retries after
// ABANDONED_CART_DELAY_MIN), otherwise leftAt + waitHours. Quiet hours push it
// to the end of the quiet window.
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
