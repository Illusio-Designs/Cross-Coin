/**
 * Custom Checkout controller — the seller-side catalog URLs the checkout
 * provider pulls (Shopify-like shapes), the storefront's checkout-token
 * endpoint, and admin order/push utilities. Brand resolves via optionalBrand
 * (X-Brand-Name header or ?brand=<slug>), falling back to brand 1.
 */
const { Product, Category, Brand } = require('../model/associations.js');
const svc = require('../services/customCheckoutService.js');
const { logger } = require('../config/logging.js');

const pagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(250, Math.max(1, parseInt(req.query.limit, 10) || 100));
  return { page, limit, offset: (page - 1) * limit };
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
    res.json({ data: { total: count, products: rows.map((p) => svc.mapProduct(p, { vendor: vendor || p.Brands?.[0]?.name || '' })) } });
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
    res.json({ data: { total: count, products: rows.map((p) => svc.mapProduct(p, { vendor: vendor || p.Brands?.[0]?.name || '' })) } });
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

// POST /api/custom-checkout/order-webhook?brand=<slug>
// The provider POSTs the full order here after checkout (register this URL,
// with the brand query, as the seller webhook). Idempotent; non-SUCCESS
// statuses are acknowledged and skipped.
exports.orderWebhook = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const result = await svc.ingestCheckoutOrder(brandId, req.body || {});
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
