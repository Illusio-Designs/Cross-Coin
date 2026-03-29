const axios = require('axios');
const { logger } = require('../config/logging.js');
const settingsHelper = require('./settingsHelper.js');

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

function formatE164(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '+91' + digits.slice(1);
  if (digits.startsWith('+')) return phone.replace(/\s/g, '');
  return '+' + digits;
}

async function getCredentials(brandId) {
  if (!brandId) brandId = 1;
  const [token, phoneNumberId, businessAccountId] = await Promise.all([
    settingsHelper.getSetting(brandId, 'WHATSAPP_API_TOKEN'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_PHONE_NUMBER_ID'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_BUSINESS_ACCOUNT_ID'),
  ]);
  return { token, phoneNumberId, businessAccountId };
}

async function listTemplates(brandId) {
  if (!brandId) brandId = 1;
  const { token, businessAccountId } = await getCredentials(brandId);
  if (!token || !businessAccountId) throw new Error('WhatsApp credentials not configured');
  const res = await axios.get(
    GRAPH_API_URL + '/' + businessAccountId + '/message_templates?limit=50',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  return res.data;
}

async function createTemplate(tplData, brandId) {
  if (!brandId) brandId = 1;
  const name = tplData.name;
  const category = tplData.category || 'UTILITY';
  const language = tplData.language || 'en';
  const components = tplData.components;
  const { token, businessAccountId } = await getCredentials(brandId);
  if (!token || !businessAccountId) throw new Error('WhatsApp credentials not configured');
  const res = await axios.post(
    GRAPH_API_URL + '/' + businessAccountId + '/message_templates',
    { name: name, category: category, language: language, components: components },
    { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

async function deleteTemplate(name, brandId) {
  if (!brandId) brandId = 1;
  const { token, businessAccountId } = await getCredentials(brandId);
  if (!token || !businessAccountId) throw new Error('WhatsApp credentials not configured');
  const res = await axios.delete(
    GRAPH_API_URL + '/' + businessAccountId + '/message_templates?name=' + name,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  return res.data;
}


async function seedDefaultTemplates(brandId) {
  if (!brandId) brandId = 1;
  const storeName = (await settingsHelper.getSetting(brandId, 'STORE_NAME')) || 'Cross Coin';
  const storeUrl = (await settingsHelper.getSetting(brandId, 'STORE_URL')) || 'crosscoin.in';
  const footer = storeName + ' - ' + storeUrl;

  const tpls = [
    {
      name: 'order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Confirmed' },
        { type: 'BODY',
          text: 'Hi! Your ' + storeName + ' order #{{1}} has been placed successfully.\n\nItems: {{2}}\nTotal: Rs. {{3}}\nEstimated delivery: {{4}}\n\nWe will notify you once it ships. Thank you for shopping with us!',
          example: { body_text: [['CC-20240101-0001', '2', '699', '3-5 working days']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'order_shipped', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Your order is on the way' },
        { type: 'BODY',
          text: 'Great news! Your ' + storeName + ' order #{{1}} has been shipped.\n\nAWB Number: {{2}}\nTrack your order: {{3}}\n\nExpect delivery in 2-5 business days.',
          example: { body_text: [['CC-20240101-0001', 'BD9812345678', 'https://crosscoin.in/track/CC-20240101-0001']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'order_delivered', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Delivered' },
        { type: 'BODY',
          text: 'Your ' + storeName + ' order #{{1}} has been delivered!\n\nWe hope you love your purchase. Your feedback means the world to us.\n\nHave an issue? Just reply to this message.',
          example: { body_text: [['CC-20240101-0001']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'order_cancelled', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Cancelled' },
        { type: 'BODY',
          text: 'Your ' + storeName + ' order #{{1}} has been cancelled.\n\nRefund info: {{2}}\n\nIf you have any questions, reply to this message or visit ' + storeUrl + '.',
          example: { body_text: [['CC-20240101-0001', 'Refund will be processed in 5-7 business days']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'order_out_for_delivery', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Out for Delivery' },
        { type: 'BODY',
          text: 'Your ' + storeName + ' order #{{1}} is out for delivery today!\n\nCourier: {{2}}\n\nPlease keep your phone handy and ensure someone is available to receive the package.',
          example: { body_text: [['CC-20240101-0001', 'BlueDart']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'cod_order_confirmation', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'COD Order Received' },
        { type: 'BODY',
          text: 'Hi! We received your Cash on Delivery order #{{1}} for Rs. {{2}} from ' + storeName + '.\n\nDelivery to: {{3}}\n\nPlease keep Rs. {{2}} ready at the time of delivery.',
          example: { body_text: [['CC-20240101-0001', '699', 'Surat, Gujarat 395006']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'review_request', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'How was your order?' },
        { type: 'BODY',
          text: 'Hi {{1}}!\n\nWe hope you are loving your {{2}} from ' + storeName + '.\n\nA quick review takes just 30 seconds and helps thousands of shoppers. We would really appreciate it!\n\n{{3}}',
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks', 'https://crosscoin.in/review']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'cart_abandoned', category: 'MARKETING', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'You left something behind' },
        { type: 'BODY',
          text: 'Hey {{1}}!\n\nYour {{2}} is still waiting in your ' + storeName + ' cart.\n\nUse code {{3}} for an extra 10% OFF - but hurry, it expires in 24 hours!\n\nComplete your order now.',
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks Pack of 3', 'SAVE10']] } },
        { type: 'FOOTER', text: footer }
      ]
    },
    {
      name: 'refund_processed', category: 'UTILITY', language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Refund Processed' },
        { type: 'BODY',
          text: 'Good news! Your refund of Rs. {{2}} for ' + storeName + ' order #{{1}} has been processed.\n\nRefund to: {{3}}\nExpected credit: 5-7 working days\n\nThank you for your patience.',
          example: { body_text: [['CC-20240101-0001', '699', 'Original Payment Method']] } },
        { type: 'FOOTER', text: footer }
      ]
    }
  ];

  const results = [];
  for (const tpl of tpls) {
    try {
      const res = await createTemplate(tpl, brandId);
      results.push({ name: tpl.name, status: 'created', id: res.id });
      logger.info('WhatsApp template created: ' + tpl.name);
    } catch (err) {
      const msg = (err.response && err.response.data && err.response.data.error && err.response.data.error.message) || err.message;
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        results.push({ name: tpl.name, status: 'already_exists' });
      } else {
        results.push({ name: tpl.name, status: 'error', error: msg });
        logger.error('WhatsApp template error (' + tpl.name + '): ' + msg);
      }
    }
  }
  return results;
}

async function sendTemplate(phone, templateName, components, brandId) {
  if (!components) components = [];
  if (!brandId) brandId = 1;
  const { token, phoneNumberId } = await getCredentials(brandId);
  if (!token || !phoneNumberId) { logger.warn('WhatsApp credentials not configured'); return; }
  const formattedPhone = formatE164(phone);
  if (!formattedPhone) { logger.warn('WhatsApp: invalid phone number'); return; }
  const res = await axios.post(
    GRAPH_API_URL + '/' + phoneNumberId + '/messages',
    { messaging_product: 'whatsapp', to: formattedPhone, type: 'template', template: { name: templateName, language: { code: 'en' }, components: components } },
    { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

async function sendTextMessage(phone, text, brandId) {
  if (!brandId) brandId = 1;
  const { token, phoneNumberId } = await getCredentials(brandId);
  if (!token || !phoneNumberId) { logger.warn('WhatsApp credentials not configured'); return; }
  const formattedPhone = formatE164(phone);
  if (!formattedPhone) return;
  const res = await axios.post(
    GRAPH_API_URL + '/' + phoneNumberId + '/messages',
    { messaging_product: 'whatsapp', to: formattedPhone, type: 'text', text: { body: text } },
    { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

async function testConnection(phone, brandId) {
  if (!brandId) brandId = 1;
  return sendTextMessage(phone, 'WhatsApp integration is working for Cross Coin!', brandId);
}

async function sendOrderConfirmation(phone, data, brandId) {
  if (!brandId) brandId = 1;
  return sendTemplate(phone, 'order_confirmation', [{ type: 'body', parameters: [
    { type: 'text', text: String(data.orderNumber) },
    { type: 'text', text: String(data.itemCount) },
    { type: 'text', text: String(data.total) },
    { type: 'text', text: String(data.estimatedDelivery || '3-5 working days') }
  ]}], brandId);
}

async function sendOrderShipped(phone, data, brandId) {
  if (!brandId) brandId = 1;
  return sendTemplate(phone, 'order_shipped', [{ type: 'body', parameters: [
    { type: 'text', text: String(data.orderNumber) },
    { type: 'text', text: String(data.awbNumber || 'N/A') },
    { type: 'text', text: String(data.trackingUrl || 'https://crosscoin.in/track/' + data.orderNumber) }
  ]}], brandId);
}

async function sendOrderDelivered(phone, data, brandId) {
  if (!brandId) brandId = 1;
  return sendTemplate(phone, 'order_delivered', [{ type: 'body', parameters: [
    { type: 'text', text: String(data.orderNumber) }
  ]}], brandId);
}

async function sendOrderCancelled(phone, data, brandId) {
  if (!brandId) brandId = 1;
  return sendTemplate(phone, 'order_cancelled', [{ type: 'body', parameters: [
    { type: 'text', text: String(data.orderNumber) },
    { type: 'text', text: String(data.refundInfo || 'No refund applicable') }
  ]}], brandId);
}

async function sendOutForDelivery(phone, data, brandId) {
  if (!brandId) brandId = 1;
  return sendTemplate(phone, 'order_out_for_delivery', [{ type: 'body', parameters: [
    { type: 'text', text: String(data.orderNumber) },
    { type: 'text', text: String(data.courierName || 'Our courier partner') }
  ]}], brandId);
}

async function sendCodConfirmation(phone, data, brandId) {
  if (!brandId) brandId = 1;
  return sendTemplate(phone, 'cod_order_confirmation', [{ type: 'body', parameters: [
    { type: 'text', text: String(data.orderNumber) },
    { type: 'text', text: String(data.amount) },
    { type: 'text', text: String(data.address || 'your address') }
  ]}], brandId);
}

async function sendRefundProcessed(phone, data, brandId) {
  if (!brandId) brandId = 1;
  return sendTemplate(phone, 'refund_processed', [{ type: 'body', parameters: [
    { type: 'text', text: String(data.orderNumber) },
    { type: 'text', text: String(data.amount) },
    { type: 'text', text: String(data.paymentMethod || 'Original Payment Method') }
  ]}], brandId);
}

module.exports = {
  formatE164,
  sendTextMessage,
  testConnection,
  sendOrderConfirmation,
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled,
  sendOutForDelivery,
  sendCodConfirmation,
  sendRefundProcessed,
  listTemplates,
  createTemplate,
  deleteTemplate,
  seedDefaultTemplates
};
