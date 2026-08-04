/**
 * Order admin-side queries (re-exports from orderController.js).
 * See controller/orders/createController.js for the migration strategy.
 *
 *   getAllOrders   — paginated admin list with filters
 *   getOrderStats  — KPIs for the dashboard
 */

const orderController = require('../orderController.js');

module.exports = {
  getAllOrders: orderController.getAllOrders,
  getOrderStats: orderController.getOrderStats,
};
