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
function metaError(err) {
  return err?.response?.data?.error?.message || err?.message || 'Unknown error';
}

// ─── Load credentials from brand settings ────────────────────────────────────
const _credentialsCache = new Map();
const CREDENTIALS_TTL = 5 * 60 * 1000; // 5 minutes

async function getCredentials(brandId = 1) {
  const cacheKey = `wa_creds_${brandId}`;
  const cached = _credentialsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CREDENTIALS_TTL) {
    return cached.data;
  }

  const [token, phoneNumberId, businessAccountId] = await Promise.all([
    settingsHelper.getSetting(brandId, 'WHATSAPP_API_TOKEN'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_PHONE_NUMBER_ID'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_BUSINESS_ACCOUNT_ID'),
  ]);

  if (!token)               throw new Error('WHATSAPP_API_TOKEN not configured for brand ' + brandId);
  if (!phoneNumberId)       throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured for brand ' + brandId);
  if (!businessAccountId)   throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID not configured for brand ' + brandId);

  const data = { token, phoneNumberId, businessAccountId };
  _credentialsCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
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

// ─── Template management ──────────────────────────────────────────────────────

async function listTemplates(brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const res = await axios.get(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?limit=100&fields=name,status,category,language,components`,
    { headers: authHeader(token) }
  );
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
  return res.data;
}

async function deleteTemplate(name, brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  const res = await axios.delete(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?name=${encodeURIComponent(name)}`,
    { headers: authHeader(token) }
  );
  return res.data;
}

// ─── Build the canonical template list ────────────────────────────────────────
// Used by both seedDefaultTemplates and updateTemplate / updateAllTemplates
function buildTemplates(storeName, storeUrl) {
  const footer = `${storeName} — ${storeUrl}`;

  return [
    // ── Transactional / Utility ────────────────────────────────────────────────
    {
      name: 'order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '✅ Order Confirmed' },
        {
          type: 'BODY',
          text: `Thank you for shopping with *${storeName}*!\n\nYour order has been confirmed and is being prepared for dispatch.\n\n🧾 *Order ID:* #{{1}}\n📦 *Items:* {{2}}\n💰 *Order Total:* ₹{{3}}\n🚚 *Estimated Delivery:* {{4}}\n\nYou will receive a shipping notification with live tracking as soon as your order is dispatched. We appreciate your trust in us!`,
          example: { body_text: [['CC-20240101-0001', '2 items', '699', '3–5 working days']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_shipped', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '📦 Your Order Is On Its Way!' },
        {
          type: 'BODY',
          text: `Great news! Your *${storeName}* order has been dispatched and is heading your way.\n\n🧾 *Order ID:* #{{1}}\n🔖 *Tracking No (AWB):* {{2}}\n📍 *Track your shipment:* {{3}}\n\nExpected delivery within 2–5 business days. We'll keep you posted at every milestone. Thank you for your patience!`,
          example: { body_text: [['CC-20240101-0001', 'BD9812345678', `https://${storeUrl}/OrderTracking?order=CC-20240101-0001`]] },
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
          text: `Your *${storeName}* order is out for delivery and will arrive today!\n\n🧾 *Order ID:* #{{1}}\n🚚 *Courier Partner:* {{2}}\n\nPlease ensure someone is available at the delivery address to receive the package. If you miss the delivery, the courier will attempt again the next working day.`,
          example: { body_text: [['CC-20240101-0001', 'BlueDart Express']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_delivered', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🎉 Order Delivered Successfully!' },
        {
          type: 'BODY',
          text: `We're delighted to inform you that your *${storeName}* order has been delivered!\n\n🧾 *Order ID:* #{{1}}\n\nWe hope you love your purchase. If you have any concerns or if the package arrived damaged, please reply to this message within 48 hours and our team will assist you promptly.\n\nThank you for choosing *${storeName}*. We look forward to serving you again! 😊`,
          example: { body_text: [['CC-20240101-0001']] },
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
          text: `We regret to inform you that your *${storeName}* order has been cancelled.\n\n🧾 *Order ID:* #{{1}}\n💳 *Refund Status:* {{2}}\n\nIf this was unexpected or if you have any questions regarding your refund, please reply to this message or reach out to our support team. We apologise for any inconvenience caused and hope to serve you better next time.`,
          example: { body_text: [['CC-20240101-0001', 'Refund will be credited within 5–7 working days']] },
        },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'cod_order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🧾 Action Required — COD Order' },
        {
          type: 'BODY',
          text: `Thank you for placing a Cash on Delivery order with *${storeName}*!\n\nBefore we process your order, we need to verify your delivery address.\n\n🧾 *Order ID:* #{{1}}\n💰 *Amount Payable:* ₹{{2}} (Cash on Delivery)\n📍 *Delivery Address:* {{3}}\n\nPlease confirm your address using the buttons below. This helps us ensure a smooth and hassle-free delivery.`,
          example: { body_text: [['CC-20240101-0001', '699', 'Rushikesh, 123 Main St, Surat, Gujarat 395006']] },
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
      name: 'refund_processed', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '💳 Refund Initiated' },
        {
          type: 'BODY',
          text: `Your refund for the *${storeName}* order has been successfully initiated.\n\n🧾 *Order ID:* #{{1}}\n💰 *Refund Amount:* ₹{{2}}\n🏦 *Refund Mode:* {{3}}\n⏳ *Expected Credit:* 5–7 working days\n\nPlease note that the credit timeline may vary slightly depending on your bank. If you do not receive your refund within 7 working days, please reply to this message and we will investigate immediately.`,
          example: { body_text: [['CC-20240101-0001', '699', 'Original payment method']] },
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
          text: `Hi {{1}}!\n\nWe hope you are enjoying your *{{2}}* from *${storeName}*. Your feedback means the world to us and helps fellow shoppers make informed decisions.\n\nSharing your experience takes less than a minute — and we genuinely appreciate every review!\n\n👉 Review your purchase: {{3}}`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks', `https://${storeUrl}/review`]] },
        },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Write a Review', url: `https://${storeUrl}/review` }] },
      ],
    },
    {
      name: 'popup_coupon', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🎁 Exclusive Offer Just for You!' },
        {
          type: 'BODY',
          text: `Here's a special discount crafted exclusively for you at *${storeName}*!\n\n🏷️ *Coupon Code:* {{1}}\n✅ *Valid on:* Prepaid orders only\n⏰ *Offer expires:* Limited time — don't wait!\n\nApply the code at checkout to avail your discount. Happy shopping!`,
          example: { body_text: [['PREPAID10']] },
        },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Shop Now', url: `https://${storeUrl}` }] },
      ],
    },
    {
      name: 'cart_abandoned', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🛒 Your Cart Is Waiting!' },
        {
          type: 'BODY',
          text: `Hi {{1}}!\n\nIt looks like you left something behind — your *{{2}}* is still waiting in your *${storeName}* cart.\n\nTo make it easier for you to complete your purchase, we are offering you an *additional 10% OFF* with code *{{3}}*. This offer is valid for the next 24 hours only!\n\nDon't let your favourites sell out — complete your order before it's too late.`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks – Pack of 3', 'SAVE10']] },
        },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Complete My Order', url: `https://${storeUrl}/cart` }] },
      ],
    },
  ];
}

// ─── Seed all default templates (skip if already exist) ───────────────────────
async function seedDefaultTemplates(brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const templates = buildTemplates(storeName, storeUrl);

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

  // Step 3 — recreate with latest content from buildTemplates
  const result = await createTemplate(tpl, brandId);
  logger.info(`[WhatsApp] Recreated template "${name}" for brand ${brandId} — id: ${result.id}`);
  return { name, status: 'updated', id: result.id };
}

// ─── Update all default templates ─────────────────────────────────────────────
// Sequentially deletes + recreates every template.  Sequential (not parallel) to
// avoid hitting Meta's template-management rate limit.
async function updateAllTemplates(brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const templates = buildTemplates(storeName, storeUrl);

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
async function checkRateLimit(to) {
  const rateLimitKey = `wa:ratelimit:${to}`;
  try {
    const redisService = require('./redisService.js');
    const count = await redisService.get(rateLimitKey);
    if (count && parseInt(count) >= 10) {
      logger.warn(`[WhatsApp] Rate limit exceeded for ${to}`);
      return { rate_limited: true };
    }
    await redisService.set(rateLimitKey, String((parseInt(count || 0) + 1)), 'EX', 3600);
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

// sendTemplate — components must use uppercase type ('BODY', 'HEADER', etc.)
async function sendTemplate(phone, templateName, bodyParams, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

  // Rate limit: max 10 messages per phone per hour
  const rateLimited = await checkRateLimit(to);
  if (rateLimited) return rateLimited;

  const components = bodyParams?.length
    ? [{ type: 'BODY', parameters: bodyParams.map(p => ({ type: 'text', text: String(p) })) }]
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
  return sendTextMessage(phone, '✅ WhatsApp integration is working! — Cross Coin', brandId);
}

// ─── Order notification helpers ───────────────────────────────────────────────

async function sendOrderConfirmation(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_confirmation', [
    data.orderNumber,
    data.itemCount || '1 item',
    data.total,
    data.estimatedDelivery || '3-5 working days',
  ], brandId);
}

async function sendOrderShipped(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_shipped', [
    data.orderNumber,
    data.awbNumber || 'N/A',
    data.trackingUrl || `https://crosscoin.in/track/${data.orderNumber}`,
  ], brandId);
}

async function sendOutForDelivery(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_out_for_delivery', [
    data.orderNumber,
    data.courierName || 'Our courier partner',
  ], brandId);
}

async function sendOrderDelivered(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_delivered', [data.orderNumber], brandId);
}

async function sendOrderCancelled(phone, data, brandId = 1) {
  return sendTemplate(phone, 'order_cancelled', [
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
    data.orderNumber,
    data.amount,
    data.paymentMethod || 'Original Payment Method',
  ], brandId);
}

// ─── New ecommerce notification helpers ──────────────────────────────────────

async function sendAbandonedCart(phone, data, brandId = 1) {
  return sendTemplate(phone, 'cart_abandoned', [
    data.customerName || 'there',
    data.productName || 'your items',
    data.couponCode || 'SAVE10',
  ], brandId);
}

async function sendReviewRequest(phone, data, brandId = 1) {
  const storeUrl = (await settingsHelper.getSetting(brandId, 'STORE_URL')) || 'crosscoin.in';
  return sendTemplate(phone, 'review_request', [
    data.customerName || 'there',
    data.productName || 'your recent purchase',
    `https://${storeUrl}/product/${data.productSlug || ''}`,
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
  return sendTemplate(phone, 'popup_coupon', [data.couponCode || 'PREPAID10'], brandId);
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
  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'product',
        body: { text: 'Check out this product from Cross Coin 👇' },
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
        as: 'variations',
      },
    ],
  });

  let synced = 0, skipped = 0;
  const errors = [];

  for (const product of products) {
    for (const variation of (product.variations || [])) {
      try {
        // Skip if already synced
        if (variation.whatsapp_retailer_id) {
          skipped++;
          continue;
        }

        // Get product image
        const image = await ProductImage.findOne({ where: { productId: product.id } });
        const imageUrl = image?.imageUrl || null;

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
          url: `https://crosscoin.in/product/${product.slug}`,
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
  // Template management
  listTemplates,
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
};
