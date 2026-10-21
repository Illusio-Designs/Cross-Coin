/**
 * Custom Checkout catalog service (Shiprocket-Checkout-compatible).
 *
 * "Custom checkout" exposes the catalog in the Shopify-like shape the checkout
 * provider consumes:
 *   • pull: seller URLs served by customCheckoutController (products,
 *     collections, collection products)
 *   • push: product create/update webhooks POSTed to the checkout provider
 *     with X-Api-Key + X-Api-HMAC-SHA256 (HMAC of the raw JSON body).
 *
 * Per-brand settings (Dashboard → Settings):
 *   CUSTOM_CHECKOUT_API_KEY      — the key the provider issued
 *   CUSTOM_CHECKOUT_HMAC_SECRET  — shared secret for the HMAC signature
 * Push is silently skipped for brands that haven't configured them.
 */
const crypto = require('crypto');
const axios = require('axios');
const {
  Product, ProductVariation, ProductImage, Category, Brand,
  Order, OrderItem, Payment, GuestUser, ShippingAddress,
} = require('../model/associations.js');
const { sequelize } = require('../config/db.js');
const settingsHelper = require('./settingsHelper.js');
const { logger } = require('../config/logging.js');

const API_BASE = (process.env.API_URL || 'https://api.crosscoin.in').replace(/\/+$/, '');
const PUSH_PRODUCT_URL = 'https://checkout-api.shiprocket.com/wh/v1/custom/product';
const PUSH_COLLECTION_URL = 'https://checkout-api.shiprocket.com/wh/v1/custom/collection';
const CHECKOUT_TOKEN_URL = 'https://checkout-api.shiprocket.com/api/v1/access-token/checkout';

const absUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return u.startsWith('/') ? `${API_BASE}${u}` : `${API_BASE}/uploads/products/${u}`;
};

const iso = (d) => { try { return new Date(d).toISOString(); } catch { return new Date().toISOString(); } };
const money = (n) => (Number(n) || 0).toFixed(2);
const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());

const parseAttrs = (a) => {
  if (!a) return {};
  if (typeof a === 'string') { try { return JSON.parse(a) || {}; } catch { return {}; } }
  return typeof a === 'object' ? a : {};
};

// ── Shared product mapper ────────────────────────────────────────────────────
// Maps one Product row (with ProductVariations, ProductImages, Category
// includes) to the checkout provider's product shape.
function mapProduct(p, { vendor = '' } = {}) {
  const images = p.ProductImages || [];
  const primary = images.find((i) => i.is_primary) || images[0] || null;
  const imgSrcFor = (variationId) => {
    const vi = images.find((i) => String(i.variationId) === String(variationId));
    return absUrl((vi || primary)?.image_url || '');
  };

  // Aggregate option names/values across variations (Size, Color, …).
  const optionMap = new Map();
  const variants = (p.ProductVariations || []).map((v) => {
    const attrs = parseAttrs(v.attributes);
    const optionValues = {};
    for (const [k, val] of Object.entries(attrs)) {
      if (String(k).startsWith('_')) continue;
      const vals = (Array.isArray(val) ? val : [val]).map((x) => String(x).trim()).filter(Boolean);
      if (!vals.length) continue;
      const key = cap(k);
      // Only short, selector-ish attributes become options (size/color style);
      // long merchandising attributes stay out of the checkout option grid.
      if (!['Size', 'Color', 'Colour', 'Volume'].includes(key)) continue;
      optionValues[key] = vals[0];
      const set = optionMap.get(key) || new Set();
      vals.forEach((x) => set.add(x));
      optionMap.set(key, set);
    }
    if (!Object.keys(optionValues).length) {
      optionValues.Title = v.sku || 'Default';
      const set = optionMap.get('Title') || new Set();
      set.add(optionValues.Title);
      optionMap.set('Title', set);
    }
    return {
      id: Number(v.id),
      title: Object.values(optionValues).join(' / ') || v.sku || 'Default',
      price: money(v.price),
      compare_at_price: v.comparePrice != null && Number(v.comparePrice) > 0 ? money(v.comparePrice) : null,
      sku: v.sku || '',
      created_at: iso(v.createdAt),
      updated_at: iso(v.updatedAt),
      taxable: true,
      quantity: Number(v.stock) || 0,
      grams: 0,
      weight: 0,
      weight_unit: 'kg',
      image: { src: imgSrcFor(v.id) },
      option_values: optionValues,
    };
  });

  return {
    id: Number(p.id),
    title: p.name || '',
    body_html: p.description || '',
    vendor,
    product_type: p.Category?.name || '',
    created_at: iso(p.createdAt),
    handle: p.slug || String(p.id),
    updated_at: iso(p.updatedAt),
    tags: '',
    status: String(p.status || 'active') === 'active' ? 'active' : 'draft',
    variants,
    options: [...optionMap.entries()].map(([name, values]) => ({ name, values: [...values] })),
    image: { src: absUrl(primary?.image_url || '') },
  };
}

// Product-list pull (GET /products): EXACTLY the keys and order of Shiprocket
// Checkout's sample response — nothing extra. Dates in India time with the
// offset written out (2026-10-21T14:16:03+05:30), like their sample.
const isoIst = (d) => {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return isoIst(new Date());
  return new Date(t.getTime() + 330 * 60000).toISOString().slice(0, 19) + '+05:30';
};
function mapProductStrict(p, opts = {}) {
  const full = mapProduct(p, opts);
  const src = new Map((p.ProductVariations || []).map((v) => [Number(v.id), v]));
  return {
    id: full.id,
    title: full.title,
    body_html: full.body_html,
    vendor: full.vendor,
    product_type: full.product_type,
    created_at: isoIst(p.createdAt),
    handle: full.handle,
    updated_at: isoIst(p.updatedAt),
    tags: full.tags,
    status: full.status,
    variants: full.variants.map((v) => {
      const row = src.get(Number(v.id)) || {};
      return {
        id: v.id,
        title: v.title,
        price: v.price,
        sku: v.sku,
        created_at: isoIst(row.createdAt),
        updated_at: isoIst(row.updatedAt),
        taxable: v.taxable,
        grams: v.grams,
        image: { src: v.image.src },
        weight: v.weight,
        weight_unit: v.weight_unit,
      };
    }),
    image: { src: full.image.src },
  };
}

// Exactly the keys and order of Shiprocket Checkout's collections sample.
function mapCollection(c) {
  return {
    id: Number(c.id),
    updated_at: isoIst(c.updatedAt),
    body_html: c.description || '',
    handle: c.slug || String(c.id),
    image: { src: absUrl(c.image || '') },
    title: c.name || '',
    created_at: isoIst(c.createdAt),
  };
}

// Standard includes for a checkout product query, scoped to one brand.
const productIncludes = (brandId) => [
  { model: Brand, as: 'Brands', attributes: ['id', 'name'], through: { attributes: [] }, required: true, where: { id: brandId } },
  { model: ProductVariation, as: 'ProductVariations', required: false },
  { model: ProductImage, as: 'ProductImages', required: false },
  { model: Category, required: false },
];

// ── Push webhook ────────────────────────────────────────────────────────────
async function getPushConfig(brandId) {
  const [apiKey, secret] = await Promise.all([
    settingsHelper.getSetting(brandId, 'CUSTOM_CHECKOUT_API_KEY'),
    settingsHelper.getSetting(brandId, 'CUSTOM_CHECKOUT_HMAC_SECRET'),
  ]);
  if (!apiKey || !secret) return null;
  return { apiKey, secret };
}

// Fire-and-forget push of one product to the checkout provider. Never throws —
// catalog pushes must not break product saves.
async function pushProduct(productId, brandId = 1) {
  try {
    const cfg = await getPushConfig(brandId);
    if (!cfg) return { skipped: 'not_configured' };
    const p = await Product.findByPk(productId, { include: productIncludes(brandId) });
    if (!p) return { skipped: 'not_found' };
    const vendor = p.Brands?.[0]?.name || '';
    const body = JSON.stringify(mapProduct(p, { vendor }));
    const hmac = crypto.createHmac('sha256', cfg.secret).update(body, 'utf8').digest('base64');
    await axios.post(PUSH_PRODUCT_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': cfg.apiKey,
        'X-Api-HMAC-SHA256': hmac,
      },
      timeout: 15000,
    });
    logger.info(`[custom-checkout] pushed product ${productId} (brand ${brandId})`);
    return { pushed: true };
  } catch (err) {
    logger.warn(`[custom-checkout] product push failed (${productId}, brand ${brandId}): ${err?.response?.status || ''} ${err.message}`);
    return { error: err.message };
  }
}

// Signed POST to the checkout provider: X-Api-Key + base64 HMAC-SHA256 of the
// raw JSON body with the brand's shared secret.
async function signedPost(url, bodyObj, cfg, timeout = 15000) {
  const body = JSON.stringify(bodyObj);
  const hmac = crypto.createHmac('sha256', cfg.secret).update(body, 'utf8').digest('base64');
  return axios.post(url, body, {
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': cfg.apiKey, 'X-Api-HMAC-SHA256': hmac },
    timeout,
  });
}

// Fire-and-forget push of one collection (category) to the checkout provider.
async function pushCollection(categoryId, brandId = 1) {
  try {
    const cfg = await getPushConfig(brandId);
    if (!cfg) return { skipped: 'not_configured' };
    const c = await Category.findByPk(categoryId);
    if (!c) return { skipped: 'not_found' };
    await signedPost(PUSH_COLLECTION_URL, mapCollection(c), cfg);
    logger.info(`[custom-checkout] pushed collection ${categoryId} (brand ${brandId})`);
    return { pushed: true };
  } catch (err) {
    logger.warn(`[custom-checkout] collection push failed (${categoryId}, brand ${brandId}): ${err?.response?.status || ''} ${err.message}`);
    return { error: err.message };
  }
}

// Create a checkout access token for the shopper's cart. The storefront calls
// our endpoint (the HMAC secret never reaches the browser); we sign and
// forward to the provider and hand its response back.
async function createCheckoutToken(brandId, cartData, redirectUrl) {
  const cfg = await getPushConfig(brandId);
  if (!cfg) { const e = new Error('Custom checkout is not configured for this store'); e.status = 400; throw e; }
  const payload = {
    cart_data: cartData,
    redirect_url: redirectUrl,
    timestamp: new Date().toISOString(),
  };
  const res = await signedPost(CHECKOUT_TOKEN_URL, payload, cfg, 20000);
  return res.data;
}

// ── Order pull (after checkout) ─────────────────────────────────────────────
const ORDER_DETAILS_URL = 'https://checkout-api.shiprocket.com/api/v1/custom-platform-order/details';
const ORDER_LIST_URL = 'https://checkout-api.shiprocket.com/api/v1/custom-platform-order/details/list';

async function fetchCheckoutOrder(brandId, orderId) {
  const cfg = await getPushConfig(brandId);
  if (!cfg) { const e = new Error('Custom checkout is not configured for this store'); e.status = 400; throw e; }
  const res = await signedPost(ORDER_DETAILS_URL, { order_id: String(orderId) }, cfg, 20000);
  return res.data;
}

async function listCheckoutOrders(brandId, { page = 0, limit = 250 } = {}) {
  const cfg = await getPushConfig(brandId);
  if (!cfg) { const e = new Error('Custom checkout is not configured for this store'); e.status = 400; throw e; }
  const res = await signedPost(ORDER_LIST_URL, { page: Number(page) || 0, limit: Number(limit) || 250 }, cfg, 20000);
  return res.data;
}

// ── Refunds ─────────────────────────────────────────────────────────────────
const REFUND_INITIATE_URL = 'https://checkout-api.shiprocket.com/api/v1/external/refund/initiate';
const REFUND_REPORTS_URL = 'https://checkout-api.shiprocket.com/api/v1/external/refund/reports';

// Signed pass-throughs: the dashboard supplies the provider's own fields
// (transaction/cart ids, amount, refund type …) and reads the raw response.
async function initiateRefund(brandId, payload = {}) {
  const cfg = await getPushConfig(brandId);
  if (!cfg) { const e = new Error('Custom checkout is not configured for this store'); e.status = 400; throw e; }
  const res = await signedPost(REFUND_INITIATE_URL, payload, cfg, 20000);
  return res.data;
}

async function refundReports(brandId, payload = {}) {
  const cfg = await getPushConfig(brandId);
  if (!cfg) { const e = new Error('Custom checkout is not configured for this store'); e.status = 400; throw e; }
  const res = await signedPost(REFUND_REPORTS_URL, payload, cfg, 20000);
  return res.data;
}

// ── Auto-push on catalog saves (fire-and-forget, config-gated per brand) ───
async function pushProductAllBrands(productId) {
  try {
    const p = await Product.findByPk(productId, { include: [{ model: Brand, as: 'Brands', attributes: ['id'], through: { attributes: [] } }] });
    (p?.Brands || []).forEach((b) => { pushProduct(productId, b.id); });
  } catch (e) { logger.warn('[custom-checkout] pushProductAllBrands: ' + e.message); }
}
async function pushCollectionAllBrands(categoryId) {
  try {
    const c = await Category.findByPk(categoryId, { include: [{ model: Brand, as: 'Brands', attributes: ['id'], through: { attributes: [] } }] });
    (c?.Brands || []).forEach((b) => { pushCollection(categoryId, b.id); });
  } catch (e) { logger.warn('[custom-checkout] pushCollectionAllBrands: ' + e.message); }
}
Product.addHook('afterSave', 'customCheckoutPush', (p) => { if (p?.id) setImmediate(() => pushProductAllBrands(p.id)); });
Category.addHook('afterSave', 'customCheckoutPush', (c) => { if (c?.id) setImmediate(() => pushCollectionAllBrands(c.id)); });

// ── Inbound order webhook → local order ─────────────────────────────────────
// The provider POSTs the full order to our registered webhook once checkout
// completes. Map it into a real Order (+ items, address, guest, payment) so
// it shows in the Dashboard like any other order. Idempotent by
// platform_order_id via the orders.idempotency_key column.
async function ingestCheckoutOrder(brandId, p) {
  const status = String(p?.status || '').toUpperCase();
  if (status && status !== 'SUCCESS') return { skipped: `status_${status}` };
  const platformId = String(p?.platform_order_id || p?.order_id || '').trim();
  const items = p?.cart_data?.items || [];
  if (!platformId || !items.length) { const e = new Error('platform_order_id and cart_data.items are required'); e.status = 400; throw e; }

  const idemKey = `cco:${platformId}`.slice(0, 100);
  const already = await Order.findOne({ where: { idempotency_key: idemKey } });
  if (already) return { created: false, order_number: already.order_number };

  const { generateUniqueOrderNumber } = require('./orderCreationService.js');
  const { toSmallestUnit } = require('../utils/amountConverter.js');
  const ship = p.shipping_address || {};
  const phone = String(p.phone || ship.phone || '').replace(/\D/g, '').slice(-10);
  const firstName = ship.first_name || 'Customer';
  const lastName = ship.last_name || '';

  return sequelize.transaction(async (t) => {
    // Guest identity (custom-checkout shoppers have no local account).
    let guest = phone ? await GuestUser.findOne({ where: { phone }, transaction: t }) : null;
    if (!guest) {
      guest = await GuestUser.create({ firstName, lastName, email: p.email || ship.email || null, phone: phone || null }, { transaction: t });
    }

    const address = await ShippingAddress.create({
      user_id: null,
      guest_user_id: guest.id,
      full_name: `${firstName} ${lastName}`.trim(),
      phone: phone || String(ship.phone || ''),
      address: [ship.line1, ship.line2, ship.landmark].filter(Boolean).join(', '),
      city: ship.city || '',
      state: ship.state || '',
      pincode: String(ship.pincode || ''),
      country: ship.country || 'India',
    }, { transaction: t });

    // Resolve cart lines against real variations.
    const lines = [];
    for (const it of items) {
      const v = await ProductVariation.findByPk(it.variant_id, { transaction: t });
      if (!v) { const e = new Error(`Unknown variant_id ${it.variant_id}`); e.status = 400; throw e; }
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const price = Number(v.price) || 0;
      lines.push({ product_id: v.productId, variation_id: v.id, quantity: qty, price, discount: 0, subtotal: price * qty });
    }

    // Line prices come from OUR variations; the provider's totals must agree
    // with them (small tolerance for rounding) or the order is not ingested.
    const linesTotal = lines.reduce((a, l) => a + l.subtotal, 0);
    const subtotal = linesTotal;
    const discount = Math.max(0, Number(p.total_discount) || 0);
    const shippingFee = Math.max(0, Number(p.shipping_charges) || 0);
    const expected = Math.max(0, subtotal - discount + shippingFee);
    const claimed = Number(p.total_amount_payable);
    if (Number.isFinite(claimed) && Math.abs(claimed - expected) > 2) {
      const e = new Error(`Amount mismatch for ${platformId}: provider says ₹${claimed}, items come to ₹${expected}`);
      e.status = 422; throw e;
    }
    if (discount > subtotal) { const e = new Error(`Discount larger than the order for ${platformId}`); e.status = 422; throw e; }
    const finalAmount = expected;
    const isCod = String(p.payment_type || '').toUpperCase() === 'COD';
    const paid = String(p.payment_status || '').toLowerCase() === 'success';

    const order = await Order.create({
      order_number: await generateUniqueOrderNumber(t, brandId),
      user_id: null,
      guest_user_id: guest.id,
      total_amount: subtotal,
      discount_amount: discount,
      coupon_id: null,
      shipping_fee: shippingFee,
      final_amount: finalAmount,
      payment_type: isCod ? 'cod' : 'razorpay', // orders ENUM has no 'prepaid'
      payment_status: paid ? 'paid' : (isCod ? 'pending' : 'pending'),
      status: 'confirmed',
      notes: `Custom checkout order ${platformId}${p.fastrr_order_id ? ` / fastrr ${p.fastrr_order_id}` : ''}${(p.coupon_codes || []).length ? ` / coupon ${(p.coupon_codes || []).join(',')}` : ''}`,
      shipping_address_id: address.id,
      brand_id: brandId,
      idempotency_key: idemKey,
    }, { transaction: t });

    await OrderItem.bulkCreate(lines.map((l) => ({ ...l, order_id: order.id })), { transaction: t });

    for (const l of lines) {
      await ProductVariation.decrement('stock', { by: l.quantity, where: { id: l.variation_id }, transaction: t });
    }

    const pay = (p.payments || [])[0];
    if (pay) {
      try {
        await Payment.create({
          order_id: order.id,
          user_id: null,
          payment_type: isCod ? 'cod' : 'razorpay',
          transaction_id: pay.txn_id || pay.pg_transaction_id || null,
          amount_paid: toSmallestUnit(Number(pay.amount_received ?? pay.amount ?? finalAmount), 'INR'),
          status: String(pay.payment_status || '').toLowerCase() === 'success' ? 'successful' : 'pending',
          // Gateway marks the refund route: these payments refund via the
          // checkout provider's refund API, never our own Razorpay keys.
          payment_gateway: 'CustomCheckout',
          notes: `Custom checkout: platform ${platformId}, cart_id ${p.cart_id || '-'}, gateway ${pay.gateway || '-'}, method ${pay.payment_method || '-'}`,
          brand_id: brandId,
        }, { transaction: t });
      } catch (e) {
        logger.warn(`[custom-checkout] payment record failed for order ${order.order_number}: ${e.message}`);
      }
    }

    logger.info(`[custom-checkout] ingested order ${order.order_number} (platform ${platformId}, brand ${brandId})`);
    const track = {
      brand_id: brandId, order_number: order.order_number,
      total_amount: finalAmount, final_amount: finalAmount, currency: 'INR',
      email: p.email || ship.email || null, phone: phone || null,
      first_name: firstName || null, last_name: lastName || null,
      zip_code: String(ship.pincode || '') || null, city: ship.city || null, state: ship.state || null, country: 'in',
      items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, price: l.price, name: '' })),
    };
    return { created: true, order_number: order.order_number, order_id: order.id, _order: order, _track: track };
  }).then((result) => {
    // After commit: fire the same lifecycle events a native order gets, so the
    // customer receives the WhatsApp confirmation + invoice, abandoned-cart
    // recovery stops, and pickup_hold_until is stamped for the booking batch.
    if (result?._order) {
      const orderEmitter = require('./orderEvents.js');
      const o = result._order;
      const track = result._track;
      setImmediate(() => {
        try { orderEmitter.emit('order.created', o); } catch (e) { logger.warn('[custom-checkout] order.created emit failed: ' + e.message); }
        try { orderEmitter.emit('order.confirmed', o); } catch (e) { logger.warn('[custom-checkout] order.confirmed emit failed: ' + e.message); }
      });
      // Server-side Purchase (Meta CAPI + GA4), event id Purchase_<our order
      // number> — the checkout provider's page can't send a matching browser one.
      if (track) {
        setImmediate(async () => {
          try {
            const { sendFacebookEvent } = require('../integration/facebookPixel.js');
            const { sendGAEvent } = require('../integration/googleAnalytics.js');
            await sendFacebookEvent('Purchase', track);
            await sendGAEvent('purchase', track);
          } catch (e) { logger.warn('[custom-checkout] Purchase analytics failed: ' + e.message); }
        });
      }
      delete result._order;
      delete result._track;
    }
    return result;
  });
}

module.exports = {
  mapProduct, mapProductStrict, mapCollection, productIncludes,
  pushProduct, pushCollection, pushProductAllBrands, pushCollectionAllBrands,
  createCheckoutToken, fetchCheckoutOrder, listCheckoutOrders,
  initiateRefund, refundReports, ingestCheckoutOrder,
};
