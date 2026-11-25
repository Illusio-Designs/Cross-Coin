const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const paymentSelect = `SELECT p.id, p.transaction_id, p.razorpay_payment_id, p.razorpay_order_id, p.reservation_id, p.brand_id,
    p.payment_gateway, p.amount_paid, p.status, p.order_id,
    o.id AS linked_order_id, o.brand_id AS order_brand_id, o.order_number, o.status AS order_status,
    o.payment_type AS order_payment_type, o.payment_status AS order_payment_status, o.final_amount
  FROM payments p LEFT JOIN orders o ON o.id = p.order_id`;
const onlinePayment = "p.amount_paid > 0 AND p.payment_type <> 'cod'";
const query = (condition, replacements) => sequelize.query(
  `${paymentSelect} WHERE ${onlinePayment} AND (${condition}) ORDER BY p.id DESC`,
  { replacements, type: QueryTypes.SELECT },
);

function savedRazorpayPaymentId(row) {
  return row.razorpay_payment_id || (/^pay_/.test(row.transaction_id || '') ? row.transaction_id : null);
}

async function findRazorpayOrderMatches(payments) {
  const paymentIds = [...new Set(payments.map(({ id }) => id))];
  if (!paymentIds.length) return new Map();
  const orderRefs = [...new Set(payments.map(({ order_id }) => order_id).filter(Boolean))];
  const rows = await query(
    `p.transaction_id IN (:paymentIds) OR p.razorpay_payment_id IN (:paymentIds)
      ${orderRefs.length ? 'OR p.razorpay_order_id IN (:orderRefs) OR p.transaction_id IN (:orderRefs)' : ''}`,
    { paymentIds, ...(orderRefs.length ? { orderRefs } : {}) },
  );
  const reservations = [...new Set(rows.filter((row) => !row.order_id).map((row) => row.reservation_id).filter(Boolean))];
  const linkedRetries = reservations.length
    ? await query('p.reservation_id IN (:reservations) AND p.order_id IS NOT NULL', { reservations })
    : [];

  return new Map(payments.map(({ id, order_id: orderRef, amount, currency, status }) => {
    const exact = rows.filter((row) => savedRazorpayPaymentId(row) === id);
    const byOrder = orderRef
      ? rows.filter((row) => row.razorpay_order_id === orderRef || row.transaction_id === orderRef)
      : [];
    const candidates = [...new Set([...exact, ...byOrder])];
    const retryRows = linkedRetries.filter((retry) => candidates.some((row) =>
      row.reservation_id === retry.reservation_id && Number(row.brand_id) === Number(retry.brand_id)));
    // A real order linked by the exact payment ID takes precedence over other
    // attempts. Otherwise include the order ID and saved checkout retries.
    const linkedExact = exact.filter((row) => row.order_id);
    const matched = linkedExact.length ? linkedExact : [...candidates, ...retryRows];
    const brands = new Set(matched.map((row) => Number(row.brand_id)));
    const orderIds = new Set(matched.filter((row) => row.order_id).map((row) => Number(row.order_id)));
    const conflict = brands.size > 1 || orderIds.size > 1 || matched.some((row) =>
      row.order_id && (!row.linked_order_id || Number(row.brand_id) !== Number(row.order_brand_id)));
    const linkedRows = matched.filter((row) => row.linked_order_id);
    const linked = conflict ? null : linkedRows.find(savedRazorpayPaymentId) || linkedRows[0];
    const savedPaymentId = linked ? savedRazorpayPaymentId(linked) : null;
    const otherPayment = savedPaymentId && savedPaymentId !== id;
    const orderMismatch = linked && !otherPayment && savedPaymentId === id && orderRef
      && linked.razorpay_order_id && linked.razorpay_order_id !== orderRef;
    const amountMismatch = linked && status === 'captured' && currency === 'INR'
      && Number(linked.amount_paid) !== Number(amount);
    const issue = conflict ? 'This payment has conflicting order or brand references.'
      : otherPayment ? 'An order exists for this checkout with a different payment ID.'
      : orderMismatch ? 'The Razorpay order ID differs from the one saved for this payment.'
      : amountMismatch ? 'The Razorpay amount differs from the amount saved for this order.' : null;
    const pending = [...exact, ...byOrder].find((row) => row.payment_gateway !== 'CustomCheckout'
      && row.razorpay_order_id === orderRef && (!row.transaction_id?.startsWith('pay_')
        || row.transaction_id === id || ['pending', 'failed'].includes(row.status)));
    return [id, {
      linked, pending, issue, savedPaymentId, brandId: brands.size === 1 ? brands.values().next().value : null,
      hasLocalPayment: candidates.length > 0,
    }];
  }));
}

module.exports = { findRazorpayOrderMatches };
