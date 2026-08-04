const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const settingsHelper = require("../services/settingsHelper");
const Brand = require("../model/brandModel.js");

/**
 * SHA256 hash a string (lowercase trimmed) — required by Facebook for PII fields
 */
function sha256(value) {
  if (!value) return undefined;
  return crypto.createHash("sha256").update(String(value).toLowerCase().trim()).digest("hex");
}

/** Normalise an Indian phone to E.164 digits (country code, no symbols). */
function normalizePhone(value) {
  if (!value) return undefined;
  let p = String(value).replace(/\D/g, "");
  if (p.length === 10) p = "91" + p;
  return p || undefined;
}

/** Resolve the brand id from the X-Brand-Name header (defaults to 1 = Crosscoin). */
async function resolveBrandId(req) {
  const slug = (req.headers["x-brand-name"] || "").toLowerCase();
  if (!slug) return 1;
  try {
    const b = await Brand.findOne({ where: { slug } });
    return b ? b.id : 1;
  } catch {
    return 1;
  }
}

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

  // Build hashed user_data — hash all PII fields as required by Facebook
  const userData = {
    client_ip_address: order.ip_address || null,
    client_user_agent: order.user_agent || null,
    // Hashed PII
    em: sha256(order.email),
    ph: sha256(order.phone),
    fn: sha256(order.first_name),
    ln: sha256(order.last_name),
    // Address fields — hashed
    zp: sha256(order.zip_code),
    ct: sha256(order.city),
    st: sha256(order.state),
    country: sha256(order.country || 'in'),
    // Click ID (fbc) — not hashed
    fbc: order.fbc || null,
    fbp: order.fbp || null,
    // Allow caller overrides
    ...(extraData.user_data || {}),
  };

  // Remove null/undefined fields — Facebook rejects them
  Object.keys(userData).forEach(k => {
    if (userData[k] === null || userData[k] === undefined) {
      delete userData[k];
    }
  });

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: extraData.event_source_url || `${process.env.FRONTEND_URL || 'https://crosscoin.in'}/ThankYou`,
    action_source: 'website',
    event_id: order.order_number ? `${eventName}_${order.order_number}` : `${eventName}_${Date.now()}`,
    user_data: userData,
    custom_data: {
      value: parseFloat(order.total_amount || order.final_amount || 0),
      currency: order.currency || 'INR',
      order_id: order.order_number || '',
      contents: items,
      num_items: items.length,
      ...(extraData.custom_data || {}),
    },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      { data: [eventData] }
    );
    console.log(`✅ Facebook Pixel: ${eventName} sent — events_received: ${response.data?.events_received}`);
  } catch (error) {
    console.error(`❌ Facebook Pixel ${eventName} error:`, error.response?.data || error.message);
  }
}

/**
 * Relay a browser pixel event to the Conversions API using the SAME event_id
 * the browser used, so Meta deduplicates the pair. This lifts CAPI coverage to
 * ~1:1 with the pixel for funnel events that previously had no server-side
 * counterpart (ViewContent, AddToCart, InitiateCheckout, Search). The server
 * enriches the event with the real client IP + user agent, the _fbp / _fbc
 * cookies, and any signed-in-user PII the browser forwards (hashed here).
 *
 * @param {object} req  - the Express request (for IP / UA / brand header)
 * @param {object} body - { event_name, event_id, event_source_url, custom_data, user_data, fbp, fbc }
 */
async function sendBrowserPixelEvent(req, body = {}) {
  const brandId = await resolveBrandId(req);
  const FB_PIXEL_ID = await settingsHelper.getSetting(brandId, 'FB_PIXEL_ID', '1313610943804396');
  const FB_ACCESS_TOKEN = await settingsHelper.getSetting(brandId, 'FB_ACCESS_TOKEN');

  if (!FB_ACCESS_TOKEN || FB_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN') {
    return { skipped: true, reason: 'no access token' };
  }

  const { event_name, event_id, event_source_url, custom_data = {}, user_data = {}, fbp, fbc } = body;
  if (!event_name || !event_id) return { skipped: true, reason: 'missing event_name/event_id' };

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || req.connection?.remoteAddress || null;
  const ua = req.headers['user-agent'] || null;

  const userData = {
    client_ip_address: ip,
    client_user_agent: ua,
    em: sha256(user_data.em || user_data.email),
    ph: sha256(normalizePhone(user_data.ph || user_data.phone)),
    fn: sha256(user_data.fn || user_data.first_name),
    ln: sha256(user_data.ln || user_data.last_name),
    external_id: user_data.external_id ? sha256(user_data.external_id) : undefined,
    fbp: fbp || null,
    fbc: fbc || null,
  };
  Object.keys(userData).forEach((k) => (userData[k] == null) && delete userData[k]);

  const eventData = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: event_source_url || undefined,
    action_source: 'website',
    event_id: String(event_id),
    user_data: userData,
    custom_data,
  };

  const response = await axios.post(
    `https://graph.facebook.com/v22.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
    { data: [eventData] }
  );
  return { events_received: response.data?.events_received };
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

// Browser → CAPI relay. Always answers 200 so a tracking hiccup never surfaces
// as an error in the storefront (analytics must never break the shopping flow).
router.post('/track', async (req, res) => {
  try {
    const result = await sendBrowserPixelEvent(req, req.body);
    res.json({ success: !result?.skipped, ...result });
  } catch (error) {
    console.error('❌ Facebook Pixel relay error:', error.response?.data || error.message);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.sendFacebookEvent = sendFacebookEvent;
module.exports.sendBrowserPixelEvent = sendBrowserPixelEvent;
