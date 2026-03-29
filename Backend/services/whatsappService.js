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
  const templates = [
    {
      name: 'order_confirmation',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: '🛍️ Order Confirmed!'
        },
        {
          type: 'BODY',
          text: 'Hi! Your Cross Coin order *#{{1}}* has been placed successfully.\n\n📦 Items: {{2}}\n💰 Total: {{3}}\n🚚 Estimated delivery: {{4}}\n\nWe\'ll notify you once it ships. Thank you for shopping with us!'
        },
        {
          type: 'FOOTER',
          text: 'Cross Coin — crosscoin.in'
        }
      ]
    },
    {
      name: 'order_shipped',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: '🚚 Your order is on the way!'
        },
        {
          type: 'BODY',
          text: 'Great news! Order *#{{1}}* has been shipped.\n\n📬 AWB: {{2}}\n🔍 Track here: {{3}}\n\nExpect delivery in 2–5 business days.'
        },
        {
          type: 'FOOTER',
          text: 'Cross Coin — crosscoin.in'
        }
      ]
    },
    {
      name: 'order_delivered',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: '✅ Order Delivered!'
        },
        {
          type: 'BODY',
          text: 'Your Cross Coin order *#{{1}}* has been delivered! 🎉\n\nWe hope you love your purchase. Please share your experience — your feedback means a lot to us!'
        },
        {
          type: 'FOOTER',
          text: 'Cross Coin — crosscoin.in'
        }
      ]
    },
    {
      name: 'order_cancelled',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: '❌ Order Cancelled'
        },
        {
          type: 'BODY',
          text: 'Your Cross Coin order *#{{1}}* has been cancelled.\n\n💳 Refund info: {{2}}\n\nIf you have any questions, reply to this message or visit crosscoin.in.'
        },
        {
          type: 'FOOTER',
          text: 'Cross Coin — crosscoin.in'
        }
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
 * Order confirmation message
 */
async function sendOrderConfirmation(phone, { orderNumber, itemCount, total, estimatedDelivery }, brandId = 1) {
  return sendTemplate(phone, 'order_confirmation', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(orderNumber) },
        { type: 'text', text: String(itemCount) },
        { type: 'text', text: `₹${total}` },
        { type: 'text', text: String(estimatedDelivery || '5-7 business days') }
      ]
    }
  ], brandId);
}

/**
 * Shipping notification
 */
async function sendOrderShipped(phone, { orderNumber, awbNumber, trackingUrl }, brandId = 1) {
  return sendTemplate(phone, 'order_shipped', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(orderNumber) },
        { type: 'text', text: String(awbNumber || 'N/A') },
        { type: 'text', text: String(trackingUrl || 'Track via our website') }
      ]
    }
  ], brandId);
}

/**
 * Delivery confirmation
 */
async function sendOrderDelivered(phone, { orderNumber }, brandId = 1) {
  return sendTemplate(phone, 'order_delivered', [
    { type: 'body', parameters: [{ type: 'text', text: String(orderNumber) }] }
  ], brandId);
}

/**
 * Cancellation notification
 */
async function sendOrderCancelled(phone, { orderNumber, refundInfo }, brandId = 1) {
  return sendTemplate(phone, 'order_cancelled', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(orderNumber) },
        { type: 'text', text: String(refundInfo || 'No refund applicable') }
      ]
    }
  ], brandId);
}

module.exports = {
  formatE164,
  sendTextMessage,
  testConnection,
  sendOrderConfirmation,
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled,
  listTemplates,
  createTemplate,
  deleteTemplate,
  seedDefaultTemplates
};
