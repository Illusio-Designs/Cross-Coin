const axios = require('axios');
const settingsHelper = require('../services/settingsHelper');

/**
 * Send a server-side event to Google Analytics 4 Measurement Protocol
 * @param {string} eventName - GA4 event name e.g. 'purchase', 'add_to_cart'
 * @param {object} order - order object
 * @param {object} params - additional event params
 */
async function sendGAEvent(eventName, order, params = {}) {
  const brandId = order.brand_id;
  if (!brandId) return; // Never attribute an unscoped order to Crosscoin.

  const GA_MEASUREMENT_ID = await settingsHelper.getSetting(brandId, 'GA_MEASUREMENT_ID', null, { brandOnly: true });
  const GA_API_SECRET = await settingsHelper.getSetting(brandId, 'GA_API_SECRET', null, { brandOnly: true });

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

  // The shopper's GA4 session (from the _ga_<stream> cookie, sent with the
  // order): without it Measurement Protocol events join no visit, and GA4
  // reports the purchase under "(not set)" instead of the source that brought
  // the shopper. engagement_time_msec makes it count as an engaged event.
  const session = /^\d{6,20}$/.test(String(order.ga_session_id || ''))
    ? {
      session_id: String(order.ga_session_id),
      ...(order.ga_session_number ? { session_number: Number(order.ga_session_number) || undefined } : {}),
      engagement_time_msec: 1,
    }
    : {};

  const eventData = {
    client_id: clientId,
    // Logged-in shopper's account id (never an email/phone — GA forbids PII).
    ...(order.external_id && /^\d+$/.test(String(order.external_id)) ? { user_id: String(order.external_id) } : {}),
    events: [{
      name: eventName,
      params: {
        transaction_id: order.order_number || '',
        value: parseFloat(order.total_amount || order.final_amount || 0),
        currency: order.currency || 'INR',
        items,
        ...session,
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

// ── Admin check (Dashboard → Brands → store → Tracking → Check Google Analytics)
// Like the Meta pixel check: confirms the store's GA4 IDs are saved and
// well-formed, has Google validate a test event (Measurement Protocol
// validation server), then sends it for real with debug_mode so it shows in
// GA4 DebugView / Realtime as "tracking_test". Google's collect endpoint
// accepts any API secret silently, so seeing the event in DebugView is the
// final proof that the secret belongs to this stream.
const express = require('express');
const crypto = require('crypto');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware.js');
const router = express.Router();

router.post('/test', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const slug = String(req.headers['x-brand-name'] || '').trim().toLowerCase();
    const Brand = require('../model/brandModel.js');
    const brand = slug ? await Brand.findOne({ where: { slug }, attributes: ['id', 'slug'] }) : null;
    if (!brand) return res.status(400).json({ ok: false, message: 'Pick a store first.' });
    const mid = await settingsHelper.getSetting(brand.id, 'GA_MEASUREMENT_ID', null, { brandOnly: true });
    const secret = await settingsHelper.getSetting(brand.id, 'GA_API_SECRET', null, { brandOnly: true });
    if (!mid) return res.json({ ok: false, message: 'No GA4 Measurement ID saved for this store (GA_MEASUREMENT_ID) — Google gets nothing from the website.' });
    if (!/^G-[A-Z0-9]{4,}$/i.test(String(mid).trim())) return res.json({ ok: false, message: `The Measurement ID "${mid}" doesn't look right — it should look like G-XXXXXXXXXX (GA4 → Admin → Data streams → the web stream).` });
    if (!secret) return res.json({ ok: false, message: `${mid} is set, so the website sends browsing events — but there's no Measurement Protocol API secret (GA_API_SECRET), so purchases and refunds from the server can't be sent.` });

    const body = {
      client_id: `${crypto.randomInt(1e9, 2e9)}.${Math.floor(Date.now() / 1000)}`,
      events: [{ name: 'tracking_test', params: { debug_mode: 1, engagement_time_msec: 1, source: 'dashboard_check' } }],
    };
    const qs = `measurement_id=${encodeURIComponent(String(mid).trim())}&api_secret=${encodeURIComponent(secret)}`;
    const check = await axios.post(`https://www.google-analytics.com/debug/mp/collect?${qs}`, body, { timeout: 10000 });
    const problems = check.data?.validationMessages || [];
    if (problems.length) return res.json({ ok: false, message: `Google rejected the test event: ${problems[0].description || problems[0].validationCode}` });
    await axios.post(`https://www.google-analytics.com/mp/collect?${qs}`, body, { timeout: 10000 });
    return res.json({
      ok: true,
      measurementId: mid,
      message: `Google accepted a test event for ${mid}. In GA4 → Admin → DebugView (or Reports → Realtime) "tracking_test" should appear within a minute — that confirms the API secret belongs to this stream.`,
    });
  } catch (error) {
    return res.json({ ok: false, message: `Couldn't reach Google: ${[error.response?.status, error.message].filter(Boolean).join(' ')}` });
  }
});

module.exports = router;
module.exports.sendGAEvent = sendGAEvent;
