const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const settingsHelper = require("../services/settingsHelper");
const Brand = require("../model/brandModel.js");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware.js");

/**
 * SHA256 hash a string (lowercase trimmed) — required by Facebook for PII fields
 */
function sha256(value) {
  if (!value) return undefined;
  return crypto.createHash("sha256").update(String(value).toLowerCase().trim()).digest("hex");
}

/**
 * Hash for Meta matching, unless it already is a SHA-256 hex string (the
 * storefront sends some values pre-hashed — a remembered buyer's email/phone,
 * the anonymous visitor id), so the browser and server copies carry the SAME
 * value instead of the server hashing a hash.
 */
const HEX64 = /^[a-f0-9]{64}$/i;
function hashed(value, normalize = (v) => v) {
  if (!value) return undefined;
  const v = String(value).trim();
  if (HEX64.test(v)) return v.toLowerCase();
  const n = normalize(v);
  return n ? sha256(n) : undefined;
}

/** Normalise an Indian phone to E.164 digits (country code, no symbols). */
function normalizePhone(value) {
  if (!value) return undefined;
  let p = String(value).replace(/\D/g, "");
  if (p.length === 10) p = "91" + p;
  return p || undefined;
}

/**
 * The page a server-side Purchase reports as its source: the store's own
 * thank-you page (https://<store domain>/order-confirmation; every storefront
 * has it), so Meta ties the conversion to that store's domain instead of one
 * shared address.
 */
async function thankYouUrl(brandId) {
  try {
    const domain = await require('../services/whatsappService.js').getBrandDomain(brandId);
    if (domain) return `https://${domain}/order-confirmation`;
  } catch (_) { /* fall through */ }
  return `${process.env.FRONTEND_URL || 'https://crosscoin.in'}/order-confirmation`;
}

/**
 * Resolve the brand id from the X-Brand-Name header. No header or an unknown
 * store gives null — never Crosscoin — so one store's events can't land on
 * another store's pixel.
 */
async function resolveBrandId(req) {
  const slug = String(req.headers["x-brand-name"] || "").trim().toLowerCase();
  if (!slug) return null;
  try {
    const b = await Brand.findOne({ where: { slug } });
    return b ? b.id : null;
  } catch {
    return null;
  }
}

/**
 * Send a server-side event to Facebook Conversions API
 * @param {string} eventName - e.g. 'Purchase', 'InitiateCheckout', 'AddToCart'
 * @param {object} order - order object with brand_id, total_amount, items[], etc.
 * @param {object} extraData - optional overrides for event_source_url, custom_data, user_data
 */
/**
 * Did this shopper allow marketing cookies? Shopify's Meta app sends
 * server-side events only with that consent, and so do we. The storefront
 * sends its answer with the order (marketing_consent). Without one, the latest
 * consent record we logged for the shopper (user id or session cookie)
 * decides; no record means no.
 */
// Stores with no cookie banner track every visitor, so every order counts as
// consented — including Shiprocket checkout orders that arrive by webhook with
// no consent record (there is no banner to create one).
const TRACKS_EVERYONE = new Set(['morbix', 'soxbae', 'crosscoin']);
const brandSlugCache = new Map();
async function brandSlug(brandId) {
  const id = Number(brandId) || 1;
  if (!brandSlugCache.has(id)) {
    try {
      const b = await Brand.findByPk(id, { attributes: ['slug'] });
      brandSlugCache.set(id, String(b?.slug || '').toLowerCase());
    } catch {
      return '';
    }
  }
  return brandSlugCache.get(id);
}
async function brandTracksEveryone(brandId) {
  return TRACKS_EVERYONE.has(await brandSlug(brandId));
}


async function hasMarketingConsent(order) {
  if (order.marketing_consent === true || order.marketing_consent === 'true') return true;
  if (await brandTracksEveryone(order.brand_id)) return true;
  if (order.marketing_consent === false || order.marketing_consent === 'false') return false;
  const userId = order.external_id || order.user_id || null;
  const sessionId = order.consent_session_id || null;
  if (!userId && !sessionId) return false;
  try {
    const { Op } = require("sequelize");
    const { ConsentLog } = require("../model/consentLogModel.js");
    const who = [];
    if (userId) who.push({ user_id: userId });
    if (sessionId) who.push({ session_id: sessionId });
    const row = await ConsentLog.findOne({
      where: { [Op.or]: who }, order: [["created_at", "DESC"]], attributes: ["marketing"],
    });
    return !!row?.marketing;
  } catch {
    return false;
  }
}

// external_id for Meta: the account id (hashed) and the anonymous visitor id
// (already a hash) — one value, an array of both, or undefined.
function externalIds(accountId, visitorId) {
  const ids = [accountId != null && accountId !== '' ? hashed(String(accountId)) : undefined, hashed(visitorId)]
    .filter(Boolean);
  if (!ids.length) return undefined;
  return ids.length === 1 ? ids[0] : [...new Set(ids)];
}

/** The buyer's email / phone hashed as Meta wants them — for the thank-you
 *  page, so the browser Purchase carries the same match keys as the server's. */
function buyerMatchKeys(order) {
  const out = {};
  const em = hashed(order?.email); if (em) out.em = em;
  const ph = hashed(order?.phone, normalizePhone); if (ph) out.ph = ph;
  return out;
}

async function sendFacebookEvent(eventName, order, extraData = {}) {
  const brandId = order.brand_id;
  // Never send a store-less event to Crosscoin's (or any other) pixel.
  if (!brandId) return { skipped: true, reason: 'no brand' };

  if (!(await hasMarketingConsent(order))) {
    console.log(`Facebook Pixel: Skipping ${eventName} for ${order.order_number || 'event'} — no marketing consent`);
    return { skipped: true, reason: 'no marketing consent' };
  }

  // Use THIS brand's own pixel id + token from brand_settings. Never fall back
  // to another brand's pixel — posting one brand's conversions to another's
  // pixel corrupts BOTH Ads accounts (the brand under-counts, the other gets
  // phantom conversions). Fail closed: if the brand has no pixel id, skip.
  const FB_PIXEL_ID = await settingsHelper.getSetting(brandId, 'FB_PIXEL_ID');
  const FB_ACCESS_TOKEN = await settingsHelper.getSetting(brandId, 'FB_ACCESS_TOKEN');
  // When set (temporarily, during testing), events appear live in Meta's
  // Events Manager → Test Events tab. Leave it unset in production.
  const FB_TEST_EVENT_CODE = await settingsHelper.getSetting(brandId, 'FB_TEST_EVENT_CODE');

  if (!FB_PIXEL_ID) {
    console.log(`Facebook Pixel: Skipping ${eventName} — brand ${brandId} has no FB_PIXEL_ID set`);
    return { skipped: true, reason: 'no pixel id' };
  }
  if (!FB_ACCESS_TOKEN || FB_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN') {
    console.log(`Facebook Pixel: Skipping ${eventName} — brand ${brandId} has no valid access token`);
    return { skipped: true, reason: 'no access token' };
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
    em: hashed(order.email),
    // Digits with the country code (91…), as Meta matches phone numbers.
    ph: hashed(order.phone, normalizePhone),
    fn: hashed(order.first_name),
    ln: hashed(order.last_name),
    // Address fields — hashed
    zp: sha256(order.zip_code),
    ct: sha256(order.city),
    st: sha256(order.state),
    country: sha256(order.country || 'in'),
    // Stable user id (hashed) — raises Event Match Quality and ties the browser
    // (Advanced Matching) and server copies to the same person, like Shopify.
    external_id: externalIds(order.external_id, order.visitor_id),
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

  // Keep what this order's Purchase knew about the shopper's browser (ad
  // click id, browser id, device), so the later Delivered / Cancelled /
  // Returned events for the order match the same person.
  if (eventName === 'Purchase' && order.order_number) {
    require('../services/metaOrderOutcomes.js').saveTracking(brandId, order).catch(() => {});
  }

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: extraData.event_source_url || order.event_source_url || await thankYouUrl(brandId),
    action_source: extraData.action_source || 'website',
    event_id: extraData.event_id || (order.order_number ? `${eventName}_${order.order_number}` : `${eventName}_${Date.now()}`),
    user_data: userData,
    custom_data: {
      // What the shopper paid (after discounts), like the browser Purchase.
      value: parseFloat(order.final_amount || order.total_amount || 0),
      currency: order.currency || 'INR',
      order_id: order.order_number || '',
      contents: items,
      content_ids: [...new Set(items.map((i) => i.id).filter(Boolean))],
      // Product ids, like the browser events (Meta matches them to the
      // catalog's items or item groups).
      content_type: 'product',
      num_items: items.length,
      ...(extraData.custom_data || {}),
    },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      { data: [eventData], ...(FB_TEST_EVENT_CODE ? { test_event_code: FB_TEST_EVENT_CODE } : {}) }
    );
    console.log(`✅ Facebook Pixel: ${eventName} sent — events_received: ${response.data?.events_received}`);
    return { events_received: response.data?.events_received, fbtrace_id: response.data?.fbtrace_id, messages: response.data?.messages };
  } catch (error) {
    console.error(`❌ Facebook Pixel ${eventName} error:`, error.response?.data || error.message);
    return { error: error.response?.data || error.message };
  }
}

/** Meta click id (fb.1.<ms>.<fbclid>) from an ad-click landing URL, if it has one. */
function fbcFromUrl(url) {
  try {
    const clid = new URL(url).searchParams.get('fbclid');
    return clid ? `fb.1.${Date.now()}.${clid}` : null;
  } catch {
    return null;
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
  // Per-brand pixel + token; fail closed so one brand's events never post to
  // another's pixel. No cross-brand default.
  if (!brandId) return { skipped: true, reason: 'unknown store' };
  const FB_PIXEL_ID = await settingsHelper.getSetting(brandId, 'FB_PIXEL_ID');
  const FB_ACCESS_TOKEN = await settingsHelper.getSetting(brandId, 'FB_ACCESS_TOKEN');
  const FB_TEST_EVENT_CODE = await settingsHelper.getSetting(brandId, 'FB_TEST_EVENT_CODE');

  if (!FB_PIXEL_ID) return { skipped: true, reason: 'no pixel id' };
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
    em: hashed(user_data.em || user_data.email),
    ph: hashed(user_data.ph || user_data.phone, normalizePhone),
    fn: hashed(user_data.fn || user_data.first_name),
    ln: hashed(user_data.ln || user_data.last_name),
    // Shopper's account id and/or the store's anonymous visitor id (_mvid).
    external_id: externalIds(user_data.external_id, user_data.visitor_id),
    // Every store ships within India only.
    country: sha256(user_data.country || 'in'),
    fbp: fbp || null,
    fbc: fbc || fbcFromUrl(event_source_url) || null,
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
    { data: [eventData], ...(FB_TEST_EVENT_CODE ? { test_event_code: FB_TEST_EVENT_CODE } : {}) }
  );
  return { events_received: response.data?.events_received };
}

const router = express.Router();

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

// GET /api/facebook-pixel/status — is the Conversions API configured for this
// brand? (admin only). Reports the pixel id + whether a token/test code is set,
// without ever exposing the secret token itself.
router.get('/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const brandId = (await resolveBrandId(req)) || 1; // admin tools: Crosscoin when no store is picked
    const FB_PIXEL_ID = await settingsHelper.getSetting(brandId, 'FB_PIXEL_ID');
    const FB_ACCESS_TOKEN = await settingsHelper.getSetting(brandId, 'FB_ACCESS_TOKEN');
    const FB_TEST_EVENT_CODE = await settingsHelper.getSetting(brandId, 'FB_TEST_EVENT_CODE');
    res.json({
      brandId,
      pixel_id: FB_PIXEL_ID || null,
      access_token_set: !!(FB_ACCESS_TOKEN && FB_ACCESS_TOKEN !== 'YOUR_ACCESS_TOKEN'),
      test_event_code: FB_TEST_EVENT_CODE || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/facebook-pixel/test — fire a sample Purchase to the Conversions API
// and return Meta's raw response (events_received / messages / errors), so you
// can confirm the token works without placing a real order. With a
// FB_TEST_EVENT_CODE set for the brand it also shows live in Events Manager →
// Test Events. Admin only.
router.post('/test', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const brandId = (await resolveBrandId(req)) || 1; // admin tools: Crosscoin when no store is picked
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
    const sampleOrder = {
      brand_id: brandId,
      order_number: 'CAPITEST-' + Date.now(),
      total_amount: 1, currency: 'INR',
      email: 'capitest@example.com', phone: '9999999999',
      first_name: 'Capi', last_name: 'Test',
      city: 'Surat', state: 'GJ', zip_code: '395006', country: 'in',
      ip_address: ip, user_agent: req.headers['user-agent'] || null,
      items: [{ id: 'TEST-SKU', quantity: 1 }],
      marketing_consent: true,
    };
    const result = await sendFacebookEvent('Purchase', sampleOrder);
    res.json({ ok: !!(result && result.events_received) , result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.response?.data || error.message });
  }
});

module.exports = router;
module.exports.sendFacebookEvent = sendFacebookEvent;
module.exports.sendBrowserPixelEvent = sendBrowserPixelEvent;
module.exports.buyerMatchKeys = buyerMatchKeys;

// Delivered / Cancelled / Returned order events (hooks on the Order model).
require('../services/metaOrderOutcomes.js');
