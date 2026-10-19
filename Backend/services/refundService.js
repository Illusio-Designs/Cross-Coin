'use strict';

const { logger } = require('../config/logging.js');
const { sequelize } = require('../config/db.js');

/**
 * Refund Service — handles full and partial refunds via Razorpay.
 *
 * Flows:
 * 1. Admin manual refund (full or partial)
 * 2. Auto-refund on prepaid order cancellation
 * 3. Return refund after RTO/return received
 *
 * Tracks refund status in payments table + order_audit_logs.
 */

/**
 * Process a refund for a payment.
 *
 * @param {object} options
 * @param {number} options.paymentId - Payment record ID
 * @param {number|null} options.amount - Refund amount in rupees (null = full refund)
 * @param {string} options.reason - Refund reason
 * @param {number} options.adminId - Admin user ID performing the refund
 * @param {number} options.brandId - Brand ID
 * @returns {{ success, refund, payment }}
 */
async function processRefund({ paymentId, amount = null, reason, adminId, brandId = 1 }) {
  const { Payment } = require('../model/paymentModel.js');
  const { Order } = require('../model/orderModel.js');
  const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
  const razorpayService = require('./razorpayService.js');
  const { auditLog } = require('./orderService.js');
  const whatsappService = require('./whatsappService.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');

  return sequelize.transaction(async (t) => {
    const payment = await Payment.findByPk(paymentId, { transaction: t });
    if (!payment) throw new Error('Payment not found');

    // Custom-checkout payments refund through the provider's refund API, not
    // our Razorpay keys (their pg transaction belongs to the provider's MID).
    const isCustomCheckout = String(payment.payment_gateway || '').toLowerCase() === 'customcheckout'
      || /custom checkout/i.test(payment.notes || '');

    // Must have a Razorpay payment ID to refund (unless custom checkout)
    if (!isCustomCheckout && (!payment.transaction_id || !payment.transaction_id.startsWith('pay_'))) {
      throw new Error('No Razorpay payment ID found — cannot process refund for COD orders');
    }

    // Check refundable status. The payments table uses 'successful' (paid) and
    // 'completed'; it has NO 'paid' value — the old list silently blocked every
    // refund, so prepaid customers never got their money back.
    const REFUNDABLE_PAYMENT = ['successful', 'completed', 'refund_pending'];
    if (!REFUNDABLE_PAYMENT.includes(payment.status)) {
      throw new Error(`Cannot refund payment in "${payment.status}" status`);
    }

    const order = await Order.findByPk(payment.order_id, { transaction: t });
    if (!order) throw new Error('Order not found for this payment');

    const REFUNDABLE_ORDER = ['cancelled', 'return_initiated', 'returned_rto', 'rto delivered'];
    if (!REFUNDABLE_ORDER.includes(order.status)) {
      throw new Error(`Refund not allowed for orders in "${order.status}" status`);
    }

    // Calculate refund amount — in RUPEES from here on. Every refundable
    // payment row (Razorpay 'pay_…' and CustomCheckout) stores amount_paid in
    // PAISE; reading it as rupees made every full refund request 100x the
    // money, so Razorpay rejected it and orders stuck at refund_pending.
    const paidRupees = Math.abs(parseFloat(payment.amount_paid) || 0) / 100;
    const refundAmount = amount ? parseFloat(amount) : paidRupees;
    if (refundAmount <= 0 || refundAmount > paidRupees + 0.01) {
      throw new Error(`Invalid refund amount: ₹${refundAmount}. Max: ₹${paidRupees.toFixed(2)}`);
    }

    const isPartial = refundAmount < paidRupees - 0.01;

    // Call the gateway's refund API (provider for custom checkout, else Razorpay)
    let refundId, refundStatus;
    if (isCustomCheckout) {
      const customCheckout = require('./customCheckoutService.js');
      const cartId = (payment.notes || '').match(/cart_id\s+([\w-]+)/i)?.[1];
      try {
        const resp = await customCheckout.initiateRefund(order.brand_id || brandId, {
          transaction_id: payment.transaction_id,
          ...(cartId && cartId !== '-' ? { cart_id: cartId } : {}),
          amount: refundAmount,
          refund_type: isPartial ? 'PARTIAL' : 'FULL',
        });
        const d = resp?.data?.data || resp?.data || resp || {};
        refundId = d.id || d.transaction_id || 'requested';
        refundStatus = d.status || 'INITIATED';
      } catch (err) {
        throw new Error(`Custom checkout refund failed: ${err.message}`);
      }
    } else {
      let razorpayRefund;
      try {
        razorpayRefund = await razorpayService.createRefund(payment.transaction_id, {
          amount: refundAmount,
          notes: { reason, order_number: order.order_number, admin_id: adminId },
          brandId,
        });
      } catch (err) {
        throw new Error(`Razorpay refund failed: ${err.message}`);
      }
      refundId = razorpayRefund.id;
      refundStatus = razorpayRefund.status;
    }
    const gatewayLabel = isCustomCheckout ? 'Custom checkout refund ref' : 'Razorpay refund ID';

    // Update payment record
    await payment.update({
      status: isPartial ? 'partial_refund' : 'refunded',
      notes: `${isPartial ? 'Partial' : 'Full'} refund: ₹${refundAmount}. ${gatewayLabel}: ${refundId}. Reason: ${reason}`,
    }, { transaction: t });

    // Update order payment status
    await order.update({
      payment_status: isPartial ? 'partial_refund' : 'refunded',
    }, { transaction: t });

    // Create refund record in payments table (negative amount)
    await Payment.create({
      order_id: order.id,
      user_id: order.user_id,
      payment_type: 'razorpay',
      transaction_id: refundId,
      razorpay_order_id: payment.razorpay_order_id,
      // Store in paise like every other gateway payment row.
      amount_paid: -Math.round(refundAmount * 100),
      status: 'refunded',
      notes: `Refund for order ${order.order_number}: ${reason}`,
      brand_id: brandId,
    }, { transaction: t });

    // Status history
    await OrderStatusHistory.create({
      order_id: order.id,
      status: order.status,
      updated_by: adminId,
      notes: `${isPartial ? 'Partial' : 'Full'} refund of ₹${refundAmount} processed. ${gatewayLabel}: ${refundId}`,
    }, { transaction: t });

    // Audit log
    await auditLog(order.id, 'refund', adminId, 'admin', {
      refundAmount,
      isPartial,
      refundId, gateway: isCustomCheckout ? "custom-checkout" : "razorpay",
      reason,
    }, t);

    // Take back the loyalty points this order earned (prorated for a partial refund).
    require('./loyaltyService.js').reversePointsLater(order.id, {
      amount: isPartial ? refundAmount : null, ref: refundId, reason: isPartial ? 'part refunded' : 'refunded',
    });

    // Send WhatsApp notification (after commit)
    setImmediate(async () => {
      try {
        const addr = await ShippingAddress.findByPk(order.shipping_address_id);
        if (addr?.phone) {
          await whatsappService.sendRefundProcessed(addr.phone, {
            name: (addr.full_name || '').split(' ')[0] || 'there',
            orderNumber: order.order_number,
            amount: refundAmount.toFixed(2),
            paymentMethod: 'Original Payment Method',
          }, brandId);
        }
      } catch (e) { logger.warn('WhatsApp refund notification failed:', e.message); }
    });

    logger.info(`[Refund] ₹${refundAmount} refunded for order ${order.order_number} (${gatewayLabel}: ${refundId})`);

    return {
      success: true,
      refund: {
        razorpay_refund_id: refundId,
        amount: refundAmount,
        is_partial: isPartial,
        status: refundStatus,
      },
      payment: { id: payment.id, status: payment.status },
      order: { id: order.id, order_number: order.order_number, payment_status: order.payment_status },
    };
  });
}

/**
 * Auto-refund for prepaid cancelled orders.
 * Called from orderService.cancelOrder when payment_status is 'paid'.
 */
async function autoRefundOnCancel(orderId, reason, adminId) {
  const { Payment } = require('../model/paymentModel.js');

  // The paid payment row uses status 'successful' / 'completed' (NOT 'paid') and
  // stores the Razorpay payment id (pay_…) in transaction_id. The old query used
  // 'paid', matched nothing, and skipped every auto-refund.
  const payment = await Payment.findOne({
    where: { order_id: orderId, status: ['successful', 'completed'] },
    order: [['createdAt', 'DESC']],
  });

  if (!payment || (!payment.transaction_id?.startsWith('pay_') && String(payment.payment_gateway || '').toLowerCase() !== 'customcheckout')) {
    logger.info(`[Refund] No refundable payment for order ${orderId} — skipping auto-refund`);
    return null;
  }

  try {
    return await processRefund({
      paymentId: payment.id,
      amount: null, // full refund
      reason: reason || 'Auto-refund on order cancellation',
      adminId: adminId || null,
      brandId: payment.brand_id || 1,
    });
  } catch (err) {
    logger.error(`[Refund] Auto-refund failed for order ${orderId}:`, err.message);
    return null;
  }
}

/**
 * Auto-refund for a prepaid RTO order once the returned parcel is RECEIVED and
 * confirmed at the warehouse (order status 'rto delivered' / 'returned_rto').
 *
 * This is the rule-compliant trigger: on RTO *start* the money is NOT moved —
 * the order/payment are parked at 'refund_pending' and the customer gets the
 * "refund on the way" notice. Only when the goods are physically back do we call
 * this, which issues the real Razorpay refund and sends the "Refund Initiated"
 * WhatsApp message (via processRefund). COD RTOs never reach here (no pay_ id).
 *
 * Idempotent-ish: the paid row flips to 'refunded' after a successful refund, so
 * a second warehouse webhook finds nothing refundable and quietly no-ops.
 */
async function autoRefundOnRtoReceipt(orderId, reason, adminId) {
  const { Payment } = require('../model/paymentModel.js');

  // Accept the paid row in any still-refundable state. After RTO start we set it
  // to 'refund_pending'; a straight webhook may still show 'successful'/'completed'.
  const payment = await Payment.findOne({
    where: { order_id: orderId, status: ['successful', 'completed', 'refund_pending'] },
    order: [['createdAt', 'DESC']],
  });

  if (!payment || (!payment.transaction_id?.startsWith('pay_') && String(payment.payment_gateway || '').toLowerCase() !== 'customcheckout')) {
    logger.info(`[Refund] No refundable prepaid payment for RTO order ${orderId} — skipping warehouse-receipt refund`);
    return null;
  }

  try {
    return await processRefund({
      paymentId: payment.id,
      amount: null, // full refund
      reason: reason || 'Prepaid RTO — returned parcel received at warehouse',
      adminId: adminId || null,
      brandId: payment.brand_id || 1,
    });
  } catch (err) {
    logger.error(`[Refund] Warehouse-receipt RTO refund failed for order ${orderId}:`, err.message);
    return null;
  }
}

module.exports = { processRefund, autoRefundOnCancel, autoRefundOnRtoReceipt };
