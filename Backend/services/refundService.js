'use strict';

const { logger } = require('../config/logging.js');
const { sequelize } = require('../config/db.js');
const orderEmitter = require('./orderEvents.js');

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

    // Must have a Razorpay payment ID to refund
    if (!payment.transaction_id || !payment.transaction_id.startsWith('pay_')) {
      throw new Error('No Razorpay payment ID found — cannot process refund for COD orders');
    }

    // Check refundable status
    const REFUNDABLE_PAYMENT = ['paid', 'refund_pending'];
    if (!REFUNDABLE_PAYMENT.includes(payment.status)) {
      throw new Error(`Cannot refund payment in "${payment.status}" status`);
    }

    const order = await Order.findByPk(payment.order_id, { transaction: t });
    if (!order) throw new Error('Order not found for this payment');

    const REFUNDABLE_ORDER = ['cancelled', 'return_initiated', 'returned_rto', 'rto delivered'];
    if (!REFUNDABLE_ORDER.includes(order.status)) {
      throw new Error(`Refund not allowed for orders in "${order.status}" status`);
    }

    // Calculate refund amount
    const refundAmount = amount ? parseFloat(amount) : parseFloat(payment.amount_paid);
    if (refundAmount <= 0 || refundAmount > parseFloat(payment.amount_paid)) {
      throw new Error(`Invalid refund amount: ₹${refundAmount}. Max: ₹${payment.amount_paid}`);
    }

    const isPartial = refundAmount < parseFloat(payment.amount_paid);

    // Call Razorpay refund API
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

    // Update payment record
    await payment.update({
      status: isPartial ? 'partial_refund' : 'refunded',
      notes: `${isPartial ? 'Partial' : 'Full'} refund: ₹${refundAmount}. Razorpay refund ID: ${razorpayRefund.id}. Reason: ${reason}`,
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
      transaction_id: razorpayRefund.id,
      razorpay_order_id: payment.razorpay_order_id,
      amount_paid: -refundAmount,
      status: 'refunded',
      notes: `Refund for order ${order.order_number}: ${reason}`,
      brand_id: brandId,
    }, { transaction: t });

    // Status history
    await OrderStatusHistory.create({
      order_id: order.id,
      status: order.status,
      updated_by: adminId,
      notes: `${isPartial ? 'Partial' : 'Full'} refund of ₹${refundAmount} processed. Razorpay ID: ${razorpayRefund.id}`,
    }, { transaction: t });

    // Audit log
    await auditLog(order.id, 'refund', adminId, 'admin', {
      refundAmount,
      isPartial,
      razorpayRefundId: razorpayRefund.id,
      reason,
    }, t);

    // Send WhatsApp notification (after commit)
    setImmediate(async () => {
      try {
        const addr = await ShippingAddress.findByPk(order.shipping_address_id);
        if (addr?.phone) {
          await whatsappService.sendRefundProcessed(addr.phone, {
            orderNumber: order.order_number,
            amount: refundAmount.toFixed(2),
            method: 'Original Payment Method',
          }, brandId);
        }
      } catch (e) { logger.warn('WhatsApp refund notification failed:', e.message); }
    });

    logger.info(`[Refund] ₹${refundAmount} refunded for order ${order.order_number} (Razorpay: ${razorpayRefund.id})`);

    return {
      success: true,
      refund: {
        razorpay_refund_id: razorpayRefund.id,
        amount: refundAmount,
        is_partial: isPartial,
        status: razorpayRefund.status,
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

  const payment = await Payment.findOne({
    where: { order_id: orderId, status: 'paid' },
    order: [['createdAt', 'DESC']],
  });

  if (!payment || !payment.transaction_id?.startsWith('pay_')) {
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

module.exports = { processRefund, autoRefundOnCancel };
