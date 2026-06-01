'use strict';

const EventEmitter = require('events');
const { logger } = require('../config/logging.js');

const orderEmitter = new EventEmitter();
orderEmitter.setMaxListeners(20);

// ── Listeners ────────────────────────────────────────────────────────────────

// order.created — basic log + real-time SSE
orderEmitter.on('order.created', (order) => {
  try {
    const notificationService = require('./notificationService.js');
    notificationService.emitNewOrder(order);
    logger.info(`[Event] order.created: ${order.order_number}`);
  } catch (e) { logger.error('[Event] order.created error:', e.message); }
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
        orderNumber: order.order_number,
        itemCount: order._itemCount || 1,
        total: parseFloat(order.final_amount).toFixed(2),
        estimatedDelivery: '3-5 working days',
      }, order.brand_id || 1).catch(e => logger.warn('[Event] WA confirm failed:', e.message));
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
