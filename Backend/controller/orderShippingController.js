const { Order } = require("../model/orderModel.js");
const { OrderItem } = require("../model/orderItemModel.js");
const { OrderStatusHistory } = require("../model/orderStatusHistoryModel.js");
const { Product } = require("../model/productModel.js");
const { ProductVariation } = require("../model/productVariationModel.js");
const { ShippingAddress } = require("../model/shippingAddressModel.js");
const { Payment } = require("../model/paymentModel.js");
const { User } = require("../model/userModel.js");
const { GuestUser } = require("../model/guestUserModel.js");
const Brand = require("../model/brandModel.js");
const { OrderShipment } = require("../model/orderShipmentModel.js");
const FShipLabelDownload = require("../model/fshipLabelDownloadModel.js");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db.js");
const axios = require('axios');
const { logger } = require("../config/logging.js");
const fshipService = require("../services/fshipService.js");
const { setImmediate } = require("timers");
const { sendFacebookEvent } = require("../integration/facebookPixel.js");
const { sendGAEvent } = require("../integration/googleAnalytics.js");
const settingsHelper = require("../services/settingsHelper");
const shippingValidationService = require('../services/shippingValidationService.js');
const shippingProviderFactory = require('../services/shippingProviderFactory.js');
const loyaltyService = require('../services/loyaltyService.js');
const orderEmitter = require('../services/orderEvents.js');
const { getAddressHash } = require('../services/addressQualityService.js');
const { AddressQualityScore } = require('../model/addressQualityScoreModel.js');
const { auditLog: orderAuditLog } = require('../services/orderService.js');

/**
 * Pick the right shipping service for an order.
 *  - If the order already has a shipment row, reuse that provider (you can't
 *    update tracking on iThink for an order that was created in FShip, etc).
 *  - Otherwise fall back to the brand's currently-active SHIPPING_PROVIDER.
 * Returns { service, name }.
 */
async function resolveProviderForOrder(order) {
  const brandId = order?.brand_id || 1;

  // Prefer the provider recorded at sync time. A waybill is only meaningful
  // on the provider that issued it — querying tracking on a different one
  // returns "No tracking data found".
  if (order?.id) {
    try {
      const shipment = await OrderShipment.findOne({
        where: { order_id: order.id },
        attributes: ['provider'],
      });
      if (shipment?.provider) {
        const service = shippingProviderFactory.getProviderByName(shipment.provider, brandId);
        logger.debug(`📦 Using provider ${shipment.provider} (from order_shipments) for order ${order.order_number}`);
        return { service, name: shipment.provider };
      }
    } catch (err) {
      logger.warn(`Could not read shipment provider for order ${order.id}: ${err.message}`);
    }
  }

  // Fallback: brand's current SHIPPING_PROVIDER setting (for un-synced orders).
  const name = await shippingProviderFactory.getProviderName(brandId);
  const service = await shippingProviderFactory.getShippingProvider(brandId);
  logger.debug(`📦 Using provider ${name} (brand default) for brand ${brandId}`);
  return { service, name };
}

// Exposed so other modules (e.g. orderService.cancelOrder) can route a call
// to the provider that actually issued the AWB.
module.exports.resolveProviderForOrder = resolveProviderForOrder;

// ── Courier fallback helper: try Delhivery → Amazon → Xpressbees ────────
async function autoSelectCourierWithFallback(order, provider, transaction = null) {
  const couriers = ['delhivery', 'amazon', 'xpressbees'];
  logger.debug(`🔄 Auto-selecting courier with fallback: ${couriers.join(' → ')}`);

  for (const courier of couriers) {
    try {
      logger.debug(`📦 Attempting sync with ${courier}...`);
      const syncResult = await module.exports.enhancedSyncSingleOrder(order, transaction, provider, 'ithink', courier, 'surface');

      if (syncResult.success) {
        logger.info(`✅ Courier auto-selected: ${courier}`);
        return { success: true, courier, result: syncResult };
      } else {
        logger.warn(`⚠️  ${courier} failed: ${syncResult.error}`);
      }
    } catch (error) {
      logger.warn(`⚠️  ${courier} error: ${error.message}`);
    }
  }

  logger.error(`❌ All couriers failed (delhivery, amazon, xpressbees)`);
  return {
    success: false,
    courier: null,
    error: 'No courier available — all failed (delhivery, amazon, xpressbees)'
  };
}

// ── Dual-write helper: sync shipment data to order_shipments table ──────
async function upsertShipment(orderId, data, transaction = null) {
  try {
    const opts = transaction ? { transaction } : {};
    const existing = await OrderShipment.findOne({ where: { order_id: orderId }, ...opts });
    const payload = {
      order_id: orderId,
      provider: data.provider || existing?.provider || 'ithink',
      provider_order_id: data.provider_order_id || data.fship_order_id || null,
      waybill: data.waybill || data.fship_waybill || null,
      tracking_number: data.tracking_number || null,
      tracking_url: data.tracking_url || null,
      route_code: data.route_code || data.fship_route_code || null,
      courier_id: data.courier_id || data.fship_courier_id || null,
      courier_name: data.courier_name || null,
      label_url: data.label_url || data.fship_label_url || null,
      label_downloaded: data.label_downloaded ?? data.fship_label_downloaded ?? false,
      label_downloaded_at: data.label_downloaded_at || data.fship_label_downloaded_at || null,
      label_downloaded_by: data.label_downloaded_by || data.fship_label_downloaded_by || null,
      sync_status: data.sync_status || data.fship_sync_status || 'pending',
      sync_attempts: data.sync_attempts ?? data.fship_sync_attempts ?? 0,
      sync_error: data.sync_error || data.fship_sync_error || null,
      last_synced_at: data.last_synced_at || data.fship_last_synced_at || null,
    };
    // Remove undefined values
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    if (existing) {
      await existing.update(payload, opts);
    } else {
      await OrderShipment.create(payload, opts);
    }
  } catch (err) {
    logger.warn(`upsertShipment failed for order ${orderId}: ${err.message}`);
  }
}

// Handle FShip webhook for order updates
module.exports.handleFShipWebhook = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const webhookData = req.body;
    logger.debug("🔔 FShip Webhook received:", JSON.stringify(webhookData, null, 2));

    const {
      waybill,
      status,
      courier_name,
      order_id,
      remark,
      delivery_date,
      rto_reason
    } = webhookData;

    if (!waybill && !order_id) {
      await transaction.rollback();
      return res.status(400).json({ message: "Waybill or Order ID is required" });
    }

    // Find order by FShip waybill or order ID
    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { fship_waybill: waybill },
          { fship_order_id: order_id },
          { order_number: order_id }
        ]
      },
      include: [
        { model: User, as: "User", attributes: ["id", "email", "username"] },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName"],
        },
        {
          model: OrderItem,
          as: "OrderItems",
          include: [
            { model: Product, as: "Product" },
            { model: ProductVariation, as: "ProductVariation" }
          ]
        },
        {
          model: Payment,
          as: "Payment"
        }
      ],
      transaction
    });

    if (!order) {
      logger.debug("❌ Order not found for FShip waybill/order ID:", waybill || order_id);
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    logger.debug(`📦 Processing webhook for Order: ${order.order_number}, Current Status: ${order.status}`);

    // Update order with FShip tracking information
    const updateData = {};
    if (waybill) updateData.tracking_number = waybill;
    if (courier_name) updateData.courier_name = courier_name;

    // Map FShip status to our order status
    let orderStatus = order.status;
    let webhookNotes = `FShip webhook: ${status}`;

    if (status) {
      orderStatus = fshipService.mapFShipStatusToCrossCoin(status);
      updateData.status = orderStatus;

      if (waybill) webhookNotes += ` - AWB: ${waybill}`;
      if (courier_name) webhookNotes += ` - Courier: ${courier_name}`;
      if (remark) webhookNotes += ` - Remark: ${remark}`;
      if (rto_reason) webhookNotes += ` - RTO Reason: ${rto_reason}`;
    }

    // ===== AUTOMATIC RTO HANDLING =====
    if (orderStatus === 'rto' && order.status !== 'rto') {
      logger.debug(`🔄 Automatic RTO processing initiated for Order: ${order.order_number}`);

      // Update payment status for COD orders
      if (order.payment_type === 'cod') {
        updateData.payment_status = 'failed';
        logger.debug(`💳 COD payment marked as failed for RTO order`);
      }

      // Handle refund for prepaid orders
      if (order.payment_type !== 'cod' && order.payment_status === 'paid') {
        updateData.payment_status = 'refunded';

        // Update payment record
        const payment = order.Payment || null;
        if (payment) {
          await payment.update({
            status: 'refunded',
            notes: `Auto-refund initiated for RTO. Reason: ${rto_reason || 'Return to Origin'}`
          }, { transaction });

          logger.debug(`💰 Prepaid order marked for refund: ₹${order.final_amount}`);
          webhookNotes += ` - Refund initiated for prepaid order`;
        }
      }

      // Restore stock for each order item
      const stockRestorations = [];

      for (const item of order.OrderItems) {
        let stockBefore = 0;
        let stockAfter = 0;

        if (item.variation_id && item.ProductVariation) {
          // Restore variation stock
          stockBefore = item.ProductVariation.stock || 0;
          stockAfter = stockBefore + item.quantity;

          await item.ProductVariation.update({
            stock: stockAfter
          }, { transaction });

          logger.debug(`📦 Stock restored: ${item.ProductVariation.sku} - ${stockBefore} → ${stockAfter} (+${item.quantity})`);

          stockRestorations.push({
            product_id: item.product_id,
            product_name: item.Product.name,
            variation_sku: item.ProductVariation.sku,
            quantity_restored: item.quantity,
            stock_before: stockBefore,
            stock_after: stockAfter
          });
        } else {
          logger.warn(`⚠️ RTO stock restoration skipped for product ${item.Product.name} - no variation found`);
        }

        // Log stock restoration in database
        await sequelize.query(`
          INSERT INTO rto_stock_restoration (
            order_id, order_number, product_id, variation_id,
            quantity_restored, stock_before, stock_after, restored_by, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            order.id,
            order.order_number,
            item.product_id,
            item.variation_id,
            item.quantity,
            stockBefore,
            stockAfter,
            'fship_webhook',
            `Auto-restored via FShip webhook. Reason: ${rto_reason || 'RTO'}`
          ],
          transaction
        });
      }

      logger.debug(`✅ RTO processing completed: ${stockRestorations.length} items, ${stockRestorations.reduce((sum, r) => sum + r.quantity_restored, 0)} units restored`);

      webhookNotes += ` - Stock auto-restored: ${stockRestorations.length} items`;
    }

    // Update order
    if (Object.keys(updateData).length > 0) {
      await order.update(updateData, { transaction });

      // Dual-write to order_shipments
      await upsertShipment(order.id, {
        waybill: waybill || order.fship_waybill,
        tracking_number: waybill || order.tracking_number,
        courier_name: courier_name || order.courier_name,
        sync_status: 'synced',
        last_synced_at: new Date(),
      }, transaction);

      // Credit loyalty points when an authenticated user's order is delivered.
      if (orderStatus === "delivered" && order.user_id) {
        try {
          await loyaltyService.creditPoints(
            order.user_id,
            order.id,
            order.final_amount,
            order.brand_id || 1,
            { transaction }
          );
        } catch (loyaltyErr) {
          logger.warn(
            `Loyalty credit skipped for order ${order.order_number}: ${loyaltyErr.message}`
          );
        }
      }

      // Add status history entry
      await OrderStatusHistory.create({
        order_id: order.id,
        status: orderStatus,
        notes: webhookNotes,
        created_by: "fship_webhook",
      }, { transaction });

      logger.debug(`✅ Order ${order.order_number} updated:`, {
        status: orderStatus,
        tracking_number: waybill,
        courier: courier_name,
        payment_status: updateData.payment_status
      });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Webhook processed successfully",
      order_number: order.order_number,
      status: orderStatus
    });

    // Send WhatsApp status notifications (fire-and-forget)
    setImmediate(async () => {
      try {
        const whatsappService = require('../services/whatsappService.js');
        const addr = await ShippingAddress.findOne({ where: { id: order.shipping_address_id } });
        const phone = addr?.phone || order.GuestUser?.phone;
        if (!phone) return;

        if (orderStatus === 'shipped' || orderStatus === 'in transit') {
          await whatsappService.sendOrderShipped(phone, {
            orderNumber: order.order_number,
            awbNumber: waybill || order.fship_waybill,
            trackingUrl: order.tracking_url || `https://crosscoin.in/OrderTracking?order=${order.order_number}`
          }, order.brand_id || 1);
        } else if (orderStatus === 'out for delivery') {
          await whatsappService.sendOutForDelivery(phone, {
            orderNumber: order.order_number,
            courierName: courier_name || order.courier_name || 'Our courier partner'
          }, order.brand_id || 1);
        } else if (orderStatus === 'delivered') {
          await whatsappService.sendOrderDelivered(phone, { orderNumber: order.order_number }, order.brand_id || 1);
        } else if (orderStatus === 'cancelled' || orderStatus === 'order cancelled') {
          await whatsappService.sendOrderCancelled(phone, {
            orderNumber: order.order_number,
            refundInfo: order.payment_status === 'refund_pending' ? 'Refund will be processed in 5-7 business days' : 'No refund applicable'
          }, order.brand_id || 1);
        } else if (orderStatus === 'rto' || orderStatus === 'rto delivered') {
          await whatsappService.sendOrderCancelled(phone, {
            orderNumber: order.order_number,
            refundInfo: 'Your order was returned. Refund will be processed in 5-7 business days if payment was made online.'
          }, order.brand_id || 1);
        }
      } catch (waErr) {
        logger.warn('WhatsApp status notification failed:', waErr.message);
      }
    });

  } catch (error) {
    await transaction.rollback();
    logger.error("❌ Error processing FShip webhook:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process webhook",
      error: error.message
    });
  }
};

// Get tracking info for an order — uses the provider that issued the AWB.
module.exports.getFShipTrackingForOrder = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await Order.findByPk(id);
    if (!order || !order.fship_waybill) {
      return res
        .status(404)
        .json({ message: "Order or waybill not found" });
    }
    const { service: provider, name: providerName } = await resolveProviderForOrder(order);
    const tracking = await provider.getShipmentStatus(order.fship_waybill);
    res.json({ tracking, provider: providerName });
  } catch (error) {
    logger.error("Error fetching tracking:", error);
    res.status(500).json({
      message: "Failed to fetch tracking",
      error: error.message,
    });
  }
};

// Get shipping label for an order — uses the provider that issued the AWB.
module.exports.getFShipLabelForOrder = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await Order.findByPk(id);
    if (!order || !order.fship_waybill) {
      return res
        .status(404)
        .json({ message: "Order or waybill not found" });
    }
    const { service: provider, name: providerName } = await resolveProviderForOrder(order);
    const labelData = await provider.getShippingLabel(order.fship_waybill);
    res.json({ label_data: labelData, provider: providerName });
  } catch (error) {
    logger.error("Error fetching label:", error);
    res.status(500).json({
      message: "Failed to fetch label",
      error: error.message,
    });
  }
};

// Get FShip courier list
module.exports.getFShipCouriers = async (req, res) => {
  try {
    const couriers = await fshipService.getCourierList();
    res.json({ couriers });
  } catch (error) {
    logger.error("Error fetching FShip couriers:", error);
    res.status(500).json({
      message: "Failed to fetch FShip couriers",
      error: error.message,
    });
  }
};

// Cancel orders at the shipping provider (bulk). Routes each order to the
// provider that actually issued its AWB.
module.exports.cancelOrdersInFShip = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Order IDs are required" });
    }

    const results = {
      total: orderIds.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findByPk(orderId);
        if (!order || !order.fship_waybill) {
          results.failed++;
          results.errors.push(`Order ${orderId}: No waybill found`);
          continue;
        }

        const { service: provider, name: providerName } = await resolveProviderForOrder(order);
        await provider.cancelOrder(order.fship_waybill, "Bulk cancellation");

        results.successful++;
        logger.debug(`Order ${orderId} cancelled via ${providerName}`);

        // Update local order status
        await order.update({ status: "cancelled" });

        // Add status history
        await OrderStatusHistory.create({
          order_id: order.id,
          status: "cancelled",
          notes: `Cancelled via ${providerName} bulk operation`,
          created_by: "admin",
        });

      } catch (error) {
        results.failed++;
        results.errors.push(`Order ${orderId}: ${error.message}`);
      }
    }

    res.json({
      message: "Order cancellation sync completed",
      results,
    });
  } catch (error) {
    logger.error("Error cancelling orders:", error);
    res.status(500).json({
      message: "Failed to cancel orders",
      error: error.message,
    });
  }
};

// Enhanced sync functions with comprehensive order management
module.exports.syncOrdersWithFShip = async (req, res) => {
  try {
    // Determine which provider to use based on the requested brand (default 1).
    // Different brands may be on different providers; if no brand is specified
    // we test the default brand's provider here for fast-fail and then resolve
    // per-order inside the loop.
    const defaultBrandId = parseInt(req.query?.brand_id, 10) || 1;
    const defaultProvider = await shippingProviderFactory.getShippingProvider(defaultBrandId);
    const defaultProviderName = await shippingProviderFactory.getProviderName(defaultBrandId);

    logger.debug(`=== ${defaultProviderName.toUpperCase()} SYNC PROCESS START ===`);

    // STEP 1: Test the provider connection
    try {
      logger.debug(`=== STEP 1: TESTING ${defaultProviderName.toUpperCase()} CONNECTION ===`);
      const testResult = await defaultProvider.testConnection();
      if (!testResult.success) {
        throw new Error(testResult.message);
      }
      logger.debug(`✅ ${defaultProviderName.toUpperCase()} CONNECTION SUCCESS`);
    } catch (authError) {
      logger.error(`❌ ${defaultProviderName.toUpperCase()} CONNECTION FAILED`);
      return res.status(400).json({
        success: false,
        message: `${defaultProviderName} connection failed`,
        provider: defaultProviderName,
        error: authError.message,
        step: "connection"
      });
    }

    // STEP 2: Get orders for sync (exclude cancelled and delivered)
    logger.debug("=== STEP 2: FETCHING ORDERS FOR SYNC ===");

    // Get limit from request (default 50 for cron, can be overridden by admin)
    const limit = parseInt(req.query?.limit) || 50;
    logger.debug(`📊 Sync limit set to: ${limit} orders`);

    // Prioritize orders that haven't been synced or have failed, within attempt limit
    const ordersToSync = await Order.findAll({
      where: {
        status: { [Op.notIn]: ['awaiting_confirmation', 'pending', 'cancelled', 'delivered', 'rto delivered'] }, // Only sync confirmed+ orders, skip unconfirmed and final states
        order_number: { [Op.notLike]: '%TEST%' }, // Exclude test orders
        fship_sync_status: { [Op.in]: ['pending', 'failed'] },
        fship_sync_attempts: { [Op.lt]: 5 }
      },
      include: [
        {
          model: OrderItem,
          as: "OrderItems",
          include: [
            { model: Product, as: "Product" },
            { model: ProductVariation, as: "ProductVariation" }  // ✅ Include ProductVariation for SKU
          ]
        },
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName", "phone"], required: false },
        { model: ShippingAddress, as: "ShippingAddress" },
      ],
      limit: limit, // Add limit to prevent processing too many orders at once
      order: [
        ['created_at', 'ASC']
      ]
    });

    logger.debug(`📦 Found ${ordersToSync.length} orders to process`);

    const results = {
      total: ordersToSync.length,
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [],
      errors_list: []
    };

    // STEP 3: Process each order with its OWN transaction (one failure won't roll back others)
    for (const order of ordersToSync) {
      const orderTransaction = await sequelize.transaction();
      try {
        logger.debug(`\n🔄 Processing order: ${order.order_number} (Status: ${order.status})`);

        // Mark as syncing and increment attempt counter before processing
        await order.update({
          fship_sync_status: 'syncing',
          fship_sync_attempts: sequelize.literal('fship_sync_attempts + 1')
        }, { transaction: orderTransaction });

        const syncResult = await this.enhancedSyncSingleOrder(order, orderTransaction);

        if (syncResult.success) {
          await order.update({ fship_sync_status: 'synced' }, { transaction: orderTransaction });
          await upsertShipment(order.id, { sync_status: 'synced' }, orderTransaction);

          if (syncResult.action === 'synced') {
            results.synced++;
          } else if (syncResult.action === 'updated') {
            results.updated++;
          } else {
            results.skipped++;
          }

          results.details.push({
            order_number: order.order_number,
            action: syncResult.action,
            status: syncResult.status,
            fship_order_id: syncResult.fship_order_id,
            waybill: syncResult.waybill,
            message: syncResult.message
          });
        } else {
          await order.update({ fship_sync_status: 'failed' }, { transaction: orderTransaction });
          results.errors++;
          results.errors_list.push({
            order_number: order.order_number,
            error: syncResult.error
          });
        }

        await orderTransaction.commit();
      } catch (error) {
        await orderTransaction.rollback();
        logger.error(`❌ Error processing order ${order.order_number}:`, error.message);
        await order.update({ fship_sync_status: 'failed' }).catch(() => {});
        results.errors++;
        results.errors_list.push({
          order_number: order.order_number,
          error: error.message
        });
      }
    }

    // Warn about orders that have exhausted all sync attempts
    const exhaustedOrders = await Order.findAll({
      where: {
        fship_sync_status: 'failed',
        fship_sync_attempts: { [Op.gte]: 5 },
        status: { [Op.notIn]: ['cancelled', 'delivered', 'rto delivered'] }
      },
      attributes: ['order_number', 'fship_sync_attempts']
    });
    if (exhaustedOrders.length > 0) {
      logger.warn(`⚠️ ADMIN ALERT: ${exhaustedOrders.length} order(s) have exhausted all FShip sync attempts (>= 5):`,
        exhaustedOrders.map(o => o.order_number).join(', ')
      );
    }

    logger.debug("\n=== SYNC SUMMARY ===");
    logger.debug(`📦 Total: ${results.total}`);
    logger.debug(`✅ Synced: ${results.synced}`);
    logger.debug(`🔄 Updated: ${results.updated}`);
    logger.debug(`⏭️ Skipped: ${results.skipped}`);
    logger.debug(`❌ Errors: ${results.errors}`);

    return res.json({
      success: true,
      message: "Enhanced FShip sync completed",
      data: results
    });

  } catch (error) {
    logger.error("❌ SYNC PROCESS FAILED:", error);
    return res.status(500).json({
      success: false,
      message: "Sync process failed",
      error: error.message
    });
  }
};

// Enhanced single order sync with comprehensive logic
module.exports.enhancedSyncSingleOrder = async (order, transaction = null, provider = null, providerName = null, selectedLogistics = null, serviceType = null) => {
  const localTransaction = transaction || await sequelize.transaction();
  const shouldCommit = !transaction;

  // Resolve provider if not supplied (callers may not pass it yet during refactor).
  if (!provider) {
    const resolved = await resolveProviderForOrder(order);
    provider = resolved.service;
    providerName = resolved.name;
  }

  try {
    logger.debug(`🔍 Enhanced sync for order ${order.order_number} via ${providerName}${selectedLogistics ? ` with courier: ${selectedLogistics}` : ''}`);

    // STEP 1: Check if order is already synced or currently syncing
    const isSynced = order.fship_order_id && order.fship_waybill;
    const isSyncing = order.fship_sync_status === 'syncing';

    if (isSyncing) {
      logger.debug(`⏳ Order ${order.order_number} is currently syncing. Skipping to avoid duplicate...`);
      if (shouldCommit) await localTransaction.commit();

      return {
        success: false,
        error: `Order ${order.order_number} is already being synced. Please wait.`,
        action: 'skipped'
      };
    }

    if (!isSynced) {
      // STEP 2: Order not synced — create at the active provider
      logger.debug(`📝 Order ${order.order_number} not synced. Creating in ${providerName}...`);

      const createResult = await this.createOrderInFShip(order, localTransaction, provider, providerName, selectedLogistics, serviceType);

      if (createResult.success) {
        logger.debug(`✅ Order ${order.order_number} created in ${providerName}`);

        if (shouldCommit) await localTransaction.commit();

        return {
          success: true,
          action: 'synced',
          status: order.status,
          provider: providerName,
          fship_order_id: createResult.fship_order_id,
          waybill: createResult.waybill,
          message: `Order created and synced with ${providerName}`
        };
      } else {
        throw new Error(createResult.error);
      }
    } else {
      // STEP 3: Order already synced — update status from provider
      logger.debug(`🔄 Order ${order.order_number} already synced (${providerName}). Checking for updates...`);

      const updateResult = await this.updateOrderStatusFromFShip(order, localTransaction, provider, providerName);

      if (updateResult.success) {
        logger.debug(`✅ Order ${order.order_number} status updated via ${providerName}`);

        if (shouldCommit) await localTransaction.commit();

        return {
          success: true,
          action: updateResult.statusChanged ? 'updated' : 'skipped',
          status: updateResult.newStatus || order.status,
          provider: providerName,
          fship_order_id: order.fship_order_id,
          waybill: order.fship_waybill,
          message: updateResult.message
        };
      } else {
        throw new Error(updateResult.error);
      }
    }

  } catch (error) {
    logger.error(`❌ Enhanced sync failed for ${order.order_number}:`, error.message);
    if (shouldCommit) await localTransaction.rollback();

    return {
      success: false,
      error: error.message
    };
  }
};

// Validate order data before FShip sync — returns array of issues
module.exports.validateOrderForFShip = (order) => {
  const issues = [];
  const addr = order.ShippingAddress;

  if (!addr) {
    issues.push('Shipping address is missing');
    return issues; // no point checking further
  }
  if (!addr.full_name || !addr.full_name.trim()) issues.push('Shipping address: full name is missing');
  if (!addr.address || !addr.address.trim()) issues.push('Shipping address: address is missing');
  if (!addr.city || !addr.city.trim()) issues.push('Shipping address: city is missing');
  if (!addr.state || !addr.state.trim()) issues.push('Shipping address: state is missing');
  if (!addr.pincode || !addr.pincode.trim()) {
    issues.push('Shipping address: pincode is missing');
  } else if (!/^\d{6}$/.test(addr.pincode.trim())) {
    issues.push('Shipping address: pincode must be exactly 6 digits');
  }
  if (!addr.phone) {
    issues.push('Shipping address: phone is missing');
  } else {
    const digits = String(addr.phone).replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      issues.push('Shipping address: phone must be a valid 10-digit Indian mobile number');
    }
  }

  if (!order.OrderItems || order.OrderItems.length === 0) {
    issues.push('Order has no items');
  }

  const customer = order.User || order.GuestUser;
  if (!customer) issues.push('No customer (user or guest) linked to order');

  return issues;
};

// Create order at the active shipping provider for the order's brand.
// Method name kept for backward compatibility; despite "FShip" in the name it
// dispatches to whichever provider is currently configured (FShip or iThink).
module.exports.createOrderInFShip = async (order, transaction, provider = null, providerName = null, selectedLogistics = null, serviceType = null) => {
  try {
    if (!provider) {
      const resolved = await resolveProviderForOrder(order);
      provider = resolved.service;
      providerName = resolved.name;
    }

    logger.debug(`🚀 Creating order ${order.order_number} in ${providerName}...${selectedLogistics ? ` with courier: ${selectedLogistics}` : ''}`);

    // Reload order to get latest data and prevent race conditions
    await order.reload({ transaction });

    // Double-check if order was already synced by another process
    if (order.fship_order_id && order.fship_waybill) {
      logger.debug(`⚠️ Order ${order.order_number} already has FShip data. Skipping creation.`);
      return {
        success: true,
        fship_order_id: order.fship_order_id,
        waybill: order.fship_waybill,
        route_code: order.fship_route_code,
        already_synced: true
      };
    }

    // Validate order data before sending to FShip
    const validationIssues = this.validateOrderForFShip(order);
    if (validationIssues.length > 0) {
      const errorMsg = validationIssues.join('; ');
      logger.error(`❌ Order ${order.order_number} failed FShip validation: ${errorMsg}`);
      await order.update({
        fship_sync_status: 'failed',
        fship_sync_error: errorMsg,
      }, { transaction });
      return {
        success: false,
        error: errorMsg
      };
    }

    // Clear any previous sync error on retry
    if (order.fship_sync_error) {
      await order.update({ fship_sync_error: null }, { transaction });
    }

    // Prepare order payload (same shape works for both providers — each service
    // formats it internally for its own API)
    const fshipOrderData = await this.prepareFShipOrderData(order, providerName, selectedLogistics, serviceType);

    // Create order using the resolved provider
    const result = await provider.createOrUpdateForwardOrder(fshipOrderData);

    logger.debug(`=== ${providerName} Create Order Result ===`);
    logger.debug('Success:', result.success);
    logger.debug('Order ID:', result.orderId);
    logger.debug('Waybill:', result.waybill);
    logger.debug('Label URL:', result.labelUrl);
    logger.debug('Full Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      // Generate/fetch label for waybill based on provider
      let labelUrl = result.labelUrl || null;

      if (result.waybill) {
        logger.debug(`📄 Fetching label for waybill: ${result.waybill} (Provider: ${providerName})`);
        try {
          let labelData = null;

          if (providerName === 'ithink') {
            // iThink: use getLabel for PDF
            labelData = await provider.getLabel({ waybills: [result.waybill] });
            logger.debug('📦 iThink Label Response:', JSON.stringify(labelData, null, 2));

            if (labelData && labelData.pdfUrl) {
              labelUrl = labelData.pdfUrl;
            } else if (labelData && labelData.file_name) {
              labelUrl = labelData.file_name;
            }
          } else {
            // FShip: use getShippingLabel
            labelData = await provider.getShippingLabel(result.waybill);
            logger.debug('📦 FShip Label Response:', JSON.stringify(labelData, null, 2));

            if (labelData) {
              if (Array.isArray(labelData.data) && labelData.data.length > 0) {
                labelUrl = labelData.data[0].labelurl || labelData.data[0].label_url || labelData.data[0].LabelUrl;
              } else if (labelData.data && typeof labelData.data === 'object') {
                labelUrl = labelData.data.labelurl || labelData.data.label_url || labelData.data.LabelUrl;
              } else if (labelData.labelurl || labelData.label_url || labelData.LabelUrl) {
                labelUrl = labelData.labelurl || labelData.label_url || labelData.LabelUrl;
              }
            }
          }

          if (labelUrl) {
            logger.debug(`✅ Label/Manifest URL: ${labelUrl}`);
          } else {
            logger.debug('⚠️ Label/Manifest URL not found in response');
          }
        } catch (labelError) {
          logger.error(`❌ Failed to fetch ${providerName} label:`, labelError.message);
        }
      }

      // Update order with provider details (fship_* columns used for both FShip and iThink)
      await order.update({
        fship_order_id: result.orderId || null,
        fship_waybill: result.waybill || null,
        fship_route_code: result.routeCode || null,
        fship_label_url: labelUrl || null,
        fship_courier_id: result.courierId || null,
        courier_name: result.courierName || null,
        tracking_number: result.waybill || null,
        status: 'processing', // Update status to processing when synced
        fship_last_synced_at: new Date() // Track last sync time
      }, { transaction });

      // Dual-write to order_shipments table — record the provider that was used
      await upsertShipment(order.id, {
        provider: providerName,
        provider_order_id: result.orderId,
        waybill: result.waybill,
        tracking_number: result.waybill,
        route_code: result.routeCode,
        courier_id: result.courierId || null,
        courier_name: result.courierName || null,
        label_url: labelUrl,
        sync_status: 'synced',
        last_synced_at: new Date(),
      }, transaction);

      // Create status history
      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'processing',
        notes: `Order synced with ${providerName}. AWB: ${result.waybill}${result.courierName ? ` - Courier: ${result.courierName}` : ''}`,
        created_by: `${providerName}_sync_system`
      }, { transaction });

      logger.debug(`✅ Order ${order.order_number} created in ${providerName} with AWB: ${result.waybill}${result.courierName ? `, Courier: ${result.courierName}` : ''}`);

      // If courier name or tracking URL not in create response, try shipment summary
      if ((!result.courierName || !order.tracking_url) && result.waybill) {
        try {
          const shipmentStatus = await provider.getShipmentStatus(result.waybill);
          logger.debug('📡 Shipment summary after create:', JSON.stringify(shipmentStatus, null, 2));
          const summaryUpdates = {};

          if (!result.courierName) {
            const courierFromSummary = shipmentStatus?.courier_name || shipmentStatus?.courierName || shipmentStatus?.summary?.courier_name || shipmentStatus?.data?.courier_name || null;
            if (courierFromSummary) {
              summaryUpdates.courier_name = courierFromSummary;
              logger.debug(`📦 Courier name from shipment summary: ${courierFromSummary}`);
            }
          }

          const trackingUrlFromSummary = shipmentStatus?.tracking_url || shipmentStatus?.trackingUrl || shipmentStatus?.summary?.tracking_url || shipmentStatus?.data?.tracking_url || null;
          if (trackingUrlFromSummary) {
            summaryUpdates.tracking_url = trackingUrlFromSummary;
            logger.debug(`🔗 Tracking URL from shipment summary: ${trackingUrlFromSummary}`);
          }

          if (Object.keys(summaryUpdates).length > 0) {
            await order.update(summaryUpdates, { transaction });
            await upsertShipment(order.id, summaryUpdates, transaction);
          }
        } catch (courierErr) {
          logger.debug(`⚠️ Could not fetch shipment summary: ${courierErr.message}`);
        }
      }

      // Generate label automatically and get PDF URL
      let labelUrl2 = null;
      let labelId = null;
      try {
        if (result.waybill && typeof provider.getLabel === 'function') {
          logger.debug(`📑 Generating label for order ${order.order_number}...`);
          const labelResult = await provider.getLabel({ waybills: [result.waybill] });
          if (labelResult.success) {
            labelUrl2 = labelResult.pdfUrl;
            labelId = labelResult.labelId;
            logger.debug(`✅ Label generated. PDF URL: ${labelUrl2}`);
          } else {
            logger.debug(`⚠️ Label generation failed: ${labelResult.error}`);
          }
        }
      } catch (labelErr) {
        logger.debug(`⚠️ Could not generate label: ${labelErr.message}`);
      }

      return {
        success: true,
        fship_order_id: result.orderId,
        waybill: result.waybill,
        route_code: result.routeCode,
        labelId: labelId,
        labelUrl2: labelUrl2
      };
    } else {
      throw new Error(result.message || `Failed to create order in ${providerName}`);
    }

  } catch (error) {
    logger.error(`❌ Failed to create order ${order.order_number} in ${providerName}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update order status from the provider that originally shipped it.
// Method name kept for backward compatibility — it dispatches to whatever
// provider the order's shipment row was created under.
module.exports.updateOrderStatusFromFShip = async (order, transaction, provider = null, providerName = null) => {
  try {
    if (!provider) {
      const resolved = await resolveProviderForOrder(order);
      provider = resolved.service;
      providerName = resolved.name;
    }

    logger.debug(`🔄 Updating status for order ${order.order_number} from ${providerName}...`);
    logger.debug(`📋 Current order details - Label URL: ${order.fship_label_url || 'MISSING'}, Waybill: ${order.fship_waybill || 'MISSING'}`);

    const waybill = order.fship_waybill || order.tracking_number;

    if (!waybill) {
      return {
        success: false,
        error: 'No waybill found for order'
      };
    }

    // Fetch label URL if not already present (check for both NULL and empty string)
    if ((!order.fship_label_url || order.fship_label_url.trim() === '') && waybill) {
      logger.debug(`📄 Label URL missing. Attempting to fetch for waybill: ${waybill}`);

      const orderId = order.fship_order_id;

      if (orderId) {
        let labelUrl = null;

        // Construct label URL based on provider
        if (providerName === 'fship') {
          // FShip label URL format: https://manifest.fship.in/files/label_html/label_{WAYBILL}_{ORDER_ID}_TH.pdf
          labelUrl = `https://manifest.fship.in/files/label_html/label_${waybill}_${orderId}_TH.pdf`;
          logger.debug(`✅ FShip label URL constructed: ${labelUrl}`);
        } else if (providerName === 'ithink') {
          // iThink typically provides the label URL via API, so we'll try to fetch it
          logger.debug(`📄 Fetching iThink label URL via API for waybill: ${waybill}`);
          try {
            const labelData = await provider.getShippingLabel(waybill);
            if (labelData) {
              if (Array.isArray(labelData.data) && labelData.data.length > 0) {
                labelUrl = labelData.data[0].labelurl || labelData.data[0].label_url || labelData.data[0].LabelUrl;
              } else if (labelData.data && typeof labelData.data === 'object') {
                labelUrl = labelData.data.labelurl || labelData.data.label_url || labelData.data.LabelUrl;
              } else if (labelData.labelurl || labelData.label_url || labelData.LabelUrl) {
                labelUrl = labelData.labelurl || labelData.label_url || labelData.LabelUrl;
              }
              if (labelUrl) logger.debug(`✅ iThink label URL fetched: ${labelUrl}`);
            }
          } catch (fetchErr) {
            logger.debug(`⚠️ Could not fetch iThink label URL: ${fetchErr.message}`);
          }
        }

        if (labelUrl) {
          try {
            await order.update({
              fship_label_url: labelUrl,
              notes: order.notes ? `${order.notes}\niThink Manifest: Label URL obtained` : `iThink Manifest: Label URL obtained`
            }, { transaction });
            await upsertShipment(order.id, { label_url: labelUrl }, transaction);
            await order.reload({ transaction });
            logger.debug(`💾 Manifest URL saved to database`);
          } catch (updateError) {
            logger.error('❌ Failed to save label URL:', updateError.message);
          }
        } else {
          logger.debug(`⚠️ Could not fetch label URL`);
        }
      } else {
        logger.debug(`⚠️ Order ID not found, cannot fetch label`);
      }
    } else {
      logger.debug(`✓ Manifest URL already exists: ${order.fship_label_url}`);
    }

    // Get tracking history from provider
    const trackingResult = await provider.getTrackingHistory(waybill);
    logger.debug(`📡 ${providerName} tracking response:`, JSON.stringify(trackingResult, null, 2));

    // Extract tracking data based on provider format
    let statusData = null;
    let providerStatus = null;

    if (providerName === 'ithink') {
      // iThink V3 format: { status_code: 200, data: { "<AWB>": { current_status, ... } } }
      // The response key is the AWB string, but iThink occasionally returns it
      // trimmed/normalised. Try several lookups before giving up.
      const data = trackingResult?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const wbStr = String(waybill).trim();
        statusData =
          data[waybill] ||
          data[wbStr] ||
          data[wbStr.replace(/^0+/, '')] ||  // some couriers strip leading zeros
          null;

        // Fallback: single-AWB query usually returns exactly one entry, so if
        // we asked for one waybill and got exactly one back, use that entry
        // regardless of how it's keyed.
        if (!statusData) {
          const entries = Object.values(data).filter(v => v && typeof v === 'object');
          if (entries.length === 1) statusData = entries[0];
        }

        if (statusData) providerStatus = statusData.current_status;
      }
    } else {
      // FShip format: { summary: { status, courier_name, ... } }
      if (trackingResult && trackingResult.summary) {
        statusData = trackingResult.summary;
        providerStatus = statusData.status;
      }
    }

    if (statusData && providerStatus) {
      const newStatus = provider.mapFShipStatusToCrossCoin(providerStatus);

      // Extract courier name from tracking data (try every possible field)
      const courierFromTracking = statusData.courier_name
        || statusData.courierName
        || statusData.courier
        || statusData.Courier
        || trackingResult.courier_name
        || trackingResult.courierName
        || null;
      if (courierFromTracking && courierFromTracking !== order.courier_name) {
        await order.update({ courier_name: courierFromTracking }, { transaction });
        await upsertShipment(order.id, { courier_name: courierFromTracking }, transaction);
        logger.debug(`📦 Courier name updated from tracking: ${courierFromTracking}`);
      }

      // Extract tracking URL from tracking data
      const trackingUrl = statusData.tracking_url
        || statusData.trackingUrl
        || statusData.tracking_link
        || trackingResult.tracking_url
        || trackingResult.trackingUrl
        || null;
      if (trackingUrl && trackingUrl !== order.tracking_url) {
        await order.update({ tracking_url: trackingUrl }, { transaction });
        await upsertShipment(order.id, { tracking_url: trackingUrl }, transaction);
        logger.debug(`🔗 Tracking URL updated: ${trackingUrl}`);
      }

      logger.debug(`📊 ${providerName} status: "${providerStatus}" → CrossCoin status: "${newStatus}"`);

      const statusChanged = order.status !== newStatus;

      if (statusChanged) {
        // Prepare update data
        const updateData = {
          status: newStatus,
          fship_last_synced_at: new Date() // Track last sync time
        };

        // SPECIAL HANDLING: Update payment status based on order status
        if (newStatus === 'delivered' && order.payment_type === 'cod') {
          // COD orders: mark as paid when delivered
          updateData.payment_status = 'paid';
          logger.debug(`💰 Order ${order.order_number} is delivered COD. Updating payment status to paid...`);
        } else if (newStatus === 'cancelled' || newStatus === 'rto' || newStatus === 'rto delivered') {
          // Cancelled, RTO, or RTO Delivered orders: update payment status
          if (order.payment_type === 'cod') {
            updateData.payment_status = 'cancelled';
            logger.debug(`❌ Order ${order.order_number} is ${newStatus}. Updating COD payment status to cancelled...`);
          } else if (order.payment_status === 'paid') {
            updateData.payment_status = 'refund_pending';
            logger.debug(`💸 Order ${order.order_number} is ${newStatus}. Updating prepaid payment status to refund_pending...`);
          } else {
            updateData.payment_status = 'cancelled';
            logger.debug(`❌ Order ${order.order_number} is ${newStatus}. Updating payment status to cancelled...`);
          }
        }

        // Update order status and payment status
        await order.update(updateData, { transaction });

        // Credit loyalty points when an authenticated user's order is delivered.
        if (newStatus === 'delivered' && order.user_id) {
          try {
            await loyaltyService.creditPoints(
              order.user_id,
              order.id,
              order.final_amount,
              order.brand_id || 1,
              { transaction }
            );
          } catch (loyaltyErr) {
            logger.warn(
              `Loyalty credit skipped for order ${order.order_number}: ${loyaltyErr.message}`
            );
          }
        }

        // Create status history
        await OrderStatusHistory.create({
          order_id: order.id,
          status: newStatus,
          notes: `Status updated from ${providerName}. Provider status: ${providerStatus}${updateData.payment_status ? `. Payment status: ${updateData.payment_status}` : ''}`,
          created_by: `${providerName}_sync_system`
        }, { transaction });

        // Handle payment records for delivered COD orders
        if (newStatus === 'delivered' && order.payment_type === 'cod') {

          await order.update({
            payment_status: 'paid'
          }, { transaction });

          // Create payment record if not exists
          const existingPayment = await Payment.findOne({
            where: { order_id: order.id }
          });

          if (!existingPayment) {
            await Payment.create({
              order_id: order.id,
              payment_type: 'cod',
              amount_paid: order.final_amount,
              status: 'completed',
              transaction_id: `COD-${order.order_number}`,
              brand_id: order.brand_id, // ✅ Use brand_id from order for consistency
              notes: 'COD payment completed on delivery'
            }, { transaction });
          } else {
            await existingPayment.update({
              status: 'completed',
              payment_date: new Date(),
              notes: 'COD payment completed on delivery'
            }, { transaction });
          }

          logger.debug(`✅ Payment status updated to paid for COD order ${order.order_number}`);
        }

        // Handle payment records for cancelled/RTO orders
        if ((newStatus === 'cancelled' || newStatus === 'rto' || newStatus === 'rto delivered') && order.payment_type !== 'cod' && order.payment_status === 'paid') {
          const existingPayment = await Payment.findOne({
            where: { order_id: order.id }
          });

          if (existingPayment) {
            await existingPayment.update({
              status: 'refund_pending',
              notes: `Refund pending due to order ${newStatus}`
            }, { transaction });
            logger.debug(`💸 Payment marked for refund for order ${order.order_number}`);
          }
        }

        logger.debug(`✅ Order ${order.order_number} status updated: ${order.status} → ${newStatus}`);

        // Audit trail: record every shipping-driven status transition.
        try {
          await orderAuditLog(
            order.id,
            'shipping_status_change',
            null,
            `${providerName || 'shipping'}_sync`,
            {
              from: order.status,
              to: newStatus,
              provider: providerName,
              provider_status: providerStatus,
            },
            transaction,
          );
        } catch (auditErr) {
          logger.warn(`Audit log skipped for ${order.order_number}: ${auditErr.message}`);
        }

        // Update address-quality success / failure counters on terminal states.
        // Runs after the transaction commits so it can't fail the status update.
        // Uses raw SQL UPDATE on the unique address_hash so we don't have to
        // round-trip through a SELECT first.
        const _qualityOrder = order;
        const _qualityNewStatus = newStatus;
        setImmediate(async () => {
          try {
            const addr = _qualityOrder.ShippingAddress
              || (_qualityOrder.shipping_address_id
                  ? await ShippingAddress.findOne({ where: { id: _qualityOrder.shipping_address_id } })
                  : null);
            if (!addr || !addr.address || !addr.pincode) return;
            // Prefer the persisted hash on shipping_addresses; fall back to
            // recompute for legacy rows that pre-date the migration.
            const hash = addr.address_hash || getAddressHash({
              line1: addr.address,
              line2: addr.landmark || '',
              city:  addr.city,
              state: addr.state,
              pincode: addr.pincode,
            });
            if (_qualityNewStatus === 'delivered') {
              await AddressQualityScore.increment('delivery_success_count', { where: { address_hash: hash } });
            } else if (['undelivered', 'rto', 'rto delivered', 'returned_rto'].includes(_qualityNewStatus)) {
              await AddressQualityScore.increment('delivery_failure_count', { where: { address_hash: hash } });
            }
          } catch (qErr) {
            logger.warn(`Address quality counter update skipped for ${_qualityOrder.order_number}: ${qErr.message}`);
          }
        });

        // Notify customer via WhatsApp (fire-and-forget, runs after transaction commits)
        const _notifyPhone = order.shipping_address_id;
        const _notifyOrder = order;
        const _notifyStatus = newStatus;
        setImmediate(async () => {
          try {
            const whatsappSvc = require('../services/whatsappService.js');
            const addr = await ShippingAddress.findOne({ where: { id: _notifyPhone } });
            const phone = addr?.phone;
            if (!phone) return;
            const trackingUrl = _notifyOrder.tracking_url
              || `https://crosscoin.in/OrderTracking?order=${_notifyOrder.order_number}`;

            if (_notifyStatus === 'shipped' || _notifyStatus === 'in transit') {
              await whatsappSvc.sendOrderShipped(phone, {
                orderNumber: _notifyOrder.order_number,
                awbNumber: _notifyOrder.fship_waybill || _notifyOrder.tracking_number,
                trackingUrl,
              }, _notifyOrder.brand_id || 1);
            } else if (_notifyStatus === 'out for delivery') {
              await whatsappSvc.sendOutForDelivery(phone, {
                orderNumber: _notifyOrder.order_number,
                courierName: _notifyOrder.courier_name || 'Our courier partner',
              }, _notifyOrder.brand_id || 1);
            } else if (_notifyStatus === 'delivered') {
              await whatsappSvc.sendOrderDelivered(phone, {
                orderNumber: _notifyOrder.order_number,
              }, _notifyOrder.brand_id || 1);
            } else if (_notifyStatus === 'cancelled' || _notifyStatus === 'order cancelled') {
              await whatsappSvc.sendOrderCancelled(phone, {
                orderNumber: _notifyOrder.order_number,
                refundInfo: _notifyOrder.payment_status === 'refund_pending'
                  ? 'Refund will be processed in 5-7 business days'
                  : 'No refund applicable',
              }, _notifyOrder.brand_id || 1);
            } else if (_notifyStatus === 'rto' || _notifyStatus === 'rto delivered') {
              await whatsappSvc.sendOrderCancelled(phone, {
                orderNumber: _notifyOrder.order_number,
                refundInfo: 'Your order was returned. Refund will be processed in 5-7 business days if payment was made online.',
              }, _notifyOrder.brand_id || 1);
            }
          } catch (waErr) {
            logger.warn(`[FShip] WhatsApp status notification failed for ${_notifyOrder.order_number}: ${waErr.message}`);
          }
        });

        return {
          success: true,
          statusChanged: true,
          newStatus: newStatus,
          message: `Status updated from ${order.status} to ${newStatus}`
        };
      } else {
        logger.debug(`📋 Order ${order.order_number} status unchanged: ${order.status}`);

        // Update last synced timestamp even if status unchanged
        await order.update({
          fship_last_synced_at: new Date()
        }, { transaction });

        // Even if status unchanged, ensure we have label URL
        if (!order.fship_label_url && waybill) {
          logger.debug(`📄 Status unchanged but label URL missing. Already fetched above.`);
        }

        return {
          success: true,
          statusChanged: false,
          message: 'Status unchanged'
        };
      }

      // Fallback: if courier name or tracking URL still missing, try shipment summary
      await order.reload({ transaction });
      if (!order.courier_name || !order.tracking_url) {
        try {
          const summary = await provider.getShipmentStatus(waybill);
          logger.debug(`📡 ${providerName} shipment summary fallback:`, JSON.stringify(summary, null, 2));
          const updates = {};
          const shipmentUpdates = {};

          if (!order.courier_name) {
            const cn = summary?.courier_name || summary?.courierName || summary?.data?.courier_name
              || summary?.summary?.courier_name || null;
            if (cn) { updates.courier_name = cn; shipmentUpdates.courier_name = cn; }
          }
          if (!order.tracking_url) {
            const tu = summary?.tracking_url || summary?.trackingUrl || summary?.data?.tracking_url
              || summary?.summary?.tracking_url || null;
            if (tu) { updates.tracking_url = tu; shipmentUpdates.tracking_url = tu; }
          }

          if (Object.keys(updates).length > 0) {
            await order.update(updates, { transaction });
            await upsertShipment(order.id, shipmentUpdates, transaction);
            logger.debug(`📦 Shipment summary fallback filled: ${JSON.stringify(updates)}`);
          }
        } catch (summaryErr) {
          logger.debug(`⚠️ Shipment summary fallback failed: ${summaryErr.message}`);
        }
      }

    } else {
      const dataObj = trackingResult?.data;
      const responseKeys = (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj))
        ? Object.keys(dataObj)
        : [];
      const topStatusCode = trackingResult?.status_code ?? null;
      const topMessage = trackingResult?.status_message || trackingResult?.message || null;
      logger.warn(
        `⚠️ No tracking data in ${providerName} for AWB "${waybill}" ` +
        `(order ${order.order_number}). status_code=${topStatusCode}, ` +
        `response keys=[${responseKeys.join(',')}], message=${topMessage || 'none'}. ` +
        `Full response: ${JSON.stringify(trackingResult)}`
      );
      return {
        success: false,
        error: `No tracking data in ${providerName} for AWB ${waybill}` +
          (responseKeys.length > 0 ? ` (response keyed by: ${responseKeys.join(', ')})` : '') +
          (topMessage ? ` — ${topMessage}` : ''),
        awb: waybill,
        response_keys: responseKeys,
      };
    }

  } catch (error) {
    logger.error(`❌ Failed to update status for order ${order.order_number}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Prepare order data for FShip API
module.exports.prepareFShipOrderData = async (order, providerName = 'fship', selectedLogistics = null, serviceType = null) => {
  try {
    // Get customer details
    const customer = order.User || order.GuestUser;
    const shippingAddress = order.ShippingAddress;

    // Use shipping address full_name first, then fall back to customer info
    const customerName = shippingAddress?.full_name
      || (customer?.firstName && customer?.lastName
          ? `${customer.firstName} ${customer.lastName}`
          : customer?.username || customer?.email)
      || 'Customer';

    const customerMobile = shippingAddress?.phone || customer?.phone;
    if (!customerMobile) {
      throw new Error(`Order ${order.order_number}: No phone number found for shipping`);
    }
    const customerEmail = customer?.email || '';

    // Prepare products array
    const products = order.OrderItems.map(item => ({
      productId: item.Product?.id || '',
      productName: item.Product?.name || 'Product',
      unitPrice: parseFloat(item.price) || 0,
      quantity: item.quantity || 1,
      productCategory: 'Socks',
      sku: item.ProductVariation?.sku || item.Product?.sku || `PROD-${item.Product?.id || ''}`,
      hsnCode: item.Product?.hsn_code || '',
      taxRate: 0,
      productDiscount: 0
    }));

    // Calculate shipment dimensions based on item quantities
    const dims = fshipService.calculateShipmentDimensions(order.OrderItems);

    // iThink-only mode: resolve warehouse ID from ITHINK_PICKUP_ADDRESS_ID setting
    const brandId = order.brand_id || 1;
    let pickAddressId = null;
    let returnAddressId = null;

    logger.debug(`📍 Resolving warehouse ID for ${providerName} (Brand: ${brandId})`);

    settingsHelper.clearCache(brandId);

    if (providerName === 'ithink') {
      pickAddressId = await settingsHelper.getSetting(brandId, 'ITHINK_PICKUP_ADDRESS_ID', null);
      returnAddressId = await settingsHelper.getSetting(brandId, 'ITHINK_RETURN_ADDRESS_ID', pickAddressId);
      logger.debug(`🏢 iThink Warehouse: pickup=${pickAddressId}, return=${returnAddressId}`);
      if (!pickAddressId) {
        throw new Error(`ITHINK_PICKUP_ADDRESS_ID is not configured for brand ${brandId}. Set it in Dashboard → Settings → Shipping.`);
      }
    } else {
      // FShip warehouse ID
      pickAddressId = parseInt(await settingsHelper.getSetting(brandId, 'FSHIP_DEFAULT_WAREHOUSE_ID', '227729'), 10);
      returnAddressId = pickAddressId;
      logger.debug(`🏢 FShip Warehouse: ${pickAddressId}`);
    }

    // Prepare order payload — the same shape works for both providers; each
    // service's formatter picks the fields it needs.
    const fshipOrderData = {
      orderId: order.order_number,
      customer_Name: customerName,
      customer_Mobile: customerMobile,
      customer_Emailid: customerEmail,
      customer_Address: shippingAddress?.address || '',
      landMark: '',
      customer_Address_Type: 'Home',
      customer_PinCode: String(shippingAddress?.pincode || '').trim(),
      customer_City: String(shippingAddress?.city || '').trim(),
      customer_State: String(shippingAddress?.state || '').trim(),
      payment_Mode: order.payment_type === 'cod' ? 1 : 2, // 1=COD, 2=PREPAID
      express_Type: 'surface',
      is_Ndd: 0,
      order_Amount: parseFloat(order.total_amount) || 0,
      tax_Amount: 0,
      extra_Charges: parseFloat(order.shipping_fee) || 0,
      total_Amount: parseFloat(order.final_amount) || 0,
      shipment_Weight: dims.shipment_Weight,
      shipment_Length: dims.shipment_Length,
      shipment_Width: dims.shipment_Width,
      shipment_Height: dims.shipment_Height,
      latitude: 0,
      longitude: 0,
      pick_Address_ID: pickAddressId,
      return_Address_ID: returnAddressId,
      products: products,
      courierId: 0, // Auto-selection
      // For iThink courier selection (passed by admin via modal)
      logistics: selectedLogistics || null,
      s_type: serviceType || null
    };

    return fshipOrderData;

  } catch (error) {
    logger.error('Error preparing order data:', error);
    throw error;
  }
};

// Enhanced single order sync endpoint
module.exports.syncSingleOrderWithFShip = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    logger.debug(`=== ENHANCED SINGLE ORDER SYNC: ${id} ===`);

    // Find the order
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "OrderItems",
          include: [
            { model: Product, as: "Product" },
            { model: ProductVariation, as: "ProductVariation" }  // ✅ Include ProductVariation for SKU
          ]
        },
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName", "phone"], required: false },
        { model: ShippingAddress, as: "ShippingAddress" },
      ]
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    logger.debug(`Found order: ${order.order_number} - Status: ${order.status}`);

    // Skip sync for cancelled orders (but allow delivered for status updates)
    if (order.status === 'cancelled') {
      await transaction.rollback();
      return res.json({
        success: true,
        message: `Order ${order.order_number} is cancelled. No sync needed.`,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            action: 'skipped'
          }
        }
      });
    }

    // Resolve provider for THIS order's brand and test the connection
    const { service: provider, name: providerName } = await resolveProviderForOrder(order);
    try {
      const testResult = await provider.testConnection();
      if (!testResult.success) {
        throw new Error(testResult.message);
      }
      logger.debug(`✅ ${providerName} connection successful`);
    } catch (authError) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `${providerName} connection failed`,
        provider: providerName,
        error: authError.message
      });
    }

    // Use enhanced sync logic with the resolved provider
    const syncResult = await this.enhancedSyncSingleOrder(order, transaction, provider, providerName);

    if (syncResult.success) {
      await transaction.commit();

      return res.json({
        success: true,
        message: `Order ${order.order_number} synced via ${providerName}`,
        data: {
          provider: providerName,
          order: {
            id: order.id,
            order_number: order.order_number,
            status: syncResult.status,
            provider: providerName,
            provider_order_id: syncResult.fship_order_id,
            fship_order_id: syncResult.fship_order_id,
            waybill: syncResult.waybill,
            action: syncResult.action
          },
          result: syncResult
        }
      });
    } else {
      // Save the sync error to the order so it's visible in the orders table
      await order.update({
        fship_sync_status: 'failed',
        fship_sync_error: syncResult.error || 'Sync failed — unknown error',
      }, { transaction });

      await transaction.commit();

      return res.status(400).json({
        success: false,
        message: `Failed to sync order ${order.order_number}`,
        error: syncResult.error
      });
    }

  } catch (error) {
    logger.error("❌ SINGLE ORDER SYNC FAILED:", error);
    await transaction.rollback();

    return res.status(500).json({
      success: false,
      message: "Single order sync failed",
      error: error.message
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// Bulk Status Refresh — fetch latest FShip status for old/synced orders
// POST /api/orders/fship/refresh-status
// Query params: ?limit=50&status=processing,booked,shipped&older_than_days=0
// ══════════════════════════════════════════════════════════════════════════════
module.exports.bulkRefreshFShipStatus = async (req, res) => {
  try {
    // Resolve provider for the requested brand (default 1) just to fail fast if
    // credentials are wrong. Inside the loop, each order resolves its own
    // provider based on the shipment row that created it.
    const defaultBrandId = parseInt(req.query?.brand_id, 10) || 1;
    const defaultProvider = await shippingProviderFactory.getShippingProvider(defaultBrandId);
    const defaultProviderName = await shippingProviderFactory.getProviderName(defaultBrandId);

    logger.debug(`=== BULK ${defaultProviderName.toUpperCase()} STATUS REFRESH START ===`);

    // STEP 1: Test the default provider connection
    const testResult = await defaultProvider.testConnection();
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        message: `${defaultProviderName} connection failed`,
        provider: defaultProviderName,
        error: testResult.message,
      });
    }

    // STEP 2: Parse filters
    const limit = Math.min(parseInt(req.query.limit) || 50, 300);
    const olderThanDays = parseInt(req.query.older_than_days) || 0;
    const statusFilter = req.query.status
      ? req.query.status.split(',').map(s => s.trim()).filter(s => !['delivered', 'rto delivered', 'cancelled', 'order cancelled'].includes(s))
      : ['confirmed', 'processing', 'booked', 'pickup initiated', 'manifested', 'in transit', 'shipped', 'out for delivery', 'undelivered', 'rto', 'exception'];

    const dateFilter = olderThanDays > 0
      ? { [Op.lt]: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) }
      : { [Op.ne]: null };

    // STEP 3: Fetch orders that have a waybill and are in active statuses
    const orders = await Order.findAll({
      where: {
        fship_waybill: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        status: { [Op.in]: statusFilter },
        order_number: { [Op.notLike]: '%TEST%' },
        createdAt: dateFilter,
      },
      include: [
        { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }, { model: ProductVariation, as: 'ProductVariation' }] },
        { model: User, as: 'User', attributes: ['id', 'username', 'email'], required: false },
        { model: GuestUser, as: 'GuestUser', attributes: ['id', 'email', 'firstName', 'lastName', 'phone'], required: false },
        { model: ShippingAddress, as: 'ShippingAddress' },
        { model: Payment, as: 'Payment' },
      ],
      order: [['createdAt', 'ASC']],
      limit,
    });

    logger.debug(`📦 Found ${orders.length} synced orders to refresh (limit: ${limit}, statuses: ${statusFilter.join(',')})`);

    const results = {
      total: orders.length,
      updated: 0,
      unchanged: 0,
      validation_failed: 0,
      errors: 0,
      details: [],
      validation_issues: [],
      errors_list: [],
    };

    // STEP 4: Process each order with its own transaction, in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (order) => {
        // ── Pre-refresh validation ──────────────────────────────────────
        const issues = module.exports.validateOrderForFShip(order);
        if (issues.length > 0) {
          results.validation_failed++;
          results.validation_issues.push({
            order_number: order.order_number,
            order_id: order.id,
            status: order.status,
            waybill: order.fship_waybill,
            issues,
          });
          // Still attempt refresh — validation issues don't block status reads
          logger.warn(`⚠️ Order ${order.order_number} has validation issues: ${issues.join('; ')}`);
        }

        const orderTx = await sequelize.transaction();
        try {
          const refreshResult = await module.exports.updateOrderStatusFromFShip(order, orderTx);

          if (refreshResult.success) {
            await orderTx.commit();

            if (refreshResult.statusChanged) {
              results.updated++;
              results.details.push({
                order_number: order.order_number,
                order_id: order.id,
                previous_status: order.status,
                new_status: refreshResult.newStatus,
                waybill: order.fship_waybill,
                payment_status_changed: refreshResult.newStatus === 'delivered' || refreshResult.newStatus === 'rto',
                message: refreshResult.message,
              });
            } else {
              results.unchanged++;
            }
          } else {
            await orderTx.rollback();
            results.errors++;
            results.errors_list.push({
              order_number: order.order_number,
              awb: refreshResult.awb || order.fship_waybill || order.tracking_number || null,
              error: refreshResult.error,
              ...(refreshResult.response_keys ? { ithink_response_keys: refreshResult.response_keys } : {}),
            });
          }
        } catch (err) {
          await orderTx.rollback();
          results.errors++;
          results.errors_list.push({
            order_number: order.order_number,
            awb: order.fship_waybill || order.tracking_number || null,
            error: err.message,
          });
        }
      });

      await Promise.all(batchPromises);

      // Rate-limit between batches
      if (i + BATCH_SIZE < orders.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    logger.debug("\n=== BULK REFRESH SUMMARY ===");
    logger.debug(`📦 Total: ${results.total} | ✅ Updated: ${results.updated} | ➖ Unchanged: ${results.unchanged} | ⚠️ Validation issues: ${results.validation_failed} | ❌ Errors: ${results.errors}`);

    return res.json({
      success: true,
      message: `Bulk status refresh completed: ${results.updated} updated, ${results.unchanged} unchanged, ${results.errors} errors`,
      data: results,
    });

  } catch (error) {
    logger.error("❌ BULK REFRESH FAILED:", error);
    return res.status(500).json({ success: false, message: 'Bulk status refresh failed', error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// Validate order for shipping — returns detailed errors & warnings
// GET /api/orders/:id/shipping/validate
// Optional query: ?logistics=delhivery&s_type=surface
// ══════════════════════════════════════════════════════════════════════════════
module.exports.validateOrderForShipping = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { logistics, s_type, order_type } = req.query;

    const { validateOrderForShipping } = require('../services/shippingValidationService');
    const result = await validateOrderForShipping(orderId, { logistics, s_type, orderType: order_type });

    return res.json({
      success: true,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      data: result.data,
    });
  } catch (error) {
    logger.error('validateOrderForShipping error:', error.message);
    return res.status(500).json({ success: false, message: 'Validation failed', error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// Get available couriers for an order (rate check)
// GET /api/orders/:id/shipping/couriers
// Returns list of couriers with rates and ETAs for admin to pick from
// ══════════════════════════════════════════════════════════════════════════════
module.exports.getAvailableCouriers = async (req, res) => {
  try {
    const orderId = req.params.id;

    // 1. Validate order first
    const { validateOrderForShipping } = require('../services/shippingValidationService');
    const validation = await validateOrderForShipping(orderId);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Order has validation errors — fix these before selecting a courier',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // 2. Load order + address for pincode
    const order = await Order.findByPk(orderId, {
      include: [
        { model: ShippingAddress, as: 'ShippingAddress' },
        { model: OrderItem, as: 'OrderItems' },
      ],
    });

    if (!order || !order.ShippingAddress) {
      return res.status(404).json({ success: false, message: 'Order or shipping address not found' });
    }

    // 3. Get provider and fetch couriers
    const { getShippingProvider, getProviderName } = require('../services/shippingProviderFactory');
    const providerName = await getProviderName(order.brand_id || 1);
    const provider = await getShippingProvider(order.brand_id || 1);

    const totalQty = order.OrderItems.reduce((s, i) => s + (i.quantity || 0), 0);
    const warehousePincode = await settingsHelper.getSetting(
      order.brand_id || 1,
      providerName === 'ithink' ? 'ITHINK_WAREHOUSE_PINCODE' : 'FSHIP_WAREHOUSE_PINCODE',
      '395006'
    );

    // For iThink — use getAvailableCouriers; for FShip — use calculateRates
    let couriers = [];
    if (providerName === 'ithink' && typeof provider.getAvailableCouriers === 'function') {
      couriers = await provider.getAvailableCouriers({
        sourcePincode: warehousePincode,
        destinationPincode: order.ShippingAddress.pincode,
        weight: totalQty * 0.07,
        length: 14,
        width: 3,
        height: 10 * totalQty,
        paymentMode: order.payment_type === 'cod' ? 'COD' : 'Prepaid',
        productMrp: parseFloat(order.final_amount),
      });
    } else {
      // FShip rate calculator
      const rates = await provider.calculateRates({
        source_Pincode: warehousePincode,
        destination_Pincode: order.ShippingAddress.pincode,
        payment_Mode: order.payment_type === 'cod' ? 'COD' : 'P',
        amount: parseFloat(order.final_amount),
        express_Type: 'surface',
        shipment_Weight: totalQty * 0.07,
        shipment_Length: 14,
        shipment_Width: 3,
        shipment_Height: 10 * totalQty,
      });
      couriers = Array.isArray(rates) ? rates : (rates?.data || []);
    }

    return res.json({
      success: true,
      provider: providerName,
      order_number: order.order_number,
      route: {
        from: warehousePincode,
        to: order.ShippingAddress.pincode,
        city: order.ShippingAddress.city,
        payment_type: order.payment_type,
      },
      warnings: validation.warnings,
      couriers,
    });
  } catch (error) {
    logger.error('getAvailableCouriers error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch couriers', error: error.message });
  }
};

/**
 * Sync an order with a user-selected courier
 * POST /api/orders/:id/sync-with-courier
 * Body: { logistics: 'delhivery', s_type: 'surface' }
 */
module.exports.syncWithCourier = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    let { logistics, s_type, auto } = req.body;
    s_type = s_type || 'surface';

    logger.debug(`=== SYNC WITH COURIER: Order ${id}, Logistics: ${logistics}, Auto: ${auto} ===`);

    // Auto mode: try couriers with fallback (Delhivery → Amazon → Xpressbees)
    if (auto || !logistics) {
      logger.debug(`🔄 Auto courier selection enabled`);
    }

    // Load the order
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'OrderItems',
          include: [
            { model: Product, as: 'Product' },
            { model: ProductVariation, as: 'ProductVariation' }
          ]
        },
        { model: User, as: 'User', attributes: ['id', 'username', 'email'], required: false },
        { model: GuestUser, as: 'GuestUser', attributes: ['id', 'email', 'firstName', 'lastName', 'phone'], required: false },
        { model: ShippingAddress, as: 'ShippingAddress' },
      ]
    }, { transaction });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    logger.debug(`Found order: ${order.order_number} - Status: ${order.status}`);

    // Skip sync for cancelled orders
    if (order.status === 'cancelled') {
      await transaction.rollback();
      return res.json({
        success: true,
        message: `Order ${order.order_number} is cancelled. No sync needed.`,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            action: 'skipped'
          }
        }
      });
    }

    // Validate order for shipping
    const { validateOrderForShipping } = require('../services/shippingValidationService');
    const validation = await validateOrderForShipping(id);
    if (!validation.valid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Order has validation errors',
        errors: validation.errors
      });
    }

    // Resolve provider and test connection
    const { service: provider, name: providerName } = await resolveProviderForOrder(order);
    try {
      const testResult = await provider.testConnection();
      if (!testResult.success) {
        throw new Error(testResult.message);
      }
      logger.debug(`✅ ${providerName} connection successful`);
    } catch (authError) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `${providerName} connection failed`,
        provider: providerName,
        error: authError.message
      });
    }

    // Auto or manual sync
    let syncResult;
    let selectedCourier;

    if (auto || !logistics) {
      // Auto mode: try couriers with fallback (Delhivery → Amazon → Xpressbees)
      const autoResult = await autoSelectCourierWithFallback(order, provider, transaction);
      if (autoResult.success) {
        syncResult = autoResult.result;
        selectedCourier = autoResult.courier;
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Failed to auto-select courier for order ${order.order_number}`,
          error: autoResult.error
        });
      }
    } else {
      // Manual mode: sync with specified courier
      syncResult = await this.enhancedSyncSingleOrder(order, transaction, provider, providerName, logistics, s_type);
      selectedCourier = logistics;
    }

    if (syncResult.success) {
      await transaction.commit();

      return res.json({
        success: true,
        message: `Order ${order.order_number} synced with ${selectedCourier} via ${providerName}`,
        data: {
          provider: providerName,
          logistics: selectedCourier,
          auto: auto || !logistics,
          order: {
            id: order.id,
            order_number: order.order_number,
            status: syncResult.status,
            provider: providerName,
            provider_order_id: syncResult.fship_order_id,
            waybill: syncResult.waybill,
            action: syncResult.action
          },
          label: syncResult.labelId ? {
            labelId: syncResult.labelId,
            pdfUrl: syncResult.labelUrl2,
            downloadUrl: syncResult.labelUrl2 ? `/api/orders/label/download/${syncResult.labelId}` : null
          } : null,
          result: syncResult
        }
      });
    } else {
      // Save the sync error to the order
      await order.update({
        fship_sync_status: 'failed',
        fship_sync_error: syncResult.error || 'Sync failed — unknown error',
      }, { transaction });

      await transaction.commit();

      return res.status(400).json({
        success: false,
        message: `Failed to sync order ${order.order_number} with ${selectedCourier}`,
        error: syncResult.error
      });
    }

  } catch (error) {
    logger.error('❌ SYNC WITH COURIER FAILED:', error);
    await transaction.rollback();

    return res.status(500).json({
      success: false,
      message: 'Failed to sync order with courier',
      error: error.message
    });
  }
};

/**
 * Generate label for selected orders
 * POST /api/orders/label/generate
 * Body: { orderIds: [1, 2, 3, ...] }
 */
module.exports.generateLabel = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one order ID'
      });
    }

    logger.debug(`=== GENERATE MANIFEST ===`, { orderIds });

    // Fetch orders
    const orders = await Order.findAll({
      where: { id: orderIds },
      include: [
        { model: OrderShipment, as: 'Shipment' },
        { model: ShippingAddress, as: 'ShippingAddress' }
      ]
    });

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found'
      });
    }

    // Filter only synced orders (have waybill)
    const syncedOrders = orders.filter(o => o.Shipment?.waybill || o.fship_waybill);

    if (syncedOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected orders have not been synced yet. Please sync them first.'
      });
    }

    // Get provider from first order
    const { service: provider, name: providerName } = await resolveProviderForOrder(orders[0]);

    // Get waybills
    const waybills = syncedOrders.map(o => o.Shipment?.waybill || o.fship_waybill).filter(Boolean);

    logger.debug(`Generating label for ${waybills.length} orders via ${providerName}`);

    // Call provider to generate label
    let labelResult = null;
    if (providerName === 'ithink' && typeof provider.getLabel === 'function') {
      labelResult = await provider.getLabel({ waybills });
    } else if (providerName === 'fship' && typeof provider.getManifest === 'function') {
      labelResult = await provider.getManifest({ waybills });
    } else {
      // If provider doesn't have label generation, create a simple label document
      labelResult = {
        success: true,
        labelId: `LABEL-${Date.now()}`,
        waybills: waybills,
        orderCount: waybills.length,
        generatedAt: new Date().toISOString(),
        pdfUrl: null,
        message: 'Label prepared. Use waybills to generate label from provider dashboard.'
      };
    }

    if (labelResult.success) {
      return res.json({
        success: true,
        message: `Label generated for ${waybills.length} orders`,
        data: {
          provider: providerName,
          labelId: labelResult.labelId,
          waybills: waybills,
          orderCount: waybills.length,
          pdfUrl: labelResult.pdfUrl,
          downloadUrl: labelResult.pdfUrl ? `/api/orders/label/download/${labelResult.labelId}` : null
        }
      });
    } else {
      throw new Error(labelResult.message || 'Failed to generate label');
    }

  } catch (error) {
    logger.error('❌ GENERATE LABEL FAILED:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate label',
      error: error.message
    });
  }
};

/**
 * Generate label for a single order
 * GET /api/orders/:id/label/generate
 */
module.exports.generateLabelForOrder = async (req, res) => {
  try {
    const { id } = req.params;

    logger.debug(`=== GENERATE LABEL FOR ORDER ${id} ===`);

    // Fetch the order with shipment info
    const order = await Order.findByPk(id, {
      include: [
        { model: OrderShipment, as: 'Shipment' }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order ${id} not found`
      });
    }

    // Check if order has a waybill (is synced)
    const waybill = order.Shipment?.waybill || order.fship_waybill;
    if (!waybill) {
      return res.status(400).json({
        success: false,
        message: `Order ${order.order_number} has not been synced yet. Please sync the order first.`
      });
    }

    // Get provider for this order
    const { service: provider, name: providerName } = await resolveProviderForOrder(order);

    logger.debug(`📄 Generating label for waybill: ${waybill} via ${providerName}`);

    // Call provider to generate label
    let labelResult = null;
    let labelUrl = null;
    let labelProviderError = null;

    if (providerName === 'ithink' && typeof provider.getLabel === 'function') {
      labelResult = await provider.getLabel({ waybills: [waybill] });
      if (labelResult.success) {
        labelUrl = labelResult.pdfUrl || labelResult.file_name;
        logger.debug(`✅ iThink label generated. URL: ${labelUrl}`);
      } else {
        labelProviderError = labelResult.error || labelResult.message || null;
        logger.warn(`⚠️ iThink label generation failed: ${labelProviderError}`);
      }
    } else if (providerName === 'fship') {
      // Try FShip label endpoint
      if (typeof provider.getShippingLabel === 'function') {
        const fshipLabelData = await provider.getShippingLabel(waybill);
        if (fshipLabelData) {
          if (Array.isArray(fshipLabelData.data) && fshipLabelData.data.length > 0) {
            labelUrl = fshipLabelData.data[0].labelurl || fshipLabelData.data[0].label_url || fshipLabelData.data[0].LabelUrl;
          } else if (fshipLabelData.data && typeof fshipLabelData.data === 'object') {
            labelUrl = fshipLabelData.data.labelurl || fshipLabelData.data.label_url || fshipLabelData.data.LabelUrl;
          } else {
            labelUrl = fshipLabelData.labelurl || fshipLabelData.label_url || fshipLabelData.LabelUrl;
          }
          logger.debug(`✅ FShip label found. URL: ${labelUrl}`);
        }
      }

      // If no label from getShippingLabel, construct FShip label URL
      if (!labelUrl && order.fship_order_id) {
        labelUrl = `https://manifest.fship.in/files/label_html/label_${waybill}_${order.fship_order_id}_TH.pdf`;
        logger.debug(`✅ FShip label URL constructed: ${labelUrl}`);
      }
    }

    // If we got a label URL but it's not saved, save it
    if (labelUrl && (!order.fship_label_url || order.fship_label_url !== labelUrl)) {
      await order.update({ fship_label_url: labelUrl });
      if (order.Shipment) {
        await order.Shipment.update({ label_url: labelUrl });
      }
      logger.debug(`💾 Label URL saved to database`);
    }

    if (labelUrl) {
      return res.json({
        success: true,
        message: `Label generated for order ${order.order_number}`,
        data: {
          provider: providerName,
          order_id: order.id,
          order_number: order.order_number,
          waybill: waybill,
          labelUrl: labelUrl,
          labelId: `LABEL-${order.id}-${Date.now()}`
        }
      });
    } else {
      logger.warn(`⚠️ Could not generate label for order ${order.order_number}: ${labelProviderError || 'no provider response'}`);
      return res.status(400).json({
        success: false,
        message: labelProviderError
          ? `Label generation failed for order ${order.order_number}: ${labelProviderError}`
          : `Could not generate label for order ${order.order_number}. Try syncing the order again or contact support.`,
        data: {
          order_number: order.order_number,
          waybill: waybill,
          provider: providerName,
          provider_error: labelProviderError,
        }
      });
    }

  } catch (error) {
    logger.error('❌ GENERATE LABEL FAILED:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate label',
      error: error.message
    });
  }
};

/**
 * Get order label PDF by labelId (redirects to orderId-based endpoint)
 * GET /api/orders/label/download/:labelId
 * Format: LABEL-{orderId}-{timestamp}
 */
module.exports.downloadOrderLabel = async (req, res) => {
  try {
    const { labelId } = req.params;

    logger.debug(`=== DOWNLOAD LABEL ===`, { labelId });

    // Extract orderId from labelId (format: LABEL-{orderId}-{timestamp})
    const match = labelId.match(/^LABEL-(\d+)-/);
    if (!match) {
      logger.warn(`Invalid labelId format: ${labelId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid label ID format. Expected format: LABEL-{orderId}-{timestamp}'
      });
    }

    const orderId = match[1];
    logger.debug(`Redirecting to orderId: ${orderId}`);

    // Forward to the correct endpoint
    req.params.orderId = orderId;

    // Import the orderLabelController to use its downloadLabel function
    const { downloadLabel } = require('./orderLabelController.js');
    return await downloadLabel(req, res);

  } catch (error) {
    logger.error('❌ DOWNLOAD LABEL FAILED:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download label',
      error: error.message
    });
  }
};

// ─── Provider-agnostic aliases ─────────────────────────────────────────────
// Despite the FShip-prefixed names, every function below already routes
// through services/shippingProviderFactory.js and dispatches to iThink
// (live) or FShip per the per-brand SHIPPING_PROVIDER setting. These
// aliases give callers a clean, provider-agnostic name to import. When
// you next touch one of the FShip-named functions, rename it AND update
// the alias to point at the new name — keep the legacy export for
// backwards compatibility.
module.exports.syncShipments              = module.exports.syncOrdersWithFShip;
module.exports.refreshShipmentStatuses    = module.exports.bulkRefreshFShipStatus;
module.exports.cancelShipments            = module.exports.cancelOrdersInFShip;
module.exports.handleShippingWebhook      = module.exports.handleFShipWebhook;
module.exports.syncSingleShipment         = module.exports.syncSingleOrderWithFShip;
module.exports.getShippingCouriers        = module.exports.getFShipCouriers;
module.exports.getShipmentTracking        = module.exports.getFShipTrackingForOrder;
module.exports.getShipmentLabel           = module.exports.getFShipLabelForOrder;
module.exports.validateOrderForShippingProvider = module.exports.validateOrderForFShip;
module.exports.createShipmentForOrder     = module.exports.createOrderInFShip;
module.exports.updateOrderStatusFromShippingProvider = module.exports.updateOrderStatusFromFShip;
module.exports.prepareShipmentPayload     = module.exports.prepareFShipOrderData;
