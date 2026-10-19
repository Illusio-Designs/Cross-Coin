/**
 * Payment Reconciliation Service.
 *
 * For every Razorpay-marked order in our DB, ask Razorpay what it
 * thinks the truth is, and correct local state if it diverges.
 *
 * Catches the classic split-brain failure modes:
 *   - webhook delivery dropped → order stuck "pending" but customer paid
 *   - signature verification reorder → payment row never updated
 *   - race between order creation and webhook → order references a
 *     transaction Razorpay returns as "captured"
 *
 * Runs daily via cron (3 am, logged to job_runs as 'payment-reconciliation'),
 * on-demand per-order via the integration queue, and from Dashboard →
 * Payments ("doesn't match Razorpay": a dry-run check, then the admin's
 * "Mark paid & confirm", which passes reopenCancelled + actor).
 *
 * Also covers "charged, but no order": a payment-first checkout whose payment
 * was captured after the Redis session expired (order_id NULL, reservation_id
 * set). reconcileOrphanPayment() creates the order from the durable session
 * copy (stockReservationService), or — when there is none — leaves it for an
 * admin to refund (refundOrphanPayment) from Dashboard → Payments.
 *
 * Outputs an audit row (order_audit_logs 'payment_reconciled') per change so
 * finance can trace divergence. Every write path is idempotent: a second call
 * finds the rows already in sync and changes nothing.
 */

const { Op } = require('sequelize');
const { logger } = require('../config/logging.js');
const { sequelize } = require('../config/db.js');
const { Payment } = require('../model/paymentModel.js');
const { Order } = require('../model/orderModel.js');
const razorpayService = require('./razorpayService.js');

// Order statuses that mean "created, waiting for the money".
const AWAITING_PAYMENT = ['pending', 'pending_payment', 'awaiting_confirmation'];
const CANCELLED = ['cancelled', 'order cancelled'];

/** The newest real payment row of an order (refund rows are negative). */
function latestPayment(orderId) {
  return Payment.findOne({
    where: { order_id: orderId, amount_paid: { [Op.gt]: 0 } },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
}

/**
 * What Razorpay says about a local payment row. With only a Razorpay order id,
 * any captured attempt wins (a customer can fail once and pay on the retry
 * under the same Razorpay order).
 */
async function fetchRazorpayTruth(payment, brandId) {
  if (payment.transaction_id && /^pay_/.test(payment.transaction_id)) {
    return razorpayService.getPayment(payment.transaction_id, brandId);
  }
  if (!payment.razorpay_order_id) return null;
  const rzp = await razorpayService.getInstance(brandId);
  const list = await rzp.orders.fetchPayments(payment.razorpay_order_id);
  const items = (list && list.items) || [];
  return items.find((i) => i.status === 'captured')
    || items.find((i) => i.status === 'refunded')
    || items[0]
    || null;
}

const remoteSummary = (truth) => (truth ? {
  id: truth.id,
  status: truth.status,
  method: truth.method || null,
  amount: truth.amount != null ? Number(truth.amount) / 100 : null,
  at: truth.created_at ? new Date(Number(truth.created_at) * 1000).toISOString() : null,
  error: truth.error_description || null,
} : null);

/**
 * Re-open an order that was auto-cancelled for non-payment: take the stock
 * back (only if every item is still in stock) and re-apply its coupon.
 * Returns { ok: true } or { ok: false, short: ['Name (size)', ...] }.
 */
async function reopenCancelledOrder(order, t) {
  const items = await sequelize.query(
    `SELECT oi.variation_id, oi.quantity, pv.stock, p.name
       FROM order_items oi
       LEFT JOIN product_variations pv ON pv.id = oi.variation_id
       LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? AND oi.variation_id IS NOT NULL
      FOR UPDATE`,
    { replacements: [order.id], type: sequelize.QueryTypes.SELECT, transaction: t }
  );
  const short = items.filter((i) => i.stock == null || Number(i.stock) < Number(i.quantity)).map((i) => i.name || `Item ${i.variation_id}`);
  if (short.length) return { ok: false, short };

  for (const i of items) {
    await sequelize.query('UPDATE product_variations SET stock = stock - ? WHERE id = ?',
      { replacements: [Number(i.quantity), i.variation_id], transaction: t });
  }
  if (order.coupon_id) {
    const { Coupon } = require('../model/couponModel.js');
    const { CouponUsage } = require('../model/couponUsageModel.js');
    const used = await CouponUsage.findOne({ where: { orderId: order.id }, transaction: t });
    if (!used) {
      await Coupon.increment('usageCount', { by: 1, where: { id: order.coupon_id }, transaction: t });
      await CouponUsage.create({
        couponId: order.coupon_id, userId: order.user_id || null, guestUserId: order.guest_user_id || null,
        orderId: order.id, discountAmount: order.discount_amount || 0,
      }, { transaction: t });
    }
  }
  return { ok: true };
}

/**
 * Reconcile one order's newest payment with Razorpay.
 *
 * Options:
 *   dryRun          — only report what would change (no writes).
 *   actor           — { id, role } of the admin who asked (audit trail).
 *   reopenCancelled — when Razorpay captured the money but the order was
 *                     auto-cancelled meanwhile, put it back to "confirmed"
 *                     (stock permitting). Without it (the nightly run) a
 *                     cancelled order is only marked paid, so it shows up as
 *                     "refund due" / on the Payments page.
 */
async function reconcileOrderPayment(orderId, { dryRun = false, actor = null, reopenCancelled = false } = {}) {
  const order = await Order.findByPk(orderId);
  if (!order) return { success: false, error: `order ${orderId} not found` };
  if (order.payment_type === 'cod') {
    return { success: true, skipped: true, reason: 'COD — no Razorpay payment to reconcile' };
  }

  const payment = await latestPayment(orderId);
  if (!payment) return { success: false, error: `no payment row for order ${orderId}` };
  if (payment.payment_gateway === 'CustomCheckout') {
    return { success: true, skipped: true, reason: 'paid through the checkout provider, not our Razorpay account' };
  }
  if (!payment.transaction_id && !payment.razorpay_order_id) {
    return { success: false, error: 'no Razorpay reference on payment row' };
  }

  let truth;
  try {
    truth = await fetchRazorpayTruth(payment, order.brand_id || 1);
  } catch (err) {
    return { success: false, error: `Razorpay lookup failed: ${err.message}` };
  }
  if (!truth) {
    return { success: true, skipped: true, reason: 'no Razorpay payment found yet' };
  }

  const remoteStatus = truth.status; // captured | failed | refunded | authorized | created
  const localStatus = payment.status;

  let desiredLocal = null;
  if (remoteStatus === 'captured') desiredLocal = 'successful';
  else if (remoteStatus === 'failed') desiredLocal = 'failed';
  else if (remoteStatus === 'refunded') desiredLocal = 'refunded';

  const remote = remoteSummary(truth);
  const paymentDiffers = !!desiredLocal && desiredLocal !== localStatus
    // a locally "completed" row is the same as Razorpay's "captured"
    && !(desiredLocal === 'successful' && localStatus === 'completed');
  const paid = desiredLocal === 'successful';
  const orderAwaiting = paid && AWAITING_PAYMENT.includes(order.status) && order.payment_status !== 'paid';
  const orderCancelled = paid && CANCELLED.includes(order.status);
  const canReopen = orderCancelled && reopenCancelled;
  const orderDiffers = orderAwaiting || canReopen || (orderCancelled && order.payment_status !== 'paid');

  if (!desiredLocal) {
    return { success: true, skipped: true, reason: `remote status "${remoteStatus}" is non-terminal`, remote };
  }
  if (!paymentDiffers && !orderDiffers) {
    return { success: true, skipped: true, reason: 'already in sync', remote };
  }
  if (dryRun) {
    return {
      success: true, dryRun: true, wouldCorrect: true, from: localStatus, to: desiredLocal, remote,
      order: { id: order.id, order_number: order.order_number, status: order.status, payment_status: order.payment_status },
    };
  }

  // Divergence — correct local state under a row lock so two admins (or the
  // admin and the nightly run) can't both apply it.
  let outcome;
  try {
    outcome = await sequelize.transaction(async (t) => {
      const locked = await Order.findByPk(order.id, { transaction: t, lock: t.LOCK.UPDATE });
      const pay = await Payment.findByPk(payment.id, { transaction: t, lock: t.LOCK.UPDATE });
      const res = { orderAction: null, short: null, before: { payment: pay.status, order: locked.status, orderPayment: locked.payment_status } };

      if (pay.status !== desiredLocal && !(desiredLocal === 'successful' && pay.status === 'completed')) {
        await pay.update({ status: desiredLocal, transaction_id: pay.transaction_id || truth.id }, { transaction: t });
      }

      if (paid) {
        const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
        if (AWAITING_PAYMENT.includes(locked.status) && locked.payment_status !== 'paid') {
          await locked.update({ status: 'confirmed', payment_status: 'paid' }, { transaction: t });
          await OrderStatusHistory.create({
            order_id: locked.id, status: 'confirmed', updated_by: actor?.id || null,
            notes: actor ? 'Confirmed by staff: payment found captured at Razorpay' : 'Auto-confirmed: payment found captured at Razorpay (reconciliation)',
          }, { transaction: t });
          res.orderAction = 'confirmed';
        } else if (CANCELLED.includes(locked.status)) {
          if (reopenCancelled) {
            const r = await reopenCancelledOrder(locked, t);
            if (r.ok) {
              await locked.update({ status: 'confirmed', payment_status: 'paid' }, { transaction: t });
              await OrderStatusHistory.create({
                order_id: locked.id, status: 'confirmed', updated_by: actor?.id || null,
                notes: 'Re-opened by staff: the customer had paid at Razorpay after the order was auto-cancelled',
              }, { transaction: t });
              res.orderAction = 'reopened';
            } else {
              res.short = r.short;
            }
          }
          if (res.orderAction !== 'reopened' && locked.payment_status !== 'paid') {
            // Money is captured — say so, so the order shows up as "refund due".
            await locked.update({ payment_status: 'paid' }, { transaction: t });
            res.orderAction = 'marked_paid';
          }
        }
      }
      return res;
    });
  } catch (err) {
    logger.error(`[reconcile] order ${order.order_number} write failed: ${err.message}`);
    return { success: false, error: err.message };
  }

  try {
    const { auditLog } = require('./orderService.js');
    await auditLog(order.id, 'payment_reconciled', actor?.id || null, actor ? (actor.role || 'admin') : 'system', {
      remote_status: remoteStatus,
      local_status_before: localStatus,
      local_status_after: desiredLocal,
      order_status_before: outcome.before.order,
      order_action: outcome.orderAction,
      out_of_stock: outcome.short || undefined,
      razorpay_payment_id: truth.id,
      razorpay_amount: truth.amount,
    });
  } catch (e) { /* audit is advisory */ }

  if (outcome.orderAction === 'confirmed' || outcome.orderAction === 'reopened') {
    const fresh = await Order.findByPk(order.id);
    setImmediate(() => {
      try { require('./orderEvents.js').emit('order.confirmed', fresh); } catch (e) { logger.warn(`[reconcile] order.confirmed emit failed: ${e.message}`); }
      require('./orderService.js').syncOrderToShipping(fresh).catch((e) => logger.warn(`[reconcile] shipping sync failed: ${e.message}`));
    });
  }

  logger.info(`[reconcile] order ${order.order_number}: ${localStatus} → ${desiredLocal} (Razorpay: ${remoteStatus})${outcome.orderAction ? `, order ${outcome.orderAction}` : ''}${actor ? ` by user ${actor.id}` : ''}`);
  return {
    success: true, corrected: true, from: localStatus, to: desiredLocal, remote,
    orderAction: outcome.orderAction, outOfStock: outcome.short || null,
  };
}

// ── Charged, but no order ─────────────────────────────────────────────────
/**
 * A payment-first checkout row with no order. Captured at Razorpay → create
 * the order from the saved checkout session (idempotent: the order-creation
 * service finds an order already made for this reservation). Not captured →
 * nothing to do (a Razorpay "failed" is copied onto the row).
 */
async function reconcileOrphanPayment(paymentId, { dryRun = false, actor = null } = {}) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) return { success: false, error: `payment ${paymentId} not found` };
  if (payment.order_id) return reconcileOrderPayment(payment.order_id, { dryRun, actor, reopenCancelled: !!actor });
  if (!payment.razorpay_order_id) return { success: false, error: 'no Razorpay reference on payment row' };
  if (Number(payment.amount_paid) <= 0) return { success: true, skipped: true, reason: 'refund row' };

  let truth;
  try {
    truth = await fetchRazorpayTruth(payment, payment.brand_id || 1);
  } catch (err) {
    return { success: false, error: `Razorpay lookup failed: ${err.message}` };
  }
  const remote = remoteSummary(truth);
  if (!truth || truth.status !== 'captured') {
    if (!dryRun && truth && truth.status === 'failed' && payment.status === 'pending') {
      await payment.update({ status: 'failed', notes: truth.error_description || 'Payment failed (found by reconciliation)' });
    }
    return { success: true, skipped: true, reason: truth ? `remote status "${truth.status}"` : 'no Razorpay payment found yet', remote };
  }
  if (payment.status === 'refunded' || payment.status === 'refund_pending') {
    return { success: true, skipped: true, reason: 'already being refunded', remote };
  }

  const stockReservation = require('./stockReservationService.js');
  const session = await stockReservation.getReservationByRazorpayOrder(payment.razorpay_order_id);
  if (dryRun) {
    return { success: true, dryRun: true, wouldCorrect: true, orphan: true, canCreate: !!session, from: payment.status, to: 'successful', remote };
  }
  if (!session) {
    return { success: false, needsRefund: true, error: 'the checkout details for this payment were not saved, so no order can be made — refund the customer', remote };
  }

  let result;
  try {
    const { handlePaymentSuccess } = require('./orderCreationService.js');
    result = await handlePaymentSuccess({
      session, razorpayPaymentId: truth.id, razorpayOrderId: payment.razorpay_order_id, source: actor ? 'admin-reconcile' : 'reconcile',
    });
  } catch (err) {
    logger.error(`[reconcile] couldn't create the order for payment ${payment.id} (${truth.id}): ${err.message}`);
    return { success: false, error: `couldn't create the order: ${err.message}`, remote };
  }
  try {
    const { auditLog } = require('./orderService.js');
    await auditLog(result.order.id, 'payment_reconciled', actor?.id || null, actor ? (actor.role || 'admin') : 'system', {
      remote_status: 'captured', local_status_before: payment.status, local_status_after: 'successful',
      order_action: result.created ? 'created_from_session' : 'already_created', razorpay_payment_id: truth.id, razorpay_amount: truth.amount,
    });
  } catch (e) { /* audit is advisory */ }
  logger.info(`[reconcile] payment ${payment.id}: captured at Razorpay with no order → order ${result.order.order_number} ${result.created ? 'created' : 'already existed'}`);
  return { success: true, corrected: true, from: payment.status, to: 'successful', orderAction: result.created ? 'created' : 'existing', order: { id: result.order.id, order_number: result.order.order_number }, remote };
}

/**
 * Admin: give the money back for a captured payment that has no order.
 * Guarded so two clicks can't refund twice (the row is claimed first).
 */
async function refundOrphanPayment(paymentId, actor) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) return { success: false, error: 'payment not found' };
  if (payment.order_id) return { success: false, error: 'this payment has an order — refund it from the order instead' };
  let truth;
  try { truth = await fetchRazorpayTruth(payment, payment.brand_id || 1); }
  catch (err) { return { success: false, error: `Razorpay lookup failed: ${err.message}` }; }
  if (!truth || truth.status !== 'captured') {
    return { success: false, error: truth ? `Razorpay shows this payment as “${truth.status}” — nothing to refund` : 'Razorpay has no payment for this checkout' };
  }

  const [, claimed] = await sequelize.query(
    "UPDATE payments SET status = 'refund_pending', updated_at = NOW() WHERE id = ? AND status IN ('pending','failed','successful')",
    { replacements: [payment.id], type: sequelize.QueryTypes.UPDATE }
  );
  if (!claimed) return { success: true, skipped: true, reason: 'already being refunded' };

  const rupees = Number(truth.amount) / 100;
  let refund;
  try {
    refund = await razorpayService.createRefund(truth.id, {
      amount: rupees, brandId: payment.brand_id || 1,
      notes: { reason: 'Paid but no order was created', admin_id: actor?.id || null },
    });
  } catch (err) {
    await sequelize.query('UPDATE payments SET status = ? WHERE id = ?', { replacements: [payment.status, payment.id], type: sequelize.QueryTypes.UPDATE });
    return { success: false, error: err.message };
  }
  await sequelize.transaction(async (t) => {
    await Payment.update({
      status: 'refunded', transaction_id: payment.transaction_id || truth.id,
      notes: `Full refund: ₹${rupees}. Razorpay refund ID: ${refund.id}. Reason: paid but no order was created`,
    }, { where: { id: payment.id }, transaction: t });
    await Payment.create({
      order_id: null, user_id: payment.user_id, guest_user_id: payment.guest_user_id, payment_type: 'razorpay',
      transaction_id: refund.id, razorpay_order_id: payment.razorpay_order_id, amount_paid: -Math.round(rupees * 100),
      status: 'refunded', payment_gateway: 'Razorpay', brand_id: payment.brand_id || 1,
      notes: 'Refund: paid but no order was created',
    }, { transaction: t });
  });
  logger.info(`[reconcile] refunded orphan payment ${payment.id} (${truth.id}) ₹${rupees} — refund ${refund.id}${actor ? ` by user ${actor.id}` : ''}`);
  return { success: true, refunded: true, amount: rupees, refundId: refund.id };
}

/**
 * Daily reconciliation entry point.
 *
 * Two modes:
 *   inline (default) — call reconcileOrderPayment() inline for each
 *     candidate, returning a summary. Used when Bull is unavailable.
 *   queued — enqueue each candidate as a `payment:reconcile-order`
 *     job and return without waiting. Lets Bull spread the load,
 *     retry on transient Razorpay errors, and surface progress in
 *     the integration queue stats.
 *
 * Set { useQueue: true } to opt into queue mode. The cron job picks
 * this up automatically when the env says Bull is healthy.
 */
async function reconcileRecentPayments({ sinceHours = 48, limit = 500, useQueue = false } = {}) {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);
  const rows = await Payment.findAll({
    where: {
      status: { [Op.in]: ['pending', 'failed'] },
      payment_type: { [Op.ne]: 'cod' },
      amount_paid: { [Op.gt]: 0 }, // not refund rows
      createdAt: { [Op.gte]: since },
      order_id: { [Op.not]: null },
    },
    limit,
    order: [['createdAt', 'DESC']],
  });
  // One check per order (the reconcile looks at the order's newest row).
  const seen = new Set();
  const candidates = rows.filter((p) => !seen.has(p.order_id) && seen.add(p.order_id));

  if (useQueue) {
    const { enqueue, getStats } = require('./integrationQueue.js');
    const stats = await getStats();
    if (stats.available) {
      // Fan-out: one job per candidate. Stagger by 100ms each so we
      // don't hammer Razorpay's rate limit if a large backfill runs.
      let enqueued = 0;
      for (let i = 0; i < candidates.length; i++) {
        try {
          await enqueue('payment:reconcile-order', { orderId: candidates[i].order_id }, { delay: i * 100 });
          enqueued++;
        } catch (e) {
          logger.warn(`[reconcile] enqueue failed for order ${candidates[i].order_id}: ${e.message}`);
        }
      }
      logger.info(`[reconcile] enqueued ${enqueued}/${candidates.length} reconciliation jobs to Bull`);
      const orphans = { checked: 0, corrected: 0, errors: 0, skipped: 0 };
      await reconcileOrphans(since, orphans);
      return { enqueued, total: candidates.length, mode: 'queue', orphans };
    }
    // Bull isn't actually up — fall through to inline.
    logger.warn('[reconcile] queue mode requested but Bull unavailable — falling back to inline');
  }

  const summary = { checked: 0, corrected: 0, errors: 0, skipped: 0, mode: 'inline' };
  await reconcileOrphans(since, summary);
  for (const p of candidates) {
    summary.checked++;
    try {
      const result = await reconcileOrderPayment(p.order_id);
      if (result.corrected) summary.corrected++;
      else if (result.skipped) summary.skipped++;
      else if (!result.success) summary.errors++;
    } catch (err) {
      summary.errors++;
      logger.warn(`[reconcile] payment ${p.id} order ${p.order_id} failed: ${err.message}`);
    }
  }
  logger.info(`[reconcile] daily run: ${JSON.stringify(summary)}`);
  return summary;
}

/** Payment-first rows with no order (captured after the session expired). */
async function reconcileOrphans(since, summary) {
  const rows = await Payment.findAll({
    where: {
      order_id: null,
      reservation_id: { [Op.not]: null },
      status: { [Op.in]: ['pending', 'failed'] },
      amount_paid: { [Op.gt]: 0 },
      razorpay_order_id: { [Op.not]: null },
      // leave live checkouts alone for 20 minutes
      createdAt: { [Op.gte]: since, [Op.lte]: new Date(Date.now() - 20 * 60000) },
    },
    limit: 200,
    order: [['createdAt', 'DESC']],
  });
  for (const p of rows) {
    summary.checked++;
    try {
      const r = await reconcileOrphanPayment(p.id);
      if (r.corrected) summary.corrected++;
      else if (r.skipped) summary.skipped++;
      else { summary.errors++; logger.warn(`[reconcile] payment ${p.id} (no order): ${r.error}`); }
    } catch (err) {
      summary.errors++;
      logger.warn(`[reconcile] payment ${p.id} (no order) failed: ${err.message}`);
    }
  }
}

module.exports = { reconcileOrderPayment, reconcileOrphanPayment, refundOrphanPayment, reconcileRecentPayments };
