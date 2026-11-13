'use strict';

// Courier scans can skip stages. Keep delivery attempts, return journeys and
// terminal outcomes separate instead of treating every exception as an advance.
const PRIORITY = {
  pending: 0, awaiting_confirmation: 0,
  processing: 10, confirmed: 10,
  manifested: 20, booked: 25, 'pickup initiated': 30,
  shipped: 40, 'in transit': 45, 'out for delivery': 60,
  undelivered: 70, exception: 70,
  rto: 80, return_initiated: 80,
  delivered: 100, cancelled: 100, 'order cancelled': 100,
  'rto delivered': 110, returned_rto: 110,
};
const TERMINAL = new Set(['cancelled', 'order cancelled', 'rto delivered', 'returned_rto']);
const RETURN_RECEIPT = new Set(['rto delivered', 'returned_rto']);

function shouldAdvanceOrderStatus(current, incoming) {
  if (!Object.prototype.hasOwnProperty.call(PRIORITY, incoming)) return false;
  if (current === incoming || TERMINAL.has(current)) return false;
  if (current === 'delivered') return incoming === 'return_initiated';
  if (current === 'rto' || current === 'return_initiated') return RETURN_RECEIPT.has(incoming);
  // Customer returns start from delivered and are otherwise owned by the
  // returns workflow, not an unrelated forward-shipment scan.
  if (incoming === 'return_initiated') return false;
  if (!Object.prototype.hasOwnProperty.call(PRIORITY, current)) return true;
  if (current === 'undelivered' && incoming === 'out for delivery') return true;
  return PRIORITY[incoming] >= PRIORITY[current];
}

module.exports = { shouldAdvanceOrderStatus };
