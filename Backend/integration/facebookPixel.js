const express = require("express");
const axios = require("axios");
const settingsHelper = require("../services/settingsHelper");

/**
 * Send a server-side event to Facebook Conversions API
 * @param {string} eventName - e.g. 'Purchase', 'InitiateCheckout', 'AddToCart'
 * @param {object} order - order object with brand_id, total_amount, items[], etc.
 * @param {object} extraData - optional overrides for event_source_url, custom_data, user_data
 */
async function sendFacebookEvent(eventName, order, extraData = {}) {
  const brandId = order.brand_id || 1;

  const FB_PIXEL_ID = await settingsHelper.getSetting(brandId, 'FB_PIXEL_ID', '1313610943804396');
  const FB_ACCESS_TOKEN = await settingsHelper.getSetting(brandId, 'FB_ACCESS_TOKEN');

  if (!FB_ACCESS_TOKEN || FB_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN') {
    console.log(`Facebook Pixel: Skipping ${eventName} — no valid access token`);
    return;
  }

  // Normalize items — support both { product_id, quantity } and { id, quantity }
  const items = (order.items || []).map(item => ({
    id: String(item.product_id || item.id || ''),
    quantity: item.quantity || 1,
  }));

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: extraData.event_source_url || `${process.env.FRONTEND_URL || 'https://crosscoin.in'}/ThankYou`,
    action_source: 'website',
    // event_id for deduplication with browser pixel
    event_id: order.order_number ? `${eventName}_${order.order_number}` : `${eventName}_${Date.now()}`,
    user_data: {
      client_ip_address: order.ip_address || null,
      client_user_agent: order.user_agent || null,
      // Hash email/phone if provided (Facebook requires SHA256)
      ...(extraData.user_data || {}),
    },
    custom_data: {
      value: parseFloat(order.total_amount || order.final_amount || 0),
      currency: order.currency || 'INR',
      order_id: order.order_number || '',
      contents: items,
      num_items: items.length,
      ...(extraData.custom_data || {}),
    },
  };

  // Remove null user_data fields — Facebook rejects them
  Object.keys(eventData.user_data).forEach(k => {
    if (eventData.user_data[k] === null || eventData.user_data[k] === undefined) {
      delete eventData.user_data[k];
    }
  });

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      { data: [eventData] }
    );
    console.log(`✅ Facebook Pixel: ${eventName} sent — events_received: ${response.data?.events_received}`);
  } catch (error) {
    console.error(`❌ Facebook Pixel ${eventName} error:`, error.response?.data || error.message);
  }
}

const router = express.Router();

router.post('/send-event', async (req, res) => {
  try {
    const { eventName, order, extraData } = req.body;
    await sendFacebookEvent(eventName, order, extraData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.sendFacebookEvent = sendFacebookEvent;
