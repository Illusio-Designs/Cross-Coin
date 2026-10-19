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
  // Every brand falls back to the shared holder's creds, so a change there
  // affects all cached entries.
  if (brandId == null || Number(brandId) === SHARED_WA_BRAND_ID) { _credentialsCache.clear(); return; }
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
const WA_CART_BASE  = `${WA_API_BASE}/api/cart-recover`; // + /{{recoverToken}} → store ?recover=1&coupon=CART10&cart=<token>
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
    if (!tpl) return { headerFormat: null, urlButtonIndex: -1, language: null, category: null, bodyVars: null };
    const comps = tpl.components || [];
    const header = comps.find(c => c.type === 'HEADER');
    const btns = comps.find(c => c.type === 'BUTTONS');
    let urlButtonIndex = -1;
    if (btns && Array.isArray(btns.buttons)) {
      // Dynamic URL buttons (url contains a {{n}} variable) need a param on send.
      urlButtonIndex = btns.buttons.findIndex(b => b.type === 'URL' && /\{\{\d+\}\}/.test(b.url || ''));
    }
    const bodyText = comps.find(c => c.type === 'BODY')?.text || '';
    let bodyVars = 0;
    bodyText.replace(/\{\{(\d+)\}\}/g, (m, i) => { bodyVars = Math.max(bodyVars, Number(i)); return m; });
    // Language + category of the LIVE template: templates made in Meta's UI are
    // usually en_US, and sending them as 'en' fails ("template does not exist
    // in en"). Category decides whether the hourly marketing cap applies.
    return { headerFormat: header?.format || null, urlButtonIndex, language: tpl.language || null, category: String(tpl.category || '').toUpperCase() || null, bodyVars };
  } catch (_) {
    return { headerFormat: null, urlButtonIndex: -1, language: null, category: null, bodyVars: null };
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
  // cart's recovery token (legacy: the brand id); /api/cart-recover/:key
  // 302-redirects to the brand store with ?recover=1&coupon=CART10&cart=<token>
  // so the store rebuilds the cart on any device, opens it and applies the code.
  // The example stays a short value — Meta only uses it for review.
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
      // Sent once on delivery: thank-you + the GST invoice download button
      // (replaces separate "delivered" and "invoice" messages).
      name: tName('delivered_invoice'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Delivered — Thank You!' },
        {
          type: 'BODY',
          text: `Hi {{1}}, your *{{2}}* order *#{{3}}* has been delivered. ✅\n\nThank you for shopping with us — we hope you love it! 💛 Your tax invoice is ready; tap below to download it for your records.\n\nIf anything isn't right, just reply here and we'll help.`,
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
      // Failed delivery with action buttons. The sender attaches payloads
      // ndr_retry_/ndr_address_/ndr_cancel_<orderNumber>; replies are handled
      // by ndrService (Dashboard → Failed Deliveries).
      name: tName('delivery_failed_action'), category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Delivery Attempt Missed' },
        {
          type: 'BODY',
          text: `Hi {{1}}, our courier tried to deliver your *{{2}}* order *#{{3}}* but couldn't complete it.\n\nReason: {{4}}\n\nWhat should we do next? Tap a button below so we can tell the courier.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'Customer not available']] },
        },
        { type: 'FOOTER', text: footer },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'Deliver Again' },
            { type: 'QUICK_REPLY', text: 'Change Address' },
            { type: 'QUICK_REPLY', text: 'Cancel Order' },
          ],
        },
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

// ─── Update a single template (edit in place — never delete) ─────────────────
// Deleting a template locks its name on Meta for ~4 weeks, so the old
// delete-then-recreate left every sender using that name broken for a month.
// Instead: if the template exists, EDIT it in place (POST /{template_id} with
// the new components — it re-enters review while the approved version keeps
// sending); if it doesn't exist yet, create it.
async function updateTemplate(name, brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = await _brandDomain(brandId);
  const templates = buildTemplates(storeName, storeUrl);
  const tpl = templates.find(t => t.name === name);
  if (!tpl) throw new Error(`Template "${name}" is not defined in the default template list`);

  const live = ((await listTemplates(brandId, { force: true }))?.data || []).find(t => t.name === name);
  if (!live) {
    const created = await createTemplate(tpl, brandId);
    logger.info(`[WhatsApp] Template "${name}" did not exist — created (id ${created.id})`);
    return { name, status: 'updated', id: created.id, action: 'created' };
  }
  const { token } = await getCredentials(brandId);
  try {
    await WA_HTTP.post(`${GRAPH_API_URL}/${live.id}`, { components: tpl.components }, { headers: authHeader(token) });
  } catch (err) {
    throw new Error(`WhatsApp did not accept the edit for "${name}": ${metaError(err)}`);
  }
  invalidateTemplateCache(brandId);
  logger.info(`[WhatsApp] Edited template "${name}" in place for brand ${brandId} — id: ${live.id}`);
  return { name, status: 'updated', id: live.id, action: 'edited' };
}

// ─── Update all default templates ─────────────────────────────────────────────
// Sequentially edits (or creates) every template — never deletes.  Sequential (not parallel) to
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
// Applies to business-initiated MARKETING messages and bot auto-replies only —
// staff replies and transactional (UTILITY) templates are never capped (an
// order update must not be dropped because the customer chatted a lot).
// A capped send THROWS (err.code = 'RATE_LIMITED') so no caller can mistake it
// for a delivered message.
function rateLimitError() {
  const e = new Error(RATE_LIMIT_REASON);
  e.code = 'RATE_LIMITED';
  e.rate_limited = true;
  return e;
}

// Template parameters can't contain newlines/tabs or 4+ spaces, nor be empty.
function cleanParam(p) {
  return String(p == null ? '' : p).replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim() || '-';
}

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

// opts.staff = typed by an agent (never rate-capped).
async function sendTextMessage(phone, text, brandId = 1, contextMessageId = null, opts = {}) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

  if (!opts.staff && await checkRateLimit(to)) {
    await _recordAutomatic({ to, brandId, type: 'text', body: text, failed: RATE_LIMIT_REASON });
    throw rateLimitError();
  }

  // WhatsApp renders plain text — no HTML to strip (stripping <...> mangled
  // legitimate text like "<3" or "size <M>").
  const sanitizedText = String(text);

  const payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: sanitizedText } };
  if (contextMessageId) {
    payload.context = { message_id: contextMessageId };
    logger.info(`[WhatsApp] Sending reply with context message_id: ${contextMessageId}`);
  }

  let res;
  try {
    res = await waPostWithRetry(
      `${GRAPH_API_URL}/${phoneNumberId}/messages`,
      payload,
      { headers: authHeader(token) }
    );
  } catch (err) {
    if (err.response) await _recordAutomatic({ to, brandId, type: 'text', body: sanitizedText, failed: metaError(err) });
    throw err;
  }
  // Automatic texts (keyword auto-replies, NDR follow-ups…) are saved to the
  // chat here. Staff replies are NOT — sendReply saves its own row.
  await _recordAutomatic({ to, brandId, type: 'text', body: sanitizedText, waId: res.data?.messages?.[0]?.id });
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

  const shape = await _templateShape(templateName, brandId);

  // Hourly cap only for marketing templates sent automatically.
  if (!opts.staff && shape.category !== 'UTILITY' && shape.category !== 'AUTHENTICATION' && await checkRateLimit(to)) {
    await _recordAutomatic({ to, brandId, templateName, params: bodyParams, failed: RATE_LIMIT_REASON });
    throw rateLimitError();
  }

  // Match the live template's declared variable count (extra params make
  // Meta reject the whole message) and clean every value.
  let cleanParams = Array.isArray(bodyParams) ? bodyParams.map(cleanParam) : [];
  if (Number.isInteger(shape.bodyVars) && shape.bodyVars >= 0 && cleanParams.length > shape.bodyVars) {
    cleanParams = cleanParams.slice(0, shape.bodyVars);
  }
  bodyParams = cleanParams;
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
        parameters: [{ type: 'text', text: cleanParam(btnParam) }],
      });
    }
  }

  let res;
  try {
    res = await waPostWithRetry(
      `${GRAPH_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: templateName, language: { code: opts.language || shape.language || 'en' }, components },
      },
      { headers: authHeader(token) }
    );
  } catch (err) {
    if (err.response) await _recordAutomatic({ to, brandId, templateName, params: bodyParams, failed: metaError(err) });
    throw err;
  }
  // Automatic messages + broadcasts are saved to the customer's chat (tagged
  // with their automation key) so the inbox shows them and the Automations /
  // Broadcasts pages can count sent / delivered / read from real rows.
  await _recordAutomatic({ to, brandId, templateName, params: bodyParams, waId: res.data?.messages?.[0]?.id });
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
  // Preferred: the version with Deliver Again / Change Address / Cancel
  // buttons. Until Meta approves it, fall back to the plain notice.
  try {
    const { token, phoneNumberId } = await getCredentials(brandId);
    const to = formatE164(phone);
    if (!to) throw new Error('Invalid phone number: ' + phone);
    // Transactional — not subject to the hourly marketing cap.
    const orderNumber = String(data.orderNumber);
    const qr = (index, payload) => ({ type: 'button', sub_type: 'quick_reply', index: String(index), parameters: [{ type: 'payload', payload }] });
    const ndrParams = [data.name || 'there', await _brandName(brandId), orderNumber, String(data.reason || 'The courier could not reach you').slice(0, 120)].map(cleanParam);
    const ndrShape = await _templateShape(tName('delivery_failed_action'), brandId);
    const res = await WA_HTTP.post(
      `${GRAPH_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: tName('delivery_failed_action'),
          language: { code: ndrShape.language || 'en' },
          components: [
            {
              type: 'body',
              parameters: ndrParams.map((t) => ({ type: 'text', text: t })),
            },
            qr(0, `ndr_retry_${orderNumber}`),
            qr(1, `ndr_address_${orderNumber}`),
            qr(2, `ndr_cancel_${orderNumber}`),
          ],
        },
      },
      { headers: authHeader(token) }
    );
    await _recordAutomatic({ to, brandId, templateName: tName('delivery_failed_action'), params: ndrParams, waId: res.data?.messages?.[0]?.id });
    return res.data;
  } catch (e) {
    logger.warn(`delivery_failed_action not sent (${metaError(e)}) — using plain delivery_failed`);
  }
  return sendTemplate(phone, tName('delivery_failed'), [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    String(data.reason || 'The courier could not reach you').slice(0, 120),
  ], brandId, { trackOrder: data.orderNumber });
}

// Delivery message: thank-you + invoice download in ONE message. Falls back
// to the plain "delivered" notice until Meta approves delivered_invoice.
async function sendDeliveredWithInvoice(phone, data, brandId = 1) {
  const { invoiceToken } = require('./invoiceService.js');
  try {
    // A failure here is followed by the fallback below, so don't save it as a
    // failed message in the chat.
    return await _withoutFailureRecord(async () => sendTemplate(phone, tName('delivered_invoice'), [
      data.name || 'there',
      await _brandName(brandId),
      data.orderNumber,
    ], brandId, { urlParam: `${encodeURIComponent(data.orderNumber)}?t=${invoiceToken(data.orderNumber)}` }));
  } catch (e) {
    logger.warn(`delivered_invoice not sent (${metaError(e)}) — using plain order_delivered`);
    return sendOrderDelivered(phone, data, brandId);
  }
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

  // Transactional — not subject to the hourly marketing cap.
  const orderNumber = String(data.orderNumber);
  const codParams = [data.name || 'there', await _brandName(brandId), orderNumber, data.amount, data.fullAddress || data.address || 'your address'].map(cleanParam);
  const codShape = await _templateShape(tName('cod_order_confirmation'), brandId);

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
        language: { code: codShape.language || 'en' },
        components: [
          {
            type: 'body',
            parameters: codParams.map((t) => ({ type: 'text', text: t })),
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
  await _recordAutomatic({ to, brandId, templateName: tName('cod_order_confirmation'), params: codParams, waId: res.data?.messages?.[0]?.id });
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
// button carries the cart recovery token; /api/cart-recover/:key rebuilds the cart with
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
  // The button must let the shopper's cart be rebuilt on ANY device — the link
  // usually opens in WhatsApp's in-app browser, where the localStorage cart from
  // their shopping session does not exist. So it carries the cart's unguessable
  // recovery token (services/cartRecoveryService.js):
  //  • generic template  …/api/cart-recover/{{1}}  → {{1}} = token (the redirect
  //    finds the brand from it and forwards ?recover=1&coupon=CART10&cart=token).
  //    Without a token it falls back to the brand id (opens the store, no items).
  //  • per-brand domain template  https://<domain>/?recover=1&coupon={{1}}
  //    → {{1}} = "CART10&cart=<token>" (storefronts also accept it if WhatsApp
  //    percent-encodes the "&cart=" part).
  const coupon = data.couponCode || 'CART10';
  const token = data.recoverToken && /^[A-Za-z0-9_-]{20,64}$/.test(String(data.recoverToken))
    ? String(data.recoverToken) : null;
  let btnParam = token || brandId;
  try {
    if (templateName === cartDomainTemplateName(await _brandDomain(brandId))) {
      btnParam = token ? `${coupon}&cart=${token}` : coupon;
    }
  } catch (_) { /* keep the generic param */ }
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
      await sendTemplate(phones[i], templateName, params, brandId);
      sent++;
    } catch (err) {
      if (err && err.code === 'RATE_LIMITED') throttled++;
      logger.warn(`Broadcast failed for …${String(phones[i]).slice(-4)}: ${metaError(err)}`);
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

// ════════════════════════════════════════════════════════════════════════════
// WhatsApp Studio — settings store, automation on/off switches, saving
// automatic messages to the chat, customer ↔ order matching, the Automations
// report, template enrichment, broadcast audiences and the broadcast runner.
// ════════════════════════════════════════════════════════════════════════════
const { AsyncLocalStorage } = require('async_hooks');
const { QueryTypes } = require('sequelize');
const { phoneHash, decrypt } = require('../utils/encryption.js');

const _autoCtx = new AsyncLocalStorage();
const RATE_LIMIT_REASON = 'Hourly limit for this number reached (10 messages an hour)';
const DAY_MS = 24 * 60 * 60 * 1000;
const _db = () => require('../config/db.js').sequelize;
const _waModels = () => require('../model/whatsappConversationModel.js');

// ── Settings store (whatsapp_settings: key → value) ──────────────────────────
// index.js creates the table at boot (startup-migrations-v27); this lazy guard
// keeps the settings working on a process that started before that migration.
let _settingsReady = null;
function _ensureSettingsTable() {
  if (!_settingsReady) {
    _settingsReady = _db().query(`CREATE TABLE IF NOT EXISTS whatsapp_settings (
      \`key\` VARCHAR(64) NOT NULL PRIMARY KEY,
      value TEXT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).catch((e) => { _settingsReady = null; throw e; });
  }
  return _settingsReady;
}

async function getWaSetting(key, fallback = null) {
  await _ensureSettingsTable();
  const rows = await _db().query('SELECT value FROM whatsapp_settings WHERE `key` = :key LIMIT 1',
    { replacements: { key }, type: QueryTypes.SELECT });
  return rows.length && rows[0].value != null ? rows[0].value : fallback;
}

async function setWaSetting(key, value) {
  await _ensureSettingsTable();
  await _db().query(
    'INSERT INTO whatsapp_settings (`key`, value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP',
    { replacements: { key, value: value == null ? null : String(value) } });
}

// ── Automation catalogue ─────────────────────────────────────────────────────
// Every automatic message the code sends. `senders` are the exported helpers
// that are gated by the switch; `templates` are base names (tName() adds the
// version). `marketing` ones skip customers who replied STOP and get sales
// attribution (orders within 3 days of the message).
const AUTOMATION_GROUPS = [
  { key: 'orders', title: 'Orders', sub: 'sent on every order', rows: [
    { key: 'cod_confirm', name: 'COD confirmation', desc: 'Confirm / wrong-address buttons, then asks for the right address', when: 'COD order placed', templates: ['cod_order_confirmation', 'address_request'] },
    { key: 'order_confirmed', name: 'Order confirmed', desc: 'Thank-you with order number and amount', when: 'Prepaid order paid / COD order confirmed', templates: ['order_confirmation'] },
    { key: 'order_packed', name: 'Packed', desc: 'Order packed and ready to ship', when: 'Order packed in the dashboard', templates: ['order_packed'] },
    { key: 'order_shipped', name: 'Shipped', desc: 'AWB and tracking link', when: 'Courier picks up', templates: ['order_shipped'] },
    { key: 'out_for_delivery', name: 'Out for delivery', desc: 'Arriving today — keep the phone handy', when: 'Courier marks out for delivery', templates: ['order_out_for_delivery'] },
    { key: 'delivered_invoice', name: 'Delivered + invoice', desc: 'Thank-you message with the GST invoice download', when: 'Courier marks delivered', templates: ['delivered_invoice', 'order_delivered', 'invoice'] },
    { key: 'failed_delivery', name: 'Failed delivery', desc: 'Deliver again / new address / cancel buttons', when: 'Courier reports a failed attempt', templates: ['delivery_failed_action', 'delivery_failed'] },
    { key: 'order_cancelled', name: 'Order cancelled', desc: 'Cancellation notice with refund note', when: 'Order cancelled', templates: ['order_cancelled'] },
    { key: 'rto', name: 'Returned to us (RTO)', desc: 'COD: nothing to refund · Prepaid: refund once it reaches us', when: 'Courier sends the parcel back', templates: ['cod_rto', 'prepaid_rto'] },
  ] },
  { key: 'returns', title: 'Returns & refunds', sub: 'keep customers informed', rows: [
    { key: 'return_requested', name: 'Return requested', desc: 'We got the return request', when: 'Customer asks for a return', templates: ['return_requested'] },
    { key: 'return_update', name: 'Return update', desc: 'Approved, picked up or received at the warehouse', when: 'Return status changes', templates: ['return_update'] },
    { key: 'refund_sent', name: 'Refund sent', desc: 'Amount and where it went (card / UPI)', when: 'Refund processed', templates: ['refund_processed'] },
  ] },
  { key: 'sales', title: 'Sales', sub: 'bring shoppers back', rows: [
    { key: 'abandoned_cart', name: 'Abandoned cart', desc: 'Their cart + CART10 code, opens the cart', when: 'Shopper leaves checkout with items', templates: ['cart_abandoned'], marketing: true },
    { key: 'back_in_stock', name: 'Back in stock', desc: 'To wishlist and cart shoppers', when: 'Out-of-stock item restocked', templates: ['back_in_stock'], marketing: true },
    { key: 'price_drop', name: 'Price drop', desc: 'To wishlist and cart shoppers', when: 'Price falls by 2% or more', templates: ['price_drop'], marketing: true },
    { key: 'win_back', name: 'Win-back', desc: 'Offer for customers who haven’t ordered in a while', when: 'Daily at 11:00', templates: ['win_back'], marketing: true },
    { key: 'upsell', name: 'After-purchase upsell', desc: 'A matching product after delivery', when: '1 day after delivery', templates: ['post_purchase_upsell'], marketing: true },
    { key: 'review_request', name: 'Review request', desc: 'Asks for a product review', when: '3 days after delivery', templates: ['review_request'], marketing: true },
    { key: 'loyalty_points', name: 'Loyalty points', desc: 'Points earned and balance', when: 'Points credited for an order', templates: ['loyalty_points'] },
    { key: 'popup_coupon', name: 'Website pop-up coupon', desc: 'Sends the code a visitor asked for on the website', when: 'Visitor enters their number in the pop-up', templates: ['popup_coupon'], marketing: true },
  ] },
  { key: 'chat', title: 'Chat replies', sub: 'answers inside the 24-hour window', rows: [
    { key: 'chat_auto_replies', name: 'Keyword replies', desc: 'Answers hi / track / return; STOP, START and CANCEL are always handled', when: 'Customer sends one of those words', templates: [] },
  ] },
];
const AUTOMATIONS = AUTOMATION_GROUPS.flatMap((g) => g.rows.map((r) => ({ ...r, group: g.key })));
const AUTOMATION_BY_KEY = Object.fromEntries(AUTOMATIONS.map((a) => [a.key, a]));
const MARKETING_KEYS = AUTOMATIONS.filter((a) => a.marketing).map((a) => a.key);

// ── On/off switches (cached 60 s; default ON; fail-open) ─────────────────────
let _autoFlags = null;
let _autoFlagsAt = 0;
async function _loadAutomationFlags() {
  if (_autoFlags && Date.now() - _autoFlagsAt < 60 * 1000) return _autoFlags;
  try {
    await _ensureSettingsTable();
    const rows = await _db().query("SELECT `key` AS k, value FROM whatsapp_settings WHERE `key` LIKE 'automation.%'", { type: QueryTypes.SELECT });
    _autoFlags = Object.fromEntries(rows.map((r) => [String(r.k).slice('automation.'.length), r.value]));
  } catch (e) {
    logger.warn('[WhatsApp] automation switches unreadable — treating all as on: ' + e.message);
    _autoFlags = _autoFlags || {};
  }
  _autoFlagsAt = Date.now();
  return _autoFlags;
}

async function isAutomationEnabled(key) {
  const flags = await _loadAutomationFlags();
  const v = flags[key];
  return !(v === '0' || v === 'false' || v === 0 || v === false);
}

async function setAutomationEnabled(key, enabled) {
  await setWaSetting(`automation.${key}`, enabled ? '1' : '0');
  _autoFlags = null;
}

// ── Phone helpers ────────────────────────────────────────────────────────────
const _p10 = (p) => String(p == null ? '' : p).replace(/\D/g, '').slice(-10);
function _phoneVariants(p) {
  const digits = String(p || '').replace(/\D/g, '');
  const ten = digits.slice(-10);
  if (ten.length !== 10) return digits ? [digits] : [];
  return [...new Set([digits, ten, `91${ten}`, `+91${ten}`, `0${ten}`])];
}

async function isPhoneOptedOut(phone) {
  const variants = _phoneVariants(phone);
  if (!variants.length) return false;
  const rows = await _db().query(
    'SELECT 1 FROM whatsapp_conversations WHERE customer_phone IN (:variants) AND opted_out = 1 LIMIT 1',
    { replacements: { variants }, type: QueryTypes.SELECT });
  return rows.length > 0;
}

// Wrap an automatic sender: honour the switch, skip STOP for marketing, and
// run the send inside a context so the message is saved to the chat with its
// automation key. Returns { skipped:true, ... } instead of throwing, so the
// caller's own bookkeeping (mark cart messaged etc.) behaves as "handled".
function automated(key, fn) {
  return async function automatedSender(phone, data, brandId = 1, ...rest) {
    if (!(await isAutomationEnabled(key))) {
      logger.info(`[WhatsApp] automatic message "${key}" is switched off — not sent`);
      return { skipped: true, automation_disabled: true, automation_key: key };
    }
    if (AUTOMATION_BY_KEY[key]?.marketing) {
      try {
        if (await isPhoneOptedOut(phone)) return { skipped: true, opted_out: true, automation_key: key };
      } catch (_) { /* opt-out lookup failure must not block the send */ }
    }
    const customerName = data && (data.name || data.customerName) ? String(data.name || data.customerName) : null;
    return _autoCtx.run({ automationKey: key, customerName, brandId }, () => fn(phone, data, brandId, ...rest));
  };
}

// Run any send inside an automation context (for code that builds its own
// message, e.g. keyword replies, NDR follow-ups, the away message).
// gate:false = always send (still saved + tagged).
async function runAutomation(key, fn, { gate = true, customerName = null, brandId = null } = {}) {
  if (gate && !(await isAutomationEnabled(key))) return { skipped: true, automation_disabled: true, automation_key: key };
  return _autoCtx.run({ automationKey: key, customerName, brandId }, fn);
}

function sendAutoText(key, phone, text, brandId = 1, { gate = true } = {}) {
  return runAutomation(key, () => sendTextMessage(phone, text, brandId), { gate, brandId });
}

function _withoutFailureRecord(fn) {
  const ctx = _autoCtx.getStore();
  if (!ctx) return fn();
  return _autoCtx.run({ ...ctx, noFailureRecord: true }, fn);
}

// ── Template text helpers ────────────────────────────────────────────────────
function templateBase(name) {
  const n = String(name || '');
  if (/^cart_abandoned_(?!v\d+$)[a-z0-9]+_v\d+$/.test(n)) return 'cart_abandoned';
  return n.replace(/_v\d+$/, '');
}

async function _templateBodyText(name, brandId = SHARED_WA_BRAND_ID) {
  try {
    const list = (await listTemplates(brandId))?.data || [];
    const t = list.find((x) => x.name === name);
    const body = t?.components?.find((c) => c.type === 'BODY')?.text;
    if (body) return body;
  } catch (_) { /* fall back to our own definition */ }
  const def = buildTemplates('{{brand}}', 'your-store.in').find((t) => t.name === name || templateBase(t.name) === templateBase(name));
  return def?.components?.find((c) => c.type === 'BODY')?.text || null;
}

async function _renderTemplateBody(name, params, brandId) {
  const text = await _templateBodyText(name, brandId);
  const p = Array.isArray(params) ? params : [];
  if (!text) return p.length ? `[${name}] ${p.join(' · ')}` : `[${name}]`;
  return text.replace(/\{\{(\d+)\}\}/g, (m, i) => (p[i - 1] != null ? String(p[i - 1]) : m));
}

// ── Save an outbound message to the customer's chat ──────────────────────────
// Finds the thread by phone (any stored format) or creates one (status
// 'resolved', no unread — an automatic message must not clutter the open
// inbox). Exported for other services that send their own messages.
async function recordOutbound({ to, brandId = 1, type = 'template', body = null, templateName = null, waId = null,
  status = 'sent', errorReason = null, automationKey = null, customerName = null, sentBy = null }) {
  const { WhatsappConversation, WhatsappMessage } = _waModels();
  const digits = String(to || '').replace(/\D/g, '');
  if (!digits) return null;
  const variants = _phoneVariants(digits);
  const now = new Date();
  const preview = String(body || (templateName ? `[${templateName}]` : '')).slice(0, 1000);
  let conv = await WhatsappConversation.findOne({ where: { customer_phone: variants }, order: [['last_message_at', 'DESC']] });
  if (!conv) {
    [conv] = await WhatsappConversation.findOrCreate({
      where: { customer_phone: digits },
      defaults: {
        brand_id: Number(brandId) || 1, customer_name: customerName && customerName !== 'there' ? customerName : null,
        wa_contact_id: digits, last_message: preview, last_message_at: now, unread_count: 0, status: 'resolved',
      },
    });
  } else if (status !== 'failed') {
    await conv.update({ last_message: preview, last_message_at: now });
  }
  return WhatsappMessage.create({
    conversation_id: conv.id, wa_message_id: waId || null, direction: 'outbound', type, body: body || preview,
    status, sent_at: now, automation_key: automationKey, template_name: templateName,
    error_reason: errorReason ? String(errorReason).slice(0, 255) : null, sent_by: sentBy,
  });
}

async function _recordAutomatic({ to, brandId, type = 'template', templateName = null, params = null, body = null, waId = null, failed = null }) {
  const ctx = _autoCtx.getStore();
  if (!ctx || !ctx.automationKey) return null;
  if (failed && ctx.noFailureRecord) return null;
  try {
    const text = body != null ? String(body) : await _renderTemplateBody(templateName, params, brandId);
    return await recordOutbound({
      to, brandId: brandId || ctx.brandId || 1, type, body: text, templateName, waId,
      status: failed ? 'failed' : 'sent', errorReason: failed || null,
      automationKey: ctx.automationKey, customerName: ctx.customerName,
    });
  } catch (e) {
    logger.warn(`[WhatsApp] could not save automatic message (${ctx.automationKey}) to chat: ${e.message}`);
    return null;
  }
}

// ── Customer ↔ orders matching ───────────────────────────────────────────────
// Orders for a set of 10-digit phones: shipping / guest phones by keyed hash
// (they are encrypted), account phones directly. One UNION query per chunk.
// Returns rows with .p10 = the phone they matched.
const _hashKeyAvailable = () => !!phoneHash('9999999999');

async function ordersForPhones(phones, { since = null, until = null, brandId = null, excludeCancelled = false } = {}) {
  const list = [...new Set((phones || []).map(_p10).filter((p) => p.length === 10))];
  if (!list.length) return [];
  const out = new Map();
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500);
    const hashTo = new Map();
    for (const p of chunk) { const h = phoneHash(p); if (h) hashTo.set(h, p); }
    const hashes = [...hashTo.keys()];
    const plain = chunk.flatMap((p) => [p, `91${p}`, `+91${p}`]);
    const cond = [];
    if (since) cond.push('o.created_at >= :since');
    if (until) cond.push('o.created_at <= :until');
    if (brandId) cond.push('o.brand_id = :brandId');
    if (excludeCancelled) cond.push("o.status NOT IN ('cancelled','order cancelled') AND (o.payment_status IS NULL OR o.payment_status <> 'failed')");
    const extra = cond.length ? ` AND ${cond.join(' AND ')}` : '';
    const cols = 'o.id, o.order_number, o.status, o.payment_type, o.payment_status, o.final_amount, o.created_at, o.brand_id, o.user_id, o.guest_user_id, o.shipping_address_id';
    const parts = [];
    if (hashes.length) {
      // (Selected strings get one explicit collation so the UNION never hits
      // "illegal mix of collations" when tables were created differently.)
      parts.push(`SELECT ${cols}, CONVERT(a.phone_hash USING utf8mb4) COLLATE utf8mb4_unicode_ci AS h, NULL AS up FROM orders o JOIN shipping_addresses a ON a.id = o.shipping_address_id WHERE a.phone_hash IN (:hashes)${extra}`);
      parts.push(`SELECT ${cols}, CONVERT(g.phone_hash USING utf8mb4) COLLATE utf8mb4_unicode_ci AS h, NULL AS up FROM orders o JOIN guest_users g ON g.id = o.guest_user_id WHERE g.phone_hash IN (:hashes)${extra}`);
    } else {
      // No DATA_ENCRYPTION_KEY (local/dev): stored phones are plain text.
      parts.push(`SELECT ${cols}, NULL AS h, CONVERT(a.phone USING utf8mb4) COLLATE utf8mb4_unicode_ci AS up FROM orders o JOIN shipping_addresses a ON a.id = o.shipping_address_id WHERE a.phone IN (:plain)${extra}`);
    }
    parts.push(`SELECT ${cols}, NULL AS h, CONVERT(u.phone USING utf8mb4) COLLATE utf8mb4_unicode_ci AS up FROM orders o JOIN users u ON u.id = o.user_id WHERE u.phone IN (:plain)${extra}`);
    const rows = await _db().query(parts.join(' UNION ALL '), {
      replacements: { hashes, plain, since, until, brandId }, type: QueryTypes.SELECT,
    });
    for (const r of rows) {
      if (out.has(r.id)) continue;
      const p = r.h ? hashTo.get(r.h) : _p10(r.up);
      if (!p) continue;
      out.set(r.id, { ...r, h: undefined, up: undefined, p10: p });
    }
  }
  return [...out.values()];
}

// Latest order per phone → Map(p10 → order row).
async function latestOrderByPhone(phones) {
  const rows = await ordersForPhones(phones);
  const best = new Map();
  for (const r of rows) {
    const cur = best.get(r.p10);
    if (!cur || new Date(r.created_at) > new Date(cur.created_at)) best.set(r.p10, r);
  }
  return best;
}

// Phones (10-digit) of customers whose order number matches a search term.
async function phonesForOrderSearch(q, limit = 100) {
  const term = String(q || '').trim();
  if (term.length < 3) return [];
  const rows = await _db().query(
    `SELECT o.id, u.phone AS u_phone, a.phone AS a_phone, g.phone AS g_phone
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
      WHERE o.order_number LIKE :q
      ORDER BY o.created_at DESC LIMIT ${Number(limit) || 100}`,
    { replacements: { q: `%${term}%` }, type: QueryTypes.SELECT });
  const set = new Set();
  for (const r of rows) {
    for (const v of [r.u_phone, decrypt(r.a_phone), decrypt(r.g_phone)]) {
      const p = _p10(v);
      if (p.length === 10) set.add(p);
    }
  }
  return [...set];
}

// ── Template status helpers ──────────────────────────────────────────────────
function normaliseTemplateStatus(s) {
  const v = String(s || '').toUpperCase();
  if (v === 'APPROVED') return 'approved';
  if (['PENDING', 'IN_APPEAL', 'PENDING_DELETION', 'LIMIT_EXCEEDED'].includes(v)) return 'pending';
  if (['REJECTED', 'DISABLED', 'PAUSED', 'DELETED', 'ARCHIVED'].includes(v)) return 'rejected';
  return 'missing';
}
const _STATUS_RANK = { approved: 3, pending: 2, rejected: 1, missing: 0 };

// Meta template list → Map(name → normalised status). Never throws.
async function _templateStatusMap(brandId = SHARED_WA_BRAND_ID, { force = false } = {}) {
  try {
    const data = await listTemplates(brandId, { force });
    return { map: new Map((data?.data || []).map((t) => [t.name, normaliseTemplateStatus(t.status)])), list: data?.data || [], error: null };
  } catch (e) {
    return { map: new Map(), list: [], error: metaError(e) };
  }
}

// Best status among an automation's templates (the sender falls back between
// them, so one approved template is enough to send).
function _automationTemplateStatus(auto, statusMap) {
  if (!auto.templates.length) return { template: null, status: 'approved' };
  const names = [];
  for (const base of auto.templates) {
    names.push(tName(base));
    if (base === 'cart_abandoned') {
      names.push(`cart_abandoned${TEMPLATE_VERSION}`);
      for (const n of statusMap.keys()) if (/^cart_abandoned_(?!v\d+$)[a-z0-9]+_v\d+$/.test(n)) names.push(n);
    }
  }
  let best = { template: tName(auto.templates[0]), status: 'missing' };
  for (const n of names) {
    const st = statusMap.get(n) || 'missing';
    if (_STATUS_RANK[st] > _STATUS_RANK[best.status]) best = { template: n, status: st };
  }
  return best;
}

const _inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// ── Automations report ───────────────────────────────────────────────────────
async function getAutomationReport({ days = 7, brandId = null } = {}) {
  const sq = _db();
  const since = new Date(Date.now() - Math.max(1, Math.min(90, Number(days) || 7)) * DAY_MS);
  const brandJoin = brandId ? 'JOIN whatsapp_conversations bc ON bc.id = m.conversation_id AND bc.brand_id = :brandId' : '';
  const base = `FROM whatsapp_messages m ${brandJoin}
    WHERE m.direction = 'outbound' AND m.automation_key IN (:keys) AND m.createdAt >= :since`;
  const repl = { keys: AUTOMATIONS.map((a) => a.key), since, brandId };

  const [agg, replies, mkt, tpl, flags] = await Promise.all([
    sq.query(`SELECT m.automation_key AS k, COUNT(*) AS total,
                     SUM(m.status = 'failed') AS failed,
                     SUM(m.status IN ('delivered','read')) AS delivered,
                     SUM(m.status = 'read') AS rd
                ${base} GROUP BY m.automation_key`, { replacements: repl, type: QueryTypes.SELECT }),
    // "Acted" = the customer answered (tapped a button or wrote) within a day.
    sq.query(`SELECT m.automation_key AS k, COUNT(DISTINCT m.conversation_id) AS acted
                ${base} AND m.status <> 'failed'
                 AND EXISTS (SELECT 1 FROM whatsapp_messages r
                              WHERE r.conversation_id = m.conversation_id AND r.direction = 'inbound'
                                AND r.createdAt > m.createdAt AND r.createdAt <= DATE_ADD(m.createdAt, INTERVAL 1 DAY))
               GROUP BY m.automation_key`, { replacements: repl, type: QueryTypes.SELECT }),
    sq.query(`SELECT m.automation_key AS k, m.createdAt AS at, c.customer_phone AS phone
                FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
               WHERE m.direction = 'outbound' AND m.automation_key IN (:mk) AND m.createdAt >= :since
                 AND m.status <> 'failed' ${brandId ? 'AND c.brand_id = :brandId' : ''}`,
    { replacements: { mk: MARKETING_KEYS, since, brandId }, type: QueryTypes.SELECT }),
    _templateStatusMap(SHARED_WA_BRAND_ID),
    _loadAutomationFlags(),
  ]);

  const A = Object.fromEntries(agg.map((r) => [r.k, r]));
  const R = Object.fromEntries(replies.map((r) => [r.k, Number(r.acted) || 0]));

  // Sales: an order placed within 3 days after a marketing message counts for
  // the most recent such message to that customer.
  const salesBy = {};
  if (mkt.length) {
    const orders = await ordersForPhones(mkt.map((r) => r.phone), { since, excludeCancelled: true });
    const sendsByPhone = new Map();
    for (const r of mkt) {
      const p = _p10(r.phone);
      if (!sendsByPhone.has(p)) sendsByPhone.set(p, []);
      sendsByPhone.get(p).push({ k: r.k, at: new Date(r.at).getTime() });
    }
    for (const o of orders) {
      const t = new Date(o.created_at).getTime();
      let pick = null;
      for (const s of sendsByPhone.get(o.p10) || []) {
        if (s.at <= t && t - s.at <= 3 * DAY_MS && (!pick || s.at > pick.at)) pick = s;
      }
      if (!pick) continue;
      salesBy[pick.k] = salesBy[pick.k] || { orders: 0, sales: 0 };
      salesBy[pick.k].orders++;
      salesBy[pick.k].sales += Number(o.final_amount) || 0;
    }
  }

  const summary = { sent: 0, delivered: 0, read: 0, acted: 0, sales: 0, orders: 0, failed: 0 };
  const notReady = [];
  const groups = AUTOMATION_GROUPS.map((g) => ({
    key: g.key, title: g.title, sub: g.sub,
    rows: g.rows.map((auto) => {
      const a = A[auto.key] || {};
      const failed = Number(a.failed) || 0;
      const sent = Math.max(0, (Number(a.total) || 0) - failed);
      const delivered = Number(a.delivered) || 0;
      const read = Number(a.rd) || 0;
      const acted = R[auto.key] || 0;
      const sb = salesBy[auto.key] || { orders: 0, sales: 0 };
      const enabled = !(['0', 'false'].includes(String(flags[auto.key])));
      const { template, status } = _automationTemplateStatus(auto, tpl.map);
      let result = '—';
      if (auto.marketing && sent) result = sb.orders ? `${sb.orders} order${sb.orders === 1 ? '' : 's'} · ${_inr(sb.sales)}` : 'No orders yet';
      else if ((auto.key === 'cod_confirm' || auto.key === 'failed_delivery') && sent) result = `${acted} answered (${Math.round((acted / sent) * 100)}%)`;
      else if (acted && sent) result = `${acted} replied`;
      if (!sent) {
        if (!enabled) result = 'Switched off';
        else if (status === 'missing') result = 'Template not created yet';
        else if (status === 'pending') result = 'Starts when WhatsApp approves it';
        else if (status === 'rejected') result = 'Template rejected by WhatsApp';
      }
      if (status !== 'approved' && auto.templates.length) notReady.push({ key: auto.key, name: auto.name, templateStatus: status });
      summary.sent += sent; summary.delivered += delivered; summary.read += read; summary.failed += failed;
      summary.acted += acted + sb.orders; summary.sales += sb.sales; summary.orders += sb.orders;
      return {
        key: auto.key, name: auto.name, desc: auto.desc, when: auto.when,
        template, templateStatus: status, enabled, marketing: !!auto.marketing,
        sent, delivered, read, failed, acted,
        read_pct: sent ? Math.round((read / sent) * 100) : null,
        orders: sb.orders, sales: Math.round(sb.sales), result,
      };
    }),
  }));
  summary.sales = Math.round(summary.sales);
  summary.delivered_pct = summary.sent ? Math.round(((summary.delivered + summary.read) / summary.sent) * 1000) / 10 : null;
  summary.read_pct = summary.sent ? Math.round((summary.read / summary.sent) * 100) : null;
  return { days: Number(days) || 7, summary, not_ready: notReady, template_check_error: tpl.error, groups };
}

// ── Template parameters (labels + auto-fill for a 1:1 send) ──────────────────
const TEMPLATE_PARAMS = {
  order_confirmation: ['name', 'brand', 'order', 'amount'],
  invoice: ['name', 'brand', 'order'],
  delivered_invoice: ['name', 'brand', 'order'],
  order_packed: ['name', 'brand', 'order'],
  order_shipped: ['name', 'brand', 'order', 'awb', 'tracking_link'],
  order_out_for_delivery: ['name', 'brand', 'order', 'courier'],
  delivery_failed: ['name', 'brand', 'order', 'reason'],
  delivery_failed_action: ['name', 'brand', 'order', 'reason'],
  order_delivered: ['name', 'brand', 'order'],
  order_cancelled: ['name', 'brand', 'order', 'refund_info'],
  cod_rto: ['name', 'brand', 'order'],
  prepaid_rto: ['name', 'brand', 'order', 'amount'],
  cod_order_confirmation: ['name', 'brand', 'order', 'amount', 'address'],
  address_request: ['name', 'brand', 'order'],
  refund_processed: ['name', 'brand', 'order', 'amount', 'refund_mode'],
  return_requested: ['name', 'return_no', 'brand', 'order'],
  return_update: ['name', 'return_no', 'return_status', 'note'],
  review_request: ['name', 'brand', 'review_link'],
  win_back: ['name', 'brand', 'coupon'],
  back_in_stock: ['name', 'product', 'brand', 'product_link'],
  price_drop: ['name', 'product', 'brand', 'new_price', 'old_price', 'product_link'],
  post_purchase_upsell: ['name', 'product', 'brand', 'suggested_product', 'product_link'],
  loyalty_points: ['name', 'points', 'brand', 'balance'],
  popup_coupon: ['brand', 'coupon'],
  cart_abandoned: ['name', 'items', 'brand', 'coupon'],
};
const PARAM_LABELS = {
  name: 'Customer name', brand: 'Store name', order: 'Order number', amount: 'Amount (₹)',
  awb: 'Tracking number (AWB)', tracking_link: 'Tracking link', courier: 'Courier', reason: 'Reason',
  refund_info: 'Refund note', address: 'Delivery address', refund_mode: 'Refund goes to',
  return_no: 'Return number', return_status: 'Return status', note: 'Note', review_link: 'Review link',
  coupon: 'Coupon code', product: 'Product', product_link: 'Product link', new_price: 'New price (₹)',
  old_price: 'Old price (₹)', suggested_product: 'Suggested product', points: 'Points',
  balance: 'Points balance', items: 'Cart items',
};
const TEMPLATE_TITLES = {
  order_confirmation: 'Order confirmed', invoice: 'Tax invoice', delivered_invoice: 'Delivered + invoice',
  order_packed: 'Packed', order_shipped: 'Shipped', order_out_for_delivery: 'Out for delivery',
  delivery_failed: 'Failed delivery (no buttons)', delivery_failed_action: 'Failed delivery',
  order_delivered: 'Delivered', order_cancelled: 'Order cancelled', cod_rto: 'Returned to us (COD)',
  prepaid_rto: 'Returned to us (prepaid)', cod_order_confirmation: 'COD confirmation',
  address_request: 'Ask for the right address', refund_processed: 'Refund sent',
  return_requested: 'Return requested', return_update: 'Return update', review_request: 'Review request',
  win_back: 'Win-back offer', back_in_stock: 'Back in stock', price_drop: 'Price drop',
  post_purchase_upsell: 'After-purchase upsell', loyalty_points: 'Loyalty points',
  popup_coupon: 'Website pop-up coupon', cart_abandoned: 'Abandoned cart',
};
// Templates that need button payloads only their own sender can attach — not
// offered for a manual 1:1 send.
const NOT_FOR_MANUAL = new Set(['cod_order_confirmation', 'delivery_failed_action', 'address_request']);

function templateTitle(name) {
  const base = templateBase(name);
  if (TEMPLATE_TITLES[base]) {
    const m = String(name).match(/^cart_abandoned_([a-z0-9]+)_v\d+$/);
    return m && m[1] !== 'v2' && !/^v\d+$/.test(m[1]) ? `${TEMPLATE_TITLES[base]} (${m[1]})` : TEMPLATE_TITLES[base];
  }
  const s = base.replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : String(name);
}

function _bodyVarCount(text) {
  let max = 0;
  String(text || '').replace(/\{\{(\d+)\}\}/g, (m, i) => { max = Math.max(max, Number(i)); return m; });
  return max;
}

function templateParamKeys(name, bodyText) {
  const known = TEMPLATE_PARAMS[templateBase(name)];
  const n = _bodyVarCount(bodyText);
  if (known && (!n || known.length === n)) return known;
  return Array.from({ length: n }, (_, i) => (known && known[i]) || `value_${i + 1}`);
}

// Values we can fill from the chat: customer, store, latest order.
async function _fillValues(conv, latestOrder) {
  const brandId = conv.brand_id || SHARED_WA_BRAND_ID;
  const first = String(conv.customer_name || '').trim().split(/\s+/)[0] || 'there';
  const v = { name: first, brand: await _brandName(brandId) };
  if (latestOrder) {
    const orderNo = latestOrder.orderNumber || latestOrder.order_number;
    v.order = orderNo;
    v.amount = String(Math.round(Number(latestOrder.total ?? latestOrder.final_amount) || 0));
    v.awb = latestOrder.awb || latestOrder.shipping_waybill || '';
    v.courier = latestOrder.courier || latestOrder.courier_name || 'our courier partner';
    if (orderNo) v.tracking_link = await _trackingUrl(brandId, orderNo);
  }
  v.coupon = (await settingsHelper.getSetting(brandId, 'WINBACK_COUPON_CODE')) || 'CART10';
  v.review_link = await _brandUrl(brandId);
  v.refund_mode = 'Original payment method';
  return v;
}

// Button parameter for a 1:1 send, by template family.
function _buttonOpts(name, brandId, orderNo) {
  const base = templateBase(name);
  if (['invoice', 'delivered_invoice'].includes(base) && orderNo) {
    const { invoiceToken } = require('./invoiceService.js');
    return { urlParam: `${encodeURIComponent(orderNo)}?t=${invoiceToken(orderNo)}` };
  }
  if (['order_confirmation', 'order_packed', 'order_shipped', 'order_out_for_delivery', 'order_delivered', 'prepaid_rto', 'delivery_failed'].includes(base) && orderNo) {
    return { trackOrder: orderNo };
  }
  if (/^cart_abandoned_(?!v\d+$)[a-z0-9]+_v\d+$/.test(name)) return { urlParam: 'CART10' };
  if (base === 'cart_abandoned') return { cartRecover: brandId };
  return { shopBrandId: brandId };
}

// Approved templates usable in a chat, with parameters pre-filled.
async function templateOptionsForConversation(conv, latestOrder) {
  const { list, error } = await _templateStatusMap(SHARED_WA_BRAND_ID);
  const values = await _fillValues(conv, latestOrder);
  const opts = [];
  for (const t of list) {
    if (normaliseTemplateStatus(t.status) !== 'approved') continue;
    if (NOT_FOR_MANUAL.has(templateBase(t.name))) continue;
    const comps = t.components || [];
    const body = comps.find((c) => c.type === 'BODY')?.text || '';
    if (comps.some((c) => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format))) {
      // sendTemplate attaches the brand logo for IMAGE headers; other media can't be filled.
      if (!comps.some((c) => c.type === 'HEADER' && c.format === 'IMAGE')) continue;
    }
    const keys = templateParamKeys(t.name, body);
    opts.push({
      name: t.name, title: templateTitle(t.name), category: String(t.category || '').toLowerCase(), language: t.language,
      body,
      buttons: (comps.find((c) => c.type === 'BUTTONS')?.buttons || []).map((b) => b.text),
      params: keys.map((k, i) => ({ key: k, label: PARAM_LABELS[k] || `Value ${i + 1}`, value: values[k] != null ? String(values[k]) : '' })),
    });
  }
  opts.sort((a, b) => a.title.localeCompare(b.title));
  return { templates: opts, error };
}

// Resolve + validate a manual template send: exact Meta name, final params,
// button opts. Throws Error with .status for bad input.
async function prepareTemplateSend(conv, templateName, params, latestOrder) {
  const metaName = await resolveApprovedTemplateName(templateName, SHARED_WA_BRAND_ID);
  if (!metaName) { const e = new Error(`"${templateName}" is not an approved WhatsApp template.`); e.status = 400; throw e; }
  if (NOT_FOR_MANUAL.has(templateBase(metaName))) { const e = new Error('This template can only be sent automatically.'); e.status = 400; throw e; }
  const body = (await _templateBodyText(metaName)) || '';
  const keys = templateParamKeys(metaName, body);
  let finalParams;
  if (Array.isArray(params)) {
    finalParams = params.map((p) => String(p == null ? '' : p).trim());
  } else {
    const values = await _fillValues(conv, latestOrder);
    finalParams = keys.map((k) => (values[k] != null ? String(values[k]) : ''));
  }
  const missing = keys.map((k, i) => (!finalParams[i] ? (PARAM_LABELS[k] || `Value ${i + 1}`) : null)).filter(Boolean);
  if (finalParams.length < keys.length || missing.length) {
    const e = new Error(`Please fill in: ${missing.join(', ') || 'all values'}`); e.status = 400; throw e;
  }
  const brandId = conv.brand_id || SHARED_WA_BRAND_ID;
  const orderNo = latestOrder ? (latestOrder.orderNumber || latestOrder.order_number) : null;
  return {
    metaName, params: finalParams.slice(0, keys.length || finalParams.length), brandId,
    opts: _buttonOpts(metaName, brandId, orderNo),
    renderedBody: body.replace(/\{\{(\d+)\}\}/g, (m, i) => (finalParams[i - 1] != null ? finalParams[i - 1] : m)),
  };
}

// ── Templates page: Meta list + our defaults, enriched ───────────────────────
async function listTemplatesEnriched(brandId = null, { force = false } = {}) {
  const holder = brandId || SHARED_WA_BRAND_ID;
  const sq = _db();
  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const [{ list, error }, defs, reads, bcasts] = await Promise.all([
    _templateStatusMap(holder, { force }),
    listBrandTemplateDefs(holder).catch(() => listDefaultTemplateDefs()),
    sq.query(`SELECT template_name AS n, SUM(status <> 'failed') AS sent, SUM(status = 'read') AS rd
                FROM whatsapp_messages
               WHERE direction = 'outbound' AND template_name IS NOT NULL AND createdAt >= :since
               GROUP BY template_name`, { replacements: { since: since30 }, type: QueryTypes.SELECT }).catch(() => []),
    sq.query(`SELECT template_name AS n, COUNT(*) AS c FROM whatsapp_broadcasts
               WHERE createdAt >= :since AND status <> 'cancelled' GROUP BY template_name`,
    { replacements: { since: since30 }, type: QueryTypes.SELECT }).catch(() => []),
  ]);
  const readBy = new Map(reads.map((r) => [r.n, r]));
  const bcBy = new Map(bcasts.map((r) => [r.n, Number(r.c) || 0]));
  const usedBy = (name) => {
    const base = templateBase(name);
    const autos = AUTOMATIONS.filter((a) => a.templates.includes(base));
    const parts = autos.map((a) => `Automatic · ${a.when}`);
    if (bcBy.get(name)) parts.push(`Broadcasts · ${bcBy.get(name)} in 30 days`);
    return parts.length ? parts.join(' / ') : 'Nothing';
  };
  const readRate = (name) => {
    const r = readBy.get(name);
    const sent = Number(r?.sent) || 0;
    return sent ? Math.round(((Number(r.rd) || 0) / sent) * 100) : null;
  };
  const enrich = (t, status) => {
    const comps = t.components || [];
    const body = comps.find((c) => c.type === 'BODY')?.text || '';
    const keys = templateParamKeys(t.name, body);
    return {
      ...t,
      meta_status: t.status || null,
      status,
      title: templateTitle(t.name),
      used_by: usedBy(t.name),
      read_rate: readRate(t.name),
      body,
      header: comps.find((c) => c.type === 'HEADER')?.text || '',
      footer: comps.find((c) => c.type === 'FOOTER')?.text || '',
      buttons: (comps.find((c) => c.type === 'BUTTONS')?.buttons || []).map((b) => b.text),
      vars: keys.map((k, i) => PARAM_LABELS[k] || `Value ${i + 1}`),
      is_default: defs.some((d) => d.name === t.name),
    };
  };
  const rows = list.map((t) => enrich(t, normaliseTemplateStatus(t.status)));
  const have = new Set(list.map((t) => t.name));
  const fullDefs = buildTemplates('{{1}}', 'your-store.in');
  for (const d of defs) {
    if (have.has(d.name)) continue;
    const full = fullDefs.find((f) => f.name === d.name || templateBase(f.name) === templateBase(d.name));
    rows.push(enrich({ name: d.name, category: d.category, language: d.language, components: full ? full.components : [] }, 'missing'));
  }
  const order = { approved: 0, pending: 1, rejected: 2, missing: 3 };
  rows.sort((a, b) => (order[a.status] - order[b.status]) || a.title.localeCompare(b.title));
  const missing = rows.filter((r) => r.status === 'missing').map((r) => r.name);
  const blockedAutomations = AUTOMATIONS.filter((a) => a.templates.length
    && _automationTemplateStatus(a, new Map(list.map((t) => [t.name, normaliseTemplateStatus(t.status)]))).status !== 'approved')
    .map((a) => a.name);
  return { templates: rows, missing, blocked_automations: blockedAutomations, error };
}

async function submitMissingTemplates(brandId = null) {
  const holder = brandId || SHARED_WA_BRAND_ID;
  const { templates, error } = await listTemplatesEnriched(holder, { force: true });
  if (error) { const e = new Error(`Could not read templates from WhatsApp: ${error}`); e.status = 502; throw e; }
  const names = templates.filter((t) => t.status === 'missing').map((t) => t.name);
  if (!names.length) return { submitted: [], results: [] };
  const results = await seedDefaultTemplates(holder, names);
  return { submitted: names, results };
}

// ── Sending hours (10:00–20:00 IST) ──────────────────────────────────────────
const SEND_START_MIN = 10 * 60;
const SEND_END_MIN = 20 * 60;
function _istMinutes(d = new Date()) { return (d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440; }
function isSendingHours(d = new Date()) { const m = _istMinutes(d); return m >= SEND_START_MIN && m < SEND_END_MIN; }
function nextSendingTime(d = new Date()) {
  if (isSendingHours(d)) return d;
  const m = _istMinutes(d);
  const wait = m < SEND_START_MIN ? SEND_START_MIN - m : 1440 - m + SEND_START_MIN;
  const t = new Date(d.getTime() + wait * 60 * 1000);
  t.setUTCSeconds(0, 0);
  return t;
}

// ── Broadcast audiences ──────────────────────────────────────────────────────
const AUDIENCES = {
  all: { label: 'Everyone who can get messages', desc: 'All customers who messaged or ordered and didn’t reply STOP' },
  buyers_90: { label: 'Bought in the last 90 days', desc: 'At least one order in the last 90 days' },
  delivered_happy: { label: 'Happy customers', desc: 'Have a delivered order and no return or RTO' },
  cart_7d: { label: 'Left a cart this week', desc: 'Reached checkout but didn’t order in the last 7 days' },
  lapsed_60: { label: 'Haven’t ordered in 60+ days', desc: 'Bought before, quiet since' },
};
const _CANCELLED = new Set(['cancelled', 'order cancelled']);
const _RETURNED = new Set(['rto', 'rto delivered', 'returned_rto', 'return_initiated', 'returned']);

function _custKey(p10) {
  if (!p10 || p10.length !== 10) return null;
  return phoneHash(p10) || `p:${p10}`;
}

// Map(customerKey → { key, p10|null, hashSrc, name, brandId }) for an audience.
// Counting needs no decryption (keyed hashes); phones are decrypted only for
// the final recipients when a broadcast actually sends (resolveAudiencePhones).
async function buildAudience(type, brandId = null) {
  const sq = _db();
  const t = AUDIENCES[type] ? type : 'all';
  const now = Date.now();
  const hashKey = _hashKeyAvailable();
  const people = new Map();
  const add = (key, info) => {
    if (!key) return;
    const cur = people.get(key);
    if (!cur) { people.set(key, { key, p10: null, hashSrc: null, name: null, brandId: null, ...info }); return; }
    for (const [k, v] of Object.entries(info)) if (cur[k] == null && v != null) cur[k] = v;
  };

  if (t !== 'cart_7d') {
    const rows = await sq.query(
      `SELECT o.brand_id, o.status, o.payment_status, o.created_at,
              u.phone AS u_phone, u.username AS u_name,
              a.phone_hash AS a_hash, a.full_name AS a_name, g.phone_hash AS g_hash, g.first_name AS g_name
              ${hashKey ? '' : ', a.phone AS a_phone, g.phone AS g_phone'}
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
         LEFT JOIN guest_users g ON g.id = o.guest_user_id
        WHERE ${brandId ? 'o.brand_id = :brandId' : '1=1'}
        ORDER BY o.created_at ASC`,
      { replacements: { brandId }, type: QueryTypes.SELECT });
    const stats = new Map();
    for (const r of rows) {
      const up = _p10(r.u_phone);
      let key = null; let p10 = null; let hashSrc = null;
      if (r.a_hash) { key = r.a_hash; hashSrc = 'a'; }
      else if (r.g_hash) { key = r.g_hash; hashSrc = 'g'; }
      else if (up.length === 10) { key = _custKey(up); p10 = up; }
      else if (!hashKey) {
        const ap = _p10(decrypt(r.a_phone)) || _p10(decrypt(r.g_phone));
        if (ap.length === 10) { key = _custKey(ap); p10 = ap; }
      }
      if (!key) continue;
      if (!p10 && up.length === 10 && _custKey(up) === key) p10 = up;
      const s = stats.get(key) || { delivered: false, returned: false, lastAt: 0, recent: false, any: false };
      const cancelled = _CANCELLED.has(String(r.status).toLowerCase()) || r.payment_status === 'failed';
      const at = new Date(r.created_at).getTime();
      if (!cancelled) {
        s.any = true;
        s.lastAt = Math.max(s.lastAt, at);
        if (now - at <= 90 * DAY_MS) s.recent = true;
      }
      if (String(r.status).toLowerCase() === 'delivered') s.delivered = true;
      if (_RETURNED.has(String(r.status).toLowerCase())) s.returned = true;
      stats.set(key, s);
      const name = r.a_name || r.g_name || r.u_name || null;
      add(key, { p10, hashSrc: p10 ? null : hashSrc, name: name ? String(name).trim().split(/\s+/)[0] : null, brandId: r.brand_id });
      // Later rows are newer — keep the latest order's brand.
      people.get(key).brandId = r.brand_id;
    }
    for (const [key, s] of stats) {
      const keep = t === 'all' ? s.any
        : t === 'buyers_90' ? s.recent
          : t === 'delivered_happy' ? (s.delivered && !s.returned)
            : t === 'lapsed_60' ? (s.any && now - s.lastAt > 60 * DAY_MS)
              : false;
      if (!keep) people.delete(key);
    }
  }

  if (t === 'all') {
    const convs = await sq.query(
      `SELECT customer_phone, customer_name, brand_id FROM whatsapp_conversations
        WHERE opted_out = 0 ${brandId ? 'AND brand_id = :brandId' : ''}`,
      { replacements: { brandId }, type: QueryTypes.SELECT });
    for (const c of convs) {
      const p = _p10(c.customer_phone);
      add(_custKey(p), { p10: p, name: c.customer_name ? String(c.customer_name).trim().split(/\s+/)[0] : null, brandId: c.brand_id });
    }
  }

  if (t === 'cart_7d') {
    const carts = await sq.query(
      `SELECT phone_hash, ${hashKey ? 'NULL AS phone' : 'phone'}, customer_name, brand_id FROM abandoned_carts
        WHERE created_at >= :since AND status <> 'recovered' ${brandId ? 'AND brand_id = :brandId' : ''}
        ORDER BY created_at ASC`,
      { replacements: { since: new Date(now - 7 * DAY_MS), brandId }, type: QueryTypes.SELECT }).catch(() => []);
    for (const c of carts) {
      let key = c.phone_hash; let p10 = null;
      if (!key && !hashKey) { p10 = _p10(decrypt(c.phone)); key = _custKey(p10); }
      add(key, { p10, hashSrc: p10 ? null : 'c', name: c.customer_name ? String(c.customer_name).trim().split(/\s+/)[0] : null, brandId: c.brand_id });
    }
  }

  // STOP is number-wide on the shared number → exclude from every brand.
  const stopped = await sq.query('SELECT customer_phone FROM whatsapp_conversations WHERE opted_out = 1', { type: QueryTypes.SELECT });
  let optedOut = 0;
  for (const s of stopped) {
    const k = _custKey(_p10(s.customer_phone));
    if (k && people.delete(k)) optedOut++;
  }
  return { type: t, people, optedOut };
}

const _audienceCache = new Map();
async function audienceCount(type, brandId = null) {
  const ck = `${type}|${brandId || 'all'}`;
  const hit = _audienceCache.get(ck);
  if (hit && hit.exp > Date.now()) return hit.data;
  const { people, optedOut } = await buildAudience(type, brandId);
  const data = { count: people.size, opted_out: optedOut };
  _audienceCache.set(ck, { data, exp: Date.now() + 60 * 1000 });
  return data;
}

// Fill in .p10 for audience members we only know by hash (decrypt the stored
// phone of a matching shipping / guest / cart row).
async function resolveAudiencePhones(members) {
  const need = members.filter((m) => !m.p10);
  const sq = _db();
  for (let i = 0; i < need.length; i += 500) {
    const chunk = need.slice(i, i + 500);
    const hashes = chunk.map((m) => m.key);
    const rows = await sq.query(
      `SELECT CONVERT(phone_hash USING utf8mb4) COLLATE utf8mb4_unicode_ci AS h, CONVERT(phone USING utf8mb4) COLLATE utf8mb4_unicode_ci AS phone FROM shipping_addresses WHERE phone_hash IN (:hashes)
       UNION ALL SELECT CONVERT(phone_hash USING utf8mb4) COLLATE utf8mb4_unicode_ci AS h, CONVERT(phone USING utf8mb4) COLLATE utf8mb4_unicode_ci AS phone FROM guest_users WHERE phone_hash IN (:hashes)
       UNION ALL SELECT CONVERT(phone_hash USING utf8mb4) COLLATE utf8mb4_unicode_ci AS h, CONVERT(phone USING utf8mb4) COLLATE utf8mb4_unicode_ci AS phone FROM abandoned_carts WHERE phone_hash IN (:hashes)`,
      { replacements: { hashes }, type: QueryTypes.SELECT }).catch(() => []);
    const byHash = new Map();
    for (const r of rows) {
      if (byHash.has(r.h)) continue;
      const p = _p10(decrypt(r.phone));
      if (p.length === 10) byHash.set(r.h, p);
    }
    for (const m of chunk) m.p10 = byHash.get(m.key) || null;
  }
  return members.filter((m) => m.p10);
}

function audienceLabel(filterJson, brandsById = {}) {
  let f = {};
  try { f = typeof filterJson === 'string' ? JSON.parse(filterJson || '{}') : (filterJson || {}); } catch (_) { f = {}; }
  const type = AUDIENCES[f.type] ? f.type : 'all';
  const brand = f.brandId ? (brandsById[f.brandId] || `Brand ${f.brandId}`) : 'All brands';
  return { type, brandId: f.brandId || null, label: AUDIENCES[type].label, brand_label: brand };
}

// ── Broadcast runner ─────────────────────────────────────────────────────────
// Claims the broadcast atomically (so the API "send now" kick and the worker
// cron never both run it), sends to the audience minus STOP and minus anyone
// already messaged by this broadcast (resume after a pause/crash), pauses at
// 20:00 IST and stops when cancelled. Every send is saved to the chat tagged
// 'broadcast:<id>' — that is what the Broadcasts page counts.
const _runningBroadcasts = new Set();
async function runBroadcastJob(id, { delayMs = 200 } = {}) {
  const { WhatsappBroadcast } = _waModels();
  const { Op, fn, col } = require('sequelize');
  if (_runningBroadcasts.has(Number(id))) return { started: false, reason: 'already_running_here' };
  const now = new Date();
  if (!isSendingHours(now)) return { started: false, reason: 'outside_sending_hours', next: nextSendingTime(now) };
  const [claimed] = await WhatsappBroadcast.update(
    { status: 'running', started_at: fn('COALESCE', col('started_at'), now) },
    { where: {
      id,
      [Op.and]: [
        { [Op.or]: [{ scheduled_at: null }, { scheduled_at: { [Op.lte]: now } }] },
        { [Op.or]: [
          { status: { [Op.in]: ['scheduled', 'paused'] } },
          { status: 'running', updatedAt: { [Op.lt]: new Date(now.getTime() - 10 * 60 * 1000) } },
        ] },
      ],
    } });
  if (!claimed) return { started: false, reason: 'not_due_or_taken' };
  _runningBroadcasts.add(Number(id));
  const b = await WhatsappBroadcast.findByPk(id);
  const key = `broadcast:${id}`;
  try {
    let filter = {};
    try { filter = JSON.parse(b.audience_filter || '{}') || {}; } catch (_) { filter = {}; }
    const { people, optedOut } = await buildAudience(filter.type || 'all', filter.brandId || null);
    const already = await _db().query(
      `SELECT DISTINCT c.customer_phone AS phone FROM whatsapp_messages m
         JOIN whatsapp_conversations c ON c.id = m.conversation_id
        WHERE m.automation_key = :key AND m.direction = 'outbound'`,
      { replacements: { key }, type: QueryTypes.SELECT });
    const done = new Set(already.map((r) => _custKey(_p10(r.phone))));
    let members = [...people.values()].filter((m) => !done.has(m.key));
    members = await resolveAudiencePhones(members);
    if (!b.total_recipients) {
      await b.update({ total_recipients: done.size + members.length, skipped_count: optedOut });
    }
    const body = (await _templateBodyText(b.template_name)) || '';
    const keys = templateParamKeys(b.template_name, body);
    const extra = Array.isArray(filter.params) ? filter.params : [];
    let sent = Number(b.sent_count) || 0;
    let failed = Number(b.failed_count) || 0;
    const brandNames = new Map();
    for (let i = 0; i < members.length; i++) {
      if (i % 20 === 0) {
        if (i > 0) await b.update({ sent_count: sent, failed_count: failed });
        const fresh = await WhatsappBroadcast.findByPk(id, { attributes: ['status'] });
        if (!fresh || fresh.status === 'cancelled') {
          logger.info(`[Broadcast ${id}] cancelled — stopped after ${sent} sent`);
          return { started: true, stopped: 'cancelled', sent, failed };
        }
        if (!isSendingHours()) {
          await b.update({ status: 'paused', sent_count: sent, failed_count: failed });
          logger.info(`[Broadcast ${id}] paused at 20:00 IST — resumes 10:00 (${sent} sent so far)`);
          return { started: true, stopped: 'paused', sent, failed };
        }
      }
      const m = members[i];
      const brand = Number(m.brandId) || Number(filter.brandId) || SHARED_WA_BRAND_ID;
      if (!brandNames.has(brand)) brandNames.set(brand, await _brandName(brand));
      const vals = { name: m.name || 'there', brand: brandNames.get(brand) };
      const params = keys.map((k, idx) => {
        const given = extra[idx];
        if (given != null && String(given) !== '') {
          return String(given).replace(/\{name\}/g, vals.name).replace(/\{brand\}/g, vals.brand);
        }
        return vals[k] != null ? vals[k] : '';
      });
      try {
        await _autoCtx.run({ automationKey: key, customerName: m.name, brandId: brand },
          () => sendTemplate(`91${m.p10}`, b.template_name, params, brand, { shopBrandId: brand }));
        sent++;
      } catch (err) {
        failed++;
        logger.warn(`[Broadcast ${id}] send to …${m.p10.slice(-4)} failed: ${metaError(err)}`);
      }
      if (delayMs > 0 && i < members.length - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
    await b.update({ status: 'done', sent_count: sent, failed_count: failed, completed_at: new Date() });
    logger.info(`[Broadcast ${id}] done: ${sent} sent, ${failed} failed`);
    return { started: true, sent, failed };
  } catch (err) {
    await b.update({ status: 'failed' }).catch(() => {});
    logger.error(`[Broadcast ${id}] run error: ${err.message}`);
    return { started: true, error: err.message };
  } finally {
    _runningBroadcasts.delete(Number(id));
  }
}

// Which values a broadcast template needs beyond the per-customer name/store.
async function checkBroadcastParams(templateName, params) {
  const body = (await _templateBodyText(templateName)) || '';
  const keys = templateParamKeys(templateName, body);
  const missing = [];
  keys.forEach((k, i) => {
    const given = Array.isArray(params) ? params[i] : null;
    if ((k === 'name' || k === 'brand') && (given == null || given === '')) return;
    if (given == null || String(given).trim() === '') missing.push(PARAM_LABELS[k] || `Value ${i + 1}`);
  });
  return { ok: missing.length === 0, missing, vars: keys.map((k, i) => ({ key: k, label: PARAM_LABELS[k] || `Value ${i + 1}`, auto: k === 'name' || k === 'brand' })) };
}

// Cron entry: start/resume every due broadcast (scheduled, paused or stale).
async function runDueBroadcasts() {
  if (!isSendingHours()) return { ran: 0 };
  const { WhatsappBroadcast } = _waModels();
  const { Op } = require('sequelize');
  const now = new Date();
  const due = await WhatsappBroadcast.findAll({
    where: {
      [Op.or]: [
        { status: { [Op.in]: ['scheduled', 'paused'] }, [Op.or]: [{ scheduled_at: null }, { scheduled_at: { [Op.lte]: now } }] },
        { status: 'running', updatedAt: { [Op.lt]: new Date(now.getTime() - 10 * 60 * 1000) } },
      ],
    },
    attributes: ['id'], order: [['scheduled_at', 'ASC']], limit: 5,
  });
  let ran = 0;
  for (const b of due) {
    const r = await runBroadcastJob(b.id);
    if (r.started) ran++;
  }
  return { ran };
}

// Results per broadcast: delivered / read from the tagged rows, orders + sales
// placed by recipients within 3 days after their message.
async function broadcastResults(ids) {
  const out = new Map(ids.map((id) => [Number(id), { delivered: 0, read: 0, failed_msgs: 0, orders: 0, sales: 0, stop_replies: 0 }]));
  if (!ids.length) return out;
  const keys = ids.map((id) => `broadcast:${id}`);
  const sq = _db();
  const [agg, sends, stops] = await Promise.all([
    sq.query(`SELECT automation_key AS k, SUM(status IN ('delivered','read')) AS delivered, SUM(status = 'read') AS rd,
                     SUM(status = 'failed') AS failed
                FROM whatsapp_messages WHERE automation_key IN (:keys) AND direction = 'outbound' GROUP BY automation_key`,
    { replacements: { keys }, type: QueryTypes.SELECT }),
    sq.query(`SELECT m.automation_key AS k, m.createdAt AS at, c.customer_phone AS phone
                FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
               WHERE m.automation_key IN (:keys) AND m.direction = 'outbound' AND m.status <> 'failed'`,
    { replacements: { keys }, type: QueryTypes.SELECT }),
    sq.query(`SELECT m.automation_key AS k, COUNT(DISTINCT m.conversation_id) AS n
                FROM whatsapp_messages m
               WHERE m.automation_key IN (:keys) AND m.direction = 'outbound'
                 AND EXISTS (SELECT 1 FROM whatsapp_messages r WHERE r.conversation_id = m.conversation_id
                              AND r.direction = 'inbound' AND r.createdAt > m.createdAt
                              AND r.createdAt <= DATE_ADD(m.createdAt, INTERVAL 3 DAY)
                              AND LOWER(TRIM(r.body)) IN ('stop','unsubscribe','opt out','optout'))
               GROUP BY m.automation_key`, { replacements: { keys }, type: QueryTypes.SELECT }),
  ]);
  const idOf = (k) => Number(String(k).split(':')[1]);
  for (const r of agg) {
    const o = out.get(idOf(r.k)); if (!o) continue;
    o.delivered = Number(r.delivered) || 0; o.read = Number(r.rd) || 0; o.failed_msgs = Number(r.failed) || 0;
  }
  for (const r of stops) { const o = out.get(idOf(r.k)); if (o) o.stop_replies = Number(r.n) || 0; }
  if (sends.length) {
    const earliest = new Date(Math.min(...sends.map((s) => new Date(s.at).getTime())));
    const orders = await ordersForPhones(sends.map((s) => s.phone), { since: earliest, excludeCancelled: true });
    const byPhone = new Map();
    for (const s of sends) {
      const p = _p10(s.phone);
      if (!byPhone.has(p)) byPhone.set(p, []);
      byPhone.get(p).push({ id: idOf(s.k), at: new Date(s.at).getTime() });
    }
    for (const o of orders) {
      const t = new Date(o.created_at).getTime();
      let pick = null;
      for (const s of byPhone.get(o.p10) || []) if (s.at <= t && t - s.at <= 3 * DAY_MS && (!pick || s.at > pick.at)) pick = s;
      if (!pick) continue;
      const r = out.get(pick.id);
      r.orders++; r.sales += Number(o.final_amount) || 0;
    }
  }
  for (const r of out.values()) r.sales = Math.round(r.sales);
  return out;
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
  sendOrderConfirmation: automated('order_confirmed', sendOrderConfirmation),
  sendInvoice: automated('delivered_invoice', sendInvoice),
  sendOrderPacked: automated('order_packed', sendOrderPacked),
  sendAddressRequest: automated('cod_confirm', sendAddressRequest),
  sendOrderShipped: automated('order_shipped', sendOrderShipped),
  sendOutForDelivery: automated('out_for_delivery', sendOutForDelivery),
  sendDeliveryFailed: automated('failed_delivery', sendDeliveryFailed),
  sendOrderDelivered: automated('delivered_invoice', sendOrderDelivered),
  sendDeliveredWithInvoice: automated('delivered_invoice', sendDeliveredWithInvoice),
  sendOrderCancelled: automated('order_cancelled', sendOrderCancelled),
  sendRtoCod: automated('rto', sendRtoCod),
  sendRtoPrepaid: automated('rto', sendRtoPrepaid),
  sendCodConfirmation: automated('cod_confirm', sendCodConfirmation),
  sendRefundProcessed: automated('refund_sent', sendRefundProcessed),
  sendReturnRequested: automated('return_requested', sendReturnRequested),
  sendReturnUpdate: automated('return_update', sendReturnUpdate),
  // New ecommerce features
  sendAbandonedCart: automated('abandoned_cart', sendAbandonedCart),
  sendReviewRequest: automated('review_request', sendReviewRequest),
  sendBackInStock: automated('back_in_stock', sendBackInStock),
  sendPriceDrop: automated('price_drop', sendPriceDrop),
  sendLoyaltyNotification: automated('loyalty_points', sendLoyaltyNotification),
  sendWinBack: automated('win_back', sendWinBack),
  sendPostPurchaseUpsell: automated('upsell', sendPostPurchaseUpsell),
  sendPopupCoupon: automated('popup_coupon', sendPopupCoupon),
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
  // WhatsApp Studio
  SHARED_WA_BRAND_ID,
  tName,
  getWaSetting,
  setWaSetting,
  AUTOMATIONS,
  AUTOMATION_GROUPS,
  isAutomationEnabled,
  setAutomationEnabled,
  automated,
  runAutomation,
  sendAutoText,
  recordOutbound,
  isPhoneOptedOut,
  ordersForPhones,
  latestOrderByPhone,
  phonesForOrderSearch,
  getAutomationReport,
  normaliseTemplateStatus,
  templateBase,
  templateTitle,
  templateOptionsForConversation,
  prepareTemplateSend,
  listTemplatesEnriched,
  submitMissingTemplates,
  isSendingHours,
  nextSendingTime,
  AUDIENCES,
  buildAudience,
  audienceCount,
  audienceLabel,
  runBroadcastJob,
  runDueBroadcasts,
  broadcastResults,
  checkBroadcastParams,
  cleanParam,
};
