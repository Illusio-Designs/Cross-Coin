/**
 * Custom Checkout controller — the seller-side catalog URLs the checkout
 * provider pulls (Shopify-like shapes), the storefront's checkout-token
 * endpoint, and admin order/push utilities. Brand resolves via optionalBrand
 * (X-Brand-Name header or ?brand=<slug>), falling back to brand 1.
 */
const { Product, Category, Brand } = require('../model/associations.js');
const settingsHelper = require('../services/settingsHelper.js');
const svc = require('../services/customCheckoutService.js');
const { logger } = require('../config/logging.js');

// Shiprocket Checkout pages from 0 (their samples call page=0 first, and their
// own order-list API is 0-based): page=0 → first `limit` rows, page=1 → next.
const pagination = (req) => {
  const page = Math.max(0, parseInt(req.query.page, 10) || 0);
  const limit = Math.min(250, Math.max(1, parseInt(req.query.limit, 10) || 100));
  return { page, limit, offset: page * limit };
};

// GET /api/custom-checkout/products?page=&limit=
exports.listProducts = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const { limit, offset } = pagination(req);
    const vendor = req.brand?.name || '';
    const { count, rows } = await Product.findAndCountAll({
      where: { status: 'active' },
      include: svc.productIncludes(brandId),
      order: [['id', 'ASC']],
      limit, offset,
      distinct: true,
    });
    res.json({ data: { total: count, products: rows.map((p) => svc.mapProductStrict(p, { vendor: vendor || p.Brands?.[0]?.name || '' })) } });
  } catch (err) {
    logger.error('[custom-checkout] listProducts failed: ' + err.message);
    res.status(500).json({ data: { total: 0, products: [] }, error: err.message });
  }
};

// GET /api/custom-checkout/collections?page=&limit=
exports.listCollections = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const { limit, offset } = pagination(req);
    const { count, rows } = await Category.findAndCountAll({
      include: [{ model: Brand, as: 'Brands', attributes: [], through: { attributes: [] }, required: true, where: { id: brandId } }],
      order: [['id', 'ASC']],
      limit, offset,
      distinct: true,
    });
    res.json({ data: { total: count, collections: rows.map(svc.mapCollection) } });
  } catch (err) {
    logger.error('[custom-checkout] listCollections failed: ' + err.message);
    res.status(500).json({ data: { total: 0, collections: [] }, error: err.message });
  }
};

// GET /api/custom-checkout/collection-products?collection_id=&page=&limit=
exports.listCollectionProducts = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const collectionId = parseInt(req.query.collection_id, 10);
    if (!Number.isFinite(collectionId)) {
      return res.status(400).json({ data: { total: 0, products: [] }, error: 'collection_id is required' });
    }
    const { limit, offset } = pagination(req);
    const vendor = req.brand?.name || '';
    const { count, rows } = await Product.findAndCountAll({
      where: { status: 'active', categoryId: collectionId },
      include: svc.productIncludes(brandId),
      order: [['id', 'ASC']],
      limit, offset,
      distinct: true,
    });
    res.json({ data: { total: count, products: rows.map((p) => svc.mapProductStrict(p, { vendor: vendor || p.Brands?.[0]?.name || '' })) } });
  } catch (err) {
    logger.error('[custom-checkout] listCollectionProducts failed: ' + err.message);
    res.status(500).json({ data: { total: 0, products: [] }, error: err.message });
  }
};

// GET /api/custom-checkout/points?mobile_number=… — loyalty points lookup the
// checkout calls per shopper. No loyalty program runs here yet, so every
// shopper has zero points; plug a real balance in when one exists.
exports.getPoints = async (req, res) => {
  const mobile = String(req.query.mobile_number || req.query.mobile || req.query.phone || '').replace(/\D/g, '');
  res.json({ data: { mobile_number: mobile, available_points: 0, applicable_points: 0 } });
};

// POST /api/custom-checkout/token  { items:[{variant_id,quantity}], custom_attributes?, mobile_app?, redirect_url }
// Called by the storefront; the HMAC secret stays server-side.
// GET /api/custom-checkout/status — lets the storefront decide whether its
// checkout button opens the provider's checkout (API key + secret saved).
exports.status = async (req, res) => {
  try {
    // On only when the store's switch is on AND both keys are saved.
    const brandId = req.brandId || 1;
    const on = String(await settingsHelper.getSetting(brandId, 'SHIPROCKET_CHECKOUT_ENABLED', 'false')).toLowerCase() === 'true';
    res.json({ success: true, enabled: on && await svc.isConfigured(brandId) });
  } catch (err) {
    res.json({ success: true, enabled: false });
  }
};

exports.createToken = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const items = Array.isArray(req.body.items) ? req.body.items
      .map((i) => ({ variant_id: String(i.variant_id ?? i.variationId ?? ''), quantity: Math.max(1, parseInt(i.quantity, 10) || 1) }))
      .filter((i) => i.variant_id) : [];
    if (!items.length) return res.status(400).json({ success: false, message: 'items are required' });
    const cartData = {
      items,
      custom_attributes: (req.body.custom_attributes && typeof req.body.custom_attributes === 'object') ? req.body.custom_attributes : {},
      mobile_app: !!req.body.mobile_app,
    };
    const redirectUrl = String(req.body.redirect_url || '');
    if (!redirectUrl) return res.status(400).json({ success: false, message: 'redirect_url is required' });
    const data = await svc.createCheckoutToken(brandId, cartData, redirectUrl);
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error('[custom-checkout] createToken failed: ' + (err?.response?.status || '') + ' ' + err.message);
    res.status(err.status || 502).json({ success: false, message: err.message, provider: err?.response?.data });
  }
};

// Admin: fetch one checkout order's details / list recent checkout orders.
exports.orderDetails = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
    const orderId = req.params.orderId || req.query.order_id || req.body?.order_id;
    if (!orderId) return res.status(400).json({ success: false, message: 'order_id is required' });
    const data = await svc.fetchCheckoutOrder(brandId, orderId);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message, provider: err?.response?.data });
  }
};

exports.orderList = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
    const data = await svc.listCheckoutOrders(brandId, { page: req.query.page, limit: req.query.limit });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message, provider: err?.response?.data });
  }
};

// Admin: push one product / collection to the provider on demand.
exports.syncProduct = async (req, res) => {
  const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
  const result = await svc.pushProduct(req.params.id, brandId);
  res.json({ success: !result.error, ...result });
};

exports.syncCollection = async (req, res) => {
  const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
  const result = await svc.pushCollection(req.params.id, brandId);
  res.json({ success: !result.error, ...result });
};

// Confirm an order really exists at the provider (signed fetch), then save it
// locally from the provider's own copy. Idempotent.
async function verifyAndIngest(brandId, claimedId) {
  let providerOrder;
  try {
    const confirmed = await svc.fetchCheckoutOrder(brandId, claimedId);
    // The provider wraps the order in `result` (older replies used `data`).
    const d = confirmed?.result || confirmed?.data || confirmed;
    providerOrder = Array.isArray(d) ? d[0] : d;
    if (!providerOrder) throw new Error('order not found at provider');
  } catch (verifyErr) {
    logger.warn(`[custom-checkout] webhook rejected — could not verify order ${claimedId} with provider: ${verifyErr.message}`);
    const e = new Error('Order could not be verified with the checkout provider'); e.status = 401; throw e;
  }

  // Build the order ONLY from the provider's own copy (items, amounts,
  // payment status) — the webhook body is unsigned, so trusting its items
  // or "payment_status: success" would let anyone holding one real order id
  // create paid orders with their own items and prices.
  if (!Array.isArray(providerOrder?.cart_data?.items) || !providerOrder.cart_data.items.length) {
    logger.error(`[custom-checkout] provider order ${claimedId} has no cart_data.items (keys: ${Object.keys(providerOrder || {}).join(',')}) — not ingesting`);
    const e = new Error('Provider order has no items'); e.status = 422; throw e;
  }
  return svc.ingestCheckoutOrder(brandId, { ...providerOrder, platform_order_id: claimedId });
}

// POST /api/custom-checkout/order-webhook?brand=<slug>
// The provider POSTs the full order here after checkout (register this URL,
// with the brand query, as the seller webhook). Idempotent; non-SUCCESS
// statuses are acknowledged and skipped.
exports.orderWebhook = async (req, res) => {
  try {
    const brandId = req.brandId || 1;

    // The provider sends this webhook unsigned, so never trust the body alone:
    // anyone who finds the URL could otherwise create "paid" orders and drain
    // stock. Confirm the order really exists at the provider by fetching it
    // with our signed credentials before ingesting anything.
    const claimedId = String(req.body?.platform_order_id || req.body?.order_id || '').trim();
    if (!claimedId) return res.status(400).json({ ok: false, message: 'platform_order_id is required' });
    const result = await verifyAndIngest(brandId, claimedId);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('[custom-checkout] order webhook failed: ' + err.message);
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

// Admin: refunds — signed pass-throughs to the provider.
exports.refundInitiate = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
    const data = await svc.initiateRefund(brandId, req.body || {});
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message, provider: err?.response?.data });
  }
};

exports.refundReports = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
    const data = await svc.refundReports(brandId, req.body || {});
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message, provider: err?.response?.data });
  }
};

// POST /api/custom-checkout/confirm  { oid, fbp, fbc, ga_client_id, marketing_consent }
// The store calls this from the page the provider redirects back to. The order
// is verified and saved (same as the webhook, whichever comes first), then:
// with marketing consent, Meta gets the server Purchase with this shopper's
// browser ids, under the same event id as the browser Purchase the page fires.
// Returns our order number + contents for that browser Purchase.
exports.confirmReturn = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const oid = String(req.body?.oid || '').trim();
    if (!oid) return res.status(400).json({ ok: false, message: 'oid is required' });
    const result = await verifyAndIngest(brandId, oid);
    if (!result?.order_number) return res.json({ ok: false, ...result });
    const track = await svc.purchasePayload(brandId, result.order_number);
    if (track && req.body?.marketing_consent === true) {
      const payload = {
        ...track, marketing_consent: true,
        fbp: req.body?.fbp || req.cookies?._fbp || null,
        fbc: req.body?.fbc || req.cookies?._fbc || null,
        ip_address: req.ip || null, user_agent: req.headers['user-agent'] || null,
      };
      setImmediate(async () => {
        try {
          const { sendFacebookEvent } = require('../integration/facebookPixel.js');
          await sendFacebookEvent('Purchase', payload);
        } catch (e) { logger.warn('[custom-checkout] confirm Purchase failed: ' + e.message); }
      });
    }
    res.json({
      ok: true, order_number: result.order_number,
      value: track?.final_amount || 0,
      items: (track?.items || []).map((i) => ({ id: String(i.product_id), quantity: i.quantity })),
    });
  } catch (err) {
    logger.error('[custom-checkout] confirm failed: ' + err.message);
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
