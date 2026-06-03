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

  // ── cron:fship-sync ───────────────────────────────────────────────
  // Triggered by the 2-hourly cron. Runs the bulk sync controller. Bull
  // gives us automatic retries on transient FShip outages instead of
  // losing the run until the next 2-hour tick.
  registerProcessor('cron:fship-sync', 1, async () => {
    const orderShippingController = require('../controller/orderShippingController.js');
    const mockReq = { user: { id: 'system', username: 'cron_job' }, query: { limit: 50 } };
    let result = null;
    const mockRes = {
      json: (data) => { result = data; },
      status: () => ({ json: () => {} }),
    };
    await orderShippingController.syncOrdersWithFShip(mockReq, mockRes);
    logger.info(`[queue] cron:fship-sync done: ${JSON.stringify(result?.data || {}).slice(0, 200)}`);
    return result || { ok: true };
  });

  // ── cron:fship-status-refresh ─────────────────────────────────────
  registerProcessor('cron:fship-status-refresh', 1, async () => {
    const orderShippingController = require('../controller/orderShippingController.js');
    const mockReq = {
      user: { id: 'system', username: 'cron_job' },
      query: {
        limit: 100,
        status: 'confirmed,processing,booked,pickup initiated,manifested,in transit,shipped,out for delivery,undelivered,rto,exception',
      },
    };
    let result = null;
    const mockRes = {
      json: (data) => { result = data; },
      status: () => ({ json: () => {} }),
    };
    await orderShippingController.bulkRefreshFShipStatus(mockReq, mockRes);
    logger.info(`[queue] cron:fship-status-refresh done: ${JSON.stringify(result?.data || {}).slice(0, 200)}`);
    return result || { ok: true };
  });

  // ── cron:loyalty-expiry ───────────────────────────────────────────
  registerProcessor('cron:loyalty-expiry', 1, async () => {
    const loyaltyService = require('./loyaltyService.js');
    const result = await loyaltyService.expirePoints();
    logger.info(`[queue] cron:loyalty-expiry done: ${JSON.stringify(result || {}).slice(0, 200)}`);
    return result;
  });

  // ── cron:instagram-refresh ────────────────────────────────────────
  registerProcessor('cron:instagram-refresh', 1, async () => {
    const instagramService = require('./instagramService.js');
    const brandId = 1;
    await instagramService.refreshAccessTokenIfNeeded(brandId);
    const result = await instagramService.refreshFeed(brandId);
    logger.info(`[queue] cron:instagram-refresh done: stale=${!!result.stale} count=${Array.isArray(result.data) ? result.data.length : 0}`);
    return { stale: !!result.stale, count: Array.isArray(result.data) ? result.data.length : 0 };
  });

  logger.info('[integrationQueue] all workers registered');
}

module.exports = { registerWorkers };
