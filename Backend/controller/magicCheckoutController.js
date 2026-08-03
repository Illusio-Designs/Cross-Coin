'use strict';

/**
 * Razorpay Magic (one-click) Checkout — TEST controller.
 *
 * Flow (see docs): the storefront asks us to create a Magic order (with
 * line_items + one_click_checkout). Razorpay's modal then collects the phone,
 * OTP and address from its cross-merchant network and, mid-checkout, calls the
 * shipping/coupon callbacks below to get OUR serviceability, shipping fee and
 * coupon rules. After payment we verify the signature and read the chosen
 * address back off the order.
 *
 * Every callback logs its raw request body so that during testing we can see
 * the EXACT payload Razorpay sends and lock the field names down. All callbacks
 * fail OPEN (serviceable / no error) so a hiccup never blocks a real checkout.
 *
 * NOTE: this is the isolated test surface mounted at /api/magic. It does not yet
 * persist orders to the DB — that (and the order.paid webhook) comes once the
 * flow is verified and we wire it into the live checkout.
 */

const razorpayService = require('../services/razorpayService.js');
const settingsHelper = require('../services/settingsHelper');
const { logger } = require('../config/logging.js');
const { ShippingFee } = require('../model/shippingFeeModel.js');
const { Coupon } = require('../model/couponModel.js');
const couponController = require('./couponController.js');

const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise) => Number(paise || 0) / 100;

// Brand resolution: the brand middleware (X-Brand-Name) sets req.brandId for
// calls from the storefront; Razorpay's server-to-server callbacks carry no
// header, so we also accept ?brand_id= baked into the dashboard callback URL,
// and finally default to 1 (Crosscoin) for this test surface.
function resolveBrandId(req) {
  return req.brandId || (req.brand && req.brand.id) || parseInt(req.query.brand_id, 10) || 1;
}

// Brand's shipping fees (prepaid + COD), in paise, with safe fallbacks.
async function getShippingFees(brandId) {
  try {
    const rows = await ShippingFee.findAll({ where: { brand_id: brandId } });
    const byType = {};
    rows.forEach((r) => { byType[r.orderType] = Number(r.fee || 0); });
    return { prepaid: toPaise(byType.prepaid || 0), cod: toPaise(byType.cod || 0) };
  } catch (e) {
    logger.warn('[Magic] shipping fee lookup failed: ' + e.message);
    return { prepaid: 0, cod: 0 };
  }
}

// Reuse the same serviceability endpoint logic the storefront pincode checker
// uses. Fails open (serviceable) on any error — booking is the real gate.
async function checkServiceable(brandId, pincode) {
  try {
    if (!/^\d{6}$/.test(String(pincode || ''))) return { serviceable: true, cod: true };
    const factory = require('../services/shippingProviderFactory');
    let providerName = 'fship';
    let provider;
    try {
      providerName = await factory.getProviderName(brandId);
      provider = await factory.getShippingProvider(brandId);
    } catch {
      provider = require('../services/fshipService');
    }
    const src = await settingsHelper.getSetting(
      brandId,
      providerName === 'ithink' ? 'ITHINK_WAREHOUSE_PINCODE' : 'FSHIP_WAREHOUSE_PINCODE',
      await settingsHelper.getSetting(brandId, 'DEFAULT_WAREHOUSE_PINCODE', '363641')
    );
    const raw = await provider.checkServiceability(src, pincode);
    const { parseServiceability } = require('../utils/serviceability.js');
    const decision = parseServiceability(raw);
    return { serviceable: decision.serviceable !== false, cod: decision.cod_allowed !== false };
  } catch (e) {
    logger.warn('[Magic] serviceability check failed (fail-open): ' + e.message);
    return { serviceable: true, cod: true };
  }
}

// ── 1) Create a Magic Checkout order ──────────────────────────────────────────
// Body: { items: [{ sku, variant_id?, name, price, offer_price?, quantity, image_url? }], amount? }
exports.createMagicOrder = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ success: false, message: 'items are required' });

    const line_items = items.map((it) => ({
      type: 'e-commerce',
      sku: String(it.sku || it.id || ''),
      variant_id: it.variant_id != null ? String(it.variant_id) : undefined,
      price: toPaise(it.price),
      offer_price: toPaise(it.offer_price != null ? it.offer_price : it.price),
      quantity: Number(it.quantity || 1),
      name: it.name || 'Item',
      description: it.description || undefined,
      image_url: it.image_url || undefined,
    }));
    const computed = items.reduce(
      (s, it) => s + Number(it.offer_price != null ? it.offer_price : it.price) * Number(it.quantity || 1),
      0
    );
    const amount = Number(req.body.amount) > 0 ? Number(req.body.amount) : computed;

    const order = await razorpayService.createOrder({
      amount,
      currency: 'INR',
      brandId,
      receipt: `magic_${Date.now()}`,
      notes: { source: 'magic_test', brand_id: String(brandId) },
      line_items,
      line_items_total: toPaise(amount),
      one_click_checkout: true,
    });

    const key_id = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_ID');
    logger.info(`[Magic] created order ${order.id} amount=${order.amount} brand=${brandId}`);
    return res.json({
      success: true,
      key_id,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (e) {
    logger.error('[Magic] createMagicOrder failed: ' + e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ── 2) Shipping / serviceability callback (Razorpay → us) ─────────────────────
// Razorpay sends { addresses: [{ id, zipcode, state, country, ... }] }; we return
// per-address serviceability + shipping fee + COD availability (fees in paise).
exports.shippingInfo = async (req, res) => {
  logger.info('[Magic] shipping-info RAW: ' + JSON.stringify(req.body));
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : [];
  try {
    const brandId = resolveBrandId(req);
    const fees = await getShippingFees(brandId);
    const out = [];
    for (const a of addresses) {
      const zip = String(a.zipcode || a.pincode || a.postal_code || '');
      const s = await checkServiceable(brandId, zip);
      // Razorpay charges `shipping_fee` on BOTH prepaid and COD, and `cod_fee`
      // as an EXTRA only when COD is chosen. This system stores independent flat
      // fees per mode, so COD's extra is the delta (cod − prepaid) — otherwise a
      // brand with a non-zero prepaid fee would double-charge COD shipping.
      out.push({
        id: a.id,
        zipcode: zip,
        serviceable: s.serviceable,
        cod: s.serviceable && s.cod,
        shipping_fee: fees.prepaid,
        cod_fee: Math.max(0, fees.cod - fees.prepaid),
      });
    }
    return res.json({ addresses: out });
  } catch (e) {
    logger.error('[Magic] shipping-info failed (fail-open): ' + e.message);
    return res.json({
      addresses: addresses.map((a) => ({
        id: a.id, zipcode: String(a.zipcode || ''), serviceable: true, cod: true, shipping_fee: 0, cod_fee: 0,
      })),
    });
  }
};

// ── 3) Coupons list callback ──────────────────────────────────────────────────
// Razorpay asks which coupons to surface. We list the brand's active, in-window
// coupons. (Users can also just type a code, which hits applyCoupon below.)
exports.getCoupons = async (req, res) => {
  logger.info('[Magic] coupons RAW: ' + JSON.stringify(req.body));
  try {
    const brandId = resolveBrandId(req);
    const now = new Date();
    const rows = await Coupon.findAll({ where: { brand_id: brandId } });
    const promotions = rows
      .filter((c) => {
        const active = c.status ? c.status === 'active' : true;
        const started = !c.startDate || new Date(c.startDate) <= now;
        const notEnded = !c.endDate || new Date(c.endDate) >= now;
        return active && started && notEnded;
      })
      .map((c) => ({
        code: c.code,
        summary: c.description || c.code,
        description: c.description || '',
      }));
    return res.json({ promotions });
  } catch (e) {
    logger.error('[Magic] getCoupons failed: ' + e.message);
    return res.json({ promotions: [] });
  }
};

// ── 4) Apply-coupon callback ──────────────────────────────────────────────────
// Razorpay sends { code, order_amount (paise), contact, email }. We reuse the
// existing couponController.validateCoupon and translate its response into
// Razorpay's promotion / failure shape (value in paise).
exports.applyCoupon = async (req, res) => {
  logger.info('[Magic] apply-coupon RAW: ' + JSON.stringify(req.body));
  try {
    const brandId = resolveBrandId(req);
    const { code, order_amount, contact, email } = req.body || {};
    const cartTotal = toRupees(order_amount);

    // Invoke the real validator with a captured response. paymentMode is left
    // undefined on purpose: Magic applies the coupon BEFORE the payment method
    // is chosen, and validateCoupon only enforces the mode restriction when a
    // mode is passed — so a COD-only (or prepaid-only) coupon isn't wrongly
    // rejected here; that restriction is re-checked when the order is placed.
    const paymentMode = req.body.payment_mode || req.body.payment_method || undefined;
    const validated = await new Promise((resolve) => {
      const fakeReq = {
        body: { code, cartTotal, paymentMode, cartItems: [], email, guest_email: email, contact },
        brandId, brand: req.brand, headers: req.headers, query: req.query,
      };
      const fakeRes = {
        statusCode: 200,
        status(c) { this.statusCode = c; return this; },
        json(payload) { resolve({ statusCode: this.statusCode, payload }); },
      };
      Promise.resolve(couponController.validateCoupon(fakeReq, fakeRes)).catch((err) =>
        resolve({ statusCode: 500, payload: { success: false, message: err.message } })
      );
    });

    const p = validated.payload || {};
    if (validated.statusCode === 200 && p.success) {
      const valuePaise = toPaise(p.discountAmount);
      return res.json({
        promotion: {
          reference_id: String(p.coupon?.id || code),
          code: p.coupon?.code || code,
          summary: p.coupon?.description || `${code} applied`,
          description: p.coupon?.description || `₹${Number(p.discountAmount).toFixed(2)} off`,
          value: valuePaise,
          value_type: 'fixed_amount',
        },
      });
    }
    return res.json({
      failure_code: 'coupon_not_applicable',
      failure_reason: p.message || 'This coupon is not applicable.',
    });
  } catch (e) {
    logger.error('[Magic] applyCoupon failed: ' + e.message);
    return res.json({ failure_code: 'internal_error', failure_reason: 'Unable to apply coupon right now.' });
  }
};

// ── 5) Verify payment (test) ──────────────────────────────────────────────────
// Verifies the signature and reads the chosen address back off the order so the
// test page can display exactly what Magic returned. Does NOT persist a DB order
// yet (that + the order.paid webhook land when we wire the live flow).
exports.verifyMagicPayment = async (req, res) => {
  try {
    const brandId = resolveBrandId(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    const valid = await razorpayService.verifySignature(
      razorpay_order_id, razorpay_payment_id, razorpay_signature, brandId
    );
    if (!valid) return res.status(400).json({ success: false, message: 'Signature verification failed' });

    let order = null, payment = null;
    try { order = await razorpayService.getOrder(razorpay_order_id, brandId); } catch (e) { logger.warn('[Magic] getOrder failed: ' + e.message); }
    try { payment = await razorpayService.getPayment(razorpay_payment_id, brandId); } catch (e) { logger.warn('[Magic] getPayment failed: ' + e.message); }

    // Magic returns the customer + shipping address on the order and/or payment.
    const address = order?.customer_details?.shipping_address
      || payment?.customer_details?.shipping_address
      || order?.customer_details || null;

    logger.info(`[Magic] verified payment ${razorpay_payment_id} for order ${razorpay_order_id}`);
    return res.json({ success: true, verified: true, address, order, payment });
  } catch (e) {
    logger.error('[Magic] verifyMagicPayment failed: ' + e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};
