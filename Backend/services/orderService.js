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
  processing:            ['confirmed', 'booked', 'cancelled'],
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
      try { orderEmitter.emit('order.confirmed', order); } catch (e) { logger.warn('[orderService] order.confirmed emit failed:', e.message); }
      // Only auto-sync if order is not already synced and provider is ready
      // For iThink, require explicit courier selection via syncWithCourier endpoint
      const shippingProviderFactory = require('./shippingProviderFactory.js');
      const { OrderShipment } = require('../model/orderShipmentModel.js');

      (async () => {
        try {
          const shipment = await OrderShipment.findOne({ where: { order_id: order.id } });
          const providerName = await shippingProviderFactory.getProviderName(order.brand_id || 1);

          // Only auto-sync for FShip (not iThink — requires manual courier selection)
          if (!shipment && providerName === 'fship') {
            syncOrderToFShip(order).catch(e => logger.warn('[orderService] FShip sync failed:', e.message));
          } else if (shipment) {
            logger.info(`[orderService] Order ${order.order_number} already synced with ${shipment.provider}`);
          } else if (providerName === 'ithink') {
            logger.info(`[orderService] iThink order ${order.order_number} confirmed. Awaiting courier selection via /sync-with-courier endpoint.`);
          }
        } catch (e) {
          logger.warn('[orderService] Auto-sync logic failed:', e.message);
        }
      })();
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

    // Cancel at the shipping provider that issued the AWB (after commit), so a
    // synced/booked order is cancelled on BOTH sides — our DB (above) and the
    // courier (iThink order/cancel.json).
    cancelAtCourier(order, reason);

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
    setImmediate(() => { try { orderEmitter.emit('order.cancelled', order); } catch (e) { logger.warn('[orderService] order.cancelled emit failed:', e.message); } });

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
  const { OrderShipment } = require('../model/orderShipmentModel.js');
  const settingsHelper = require('./settingsHelper.js');
  const shippingProviderFactory = require('./shippingProviderFactory.js');
  const { breakers } = require('../utils/circuitBreaker.js');
  const { sequelize } = require('../config/db.js');

  try {
    // iThink mandates an explicit courier (no default). The FShip-style booking
    // below sends no courier, so iThink throws "Courier selection is REQUIRED"
    // and the order is marked failed — this fired on every prepaid order the
    // moment payment was confirmed. Route iThink through enhancedSyncSingleOrder,
    // which auto-selects the best serviceable courier (with fallback) exactly
    // like the manual Sync button and the queue worker — so prepaid AND COD book
    // automatically. FShip keeps its existing courier-less flow untouched.
    const providerNameEarly = await shippingProviderFactory.getProviderName(order.brand_id || 1);
    if (providerNameEarly === 'ithink') {
      const orderShippingController = require('../controller/orderShippingController.js');
      const fresh = await Order.findByPk(order.id);
      if (!fresh) return;
      if (fresh.fship_order_id && fresh.fship_waybill) {
        logger.info(`[Shipping] Skipping ${order.order_number} — already booked (iThink)`);
        return;
      }
      const r = await orderShippingController.enhancedSyncSingleOrder(fresh);
      if (r && r.success) {
        logger.info(`[Shipping] iThink auto-synced ${order.order_number} → courier ${r.courier || '?'}`);
      } else {
        const msg = (r && r.error) || 'iThink auto-sync failed';
        logger.warn(`[Shipping] iThink auto-sync ${order.order_number}: ${msg}`);
        await Order.update(
          { fship_sync_status: 'failed', fship_sync_error: String(msg).slice(0, 1000) },
          { where: { id: order.id } }
        ).catch(() => {});
      }
      return;
    }

    // Atomic status check + update to prevent double sync
    const [affectedRows] = await sequelize.query(
      `UPDATE orders SET fship_sync_status = 'syncing', fship_sync_attempts = fship_sync_attempts + 1
       WHERE id = ? AND fship_sync_status IN ('pending', 'failed')`,
      { replacements: [order.id] }
    );
    if (!affectedRows || affectedRows.affectedRows === 0) {
      logger.info(`[Shipping] Skipping order ${order.order_number} — already syncing/synced`);
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

    // ── Comprehensive shipping validation ──────────────────────────────
    const { validateOrderForShipping } = require('./shippingValidationService');
    const validation = await validateOrderForShipping(order.id);

    if (!validation.valid) {
      const errorMsg = validation.errors.join('; ');
      logger.error(`[Shipping] Validation failed for ${order.order_number}: ${errorMsg}`);
      if (validation.warnings.length) {
        logger.warn(`[Shipping] Warnings for ${order.order_number}: ${validation.warnings.join('; ')}`);
      }
      await Order.update(
        { fship_sync_status: 'failed', fship_sync_error: errorMsg },
        { where: { id: order.id } }
      );
      return;
    }

    if (validation.warnings.length) {
      logger.warn(`[Shipping] Warnings for ${order.order_number}: ${validation.warnings.join('; ')}`);
    }

    // Clear previous sync error on successful validation
    if (order.fship_sync_error) {
      await Order.update({ fship_sync_error: null }, { where: { id: order.id } });
    }

    // Resolve the correct shipping provider for this brand (FShip or iThink)
    const brandId = order.brand_id || 1;
    const providerName = await shippingProviderFactory.getProviderName(brandId);
    const provider = await shippingProviderFactory.getShippingProvider(brandId);

    logger.debug(`[Shipping] Syncing order ${order.order_number} via ${providerName}`);

    // Read the pickup/warehouse fresh — clear this brand's settings cache first
    // so a pickup-address change in admin takes effect immediately (otherwise a
    // value cached before the edit, e.g. Crosscoin's, could still be used and the
    // parcel books from the wrong warehouse). Mirrors the manual-sync path.
    settingsHelper.clearCache(brandId);

    // Determine warehouse ID based on provider
    let warehouseId = null;
    if (providerName === 'ithink') {
      warehouseId = await settingsHelper.getSetting(brandId, 'ITHINK_PICKUP_ADDRESS_ID', null);
      if (!warehouseId) {
        throw new Error(`ITHINK_PICKUP_ADDRESS_ID is not configured for brand ${brandId}. Set it in Dashboard → Settings → Shipping.`);
      }
      logger.info(`[Shipping] ${order.order_number} brand=${brandId} → iThink pickup_address_id=${warehouseId}`);
    } else {
      warehouseId = parseInt(await settingsHelper.getSetting(brandId, 'FSHIP_DEFAULT_WAREHOUSE_ID', '227729'), 10);
    }

    const fshipPayload = {
      customer_Name: addr.full_name || user?.username || 'Customer',
      customer_Mobile: String(addr.phone),
      customer_Emailid: user?.email || '',
      customer_Address: String(addr.address),
      landMark: '',
      customer_Address_Type: 'Home',
      customer_PinCode: String(addr.pincode),
      customer_City: String(addr.city),
      customer_State: String(addr.state || ''),
      orderId: String(order.order_number),
      invoice_Number: String(order.order_number),
      payment_Mode: order.payment_type === 'cod' ? 1 : 2,
      express_Type: 'surface',
      is_Ndd: 0,
      order_Amount: parseFloat(order.total_amount),
      tax_Amount: 0,
      extra_Charges: 0,
      total_Amount: parseFloat(order.final_amount),
      shipment_Weight: 0.10,
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
      provider.createOrUpdateForwardOrder(fshipPayload)
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

      // Also update the order_shipments table
      await OrderShipment.findOne({ where: { order_id: order.id } })
        .then(shipment => shipment
          ? shipment.update({
              provider: providerName,
              waybill: response.waybill,
              tracking_number: response.waybill,
              sync_status: 'synced',
              last_synced_at: new Date(),
            })
          : OrderShipment.create({
              order_id: order.id,
              provider: providerName,
              waybill: response.waybill,
              tracking_number: response.waybill,
              sync_status: 'synced',
              last_synced_at: new Date(),
            })
        )
        .catch(e => logger.warn(`[Shipping] Failed to update order_shipments for ${order.order_number}:`, e.message));

      if (provider.registerPickup) {
        await provider.registerPickup([response.waybill])
          .catch(e => logger.warn(`[Shipping] Pickup registration failed for ${order.order_number}:`, e.message));
      }

      logger.info(`[Shipping] Synced order ${order.order_number} via ${providerName} → waybill ${response.waybill}`);
    }
  } catch (e) {
    logger.error(`[Shipping] Sync failed for ${order.order_number}:`, e.message);
    await Order.update(
      { fship_sync_status: 'failed', fship_sync_error: e.message },
      { where: { id: order.id } }
    ).catch(() => {});
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

  // Count every status a real return lands on — the courier webhook sets
  // 'rto' / 'rto delivered', not 'returned_rto'. Counting only 'returned_rto'
  // meant repeat-RTO customers were never flagged and COD was never blocked.
  const rtoCount = await Order.count({
    where: {
      shipping_address_id: { [Op.in]: addressIds },
      status: { [Op.in]: ['rto', 'rto delivered', 'returned_rto'] },
      created_at: { [Op.gte]: sixMonthsAgo },
    },
  });

  let rtoScore = 0;
  if (rtoCount >= 2) return { eligible: false, rtoScore: 40, reason: 'COD blocked: repeat RTO customer' };
  if (rtoCount === 1) rtoScore += 20;

  const codMax = parseFloat(await settingsHelper.getSetting(brandId, 'COD_MAX_ORDER_VALUE', '1500'));

  return { eligible: true, rtoScore, codMax };
}

/**
 * Cancel a booked order at the shipping provider that issued the AWB (iThink /
 * FShip). Best-effort + non-blocking. The AWB may live on the order row OR only
 * in order_shipments — check both, else the courier-side cancel silently gets
 * skipped and the order stays active in iThink even though it's cancelled here.
 * Called from cancelOrder AND from a status-change to "cancelled".
 */
function cancelAtCourier(order, reason) {
  setImmediate(async () => {
    const { OrderShipment } = require('../model/orderShipmentModel.js');
    let waybill = order.fship_waybill || null;
    try {
      if (!waybill) {
        const shp = await OrderShipment.findOne({ where: { order_id: order.id }, attributes: ['waybill', 'tracking_number'] });
        waybill = shp?.waybill || shp?.tracking_number || null;
      }
      if (!waybill) return; // never synced/booked — nothing to cancel at the courier
      const { resolveProviderForOrder } = require('../controller/orderShippingController.js');
      const { service: provider, name: providerName } = await resolveProviderForOrder(order);
      await provider.cancelOrder(waybill, reason || 'Order cancelled');
      logger.info(`✅ ${providerName} cancel confirmed for ${order.order_number} (AWB ${waybill})`);
      try { await OrderShipment.update({ sync_status: 'cancelled', sync_error: null }, { where: { order_id: order.id } }); } catch (_) { /* optional */ }
    } catch (e) {
      logger.error(`⚠️ Courier cancel FAILED for ${order.order_number} (AWB ${waybill || 'n/a'}) — cancel it manually in the courier panel: ${e.message}`);
      try { await OrderShipment.update({ sync_error: `Courier cancel failed: ${e.message}` }, { where: { order_id: order.id } }); } catch (_) { /* optional */ }
    }
  });
}

module.exports = {
  confirmOrder,
  cancelOrder,
  cancelAtCourier,
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
