const { Op } = require('sequelize');
const { logger } = require('../config/logging.js');
const { Payment } = require('../model/paymentModel.js');
const razorpay = require('./razorpayService.js');

async function verifyManualPrepaidPayment(paymentId, brandId, transaction, { lock }) {
  let remote;
  try {
    remote = await razorpay.getPayment(paymentId, brandId);
  } catch (error) {
    logger.warn(`Manual prepaid payment lookup failed for store ${brandId}: ${error.message}`);
    return { status: 502, error: 'Couldn’t verify the payment in this store’s Razorpay account. Check the store and payment ID.' };
  }

  const amount = Number(remote?.amount);
  if (!remote || remote.id !== paymentId || remote.status !== 'captured' || remote.currency !== 'INR' ||
      !Number.isSafeInteger(amount) || amount <= 0 || Number(remote.amount_refunded) > 0) {
    return { status: 409, error: 'Use a captured INR Razorpay payment with no refunds.' };
  }

  const references = [{ transaction_id: paymentId }, { razorpay_payment_id: paymentId }];
  if (remote.order_id) references.push({ razorpay_order_id: remote.order_id }, { transaction_id: remote.order_id });
  const rows = await Payment.findAll({
    where: { [Op.or]: references },
    order: [['id', 'ASC']],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (rows.some((row) => Number(row.brand_id) !== Number(brandId) || row.payment_gateway === 'CustomCheckout')) {
    return { status: 409, error: 'This payment belongs to another store or checkout provider.' };
  }
  if (rows.some((row) => row.order_id)) {
    return { status: 409, error: 'An order already exists for this Razorpay payment. Find it under Payments.' };
  }
  if (rows.some((row) => ['refunded', 'refund_pending', 'partial_refund'].includes(row.status))) {
    return { status: 409, error: 'This payment has a refund or a refund in progress.' };
  }

  const matching = rows.filter((row) => row.transaction_id === paymentId);
  const candidates = matching.length ? matching : rows.filter((row) => !row.transaction_id);
  const existing = candidates[0];
  if (candidates.length > 1 || (rows.length && !existing) ||
      (existing?.razorpay_order_id && existing.razorpay_order_id !== remote.order_id) ||
      (Number(existing?.amount_paid) > 0 && Number(existing.amount_paid) !== amount)) {
    return { status: 409, error: 'This payment does not match a single checkout record. Review it under Payments.' };
  }
  return { amount, razorpayOrderId: remote.order_id || null, existing };
}

module.exports = { verifyManualPrepaidPayment };
