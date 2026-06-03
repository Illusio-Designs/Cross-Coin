/**
 * Order lifecycle mutations (re-exports from orderController.js).
 * See controller/orders/createController.js for the migration strategy.
 *
 *   confirmOrder       — admin confirms a pending order
 *   updateOrderStatus  — admin/system bumps order to next state
 *   cancelOrder        — user-initiated cancellation
 *   adminCancelOrder   — admin-initiated cancellation (different audit metadata)
 *   initiateReturn     — user initiates a return after delivery
 *   updateAwbNumber    — admin manually corrects the AWB
 */

const orderController = require('../orderController.js');

module.exports = {
  confirmOrder: orderController.confirmOrder,
  updateOrderStatus: orderController.updateOrderStatus,
  cancelOrder: orderController.cancelOrder,
  adminCancelOrder: orderController.adminCancelOrder,
  initiateReturn: orderController.initiateReturn,
  updateAwbNumber: orderController.updateAwbNumber,
};
