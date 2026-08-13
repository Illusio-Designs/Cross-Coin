'use strict';

const EventEmitter = require('events');
const { logger } = require('../config/logging.js');

const orderEmitter = new EventEmitter();
orderEmitter.setMaxListeners(20);

// ── Listeners ────────────────────────────────────────────────────────────────

// order.created — basic log + real-time SSE + ops push (Telegram / Web Push)
orderEmitter.on('order.created', (order) => {
  try {
    const notificationService = require('./notificationService.js');
    notificationService.emitNewOrder(order);
    logger.info(`[Event] order.created: ${order.order_number}`);
  } catch (e) { logger.error('[Event] order.created error:', e.message); }

  // Reliable off-dashboard alerts (fire-and-forget, never blocks order flow).
  setImmediate(async () => {
    try {
      // Resolve the brand name from the Brand row (per-brand correct). The
      // STORE_NAME setting falls back to the GLOBAL env var when a brand has no
      // row of its own — which showed "CrossCoin" on e.g. Soxbae orders.
      const settingsHelper = require('./settingsHelper');
      let brand = 'Cross Coin';
      try {
        const Brand = require('../model/brandModel.js');
        const b = order.brand_id ? await Brand.findByPk(order.brand_id, { attributes: ['name', 'display_name'] }) : null;
        brand = b?.display_name || b?.name
          || (await settingsHelper.getSetting(order.brand_id || 1, 'STORE_NAME'))
          || 'Cross Coin';
      } catch (_) { /* keep default */ }
      const amount = order.final_amount != null ? `₹${order.final_amount}` : '';
      const pay = String(order.payment_type || '').toUpperCase() || 'N/A';
      const items = order._itemCount ? ` · ${order._itemCount} item(s)` : '';
      const title = `🛒 New order — ${brand}`;
      const line = `#${order.order_number}\n${amount} · ${pay}${items}`;

      const { sendTelegram } = require('./telegramService.js');
      await sendTelegram(`<b>${title}</b>\n${line}`);

      const pushService = require('./pushService.js');
      await pushService.sendToAll({
        title,
        body: `${order.order_number} · ${amount} · ${pay}`,
        url: '/dashboard/orders',
        tag: `order-${order.order_number}`,
      });
    } catch (e) { logger.warn('[Event] order.created alert failed: ' + e.message); }
  });
});

// order.confirmed — WhatsApp confirmation + trigger FShip sync
orderEmitter.on('order.confirmed', async (order) => {
  try {
    logger.info(`[Event] order.confirmed: ${order.order_number}`);
    const whatsappService = require('./whatsappService.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const addr = await ShippingAddress.findByPk(order.shipping_address_id);
    if (addr?.phone) {
      await whatsappService.sendOrderConfirmation(addr.phone, {
        name: (addr.full_name || '').split(' ')[0] || 'there',
        orderNumber: order.order_number,
        total: parseFloat(order.final_amount).toFixed(2),
      }, order.brand_id || 1).catch(e => logger.warn('[Event] WA confirm failed:', e.message));
    }

    // Manual booking mode (default): don't auto-book or enqueue retries — the
    // admin books each order from the dashboard. Set SHIPPING_AUTO_SYNC=on to
    // restore automatic booking for ALL confirmations.
    // EXCEPTION: when the CUSTOMER confirmed their address over WhatsApp
    // (order._customerConfirmed), that's exactly the signal manual mode waits
    // for — the address is validated — so book it now even in manual mode.
    if (!require('./shippingAutoSync.js').isAutoSyncEnabled() && !order._customerConfirmed) {
      logger.info(`[Event] manual shipping mode — ${order.order_number} left for manual booking (no auto-sync, no queue)`);
      return;
    }
    if (order._customerConfirmed) {
      logger.info(`[Event] ${order.order_number}: customer confirmed via WhatsApp — auto-booking courier despite manual mode`);
    }

    // Trigger immediate FShip sync for this order (don't wait for 2hr cron)
    try {
      const { Order } = require('../model/orderModel.js');
      const { OrderItem } = require('../model/orderItemModel.js');
      const { Product } = require('../model/productModel.js');
      const { ProductVariation } = require('../model/productVariationModel.js');
      const { User } = require('../model/userModel.js');
      const { GuestUser } = require('../model/guestUserModel.js');

      const fullOrder = await Order.findByPk(order.id, {
        include: [
          { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }, { model: ProductVariation, as: 'ProductVariation' }] },
          { model: User, as: 'User', attributes: ['id', 'username', 'email'], required: false },
          { model: GuestUser, as: 'GuestUser', attributes: ['id', 'email', 'firstName', 'lastName', 'phone'], required: false },
          { model: ShippingAddress, as: 'ShippingAddress' },
        ],
      });

      if (fullOrder && fullOrder.fship_sync_status !== 'synced') {
        const orderShippingController = require('../controller/orderShippingController.js');
        const syncResult = await orderShippingController.enhancedSyncSingleOrder(fullOrder);
        if (syncResult.success) {
          logger.info(`[Event] FShip sync triggered for ${order.order_number}: ${syncResult.action} — AWB: ${syncResult.waybill || 'N/A'}`);
        } else {
          logger.warn(`[Event] FShip sync failed for ${order.order_number}: ${syncResult.error} — enqueueing retry`);
          try {
            const { enqueue } = require('./integrationQueue.js');
            await enqueue('shipping:sync-order', { orderId: order.id, attempt: 1 }, { delay: 30_000 });
          } catch (qErr) { logger.warn(`[Event] enqueue shipping retry failed: ${qErr.message}`); }
        }
      }
    } catch (syncErr) {
      logger.warn(`[Event] FShip immediate sync failed for ${order.order_number}: ${syncErr.message} — enqueueing retry`);
      try {
        const { enqueue } = require('./integrationQueue.js');
        await enqueue('shipping:sync-order', { orderId: order.id, attempt: 1 }, { delay: 30_000 });
      } catch (qErr) { logger.warn(`[Event] enqueue shipping retry failed: ${qErr.message}`); }
    }
  } catch (e) { logger.error('[Event] order.confirmed error:', e.message); }
});

// order.shipped — tracking notification
orderEmitter.on('order.shipped', async (order) => {
  try {
    logger.info(`[Event] order.shipped: ${order.order_number}`);
    const whatsappService = require('./whatsappService.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const addr = await ShippingAddress.findByPk(order.shipping_address_id);
    if (addr?.phone && order.tracking_number) {
      await whatsappService.sendOrderShipped(addr.phone, {
        orderNumber: order.order_number,
        awbNumber: order.tracking_number,
        trackingUrl: `https://crosscoin.in/OrderTracking?order=${order.order_number}`,
      }, order.brand_id || 1).catch(e => logger.warn('[Event] WA shipped failed:', e.message));
    }
  } catch (e) { logger.error('[Event] order.shipped error:', e.message); }
});

// order.delivered — delivery confirmation + review request scheduled via cron (3 days later)
orderEmitter.on('order.delivered', async (order) => {
  try {
    logger.info(`[Event] order.delivered: ${order.order_number}`);
    const whatsappService = require('./whatsappService.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const addr = await ShippingAddress.findByPk(order.shipping_address_id);
    if (addr?.phone) {
      await whatsappService.sendOrderDelivered(addr.phone, {
        orderNumber: order.order_number,
      }, order.brand_id || 1).catch(e => logger.warn('[Event] WA delivered failed:', e.message));
    }
  } catch (e) { logger.error('[Event] order.delivered error:', e.message); }
});

// order.out_for_delivery — last-mile notification
orderEmitter.on('order.out_for_delivery', async (order) => {
  try {
    logger.info(`[Event] order.out_for_delivery: ${order.order_number}`);
    const whatsappService = require('./whatsappService.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const addr = await ShippingAddress.findByPk(order.shipping_address_id);
    if (addr?.phone) {
      await whatsappService.sendOutForDelivery(addr.phone, {
        orderNumber: order.order_number,
        courierName: order.courier_name || 'Our courier partner',
      }, order.brand_id || 1).catch(e => logger.warn('[Event] WA out-for-delivery failed:', e.message));
    }
  } catch (e) { logger.error('[Event] order.out_for_delivery error:', e.message); }
});

// order.cancelled — cancellation message
orderEmitter.on('order.cancelled', async (order) => {
  try {
    logger.info(`[Event] order.cancelled: ${order.order_number}`);
    const whatsappService = require('./whatsappService.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const addr = await ShippingAddress.findByPk(order.shipping_address_id);
    if (addr?.phone) {
      await whatsappService.sendOrderCancelled(addr.phone, {
        orderNumber: order.order_number,
        refundInfo: order._cancelReason || 'Order has been cancelled',
      }, order.brand_id || 1).catch(e => logger.warn('[Event] WA cancel failed:', e.message));
    }
  } catch (e) { logger.error('[Event] order.cancelled error:', e.message); }
});

// Dashboard figures go stale otherwise: the cached stats were only cleared on
// order CREATION, so confirm/ship/deliver/cancel didn't move the numbers until
// the TTL expired. Drop the cache on every figure-moving transition so the
// dashboard reflects the change within seconds.
const invalidateDashboardOnChange = (order) => {
  setImmediate(async () => {
    try {
      const { invalidateDashboardCache } = require('./dashboardService.js');
      await invalidateDashboardCache(order?.user_id || 'admin');
    } catch (e) { logger.warn('[Event] dashboard cache invalidation failed: ' + e.message); }
  });
};
['order.created', 'order.confirmed', 'order.shipped', 'order.delivered', 'order.cancelled']
  .forEach((evt) => orderEmitter.on(evt, invalidateDashboardOnChange));

// order.analytics — fire FB + GA events
orderEmitter.on('order.analytics', async ({ event, payload }) => {
  try {
    const { sendFacebookEvent } = require('../integration/facebookPixel.js');
    const { sendGAEvent } = require('../integration/googleAnalytics.js');
    await Promise.allSettled([
      sendFacebookEvent(event, payload),
      sendGAEvent(event.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase(), payload),
    ]);
  } catch (e) { logger.error('[Event] order.analytics error:', e.message); }
});

module.exports = orderEmitter;
