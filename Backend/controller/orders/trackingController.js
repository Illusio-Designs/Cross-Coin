/**
 * Order tracking domain (re-exports from orderController.js).
 * See controller/orders/createController.js for the migration strategy.
 *
 *   trackOrderByAWB           — public tracking by AWB number
 *   trackOrderByOrderNumber   — public tracking by order number
 *   getOrder                  — authenticated user fetches one of their orders
 *   getUserOrders             — authenticated user lists their orders
 */

const orderController = require('../orderController.js');

module.exports = {
  trackOrderByAWB: orderController.trackOrderByAWB,
  trackOrderByOrderNumber: orderController.trackOrderByOrderNumber,
  getOrder: orderController.getOrder,
  getUserOrders: orderController.getUserOrders,
};
