/**
 * Integration queue worker registration.
 *
 * Called once on server boot. Wires each job name to its handler so
 * failed shipping/payment integrations are retried automatically
 * instead of being lost in a fire-and-forget setImmediate().
 *
 * Job names:
 *   shipping:sync-order        — retry an order's shipping provider sync
 *   payment:reconcile-order    — reconcile a single Razorpay payment
 *   whatsapp:send-message      — retry a WhatsApp template send
 */

const { registerProcessor } = require('./integrationQueue.js');
const { logger } = require('../config/logging.js');

function registerWorkers() {
  // ── shipping:sync-order ────────────────────────────────────────────
  registerProcessor('shipping:sync-order', 2, async (job) => {
    const { orderId } = job.data;
    if (!orderId) throw new Error('orderId required');

    const { Order } = require('../model/orderModel.js');
    const { OrderItem } = require('../model/orderItemModel.js');
    const { Product } = require('../model/productModel.js');
    const { ProductVariation } = require('../model/productVariationModel.js');
    const { User } = require('../model/userModel.js');
    const { GuestUser } = require('../model/guestUserModel.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');

    const fullOrder = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }, { model: ProductVariation, as: 'ProductVariation' }] },
        { model: User, as: 'User', attributes: ['id', 'username', 'email'], required: false },
        { model: GuestUser, as: 'GuestUser', attributes: ['id', 'email', 'firstName', 'lastName', 'phone'], required: false },
        { model: ShippingAddress, as: 'ShippingAddress' },
      ],
    });
    if (!fullOrder) throw new Error(`order ${orderId} not found`);
    if (fullOrder.fship_sync_status === 'synced') {
      logger.info(`[queue] shipping:sync-order skipped — ${fullOrder.order_number} already synced`);
      return { skipped: true };
    }

    const orderShippingController = require('../controller/orderShippingController.js');
    const result = await orderShippingController.enhancedSyncSingleOrder(fullOrder);
    if (!result.success) {
      // Throw so Bull schedules another attempt per backoff policy.
      throw new Error(result.error || 'sync returned success=false');
    }
    logger.info(`[queue] shipping:sync-order ok — ${fullOrder.order_number} AWB ${result.waybill || 'N/A'}`);
    return result;
  });

  // ── payment:reconcile-order ────────────────────────────────────────
  registerProcessor('payment:reconcile-order', 4, async (job) => {
    const { orderId } = job.data;
    if (!orderId) throw new Error('orderId required');

    const { reconcileOrderPayment } = require('./paymentReconciliationService.js');
    const result = await reconcileOrderPayment(orderId);
    if (!result.success) throw new Error(result.error || 'reconciliation failed');
    return result;
  });

  // ── whatsapp:send-message ──────────────────────────────────────────
  registerProcessor('whatsapp:send-message', 2, async (job) => {
    const { phone, template, params, brandId } = job.data;
    if (!phone || !template) throw new Error('phone and template required');

    const whatsappService = require('./whatsappService.js');
    const fn = whatsappService[template];
    if (typeof fn !== 'function') throw new Error(`unknown WA template fn: ${template}`);
    return await fn(phone, params || {}, brandId || 1);
  });

  logger.info('[integrationQueue] all workers registered');
}

module.exports = { registerWorkers };
