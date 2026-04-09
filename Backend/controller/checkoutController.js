'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logging.js');

const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_KEY = (phone) => `otp:checkout:${phone}`;

// Generate a 6-digit OTP
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * POST /api/checkout/phone-otp/send
 * Generates a 6-digit OTP, stores it in Redis, and sends via WhatsApp.
 */
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(String(phone).replace(/\D/g, '').slice(-10))) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    const normalised = String(phone).replace(/\D/g, '').slice(-10);
    const otp = generateOtp();

    // Store in Redis with TTL
    const redisService = require('../services/redisService.js');
    await redisService.set(OTP_KEY(normalised), otp, 'EX', OTP_TTL_SECONDS);

    // Send via WhatsApp (fire-and-forget — don't block response on delivery)
    setImmediate(async () => {
      try {
        const whatsappService = require('../services/whatsappService.js');
        const e164 = `91${normalised}`;
        await whatsappService.sendTextMessage(
          e164,
          `Your Cross Coin verification code is *${otp}*. Valid for 10 minutes. Do not share this with anyone.`,
          1
        );
        logger.info(`OTP sent to ${normalised}`);
      } catch (err) {
        logger.warn(`OTP WhatsApp send failed for ${normalised}: ${err.message}`);
      }
    });

    res.json({ success: true, message: 'OTP sent to your WhatsApp number.' });
  } catch (error) {
    logger.error('sendPhoneOtp error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

/**
 * POST /api/checkout/phone-otp/verify
 * Verifies the OTP and returns a short-lived signed token on success.
 */
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Phone and code are required.' });
    }

    const normalised = String(phone).replace(/\D/g, '').slice(-10);
    const redisService = require('../services/redisService.js');
    const stored = await redisService.get(OTP_KEY(normalised));

    if (!stored) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }

    if (String(code).trim() !== stored) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // Delete OTP after successful verification (one-time use)
    await redisService.del(OTP_KEY(normalised));

    // Issue a short-lived token (10 min) so the backend can optionally validate it on order creation
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
const { toSmallestUnit } = require('../utils/amountConverter.js');
const { setImmediate } = require('timers');
const { sendFacebookEvent } = require('../integration/facebookPixel.js');
const { sendGAEvent } = require('../integration/googleAnalytics.js');

const PHONE_REGEX = /^[6-9]\d{9}$/;

// ── Helpers ───────────────────────────────────────────────────────────────

async function computeCouponDiscount(couponId, subTotal) {
  const { Coupon } = require('../model/couponModel.js');
  if (!couponId) return 0;
  const coupon = await Coupon.findByPk(couponId);
  if (!coupon || coupon.status !== 'active') return 0;
  if (coupon.minOrderAmount && subTotal < parseFloat(coupon.minOrderAmount)) return 0;
  if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) return 0;

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = subTotal * (parseFloat(coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount) discount = Math.min(discount, parseFloat(coupon.maxDiscountAmount));
  } else {
    discount = parseFloat(coupon.discountValue);
  }
  return Math.min(discount, subTotal);
}

async function calcShippingFee(paymentType, brandId = 1) {
  const { ShippingFee } = require('../model/shippingFeeModel.js');
  const fee = await ShippingFee.findOne({ where: { brand_id: brandId } });
  if (!fee) return 0;
  if (paymentType === 'cod') return parseFloat(fee.cod_fee || 0);
  return parseFloat(fee.prepaid_fee || 0);
}

async function batchFetchProducts(productIds) {
  const products = await Product.findAll({ where: { id: productIds } });
  const map = new Map();
  products.forEach(p => map.set(p.id, p));
  return map;
}

async function batchFetchVariations(variationIds) {
  if (!variationIds.length) return new Map();
  const variations = await ProductVariation.findAll({ where: { id: variationIds } });
  const map = new Map();
  variations.forEach(v => map.set(v.id, v));
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
    if (shippingAddress.phone && !PHONE_REGEX.test(String(shippingAddress.phone).replace(/\D/g, '').slice(-10))) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number on your delivery address.' });
    }

    // Validate items + calculate totals
    const productIds = items.map(i => i.product_id);
    const variationIds = items.filter(i => i.variation_id).map(i => i.variation_id);
    const [productMap, variationMap, variationsByProductMap] = await Promise.all([
      batchFetchProducts(productIds), batchFetchVariations(variationIds), batchFetchVariationsByProductIds(productIds),
    ]);

    let totalAmount = 0;
    const validatedItems = [];

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

      const price = parseFloat(variation.price);
      const subtotal = price * quantity;
      totalAmount += subtotal;
      validatedItems.push({ product_id, variation_id: variation.id, quantity, price, discount: 0, subtotal });
    }

    const subTotal = Number(totalAmount);
    const appliedDiscount = discount_amount ? Number(discount_amount) : 0;
    const shippingFee = Number(await calcShippingFee(payment_type, brandId));
    const finalAmount = subTotal - appliedDiscount + shippingFee;

    // Server-side discount verification
    const PREPAID_DISCOUNT = parseFloat(await settingsHelper.getSetting(brandId, 'PREPAID_INSTANT_DISCOUNT', '50'));
    if (appliedDiscount > 0 && !coupon_id && appliedDiscount > PREPAID_DISCOUNT + 1) {
      return res.status(400).json({ success: false, message: 'Invalid discount amount.' });
    }
    if (coupon_id) {
      const serverDiscount = await computeCouponDiscount(coupon_id, subTotal);
      if (Math.abs(appliedDiscount - (serverDiscount + PREPAID_DISCOUNT)) > 1) {
        return res.status(400).json({ success: false, message: 'Order total mismatch. Please refresh and try again.' });
      }
    }
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
      shipping_address_id, payment_type: payment_type || 'razorpay', coupon_id: coupon_id || null,
      notes: notes || null, brand_id: brandId, utm_tracking_id: utmTrackingId,
      idempotency_key: idempotency_key || null,
      totals: { subtotal: subTotal, discount: appliedDiscount, shipping: shippingFee, final: finalAmount },
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
          fbc: req.cookies?._fbc || req.body?.fbc || null, fbp: req.cookies?._fbp || null,
          items: validatedItems,
        };
        await sendFacebookEvent('InitiateCheckout', eventPayload);
        await sendGAEvent('begin_checkout', eventPayload);
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
    const { phone, email, firstName, lastName, ...checkoutData } = req.body;
    if (!phone || !email || !firstName) {
      return res.status(400).json({ success: false, message: 'Phone, email, and first name are required for guest checkout.' });
    }

    const normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);

    let user = await User.findOne({ where: { phone: { [require('sequelize').Op.like]: `%${normalizedPhone}` } } });
    if (!user) {
      user = await User.create({
        username: `${firstName} ${lastName || ''}`.trim(), email, phone: normalizedPhone,
        role: 'user', password: require('crypto').randomBytes(16).toString('hex'),
      });
      logger.info(`Guest checkout: created user ${user.id} for phone ${normalizedPhone}`);
    }

    let guestUser = await GuestUser.findOne({ where: { phone: normalizedPhone } });
    if (!guestUser) {
      guestUser = await GuestUser.create({ firstName, lastName, email, phone: normalizedPhone });
    }

    req.user = user;
    req.body = { ...checkoutData, guest_user_id: guestUser.id };
    return exports.initiateCheckout(req, res);
  } catch (error) {
    logger.error('initiateGuestCheckout error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
