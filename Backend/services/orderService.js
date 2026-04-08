'use strict';

/**
 * Order Service — production-grade business logic.
 * Handles: state machine, row locking, idempotency, FShip sync,
 * audit logs, COD fraud prevention, cancellation with stock rollback.
 */

const { logger } = require('../config/logging.js');
const orderEmitter = require('./orderEvents.js');

// ── State machine ─────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS = {
  awaiting_confirmation: ['confirmed', 'cancelled'],
  pending:               ['awaiting_confirmation', 'confirmed', 'cancelled'],
  confirmed:             ['processing', 'cancelled'],
  processing:            ['booked', 'cancelled'],
  booked:                ['pickup initiated', 'cancelled'],
  'pickup initiated':    ['manifested', 'cancelled'],
  manifested:            ['in transit'],
  'in transit':          ['shipped', 'out for delivery', 'undelivered', 'exception'],
  shipped:               ['out for delivery', 'delivered', 'undelivered', 'rto'],
  'out for delivery':    ['delivered', 'undelivered', 'rto'],
  undelivered:           ['rto', 'out for delivery'],
  delivered:             ['return_initiated'],
  return_initiated:      ['returned_rto'],
  rto:                   ['rto delivered'],
  'rto delivered':       [],
  returned_rto:          [],
  cancelled:             [],
  'order cancelled':     [],
  exception:             ['cancelled'],
};

const DISPATCHED_STATUSES = [
  'shipped', 'in transit', 'out for delivery', 'delivered',
  'return_initiated', 'returned_rto', 'rto', 'rto delivered',
];

function assertTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot transition order from "${currentStatus}" to "${nextStatus}"`);
  }
}

function getRtoRiskLevel(score) {
  if (score <= 10) return 'LOW';
  if (score <= 20) return 'MEDIUM';
  return 'HIGH';
}

// ── Row lock helper ───────────────────────────────────────────────────────────

async function getOrderForUpdate(orderId, transaction) {
  const { Order } = require('../model/orderModel.js');
  const [rows] = await require('../config/db.js').sequelize.query(
    'SELECT * FROM orders WHERE id = ? FOR UPDATE',
    { replacements: [orderId], transaction, type: require('sequelize').QueryTypes.SELECT }
  );
  if (!rows) throw new Error('Order not found');
  return Order.build(rows, { isNewRecord: false, raw: true });
}

// ── Audit log ─────────────────────────────────────────────────────────────────

async function auditLog(orderId, action, performedBy, role, metadata = {}, transaction = null) {
  const { sequelize } = require('../config/db.js');
  await sequelize.query(`
    INSERT INTO order_audit_logs (order_id, action, performed_by, role, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `, {
    replacements: [orderId, action, performedBy, role, JSON.stringify(metadata)],
    transaction,
  });
}

// ── Webhook deduplication ─────────────────────────────────────────────────────

async function isWebhookProcessed(source, eventId) {
  const { sequelize } = require('../config/db.js');
  const [rows] = await sequelize.query(
    'SELECT id FROM webhooks_log WHERE event_id = ? LIMIT 1',
    { replacements: [eventId] }
  );
  return rows.length > 0;
}

async function markWebhookProcessed(source, eventId) {
  const { sequelize } = require('../config/db.js');
  await sequelize.query(
    'INSERT IGNORE INTO webhooks_log (event_id, event_type, processed_at) VALUES (?, ?, NOW())',
    { replacements: [eventId, source] }
  );
}

// ── Confirm order (admin) ─────────────────────────────────────────────────────

async function confirmOrder(orderId, adminId) {
  const { Order } = require('../model/orderModel.js');
  const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
  const { sequelize } = require('../config/db.js');

  return sequelize.transaction(async (t) => {
    // Row lock — prevents race condition if admin clicks confirm twice
    const [rows] = await sequelize.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      { replacements: [orderId], transaction: t }
    );
    if (!rows.length) throw new Error('Order not found');
    const order = await Order.findByPk(orderId, { transaction: t });

    assertTransition(order.status, 'confirmed');

    await order.update({ status: 'confirmed' }, { transaction: t });
    await OrderStatusHistory.create({
      order_id: order.id,
      status: 'confirmed',
      updated_by: adminId,
      notes: 'Order confirmed by admin',
    }, { transaction: t });

    await auditLog(order.id, 'confirm', adminId, 'admin', {}, t);

    // Emit events AFTER commit
    setImmediate(() => {
      orderEmitter.emit('order.confirmed', order);
      syncOrderToFShip(order);
    });

    return order;
  });
}

// ── Cancel order ──────────────────────────────────────────────────────────────

async function cancelOrder(orderId, { reason, cancelledBy, isAdmin = false }) {
  const { Order } = require('../model/orderModel.js');
  const { OrderItem } = require('../model/orderItemModel.js');
  const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
  const { ProductVariation } = require('../model/productVariationModel.js');
  const { Coupon, CouponUsage } = require('../model/associations.js');
  const loyaltyService = require('./loyaltyService.js');
  const fshipService = require('./fshipService.js');
  const { sequelize } = require('../config/db.js');

  return sequelize.transaction(async (t) => {
    // Row lock — prevents concurrent cancel + confirm race
    const [rows] = await sequelize.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      { replacements: [orderId], transaction: t }
    );
    if (!rows.length) throw new Error('Order not found');
    const order = await Order.findByPk(orderId, { transaction: t });

    if (DISPATCHED_STATUSES.includes(order.status)) {
      throw new Error(`Cannot cancel order in "${order.status}" status`);
    }

    const userAllowed = ['awaiting_confirmation', 'pending', 'confirmed', 'processing'];
    const adminAllowed = [...userAllowed, 'booked'];
    const allowed = isAdmin ? adminAllowed : userAllowed;

    if (!allowed.includes(order.status)) {
      throw new Error(`Cannot cancel order in "${order.status}" status`);
    }

    // Restore stock
    const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction: t });
    for (const item of items) {
      if (item.variation_id) {
        await ProductVariation.increment('stock', { by: item.quantity, where: { id: item.variation_id }, transaction: t });
      }
    }

    // Decrement coupon usage
    if (order.coupon_id) {
      await Coupon.decrement('usageCount', { by: 1, where: { id: order.coupon_id }, transaction: t });
      await CouponUsage.destroy({ where: { orderId: order.id }, transaction: t });
    }

    // Refund loyalty points
    if (order.user_id) {
      await loyaltyService.refundPoints(order.user_id, order.id, order.brand_id || 1, { transaction: t });
    }

    const newPaymentStatus = order.payment_status === 'paid' ? 'refund_pending' : 'cancelled';

    await order.update({ status: 'cancelled', payment_status: newPaymentStatus }, { transaction: t });

    await OrderStatusHistory.create({
      order_id: order.id,
      status: 'cancelled',
      updated_by: cancelledBy || null,
      notes: reason || 'Cancelled',
    }, { transaction: t });

    await auditLog(order.id, 'cancel', cancelledBy, isAdmin ? 'admin' : 'user', { reason }, t);

    // Cancel in FShip after commit
    if (order.fship_waybill) {
      setImmediate(() => {
        fshipService.cancelOrder(order.fship_waybill, reason || 'Order cancelled')
          .catch(e => logger.warn(`FShip cancel failed for ${order.order_number}:`, e.message));
      });
    }

    // Auto-refund prepaid orders
    if (order.payment_status === 'refund_pending') {
      setImmediate(async () => {
        try {
          const { autoRefundOnCancel } = require('./refundService.js');
          await autoRefundOnCancel(order.id, reason, cancelledBy);
        } catch (e) { logger.warn(`Auto-refund failed for ${order.order_number}:`, e.message); }
      });
    }

    order._cancelReason = reason;
    setImmediate(() => orderEmitter.emit('order.cancelled', order));

    return order;
  });
}

// ── FShip sync (with race condition protection) ───────────────────────────────

async function syncOrderToFShip(order) {
  const { Order } = require('../model/orderModel.js');
  const { OrderItem } = require('../model/orderItemModel.js');
  const { Product } = require('../model/productModel.js');
  const { ProductVariation } = require('../model/productVariationModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { User } = require('../model/userModel.js');
  const fshipService = require('./fshipService.js');
  const settingsHelper = require('./settingsHelper.js');
  const { breakers } = require('../utils/circuitBreaker.js');
  const { sequelize } = require('../config/db.js');

  try {
    // Atomic status check + update to prevent double sync
    const [affectedRows] = await sequelize.query(
      `UPDATE orders SET fship_sync_status = 'syncing', fship_sync_attempts = fship_sync_attempts + 1
       WHERE id = ? AND fship_sync_status IN ('pending', 'failed')`,
      { replacements: [order.id] }
    );
    if (!affectedRows || affectedRows.affectedRows === 0) {
      logger.info(`[FShip] Skipping order ${order.order_number} — already syncing/synced`);
      return;
    }

    // Reload order to get latest data
    order = await Order.findByPk(order.id);

    const [addr, user, items] = await Promise.all([
      ShippingAddress.findByPk(order.shipping_address_id),
      User.findByPk(order.user_id, { attributes: ['username', 'email'] }),
      OrderItem.findAll({
        where: { order_id: order.id },
        include: [
          { model: Product, as: 'Product', attributes: ['name', 'id'] },
          { model: ProductVariation, as: 'ProductVariation', attributes: ['sku', 'price'] },
        ],
      }),
    ]);

    if (!addr?.address || !addr?.phone) {
      throw new Error('Missing shipping address or phone for FShip sync');
    }

    const warehouseId = parseInt(await settingsHelper.getSetting(order.brand_id || 1, 'FSHIP_DEFAULT_WAREHOUSE_ID', '12191'));

    const fshipPayload = {
      customer_Name: addr.full_name || user?.username || 'Customer',
      customer_Mobile: String(addr.phone),
      customer_Emailid: user?.email || '',
      customer_Address: String(addr.address),
      landMark: '',
      customer_Address_Type: 'Home',
      customer_PinCode: String(addr.pincode),
      customer_City: String(addr.city || 'Mumbai'),
      orderId: String(order.order_number),
      invoice_Number: String(order.order_number),
      payment_Mode: order.payment_type === 'cod' ? 1 : 2,
      express_Type: 'surface',
      is_Ndd: 0,
      order_Amount: parseFloat(order.total_amount),
      tax_Amount: 0,
      extra_Charges: 0,
      total_Amount: parseFloat(order.final_amount),
      shipment_Weight: items.reduce((s, i) => s + i.quantity, 0) * 0.07,
      shipment_Length: 14,
      shipment_Width: 3,
      shipment_Height: 10,
      pick_Address_ID: warehouseId,
      return_Address_ID: warehouseId,
      products: items.map(i => ({
        productName: i.Product?.name || 'Product',
        sku: i.ProductVariation?.sku || `PROD-${i.product_id}`,
        quantity: i.quantity,
        unitPrice: parseFloat(i.price),
        productCategory: 'Socks',
        hsnCode: '6115',
        taxRate: 0,
        productDiscount: 0,
      })),
    };

    const response = await breakers.fship.call(() =>
      fshipService.createOrUpdateForwardOrder(fshipPayload)
    );

    if (response.success) {
      await order.update({
        fship_order_id: response.orderId,
        fship_waybill: response.waybill,
        fship_route_code: response.routeCode,
        fship_label_url: response.labelUrl,
        tracking_number: response.waybill,
        status: 'processing',
        fship_sync_status: 'synced',
        fship_last_synced_at: new Date(),
      });

      await fshipService.registerPickup([response.waybill])
        .catch(e => logger.warn(`FShip pickup failed for ${order.order_number}:`, e.message));

      logger.info(`[FShip] Synced order ${order.order_number} → waybill ${response.waybill}`);
    }
  } catch (e) {
    logger.error(`[FShip] Sync failed for ${order.order_number}:`, e.message);
    await Order.update({ fship_sync_status: 'failed' }, { where: { id: order.id } }).catch(() => {});
  }
}

// ── COD fraud check ───────────────────────────────────────────────────────────

async function checkCodEligibility(phone, brandId = 1) {
  const { Order } = require('../model/orderModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { Op } = require('sequelize');
  const settingsHelper = require('./settingsHelper.js');

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Find addresses with this phone
  const addresses = await ShippingAddress.findAll({ where: { phone }, attributes: ['id'] });
  if (!addresses.length) return { eligible: true, rtoScore: 0, reason: null };

  const addressIds = addresses.map(a => a.id);

  const rtoCount = await Order.count({
    where: {
      shipping_address_id: { [Op.in]: addressIds },
      status: 'returned_rto',
      created_at: { [Op.gte]: sixMonthsAgo },
    },
  });

  let rtoScore = 0;
  if (rtoCount >= 2) return { eligible: false, rtoScore: 40, reason: 'COD blocked: repeat RTO customer' };
  if (rtoCount === 1) rtoScore += 20;

  const codMax = parseFloat(await settingsHelper.getSetting(brandId, 'COD_MAX_ORDER_VALUE', '1500'));

  return { eligible: true, rtoScore, codMax };
}

module.exports = {
  confirmOrder,
  cancelOrder,
  syncOrderToFShip,
  assertTransition,
  getRtoRiskLevel,
  checkCodEligibility,
  auditLog,
  isWebhookProcessed,
  markWebhookProcessed,
  ALLOWED_TRANSITIONS,
  DISPATCHED_STATUSES,
};
