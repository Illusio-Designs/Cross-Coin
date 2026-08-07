'use strict';

const axios = require('axios');
const { logger } = require('../config/logging.js');
const settingsHelper = require('./settingsHelper.js');

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

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
async function _brandName(brandId) {
  return (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
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
  const res = await axios.get(
    `${GRAPH_API_URL}/${mediaId}`,
    { headers: authHeader(token) }
  );
  return { url: res.data.url, mimeType: res.data.mime_type, fileSize: res.data.file_size };
}

// ─── Download media bytes from Meta (for proxying to browser) ────────────────
async function downloadMedia(mediaUrl, brandId = 1) {
  const { token } = await getCredentials(brandId);
  const res = await axios.get(mediaUrl, {
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
  const res = await axios.post(`${GRAPH_API_URL}/${phoneNumberId}/media`, form, {
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
  const res = await axios.post(`${GRAPH_API_URL}/${phoneNumberId}/messages`, payload, { headers: authHeader(token) });
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
  const res = await axios.post(`${GRAPH_API_URL}/${phoneNumberId}/messages`, payload, { headers: authHeader(token) });
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
  const res = await axios.get(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?limit=100&fields=name,status,category,language,components,rejected_reason,quality_score`,
    { headers: authHeader(token) }
  );
  _templateCache.set(key, { data: res.data, expires: now + TEMPLATE_CACHE_TTL_MS });
  return res.data; // { data: [...], paging: {...} }
}

async function createTemplate(tplData, brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const payload = {
    name:       tplData.name,
    category:   (tplData.category || 'UTILITY').toUpperCase(),
    language:   tplData.language || 'en',
    components: tplData.components,
  };
  const res = await axios.post(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates`,
    payload,
    { headers: authHeader(token) }
  );
  invalidateTemplateCache(brandId);
  return res.data;
}

async function deleteTemplate(name, brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const res = await axios.delete(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?name=${encodeURIComponent(name)}`,
    { headers: authHeader(token) }
  );
  invalidateTemplateCache(brandId);
  return res.data;
}

// ─── Build the canonical template list ────────────────────────────────────────
// Used by both seedDefaultTemplates and updateTemplate / updateAllTemplates
function buildTemplates(storeName, storeUrl) {
  // ONE verified number serves every brand, so the footer must be brand-neutral
  // (Meta doesn't allow variables in footers). The brand name still appears in
  // the body via {{1}}. A helpful, brand-agnostic footer keeps every brand's
  // messages consistent on the shared number.
  const footer = `Need help? Just reply to this message.`;

  return [
    // ── Transactional / Utility ────────────────────────────────────────────────
    {
      name: 'order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '✅ Order Confirmed' },
        {
          type: 'BODY',
          text: `Thank you, {{1}}! 🎉\n\nYour *{{2}}* order *#{{3}}* (₹{{4}}) is confirmed and we're preparing it for dispatch now.\n\nWe'll share your tracking details as soon as it ships. We appreciate your trust in us!`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', '699']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_packed', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '📦 Order Packed & Ready' },
        {
          type: 'BODY',
          text: `Good news, {{1}}! 📦\n\nYour *{{2}}* order *#{{3}}* has been packed and is ready for shipping.\n\nThank you for your patience — your tracking details will be shared shortly.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_shipped', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🚚 Your Order Is On Its Way!' },
        {
          type: 'BODY',
          text: `Great news, {{1}}! 🚚\n\nYour *{{2}}* order *#{{3}}* has been dispatched and is heading your way.\n\n🔖 *Tracking (AWB):* {{4}}\n📍 *Track live:* {{5}}\n\nThanks for staying connected — we'll notify you the moment it's delivered.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'BD9812345678', `https://${storeUrl}/OrderTracking?order=CC-20240101-0001`]] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_out_for_delivery', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🚛 Out for Delivery Today!' },
        {
          type: 'BODY',
          text: `Out for delivery today, {{1}}! 🚛\n\nYour *{{2}}* order *#{{3}}* is arriving today via {{4}}.\n\nPlease keep your phone handy and make sure someone is available to receive the package.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'BlueDart Express']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_delivered', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🎉 Order Delivered!' },
        {
          type: 'BODY',
          text: `Delivered! ✅\n\nYour *{{2}}* order *#{{3}}* has arrived — we hope you love it, {{1}}! 😊\n\nThank you for shopping with *{{2}}*. If anything's not right or the package arrived damaged, just reply here within 48 hours and we'll help right away.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_cancelled', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '❌ Order Cancelled' },
        {
          type: 'BODY',
          text: `Hi {{1}}, your *{{2}}* order *#{{3}}* has been cancelled.\n\n💳 *Refund:* {{4}}\n\nIf this was unexpected or you have any questions, just reply here and our team will help right away.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', 'Refund will be credited within 5–7 working days']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'cod_order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🛒 Confirm Your COD Order' },
        {
          type: 'BODY',
          text: `Hi {{1}}! 🛒\n\nYour *{{2}}* order *#{{3}}* for ₹{{4}} (Cash on Delivery) has been placed successfully.\n\n📍 *Deliver to:* {{5}}\n\nPlease reply *YES* to confirm, or tap *Confirm Address* below. Reply *NO* if you'd like to cancel.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', '699', 'Rushikesh, 123 Main St, Surat, Gujarat 395006']] },
        },
        { type: 'FOOTER', text: footer },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: '✅ Confirm Address' },
            { type: 'QUICK_REPLY', text: '✏️ Wrong Address' },
          ],
        },
      ],
    },
    {
      name: 'address_request', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '📍 Share Your Correct Address' },
        {
          type: 'BODY',
          text: `No problem, {{1}}! 📍\n\nTo update your *{{2}}* order *#{{3}}*, please reply with your *full delivery address*, landmark and 6-digit pincode in a single message.\n\n_Example: Flat 4B, MG Road, near City Mall, Pune, Maharashtra 411001_`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'refund_processed', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '💳 Refund Initiated' },
        {
          type: 'BODY',
          text: `Hi {{1}}, your refund for the *{{2}}* order *#{{3}}* has been initiated.\n\n💰 *Amount:* ₹{{4}}\n🏦 *Mode:* {{5}}\n⏳ *Expected credit:* 5–7 working days\n\nThe exact timing can vary by bank. If you don't see it within 7 working days, reply here and we'll look into it right away.`,
          example: { body_text: [['Rushikesh', storeName, 'CC-20240101-0001', '699', 'Original payment method']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    // ── Marketing ──────────────────────────────────────────────────────────────
    {
      name: 'review_request', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '⭐ Share Your Experience!' },
        {
          type: 'BODY',
          text: `Thanks for your order, {{1}}! 🌟\n\nHow did we do? Please take a moment to rate your experience with *{{2}}* or leave a quick review — it means the world to us and helps other shoppers.\n\n👉 Share your feedback: {{3}}`,
          example: { body_text: [['Rushikesh', storeName, `https://${storeUrl}/review`]] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'popup_coupon', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🎁 Exclusive Offer Just for You!' },
        {
          type: 'BODY',
          text: `Here's a special discount crafted exclusively for you at *{{1}}*!\n\n🏷️ *Coupon Code:* {{2}}\n✅ *Valid on:* Prepaid orders only\n⏰ *Offer expires:* Limited time — don't wait!\n\nApply the code at checkout to avail your discount. Happy shopping!`,
          example: { body_text: [[storeName, 'PREPAID10']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'cart_abandoned', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🛒 Your Cart Is Waiting!' },
        {
          type: 'BODY',
          text: `Hi {{1}}!\n\nIt looks like you left something behind — your *{{2}}* is still waiting in your *{{3}}* cart.\n\nTo make it easier for you to complete your purchase, we are offering you an *additional 10% OFF* with code *{{4}}*. This offer is valid for the next 24 hours only!\n\nDon't let your favourites sell out — complete your order before it's too late.`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks – Pack of 3', storeName, 'SAVE10']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
  ];
}

// ─── Default template definitions (brand-neutral, for the management UI) ──────
// Returns the canonical template list with a readable preview, so the dashboard
// can show one card per template and let staff seed/update them individually.
function listDefaultTemplateDefs() {
  const templates = buildTemplates('{{1}}', 'your-store.in');
  return templates.map((t) => {
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
  });
}

// ─── Seed default templates (skip if already exist) ───────────────────────────
// Pass `names` (array) to seed only those templates; omit to seed them all.
async function seedDefaultTemplates(brandId = 1, names = null) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  let templates = buildTemplates(storeName, storeUrl);
  if (Array.isArray(names) && names.length) {
    const want = new Set(names);
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
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const templates = buildTemplates(storeName, storeUrl);
  const tpl = templates.find(t => t.name === name);
  if (!tpl) throw new Error(`Template "${name}" is not defined in the default template list`);

  // Step 1 — delete the existing template (ignore 404 — may not exist yet)
  try {
    await deleteTemplate(name, brandId);
    logger.info(`[WhatsApp] Deleted template "${name}" for brand ${brandId}`);
  } catch (delErr) {
    const msg = metaError(delErr);
    if (!msg.toLowerCase().includes('not found') && !msg.toLowerCase().includes('does not exist')) {
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
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
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
    if (count === 1) await redisService.expire(rateLimitKey, 3600); // TTL on first only
    if (count > 10) {
      logger.warn(`[WhatsApp] Rate limit exceeded for ${to}`);
      return { rate_limited: true };
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

  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    payload,
    { headers: authHeader(token) }
  );
  return res.data;
}

// sendTemplate — for SENDING messages, component types are LOWERCASE ('body',
// 'header', 'button'). Uppercase is only for template CREATION. (sendCodConfirmation
// already uses lowercase 'body'/'button'.)
async function sendTemplate(phone, templateName, bodyParams, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

  // Rate limit: max 10 messages per phone per hour
  const rateLimited = await checkRateLimit(to);
  if (rateLimited) return rateLimited;

  const components = bodyParams?.length
    ? [{ type: 'body', parameters: bodyParams.map(p => ({ type: 'text', text: String(p) })) }]
    : [];

  const res = await axios.post(
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
  return sendTemplate(phone, 'order_confirmation', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    String(data.total ?? ''),
  ], brandId);
}

async function sendOrderPacked(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_packed', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId);
}

async function sendAddressRequest(phone, data, brandId = 1) {
  return sendTemplate(phone, 'address_request', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId);
}

async function sendOrderShipped(phone, data, brandId = 1) {
  const storeUrl = (await settingsHelper.getSetting(brandId, 'STORE_URL')) || 'crosscoin.in';
  return sendTemplate(phone, 'order_shipped', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    data.awbNumber || 'N/A',
    data.trackingUrl || `https://${storeUrl}/OrderTracking?order=${encodeURIComponent(data.orderNumber)}`,
  ], brandId);
}

async function sendOutForDelivery(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_out_for_delivery', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    data.courierName || 'our courier partner',
  ], brandId);
}

async function sendOrderDelivered(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_delivered', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
  ], brandId);
}

async function sendOrderCancelled(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_cancelled', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    data.refundInfo || 'Refund will be processed in 5-7 business days',
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
  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'cod_order_confirmation',
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
  return sendTemplate(phone, 'refund_processed', [
    data.name || 'there',
    await _brandName(brandId),
    data.orderNumber,
    String(data.amount ?? ''),
    data.paymentMethod || 'Original Payment Method',
  ], brandId);
}

// ─── New ecommerce notification helpers ──────────────────────────────────────

async function sendAbandonedCart(phone, data, brandId = 1) {
  return sendTemplate(phone, 'cart_abandoned', [
    data.customerName || 'there',
    data.productName || 'your items',
    await _brandName(brandId),
    data.couponCode || 'SAVE10',
  ], brandId);
}

async function sendReviewRequest(phone, data, brandId = 1) {
  const storeUrl = (await settingsHelper.getSetting(brandId, 'STORE_URL')) || 'crosscoin.in';
  return sendTemplate(phone, 'review_request', [
    data.name || data.customerName || 'there',
    await _brandName(brandId),
    data.reviewUrl || `https://${storeUrl}/review`,
  ], brandId);
}

async function sendBackInStock(phone, data, brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const text = `🎉 Good news! *${data.productName}* is back in stock at *${storeName}*.\n\nGrab it before it sells out again!\n👉 https://${storeUrl}/product/${data.productSlug}`;
  return sendTextMessage(phone, text, brandId);
}

async function sendLoyaltyNotification(phone, data, brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const text = `🌟 *${storeName} Rewards*\n\nHi ${data.customerName || 'there'}! You just earned *${data.points} points* for your order.\n\nYour balance: *${data.balance} points*\n\nRedeem at checkout 👉 https://${storeUrl}`;
  return sendTextMessage(phone, text, brandId);
}

async function sendWinBack(phone, data, brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const text = `Hey ${data.customerName || 'there'}! 👋\n\nWe miss you at *${storeName}*. It's been a while since your last order.\n\nHere's *${data.couponCode || '10% OFF'}* just for you — use it on your next order!\n\n👉 https://${storeUrl}`;
  return sendTextMessage(phone, text, brandId);
}

async function sendPostPurchaseUpsell(phone, data, brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const text = `Hi ${data.customerName || 'there'}! 😊\n\nLoved your *${data.purchasedProduct}* from *${storeName}*?\n\nYou might also like: *${data.suggestedProduct}*\n\n👉 https://${storeUrl}/product/${data.suggestedSlug}`;
  return sendTextMessage(phone, text, brandId);
}

async function sendPopupCoupon(phone, data, brandId = 1) {
  return sendTemplate(phone, 'popup_coupon', [await _brandName(brandId), data.couponCode || 'PREPAID10'], brandId);
}

// ─── Broadcast: send template to a list of phones ────────────────────────────
// Returns { sent, failed } counts
async function sendBroadcast(phones, templateName, paramsArray, brandId = 1, delayMs = 200) {
  let sent = 0; let failed = 0;
  for (let i = 0; i < phones.length; i++) {
    try {
      const params = Array.isArray(paramsArray[i]) ? paramsArray[i] : paramsArray[0] || [];
      await sendTemplate(phones[i], templateName, params, brandId);
      sent++;
    } catch (err) {
      logger.warn(`Broadcast failed for ${phones[i]}: ${metaError(err)}`);
      failed++;
    }
    // Throttle to avoid Meta rate limits (5 msg/sec safe limit)
    if (delayMs > 0 && i < phones.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return { sent, failed };
}

// ─── Send single product card (interactive product message) ──────────────────
// product_retailer_id in your catalogue feed is "{productId}_{variationId}"
// Pass retailerIds as an array like ["123_456"] matching your catalogue g:id values
async function sendProductCard(phone, retailerId, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const catalogId = await settingsHelper.getSetting(brandId, 'WHATSAPP_CATALOG_ID');
  if (!catalogId) throw new Error('WHATSAPP_CATALOG_ID not configured for brand ' + brandId);

  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'product',
        body: { text: `Check out this product from ${storeName} 👇` },
        action: {
          catalog_id: catalogId,
          // retailerId must match g:id in your catalogue feed exactly: "{productId}_{variationId}"
          product_retailer_id: String(retailerId),
        },
      },
    },
    { headers: authHeader(token) }
  );
  return res.data;
}

// ─── Send catalogue section (multi-product message — up to 30 items) ─────────
// retailerIds must be an array of strings matching g:id in your catalogue feed
async function sendCatalogueMessage(phone, retailerIds, opts = {}, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const catalogId = await settingsHelper.getSetting(brandId, 'WHATSAPP_CATALOG_ID');
  if (!catalogId) throw new Error('WHATSAPP_CATALOG_ID not configured for brand ' + brandId);

  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';

  // Meta allows max 30 products per section, max 10 sections
  const sections = [];
  const chunkSize = 30;
  for (let i = 0; i < retailerIds.length; i += chunkSize) {
    sections.push({
      title: i === 0 ? (opts.sectionTitle || `${storeName} Products`) : `More Products`,
      product_items: retailerIds.slice(i, i + chunkSize).map(id => ({
        product_retailer_id: String(id),
      })),
    });
  }

  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'product_list',
        header: { type: 'text', text: opts.headerText || `${storeName} Collection` },
        body: { text: opts.bodyText || `Browse our latest products and tap to order directly! 🛍️` },
        footer: { text: `Powered by ${storeName}` },
        action: {
          catalog_id: catalogId,
          sections,
        },
      },
    },
    { headers: authHeader(token) }
  );
  return res.data;
}

// ─── Sync products to WhatsApp catalog ────────────────────────────────────────
// Syncs all active products and variations to the WhatsApp Business Catalog
// Returns { synced: number, skipped: number, errors: array }
async function syncProductsToCatalog(brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const catalogId = await settingsHelper.getSetting(brandId, 'WHATSAPP_CATALOG_ID');
  if (!catalogId) throw new Error('WHATSAPP_CATALOG_ID not configured for brand ' + brandId);
  const storeUrl = (await settingsHelper.getSetting(brandId, 'STORE_URL')) || 'crosscoin.in';

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
          url: `https://${storeUrl}/product/${product.slug}`,
          availability: variation.stock > 0 ? 'in stock' : 'out of stock',
        };

        // Add product to catalog via product feed
        await axios.post(
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
  sendOrderPacked,
  sendAddressRequest,
  sendOrderShipped,
  sendOutForDelivery,
  sendOrderDelivered,
  sendOrderCancelled,
  sendCodConfirmation,
  sendRefundProcessed,
  // New ecommerce features
  sendAbandonedCart,
  sendReviewRequest,
  sendBackInStock,
  sendLoyaltyNotification,
  sendWinBack,
  sendPostPurchaseUpsell,
  sendPopupCoupon,
  sendBroadcast,
  // Catalogue & product
  sendProductCard,
  sendCatalogueMessage,
  syncProductsToCatalog,
  // Media
  getMediaUrl,
  downloadMedia,
  uploadMedia,
  sendMediaMessage,
  sendImageLink,
  mediaKindFromMime,
};
