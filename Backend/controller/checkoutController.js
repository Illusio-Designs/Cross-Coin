'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { logger } = require('../config/logging.js');

/**
 * POST /api/auth/otp/send
 * MSG91 widget handles OTP sending on the frontend.
 * This endpoint is a no-op placeholder kept for route compatibility.
 */
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(String(phone).replace(/\D/g, '').slice(-10))) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit Indian mobile number.' });
    }
    res.json({ success: true, message: 'Use the MSG91 widget to send OTP.' });
  } catch (error) {
    logger.error('sendPhoneOtp error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process request.' });
  }
};

/**
 * POST /api/auth/otp/verify
 * Verifies the MSG91 access token returned by the widget with MSG91 and checks
 * it was issued for THIS phone number (utils/msg91Verify.js).
 */
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, access_token } = req.body;
    if (!phone || !access_token) {
      return res.status(400).json({ success: false, message: 'Phone and access_token are required.' });
    }

    const normalised = String(phone).replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(normalised)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });
    }

    const check = await require('../utils/msg91Verify.js').verifyMsg91Token(access_token, normalised, 'Checkout OTP');
    const tokenValid = check.ok;

    if (!tokenValid) {
      return res.status(401).json({ success: false, message: 'OTP verification failed. Please try again.' });
    }

    // Issue a short-lived token (10 min) for COD order creation
    const secret = process.env.JWT_SECRET || 'crosscoin-otp-secret';
    const otp_token = jwt.sign({ phone: normalised, purpose: 'cod_checkout' }, secret, { expiresIn: '10m' });

    res.json({ success: true, otp_token });
  } catch (error) {
    logger.error('verifyPhoneOtp error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify OTP. Please try again.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// Payment-First Checkout Flow (Prepaid)
// Reserve stock → Pay → Create order after payment confirmed
// ══════════════════════════════════════════════════════════════════════════════

const { sequelize } = require('../config/db.js');
const { Product } = require('../model/productModel.js');
const { ProductVariation } = require('../model/productVariationModel.js');
const { ShippingAddress } = require('../model/shippingAddressModel.js');
const { Payment } = require('../model/paymentModel.js');
const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const razorpayService = require('../services/razorpayService.js');
const stockReservation = require('../services/stockReservationService.js');
const settingsHelper = require('../services/settingsHelper.js');
const { verifyOrderCoupon } = require('../services/couponRulesService.js');
const { toSmallestUnit } = require('../utils/amountConverter.js');
const { setImmediate } = require('timers');

const PHONE_REGEX = /^[6-9]\d{9}$/;

// ── Helpers ───────────────────────────────────────────────────────────────

// Same rule as the COD flow and the storefront drawers (shippingService).
async function calcShippingFee(paymentType, brandId = 1, subtotal = 0) {
  return require('../services/shippingService.js').computeShippingFee({ orderType: paymentType, subtotal, brandId });
}

async function batchFetchProducts(productIds) {
  const ids = [...new Set((productIds || []).map(Number).filter(id => !isNaN(id)))];
  if (!ids.length) return new Map();
  const products = await Product.findAll({ where: { id: ids } });
  const map = new Map();
  products.forEach(p => { map.set(p.id, p); map.set(String(p.id), p); });
  return map;
}

async function batchFetchVariations(variationIds) {
  const ids = [...new Set((variationIds || []).map(Number).filter(id => !isNaN(id)))];
  if (!ids.length) return new Map();
  const variations = await ProductVariation.findAll({ where: { id: ids } });
  const map = new Map();
  variations.forEach(v => { map.set(v.id, v); map.set(String(v.id), v); });
  return map;
}

async function batchFetchVariationsByProductIds(productIds) {
  const variations = await ProductVariation.findAll({ where: { productId: productIds } });
  const map = new Map();
  variations.forEach(v => {
    if (!map.has(v.productId)) map.set(v.productId, []);
    map.get(v.productId).push(v);
  });
  return map;
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/checkout/initiate
// ══════════════════════════════════════════════════════════════════════════════

exports.initiateCheckout = async (req, res) => {
  try {
    const {
      shipping_address_id, items, payment_type, notes,
      coupon_id, discount_amount, utm_session_id, idempotency_key,
    } = req.body;
    const userId = req.user.id;
    const brandId = req.brand ? req.brand.id : 1;

    if (!shipping_address_id || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Shipping address and items are required.' });
    }
    if (payment_type === 'cod') {
      return res.status(400).json({ success: false, message: 'COD orders should use POST /api/orders. This endpoint is for prepaid only.' });
    }

    // Idempotency
    if (idempotency_key) {
      const redisService = require('../services/redisService.js');
      if (redisService.isReady()) {
        const existing = await redisService.get(`checkout:idem:${idempotency_key}`);
        if (existing) {
          const session = JSON.parse(existing);
          return res.status(200).json({
            success: true, message: 'Checkout session already exists',
            razorpay_order: { id: session.razorpay_order_id, amount: session.totals.final * 100 },
            reservation_id: session.reservation_id, expires_in: stockReservation.RESERVATION_TTL,
          });
        }
      }
    }

    // Validate shipping address
    const shippingAddress = await ShippingAddress.findOne({ where: { id: shipping_address_id, user_id: userId } });
    if (!shippingAddress) return res.status(404).json({ success: false, message: 'Shipping address not found.' });

    // ── Comprehensive shipping address validation ─────────────────────────
    const { validateShippingAddress } = require('../services/shippingValidationService');
    const addrValidation = validateShippingAddress({
      full_name: shippingAddress.full_name,
      address: shippingAddress.address,
      landmark: shippingAddress.landmark,
      city: shippingAddress.city,
      state: shippingAddress.state,
      pincode: shippingAddress.pincode,
      phone: shippingAddress.phone,
    });

    if (!addrValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address has issues that will cause delivery failure',
        errors: addrValidation.errors,
        warnings: addrValidation.warnings,
      });
    }

    // Validate pincode serviceability before proceeding
    if (shippingAddress.pincode) {
      try {
        const factory = require('../services/shippingProviderFactory');
        const provider = await factory.getShippingProvider(brandId); // always iThink
        const warehousePincode = await settingsHelper.getSetting(brandId, 'ITHINK_WAREHOUSE_PINCODE',
          await settingsHelper.getSetting(brandId, 'DEFAULT_WAREHOUSE_PINCODE', '363641'));
        const raw = await provider.checkServiceability(warehousePincode, shippingAddress.pincode.trim());
        const { extractIThinkCouriers } = require('../utils/serviceability.js');
        if (extractIThinkCouriers(raw).length === 0) {
          return res.status(400).json({ success: false, message: 'Sorry, delivery is not available for this pincode. Please use a different address.' });
        }
      } catch (svcErr) {
        logger.warn('Pincode serviceability check failed (allowing order):', svcErr.message);
        // Allow order to proceed if serviceability API is down — booking will catch it later
      }
    }

    // Validate items + calculate totals
    const productIds = items.map(i => i.product_id);
    const variationIds = items.filter(i => i.variation_id).map(i => i.variation_id);
    const [productMap, variationMap, variationsByProductMap] = await Promise.all([
      batchFetchProducts(productIds), batchFetchVariations(variationIds), batchFetchVariationsByProductIds(productIds),
    ]);

    let totalAmount = 0;
    const validatedItems = [];

    // Pack-aware bundle pricing: price each pack line (lines sharing a pack_id)
    // by the pack group's TOTAL quantity, summed server-side — so a mixed-colour
    // pack still gets the pack rate and a lone line can't fake it.
    const packQtyById = {};
    for (const it of items) { if (it.pack_id) packQtyById[it.pack_id] = (packQtyById[it.pack_id] || 0) + (Number(it.quantity) || 0); }
    const pricingQty = (it) => (it.pack_id && packQtyById[it.pack_id]) ? packQtyById[it.pack_id] : it.quantity;

    // "Build Your Pack" (cross-product mix): lines sharing a `pack_group` get a
    // percentage off the whole group, scaled by the group's TOTAL item count —
    // computed server-side from the store-wide tiers so the client can't fake
    // the discount. Inert when no line carries a pack_group.
    const _bundleCtrl = require('./bundleController.js');
    const mixQtyByGroup = {};
    for (const it of items) { if (it.pack_group) mixQtyByGroup[it.pack_group] = (mixQtyByGroup[it.pack_group] || 0) + (Number(it.quantity) || 0); }
    const mixPctByGroup = {};
    for (const g of Object.keys(mixQtyByGroup)) { mixPctByGroup[g] = await _bundleCtrl.packDiscountPercent(brandId, mixQtyByGroup[g]); }

    for (const item of items) {
      const { product_id, quantity } = item;
      let { variation_id } = item;
      if (!product_id || !quantity || quantity < 1) {
        return res.status(400).json({ success: false, message: 'Product ID and quantity (≥1) are required for each item.' });
      }
      const product = productMap.get(product_id);
      if (!product) return res.status(404).json({ success: false, message: `Product ${product_id} not found.` });

      let variation;
      if (variation_id) {
        variation = variationMap.get(variation_id);
        if (!variation || variation.productId !== product_id) return res.status(404).json({ success: false, message: `Invalid variation for product ${product_id}.` });
      } else {
        const variations = variationsByProductMap.get(product_id) || [];
        if (!variations.length) return res.status(400).json({ success: false, message: `Product ${product_id} has no variations.` });
        variation = variations[0];
        variation_id = variation.id;
      }

      const available = await stockReservation.getAvailableStock(variation.id, variation.stock);
      if (available < quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for "${product.name}". Available: ${available}, requested: ${quantity}.`, product_id, variation_id: variation.id, available });
      }

      let price = parseFloat(variation.price);
      if (item.pack_group && mixPctByGroup[item.pack_group] > 0) {
        // Build-Your-Pack line: apply the group's % off (mutually exclusive with
        // the per-product exact-price pack path below).
        price = Math.round(price * (1 - mixPctByGroup[item.pack_group] / 100) * 100) / 100;
      } else {
        const _bu = await _bundleCtrl.bundlePerUnit(brandId, product_id, pricingQty(item));
        if (_bu != null) price = _bu;
      }
      const subtotal = price * quantity;
      totalAmount += subtotal;
      validatedItems.push({ product_id, variation_id: variation.id, quantity, price, discount: 0, subtotal, pack_id: item.pack_id || null });
    }

    const subTotal = Number(totalAmount);
    const appliedDiscount = discount_amount ? Number(discount_amount) : 0;
    const shippingFee = Number(await calcShippingFee(payment_type, brandId, subTotal));
    const finalAmount = Math.round(subTotal - appliedDiscount + shippingFee);

    // Server-side discount verification
    const PREPAID_DISCOUNT = parseFloat(await settingsHelper.getSetting(brandId, 'PREPAID_INSTANT_DISCOUNT', '50'));
    if (appliedDiscount > 0 && !coupon_id && appliedDiscount > PREPAID_DISCOUNT + 1) {
      return res.status(400).json({ success: false, message: 'Invalid discount amount.' });
    }
    // One rule set (services/couponRulesService.js) — dates, store, payment mode,
    // total + per-customer limits, first order, works-on lines, minimum, amount on
    // the eligible lines (tiered / quantity coupons included). Coupon and the
    // prepaid instant discount DON'T stack, so the client's discount must equal
    // the coupon's. A coupon with no discount claimed isn't attached.
    const couponCheck = await verifyOrderCoupon({
      couponId: coupon_id, appliedDiscount, items: validatedItems, subtotal: subTotal,
      userId, paymentType: payment_type || 'razorpay', brandId,
    });
    if (!couponCheck.ok) return res.status(couponCheck.status).json({ success: false, message: couponCheck.message });
    if (finalAmount <= 0) return res.status(400).json({ success: false, message: 'Order total must be greater than zero.' });

    // UTM tracking
    let utmTrackingId = null;
    const sessionId = utm_session_id || req.cookies?.session_id;
    if (sessionId) {
      try {
        const UTMTracking = require('../model/utmModel.js');
        const utmRecord = await UTMTracking.findOne({ where: { session_id: sessionId }, order: [['created_at', 'DESC']] });
        if (utmRecord) utmTrackingId = utmRecord.id;
      } catch (e) { logger.warn('UTM lookup failed:', e.message); }
    }

    // Reserve stock
    const { reservationId, expiresIn } = await stockReservation.reserveStock(userId, validatedItems, {
      shipping_address_id, payment_type: payment_type || 'razorpay', coupon_id: couponCheck.couponId,
      notes: notes || null, brand_id: brandId, utm_tracking_id: utmTrackingId,
      idempotency_key: idempotency_key || null,
      totals: { subtotal: subTotal, discount: appliedDiscount, shipping: shippingFee, final: finalAmount },
      // Browser ids for the server-side Purchase sent after Razorpay confirms
      // (the webhook path has no browser request to read them from).
      tracking: {
        fbp: req.body?.fbp || req.cookies?._fbp || null,
        fbc: req.body?.fbc || req.cookies?._fbc || null,
        ga_client_id: req.body?.ga_client_id || null,
        marketing_consent: req.body?.marketing_consent,
        consent_session_id: req.cookies?.session_id || null,
      },
    });

    // Create Razorpay order
    const rzpOrder = await razorpayService.createOrder({
      amount: finalAmount, currency: 'INR', receipt: reservationId,
      notes: { reservation_id: reservationId, user_id: String(userId), shipping_address_id: String(shipping_address_id) },
      brandId,
    });

    await stockReservation.linkRazorpayOrder(rzpOrder.id, reservationId);

    // Store pending payment record (no order_id yet)
    await Payment.create({
      order_id: null, user_id: userId, payment_type: 'razorpay',
      razorpay_order_id: rzpOrder.id, amount_paid: toSmallestUnit(finalAmount, 'INR'),
      status: 'pending', payment_gateway: 'Razorpay', brand_id: brandId, reservation_id: reservationId,
    });

    // Idempotency store
    if (idempotency_key) {
      const redisService = require('../services/redisService.js');
      if (redisService.isReady()) {
        const session = await stockReservation.getReservation(reservationId);
        await redisService.set(`checkout:idem:${idempotency_key}`, JSON.stringify(session), 'EX', stockReservation.RESERVATION_TTL);
      }
    }

    res.json({
      success: true,
      razorpay_order: { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency },
      reservation_id: reservationId, expires_in: expiresIn,
      totals: { subtotal: subTotal, discount: appliedDiscount, shipping: shippingFee, final: finalAmount },
    });

    // Analytics (non-blocking)
    setImmediate(async () => {
      try {
        const eventPayload = {
          brand_id: brandId, order_number: reservationId, total_amount: finalAmount,
          final_amount: finalAmount, currency: 'INR', ip_address: req.ip || null,
          user_agent: req.headers['user-agent'] || null,
          fbc: req.body?.fbc || req.cookies?._fbc || null, fbp: req.body?.fbp || req.cookies?._fbp || null,
          items: validatedItems,
        };
        // InitiateCheckout is sent (deduped) by the browser pixel + its CAPI
        // relay when checkout begins — don't re-send it server-side here.
      } catch (err) { logger.warn('Analytics InitiateCheckout error:', err.message); }
    });
  } catch (error) {
    logger.error('initiateCheckout error:', error.message);
    res.status(error.message.includes('Insufficient stock') ? 409 : 500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/checkout/retry
// ══════════════════════════════════════════════════════════════════════════════

exports.retryCheckout = async (req, res) => {
  try {
    const { reservation_id } = req.body;
    const userId = req.user.id;

    if (!reservation_id) return res.status(400).json({ success: false, message: 'reservation_id is required.' });

    const session = await stockReservation.getReservation(reservation_id);
    if (!session) {
      return res.status(410).json({ success: false, message: 'Checkout session expired. Please start a new checkout.', code: 'SESSION_EXPIRED' });
    }
    if (session.user_id !== userId) return res.status(403).json({ success: false, message: 'Access denied.' });

    // Re-validate stock
    for (const item of session.items) {
      const variation = await ProductVariation.findByPk(item.variation_id, { attributes: ['id', 'stock'] });
      if (!variation) {
        await stockReservation.releaseReservation(reservation_id);
        return res.status(409).json({ success: false, message: `Product variation ${item.variation_id} no longer available.`, code: 'STOCK_CHANGED' });
      }
      const totalReserved = await stockReservation.getReservedQty(item.variation_id);
      if (variation.stock < totalReserved) {
        await stockReservation.releaseReservation(reservation_id);
        return res.status(409).json({ success: false, message: 'Insufficient stock. Please start a new checkout.', code: 'STOCK_CHANGED' });
      }
    }

    await stockReservation.extendReservation(reservation_id);

    const brandId = session.brand_id || 1;
    const finalAmount = session.totals.final;

    const rzpOrder = await razorpayService.createOrder({
      amount: finalAmount, currency: 'INR', receipt: reservation_id,
      notes: { reservation_id, user_id: String(userId), shipping_address_id: String(session.shipping_address_id), retry: 'true' },
      brandId,
    });

    await stockReservation.linkRazorpayOrder(rzpOrder.id, reservation_id);

    await Payment.create({
      order_id: null, user_id: userId, payment_type: 'razorpay',
      razorpay_order_id: rzpOrder.id, amount_paid: toSmallestUnit(finalAmount, 'INR'),
      status: 'pending', payment_gateway: 'Razorpay', brand_id: brandId, reservation_id,
    });

    res.json({
      success: true, message: 'New payment session created. Please complete payment.',
      razorpay_order: { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency },
      reservation_id, expires_in: stockReservation.RETRY_EXTEND_TTL,
    });
  } catch (error) {
    logger.error('retryCheckout error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/checkout/guest/initiate
// ══════════════════════════════════════════════════════════════════════════════

exports.initiateGuestCheckout = async (req, res) => {
  try {
    // Accept the guest identity in two shapes for backward compat:
    //
    //   1. Nested:  { guest_info: { email, firstName, lastName, phone }, ... }
    //   2. Flat:    { email, firstName, lastName, phone, ... }
    //
    // The current guest schema requires the nested form; older clients
    // sent flat fields, and we don't want to break those during the
    // rollout window. Fields read from guest_info take precedence
    // (since that's the documented shape going forward).
    const gi = req.body.guest_info || {};
    const phone     = gi.phone     ?? req.body.phone;
    const email     = gi.email     ?? req.body.email;
    const firstName = gi.firstName ?? req.body.firstName;
    const lastName  = gi.lastName  ?? req.body.lastName ?? '';

    if (!phone || !email || !firstName) {
      return res.status(400).json({
        success: false,
        message: 'Phone, email, and first name are required for guest checkout.',
      });
    }

    // Build checkoutData by stripping the guest identity (in BOTH shapes)
    // from the body — what's left is the actual checkout payload that
    // gets forwarded to initiateCheckout.
    const {
      guest_info: _gi, phone: _p, email: _e, firstName: _fn, lastName: _ln,
      ...checkoutData
    } = req.body;

    const normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
    const { Op } = require('sequelize');
    const brandId = req.brandId || (req.brand && req.brand.id) || 1;

    // Brand-scoped consumer: each storefront has its own consumer namespace, so
    // match within this brand only. A same-phone/email shopper on another brand
    // stays a separate account.
    let user = await User.findOne({
      where: {
        source_brand_id: brandId,
        [Op.or]: [{ phone: { [Op.like]: `%${normalizedPhone}` } }, { email }],
      },
    });
    if (!user) {
      const baseName = `${firstName} ${lastName || ''}`.trim() || 'Guest';
      try {
        user = await User.create({
          username: baseName,
          email,
          phone: normalizedPhone,
          role: 'consumer',
          source_brand_id: brandId,
          password: require('crypto').randomBytes(16).toString('hex'),
        });
        logger.info(`Guest checkout: created user ${user.id} for phone ${normalizedPhone} on brand ${brandId}`);
      } catch (createErr) {
        // Pre-isolation schema (global unique on phone/email) → reuse the
        // existing account for this phone/email so checkout never breaks.
        logger.warn(`Guest checkout: create fell back to existing account: ${createErr.message}`);
        user = await User.findOne({
          where: { [Op.or]: [{ phone: { [Op.like]: `%${normalizedPhone}` } }, { email }] },
        });
        if (!user) throw createErr;
        if (!user.source_brand_id) await user.update({ source_brand_id: brandId });
      }
    }

    let guestUser = await GuestUser.findOne({ where: { phone: normalizedPhone } });
    if (!guestUser) {
      guestUser = await GuestUser.create({ firstName, lastName, email, phone: normalizedPhone });
    }

    req.user = user;
    req.body = { ...checkoutData, guest_user_id: guestUser.id };

    // For guest checkout, create/find shipping address linked to the new user
    if (checkoutData.shipping_address && !checkoutData.shipping_address_id) {
      const addr = checkoutData.shipping_address;
      const shippingAddress = await ShippingAddress.create({
        user_id: user.id,
        guest_user_id: guestUser.id,
        full_name: addr.fullName || `${firstName} ${lastName || ''}`.trim(),
        phone: addr.phone || normalizedPhone,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country || 'India',
      });
      req.body.shipping_address_id = shippingAddress.id;
      logger.info(`Guest checkout: created shipping address ${shippingAddress.id} for user ${user.id}`);
    }

    return exports.initiateCheckout(req, res);
  } catch (error) {
    logger.error('initiateGuestCheckout error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
