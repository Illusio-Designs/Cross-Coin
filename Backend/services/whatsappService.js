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

// ─── Seed all 9 default Cross Coin templates ──────────────────────────────────
async function seedDefaultTemplates(brandId = 1) {
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl  = (await settingsHelper.getSetting(brandId, 'STORE_URL'))  || 'crosscoin.in';
  const footer    = `${storeName} - ${storeUrl}`;

  const templates = [
    {
      name: 'order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '✅ Order Confirmed!' },
        { type: 'BODY',
          text: `Hi there! Your order from *${storeName}* is confirmed.\n\n🧾 Order: *#{{1}}*\n📦 Items: {{2}}\n💰 Total: ₹{{3}}\n🚚 Estimated delivery: {{4}}\n\nWe're getting it ready for you. You'll receive a tracking update once it ships!`,
          example: { body_text: [['CC-20240101-0001', '2 items', '699', '3-5 working days']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_shipped', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '📦 Your Order Has Shipped!' },
        { type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* is on its way!\n\n🔖 AWB: {{2}}\n📍 Track live: {{3}}\n\nExpected delivery in 2-5 business days. We'll update you at every step.`,
          example: { body_text: [['CC-20240101-0001', 'BD9812345678', `https://${storeUrl}/OrderTracking?order=CC-20240101-0001`]] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_out_for_delivery', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🚛 Out for Delivery!' },
        { type: 'BODY',
          text: `Great news! Your *${storeName}* order *#{{1}}* is out for delivery today.\n\n🚚 Courier: {{2}}\n\nPlease keep your phone handy and ensure someone is available to receive the package.`,
          example: { body_text: [['CC-20240101-0001', 'BlueDart']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_delivered', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🎉 Order Delivered!' },
        { type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* has been delivered successfully!\n\nWe hope you love your purchase. If anything isn't right, just reply to this message — we're here to help.\n\nEnjoy! 🧦`,
          example: { body_text: [['CC-20240101-0001']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_cancelled', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Cancelled' },
        { type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* has been cancelled.\n\n💳 Refund: {{2}}\n\nWe're sorry to see this order go. If you have any questions, reply here or visit ${storeUrl}.\n\nHope to see you again soon!`,
          example: { body_text: [['CC-20240101-0001', 'Refund in 5-7 business days']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'cod_order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🧾 COD Order — Please Confirm' },
        { type: 'BODY',
          text: `Hi! We received your Cash on Delivery order from *${storeName}*.\n\n🧾 Order: *#{{1}}*\n💰 Amount: ₹{{2}}\n📍 Delivery to: {{3}}\n\n👉 *Please reply YES to confirm your address is correct.*\n\nIf anything is wrong, reply with the correct address and we'll update it before shipping.`,
          example: { body_text: [['CC-20240101-0001', '699', 'Rushikesh, 123 Main St, Surat, Gujarat 395006']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'refund_processed', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '💰 Refund Processed' },
        { type: 'BODY',
          text: `Your refund for *${storeName}* order *#{{1}}* has been processed.\n\n💳 Amount: ₹{{2}}\n🏦 Refund to: {{3}}\n⏳ Expected credit: 5-7 working days\n\nThank you for your patience. We hope to serve you again!`,
          example: { body_text: [['CC-20240101-0001', '699', 'Original Payment Method']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'review_request', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '⭐ How was your order?' },
        { type: 'BODY',
          text: `Hi {{1}}!\n\nWe hope you're loving your *{{2}}* from *${storeName}*.\n\nYour review helps other shoppers make great choices — it only takes 30 seconds!\n\n👉 {{3}}`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks', `https://${storeUrl}/review`]] } },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Write a Review', url: `https://${storeUrl}/review` }] },
      ],
    },
    {
      name: 'popup_coupon', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🎁 Your Exclusive Coupon' },
        { type: 'BODY',
          text: `Here's a special 10% OFF coupon just for you at *${storeName}*!\n\n🏷️ Code: *{{1}}*\n✅ Valid on prepaid orders only\n⏰ Limited time offer\n\nDon't miss out — shop now!`,
          example: { body_text: [['PREPAID10']] } },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Shop Now', url: `https://${storeUrl}` }] },
      ],
    },
    {
      name: 'cart_abandoned', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🛒 You Left Something Behind!' },
        { type: 'BODY',
          text: `Hey {{1}}!\n\nYour *{{2}}* is still waiting in your *${storeName}* cart.\n\n🏷️ Use code *{{3}}* for an extra 10% OFF — but hurry, it expires in 24 hours!\n\nComplete your purchase before it's gone.`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks Pack of 3', 'SAVE10']] } },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Complete Purchase', url: `https://${storeUrl}/cart` }] },
      ],
    },
  ];

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
  return sendTemplate(phone, 'cod_order_confirmation', [
    data.orderNumber,
    data.amount,
    data.fullAddress || data.address || 'your address',
  ], brandId);
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

module.exports = {
  formatE164,
  metaError,
  getCredentials,
  // Template management
  listTemplates,
  createTemplate,
  deleteTemplate,
  seedDefaultTemplates,
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
  // Media
  getMediaUrl,
  downloadMedia,
};
