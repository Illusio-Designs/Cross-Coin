// Customer-facing order / payment / return status helpers — one source for
// every storefront, so the account, order and tracking pages all speak the
// same language as the backend.
//
// Backend order statuses: pending, awaiting_confirmation, confirmed,
// processing, booked, pickup initiated, manifested, in transit, shipped,
// out for delivery, delivered, undelivered, rto, rto delivered,
// return_initiated, returned_rto, cancelled, order cancelled, exception.
// Payment statuses: pending, paid, failed, refunded, cancelled,
// refund_pending, partial_refund.
// Return statuses: requested, under_review, approved, pickup_scheduled,
// picked_up, received, refunded, rejected.

const norm = (s) => String(s || '').trim().toLowerCase().replace(/_/g, ' ');

const ORDER = {
  'pending':               { label: 'Order placed',            tone: 'info' },
  'awaiting confirmation': { label: 'Awaiting confirmation',   tone: 'warn' },
  'confirmed':             { label: 'Confirmed',               tone: 'info' },
  'processing':            { label: 'Processing',              tone: 'info' },
  'booked':                { label: 'Packed',                  tone: 'info' },
  'pickup initiated':      { label: 'Ready to ship',           tone: 'info' },
  'manifested':            { label: 'Ready to ship',           tone: 'info' },
  'shipped':               { label: 'Shipped',                 tone: 'info' },
  'in transit':            { label: 'In transit',              tone: 'info' },
  'out for delivery':      { label: 'Out for delivery',        tone: 'info' },
  'delivered':             { label: 'Delivered',               tone: 'ok' },
  'undelivered':           { label: 'Delivery attempt failed', tone: 'warn' },
  'exception':             { label: 'Delayed',                 tone: 'warn' },
  'rto':                   { label: 'Returning to seller',     tone: 'bad' },
  'rto delivered':         { label: 'Returned to seller',      tone: 'bad' },
  'return initiated':      { label: 'Return in progress',      tone: 'warn' },
  'returned rto':          { label: 'Returned',                tone: 'bad' },
  'cancelled':             { label: 'Cancelled',               tone: 'bad' },
  'order cancelled':       { label: 'Cancelled',               tone: 'bad' },
};

/** Friendly label for an order status. */
export function orderStatusLabel(status) {
  const s = norm(status);
  if (ORDER[s]) return ORDER[s].label;
  return s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}

/** 'ok' | 'info' | 'warn' | 'bad' — map to the store's own badge colours. */
export function orderStatusTone(status) {
  return (ORDER[norm(status)] || {}).tone || 'info';
}

export const isCancelledStatus = (status) => ['cancelled', 'order cancelled'].includes(norm(status));
export const isRtoStatus = (status) => ['rto', 'rto delivered', 'returned rto'].includes(norm(status));
export const isDeliveryProblem = (status) => ['undelivered', 'exception'].includes(norm(status));

/** Orders the customer can still cancel themselves (before dispatch). */
export const canCancelOrder = (status) =>
  ['pending', 'awaiting confirmation', 'confirmed', 'processing'].includes(norm(status));

/** A return can be requested for delivered orders (the server checks the window). */
export const canRequestReturn = (status) => norm(status) === 'delivered';

/** Still moving (shown in "active orders" lists). */
export const isActiveOrder = (status) =>
  !['delivered', 'cancelled', 'order cancelled', 'rto delivered', 'returned rto'].includes(norm(status));

/**
 * Position on a 4-step tracker: 0 Confirmed, 1 Packed, 2 Shipped, 3 Delivered.
 * Returns -1 before confirmation. Problem / return / cancel states keep the
 * furthest step reached so the bar never jumps back to "Order placed".
 */
export function trackingStep(status) {
  const s = norm(status);
  if (['pending', 'awaiting confirmation'].includes(s)) return -1;
  if (s === 'confirmed') return 0;
  if (['processing', 'booked', 'pickup initiated', 'manifested'].includes(s)) return 1;
  if (['shipped', 'in transit', 'out for delivery', 'undelivered', 'exception', 'rto'].includes(s)) return 2;
  if (['delivered', 'return initiated', 'returned rto', 'rto delivered'].includes(s)) return 3;
  return -1;
}

/** One-line explanation for states that need the customer's attention. */
export function orderStatusNote(status, paymentType) {
  const s = norm(status);
  const cod = norm(paymentType) === 'cod';
  if (s === 'awaiting confirmation') return 'Please confirm your order on WhatsApp so we can ship it.';
  if (s === 'undelivered') return "The courier couldn't deliver this order. Check WhatsApp to choose a new delivery attempt or update your address.";
  if (s === 'exception') return 'Your shipment is delayed. We are following up with the courier.';
  if (s === 'rto') return cod
    ? 'This parcel is on its way back to us after delivery attempts failed.'
    : 'This parcel is on its way back to us. Your refund is issued once it reaches our warehouse.';
  if (s === 'rto delivered' || s === 'returned rto') return cod
    ? 'This parcel was returned to us.'
    : 'This parcel was returned to us. Your refund has been issued to your original payment method.';
  if (s === 'return initiated') return 'Your return request is in progress — see Returns for updates.';
  return '';
}

const PAYMENT = {
  'pending':        'Payment pending',
  'paid':           'Paid',
  'failed':         'Payment failed',
  'refunded':       'Refunded',
  'partial refund': 'Partly refunded',
  'refund pending': 'Refund in progress',
  'cancelled':      'Cancelled',
};

/** "Cash on Delivery" / "Prepaid · Paid" / "Prepaid · Refund in progress" … */
export function paymentSummary(paymentType, paymentStatus) {
  const cod = norm(paymentType) === 'cod';
  const st = norm(paymentStatus);
  const method = cod ? 'Cash on Delivery' : 'Prepaid';
  if (cod && (!st || st === 'pending')) return method;
  return PAYMENT[st] ? `${method} · ${PAYMENT[st]}` : method;
}

export const RETURN_STATUS_LABEL = {
  requested: 'Requested',
  under_review: 'Under review',
  approved: 'Approved — pickup soon',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  received: 'Received — refund in progress',
  refunded: 'Refunded',
  rejected: 'Not approved',
};

/** How a return is refunded: COD → UPI payout, prepaid → original method. */
export function returnRefundMethod(ret) {
  if (!ret) return '';
  const cod = ret.is_cod || norm(ret.Order?.payment_type) === 'cod' || ret.resolution === 'upi';
  return cod ? `UPI${ret.upi_id ? ` (${ret.upi_id})` : ''}` : 'Original payment method';
}
