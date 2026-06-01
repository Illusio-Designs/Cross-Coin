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
 * Runs daily via cron, and on-demand per-order via the integration
 * queue (whenever a webhook signature mismatch is rejected).
 *
 * Outputs an audit row per change so finance can trace divergence.
 */

const { Op } = require('sequelize');
const { logger } = require('../config/logging.js');
const { Payment } = require('../model/paymentModel.js');
const { Order } = require('../model/orderModel.js');
const razorpayService = require('./razorpayService.js');

const RAZORPAY_TERMINAL_STATES = new Set(['captured', 'refunded', 'failed']);

async function reconcileOrderPayment(orderId) {
  const order = await Order.findByPk(orderId);
  if (!order) return { success: false, error: `order ${orderId} not found` };
  if (order.payment_type === 'cod') {
    return { success: true, skipped: true, reason: 'COD — no Razorpay payment to reconcile' };
  }

  const payment = await Payment.findOne({
    where: { order_id: orderId },
    order: [['createdAt', 'DESC']],
  });
  if (!payment) return { success: false, error: `no payment row for order ${orderId}` };

  const rzpId = payment.transaction_id || payment.razorpay_order_id;
  if (!rzpId) return { success: false, error: 'no Razorpay reference on payment row' };

  let truth;
  try {
    if (payment.transaction_id) {
      truth = await razorpayService.getPayment(payment.transaction_id, order.brand_id || 1);
    } else {
      // No payment ID yet — list payments under the Razorpay order
      const rzp = await razorpayService.getInstance(order.brand_id || 1);
      const list = await rzp.orders.fetchPayments(payment.razorpay_order_id);
      truth = list.items && list.items[0];
    }
  } catch (err) {
    return { success: false, error: `Razorpay lookup failed: ${err.message}` };
  }
  if (!truth) {
    return { success: true, skipped: true, reason: 'no Razorpay payment found yet' };
  }

  const remoteStatus = truth.status;  // captured | failed | refunded | authorized | created
  const localStatus = payment.status;

  // Map remote → local
  let desiredLocal = null;
  if (remoteStatus === 'captured') desiredLocal = 'successful';
  else if (remoteStatus === 'failed') desiredLocal = 'failed';
  else if (remoteStatus === 'refunded') desiredLocal = 'refunded';

  if (!desiredLocal) {
    return { success: true, skipped: true, reason: `remote status "${remoteStatus}" is non-terminal` };
  }
  if (desiredLocal === localStatus) {
    return { success: true, skipped: true, reason: 'already in sync' };
  }

  // Divergence — correct local and log.
  await payment.update({
    status: desiredLocal,
    transaction_id: payment.transaction_id || truth.id,
  });

  // If the order was stuck pending while customer actually paid, push it forward.
  if (desiredLocal === 'successful' && ['pending_payment', 'pending'].includes(order.status)) {
    await order.update({ status: 'confirmed', payment_status: 'paid' });
  }

  try {
    const { auditLog } = require('./orderService.js');
    await auditLog(order.id, 'payment_reconciled', null, 'system', {
      remote_status: remoteStatus,
      local_status_before: localStatus,
      local_status_after: desiredLocal,
      razorpay_payment_id: truth.id,
      razorpay_amount: truth.amount,
    });
  } catch (e) { /* audit is advisory */ }

  logger.info(`[reconcile] order ${order.order_number}: ${localStatus} → ${desiredLocal} (Razorpay: ${remoteStatus})`);
  return { success: true, corrected: true, from: localStatus, to: desiredLocal };
}

async function reconcileRecentPayments({ sinceHours = 48, limit = 500 } = {}) {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);
  const candidates = await Payment.findAll({
    where: {
      status: { [Op.in]: ['pending', 'failed'] },
      payment_type: { [Op.ne]: 'cod' },
      createdAt: { [Op.gte]: since },
      order_id: { [Op.not]: null },
    },
    limit,
    order: [['createdAt', 'DESC']],
  });

  const summary = { checked: 0, corrected: 0, errors: 0, skipped: 0 };
  for (const p of candidates) {
    summary.checked++;
    try {
      const result = await reconcileOrderPayment(p.order_id);
      if (result.corrected) summary.corrected++;
      else if (result.skipped) summary.skipped++;
    } catch (err) {
      summary.errors++;
      logger.warn(`[reconcile] payment ${p.id} order ${p.order_id} failed: ${err.message}`);
    }
  }
  logger.info(`[reconcile] daily run: ${JSON.stringify(summary)}`);
  return summary;
}

module.exports = { reconcileOrderPayment, reconcileRecentPayments };
