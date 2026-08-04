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
    const { orderId, logistics = null, serviceType = null, auto = false } = job.data;
    if (!orderId) throw new Error('orderId required');

    // Manual booking mode (default): skip only AUTO-origin jobs (the cron bulk
    // sweep enqueues with auto:true) so they don't book or retry. MANUAL jobs —
    // the courier-picker's sync-with-courier — are NOT auto, so they still run.
    // Set SHIPPING_AUTO_SYNC=on to restore automatic booking.
    if (auto && !require('./shippingAutoSync.js').isAutoSyncEnabled()) {
      logger.info(`[queue] shipping:sync-order skipped — manual mode (auto job, order ${orderId})`);
      return { skipped: true, manual: true };
    }

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

    // On the FINAL attempt (or a permanent failure) we flip the order to
    // 'failed' with the reason, so it stops showing "Pending Sync" forever —
    // the admin then sees the error and the manual courier picker takes over.
    const attempts = job.opts?.attempts || 1;
    const isLastAttempt = (job.attemptsMade || 0) >= (attempts - 1);
    const markFailed = (reason) => fullOrder.update({
      fship_sync_status: 'failed',
      fship_sync_error: String(reason || 'sync failed').slice(0, 1000),
    }).catch(() => {});

    try {
      // Do the slow external courier call HERE (worker), never inside an HTTP
      // request. Manual courier selection travels on the job payload; without it
      // we auto-select with fallback. enhancedSyncSingleOrder/autoSelect open
      // their own short transaction, so at most `concurrency` DB connections are
      // ever pinned by shipping syncs at once.
      let result;
      if (auto || !logistics) {
        const { service: provider } = await orderShippingController.resolveProviderForOrder(fullOrder);
        const autoResult = await orderShippingController.autoSelectCourierWithFallback(fullOrder, provider);
        result = autoResult.success
          ? autoResult.result
          : { success: false, error: autoResult.error || 'auto courier selection failed', permanent: autoResult.permanent };
      } else {
        result = await orderShippingController.enhancedSyncSingleOrder(
          fullOrder, null, null, null, logistics, serviceType || 'surface'
        );
      }

      if (!result.success) {
        const err = result.error || 'sync returned success=false';
        // Permanent failures (bad address / non-serviceable pincode / no courier)
        // will never succeed on retry. Park the order and return WITHOUT throwing.
        if (result.permanent || orderShippingController.isPermanentShippingFailure(err)) {
          await fullOrder.update({
            fship_sync_status: 'failed',
            fship_sync_error: err,
            fship_sync_attempts: 999, // PARKED sentinel — do not retry, needs a human
          }).catch(() => {});
          logger.warn(`[queue] shipping:sync-order gave up (permanent) — ${fullOrder.order_number}: ${err}`);
          return { success: false, permanent: true, error: err };
        }
        // Transient — retry with backoff, but surface it as failed on the last try.
        if (isLastAttempt) {
          await markFailed(err);
          logger.warn(`[queue] shipping:sync-order FAILED after ${attempts} attempts — ${fullOrder.order_number}: ${err}`);
        }
        throw new Error(err);
      }

      logger.info(`[queue] shipping:sync-order ok — ${fullOrder.order_number} AWB ${result.waybill || 'N/A'}`);
      return result;
    } catch (err) {
      // A thrown exception from the provider call (not a success:false result).
      // Surface it on the final attempt so the order never stays stuck.
      if (isLastAttempt && fullOrder.fship_sync_status !== 'failed') {
        await markFailed(err.message || err);
        logger.warn(`[queue] shipping:sync-order FAILED after ${attempts} attempts — ${fullOrder.order_number}: ${err.message || err}`);
      }
      throw err;
    }
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

  // ── cron:shipping-sync ────────────────────────────────────────────
  // Provider-agnostic: runs the bulk sync controller, which itself goes
  // through shippingProviderFactory to pick iThink/FShip per brand.
  // Bull gives us automatic retries on transient provider outages.
  // Both 'cron:shipping-sync' and the legacy 'cron:fship-sync' name
  // resolve to the same handler.
  const shippingSyncHandler = async () => {
    // Manual booking mode (default): skip the bulk auto-sync entirely.
    if (!require('./shippingAutoSync.js').isAutoSyncEnabled()) {
      logger.info('[queue] cron:shipping-sync skipped — manual mode (SHIPPING_AUTO_SYNC is off)');
      return { skipped: true, manual: true };
    }
    const orderShippingController = require('../controller/orderShippingController.js');
    const mockReq = { user: { id: 'system', username: 'cron_job' }, query: { limit: 50 } };
    let result = null;
    const mockRes = {
      json: (data) => { result = data; },
      status: () => ({ json: () => {} }),
    };
    await orderShippingController.syncOrdersWithFShip(mockReq, mockRes);
    logger.info(`[queue] cron:shipping-sync done: ${JSON.stringify(result?.data || {}).slice(0, 200)}`);
    return result || { ok: true };
  };
  registerProcessor('cron:shipping-sync', 1, shippingSyncHandler);
  registerProcessor('cron:fship-sync', 1, shippingSyncHandler);  // back-compat

  // ── cron:shipping-status-refresh ─────────────────────────────────
  const shippingStatusRefreshHandler = async () => {
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
    logger.info(`[queue] cron:shipping-status-refresh done: ${JSON.stringify(result?.data || {}).slice(0, 200)}`);
    return result || { ok: true };
  };
  registerProcessor('cron:shipping-status-refresh', 1, shippingStatusRefreshHandler);
  registerProcessor('cron:fship-status-refresh', 1, shippingStatusRefreshHandler);  // back-compat

  // ── cron:loyalty-expiry ───────────────────────────────────────────
  registerProcessor('cron:loyalty-expiry', 1, async () => {
    const loyaltyService = require('./loyaltyService.js');
    const result = await loyaltyService.expirePoints();
    logger.info(`[queue] cron:loyalty-expiry done: ${JSON.stringify(result || {}).slice(0, 200)}`);
    return result;
  });

  // (cron:instagram-refresh processor removed — Instagram feed retired.)

  logger.info('[integrationQueue] all workers registered');
}

module.exports = { registerWorkers };
