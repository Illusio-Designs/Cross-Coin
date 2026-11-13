'use strict';

// Cancelling fulfillment must not erase money that is already being refunded.
const REFUND_STATES = new Set(['refund_pending', 'partial_refund', 'refunded']);
function paymentStatusAfterCancellation(status) {
  if (REFUND_STATES.has(status)) return status;
  return status === 'paid' ? 'refund_pending' : 'cancelled';
}

function assertPaymentCanConfirm(order) {
  const isCod = order.payment_type === 'cod';
  if (order.payment_status === 'paid' || (isCod && order.payment_status === 'pending')) return;
  const error = new Error('Cannot confirm order: payment must be verified as paid (or pending for Cash on Delivery)');
  error.status = 409;
  throw error;
}

function cancellationRefundInfo(order) {
  if (order.payment_status === 'refunded') return 'Your refund has already been processed.';
  if (order.payment_status === 'partial_refund') return 'A partial refund has already been processed. Contact support to confirm any remaining refund.';
  if (order.payment_type !== 'cod' && ['paid', 'refund_pending'].includes(order.payment_status)) {
    return 'Your refund is pending. We will notify you once it has been processed.';
  }
  return 'No payment was collected, so no refund is needed.';
}

module.exports = { paymentStatusAfterCancellation, assertPaymentCanConfirm, cancellationRefundInfo };
