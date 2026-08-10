'use strict';

/**
 * Order Creation Service — creates an order from a checkout session
 * after payment is confirmed (Payment-First flow).
 *
 * Used by:
 *   - paymentController.updateOrderPayment (client-side verify)
 *   - paymentController.razorpayCallback (server redirect)
 *   - paymentController.razorpayWebhook (server-to-server)
 *
 * This is the ONLY place where orders are created for prepaid payments.
 */

const { logger } = require('../config/logging.js');
const { sequelize } = require('../config/db.js');
const { Transaction, Op } = require('sequelize');
const { Order } = require('../model/orderModel.js');
const Brand = require('../model/brandModel.js');
const { OrderItem } = require('../model/orderItemModel.js');
const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
const { Payment } = require('../model/paymentModel.js');
const { ProductVariation } = require('../model/productVariationModel.js');
const { Cart } = require('../model/cartModel.js');
const { CartItem } = require('../model/cartItemModel.js');
const stockReservation = require('./stockReservationService.js');
const orderEmitter = require('./orderEvents.js');
const crypto = require('crypto');
const { setImmediate } = require('timers');

// The Order.payment_type column is an ENUM('cod','credit_card','debit_card',
// 'upi','wallet','razorpay'). Checkout can send the storefront term 'prepaid'
// (allowed by the checkout zod schema), which is NOT a valid ENUM value — on a
// non-strict MySQL it silently stores as '' and the dashboard shows "N/A".
// Normalise anything that isn't a valid ENUM to a safe value: COD stays COD,
// everything else (incl. 'prepaid') becomes 'razorpay'.
const VALID_PAYMENT_TYPES = ['cod', 'credit_card', 'debit_card', 'upi', 'wallet', 'razorpay'];
function normalizeOrderPaymentType(pt) {
  const t = String(pt || '').toLowerCase();
  if (t === 'cod') return 'cod';
  return VALID_PAYMENT_TYPES.includes(t) ? t : 'razorpay';
}

// ── Order number generator (single source of truth — orderController imports this) ──
// Brand slug → order-number prefix. Add a line here when a new brand goes
// live. Slugs are the lowercase X-Brand-Name values (see brandMiddleware).
// Anything not listed — or an order with no brand context — falls back to
// DEFAULT_ORDER_PREFIX, so Crosscoin and legacy orders keep the "CC-" format.
const BRAND_ORDER_PREFIXES = {
  crosscoin: 'CC',
  knitwink: 'KW',
  velmique: 'VM',
  velquira: 'VQ',
  gripzus: 'GZ',
  morbix: 'MX',
  soxbae: 'SB',
};
const DEFAULT_ORDER_PREFIX = 'CC';

// brandId → prefix cache so we resolve the slug from the DB at most once
// per brand instead of on every order.
const _brandPrefixCache = new Map();

async function resolveOrderPrefix(brandId) {
  if (!brandId) return DEFAULT_ORDER_PREFIX;
  if (_brandPrefixCache.has(brandId)) return _brandPrefixCache.get(brandId);
  try {
    const brand = await Brand.findByPk(brandId, { attributes: ['slug'] });
    const slug = brand?.slug?.toLowerCase();
    if (slug && BRAND_ORDER_PREFIXES[slug]) {
      // Only ever cache a REAL hit. Caching the fallback would be a footgun:
      // a single transient DB error (or a not-yet-mapped slug) on the first
      // lookup for a brand would pin it to "CC" for the whole process life —
      // which is exactly how a Morbix (MX) order ended up numbered "CC-…".
      const prefix = BRAND_ORDER_PREFIXES[slug];
      _brandPrefixCache.set(brandId, prefix);
      return prefix;
    }
    logger.warn(`resolveOrderPrefix: brand ${brandId} slug "${slug}" not in prefix map — using default (not cached)`);
  } catch (err) {
    logger.warn(`resolveOrderPrefix: lookup failed for brand ${brandId} — using default (not cached): ${err.message}`);
  }
  // Unmatched slug or lookup error → default, but do NOT cache, so the next
  // order retries the lookup instead of being stuck on the fallback forever.
  return DEFAULT_ORDER_PREFIX;
}

function generateOrderNumber(prefix = DEFAULT_ORDER_PREFIX) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

async function generateUniqueOrderNumber(transaction, brandId) {
  const prefix = await resolveOrderPrefix(brandId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = generateOrderNumber(prefix);
    const existing = await Order.findOne({
      where: { order_number: orderNumber },
      ...(transaction ? { transaction } : {}),
    });
    if (!existing) return orderNumber;
  }
  // Fallback: timestamp-based to guarantee uniqueness
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Create an order from a confirmed payment + checkout session.
 *
 * @param {object} params
 * @param {object} params.session - Checkout session from Redis
 * @param {string} params.razorpayPaymentId - Razorpay payment ID
 * @param {string} params.razorpayOrderId - Razorpay order ID
 * @param {string} params.razorpaySignature - Razorpay signature (optional for webhook)
 * @param {string} params.source - 'verify' | 'callback' | 'webhook'
 * @returns {object} { order, payment, created: true }
 */
async function createOrderFromSession({
  session,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature = null,
  source = 'verify',
}) {
  const { toSmallestUnit } = require('../utils/amountConverter.js');

  return sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  }, async (t) => {
    // ── Idempotency: check if order already created for this reservation ──
    if (session.idempotency_key) {
      const existing = await Order.findOne({
        where: { idempotency_key: session.idempotency_key },
        transaction: t,
      });
      if (existing) {
        logger.info(`[OrderCreation] Order already exists for idempotency key: ${session.idempotency_key}`);
        return { order: existing, created: false };
      }
    }

    // Also check by reservation_id via payment record
    const existingPayment = await Payment.findOne({
      where: { reservation_id: session.reservation_id, order_id: { [require('sequelize').Op.ne]: null } },
      transaction: t,
    });
    if (existingPayment) {
      const existingOrder = await Order.findByPk(existingPayment.order_id, { transaction: t });
      if (existingOrder) {
        logger.info(`[OrderCreation] Order already exists for reservation: ${session.reservation_id}`);
        return { order: existingOrder, created: false };
      }
    }

    // ── Calculate RTO risk score ─────────────────────────────────────────
    let rtoRiskScore = 0;
    if (session.user_id) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const rtoCount = await Order.count({
        where: {
          user_id: session.user_id,
          // Real returns land on 'rto' / 'rto delivered' (courier webhook),
          // not only 'returned_rto' — count all so the score actually rises.
          status: { [Op.in]: ['rto', 'rto delivered', 'returned_rto'] },
          createdAt: { [Op.gte]: sixMonthsAgo },
        },
        transaction: t,
      });
      if (rtoCount >= 1) rtoRiskScore += 20;
    }
    if (session.shipping_address_id) {
      const { ShippingAddress } = require('../model/shippingAddressModel.js');
      const addr = await ShippingAddress.findByPk(session.shipping_address_id, { transaction: t });
      if (addr && String(addr.address || '').trim().length < 30) rtoRiskScore += 10;
    }

    // ── Create order ──────────────────────────────────────────────────────
    const order = await Order.create({
      order_number: await generateUniqueOrderNumber(t, session.brand_id || 1),
      user_id: session.user_id,
      guest_user_id: session.guest_user_id || null,
      total_amount: session.totals.subtotal,
      discount_amount: session.totals.discount,
      coupon_id: session.coupon_id || null,
      shipping_fee: session.totals.shipping,
      final_amount: session.totals.final,
      payment_type: normalizeOrderPaymentType(session.payment_type),
      payment_status: 'paid',
      status: 'confirmed',
      notes: session.notes || null,
      shipping_address_id: session.shipping_address_id,
      utm_tracking_id: session.utm_tracking_id || null,
      brand_id: session.brand_id || 1,
      rto_risk_score: rtoRiskScore,
      idempotency_key: session.idempotency_key || null,
    }, { transaction: t });

    // ── Create order items ────────────────────────────────────────────────
    const orderItemsData = session.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      subtotal: item.subtotal,
    }));

    await OrderItem.bulkCreate(orderItemsData, { transaction: t });

    // ── Deduct stock permanently ──────────────────────────────────────────
    for (const item of session.items) {
      await ProductVariation.decrement('stock', {
        by: item.quantity,
        where: { id: item.variation_id },
        transaction: t,
      });
    }

    // ── Record coupon usage ───────────────────────────────────────────────
    if (session.coupon_id && session.totals.discount > 0) {
      const { Coupon, CouponUsage } = require('../model/associations.js');
      const coupon = await Coupon.findByPk(session.coupon_id, { transaction: t });
      if (coupon) {
        await CouponUsage.create({
          couponId: session.coupon_id,
          userId: session.user_id,
          guestUserId: session.guest_user_id || null,
          orderId: order.id,
          discountAmount: session.totals.discount,
        }, { transaction: t });
        await coupon.increment('usageCount', { by: 1, transaction: t });
      }
    }

    // ── Update payment record ─────────────────────────────────────────────
    const amountInSmallestUnit = toSmallestUnit(parseFloat(session.totals.final), 'INR');

    // Find the pending payment for this razorpay order
    let payment = await Payment.findOne({
      where: { razorpay_order_id: razorpayOrderId },
      transaction: t,
    });

    if (!payment) {
      payment = await Payment.findOne({
        where: { reservation_id: session.reservation_id, status: 'pending' },
        transaction: t,
      });
    }

    if (payment) {
      await payment.update({
        order_id: order.id,
        status: 'successful',
        transaction_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_signature: razorpaySignature,
        amount_paid: amountInSmallestUnit,
        payment_type: 'razorpay',
        brand_id: session.brand_id || 1,
      }, { transaction: t });
    } else {
      payment = await Payment.create({
        order_id: order.id,
        user_id: session.user_id,
        guest_user_id: session.guest_user_id || null,
        payment_type: 'razorpay',
        amount_paid: amountInSmallestUnit,
        status: 'successful',
        transaction_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_signature: razorpaySignature,
        payment_gateway: 'Razorpay',
        brand_id: session.brand_id || 1,
        reservation_id: session.reservation_id,
      }, { transaction: t });
    }

    // ── Status history ────────────────────────────────────────────────────
    await OrderStatusHistory.create({
      order_id: order.id,
      status: 'confirmed',
      updated_by: null,
      notes: `Auto-confirmed: prepaid payment verified (${source})`,
    }, { transaction: t });

    return { order, payment, created: true };
  });
}

/**
 * Full post-payment handler: create order + release reservation + side effects.
 * This is the single entry point called by all payment verification paths.
 */
async function handlePaymentSuccess({
  session,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature = null,
  source = 'verify',
  req = null,
}) {
  const { syncOrderToFShip } = require('./orderService.js');
  const { sendFacebookEvent } = require('../integration/facebookPixel.js');
  const { sendGAEvent } = require('../integration/googleAnalytics.js');
  const { Product } = require('../model/productModel.js');
  const { User } = require('../model/userModel.js');
  const { GuestUser } = require('../model/guestUserModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');

  // 1. Create order
  const result = await createOrderFromSession({
    session,
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
    source,
  });

  const { order, created } = result;

  // 2. Release stock reservation (stock is now permanently deducted in DB)
  if (created) {
    await stockReservation.releaseReservation(session.reservation_id).catch(e =>
      logger.warn(`[OrderCreation] Failed to release reservation: ${e.message}`)
    );
  }

  // 3. Clear user's cart (non-blocking)
  if (created && session.user_id) {
    setImmediate(async () => {
      try {
        const cart = await Cart.findOne({ where: { user_id: session.user_id } });
        if (cart) await CartItem.destroy({ where: { cartId: cart.id } });
      } catch (e) {
        logger.warn(`[OrderCreation] Failed to clear cart: ${e.message}`);
      }
    });
  }

  // 4. Emit events + FShip sync (non-blocking)
  if (created) {
    // Carry the real item count so the WhatsApp confirmation doesn't hard-code
    // "1 item" for multi-item prepaid/magic orders.
    try { order._itemCount = Array.isArray(session.items) ? session.items.length : undefined; } catch (_) {}
    setImmediate(() => {
      // Fire order.created too (payment-first prepaid orders skip the checkout
      // controller's emit) so Telegram / Web Push / dashboard-sound alerts go out
      // for prepaid orders exactly like COD — not just order.confirmed.
      try { orderEmitter.emit('order.created', order); } catch (e) { logger.warn('[OrderCreation] order.created emit failed:', e.message); }
      try { orderEmitter.emit('order.confirmed', order); } catch (e) { logger.warn('[OrderCreation] order.confirmed emit failed:', e.message); }
      syncOrderToFShip(order).catch(e => logger.warn('[OrderCreation] FShip sync failed:', e.message));
    });

    // 5. Badge recalculation
    setImmediate(async () => {
      try {
        const BadgeService = require('./badgeService.js');
        await BadgeService.enqueueBadgeRecalculation(session.user_id);
      } catch (e) {
        logger.warn(`[OrderCreation] Badge recalc failed: ${e.message}`);
      }
    });

    // 6. Analytics — Purchase event
    setImmediate(async () => {
      try {
        const [orderItems, orderUser, guestUser, shippingAddr] = await Promise.all([
          OrderItem.findAll({
            where: { order_id: order.id },
            include: [{ model: Product, as: 'Product', attributes: ['id', 'name'] }],
          }),
          session.user_id ? User.findByPk(session.user_id, { attributes: ['email', 'username'] }) : null,
          session.guest_user_id ? GuestUser.findByPk(session.guest_user_id, { attributes: ['email', 'firstName', 'lastName', 'phone'] }) : null,
          session.shipping_address_id ? ShippingAddress.findByPk(session.shipping_address_id) : null,
        ]);

        const email = orderUser?.email || guestUser?.email || null;
        const phone = shippingAddr?.phone || guestUser?.phone || null;
        let firstName, lastName;
        if (orderUser) {
          const parts = (orderUser.username || '').trim().split(/\s+/);
          firstName = parts[0] || null;
          lastName = parts.slice(1).join(' ') || null;
        } else {
          firstName = guestUser?.firstName || null;
          lastName = guestUser?.lastName || null;
        }

        const eventPayload = {
          brand_id: order.brand_id || 1,
          order_number: order.order_number,
          total_amount: parseFloat(order.final_amount),
          final_amount: parseFloat(order.final_amount),
          currency: 'INR',
          ip_address: req?.ip || null,
          user_agent: req?.headers?.['user-agent'] || null,
          email,
          phone,
          first_name: firstName,
          last_name: lastName,
          zip_code: shippingAddr?.pincode || null,
          city: shippingAddr?.city || null,
          state: shippingAddr?.state || null,
          country: 'in',
          fbc: req?.cookies?._fbc || null,
          fbp: req?.cookies?._fbp || null,
          items: orderItems.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price: parseFloat(i.price || 0),
            name: i.Product?.name || '',
          })),
        };
        await sendFacebookEvent('Purchase', eventPayload);
        await sendGAEvent('purchase', eventPayload);
      } catch (err) {
        logger.error('Analytics Purchase event error:', err.message);
      }
    });
  }

  return { order, created };
}

module.exports = {
  createOrderFromSession,
  handlePaymentSuccess,
  generateOrderNumber,
  generateUniqueOrderNumber,
};
