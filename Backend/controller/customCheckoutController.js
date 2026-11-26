const { ensureCheckoutCatalog } = require('../utils/checkoutCatalog.js');
/**
 * Custom Checkout controller — the seller-side catalog URLs the checkout
 * provider pulls (Shopify-like shapes), the storefront's checkout-token
 * endpoint, and admin order/push utilities. Brand resolves via optionalBrand
 * (X-Brand-Name header or ?brand=<slug>), falling back to brand 1.
 */
const { Product, Category, Brand } = require('../model/associations.js');
const { BundleTier } = require('../model/bundleTierModel.js');
const { PACK_QUOTE_ATTRIBUTE, packGroupId, pricingError, pricePackItems } = require('../utils/shiprocketPackPricing.js');
const settingsHelper = require('../services/settingsHelper.js');
const svc = require('../services/customCheckoutService.js');
const { logger } = require('../config/logging.js');

// Ignore callbacks from previously issued staff preview sessions.
const PACK_PREVIEW_ATTRIBUTE = 'velmique_pack_preview';

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
async function isCheckoutEnabled(brandId) {
  const enabled = await settingsHelper.getSetting(brandId, 'SHIPROCKET_CHECKOUT_ENABLED', 'false');
  return String(enabled).toLowerCase() === 'true' && await svc.isConfigured(brandId);
}

async function buildPackItems(brandId, rawItems, legacyPercent) {
  const { bundlePerUnit, packDiscountPercent } = require('./bundleController.js');
  const lines = rawItems.map((line) => {
    const pack_id = packGroupId(line.pack_id);
    const pack_group = packGroupId(line.pack_group);
    if ((line.pack_id && !pack_id) || (line.pack_group && !pack_group) || (pack_id && pack_group)) {
      throw pricingError('Invalid pack selection. Rebuild your pack and try again.');
    }
    return { variant_id: String(line.variant_id ?? line.variationId), quantity: Number(line.quantity), pack_id, pack_group };
  });
  if (!lines.some((line) => line.pack_id || line.pack_group)) {
    const discount = await packDiscountPercent(brandId, lines.reduce((total, line) => total + line.quantity, 0));
    if (!discount || discount !== Number(legacyPercent)) throw pricingError('Pack pricing changed. Rebuild your pack and try again.');
    for (const line of lines) line.pack_group = 'legacy';
  }
  const ids = [...new Set(lines.map((line) => line.variant_id))];
  const { ProductVariation } = require('../model/associations.js');
  const resolved = await ProductVariation.findAll({ where: { id: ids, status: 'active' }, attributes: ['id', 'productId'] });
  const products = await Product.findAll({ where: { id: [...new Set(resolved.map((row) => row.productId))], status: 'active' }, include: svc.productIncludes(brandId) });
  const activeIds = new Set(resolved.map((row) => String(row.id)));
  const variants = new Map();
  for (const product of products) {
    const listing = svc.mapProduct(product);
    for (const variant of listing.variants) {
      if (!activeIds.has(String(variant.id))) continue;
      variants.set(String(variant.id), { productId: product.id, name: listing.title, price: Number(variant.price), stock: variant.quantity, image: variant.image?.src || listing.image?.src });
    }
  }
  return pricePackItems(lines, variants, (id, quantity) => bundlePerUnit(brandId, id, quantity), (quantity) => packDiscountPercent(brandId, quantity));
}

exports.status = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const enabled = await isCheckoutEnabled(brandId);
    const response = { success: true, enabled, shiprocketCalls: svc.providerCallsFor(brandId) };
    if (req.query.pack === '1') response.packEnabled = enabled && !!(await BundleTier.findOne({ where: { brand_id: brandId, is_active: true }, attributes: ['id'] }));
    res.json(response);
  } catch (err) {
    res.json({ success: true, enabled: false });
  }
};

async function createToken(req, res, pack = false) {
  try {
    // A checkout must belong to the store that opened it — never default to
    // Crosscoin when the store isn't named.
    if (!req.brandId) return res.status(400).json({ success: false, message: 'X-Brand-Name is required' });
    const brandId = req.brandId;
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (rawItems.some((i) => !i || !/^[1-9]\d*$/.test(String(i.variant_id ?? i.variationId ?? '')) ||
      !Number.isSafeInteger(Number(i.quantity)) || Number(i.quantity) <= 0)) {
      return res.status(400).json({ success: false, code: 'CHECKOUT_INVALID_ITEMS', message: 'Choose valid product options and whole quantities' });
    }
    const quantities = new Map();
    for (const i of rawItems) {
      const id = String(i.variant_id ?? i.variationId);
      const total = (quantities.get(id) || 0) + Number(i.quantity);
      if (!Number.isSafeInteger(total)) return res.status(400).json({ success: false, code: 'CHECKOUT_INVALID_ITEMS', message: 'Quantity is too large' });
      quantities.set(id, total);
    }
    let items = [...quantities].map(([variant_id, quantity]) => ({ variant_id, quantity }));
    if (!items.length) return res.status(400).json({ success: false, message: 'items are required' });
    if (pack) {
      if (!(await isCheckoutEnabled(brandId))) throw pricingError('Shiprocket Checkout is unavailable for this store.');
      items = await buildPackItems(brandId, rawItems, req.body.discount_percent);
    }
    // The shopper's own IP + browser, captured here (the request comes from
    // their browser) and carried through the checkout, so the server Purchase
    // matches them as well as a native order's does. The order webhook comes
    // from the provider's server, which can't tell us these.
    const custom = (req.body.custom_attributes && typeof req.body.custom_attributes === 'object') ? { ...req.body.custom_attributes } : {};
    delete custom[PACK_PREVIEW_ATTRIBUTE];
    delete custom[PACK_QUOTE_ATTRIBUTE];
    if (req.ip) custom.client_ip = String(req.ip).slice(0, 64);
    if (req.headers['user-agent']) custom.user_agent = String(req.headers['user-agent']).slice(0, 400);
    // The store, stamped by us (not the browser): the order is saved under it
    // whichever webhook URL Shiprocket calls (see verifyAndIngest).
    custom.store = req.brand.slug;
    const cartData = {
      items,
      custom_attributes: custom,
      mobile_app: !!req.body.mobile_app,
    };
    const redirectUrl = String(req.body.redirect_url || '');
    if (!redirectUrl) return res.status(400).json({ success: false, message: 'redirect_url is required' });
    // Shiprocket must know these products before its checkout can show them.
    const catalogPush = await ensureCheckoutCatalog(() => svc.ensureProductsPushed(brandId, items.map((i) => i.variant_id)));
    const data = pack
      ? await svc.createCheckoutToken(brandId, cartData, redirectUrl, { pack: true })
      : await svc.createCheckoutToken(brandId, cartData, redirectUrl);
    res.json({ success: true, ...data, catalogPush });
  } catch (err) {
    logger.error('[custom-checkout] createToken failed: ' + (err?.response?.status || '') + ' ' + err.message);
    res.status(err.status || 502).json({ success: false, message: err.message, code: String(err.code || '').startsWith('CHECKOUT_') ? err.code : 'CHECKOUT_TOKEN_FAILED', provider: err?.response?.data });
  }
}

exports.createToken = (req, res) => createToken(req, res);
exports.createPackToken = (req, res) => createToken(req, res, true);

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
async function fetchProviderOrder(brandId, claimedId) {
  try {
    const confirmed = await svc.fetchCheckoutOrder(brandId, claimedId);
    // The provider wraps the order in `result` (older replies used `data`).
    const data = confirmed?.result ?? confirmed?.data ?? confirmed;
    const order = Array.isArray(data) ? data[0] : data;
    if (!order || typeof order !== 'object' || confirmed?.success === false || order.success === false) {
      throw new Error('order not found at provider');
    }
    return order;
  } catch (verifyErr) {
    const providerStatus = verifyErr.response?.status;
    const requestId = verifyErr.response?.headers?.['x-request-id'];
    const trace = typeof requestId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(requestId) ? ` request ${requestId}` : '';
    logger.warn(`[custom-checkout] could not verify order ${claimedId} for store ${brandId}: ${verifyErr.message}${trace}`);
    const e = new Error('Order could not be verified with the checkout provider');
    e.status = 401;
    e.providerStatus = providerStatus;
    throw e;
  }
}

async function verifyAndIngest(brandId, claimedId, expectedPayment, options) {
  const providerOrder = await fetchProviderOrder(brandId, claimedId);
  if (String(providerOrder.platform_order_id || providerOrder.order_id || '').trim() === claimedId &&
      !svc.isCodOrder(providerOrder, providerOrder.payments?.[0])) {
    const { rememberCheckout } = require('../services/prepaidRecoveryStore.js');
    const { referencesOf, resumeCaptureForCheckout } = require('../services/prepaidOrderRecovery.js');
    const refs = referencesOf(providerOrder);
    const linked = !!(refs.paymentId || refs.gatewayOrderId);
    await rememberCheckout(brandId, claimedId, refs, linked);
    if (linked && !expectedPayment && !options?.prepaidOnly) {
      const importable = require('../utils/shiprocketPaymentRecovery.js').canImportCapturedCheckout(providerOrder);
      if (importable) {
        const resumed = await resumeCaptureForCheckout(brandId, claimedId, providerOrder, refs);
        if (resumed?.order && Number(resumed.order.brand_id) === Number(brandId)) {
          return { created: resumed.state === 'recovered', order_number: resumed.order.order_number };
        }
        if (resumed) return { skipped: 'awaiting_payment' };
      }
    }
  }
  return ingestVerifiedOrder(brandId, claimedId, providerOrder, expectedPayment, options);
}

async function ingestVerifiedOrder(brandId, claimedId, providerOrder, expectedPayment, { prepaidOnly = false, since, recovery = false } = {}) {
  if (prepaidOnly) {
    const confirmedId = String(providerOrder.platform_order_id || providerOrder.order_id || '').trim();
    if (confirmedId !== claimedId) throw Object.assign(new Error('Shiprocket returned a different order reference.'), { status: 409 });
    const created = Date.parse(providerOrder.created_at || providerOrder.createdAt || providerOrder.order_date || '');
    if (Number.isFinite(created) && created < since) return { skipped: 'outside_recovery_window' };
    const payments = Array.isArray(providerOrder.payments) ? providerOrder.payments.filter(Boolean) : [];
    if ((!expectedPayment && String(providerOrder.payment_status || '').toLowerCase() !== 'success') ||
        svc.isCodOrder(providerOrder) || payments.some((payment) => svc.isCodOrder(providerOrder, payment))) {
      return { skipped: 'not_confirmed_prepaid' };
    }
  }

  // Build the order ONLY from the provider's own copy (items, amounts,
  // payment status) — the webhook body is unsigned, so trusting its items
  // or "payment_status: success" would let anyone holding one real order id
  // create paid orders with their own items and prices.
  if (!Array.isArray(providerOrder?.cart_data?.items) || !providerOrder.cart_data.items.length) {
    logger.error(`[custom-checkout] provider order ${claimedId} has no cart_data.items (keys: ${Object.keys(providerOrder || {}).join(',')}) — not ingesting`);
    const e = new Error('Provider order has no items'); e.status = 422; throw e;
  }
  // The store the checkout was opened from (stamped at token time) decides
  // which store the order — and its Meta / Google Purchase — belongs to, so a
  // webhook URL without (or with the wrong) ?brand= can't file a Morbix order
  // under Crosscoin or the other way round.
  if (expectedPayment) require('../utils/shiprocketPaymentRecovery.js').verifyShiprocketRecovery(providerOrder, claimedId, expectedPayment);
  const cartAttrs = svc.parseAttrs(providerOrder.cart_data.custom_attributes);
  const orderAttrs = svc.parseAttrs(providerOrder.custom_attributes);
  if ([cartAttrs, orderAttrs].some((attrs) => String(attrs?.[PACK_PREVIEW_ATTRIBUTE]) === '1')) return { skipped: 'pack_preview' };
  const stamped = String(cartAttrs?.store || orderAttrs?.store || '').trim().toLowerCase();
  if (stamped) {
    const Brand = require('../model/brandModel.js');
    const own = await Brand.findOne({ where: { slug: stamped }, attributes: ['id'] });
    if (!own && (prepaidOnly || expectedPayment)) throw Object.assign(new Error('Shiprocket checkout store could not be matched.'), { status: 409 });
    if (own && own.id !== brandId) {
      logger.warn(`[custom-checkout] order ${claimedId} came in for brand ${brandId} but was opened on ${stamped} (brand ${own.id}) — saving it under ${stamped}`);
      brandId = own.id;
    }
  }
  return svc.ingestCheckoutOrder(brandId, { ...providerOrder, platform_order_id: claimedId }, expectedPayment, { recovery });
}

exports.verifyAndIngest = verifyAndIngest;
exports.fetchProviderOrder = fetchProviderOrder;
exports.ingestVerifiedOrder = ingestVerifiedOrder;

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
    if (!svc.isCodOrder(req.body, req.body.payments?.[0])) {
      const hints = require('../services/prepaidOrderRecovery.js').referencesOf(req.body);
      await require('../services/prepaidRecoveryStore.js').rememberCheckout(brandId, claimedId, hints);
    }
    const result = await verifyAndIngest(brandId, claimedId);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('[custom-checkout] order webhook failed: ' + err.message);
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

// POST /api/custom-checkout/abandoned-webhook — Shiprocket's "abandoned cart"
// callback (Shiprocket panel → abandoned service provider: Custom). The
// shopper typed their phone inside Shiprocket's window and left without
// paying; we add/refresh their row in abandoned_carts so our WhatsApp cart
// recovery (and the admin Abandoned carts list) picks it up. Shiprocket's
// payload isn't documented, so fields are read from the usual names.
const pick = (obj, re, depth = 0, accepts = (value) => String(value).trim()) => {
  if (!obj || typeof obj !== 'object' || depth > 6) return undefined;
  for (const [k, v] of Object.entries(obj)) if (re.test(k) && v != null && typeof v !== 'object' && accepts(v)) return v;
  for (const v of Object.values(obj)) { const r = pick(v, re, depth + 1, accepts); if (r !== undefined) return r; }
  return undefined;
};
const findItems = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object' || depth > 6) return null;
  for (const [k, v] of Object.entries(obj)) {
    if (/^(items|line_?items|cart_?items|products)$/i.test(k) && Array.isArray(v) && v.length) return v;
  }
  for (const v of Object.values(obj)) { const r = findItems(v, depth + 1); if (r) return r; }
  return null;
};
const keyShape = (obj, depth = 0) => {
  if (Array.isArray(obj)) return obj.length ? [keyShape(obj[0], depth + 1)] : [];
  if (!obj || typeof obj !== 'object' || depth > 5) return typeof obj;
  return Object.fromEntries(Object.entries(obj).slice(0, 60).map(([k, v]) => [k, keyShape(v, depth + 1)]));
};

function cartPhone(value) {
  const phone = String(value).trim();
  if (!/^[\d+()\s-]+$/.test(phone)) return '';
  const digits = phone.replace(/\D/g, '');
  return /^(?:0091|91|0)?\d{10}$/.test(digits) ? digits.slice(-10) : '';
}

async function abandonedCartLines(raw, brandId) {
  const { Op } = require('sequelize');
  const { ProductVariation } = require('../model/associations.js');
  const candidates = raw.slice(0, 30).map((item) => {
    const ref = String(item?.variant_id ?? item?.variantId ?? item?.variation_id ?? item?.variant?.id ?? item?.sku_id ?? item?.id ?? '');
    const sku = String(item?.sku ?? item?.variant?.sku ?? '').trim().slice(0, 255);
    const quantity = Number(item?.quantity ?? item?.qty ?? 1);
    return { id: /^[1-9]\d{0,9}$/.test(ref) ? Number(ref) : null, sku, quantity, item };
  }).filter(({ id, sku, quantity }) => (id || sku) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 999);
  if (!candidates.length) return [];
  const ids = [...new Set(candidates.map(({ id }) => id).filter(Boolean))];
  const skus = [...new Set(candidates.map(({ sku }) => sku).filter(Boolean))];
  const variants = await ProductVariation.findAll({
    where: { [Op.or]: [...(ids.length ? [{ id: ids }] : []), ...(skus.length ? [{ sku: skus }] : [])] },
    attributes: ['id', 'productId', 'price', 'sku'],
  });
  const productIds = [...new Set(variants.map(({ productId }) => productId))];
  if (!productIds.length) return [];
  const products = await Product.findAll({
    where: { id: productIds, status: 'active' },
    include: [{ model: Brand, as: 'Brands', attributes: [], through: { attributes: [] }, required: true, where: { id: brandId } }],
    attributes: ['id', 'name'],
  });
  const names = new Map(products.map(({ id, name }) => [Number(id), name]));
  const scoped = variants.filter(({ productId }) => names.has(Number(productId)));
  return candidates.flatMap(({ id, sku, quantity, item }) => {
    const skuMatches = sku ? scoped.filter((v) => String(v.sku || '').toLowerCase() === sku.toLowerCase()) : [];
    const variant = scoped.find((v) => Number(v.id) === id && (!sku || skuMatches.includes(v))) ||
      (skuMatches.length === 1 ? skuMatches[0] : null);
    if (!variant) return [];
    const providerPrice = Number(item?.catalog_data?.price ?? item?.price ?? variant.price);
    const price = Number.isFinite(providerPrice) && providerPrice >= 0 ? providerPrice : Number(variant.price) || 0;
    return [{ productId: variant.productId, variationId: variant.id, name: names.get(Number(variant.productId)), quantity, price }];
  });
}

exports.abandonedWebhook = async (req, res) => {
  const brandId = req.brandId || 1;
  const body = req.body || {};
  // Field names only (no values / personal data) for the staff test page.
  const note = (ok, reason) => svc.noteProviderCall(brandId, { push: false, abandoned: true, ok, method: 'POST', path: 'abandoned-webhook', reason, payloadKeys: keyShape(body) });
  try {
    const checkout = body.data ?? body.payload ?? body;
    const attrs = svc.parseAttrs(checkout.cart_data?.custom_attributes ?? checkout.custom_attributes);
    if (String(attrs[PACK_PREVIEW_ATTRIBUTE] ?? pick(body, /^velmique_pack_preview$/i)) === '1') {
      return res.json({ ok: true, skipped: 'pack_preview' });
    }
    const digits = cartPhone(pick(body, /^(?:customer_?|shipping_?|billing_?)?(?:phone|mobile|contact)(?:_?(?:number|no))?$/i, 0, cartPhone) ?? '');
    if (digits.length !== 10) { note(false, 'no 10-digit phone in payload'); return res.json({ ok: true, skipped: 'no phone' }); }
    const first = pick(body, /^(first_?name|fname)$/i) || '';
    const last = pick(body, /^(last_?name|lname)$/i) || '';
    const name = String(`${first} ${last}`.trim() || pick(body, /^(name|full_?name|customer_?name)$/i) || '').slice(0, 120) || null;

    const raw = findItems(checkout.cart_data) || findItems(checkout) || [];
    const lines = await abandonedCartLines(raw, brandId);
    const itemCount = lines.reduce((a, l) => a + l.quantity, 0);
    const claimed = Number(pick(checkout, /^total_amount_payable$/i) ?? pick(checkout, /^(total_price|cart_value|cart_total|total_amount|total|sub_?total)$/i));
    const hasTotal = Number.isFinite(claimed) && claimed >= 0 && claimed <= 99999999.99;
    const lineTotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const cartValue = hasTotal ? claimed : Math.min(99999999.99, Math.round(lineTotal * 100) / 100);
    const cartSummary = lines.map((l) => `${l.name || 'Item'} ×${l.quantity}`).join(', ').slice(0, 250) || null;

    const { AbandonedCart } = require('../model/abandonedCartModel.js');
    const { phoneHash } = require('../utils/encryption.js');
    const recovery = require('../services/cartRecoveryService.js');
    const hash = phoneHash(digits);
    if (!hash) throw new Error('Abandoned cart encryption key is unavailable');
    const items = lines.length === raw.length ? recovery.sanitizeItems(lines) : null;
    const [row, created] = await AbandonedCart.findOrCreate({
      where: { phoneHashValue: hash, brandId },
      defaults: { phone: digits, customerName: name, cartSummary, itemCount, cartValue, status: 'pending', waSent: false, items, recoverToken: recovery.newToken() },
    });
    if (!created) {
      if (row.status === 'recovered' && Date.now() - new Date(row.updatedAt).getTime() < 10 * 60 * 1000) {
        note(true, 'order already placed'); return res.json({ ok: true, skipped: 'recovered' });
      }
      const rearm = (row.status !== 'pending' || row.waSent) && await recovery.canRearm(row);
      const updates = {
        ...(!row.phone ? { phone: digits } : {}),
        ...(name && name !== row.customerName ? { customerName: name } : {}),
        ...(items && cartSummary && cartSummary !== row.cartSummary ? { cartSummary } : {}),
        ...(items && itemCount !== Number(row.itemCount) ? { itemCount } : {}),
        ...((hasTotal || items) && cartValue !== Number(row.cartValue) ? { cartValue } : {}),
        ...(rearm ? { status: 'pending', waSent: false } : {}),
        ...(items && JSON.stringify(items) !== JSON.stringify(row.items) ? { items } : {}),
        ...(recovery.isToken(row.recoverToken) ? {} : { recoverToken: recovery.newToken() }),
      };
      if (Object.keys(updates).length) await row.update(updates);
    }
    note(true, `${created ? 'added' : 'updated'} abandoned cart (${itemCount} item${itemCount === 1 ? '' : 's'})`);

    // Meta: the shopper reached Shiprocket's checkout, gave their phone and
    // left — a strong signal for retargeting (an audience of "abandoned
    // checkout, didn't buy"). Once per phone per India day. Browser ids are
    // used when Shiprocket passes back the ones we sent at token time.
    setImmediate(async () => {
      try {
        const day = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
        const ua = pick(body, /^user_agent$/i) || null;
        const { sendFacebookEvent } = require('../integration/facebookPixel.js');
        await sendFacebookEvent('CheckoutAbandoned', {
          brand_id: brandId, phone: digits, first_name: first || null, last_name: last || null, country: 'in',
          final_amount: cartValue, currency: 'INR',
          items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
          fbp: attrs.fbp || pick(body, /^fbp$/i) || null, fbc: attrs.fbc || pick(body, /^fbc$/i) || null,
          marketing_consent: attrs.marketing_consent,
          visitor_id: pick(body, /^visitor_id$/i) || null,
          ip_address: pick(body, /^client_ip$/i) || null, user_agent: ua,
        }, {
          event_id: `CheckoutAbandoned_${hash.slice(0, 16)}_${day}`,
          action_source: ua ? 'website' : 'system_generated',
        });
      } catch (e) { logger.warn('[custom-checkout] CheckoutAbandoned to Meta failed: ' + e.message); }
    });
    return res.json({ ok: true, saved: true });
  } catch (err) {
    logger.error('[custom-checkout] abandoned webhook failed: ' + err.name);
    note(false, 'Could not save the abandoned cart');
    return res.status(500).json({ ok: false, message: 'Could not save the abandoned cart' });
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
    if (!track || !Array.isArray(track.items) || !track.items.length) {
      return res.status(409).json({ ok: false, code: 'CHECKOUT_CONFIRMATION_PENDING', message: 'Order confirmation is still pending for this store' });
    }
    if (track && req.body?.marketing_consent === true) {
      const payload = {
        ...track, marketing_consent: true,
        fbp: req.body?.fbp || req.cookies?._fbp || null,
        fbc: req.body?.fbc || req.cookies?._fbc || null,
        visitor_id: req.body?.visitor_id || null,
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
      // Buyer's email / phone, SHA-256-hashed, for the browser Purchase's
      // advanced matching (never the plain values).
      am: track ? require('../integration/facebookPixel.js').buyerMatchKeys(track) : undefined,
      items: (track?.items || []).map((i) => ({ id: String(i.product_id), quantity: i.quantity })),
    });
  } catch (err) {
    logger.error('[custom-checkout] confirm failed: ' + err.message);
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
