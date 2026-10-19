const { Payment } = require('../model/paymentModel.js');
const { Order } = require('../model/orderModel.js');
const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const razorpayService = require('../services/razorpayService');
const crypto = require('crypto');
const settingsHelper = require('../services/settingsHelper');
const { logger } = require('../config/logging.js');
const { toSmallestUnit } = require('../utils/amountConverter');
const { sendFacebookEvent } = require('../integration/facebookPixel.js');
const { sendGAEvent } = require('../integration/googleAnalytics.js');
const { OrderItem } = require('../model/orderItemModel.js');
const { setImmediate } = require('timers');

// ── Admin: Dashboard → Payments (services/paymentsAdminService.js) ─────────
// GET  /api/payments/admin/list?period=1|7|30&tab=all|paid|failed|pending|refund|cod|cancelled&q=&brandId=&page=&limit=
// GET  /api/payments/admin/summary?period=&brandId=
// GET  /api/payments/admin/mismatches?brandId=&refresh=1   (dry-run vs Razorpay, cached 10 min)
// POST /api/payments/admin/mismatches/fix { orderId } | { paymentId, action: 'create'|'refund' }   (admin only)
const paymentsAdmin = require('../services/paymentsAdminService.js');
const adminFail = (res, error, what) => {
    logger.error(`Payments admin: ${what} failed: ${error.message}`);
    res.status(500).json({ success: false, message: `Couldn’t load ${what} — please try again.` });
};

module.exports.adminListPayments = async (req, res) => {
    try { res.json({ success: true, ...(await paymentsAdmin.listPayments(req.query)) }); }
    catch (error) { adminFail(res, error, 'payments'); }
};

module.exports.adminPaymentsSummary = async (req, res) => {
    try { res.json({ success: true, ...(await paymentsAdmin.summary(req.query)) }); }
    catch (error) { adminFail(res, error, 'the payment totals'); }
};

module.exports.adminPaymentMismatches = async (req, res) => {
    try { res.json({ success: true, ...(await paymentsAdmin.mismatches({ brandId: req.query.brandId, refresh: req.query.refresh === '1' })) }); }
    catch (error) { adminFail(res, error, 'the Razorpay check'); }
};

module.exports.adminFixPaymentMismatch = async (req, res) => {
    try {
        const r = await paymentsAdmin.fixMismatch(req.body || {}, { id: req.user.id, role: 'admin' });
        res.status(r.ok ? 200 : r.status || 500).json({ success: r.ok, changed: !!r.changed, message: r.message });
    } catch (error) {
        logger.error(`Payments admin: fix failed for ${JSON.stringify(req.body || {})}: ${error.message}`);
        res.status(500).json({ success: false, message: 'Couldn’t fix it — nothing was changed. Please try again.' });
    }
};

// Update order with payment details after successful payment
// Supports BOTH flows:
//   - NEW (payment-first): reservation_id on payment record → create order from session
//   - OLD (legacy): orderId in request → confirm existing order
module.exports.updateOrderPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id } = req.body;
    
    logger.info('Updating order payment:', { orderId, razorpayPaymentId, razorpayOrderId, reservation_id });

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ message: 'razorpayPaymentId, razorpayOrderId, and razorpaySignature are required' });
    }

    // The Razorpay order belongs to one brand's account: take the brand from
    // our pending payment row (or the checkout session) and verify with that
    // brand's secret — not always brand 1.
    const stockReservation = require('../services/stockReservationService.js');
    const orderCreationService = require('../services/orderCreationService.js');
    const pendingRow = await Payment.findOne({ where: { razorpay_order_id: razorpayOrderId }, order: [['id', 'ASC']] });
    const session = await stockReservation.getReservationByRazorpayOrder(razorpayOrderId);
    const brandId = (pendingRow && pendingRow.brand_id) || (session && session.brand_id) || 1;

    const isValidSignature = await razorpayService.verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      brandId
    );

    if (!isValidSignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Payment ID deduplication
    const existingSuccessful = await Payment.findOne({
      where: { transaction_id: razorpayPaymentId, status: 'successful' }
    });
    if (existingSuccessful) {
      // Already processed — return the order
      if (existingSuccessful.order_id) {
        const existingOrder = await Order.findByPk(existingSuccessful.order_id);
        if (existingOrder) {
          return res.status(200).json({ success: true, message: 'Payment already processed', order: existingOrder });
        }
      }
      return res.status(400).json({ message: 'Payment already processed.' });
    }

    // ── NEW FLOW: Payment-first (reservation exists) ──────────────────────
    // The session comes from Redis, or from its durable MySQL copy when the
    // Redis keys already expired (slow payer), so a paid checkout always
    // becomes an order.
    if (session) {
      logger.info('Payment-first flow: creating order from session', session.reservation_id);

      const { order, created } = await orderCreationService.handlePaymentSuccess({
        session,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        source: 'verify',
        req,
      });

      return res.json({
        success: true,
        message: created ? 'Payment verified, order created' : 'Payment already processed',
        order,
      });
    }

    // ── OLD FLOW: Legacy (order already exists) ───────────────────────────
    // Only for an order WE linked to this Razorpay order (our payment row),
    // and only when Razorpay really took the order's full amount. A signature
    // alone proves nothing about which order or how much: anyone can pay ₹1
    // on some other Razorpay order and send that signature with a random
    // orderId.
    if (!pendingRow || !pendingRow.order_id) {
      logger.error(`No order found for razorpay_order_id: ${razorpayOrderId} (no checkout session, no linked payment row)`);
      return res.status(400).json({ message: 'No checkout found for this payment. Please contact support with your payment ID.' });
    }
    if (orderId && String(orderId) !== String(pendingRow.order_id)) {
      logger.warn(`Verify rejected: orderId ${orderId} is not linked to razorpay order ${razorpayOrderId}`);
      return res.status(400).json({ message: 'This payment does not belong to that order.' });
    }
    const resolvedOrderId = pendingRow.order_id;
    {
      const linkedOrder = await Order.findByPk(resolvedOrderId, { attributes: ['id', 'final_amount'] });
      let rp;
      try { rp = await razorpayService.getPayment(razorpayPaymentId, brandId); }
      catch (e) { return res.status(502).json({ message: 'Could not confirm the payment with Razorpay. Please try again.' }); }
      const expected = linkedOrder ? toSmallestUnit(parseFloat(linkedOrder.final_amount), 'INR') : null;
      if (!linkedOrder || rp.order_id !== razorpayOrderId || !['captured', 'authorized'].includes(rp.status) || Number(rp.amount) !== Number(expected)) {
        logger.warn(`Verify rejected for order ${resolvedOrderId}: Razorpay ${rp.id} ${rp.status} ${rp.amount} on ${rp.order_id}, expected ${expected} on ${razorpayOrderId}`);
        return res.status(400).json({ message: 'The amount paid does not match this order.' });
      }
    }

    // Use row-level lock to prevent race condition between verify/callback/webhook
    const { sequelize: db } = require('../config/db.js');
    const result = await db.transaction(async (t) => {
      // Lock the order row
      const [lockedRows] = await db.query(
        'SELECT id, payment_status, status, final_amount, brand_id, user_id, guest_user_id, order_number FROM orders WHERE id = ? FOR UPDATE',
        { replacements: [resolvedOrderId], transaction: t }
      );
      const lockedOrder = lockedRows?.[0];
      if (!lockedOrder) {
        throw Object.assign(new Error('Order not found'), { statusCode: 404 });
      }

      // Guard re-processing (now under lock — no race)
      if (lockedOrder.payment_status === 'paid') {
        return { alreadyPaid: true };
      }
      if (['failed', 'cancelled'].includes(lockedOrder.payment_status)) {
        throw Object.assign(new Error(`Cannot process payment for a ${lockedOrder.payment_status} order.`), { statusCode: 400 });
      }

      // Update order status — prepaid auto-confirmed
      await db.query(
        `UPDATE orders SET payment_status = 'paid', status = 'confirmed', updated_at = NOW() WHERE id = ?`,
        { replacements: [resolvedOrderId], transaction: t }
      );

      // Record status history
      const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
      await OrderStatusHistory.create({
        order_id: resolvedOrderId,
        status: 'confirmed',
        updated_by: null,
        notes: 'Auto-confirmed: prepaid payment verified',
      }, { transaction: t });

      // Upsert payment record
      const amountInSmallestUnit = toSmallestUnit(parseFloat(lockedOrder.final_amount), 'INR');

      let payment = await Payment.findOne({
        where: { order_id: resolvedOrderId, razorpay_order_id: razorpayOrderId },
        transaction: t,
      });
      if (!payment) {
        payment = await Payment.findOne({
          where: { order_id: resolvedOrderId, status: 'pending' },
          transaction: t,
        });
      }

      if (payment) {
        await payment.update({
          payment_type: 'razorpay',
          amount_paid: amountInSmallestUnit,
          status: 'successful',
          transaction_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: razorpaySignature,
          brand_id: lockedOrder.brand_id || 1,
        }, { transaction: t });
      } else {
        await Payment.create({
          order_id: resolvedOrderId,
          user_id: lockedOrder.user_id || null,
          guest_user_id: lockedOrder.guest_user_id || null,
          payment_type: 'razorpay',
          amount_paid: amountInSmallestUnit,
          status: 'successful',
          transaction_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: razorpaySignature,
          brand_id: lockedOrder.brand_id || 1,
        }, { transaction: t });
      }

      return { alreadyPaid: false, lockedOrder };
    });

    if (result.alreadyPaid) {
      const order = await Order.findByPk(resolvedOrderId);
      return res.status(200).json({ success: true, message: 'Payment already processed', order });
    }

    const order = await Order.findByPk(resolvedOrderId);

    // Emit confirmed event — triggers WhatsApp + Shipping sync (outside transaction)
    const orderEmitter = require('../services/orderEvents.js');
    const orderService = require('../services/orderService.js');
    setImmediate(() => {
      try { orderEmitter.emit('order.confirmed', order); } catch (e) { logger.warn('[updateOrderPayment] order.confirmed emit failed:', e.message); }
      orderService.syncOrderToShipping(order).catch(e => logger.warn('[updateOrderPayment] Shipping sync failed:', e.message));
    });

    res.json({
      success: true,
      message: 'Order payment updated successfully',
      order,
    });

    // Analytics (non-blocking)
    setImmediate(async () => {
      try {
        const [items, orderUser, guestUser, shippingAddr] = await Promise.all([
          OrderItem.findAll({
            where: { order_id: order.id },
            include: [{ model: require('../model/productModel.js').Product, as: 'Product', attributes: ['id', 'name'] }]
          }),
          order.user_id ? User.findByPk(order.user_id, { attributes: ['email', 'username'] }) : null,
          order.guest_user_id ? GuestUser.findByPk(order.guest_user_id, { attributes: ['email', 'firstName', 'lastName', 'phone'] }) : null,
          order.shipping_address_id ? require('../model/shippingAddressModel.js').ShippingAddress.findByPk(order.shipping_address_id) : null,
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
          brand_id: order.brand_id || 1, external_id: order.user_id || null, order_number: order.order_number,
          total_amount: parseFloat(order.final_amount), final_amount: parseFloat(order.final_amount),
          currency: 'INR', ip_address: req.ip || null, user_agent: req.headers['user-agent'] || null,
          email, phone, first_name: firstName, last_name: lastName,
          zip_code: shippingAddr?.pincode || null, city: shippingAddr?.city || null,
          state: shippingAddr?.state || null, country: 'in',
          fbc: req.body?.fbc || req.cookies?._fbc || null, fbp: req.body?.fbp || req.cookies?._fbp || null,
          items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: parseFloat(i.price || 0), name: i.Product?.name || '' })),
        };
        await sendFacebookEvent('Purchase', eventPayload);
        await sendGAEvent('purchase', eventPayload);
      } catch (err) { logger.error('Analytics Purchase event error:', err.message); }
    });

  } catch (error) {
    logger.error('Error updating order payment:', error);
    res.status(500).json({ message: 'Failed to update order payment', error: error.message });
  }
};

// Handle explicit payment failure reported by the client (Razorpay payment.failed event)
module.exports.handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, errorCode, errorDescription } = req.body;

    if (!orderId || !razorpayOrderId) {
      return res.status(400).json({ message: 'orderId and razorpayOrderId are required' });
    }

    // Validate that this razorpay order was actually created by us, for THIS
    // order, and that the caller owns the order (route requires login).
    const existingPayment = await Payment.findOne({
      where: { razorpay_order_id: razorpayOrderId }
    });
    if (!existingPayment) {
      return res.status(403).json({ message: 'Unknown razorpay order' });
    }
    if (String(existingPayment.order_id) !== String(orderId)) {
      return res.status(403).json({ message: 'This payment does not belong to that order' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const { hasAnyRole, STAFF_ROLES } = require('../middleware/authMiddleware.js');
    if (order.user_id !== req.user.id && !hasAnyRole(req.user, STAFF_ROLES)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only update if not already paid (don't overwrite a successful payment)
    if (order.payment_status !== 'paid') {
      order.payment_status = 'failed';
      await order.save();
    }

    // Find the pending payment record and mark it failed
    const payment = await Payment.findOne({
      where: { order_id: orderId, razorpay_order_id: razorpayOrderId }
    }) || await Payment.findOne({
      where: { order_id: orderId, status: 'pending' }
    });

    if (payment) {
      await payment.update({
        status: 'failed',
        razorpay_order_id: razorpayOrderId,
        notes: errorDescription ? `${errorCode || 'PAYMENT_FAILED'}: ${errorDescription}` : 'Payment failed',
      });
    } else {
      // Create a failed record if none exists (e.g. createRazorpayOrder was called without orderId)
      await Payment.create({
        order_id: orderId,
        user_id: order.user_id || null,
        guest_user_id: order.guest_user_id || null,
        payment_type: 'razorpay',
        razorpay_order_id: razorpayOrderId,
        amount_paid: toSmallestUnit(parseFloat(order.final_amount), 'INR'),
        status: 'failed',
        payment_gateway: 'Razorpay',
        notes: errorDescription ? `${errorCode || 'PAYMENT_FAILED'}: ${errorDescription}` : 'Payment failed',
        brand_id: order.brand_id || 1,
      });
    }

    logger.info(`Payment failure recorded for order ${orderId}, razorpay_order_id: ${razorpayOrderId}`);
    res.json({ success: true, message: 'Payment failure recorded' });
  } catch (error) {
    logger.error('Error recording payment failure:', error);
    res.status(500).json({ message: 'Failed to record payment failure', error: error.message });
  }
};

// Razorpay Webhook — server-to-server event handler (Task 13)
// Route must be registered with express.raw() middleware, NOT express.json()
// so req.rawBody is available for signature verification.
module.exports.razorpayWebhook = async (req, res) => {
  try {
    // Verify x-razorpay-signature header
    const receivedSig = req.headers['x-razorpay-signature'];
    if (!receivedSig) {
      return res.status(400).json({ message: 'Missing signature header' });
    }

    const rawBody = req.rawBody || req.body;
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody);

    // Each brand has its own Razorpay account and webhook secret. Try the
    // brand of the payment the event is about first, then every other brand
    // that has a secret (refund events, payments we have no row for).
    let parsed = req.body;
    if (Buffer.isBuffer(parsed)) { try { parsed = JSON.parse(bodyStr); } catch (_) { parsed = {}; } }
    const rzpOrderRef = parsed?.payload?.payment?.entity?.order_id || null;
    const brandIds = [];
    if (rzpOrderRef) {
      const row = await Payment.findOne({ where: { razorpay_order_id: rzpOrderRef }, attributes: ['brand_id'] });
      if (row && row.brand_id) brandIds.push(Number(row.brand_id));
    }
    const [secretRows] = await sequelize.query("SELECT DISTINCT brand_id FROM brand_settings WHERE `key` = 'RAZORPAY_WEBHOOK_SECRET'");
    for (const r of secretRows || []) if (!brandIds.includes(Number(r.brand_id))) brandIds.push(Number(r.brand_id));
    if (!brandIds.includes(1)) brandIds.push(1); // env fallback lives under brand 1

    const received = Buffer.from(String(receivedSig));
    let configured = false;
    let verified = false;
    for (const b of brandIds) {
      const secret = await settingsHelper.getSetting(b, 'RAZORPAY_WEBHOOK_SECRET');
      if (!secret) continue;
      configured = true;
      const expected = Buffer.from(crypto.createHmac('sha256', secret).update(bodyStr).digest('hex'));
      if (expected.length === received.length && crypto.timingSafeEqual(expected, received)) { verified = true; break; }
    }
    if (!configured) {
      logger.error('RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(400).json({ message: 'Webhook not configured' });
    }
    if (!verified) {
      logger.warn('Razorpay webhook: invalid signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = parsed;
    const eventId = event.id;
    const eventType = event.event;

    // Idempotency: skip if already processed. The event is recorded only
    // AFTER it was handled, so a failure answers 5xx and Razorpay retries it.
    if (eventId) {
      try {
        const [existing] = await sequelize.query(
          `SELECT id FROM webhooks_log WHERE event_id = ? LIMIT 1`,
          { replacements: [eventId] }
        );
        if (existing && existing.length > 0) {
          logger.info(`Razorpay webhook: duplicate event ${eventId}, skipping`);
          return res.status(200).json({ status: 'duplicate' });
        }
      } catch (dbErr) {
        // webhooks_log table may not exist yet — non-fatal, continue processing
        logger.warn('webhooks_log lookup skipped:', dbErr.message);
      }
    }

    // Handle payment.captured — mark order as paid
    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const rzpOrderId = payment.order_id;
        const rzpPaymentId = payment.id;

        // ── NEW FLOW: Check for checkout session (payment-first) ──────────
        const stockReservation = require('../services/stockReservationService.js');
        const orderCreationService = require('../services/orderCreationService.js');
        const session = await stockReservation.getReservationByRazorpayOrder(rzpOrderId);

        if (session) {
          try {
            await orderCreationService.handlePaymentSuccess({
              session,
              razorpayPaymentId: rzpPaymentId,
              razorpayOrderId: rzpOrderId,
              source: 'webhook',
            });
            logger.info(`Webhook: order created from session via payment.captured (reservation: ${session.reservation_id})`);
          } catch (e) {
            // Answer 5xx so Razorpay retries; the nightly reconciliation and
            // Dashboard → Payments also pick the captured payment up.
            logger.error(`Webhook: failed to create order from session: ${e.message}`);
            throw e;
          }
        } else {
          // ── OLD FLOW: Find order via payment record ─────────────────────
          let paymentRecord = await Payment.findOne({ where: { razorpay_order_id: rzpOrderId } });

          // ── FALLBACK: If no payment record, find order by amount + time ──
          // This handles cases where createRazorpayOrder was called without orderId
          if (!paymentRecord) {
            const rzpPayment = event.payload?.payment?.entity;
            const amountInRupees = rzpPayment ? parseFloat(rzpPayment.amount) / 100 : null;
            const email = (rzpPayment?.email || '').toLowerCase().trim();
            const phone = (rzpPayment?.contact || '').replace(/\D/g, '').slice(-10);

            if (amountInRupees && (email || phone)) {
              // Find a pending prepaid order matching this customer + amount within last 2 hours
              const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
              const { User: UserModel } = require('../model/userModel.js');
              const { GuestUser: GuestModel } = require('../model/guestUserModel.js');

              // Search by email in users
              let matchedUser = null;
              if (email) matchedUser = await UserModel.findOne({ where: { email } });
              if (!matchedUser && phone) matchedUser = await UserModel.findOne({ where: { phone: { [Op.like]: `%${phone}` } } });

              let matchedGuest = null;
              if (!matchedUser && email) matchedGuest = await GuestModel.findOne({ where: { email } });
              if (!matchedUser && !matchedGuest && phone) matchedGuest = await GuestModel.findOne({ where: { phone: { [Op.like]: `%${phone}` } } });

              const ownerFilter = matchedUser ? { user_id: matchedUser.id }
                : matchedGuest ? { guest_user_id: matchedGuest.id }
                : null;

              if (ownerFilter) {
                const candidateOrder = await Order.findOne({
                  where: {
                    ...ownerFilter,
                    payment_type: { [Op.notIn]: ['cod'] },
                    payment_status: { [Op.in]: ['pending', 'failed'] },
                    final_amount: { [Op.between]: [amountInRupees - 1, amountInRupees + 1] },
                    createdAt: { [Op.gte]: twoHoursAgo },
                  },
                  order: [['createdAt', 'DESC']],
                });

                if (candidateOrder) {
                  // Create the missing payment record and link it
                  paymentRecord = await Payment.create({
                    order_id: candidateOrder.id,
                    user_id: candidateOrder.user_id || null,
                    guest_user_id: candidateOrder.guest_user_id || null,
                    payment_type: 'razorpay',
                    razorpay_order_id: rzpOrderId,
                    amount_paid: toSmallestUnit(amountInRupees, 'INR'), // paise, like every gateway row
                    status: 'pending',
                    payment_gateway: 'Razorpay',
                    brand_id: candidateOrder.brand_id || 1,
                  });
                  logger.info(`Webhook: created missing payment record for order ${candidateOrder.order_number} via fallback match`);
                }
              }
            }
          }

          if (paymentRecord && paymentRecord.order_id) {
            const order = await Order.findByPk(paymentRecord.order_id);
            if (order && order.payment_status !== 'paid') {
              order.payment_status = 'paid';
              order.status = 'confirmed';
              await order.save();
              const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
              await OrderStatusHistory.create({ order_id: order.id, status: 'confirmed', updated_by: null, notes: 'Auto-confirmed: webhook payment.captured (legacy)' });
              setImmediate(() => {
                const orderEmitter = require('../services/orderEvents.js');
                const orderService = require('../services/orderService.js');
                try { orderEmitter.emit('order.confirmed', order); } catch (e) { logger.warn('[razorpayWebhook] order.confirmed emit failed:', e.message); }
                orderService.syncOrderToShipping(order).catch(e => logger.warn('[razorpayWebhook] Shipping sync failed:', e.message));
              });
              await paymentRecord.update({ status: 'successful', transaction_id: rzpPaymentId });
              logger.info(`Webhook: order ${order.order_number} marked paid via payment.captured (legacy)`);
            }
          }
        }
      }
    }

    // Handle payment.failed
    if (eventType === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const paymentRecord = await Payment.findOne({ where: { razorpay_order_id: payment.order_id } });
        if (paymentRecord && paymentRecord.status === 'pending') {
          await paymentRecord.update({ status: 'failed', notes: payment.error_description || 'Payment failed via webhook' });
          const order = await Order.findByPk(paymentRecord.order_id);
          if (order && order.payment_status === 'pending') {
            order.payment_status = 'failed';
            await order.save();
          }
        }
      }
    }

    // Refund outcome. Our refund call marks the order refunded right away;
    // Razorpay settles it later and reports here. A FAILED refund must not
    // stay looking "refunded": the refund row is marked failed, the payment
    // and order go back to refund_pending (Orders page shows "Retry refund"
    // and the "Refund due" filter picks it up), and a linked return goes back
    // to "received" so staff can press Issue refund again.
    if (eventType === 'refund.processed' || eventType === 'refund.failed') {
      const refund = event.payload?.refund?.entity;
      if (refund?.id) {
        const refundRow = await Payment.findOne({ where: { transaction_id: refund.id } });
        if (!refundRow) {
          logger.warn(`Razorpay ${eventType}: no local refund row for ${refund.id}`);
        } else if (eventType === 'refund.processed') {
          if (!/processed by Razorpay/.test(refundRow.notes || '')) {
            await refundRow.update({ notes: `${refundRow.notes || ''} · processed by Razorpay ${new Date().toISOString().slice(0, 10)}`.trim() });
          }
        } else if (refundRow.status !== 'failed') {
          const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
          const reason = refund.notes?.reason || refund.error_description || 'Razorpay reported the refund as failed';
          await sequelize.transaction(async (t) => {
            await refundRow.update({ status: 'failed', notes: `${refundRow.notes || ''} · FAILED: ${reason}`.trim() }, { transaction: t });
            const original = refund.payment_id
              ? await Payment.findOne({ where: { transaction_id: refund.payment_id }, transaction: t })
              : null;
            if (original && ['refunded', 'partial_refund'].includes(original.status)) {
              await original.update({ status: 'refund_pending' }, { transaction: t });
            }
            const order = await Order.findByPk(refundRow.order_id, { transaction: t });
            if (order) {
              await order.update({ payment_status: 'refund_pending' }, { transaction: t });
              await OrderStatusHistory.create({
                order_id: order.id, status: order.status,
                notes: `Refund ${refund.id} FAILED at Razorpay (₹${(Number(refund.amount) || 0) / 100}). Retry the refund.`,
              }, { transaction: t });
              const { Return } = require('../model/returnModel.js');
              await Return.update(
                { status: 'received', refunded_at: null, admin_note: `Razorpay refund ${refund.id} failed — issue the refund again.` },
                { where: { order_id: order.id, status: 'refunded' }, transaction: t }
              );
            }
          });
          logger.error(`Razorpay refund ${refund.id} FAILED for payment ${refund.payment_id} — order moved to refund_pending`);
        }
      }
    }

    if (eventId) {
      try {
        await sequelize.query(
          `INSERT IGNORE INTO webhooks_log (event_id, event_type, processed_at) VALUES (?, ?, NOW())`,
          { replacements: [eventId, eventType] }
        );
      } catch (dbErr) {
        logger.warn('webhooks_log insert skipped:', dbErr.message);
      }
    }
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Razorpay webhook error:', error.message);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};
