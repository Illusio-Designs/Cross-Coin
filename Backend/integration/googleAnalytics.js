const axios = require('axios');
const settingsHelper = require('../services/settingsHelper');

/**
 * Send a server-side event to Google Analytics 4 Measurement Protocol
 * @param {string} eventName - GA4 event name e.g. 'purchase', 'add_to_cart'
 * @param {object} order - order object
 * @param {object} params - additional event params
 */
async function sendGAEvent(eventName, order, params = {}) {
  const brandId = order.brand_id || 1;

  const GA_MEASUREMENT_ID = await settingsHelper.getSetting(brandId, 'GA_MEASUREMENT_ID');
  const GA_API_SECRET = await settingsHelper.getSetting(brandId, 'GA_API_SECRET');

  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) {
    console.log(`Google Analytics: Skipping ${eventName} — GA_MEASUREMENT_ID or GA_API_SECRET not configured`);
    return;
  }

  // GA4 requires a client_id — use order_number as a stable fallback when browser client_id isn't available
  const clientId = order.ga_client_id || order.client_id || `server_${order.order_number || Date.now()}`;

  const items = (order.items || []).map(item => ({
    item_id: String(item.product_id || item.id || ''),
    item_name: item.name || item.item_name || item.product_name || '',
    quantity: item.quantity || 1,
    price: parseFloat(item.price || item.unit_price || 0),
  }));

  if (items.some(i => !i.item_name)) {
    console.warn(`⚠️ Google Analytics: Some items missing item_name for order ${order.order_number}`, items);
  }

  const eventData = {
    client_id: clientId,
    events: [{
      name: eventName,
      params: {
        transaction_id: order.order_number || '',
        value: parseFloat(order.total_amount || order.final_amount || 0),
        currency: order.currency || 'INR',
        items,
        ...params,
      },
    }],
  };

  try {
    await axios.post(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
      eventData
    );
    console.log(`✅ Google Analytics: ${eventName} sent for order ${order.order_number}`);
  } catch (error) {
    console.error(`❌ Google Analytics ${eventName} error:`, error.response?.data || error.message);
  }
}

module.exports.sendGAEvent = sendGAEvent;
