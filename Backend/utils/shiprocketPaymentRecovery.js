function razorpayOrderReferences(entry) {
  return [entry.razorpay_order_id, entry.pg_order_id, entry.gateway_order_id, entry.pg_transaction_id, entry.txn_id]
    .filter((id) => typeof id === 'string' && /^order_[a-zA-Z0-9]{6,64}$/.test(id));
}

function canImportCapturedCheckout(order) {
  return ['', 'SUCCESS', 'PENDING', 'CREATED', 'INITIATED', 'PROCESSING']
    .includes(String(order.status || '').trim().toUpperCase());
}

function verifyShiprocketRecovery(order, orderId, payment) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 409 }); };
  if (String(order.platform_order_id || order.order_id || '') !== orderId) {
    fail('Shiprocket returned a different order reference.');
  }
  if (!canImportCapturedCheckout(order)) fail('The original Shiprocket checkout is closed or unavailable for import.');
  if (String(order.payment_type || '').toLowerCase() === 'cod') fail('The referenced checkout is cash on delivery.');

  const payments = Array.isArray(order.payments) ? order.payments.filter(Boolean) : [];
  const captured = payments.filter((entry) =>
    ['captured', 'success', 'successful', 'paid', 'completed'].includes(String(entry.status || entry.payment_status || '').toLowerCase()));
  const candidates = captured.length === 1 ? captured : payments.length <= 1 ? [payments[0] || {}] : [];
  const matched = candidates.filter((entry) => {
    if ([entry.payment_method, entry.payment_type, entry.payment_mode, entry.gateway, entry.mode]
      .some((value) => /^(cod|cash[\s_-]*on[\s_-]*delivery|cash)$/i.test(String(value || '').trim()))) return false;
    const ids = [entry.razorpay_payment_id, entry.pg_transaction_id, entry.txn_id, order.razorpay_payment_id]
      .filter((id) => typeof id === 'string' && /^pay_/.test(id));
    const orderIds = [...razorpayOrderReferences(entry), ...razorpayOrderReferences(order)];
    if (orderIds.some((id) => id !== payment.order_id)) return false;
    if (ids.length) return ids.includes(payment.id) && ids.every((id) => id === payment.id);
    return orderIds.length > 0;
  });
  if (matched.length !== 1) fail('The Razorpay payment ID or order reference does not match this Shiprocket order.');
  const total = Number(order.total_amount_payable);
  if (!Number.isFinite(total) || total <= 0 || Math.round(total * 100) !== Number(payment.amount)) {
    fail('The captured Razorpay amount does not match the Shiprocket order total.');
  }
}

module.exports = { razorpayOrderReferences, verifyShiprocketRecovery, canImportCapturedCheckout };
