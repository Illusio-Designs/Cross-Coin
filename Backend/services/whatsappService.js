'use strict';

const axios = require('axios');
const https = require('https');
const { logger } = require('../config/logging.js');
const settingsHelper = require('./settingsHelper.js');

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

// Shared client for Meta Graph API text/template calls. keepAlive reuses the TLS
// connection between sends (a fresh handshake added ~200ms to every message),
// and the timeout makes a slow/hung Meta request fail fast instead of leaving
// the composer spinning. Media uploads keep the default client (big files need a
// longer window).
const WA_HTTP = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 64 }),
  timeout: 20000,
});

// Separate client for media upload/download: large files legitimately take
// longer than a text/template send, so it gets a wider (but still finite)
// timeout. Without this, media calls used the default axios with NO timeout —
// a stalled Meta/CDN stream would pin the request open forever and tie up a
// worker. keepAlive is shared so the TLS connection is reused.
const WA_HTTP_MEDIA = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 32 }),
  timeout: 60000,
});

// POST to Meta with a conservative retry. We ONLY retry pre-flight connection
// failures (DNS / refused / reset-on-connect) where the request provably never
// reached Meta — never on a timeout or a 5xx, because a WhatsApp send is NOT
// idempotent and a retry there could deliver the message twice. This soaks up
// the momentary network blips that were surfacing to the agent as a "failed"
// send, without any duplicate-message risk.
async function waPostWithRetry(url, payload, config, attempts = 2) {
  const RETRYABLE = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET']);
  let lastErr;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await WA_HTTP.post(url, payload, config);
    } catch (err) {
      lastErr = err;
      // A response (even 5xx) means Meta received the request — do not retry.
      const preflight = !err.response && RETRYABLE.has(err.code);
      if (!preflight || i === attempts) throw err;
      logger.warn(`[WhatsApp] send connection error (${err.code}) — retry ${i + 1}/${attempts}`);
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

// ─── Phone normaliser ─────────────────────────────────────────────────────────
function formatE164(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '+91' + digits.slice(1);
  if (String(phone).startsWith('+')) return String(phone).replace(/\s/g, '');
  return '+' + digits;
}

// ─── Extract Meta error message ───────────────────────────────────────────────
// Meta's top-level `message` is often the generic "Invalid parameter" (code 100).
// The ACTUAL reason lives in error_user_msg / error_data.details / error_user_title
// — surface it so template rejections say *why* instead of a useless generic line.
function metaError(err) {
  const e = err?.response?.data?.error;
  if (e) {
    const base = e.message || 'Meta API error';
    const detail = e.error_user_msg
      || (typeof e.error_data?.details === 'string' ? e.error_data.details : null)
      || e.error_user_title;
    return detail && !base.includes(detail) ? `${base}: ${detail}` : base;
  }
  return err?.message || 'Unknown error';
}

// ─── Load credentials from brand settings ────────────────────────────────────
const _credentialsCache = new Map();
const CREDENTIALS_TTL = 5 * 60 * 1000; // 5 minutes

// Shared-number mode: all brands use ONE verified WhatsApp account. The account
// is configured on this brand's settings; any brand that has no creds of its own
// falls back to it — so every brand sends/receives through the same number.
// Override the holder brand with env WHATSAPP_SHARED_BRAND_ID.
const SHARED_WA_BRAND_ID = Number(process.env.WHATSAPP_SHARED_BRAND_ID) || 1;

async function getCredentials(brandId = 1) {
  const cacheKey = `wa_creds_${brandId}`;
  const cached = _credentialsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CREDENTIALS_TTL) {
    return cached.data;
  }

  let [token, phoneNumberId, businessAccountId] = await Promise.all([
    settingsHelper.getSetting(brandId, 'WHATSAPP_API_TOKEN'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_PHONE_NUMBER_ID'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_BUSINESS_ACCOUNT_ID'),
  ]);

  // Fall back to the shared verified account when this brand has no full creds.
  if ((!token || !phoneNumberId || !businessAccountId) && Number(brandId) !== SHARED_WA_BRAND_ID) {
    const [sToken, sPhone, sBiz] = await Promise.all([
      settingsHelper.getSetting(SHARED_WA_BRAND_ID, 'WHATSAPP_API_TOKEN'),
      settingsHelper.getSetting(SHARED_WA_BRAND_ID, 'WHATSAPP_PHONE_NUMBER_ID'),
      settingsHelper.getSetting(SHARED_WA_BRAND_ID, 'WHATSAPP_BUSINESS_ACCOUNT_ID'),
    ]);
    token = token || sToken;
    phoneNumberId = phoneNumberId || sPhone;
    businessAccountId = businessAccountId || sBiz;
  }

  if (!token)               throw new Error(`WHATSAPP_API_TOKEN not configured (brand ${brandId} / shared brand ${SHARED_WA_BRAND_ID})`);
  if (!phoneNumberId)       throw new Error(`WHATSAPP_PHONE_NUMBER_ID not configured (brand ${brandId} / shared brand ${SHARED_WA_BRAND_ID})`);
  if (!businessAccountId)   throw new Error(`WHATSAPP_BUSINESS_ACCOUNT_ID not configured (brand ${brandId} / shared brand ${SHARED_WA_BRAND_ID})`);

  const data = { token, phoneNumberId, businessAccountId };
  _credentialsCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// Brand display name for the {{brand}} template parameter (shared number).
// Read the Brand table FIRST (display_name / name). The STORE_NAME setting was
// not filled in for most brands, and settingsHelper falls back to the GLOBAL
// env STORE_NAME (CrossCoin's) before its literal default — so every brand
// without its own row showed "Cross Coin". The Brand table always has the real
// name. (Same fix the order.created push alert already uses.)
async function _brandName(brandId) {
  try {
    const Brand = require('../model/brandModel.js');
    const b = await Brand.findByPk(brandId, { attributes: ['display_name', 'name'] });
    const n = b && (b.display_name || b.name);
    if (n) return n;
  } catch (_) { /* fall through to the setting */ }
  return (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
}

// The brand's OWN in-site order-tracking link. The domain comes from the Brand
// table (then STORE_URL, then crosscoin.in). The path differs by storefront:
// Crosscoin uses /OrderTracking, every other brand uses /track-order. Both read
// the order number from ?order=, so the link opens pre-filled. This replaces the
// old hard-coded crosscoin.in/OrderTracking link that was wrong for every other
// brand (wrong domain AND wrong path).
// Canonical live custom domains per brand. The brands table was seeded with the
// WRONG domains for several stores (morbix.com / soxbae.com / velquira.com — none
// of which resolve; the live stores are on morbixsocks.com / soxbaesocks.com /
// velquira.in). These are the verified production domains (source: CORS allow-list
// in config/corsConfig.js). Keyed by normalised brand name so a wrong Brand.domain
// row can't produce a dead tracking link. Keep in sync with corsConfig.js.
const CANONICAL_BRAND_DOMAINS = {
  crosscoin: 'crosscoin.in',
  morbix:    'morbixsocks.com',
  soxbae:    'soxbaesocks.com',
  velquira:  'velquira.in',
  velmique:  'velmique.co.in',
  knitwink:  'knitwink.com',
  gripzus:   'gripzus.com',
};

function _normBrandKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

// Brands whose PDP route segment is SINGULAR "/product/<slug>". Every other
// storefront uses the PLURAL "/products/<slug>". (Verified against the actual
// storefront route folders: only Velmique's app/ uses app/product/[slug]; Morbix,
// Soxbae, Velquira, Knitwink, Gripzus and Crosscoin all use /products/…)
const SINGULAR_PDP_BRANDS = new Set(['velmique']);

// Resolve a brand to the pieces every WhatsApp link needs, in ONE DB read:
//   • domain — the brand's OWN bare domain (no protocol / trailing slash)
//   • key    — normalised brand name (for per-brand route quirks)
// Domain resolution order:
//   1. Canonical map above, keyed by the Brand's name  ← authoritative
//   2. Brand.domain column                              ← may be a dead seed value
//   3. STORE_URL setting                                ← usually unset per brand
//   4. 'crosscoin.in'                                   ← last-ditch default
// Steps 3–4 previously ran FIRST for every sender, so a Soxbae / Morbix / Velmique
// customer got crosscoin.in links. Now a known brand always resolves to its own
// live domain.
async function _brandInfo(brandId) {
  let domain = '', key = '';
  try {
    const Brand = require('../model/brandModel.js');
    const b = await Brand.findByPk(brandId, { attributes: ['domain', 'name', 'display_name'] });
    key = _normBrandKey(b && (b.name || b.display_name));
    domain = CANONICAL_BRAND_DOMAINS[key] || String((b && b.domain) || '').trim();
  } catch (_) { /* fall through */ }
  if (!domain) domain = (await settingsHelper.getSetting(brandId, 'STORE_URL')) || 'crosscoin.in';
  domain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  // Keep the key in step with the resolved domain when the Brand row was unreadable.
  if (!key) key = _normBrandKey(domain.split('.')[0]);
  return { domain, key };
}

async function _brandDomain(brandId) {
  return (await _brandInfo(brandId)).domain;
}

// Brand logo URL — the safe fallback header image for any IMAGE-header template
// when a more specific image (e.g. a product photo) isn't supplied. Reads
// Brand.logo_url; if absent, uses the brand's own /favicon-ish logo path so a
// send never fails purely for want of a header image.
async function _brandLogo(brandId) {
  try {
    const Brand = require('../model/brandModel.js');
    const b = await Brand.findByPk(brandId, { attributes: ['logo_url'] });
    const url = String((b && b.logo_url) || '').trim();
    if (url) return url.startsWith('http') ? url : `https://${(await _brandInfo(brandId)).domain}${url.startsWith('/') ? '' : '/'}${url}`;
  } catch (_) { /* fall through */ }
  const { domain } = await _brandInfo(brandId);
  return `https://${domain}/logo.png`;
}

// Full https URL for a brand path, e.g. _brandUrl(2, '/track-order').
async function _brandUrl(brandId, path = '') {
  const { domain } = await _brandInfo(brandId);
  const p = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `https://${domain}${p}`;
}

// Product detail page — the ONLY place reviews can actually be left, and the real
// target for back-in-stock / upsell / review links. Uses the brand's own PDP
// route segment (singular for Velmique, plural everywhere else) so the link is a
// live page, not a 404.
async function _productUrl(brandId, slug, anchor = '') {
  const { domain, key } = await _brandInfo(brandId);
  const seg = SINGULAR_PDP_BRANDS.has(key) ? 'product' : 'products';
  return `https://${domain}/${seg}/${encodeURIComponent(slug)}${anchor || ''}`;
}

async function _trackingUrl(brandId, orderNumber) {
  const { domain, key } = await _brandInfo(brandId);
  // Crosscoin's storefront route is /OrderTracking; every other brand uses /track-order.
  const path = (key === 'crosscoin' || /crosscoin/i.test(domain)) ? '/OrderTracking' : '/track-order';
  return `https://${domain}${path}?order=${encodeURIComponent(orderNumber)}`;
}

// Invalidate the credentials cache so an updated WhatsApp token/phone id takes
// effect immediately instead of after the 5-minute TTL. Call from the settings
// update path when a WHATSAPP_* key changes. Omit brandId to clear all.
function clearCredentialsCache(brandId) {
  if (brandId == null) { _credentialsCache.clear(); return; }
  _credentialsCache.delete(`wa_creds_${brandId}`);
}

function authHeader(token) {
  return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
}

// ─── Fetch media download URL from Meta ───────────────────────────────────────
// Meta webhook gives us a media ID. We need to call the API to get the real URL.
async function getMediaUrl(mediaId, brandId = 1) {
  const { token } = await getCredentials(brandId);
  const res = await WA_HTTP.get(
    `${GRAPH_API_URL}/${mediaId}`,
    { headers: authHeader(token) }
  );
  return { url: res.data.url, mimeType: res.data.mime_type, fileSize: res.data.file_size };
}

// ─── Download media bytes from Meta (for proxying to browser) ────────────────
async function downloadMedia(mediaUrl, brandId = 1) {
  const { token } = await getCredentials(brandId);
  const res = await WA_HTTP_MEDIA.get(mediaUrl, {
    headers: { Authorization: 'Bearer ' + token },
    responseType: 'stream',
  });
  return { stream: res.data, contentType: res.headers['content-type'], contentLength: res.headers['content-length'] };
}

// Map a MIME type to the WhatsApp message kind used by the send API.
function mediaKindFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image')) return 'image';
  if (m.startsWith('video')) return 'video';
  if (m.startsWith('audio')) return 'audio';
  return 'document';
}

// ─── Upload a file to Meta → returns a media_id we can then send ─────────────
async function uploadMedia(buffer, mimeType, filename, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const FormData = require('form-data');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType || 'application/octet-stream');
  form.append('file', buffer, { filename: filename || 'file', contentType: mimeType || 'application/octet-stream' });
  const res = await WA_HTTP_MEDIA.post(`${GRAPH_API_URL}/${phoneNumberId}/media`, form, {
    headers: { ...form.getHeaders(), Authorization: 'Bearer ' + token },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return res.data.id;
}

// ─── Send an image by public URL (no upload, no catalog) ─────────────────────
// Used for catalog-free "product cards": product photo + caption with name,
// price and a link to the product page. Works for every brand instantly.
async function sendImageLink(to, imageLink, caption, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const phone = String(formatE164(to) || '').replace('+', '');
  const image = { link: imageLink };
  if (caption) image.caption = caption;
  const payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'image', image };
  const res = await WA_HTTP.post(`${GRAPH_API_URL}/${phoneNumberId}/messages`, payload, { headers: authHeader(token) });
  return res.data;
}

// ─── Send a media message (image / video / audio / document) by media_id ─────
async function sendMediaMessage(to, { mediaId, kind, caption, filename }, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const phone = String(formatE164(to) || '').replace('+', '');
  const obj = { id: mediaId };
  // Captions are only allowed on image / video / document.
  if (caption && kind !== 'audio') obj.caption = caption;
  if (kind === 'document' && filename) obj.filename = filename;
  const payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: kind, [kind]: obj };
  const res = await WA_HTTP.post(`${GRAPH_API_URL}/${phoneNumberId}/messages`, payload, { headers: authHeader(token) });
  return res.data;
}

// ─── Template management ──────────────────────────────────────────────────────

// Meta's message_templates endpoint is slow (1–3s) and the template set barely
// changes, yet the dashboard re-fetches it on every visit to the Templates page.
// Cache the response per brand for a short TTL so page loads are instant; any
// mutation (create / delete / update) clears the cache so the UI still sees
// fresh status right after a Seed / Re-submit.
const _templateCache = new Map(); // brandId -> { data, expires }
const TEMPLATE_CACHE_TTL_MS = 60 * 1000;

function invalidateTemplateCache(brandId) {
  if (brandId == null) _templateCache.clear();
  else _templateCache.delete(Number(brandId));
}

async function listTemplates(brandId = 1, { force = false } = {}) {
  const key = Number(brandId);
  const now = Date.now();
  const hit = _templateCache.get(key);
  if (!force && hit && hit.expires > now) return hit.data;

  const { token, businessAccountId } = await getCredentials(brandId);
  const res = await WA_HTTP.get(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?limit=100&fields=name,status,category,language,components,rejected_reason,quality_score`,
    { headers: authHeader(token) }
  );
  _templateCache.set(key, { data: res.data, expires: now + TEMPLATE_CACHE_TTL_MS });
  return res.data; // { data: [...], paging: {...} }
}

// Fixed backend base for WhatsApp button links. One shared number serves all
// brands, so a template button can only carry ONE domain; this backend URL
// 302-redirects to the customer's own store (see routes/trackRedirectRoutes.js).
const WA_API_BASE = (process.env.API_URL || 'https://api.crosscoin.in').replace(/\/+$/, '');
const WA_TRACK_BASE = `${WA_API_BASE}/api/track`;        // + /{{orderNumber}}
const WA_SHOP_BASE  = `${WA_API_BASE}/api/shop`;         // + /{{brandId}}
const WA_CART_BASE  = `${WA_API_BASE}/api/cart-recover`; // + /{{brandId}} → store ?recover=1&coupon=CART10
const WA_INVOICE_BASE = `${WA_API_BASE}/api/invoice`; // + /{{orderNumber}}?t=<hmac>

// Inspect the LIVE approved template so a sender only attaches a header-image or
// button component when the template actually has one. This lets us re-shape
// templates (add buttons / image headers) and deploy the matching sender code
// together WITHOUT a downtime window: before Meta re-approves, the live template
// is still the old shape and the extra params are simply not attached; the moment
// the new shape is approved, the sender starts attaching them. Reads the cached
// template list (60s TTL) so it costs nothing on the hot path.
async function _templateShape(name, brandId = 1) {
  try {
    const data = await listTemplates(brandId);
    const list = data?.data || [];
    const tpl = list.find(t => t.name === name && String(t.status).toUpperCase() === 'APPROVED');
    if (!tpl) return { headerFormat: null, urlButtonIndex: -1 };
    const comps = tpl.components || [];
    const header = comps.find(c => c.type === 'HEADER');
    const btns = comps.find(c => c.type === 'BUTTONS');
    let urlButtonIndex = -1;
    if (btns && Array.isArray(btns.buttons)) {
      // Dynamic URL buttons (url contains a {{n}} variable) need a param on send.
      urlButtonIndex = btns.buttons.findIndex(b => b.type === 'URL' && /\{\{\d+\}\}/.test(b.url || ''));
    }
    return { headerFormat: header?.format || null, urlButtonIndex };
  } catch (_) {
    return { headerFormat: null, urlButtonIndex: -1 };
  }
}

async function createTemplate(tplData, brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const payload = {
    name:       tplData.name,
    category:   (tplData.category || 'UTILITY').toUpperCase(),
    language:   tplData.language || 'en',
    components: tplData.components,
  };
  const res = await WA_HTTP.post(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates`,
    payload,
    { headers: authHeader(token) }
  );
  invalidateTemplateCache(brandId);
  return res.data;
}

async function deleteTemplate(name, brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const res = await WA_HTTP.delete(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?name=${encodeURIComponent(name)}`,
    { headers: authHeader(token) }
  );
  invalidateTemplateCache(brandId);
  return res.data;
}

// Meta locks a DELETED template's name+language for up to 4 weeks ("New English
// content can't be added while the existing English content is being deleted"),
// so a re-sync that deleted a template can't recreate it under the same name for
// weeks. To register a clean set immediately we version every template name with
// a suffix. Bump TEMPLATE_VERSION (e.g. to '_v3') if names ever get stuck again.
// The seeder (buildTemplates) AND every sender resolve names through tName() so
// they can never drift apart.
const TEMPLATE_VERSION = '_v2';
// Per-template version overrides. A template whose SHAPE changed (new button,
// new variable set) can't be updated in place — Meta has no edit API here and
// locks a deleted name for ~4 weeks — so we give it a NEW name instead. A plain
// "Seed Templates" then creates it cleanly (Seed skips names that already
// exist). cart_abandoned went to _v3 when it gained the "Complete Order"
// cart-recovery button. Everything else stays on TEMPLATE_VERSION.
const TEMPLATE_VERSION_OVERRIDES = { cart_abandoned: '_v3' };
const tName = (base) => `${base}${TEMPLATE_VERSION_OVERRIDES[base] || TEMPLATE_VERSION}`;

// Per-brand abandoned-cart template name, derived from the brand domain so the
// template's URL button can show the brand's real domain. Bump the suffix if
// the shape ever changes (Meta locks deleted names for ~4 weeks).
const CART_DOMAIN_TEMPLATE_SUFFIX = '_v1';
const cleanDomain = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '') || 'crosscoin.in';
const cartDomainTemplateName = (domainOrUrl) => {
  const slug = cleanDomain(domainOrUrl).split('.')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() || 'store';
  return `cart_abandoned_${slug}${CART_DOMAIN_TEMPLATE_SUFFIX}`;
};

// ─── Build the canonical template list ────────────────────────────────────────
// Used by both seedDefaultTemplates and updateTemplate / updateAllTemplates
function buildTemplates(storeName, storeUrl) {
  // ONE verified number serves every brand, so the footer must be brand-neutral
  // (Meta doesn't allow variables in footers). The brand name still appears in
  // the body via {{1}}. A helpful, brand-agnostic footer keeps every brand's
  // messages consistent on the shared number.
  const footer = `Need help? Just reply to this message.`;

  // Call-to-action buttons. Dynamic URL buttons carry ONE variable at the end of
  // the URL (the order number / brand id); the backend redirect then sends the
  // customer to their OWN store. Meta forbids emojis / newlines in button labels.
  const trackButton = {
    type: 'BUTTONS',
    buttons: [{
      type: 'URL', text: 'Track Order',
      url: `${WA_TRACK_BASE}/{{1}}`,
      example: [`${WA_TRACK_BASE}/CC-20240101-0001`],
    }],
  };
  const shopButton = {
    type: 'BUTTONS',
    buttons: [{
      type: 'URL', text: 'Shop Now',
      url: `${WA_SHOP_BASE}/{{1}}`,
      example: [`${WA_SHOP_BASE}/1`],
    }],
  };
  // "Complete Order" button for the abandoned-cart message. The variable is the
  // brand id; /api/cart-recover/:brandId 302-redirects to the brand store with
  // ?recover=1&coupon=CART10 so the store reopens the cart and pre-fills the code.
  const cartButton = {
    type: 'BUTTONS',
    buttons: [{
      type: 'URL', text: 'Complete Order',
      url: `${WA_CART_BASE}/{{1}}`,
      example: [`${WA_CART_BASE}/1`],
    }],
  };

  const templates = [
    // ── Transactional / Utility ────────────────────────────────────────────────
    {
      name: tName('order_confirmation'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Confirmed' },
        {
          type: 'BODY',
          text: `Thank you, {{1}}! 🎉\n\nYour *{{2}}* order *#{{3}}* (₹{{4}}) is confirmed and we're preparing it for dispatch now.\n\nWe'll share your tracking details as soon as it ships. We appreciate your trust in us!`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', '699']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('invoice'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Your Tax Invoice' },
        {
          type: 'BODY',
          text: `Hi {{1}}! Your *{{2}}* tax invoice for order *#{{3}}* is ready.\n\nTap below to download the PDF for your records.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
        {
          type: 'BUTTONS',
          buttons: [{
            type: 'URL', text: 'Download Invoice',
            url: `${WA_INVOICE_BASE}/{{1}}`,
            example: [`${WA_INVOICE_BASE}/CC-20240101-0001?t=0123456789abcdef`],
          }],
        },
      ],
    },
    {
      name: tName('order_packed'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Packed & Ready' },
        {
          type: 'BODY',
          text: `Good news, {{1}}! 📦\n\nYour *{{2}}* order *#{{3}}* has been packed and is ready for shipping.\n\nThank you for your patience — your tracking details will be shared shortly.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('order_shipped'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Your Order Is On Its Way!' },
        {
          type: 'BODY',
          text: `Great news, {{1}}! 🚚\n\nYour *{{2}}* order *#{{3}}* has been dispatched and is heading your way.\n\n🔖 *Tracking (AWB):* {{4}}\n📍 *Track live:* {{5}}\n\nThanks for staying connected — we'll notify you the moment it's delivered.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'BD9812345678', `https://${storeUrl}/OrderTracking?order=CC-20240101-0001`]] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('order_out_for_delivery'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Out for Delivery Today!' },
        {
          type: 'BODY',
          text: `Out for delivery today, {{1}}! 🚛\n\nYour *{{2}}* order *#{{3}}* is arriving today via {{4}}.\n\nPlease keep your phone handy and make sure someone is available to receive the package.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'BlueDart Express']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('delivery_failed'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Delivery Attempt Missed' },
        {
          type: 'BODY',
          text: `Hi {{1}}, our courier tried to deliver your *{{2}}* order *#{{3}}* but couldn't complete it.\n\nReason: {{4}}\n\nThey'll try again soon — please keep your phone reachable so the delivery goes through.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'Customer not available']] },
        },
        { type: 'FOOTER', text: footer },
        trackButton,
      ],
    },
    {
      name: tName('order_delivered'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Delivered!' },
        {
          type: 'BODY',
          text: `Delivered! ✅\n\nYour *{{2}}* order *#{{3}}* has arrived — we hope you love it, {{1}}! 😊\n\nThank you for shopping with *{{2}}*. If anything's not right or the package arrived damaged, just reply here within 48 hours and we'll help right away.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('order_cancelled'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Cancelled' },
        {
          type: 'BODY',
          text: `Hi {{1}}, your *{{2}}* order *#{{3}}* has been cancelled.\n\n💳 *Refund:* {{4}}\n\nIf this was unexpected or you have any questions, just reply here and our team will help right away.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'Refund will be credited within 5–7 working days']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      // COD RTO — order returned to origin. NO refund is due (nothing was paid),
      // so this template must never promise one. Rule: COD cancellations and RTO
      // orders → no refund initiated.
      name: tName('cod_rto'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Returned to Us' },
        {
          type: 'BODY',
          text: `Hi {{1}}, your *{{2}}* order *#{{3}}* was returned to us and is now closed.\n\nAs this was a *Cash on Delivery* order, no payment was collected, so there's nothing to refund.\n\nStill want it? Just reply here and we'll help you reorder right away. 😊`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      // Prepaid RTO — order returned to origin. Rule: refund is initiated ONLY
      // after the returned product is received and confirmed at the warehouse.
      // So this first message sets the expectation; the actual "Refund Initiated"
      // message (refund_processed) fires later, once warehouse receipt triggers
      // the real Razorpay refund.
      name: tName('prepaid_rto'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Returned — Refund on the Way' },
        {
          type: 'BODY',
          text: `Hi {{1}}, your *{{2}}* order *#{{3}}* is on its way back to us.\n\n💳 *Refund:* ₹{{4}} to your original payment method\n📦 We'll initiate it as soon as the returned parcel is received and checked at our warehouse, then it reaches you in 5–7 working days.\n\nWe'll message you here the moment your refund is initiated. Thanks for your patience!`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', '699']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('cod_order_confirmation'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Confirm Your COD Order' },
        {
          type: 'BODY',
          text: `Hi {{1}}! 🛒\n\nYour *{{2}}* order *#{{3}}* for ₹{{4}} (Cash on Delivery) has been placed successfully.\n\n📍 *Deliver to:* {{5}}\n\nPlease reply *YES* to confirm, or tap *Confirm Address* below. Reply *NO* if you'd like to cancel.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', '699', 'Rushikesh, 123 Main St, Surat, Gujarat 395006']] },
        },
        { type: 'FOOTER', text: footer },
        {
          type: 'BUTTONS',
          buttons: [
            // Meta forbids emojis / formatting / newlines in button labels.
            { type: 'QUICK_REPLY', text: 'Confirm Address' },
            { type: 'QUICK_REPLY', text: 'Wrong Address' },
          ],
        },
      ],
    },
    {
      name: tName('address_request'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Share Your Correct Address' },
        {
          type: 'BODY',
          text: `No problem, {{1}}! 📍\n\nTo update your *{{2}}* order *#{{3}}*, please reply with your *full delivery address*, landmark and 6-digit pincode in a single message.\n\n_Example: Flat 4B, MG Road, near City Mall, Pune, Maharashtra 411001_`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('refund_processed'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Refund Initiated' },
        {
          type: 'BODY',
          text: `Hi {{1}}, your refund for the *{{2}}* order *#{{3}}* has been initiated.\n\n💰 *Amount:* ₹{{4}}\n🏦 *Mode:* {{5}}\n⏳ *Expected credit:* 5–7 working days\n\nThe exact timing can vary by bank. If you don't see it within 7 working days, reply here and we'll look into it right away.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', '699', 'Original payment method']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('return_requested'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Return Requested' },
        {
          type: 'BODY',
          text: `Hi {{1}}, we've received your return request *{{2}}* for your *{{3}}* order *#{{4}}*.\n\nOur team will review it within 24–48 hours and keep you updated here. If a pickup is needed, we'll arrange it for you.`,
          example: { body_text: [['Rushikesh', 'RET-ABC123', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('return_update'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Return Update' },
        {
          type: 'BODY',
          text: `Hi {{1}}, there's an update on your return *{{2}}*.\n\n📦 *Status:* {{3}}\n📝 {{4}}\n\nReply here if you have any questions — we're happy to help.`,
          example: { body_text: [['Rushikesh', 'RET-ABC123', 'Approved', 'Pickup arranged for tomorrow']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    // ── Marketing ──────────────────────────────────────────────────────────────
    {
      name: tName('review_request'), category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Share Your Experience!' },
        {
          type: 'BODY',
          text: `Thanks for your order, {{1}}! 🌟\n\nHow did we do? Please take a moment to rate your experience with *{{2}}* or leave a quick review — it means the world to us and helps other shoppers.\n\n👉 Share your feedback here: {{3}}\n\nThank you — it only takes a minute!`,
          example: { body_text: [['Rushikesh', storeName, `https://${storeUrl}/products/sample-product#reviews`]] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('win_back'), category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'We Miss You!' },
        {
          type: 'BODY',
          text: `Hi {{1}}! It's been a while since your last *{{2}}* order. 💛\n\nHere's a little something to welcome you back — use code *{{3}}* at checkout on your next order.`,
          example: { body_text: [['Rushikesh', storeName, 'CART10']] },
        },
        { type: 'FOOTER', text: footer },
        shopButton,
      ],
    },
    {
      // Meta rejects a body that starts or ends with a variable, so every
      // body below closes with plain text after its last {{n}}.
      name: tName('back_in_stock'), category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Back in Stock!' },
        {
          type: 'BODY',
          text: `Good news, {{1}}! 🎉\n\n*{{2}}*, which you saved at *{{3}}*, is back in stock.\n\n👉 Grab yours here: {{4}}\n\nPopular sizes sell out fast, so don't wait too long!`,
          example: { body_text: [['Rushikesh', 'Classic Crew Socks', storeName, `https://${storeUrl}/products/sample-product`]] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('price_drop'), category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Price Drop Alert!' },
        {
          type: 'BODY',
          text: `Hi {{1}}! 🎉 *{{2}}*, which you saved at *{{3}}*, is now *₹{{4}}* (was ₹{{5}}).\n\n👉 Get it here: {{6}}\n\nThe new price won't last forever!`,
          example: { body_text: [['Rushikesh', 'Classic Crew Socks', storeName, '249', '299', `https://${storeUrl}/products/sample-product`]] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('post_purchase_upsell'), category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Picked Just for You' },
        {
          type: 'BODY',
          text: `Hi {{1}}! 😊 We hope you're loving your *{{2}}* from *{{3}}*.\n\nWe think you'll like *{{4}}* too.\n\n👉 Take a look: {{5}}\n\nHappy shopping!`,
          example: { body_text: [['Rushikesh', 'Classic Crew Socks', storeName, 'Ankle Sports Socks', `https://${storeUrl}/products/sample-product`]] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      // Transactional: points credited for a specific order → UTILITY.
      name: tName('loyalty_points'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Reward Points Credited' },
        {
          type: 'BODY',
          text: `Hi {{1}}, *{{2}} reward points* have been added to your *{{3}}* account for your recent order.\n\nYour balance is now *{{4}} points*, which you can redeem at checkout on your next order.`,
          example: { body_text: [['Rushikesh', '50', storeName, '120']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: tName('popup_coupon'), category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Exclusive Offer Just for You!' },
        {
          type: 'BODY',
          text: `Here's a special discount crafted exclusively for you at *{{1}}*!\n\n🏷️ *Coupon Code:* {{2}}\n✅ *Valid on:* Prepaid orders only\n⏰ *Offer expires:* Limited time — don't wait!\n\nApply the code at checkout to avail your discount. Happy shopping!`,
          example: { body_text: [[storeName, 'PREPAID10']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      // Variable order MUST match the live approved template (and the admin
      // Dashboard definition): {{1}}=name, {{2}}=product, {{3}}=brand,
      // {{4}}=coupon. The sender (sendAbandonedCart) passes them in this order.
      name: tName('cart_abandoned'), category: 'MARKETING', language: 'en',
      components: [
        {
          type: 'BODY',
          text: `Hi {{1}}!\n\nIt looks like you left something behind — your *{{2}}* is still waiting in your *{{3}}* cart.\n\nComplete your purchase now with an extra *10% OFF* using code *{{4}}* — valid for the next 24 hours only!`,
          example: { body_text: [['Rushikesh', 'Ankle Socks – Pack of 3 ×1', storeName, 'CART10']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      // Per-brand abandoned-cart template: one template PER BRAND NAME on the
      // shared WABA, so the Complete Order button can carry the brand's OWN
      // domain (WhatsApp previews that domain instead of the api redirect
      // host). Body is kept short so WhatsApp doesn't collapse it behind
      // "Read more". Same 4 body variables/order as cart_abandoned; the
      // button variable is the COUPON (the domain is already the brand's).
      // The sender auto-switches to this the moment Meta approves it.
      name: cartDomainTemplateName(storeUrl), category: 'MARKETING', language: 'en',
      components: [
        {
          type: 'BODY',
          text: `Hi {{1}}! Your *{{2}}* is still in your {{3}} cart.\n\nFinish checkout with *10% OFF* — code *{{4}}*, valid for the next 24 hours.`,
          example: { body_text: [['Rushikesh', 'Velour ×1', storeName, 'CART10']] },
        },
        { type: 'FOOTER', text: footer },
        {
          type: 'BUTTONS',
          buttons: [{
            type: 'URL', text: 'Complete Order',
            url: `https://${cleanDomain(storeUrl)}/?recover=1&coupon={{1}}`,
            example: [`https://${cleanDomain(storeUrl)}/?recover=1&coupon=CART10`],
          }],
        },
      ],
    },
  ];

  // ── Attach CTA buttons + image headers by name ──────────────────────────────
  // Phase 2: a "Track Order" button on every order-lifecycle message, a "Shop
  // Now" button on recovery/return messages, and a product-image header on the
  // abandoned-cart message. Done here (not inline) so the template list stays
  // readable and the button set is easy to audit in one place.
  const withTrack = new Set([
    'order_confirmation', 'order_packed', 'order_shipped',
    'order_out_for_delivery', 'order_delivered', 'prepaid_rto',
  ].map(tName));
  const withShop = new Set(['cod_rto'].map(tName));
  // cart_abandoned gets the dedicated "Complete Order" cart-recovery button.
  const withCart = new Set(['cart_abandoned'].map(tName));

  for (const t of templates) {
    if (withTrack.has(t.name)) t.components.push(trackButton);
    else if (withCart.has(t.name)) t.components.push(cartButton);
    else if (withShop.has(t.name)) t.components.push(shopButton);
  }

  // NOTE on IMAGE headers: Meta requires a resumable-upload `header_handle` (not a
  // plain URL) to CREATE a media-header template, so we don't force one here — it
  // would make seeding fail. The sender (`sendTemplate`) already supports an IMAGE
  // header and passes the product photo when the live template has that format, so
  // the only thing needed to turn it on is creating cart_abandoned with an IMAGE
  // header via the upload handshake (FB App ID + sample upload). Wired as a
  // follow-up; until then cart_abandoned keeps its TEXT header and still carries
  // the product name, cart total and Shop Now button.

  return templates;
}

// ─── Default template definitions (brand-neutral, for the management UI) ──────
// Returns the canonical template list with a readable preview, so the dashboard
// can show one card per template and let staff seed/update them individually.
function _defPreview(t) {
  const comp = (type) => t.components.find((c) => c.type === type) || {};
  const buttons = (comp('BUTTONS').buttons || []).map((b) => b.text);
  return {
    name: t.name,
    category: t.category,
    language: t.language,
    header: comp('HEADER').text || '',
    body: comp('BODY').text || '',
    footer: comp('FOOTER').text || '',
    buttons,
  };
}
function listDefaultTemplateDefs() {
  return buildTemplates('{{1}}', 'your-store.in').map(_defPreview);
}
// Brand-aware variant: real store name + domain, so per-brand template names
// (e.g. cart_abandoned_velmique_v1) and button URLs show exactly as they will
// be created — and seeding by the displayed name matches.
async function listBrandTemplateDefs(brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = await _brandDomain(brandId);
  return buildTemplates(storeName, storeUrl).map(_defPreview);
}

// ─── Seed default templates (skip if already exist) ───────────────────────────
// Pass `names` (array) to seed only those templates; omit to seed them all.
async function seedDefaultTemplates(brandId = 1, names = null) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = await _brandDomain(brandId);
  let templates = buildTemplates(storeName, storeUrl);
  if (Array.isArray(names) && names.length) {
    // A dashboard that listed the brand-neutral defaults shows the per-brand
    // domain cart template under a placeholder name; translate any
    // cart_abandoned_<something> request (that isn't the versioned generic)
    // to THIS brand's real template name so the seed filter matches.
    const domainName = cartDomainTemplateName(storeUrl);
    const isDomainish = (n) => /^cart_abandoned_(?!v\d+$)/.test(String(n));
    const want = new Set(names.map((n) => (isDomainish(n) ? domainName : n)));
    templates = templates.filter((t) => want.has(t.name));
  }

  const results = await Promise.allSettled(
    templates.map(tpl => createTemplate(tpl, brandId)
      .then(res => ({ name: tpl.name, status: 'created', id: res.id }))
      .catch(err => {
        const msg = metaError(err);
        if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
          return { name: tpl.name, status: 'already_exists' };
        }
        logger.error(`WhatsApp template error (${tpl.name}): ${msg}`);
        return { name: tpl.name, status: 'error', error: msg };
      })
    )
  );
  return results.map(r => r.value);
}

// ─── Update a single template (delete + recreate) ─────────────────────────────
// Meta has no PATCH for templates — the only way to update content is delete + recreate.
// The template re-enters PENDING review after recreation.
async function updateTemplate(name, brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = await _brandDomain(brandId);
  const templates = buildTemplates(storeName, storeUrl);
  const tpl = templates.find(t => t.name === name);
  if (!tpl) throw new Error(`Template "${name}" is not defined in the default template list`);

  // Step 1 — delete the existing template (ignore 404 — may not exist yet)
  try {
    await deleteTemplate(name, brandId);
    logger.info(`[WhatsApp] Deleted template "${name}" for brand ${brandId}`);
  } catch (delErr) {
    const msg = metaError(delErr);
    // A "doesn't exist" delete is benign — we then just create it fresh. Meta's
    // wording varies: "not found", "wasn't found", "does not exist", "no such".
    const m = msg.toLowerCase();
    const benignMissing = m.includes('not found') || m.includes("n't found")
      || m.includes('does not exist') || m.includes('no such') || m.includes('doesn');
    if (!benignMissing) {
      throw new Error(`Failed to delete template "${name}": ${msg}`);
    }
    logger.info(`[WhatsApp] Template "${name}" did not exist — proceeding to create`);
  }

  // Step 2 — wait for Meta propagation before recreating
  await new Promise(r => setTimeout(r, 3000));

  // Step 3 — recreate with latest content. Meta sometimes hasn't freed the old
  // name yet ("template already exists") — retry a few times before giving up.
  let result, lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { result = await createTemplate(tpl, brandId); break; }
    catch (err) {
      lastErr = err;
      const msg = metaError(err).toLowerCase();
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        logger.info(`[WhatsApp] "${name}" name not freed yet — retry ${attempt}/3 in 5s`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      throw err; // a real validation error — surface it immediately
    }
  }
  if (!result) throw new Error(`Failed to recreate template "${name}": ${metaError(lastErr)}`);
  logger.info(`[WhatsApp] Recreated template "${name}" for brand ${brandId} — id: ${result.id}`);
  return { name, status: 'updated', id: result.id };
}

// ─── Update all default templates ─────────────────────────────────────────────
// Sequentially deletes + recreates every template.  Sequential (not parallel) to
// avoid hitting Meta's template-management rate limit.
async function updateAllTemplates(brandId = 1, names = null) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = await _brandDomain(brandId);
  let templates = buildTemplates(storeName, storeUrl);
  if (Array.isArray(names) && names.length) {
    const want = new Set(names);
    templates = templates.filter((t) => want.has(t.name));
  }

  const results = [];
  for (const tpl of templates) {
    try {
      const result = await updateTemplate(tpl.name, brandId);
      results.push(result);
    } catch (err) {
      logger.error(`[WhatsApp] updateAllTemplates failed for "${tpl.name}": ${err.message}`);
      results.push({ name: tpl.name, status: 'error', error: err.message });
    }
    // Brief pause between templates to avoid Meta rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}

// ─── Rate limiting helper ──────────────────────────────────────────────────────
// Max 10 messages per phone per hour. Uses an atomic INCR and sets the 1-hour
// TTL only on the FIRST message of the window, so the window is a true fixed
// hour instead of sliding forward on every message (which never expired).
async function checkRateLimit(to) {
  const rateLimitKey = `wa:ratelimit:${to}`;
  try {
    const redisService = require('./redisService.js');
    const count = await redisService.incr(rateLimitKey);
    if (typeof count === 'number') {
      // Hot path = one Redis round-trip (INCR), plus EXPIRE only on the first
      // message of the window (fixed 1-hour window). Sending is latency-sensitive
      // (the agent is waiting), so we do NOT add a TTL check on every send.
      if (count === 1) {
        await redisService.expire(rateLimitKey, 3600);
      } else if (count > 10) {
        // Only now — in the already-blocked, rare path — make sure the key will
        // expire even if it somehow lost its TTL (Redis restored without expiry,
        // or the initial expire() failed), so a number can't be wedged forever.
        const ttl = await redisService.ttl(rateLimitKey);
        if (ttl === null || ttl < 0) await redisService.expire(rateLimitKey, 3600);
        logger.warn(`[WhatsApp] Rate limit exceeded for ${to}`);
        return { rate_limited: true };
      }
    }
  } catch (e) { /* Redis down — allow message */ }
  return null;
}

// ─── Send messages ────────────────────────────────────────────────────────────

async function sendTextMessage(phone, text, brandId = 1, contextMessageId = null) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

  // Rate limit: max 10 messages per phone per hour
  const rateLimited = await checkRateLimit(to);
  if (rateLimited) return rateLimited;

  // Sanitize user input in message text
  const sanitizedText = text.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');

  const payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: sanitizedText } };
  if (contextMessageId) {
    payload.context = { message_id: contextMessageId };
    logger.info(`[WhatsApp] Sending reply with context message_id: ${contextMessageId}`);
  }

  const res = await waPostWithRetry(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    payload,
    { headers: authHeader(token) }
  );
  return res.data;
}

// sendTemplate — for SENDING messages, component types are LOWERCASE ('body',
// 'header', 'button'). Uppercase is only for template CREATION. (sendCodConfirmation
// already uses lowercase 'body'/'button'.)
// opts (all optional, all self-adapting to the LIVE template shape):
//   headerImage    — image URL for an IMAGE-header template
//   trackOrder     — order number for a dynamic "Track Order" URL button
//   shopBrandId    — brand id for a dynamic "Shop" URL button
// Any opt whose component is absent on the approved template is simply ignored,
// and an IMAGE header with no headerImage falls back to the brand logo so the
// send never fails for lack of media.
async function sendTemplate(phone, templateName, bodyParams, brandId = 1, opts = {}) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

  // Rate limit: max 10 messages per phone per hour
  const rateLimited = await checkRateLimit(to);
  if (rateLimited) return rateLimited;

  const shape = await _templateShape(templateName, brandId);
  const components = [];

  // Header image — only when the live template declares an IMAGE header.
  if (shape.headerFormat === 'IMAGE') {
    let img = opts.headerImage;
    if (!img) { try { img = await _brandLogo(brandId); } catch (_) {} }
    if (img) components.push({ type: 'header', parameters: [{ type: 'image', image: { link: img } }] });
  }

  if (bodyParams?.length) {
    components.push({ type: 'body', parameters: bodyParams.map(p => ({ type: 'text', text: String(p) })) });
  }

  // Dynamic URL button — attach the variable only when the live template has one.
  if (shape.urlButtonIndex >= 0) {
    const btnParam = opts.urlParam != null ? opts.urlParam
                   : opts.trackOrder != null ? opts.trackOrder
                   : opts.cartRecover != null ? opts.cartRecover
                   : opts.shopBrandId != null ? opts.shopBrandId
                   : null;
    if (btnParam != null) {
      components.push({
        type: 'button', sub_type: 'url', index: String(shape.urlButtonIndex),
        parameters: [{ type: 'text', text: String(btnParam) }],
      });
    }
  }

  const res = await waPostWithRetry(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: 'en' }, components },
    },
    { headers: authHeader(token) }
  );
  return res.data;
}

async function testConnection(phone, brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  return sendTextMessage(phone, `✅ WhatsApp integration is working! — ${storeName}`, brandId);
}

// ─── Order notification helpers ───────────────────────────────────────────────

// All lifecycle templates lead with {{1}}=customer name, {{2}}=brand. `name`
// defaults to a friendly "there" so callers that don't have it still work.
async function sendOrderConfirmation(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('order_confirmation'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    String(data.total ?? ''),
  ], brandId, { trackOrder: data.orderNumber });
}

// Tax invoice — the button carries the order number + HMAC token, so the
// customer (and only link holders) can download the PDF without logging in.
async function sendInvoice(phone, data, brandId = 1) {
  const { invoiceToken } = require('./invoiceService.js');
  return sendTemplate(phone, tName('invoice'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId, { urlParam: `${encodeURIComponent(data.orderNumber)}?t=${invoiceToken(data.orderNumber)}` });
}

async function sendOrderPacked(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('order_packed'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId, { trackOrder: data.orderNumber });
}

async function sendAddressRequest(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('address_request'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId);
}

async function sendOrderShipped(phone, data, brandId = 1) {
  // Always use the brand's own in-site tracking page (ignore any caller-passed
  // crosscoin.in link) so a Soxbae customer gets a soxbae.in/track-order link.
  const trackingUrl = await _trackingUrl(brandId, data.orderNumber);
  return sendTemplate(phone, tName('order_shipped'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    data.awbNumber || 'N/A',
    trackingUrl,
  ], brandId, { trackOrder: data.orderNumber });
}

async function sendOutForDelivery(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('order_out_for_delivery'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    data.courierName || 'our courier partner',
  ], brandId, { trackOrder: data.orderNumber });
}

// Failed delivery attempt (courier NDR) — tells the customer why and that a
// re-attempt is coming, with the Track Order button.
async function sendDeliveryFailed(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('delivery_failed'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    String(data.reason || 'The courier could not reach you').slice(0, 120),
  ], brandId, { trackOrder: data.orderNumber });
}

async function sendOrderDelivered(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('order_delivered'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId, { trackOrder: data.orderNumber });
}

async function sendOrderCancelled(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('order_cancelled'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    data.refundInfo || 'Refund will be processed in 5-7 business days',
  ], brandId);
}

// COD RTO notice — no refund (nothing was paid). Rule-compliant: never promises
// money back on a COD return.
async function sendRtoCod(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('cod_rto'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId, { shopBrandId: brandId });
}

// Prepaid RTO notice — refund is promised but deferred until the parcel is
// received at the warehouse (the real refund + "Refund Initiated" message fire
// then). This only sets the expectation; it does NOT move any money.
async function sendRtoPrepaid(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('prepaid_rto'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    String(data.amount ?? ''),
  ], brandId, { trackOrder: data.orderNumber });
}

async function sendReturnRequested(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('return_requested'), [
    data.name || 'there',
    data.returnNumber || '',
    await _brandName(brandId),
    data.orderNumber || '',
  ], brandId);
}

async function sendReturnUpdate(phone, data, brandId = 1) {
  const labelMap = { approved: 'Approved', rejected: 'Not approved', picked_up: 'Picked up', received: 'Received', refunded: 'Refunded' };
  return sendTemplate(phone, tName('return_update'), [
    data.name || 'there',
    data.returnNumber || '',
    labelMap[data.status] || data.status || 'Updated',
    data.detail || '',
  ], brandId);
}

async function sendCodConfirmation(phone, data, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

  const rateLimited = await checkRateLimit(to);
  if (rateLimited) return rateLimited;

  const orderNumber = String(data.orderNumber);

  // Build template with body params + Quick Reply button payloads keyed to the order number.
  // When customer taps "Confirm Address" → webhook receives payload "confirm_cod_<orderNumber>"
  // When customer taps "Wrong Address"   → webhook receives payload "reject_cod_<orderNumber>"
  const res = await WA_HTTP.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: tName('cod_order_confirmation'),
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: String(data.name || 'there') },
              { type: 'text', text: await _brandName(brandId) },
              { type: 'text', text: orderNumber },
              { type: 'text', text: String(data.amount) },
              { type: 'text', text: String(data.fullAddress || data.address || 'your address') },
            ],
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '0',
            parameters: [{ type: 'payload', payload: `confirm_cod_${orderNumber}` }],
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '1',
            parameters: [{ type: 'payload', payload: `reject_cod_${orderNumber}` }],
          },
        ],
      },
    },
    { headers: authHeader(token) }
  );
  return res.data;
}

async function sendRefundProcessed(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('refund_processed'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    String(data.amount ?? ''),
    data.paymentMethod || 'Original Payment Method',
  ], brandId);
}

// ─── New ecommerce notification helpers ──────────────────────────────────────

// data: { customerName, itemsSummary|productName, couponCode }
// cart_abandoned template variables, in the LIVE order:
//   {{1}}=name, {{2}}=product/items, {{3}}=brand, {{4}}=coupon.
// (The previous order — name, brand, items, total, coupon — did NOT match the
// approved template, so Meta rejected/garbled the send.) The "Complete Order"
// button carries the brand id; /api/cart-recover/:brandId reopens the cart with
// the coupon pre-applied. Coupon defaults to CART10.
// Pick the abandoned-cart template that is actually APPROVED right now: the new
// versioned one (with the Complete Order button) once Meta approves it, else the
// previous version, so sends never break during the review window. Both accept
// the same 4 body params [name, product, brand, coupon].
async function _resolveAbandonedTemplate(brandId = 1) {
  const current = tName('cart_abandoned');              // e.g. cart_abandoned_v3 (has the button)
  const previous = `cart_abandoned${TEMPLATE_VERSION}`; // e.g. cart_abandoned_v2 (no button yet)
  try {
    const data = await listTemplates(brandId);
    const list = data?.data || [];
    const approved = (n) => list.some(t => t.name === n && String(t.status).toUpperCase() === 'APPROVED');
    // Best: the per-brand template whose button shows the brand's own domain
    // and whose short body avoids WhatsApp's "Read more" collapse.
    try {
      const domainName = cartDomainTemplateName(await _brandDomain(brandId));
      if (approved(domainName)) return domainName;
    } catch (_) { /* no domain — fall through */ }
    if (approved(current)) return current;
    if (current !== previous && approved(previous)) return previous;
  } catch (_) { /* fall through to newest */ }
  return current;
}

async function sendAbandonedCart(phone, data, brandId = 1) {
  const templateName = await _resolveAbandonedTemplate(brandId);
  // The generic template's button URL ends in the brand id (api redirect); the
  // per-brand domain template's button already carries the brand domain, so its
  // URL variable is the coupon code instead.
  let btnParam = brandId;
  try {
    if (templateName === cartDomainTemplateName(await _brandDomain(brandId))) {
      btnParam = data.couponCode || 'CART10';
    }
  } catch (_) { /* keep brandId */ }
  return sendTemplate(phone, templateName, [
    data.customerName || 'there',
    data.itemsSummary || data.productName || 'your items',
    await _brandName(brandId),
    data.couponCode || 'CART10',
  ], brandId, { cartRecover: btnParam, headerImage: data.productImage });
}

async function sendReviewRequest(phone, data, brandId = 1) {
  // There is no /review route on any storefront — reviews are left on the product
  // page. Deep-link to the PDP with ?review=open so each store's PDP auto-opens
  // its "write a review" popup on arrival (handled client-side per store). Fall
  // back to the store homepage when we don't know the product. Never link to the
  // dead /review path.
  const reviewUrl = data.reviewUrl
    || (data.productSlug ? await _productUrl(brandId, data.productSlug, '?review=open') : await _brandUrl(brandId));
  return sendTemplate(phone, tName('review_request'), [
    data.name || data.customerName || 'there',
    await _brandName(brandId),
    reviewUrl,
  ], brandId);
}

// Back-in-stock, loyalty and upsell are business-initiated, so they go out as
// approved templates — free-form text is rejected outside the 24-hour window.
async function sendBackInStock(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('back_in_stock'), [
    data.customerName || 'there',
    data.productName,
    await _brandName(brandId),
    await _productUrl(brandId, data.productSlug),
  ], brandId);
}

async function sendPriceDrop(phone, data, brandId = 1) {
  const rupees = (n) => { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : v.toFixed(2); };
  return sendTemplate(phone, tName('price_drop'), [
    data.customerName || 'there',
    data.productName,
    await _brandName(brandId),
    rupees(data.newPrice),
    rupees(data.oldPrice),
    await _productUrl(brandId, data.productSlug),
  ], brandId);
}

async function sendLoyaltyNotification(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('loyalty_points'), [
    data.customerName || 'there',
    data.points,
    await _brandName(brandId),
    data.balance,
  ], brandId);
}

// Win-back (business-initiated, so it must be an approved template — free-form
// text is rejected outside the 24-hour customer-service window).
async function sendWinBack(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('win_back'), [
    data.customerName || 'there',
    await _brandName(brandId),
    data.couponCode,
  ], brandId, { shopBrandId: brandId });
}

async function sendPostPurchaseUpsell(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('post_purchase_upsell'), [
    data.customerName || 'there',
    data.purchasedProduct,
    await _brandName(brandId),
    data.suggestedProduct,
    await _productUrl(brandId, data.suggestedSlug),
  ], brandId);
}

async function sendPopupCoupon(phone, data, brandId = 1) {
  return sendTemplate(phone, tName('popup_coupon'), [await _brandName(brandId), data.couponCode || 'PREPAID10'], brandId);
}

// ─── Broadcast: send template to a list of phones ────────────────────────────
// Returns { sent, failed } counts
// Resolve a requested template name to the EXACT name registered on Meta.
// Broadcasts historically stored a BASE name (e.g. "popup_coupon") while the
// real approved template is versioned ("popup_coupon_v2"); sending the base
// name made Meta reject every message in the broadcast. This checks the brand's
// live template list: it accepts the name as given (covers custom templates an
// operator created directly on Meta), else the versioned form, and returns the
// one that exists and is APPROVED — or null if neither is approved.
async function resolveApprovedTemplateName(name, brandId = 1) {
  if (!name) return null;
  let list = [];
  try {
    const data = await listTemplates(brandId);
    list = data?.data || [];
  } catch (_) { return null; }
  const approved = new Set(
    list.filter(t => String(t.status).toUpperCase() === 'APPROVED').map(t => t.name)
  );
  if (approved.has(name)) return name;
  const versioned = tName(name);
  if (approved.has(versioned)) return versioned;
  return null;
}

async function sendBroadcast(phones, templateName, paramsArray, brandId = 1, delayMs = 200, onProgress = null) {
  let sent = 0; let failed = 0; let throttled = 0;
  for (let i = 0; i < phones.length; i++) {
    try {
      const params = Array.isArray(paramsArray[i]) ? paramsArray[i] : paramsArray[0] || [];
      const r = await sendTemplate(phones[i], templateName, params, brandId);
      // checkRateLimit RETURNS { rate_limited:true } instead of throwing, so a
      // throttled recipient was previously counted as "sent" and silently never
      // delivered. Count it as failed/throttled so the report is truthful.
      if (r && r.rate_limited) { throttled++; failed++; }
      else sent++;
    } catch (err) {
      logger.warn(`Broadcast failed for ${phones[i]}: ${metaError(err)}`);
      failed++;
    }
    // Checkpoint progress periodically so a long broadcast's sent/failed counts
    // are visible in the dashboard as it runs (and survive a mid-run crash as a
    // partial count rather than showing zero).
    if (onProgress && (i % 25 === 24)) { try { await onProgress(sent, failed); } catch (_) {} }
    // Throttle to avoid Meta rate limits (5 msg/sec safe limit)
    if (delayMs > 0 && i < phones.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return { sent, failed, throttled };
}

// ─── Sync products to WhatsApp catalog ────────────────────────────────────────
// Syncs all active products and variations to the WhatsApp Business Catalog
// Returns { synced: number, skipped: number, errors: array }
async function syncProductsToCatalog(brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const catalogId = await settingsHelper.getSetting(brandId, 'WHATSAPP_CATALOG_ID');
  if (!catalogId) throw new Error('WHATSAPP_CATALOG_ID not configured for brand ' + brandId);
  const { domain: storeUrl, key: brandKey } = await _brandInfo(brandId);
  const pdpSeg = SINGULAR_PDP_BRANDS.has(brandKey) ? 'product' : 'products';

  const { Product } = require('../model/productModel.js');
  const { ProductVariation } = require('../model/productVariationModel.js');
  const { ProductImage } = require('../model/productImageModel.js');

  const products = await Product.findAll({
    where: { status: 'active' },
    include: [
      {
        model: ProductVariation,
        where: { status: 'active' },
        required: true,
      },
    ],
  });

  let synced = 0, skipped = 0;
  const errors = [];

  for (const product of products) {
    const variations = product.ProductVariations || product.variations || [];
    for (const variation of variations) {
      try {
        // Skip if already synced
        if (variation.whatsapp_retailer_id) {
          skipped++;
          continue;
        }

        // Get product image (model attributes are product_id / image_url — the
        // old productId/imageUrl names silently matched nothing, so catalog
        // products always synced without an image).
        const image = await ProductImage.findOne({ where: { product_id: product.id } });
        const imageUrl = image?.image_url || null;

        // Build retailer ID in format: {productId}_{variationId}
        const retailerId = `${product.id}_${variation.id}`;

        // Prepare product data for WhatsApp
        const attributesText = variation.attributes
          ? Object.entries(variation.attributes)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')
          : '';

        const productData = {
          retailer_id: retailerId,
          name: product.name,
          description: product.description || `${product.name} - ${attributesText}`.slice(0, 2000),
          price: parseInt(variation.price * 100), // WhatsApp uses cents
          currency: 'INR',
          category: 'PRODUCTS',
          image_url: imageUrl,
          url: `https://${storeUrl}/${pdpSeg}/${product.slug}`,
          availability: variation.stock > 0 ? 'in stock' : 'out of stock',
        };

        // Add product to catalog via product feed
        await WA_HTTP.post(
          `${GRAPH_API_URL}/${catalogId}/products`,
          productData,
          { headers: authHeader(token) }
        );

        // Update database
        await variation.update({ whatsapp_retailer_id: retailerId });
        await product.update({ whatsapp_synced: true });

        synced++;
        logger.info(`Synced product variation: ${retailerId}`);
      } catch (err) {
        const msg = metaError(err);
        errors.push({ variationId: variation.id, productId: product.id, error: msg });
        logger.error(`Failed to sync product ${product.id}_${variation.id}: ${msg}`);
      }
    }
  }

  return { synced, skipped, errors, total: synced + skipped + errors.length };
}

module.exports = {
  formatE164,
  metaError,
  getCredentials,
  clearCredentialsCache,
  // Template management
  listTemplates,
  listDefaultTemplateDefs,
  listBrandTemplateDefs,
  createTemplate,
  deleteTemplate,
  seedDefaultTemplates,
  updateTemplate,
  updateAllTemplates,
  // Messaging
  sendTextMessage,
  sendTemplate,
  testConnection,
  // Order notifications
  sendOrderConfirmation,
  sendInvoice,
  sendOrderPacked,
  sendAddressRequest,
  sendOrderShipped,
  sendOutForDelivery,
  sendDeliveryFailed,
  sendOrderDelivered,
  sendOrderCancelled,
  sendRtoCod,
  sendRtoPrepaid,
  sendCodConfirmation,
  sendRefundProcessed,
  sendReturnRequested,
  sendReturnUpdate,
  // New ecommerce features
  sendAbandonedCart,
  sendReviewRequest,
  sendBackInStock,
  sendPriceDrop,
  sendLoyaltyNotification,
  sendWinBack,
  sendPostPurchaseUpsell,
  sendPopupCoupon,
  sendBroadcast,
  resolveApprovedTemplateName,
  // Catalogue & product
  syncProductsToCatalog,
  // Media
  getMediaUrl,
  downloadMedia,
  uploadMedia,
  sendMediaMessage,
  sendImageLink,
  mediaKindFromMime,
  // URL resolvers (reused by the public track/shop redirect so the link lands
  // on the customer's OWN store).
  getTrackingUrl: _trackingUrl,
  getBrandDomain: _brandDomain,
  getProductUrl: _productUrl,
};
