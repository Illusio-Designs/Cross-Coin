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
      await whatsappService.sendShippingUpdate(addr.phone, {
        orderNumber: order.order_number,
        waybill: order.tracking_number,
        courierName: order.courier_name || 'our courier',
      }, order.brand_id || 1).catch(e => logger.warn('[Event] WA shipped failed:', e.message));
    }
  } catch (e) { logger.error('[Event] order.shipped error:', e.message); }
});

// order.delivered — review request (after 3 days, handled by cron)
orderEmitter.on('order.delivered', (order) => {
  logger.info(`[Event] order.delivered: ${order.order_number} — review request scheduled via cron`);
});

// order.cancelled — cancellation message
orderEmitter.on('order.cancelled', async (order) => {
  try {
    logger.info(`[Event] order.cancelled: ${order.order_number}`);
    const whatsappService = require('./whatsappService.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const addr = await ShippingAddress.findByPk(order.shipping_address_id);
    if (addr?.phone) {
      await whatsappService.sendOrderCancellation(addr.phone, {
        orderNumber: order.order_number,
        reason: order._cancelReason || 'Cancelled',
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
