const axios = require('axios');
const { logger } = require('../config/logging.js');

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
 * Send a WhatsApp template message via Meta Cloud API
 */
async function sendTemplate(phone, templateName, components = []) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    logger.warn('WhatsApp env vars not configured — skipping notification');
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

  await axios.post(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
}

/**
 * Order confirmation message
 */
async function sendOrderConfirmation(phone, { orderNumber, itemCount, total, estimatedDelivery }) {
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
  ]);
}

/**
 * Shipping notification
 */
async function sendOrderShipped(phone, { orderNumber, awbNumber, trackingUrl }) {
  return sendTemplate(phone, 'order_shipped', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(orderNumber) },
        { type: 'text', text: String(awbNumber || 'N/A') },
        { type: 'text', text: String(trackingUrl || 'Track via our website') }
      ]
    }
  ]);
}

/**
 * Delivery confirmation
 */
async function sendOrderDelivered(phone, { orderNumber }) {
  return sendTemplate(phone, 'order_delivered', [
    { type: 'body', parameters: [{ type: 'text', text: String(orderNumber) }] }
  ]);
}

/**
 * Cancellation notification
 */
async function sendOrderCancelled(phone, { orderNumber, refundInfo }) {
  return sendTemplate(phone, 'order_cancelled', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(orderNumber) },
        { type: 'text', text: String(refundInfo || 'No refund applicable') }
      ]
    }
  ]);
}

/**
 * Send a plain text message (for testing / free-form within 24h window)
 */
async function sendTextMessage(phone, text) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    logger.warn('WhatsApp env vars not configured — skipping');
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
async function testConnection(phone) {
  return sendTextMessage(phone, '✅ WhatsApp integration is working for Cross Coin!');
}

module.exports = {
  formatE164,
  sendTextMessage,
  testConnection,
  sendOrderConfirmation,
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled
};
