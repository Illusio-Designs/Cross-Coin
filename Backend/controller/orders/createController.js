/**
 * Order creation domain (re-exports from orderController.js).
 *
 * The actual implementations still live in controller/orderController.js
 * — moving 2.4k LOC across files in one PR is high-risk for a system
 * that has audit/queue/transaction state woven throughout. These shim
 * files document the domain boundaries and let routes import from a
 * domain-specific path:
 *
 *   const { createOrder } = require('../controller/orders/createController.js');
 *
 * Migration plan: when you touch one of these functions for any reason,
 * move it OUT of orderController.js and into this file, then point the
 * shim re-export at the local implementation. Repeat until
 * orderController.js is a pure index file.
 *
 * What lives here:
 *   - createOrder            — authenticated user creates an order
 *   - createGuestOrder       — guest checkout
 *   - adminCreateManualOrder — admin creates an order on behalf of a user
 *   - checkAddressQuality    — pre-checkout COD eligibility probe
 */

const orderController = require('../orderController.js');

module.exports = {
  createOrder: orderController.createOrder,
  createGuestOrder: orderController.createGuestOrder,
  adminCreateManualOrder: orderController.adminCreateManualOrder,
  checkAddressQuality: orderController.checkAddressQuality,
};
