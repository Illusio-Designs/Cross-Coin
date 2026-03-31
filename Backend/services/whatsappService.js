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
async function getCredentials(brandId = 1) {
  const [token, phoneNumberId, businessAccountId] = await Promise.all([
    settingsHelper.getSetting(brandId, 'WHATSAPP_API_TOKEN'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_PHONE_NUMBER_ID'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_BUSINESS_ACCOUNT_ID'),
  ]);

  if (!token)               throw new Error('WHATSAPP_API_TOKEN not configured for brand ' + brandId);
  if (!phoneNumberId)       throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured for brand ' + brandId);
  if (!businessAccountId)   throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID not configured for brand ' + brandId);

  return { token, phoneNumberId, businessAccountId };
}

function authHeader(token) {
  return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
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
        { type: 'HEADER', format: 'TEXT', text: 'Order Confirmed ✅' },
        { type: 'BODY',
          text: `Hi! Your *${storeName}* order *#{{1}}* has been placed successfully.\n\nItems: {{2}}\nTotal: Rs. {{3}}\nEstimated delivery: {{4}}\n\nWe will notify you once it ships. Thank you for shopping with us!`,
          example: { body_text: [['CC-20240101-0001', '2 items', '699', '3-5 working days']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_shipped', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Your order is on the way 🚚' },
        { type: 'BODY',
          text: `Great news! Your *${storeName}* order *#{{1}}* has been shipped.\n\nAWB Number: {{2}}\nTrack your order: {{3}}\n\nExpect delivery in 2-5 business days.`,
          example: { body_text: [['CC-20240101-0001', 'BD9812345678', `https://${storeUrl}/track/CC-20240101-0001`]] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_out_for_delivery', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Out for Delivery 📦' },
        { type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* is out for delivery today!\n\nCourier: {{2}}\n\nPlease keep your phone handy.`,
          example: { body_text: [['CC-20240101-0001', 'BlueDart']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_delivered', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Delivered 🎉' },
        { type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* has been delivered!\n\nWe hope you love your purchase. Have an issue? Just reply to this message.`,
          example: { body_text: [['CC-20240101-0001']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'order_cancelled', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Cancelled' },
        { type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* has been cancelled.\n\nRefund info: {{2}}\n\nQuestions? Reply to this message or visit ${storeUrl}.`,
          example: { body_text: [['CC-20240101-0001', 'Refund in 5-7 business days']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'cod_order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'COD Order Received 💵' },
        { type: 'BODY',
          text: `Hi! We received your Cash on Delivery order *#{{1}}* for Rs. {{2}} from *${storeName}*.\n\nDelivery to: {{3}}\n\nPlease keep Rs. {{2}} ready at the time of delivery.`,
          example: { body_text: [['CC-20240101-0001', '699', 'Surat, Gujarat 395006']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'refund_processed', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Refund Processed ✅' },
        { type: 'BODY',
          text: `Good news! Your refund of Rs. {{2}} for *${storeName}* order *#{{1}}* has been processed.\n\nRefund to: {{3}}\nExpected credit: 5-7 working days.\n\nThank you for your patience.`,
          example: { body_text: [['CC-20240101-0001', '699', 'Original Payment Method']] } },
        { type: 'FOOTER', text: footer },
      ],
    },
    {
      name: 'review_request', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'How was your order? ⭐' },
        { type: 'BODY',
          text: `Hi {{1}}!\n\nWe hope you are loving your {{2}} from *${storeName}*.\n\nA quick review takes just 30 seconds and helps thousands of shoppers!\n\n{{3}}`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks', `https://${storeUrl}/review`]] } },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Write a Review', url: `https://${storeUrl}/review` }] },
      ],
    },
    {
      name: 'cart_abandoned', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'You left something behind 🛒' },
        { type: 'BODY',
          text: `Hey {{1}}!\n\nYour {{2}} is still waiting in your *${storeName}* cart.\n\nUse code *{{3}}* for an extra 10% OFF — hurry, expires in 24 hours!`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks Pack of 3', 'SAVE10']] } },
        { type: 'FOOTER', text: footer },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Complete Purchase', url: `https://${storeUrl}/cart` }] },
      ],
    },
  ];

  const results = [];
  for (const tpl of templates) {
    try {
      const res = await createTemplate(tpl, brandId);
      results.push({ name: tpl.name, status: 'created', id: res.id });
      logger.info(`WhatsApp template created: ${tpl.name}`);
    } catch (err) {
      const msg = metaError(err);
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
        results.push({ name: tpl.name, status: 'already_exists' });
      } else {
        results.push({ name: tpl.name, status: 'error', error: msg });
        logger.error(`WhatsApp template error (${tpl.name}): ${msg}`);
      }
    }
  }
  return results;
}

// ─── Send messages ────────────────────────────────────────────────────────────

async function sendTextMessage(phone, text, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
    { headers: authHeader(token) }
  );
  return res.data;
}

// sendTemplate — components must use uppercase type ('BODY', 'HEADER', etc.)
async function sendTemplate(phone, templateName, bodyParams, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);
  const to = formatE164(phone);
  if (!to) throw new Error('Invalid phone number: ' + phone);

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
    data.address || 'your address',
  ], brandId);
}

async function sendRefundProcessed(phone, data, brandId = 1) {
  return sendTemplate(phone, 'refund_processed', [
    data.orderNumber,
    data.amount,
    data.paymentMethod || 'Original Payment Method',
  ], brandId);
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
};
