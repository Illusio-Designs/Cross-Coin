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
 */

const { registerProcessor } = require('./integrationQueue.js');
const { logger } = require('../config/logging.js');
const { isUnconfirmedIThinkBooking } = require('./iThinkCourierRouting.js');

function registerWorkers() {
  // ── shipping:sync-order ────────────────────────────────────────────
  const bookQueuedOrder = async (job) => {
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
    if (fullOrder.shipping_waybill || fullOrder.shipping_sync_status === 'synced' || ['cancelled', 'order cancelled'].includes(fullOrder.status)) {
      logger.info(`[queue] shipping:sync-order skipped — ${fullOrder.order_number} already booked or cancelled`);
      return { skipped: true };
    }
    const orderShippingController = require('../controller/orderShippingController.js');

    // On the FINAL attempt (or a permanent failure) we flip the order to
    // 'failed' with the reason, so it stops showing "Pending Sync" forever —
    // the admin then sees the error and the manual courier picker takes over.
    const attempts = job.opts?.attempts || 1;
    const isLastAttempt = (job.attemptsMade || 0) >= (attempts - 1);
    const markFailed = (reason, park = false) => fullOrder.update({
      shipping_sync_status: 'failed',
      shipping_sync_error: String(reason || 'sync failed').slice(0, 1000),
      ...(park ? { shipping_sync_attempts: 999, pickup_hold_until: null } : {}),
    }).catch(() => {});

    if (isUnconfirmedIThinkBooking(fullOrder.shipping_sync_error)) {
      const error = fullOrder.shipping_sync_error;
      await markFailed(error, true);
      return { success: false, requiresReview: true, error };
    }

    try {
      // Pickup-schedule HOLD: the auto path below calls autoSelectCourierWithFallback
      // directly (bypassing enhancedSyncSingleOrder's own hold gate), so re-check
      // here. If booking now would make iThink collect on a blocked day, keep the
      // order 'pending' + stamp pickup_hold_until and return WITHOUT throwing, so
      // the job doesn't retry in a tight loop — the daily pickup-hold cron books
      // it a day later. Fail-soft: a schedule error never blocks the booking.
      try {
        const pickupSvc = require('./pickupScheduleService.js');
        const holdUntil = await pickupSvc.shouldHoldForPickup();
        if (holdUntil) {
          let nextAllowed = null;
          try { nextAllowed = await pickupSvc.getNextPickupDate(); } catch (_) {}
          await fullOrder.update({
            shipping_sync_status: 'pending',
            pickup_hold_until: holdUntil,
            ...(nextAllowed ? { scheduled_pickup_date: nextAllowed } : {}),
          }).catch(() => {});
          logger.info(`[queue] shipping:sync-order held — ${fullOrder.order_number}: pickup ${holdUntil} is a no-pickup day; will book after then.`);
          return { success: false, held: true, holdUntil };
        }
      } catch (e) {
        logger.warn(`[queue] pickup hold check failed for ${fullOrder.order_number}: ${e.message}`);
      }

      const { service, name } = await orderShippingController.resolveProviderForOrder(fullOrder);
      let result;
      if (name === 'ithink') {
        const selected = logistics ? { logistics, s_type: serviceType } : null;
        const booking = await orderShippingController.autoSelectCourierWithFallback(fullOrder, service, null, selected);
        result = booking.success ? booking.result : booking;
      } else {
        result = await orderShippingController.enhancedSyncSingleOrder(fullOrder, null, service, name, logistics, serviceType);
      }

      if (result.held || result.action === 'skipped') return result;
      if (result.requiresReview) {
        await markFailed(result.error, true);
        logger.warn(`[queue] shipping:sync-order AWB unconfirmed for ${fullOrder.order_number}: ${result.error}`);
        try { require('./errorReporter.js').notify('📦 Booking needs review', [`Order ${fullOrder.order_number}`, result.error], { dedupeKey: `book-fail:${fullOrder.id}` }); } catch (_) {}
        return result;
      }

      if (!result.success) {
        const err = result.error || 'sync returned success=false';
        // Permanent failures (bad address / non-serviceable pincode / no courier)
        // will never succeed on retry. Park the order and return WITHOUT throwing.
        if (result.permanent ?? orderShippingController.isPermanentShippingFailure(err)) {
          await markFailed(err, true);
          logger.warn(`[queue] shipping:sync-order gave up (permanent) — ${fullOrder.order_number}: ${err}`);
          try { require('./errorReporter.js').notify('📦 Courier booking failed', [`Order ${fullOrder.order_number}`, err, 'Review iThink courier availability or the order address.'], { dedupeKey: `book-fail:${fullOrder.id}` }); } catch (_) {}
          return { success: false, permanent: true, error: err };
        }
        // Transient — retry with backoff, but surface it as failed on the last try.
        if (isLastAttempt) {
          await markFailed(err);
          logger.warn(`[queue] shipping:sync-order FAILED after ${attempts} attempts — ${fullOrder.order_number}: ${err}`);
          try { require('./errorReporter.js').notify('📦 Courier booking failed', [`Order ${fullOrder.order_number}`, err, `Gave up after ${attempts} attempts.`], { dedupeKey: `book-fail:${fullOrder.id}` }); } catch (_) {}
        }
        throw new Error(err);
      }

      logger.info(`[queue] shipping:sync-order ok — ${fullOrder.order_number} AWB ${result.waybill || 'N/A'}`);
      return result;
    } catch (err) {
      // A thrown exception from the provider call (not a success:false result).
      // Surface it on the final attempt so the order never stays stuck.
      if (isLastAttempt && fullOrder.shipping_sync_status !== 'failed') {
        await markFailed(err.message || err);
        logger.warn(`[queue] shipping:sync-order FAILED after ${attempts} attempts — ${fullOrder.order_number}: ${err.message || err}`);
        try { require('./errorReporter.js').notify('📦 Courier booking failed', [`Order ${fullOrder.order_number}`, err.message || String(err), `Gave up after ${attempts} attempts.`], { dedupeKey: `book-fail:${fullOrder.id}` }); } catch (_) {}
      }
      throw err;
    }
  };

  registerProcessor('shipping:sync-order', 2, async (job) => {
    const { orderId } = job.data;
    if (!orderId) throw new Error('orderId required');
    const { acquireLock, releaseLock } = require('./jobRunService.js');
    const lock = await acquireLock(`shipping-booking:${orderId}`);
    if (!lock) return { skipped: true };
    try {
      return await bookQueuedOrder(job);
    } finally {
      await releaseLock(lock);
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

  // (cron:shipping-sync removed — bulk auto-booking is gone; orders are booked
  // per-order from the dashboard via the shipping:sync-order job above.)

  // The scheduled jobs' processors (cron:*) are registered by
  // config/cronJobs.js, which wraps every run in the job-run log.

  logger.info('[integrationQueue] all workers registered');
}

module.exports = { registerWorkers };
