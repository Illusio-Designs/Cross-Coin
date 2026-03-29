const axios = require('axios');
const { logger } = require('../config/logging.js');
const settingsHelper = require('./settingsHelper.js');

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

/**
 * Format a phone number to E.164 format for India (+91XXXXXXXXXX)
 */
function formatE164(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.startsWith('+')) return phone.replace(/\s/g, '');
  return `+${digits}`;
}

/**
 * Get WhatsApp credentials from brand settings (falls back to env vars)
 */
async function getCredentials(brandId = 1) {
  const [token, phoneNumberId, businessAccountId] = await Promise.all([
    settingsHelper.getSetting(brandId, 'WHATSAPP_API_TOKEN'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_PHONE_NUMBER_ID'),
    settingsHelper.getSetting(brandId, 'WHATSAPP_BUSINESS_ACCOUNT_ID'),
  ]);
  return { token, phoneNumberId, businessAccountId };
}

// ─── Template Management ──────────────────────────────────────────────────────

/**
 * List all templates for the business account
 */
async function listTemplates(brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  if (!token || !businessAccountId) throw new Error('WhatsApp credentials not configured');

  const res = await axios.get(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/**
 * Create a new message template
 * @param {object} template
 * @param {string} template.name         - snake_case name e.g. "order_confirmation"
 * @param {string} template.category     - MARKETING | UTILITY | AUTHENTICATION
 * @param {string} template.language     - e.g. "en"
 * @param {Array}  template.components   - header/body/footer/buttons components
 * @param {number} brandId
 */
async function createTemplate({ name, category = 'UTILITY', language = 'en', components }, brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  if (!token || !businessAccountId) throw new Error('WhatsApp credentials not configured');

  const res = await axios.post(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates`,
    { name, category, language, components },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

/**
 * Delete a template by name
 */
async function deleteTemplate(name, brandId = 1) {
  const { token, businessAccountId } = await getCredentials(brandId);
  if (!token || !businessAccountId) throw new Error('WhatsApp credentials not configured');

  const res = await axios.delete(
    `${GRAPH_API_URL}/${businessAccountId}/message_templates?name=${name}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/**
 * Seed all 4 required Cross Coin templates in one call.
 * Safe to call multiple times — Meta returns an error if name already exists,
 * which we catch and skip gracefully.
 */
async function seedDefaultTemplates(brandId = 1) {
  const [storeName, storeUrl] = await Promise.all([
    settingsHelper.getSetting(brandId, 'STORE_NAME', 'Cross Coin'),
    settingsHelper.getSetting(brandId, 'STORE_URL', 'crosscoin.in'),
  ]);
  const footer = `${storeName} - ${storeUrl}`;

  const templates = [
    // ── 1. Order Confirmation — {{1}} order_number {{2}} item_count {{3}} amount {{4}} delivery
    {
      name: 'order_confirmation',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Confirmed' },
        {
          type: 'BODY',
          text: 'Hi! Your ' + storeName + ' order #{{1}} has been placed successfully.\n\nItems: {{2}}\nTotal: Rs. {{3}}\nEstimated delivery: {{4}}\n\nWe will notify you once it ships. Thank you for shopping with us!',
          example: { body_text: [['CC-20240101-0001', '2', '699', '3-5 working days']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 2. Order Shipped — {{1}} order_number {{2}} awb {{3}} tracking_url
    {
      name: 'order_shipped',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Your order is on the way' },
        {
          type: 'BODY',
          text: 'Great news! Your ' + storeName + ' order #{{1}} has been shipped.\n\nAWB Number: {{2}}\nTrack your order: {{3}}\n\nExpect delivery in 2-5 business days.',
          example: { body_text: [['CC-20240101-0001', 'BD9812345678', 'https://crosscoin.in/track/CC-20240101-0001']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 3. Order Delivered — {{1}} order_number
    {
      name: 'order_delivered',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Delivered' },
        {
          type: 'BODY',
          text: 'Your ' + storeName + ' order #{{1}} has been delivered!\n\nWe hope you love your purchase. Your feedback means the world to us.\n\nHave an issue? Just reply to this message.',
          example: { body_text: [['CC-20240101-0001']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 4. Order Cancelled — {{1}} order_number {{2}} refund_info
    {
      name: 'order_cancelled',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Cancelled' },
        {
          type: 'BODY',
          text: 'Your ' + storeName + ' order #{{1}} has been cancelled.\n\nRefund info: {{2}}\n\nIf you have any questions, reply to this message or visit ' + storeUrl + '.',
          example: { body_text: [['CC-20240101-0001', 'Refund will be processed in 5-7 business days']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 5. Out for Delivery — {{1}} order_number {{2}} courier_name
    {
      name: 'order_out_for_delivery',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Out for Delivery' },
        {
          type: 'BODY',
          text: 'Your ' + storeName + ' order #{{1}} is out for delivery today!\n\nCourier: {{2}}\n\nPlease keep your phone handy and ensure someone is available to receive the package.',
          example: { body_text: [['CC-20240101-0001', 'BlueDart']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 6. COD Confirmation — {{1}} order_number {{2}} amount {{3}} address
    {
      name: 'cod_order_confirmation',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'COD Order Received' },
        {
          type: 'BODY',
          text: 'Hi! We received your Cash on Delivery order #{{1}} for Rs. {{2}} from ' + storeName + '.\n\nDelivery to: {{3}}\n\nPlease keep Rs. {{2}} ready at the time of delivery.',
          example: { body_text: [['CC-20240101-0001', '699', 'Surat, Gujarat 395006']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 7. Review Request — {{1}} customer_name {{2}} product_name {{3}} review_url
    {
      name: 'review_request',
      category: 'MARKETING',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'How was your order?' },
        {
          type: 'BODY',
          text: 'Hi {{1}}!\n\nWe hope you are loving your {{2}} from ' + storeName + '.\n\nA quick review takes just 30 seconds and helps thousands of shoppers. We would really appreciate it!\n\n{{3}}',
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks', 'https://crosscoin.in/review']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 8. Cart Abandoned — {{1}} customer_name {{2}} product_name {{3}} discount_code
    {
      name: 'cart_abandoned',
      category: 'MARKETING',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'You left something behind' },
        {
          type: 'BODY',
          text: 'Hey {{1}}!\n\nYour {{2}} is still waiting in your ' + storeName + ' cart.\n\nUse code {{3}} for an extra 10% OFF - but hurry, it expires in 24 hours!\n\nComplete your order now.',
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks Pack of 3', 'SAVE10']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 9. Refund Processed — {{1}} order_number {{2}} amount {{3}} payment_method
    {
      name: 'refund_processed',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Refund Processed' },
        {
          type: 'BODY',
          text: 'Good news! Your refund of Rs. {{2}} for ' + storeName + ' order #{{1}} has been processed.\n\nRefund to: {{3}}\nExpected credit: 5-7 working days\n\nThank you for your patience.',
          example: { body_text: [['CC-20240101-0001', '699', 'Original Payment Method']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    }
  ];

  const templates = [
    // ── 1. Order Confirmation ─────────────────────────────────────────────
    // Params: {{1}} order_number  {{2}} item_count  {{3}} final_amount  {{4}} estimated_delivery
    {
      name: 'order_confirmation',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🛍️ Order Confirmed!' },
        {
          type: 'BODY',
          text: `Hi! Your *${storeName}* order *#{{1}}* has been placed successfully. 🎉\n\n📦 Items: {{2}}\n💰 Total: ₹{{3}}\n🚚 Estimated delivery: {{4}}\n\nWe'll notify you once it ships. Thank you for shopping with us!`,
          example: { body_text: [['CC-20240101-0001', '2', '699', '3-5 working days']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 2. Order Shipped ──────────────────────────────────────────────────
    // Params: {{1}} order_number  {{2}} awb_number  {{3}} tracking_url
    {
      name: 'order_shipped',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🚚 Your order is on the way!' },
        {
          type: 'BODY',
          text: `Great news! Your *${storeName}* order *#{{1}}* has been shipped. 📦\n\n🏷️ AWB Number: *{{2}}*\n🔍 Track your order: {{3}}\n\nExpect delivery in 2–5 business days. Stay home!`,
          example: { body_text: [['CC-20240101-0001', 'BD9812345678', 'https://crosscoin.in/track/CC-20240101-0001']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 3. Order Delivered ────────────────────────────────────────────────
    // Params: {{1}} order_number
    {
      name: 'order_delivered',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '✅ Order Delivered!' },
        {
          type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* has been delivered! 🎉\n\nWe hope you love your purchase. Your feedback means the world to us — drop us a review!\n\nHave an issue? Just reply to this message.`,
          example: { body_text: [['CC-20240101-0001']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 4. Order Cancelled ────────────────────────────────────────────────
    // Params: {{1}} order_number  {{2}} refund_info
    {
      name: 'order_cancelled',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '❌ Order Cancelled' },
        {
          type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* has been cancelled.\n\n💳 Refund info: {{2}}\n\nIf you have any questions, reply to this message or visit ${storeUrl}.`,
          example: { body_text: [['CC-20240101-0001', 'Refund will be processed in 5-7 business days']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 5. Out for Delivery ───────────────────────────────────────────────
    // Params: {{1}} order_number  {{2}} courier_name
    {
      name: 'order_out_for_delivery',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '📦 Out for Delivery!' },
        {
          type: 'BODY',
          text: `Your *${storeName}* order *#{{1}}* is out for delivery today! 🚴\n\nCourier: *{{2}}*\n\nPlease keep your phone handy and ensure someone is available to receive the package.`,
          example: { body_text: [['CC-20240101-0001', 'BlueDart']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 6. COD Confirmation ───────────────────────────────────────────────
    // Params: {{1}} order_number  {{2}} final_amount  {{3}} full_address
    {
      name: 'cod_order_confirmation',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '💵 COD Order Received' },
        {
          type: 'BODY',
          text: `Hi! We received your Cash on Delivery order *#{{1}}* for *₹{{2}}* from *${storeName}*.\n\n📍 Delivery to: {{3}}\n\nPlease keep *₹{{2}}* ready at the time of delivery. Reply CANCEL within 2 hours to cancel.`,
          example: { body_text: [['CC-20240101-0001', '699', 'Surat, Gujarat - 395006']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 7. Review Request ─────────────────────────────────────────────────
    // Params: {{1}} customer_name  {{2}} product_name  {{3}} review_url
    {
      name: 'review_request',
      category: 'MARKETING',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '⭐ How was your order?' },
        {
          type: 'BODY',
          text: `Hi {{1}}! 👋\n\nWe hope you're loving your *{{2}}* from *${storeName}*.\n\nA quick review takes just 30 seconds and helps thousands of shoppers make better choices. We'd really appreciate it! 🙏\n\n👉 {{3}}`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks', 'https://crosscoin.in/review']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 8. Cart Abandoned ─────────────────────────────────────────────────
    // Params: {{1}} customer_name  {{2}} product_name  {{3}} discount_code
    {
      name: 'cart_abandoned',
      category: 'MARKETING',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '🛒 You left something behind!' },
        {
          type: 'BODY',
          text: `Hey {{1}}! 👀\n\nYour *{{2}}* is still waiting in your *${storeName}* cart.\n\nUse code *{{3}}* for an extra *10% OFF* — but hurry, it expires in 24 hours! ⏳\n\nComplete your order now 👇`,
          example: { body_text: [['Rushikesh', 'CrossCoin Ankle Socks (Pack of 3)', 'SAVE10']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    },

    // ── 9. Refund Processed ───────────────────────────────────────────────
    // Params: {{1}} order_number  {{2}} refund_amount  {{3}} payment_method
    {
      name: 'refund_processed',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: '💰 Refund Processed!' },
        {
          type: 'BODY',
          text: `Good news! Your refund of *₹{{2}}* for *${storeName}* order *#{{1}}* has been processed. ✅\n\nRefund to: *{{3}}*\nExpected credit: 5–7 working days\n\nThank you for your patience. We hope to serve you again!`,
          example: { body_text: [['CC-20240101-0001', '699', 'UPI / Original Payment Method']] }
        },
        { type: 'FOOTER', text: footer }
      ]
    }
  ];

  const results = [];
  for (const tpl of templates) {
    try {
      const res = await createTemplate(tpl, brandId);
      results.push({ name: tpl.name, status: 'created', id: res.id });
      logger.info(`WhatsApp template created: ${tpl.name}`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      // Already exists is fine
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        results.push({ name: tpl.name, status: 'already_exists' });
      } else {
        results.push({ name: tpl.name, status: 'error', error: msg });
        logger.error(`WhatsApp template error (${tpl.name}): ${msg}`);
      }
    }
  }
  return results;
}

/**
 * Send a WhatsApp template message via Meta Cloud API
 */
async function sendTemplate(phone, templateName, components = [], brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);

  if (!token || !phoneNumberId) {
    logger.warn('WhatsApp credentials not configured — skipping notification');
    return;
  }

  const formattedPhone = formatE164(phone);
  if (!formattedPhone) {
    logger.warn('WhatsApp: invalid phone number, skipping');
    return;
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components
    }
  };

  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

/**
 * Send a plain text message (for testing / free-form within 24h window)
 */
async function sendTextMessage(phone, text, brandId = 1) {
  const { token, phoneNumberId } = await getCredentials(brandId);

  if (!token || !phoneNumberId) {
    logger.warn('WhatsApp credentials not configured — skipping');
    return;
  }

  const formattedPhone = formatE164(phone);
  if (!formattedPhone) return;

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'text',
    text: { body: text }
  };

  const res = await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

/**
 * Test connection — sends a simple ping message
 */
async function testConnection(phone, brandId = 1) {
  return sendTextMessage(phone, '✅ WhatsApp integration is working for Cross Coin!', brandId);
}

/**
 * Order confirmation — {{1}} order_number  {{2}} item_count  {{3}} final_amount  {{4}} estimated_delivery
 */
async function sendOrderConfirmation(phone, { orderNumber, itemCount, total, estimatedDelivery }, brandId = 1) {
  return sendTemplate(phone, 'order_confirmation', [{
    type: 'body',
    parameters: [
      { type: 'text', text: String(orderNumber) },
      { type: 'text', text: String(itemCount) },
      { type: 'text', text: String(total) },
      { type: 'text', text: String(estimatedDelivery || '3-5 working days') }
    ]
  }], brandId);
}

/**
 * Order shipped — {{1}} order_number  {{2}} awb_number  {{3}} tracking_url
 */
async function sendOrderShipped(phone, { orderNumber, awbNumber, trackingUrl }, brandId = 1) {
  return sendTemplate(phone, 'order_shipped', [{
    type: 'body',
    parameters: [
      { type: 'text', text: String(orderNumber) },
      { type: 'text', text: String(awbNumber || 'N/A') },
      { type: 'text', text: String(trackingUrl || `https://crosscoin.in/track/${orderNumber}`) }
    ]
  }], brandId);
}

/**
 * Order delivered — {{1}} order_number
 */
async function sendOrderDelivered(phone, { orderNumber }, brandId = 1) {
  return sendTemplate(phone, 'order_delivered', [{
    type: 'body',
    parameters: [{ type: 'text', text: String(orderNumber) }]
  }], brandId);
}

/**
 * Order cancelled — {{1}} order_number  {{2}} refund_info
 */
async function sendOrderCancelled(phone, { orderNumber, refundInfo }, brandId = 1) {
  return sendTemplate(phone, 'order_cancelled', [{
    type: 'body',
    parameters: [
      { type: 'text', text: String(orderNumber) },
      { type: 'text', text: String(refundInfo || 'No refund applicable') }
    ]
  }], brandId);
}

/**
 * Out for delivery — {{1}} order_number  {{2}} courier_name
 */
async function sendOutForDelivery(phone, { orderNumber, courierName }, brandId = 1) {
  return sendTemplate(phone, 'order_out_for_delivery', [{
    type: 'body',
    parameters: [
      { type: 'text', text: String(orderNumber) },
      { type: 'text', text: String(courierName || 'Our courier partner') }
    ]
  }], brandId);
}

/**
 * COD confirmation — {{1}} order_number  {{2}} final_amount  {{3}} delivery_address
 */
async function sendCodConfirmation(phone, { orderNumber, amount, address }, brandId = 1) {
  return sendTemplate(phone, 'cod_order_confirmation', [{
    type: 'body',
    parameters: [
      { type: 'text', text: String(orderNumber) },
      { type: 'text', text: String(amount) },
      { type: 'text', text: String(address || 'your address') }
    ]
  }], brandId);
}

/**
 * Refund processed — {{1}} order_number  {{2}} refund_amount  {{3}} payment_method
 */
async function sendRefundProcessed(phone, { orderNumber, amount, paymentMethod }, brandId = 1) {
  return sendTemplate(phone, 'refund_processed', [{
    type: 'body',
    parameters: [
      { type: 'text', text: String(orderNumber) },
      { type: 'text', text: String(amount) },
      { type: 'text', text: String(paymentMethod || 'Original Payment Method') }
    ]
  }], brandId);
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
