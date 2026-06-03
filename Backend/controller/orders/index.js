/**
 * Domain-grouped facade for order operations.
 *
 *   const { create, tracking, lifecycle, admin } = require('../controller/orders');
 *   router.post('/', isAuthenticated, create.createOrder);
 *
 * Behind the scenes everything still resolves to controller/orderController.js
 * until functions are migrated out one-by-one. Routes can adopt this
 * import style today and start enjoying the domain grouping in their
 * IDE; the underlying refactor is incremental.
 */

module.exports = {
  create: require('./createController.js'),
  tracking: require('./trackingController.js'),
  lifecycle: require('./lifecycleController.js'),
  admin: require('./adminController.js'),
};
