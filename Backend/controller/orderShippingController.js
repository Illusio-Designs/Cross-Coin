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

// ── Shipping sync retry policy ──────────────────────────────────────────────
// A transient failure (provider timeout / 5xx / auth blip) is worth retrying.
// A PERMANENT failure (bad address, non-serviceable pincode, no serviceable
// courier) will NEVER succeed on retry — retrying it just burns courier API
// calls + DB connections and, worse, re-fires the admin alert every cron cycle.
// So we detect permanent failures and "park" the order past the retry cap in a
// single attempt instead of grinding through 5 pointless retries forever.
const MAX_SYNC_ATTEMPTS = 5;      // transient failures retry up to this many times
const PARKED_ATTEMPTS = 999;      // sentinel: give up + admin already alerted, never retry/alert again

// Signatures of failures that cannot be fixed by retrying — they need a human
// (fix the address, or the customer's pincode simply isn't serviceable).
// NOTE: deliberately does NOT include the aggregate "no courier available / all
// couriers failed" message — that one is ambiguous (a transient provider outage
// produces it too). Whether an all-couriers-failed outcome is permanent is
// decided by autoSelectCourierWithFallback, which inspects each courier's own
// error and only flags permanent when EVERY attempt failed permanently.
const PERMANENT_FAILURE_PATTERNS = [
  /serviceab/i,                 // "not serviceable", "pincode serviceability failed"
  /not\s+deliverable/i,
  /pincode/i,                   // "pincode is missing", "pincode must be 6 digits", "invalid pincode"
  /is\s+missing/i,              // validation: address/name/city/state/phone missing
  /must\s+be\s+(a\s+valid|exactly)/i, // validation: phone/pincode format
  /no\s+items/i,
  /no\s+customer/i,
];
function isPermanentShippingFailure(message) {
  if (!message) return false;
  const text = String(message);
  return PERMANENT_FAILURE_PATTERNS.some((re) => re.test(text));
}
module.exports.isPermanentShippingFailure = isPermanentShippingFailure;

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
// Exposed so the integration queue worker can auto-select a courier off the
// request path (see services/integrationQueueWorkers.js → shipping:sync-order).
module.exports.autoSelectCourierWithFallback = autoSelectCourierWithFallback;

const truthyFlag = (v) => v === true || v === 1 || ['yes', '1', 'true', 'y'].includes(String(v).toLowerCase());

// ── Courier auto-selection: rate/check.json (couriers + live rates) ─────────
// iThink's rate/check.json returns every courier that serves warehouse → customer
// WITH per-courier cod/prepaid support, service type (Air/Surface) and the actual
// rate — e.g. Amazon ₹75, Ekart ₹80, Xpressbees ₹86. (It looked "empty" before
// only because the request was missing order_type/payment_method/product_mrp.)
// We keep the couriers that support the order's payment mode, sort by rate, and
// book the cheapest that succeeds. If none serve the route → a clean, permanent
// "not serviceable" failure (never a scary generic "sync failed").
async function autoSelectCourierWithFallback(order, provider, transaction = null) {
  const destPin = order.ShippingAddress?.pincode || '';
  const brandId = order.brand_id || 1;
  const isCOD = String(order.payment_type || '').toLowerCase() === 'cod';

  // 1. Ask iThink for the serviceable couriers + rates for this route. We prefer
  //    rate/check (it returns live rates so we can pick the cheapest). If that
  //    yields nothing, fall back to the domestic pincode serviceability check
  //    (no rates, but still lists the couriers) before giving up.
  const { extractIThinkCouriers } = require('../utils/serviceability.js');
  const whPin = await settingsHelper.getSetting(brandId, 'ITHINK_WAREHOUSE_PINCODE', '363641');
  const items = order.OrderItems || [];
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0) || 1;

  let couriers = [];
  let checkErr = null;
  try {
    if (typeof provider.getAvailableCouriers === 'function') {
      const raw = await provider.getAvailableCouriers({
        sourcePincode: whPin,
        destinationPincode: destPin,
        // iThink bills on a 0.5 kg minimum slab — never send below it or the
        // rate call can come back empty.
        weight: Math.max(0.5, totalQty * 0.1),
        length: 10, width: 10, height: 5 * totalQty,
        paymentMode: isCOD ? 'COD' : 'Prepaid',
        productMrp: parseFloat(order.final_amount) || 500,
      });
      couriers = extractIThinkCouriers(raw);
    }
  } catch (e) {
    checkErr = e.message;
    logger.warn(`[auto-courier] rate check failed for ${order.order_number}: ${e.message}`);
  }

  // Fallback: domestic pincode serviceability (still lists couriers, no rates).
  if (couriers.length === 0 && typeof provider.checkServiceability === 'function') {
    try {
      const raw2 = await provider.checkServiceability(whPin, destPin);
      couriers = extractIThinkCouriers(raw2);
      if (couriers.length) checkErr = null;
    } catch (e) {
      checkErr = checkErr || e.message;
      logger.warn(`[auto-courier] pincode check failed for ${order.order_number}: ${e.message}`);
    }
  }

  // 3. Keep only couriers that can carry THIS order's payment mode. A COD order
  //    MUST use a COD-capable courier (cod === 'Y'); a prepaid order a
  //    prepaid-capable one. When the flag is absent we keep the courier and let
  //    the booking be the final gate.
  const options = couriers
    .map((c) => {
      const modeOk = isCOD
        ? (c.cod === undefined || truthyFlag(c.cod))
        : (c.prepaid === undefined || truthyFlag(c.prepaid));
      if (!modeOk) return null;
      const rate = parseFloat(c.raw?.rate ?? c.raw?.freight_charges ?? c.raw?.total_charges ?? c.raw?.total_amount ?? 0) || 0;
      const st = String(c.s_type || 'surface');
      // Prefer economy/surface over premium/air on a rate tie.
      const economy = /econom|surface|ground|standard/i.test(st) ? 0 : 1;
      return {
        // order/add.json expects the courier NAME (e.g. "delhivery") + s_type.
        logistics: String(c.code).toLowerCase(),
        s_type: st.toLowerCase(),
        rate,
        name: c.code,
        economy,
      };
    })
    .filter(Boolean);

  // 4. Nothing usable. Distinguish two very different cases:
  //    (a) the serviceability CHECK itself errored (timeout, auth, provider
  //        outage) — do NOT brand the pincode permanently un-serviceable; this
  //        must stay retryable so a transient blip doesn't stick a scary label.
  //    (b) the check succeeded but returned no courier for this order — the
  //        pincode/payment-mode genuinely isn't serviceable (permanent).
  if (options.length === 0) {
    if (checkErr) {
      logger.warn(`[auto-courier] ${order.order_number}: serviceability check errored (${checkErr}) — retryable`);
      return { success: false, courier: null, error: `Couldn't check courier serviceability for ${destPin || 'this pincode'} right now (${checkErr}). Please Sync again.` };
    }
    const codNote = isCOD ? ' for Cash-on-Delivery' : '';
    const msg = `Delivery pincode ${destPin || 'N/A'} is not serviceable by any courier${codNote} — please verify the customer's address.`;
    logger.info(`[auto-courier] ${order.order_number}: not serviceable (${destPin})`);
    return { success: false, courier: null, permanent: true, notServiceable: true, error: msg };
  }

  // 5. Cheapest first (economy service breaks a rate tie). Book the first that
  //    succeeds.
  options.sort((a, b) => (a.rate - b.rate) || (a.economy - b.economy));
  logger.info(`[auto-courier] ${order.order_number}: ${options.length} serviceable courier(s) — trying cheapest first: ${options.map(o => `${o.name}/${o.s_type}@₹${o.rate}`).join(', ')}`);
  let lastError = null;
  for (const opt of options) {
    try {
      const r = await module.exports.enhancedSyncSingleOrder(order, transaction, provider, 'ithink', opt.logistics, opt.s_type);
      if (r.success) {
        logger.info(`✅ Auto-assigned cheapest courier ${opt.name}/${opt.s_type} (${opt.logistics}) @ ₹${opt.rate} for ${order.order_number}`);
        return { success: true, courier: opt.logistics, result: r };
      }
      lastError = r.error || lastError;
    } catch (e) { lastError = e.message || lastError; }
  }
  return { success: false, courier: null, error: lastError || `No available courier could book delivery to ${destPin}` };
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
      orderStatus = shippingProviderFactory.getProviderByName('ithink', 1).mapFShipStatusToCrossCoin(status);
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

// Courier list — retained as a stable endpoint for the dashboard. Couriers are
// now auto-selected per order from iThink's live rate/serviceability check
// (see autoSelectCourierWithFallback), so there is no static list to return.
module.exports.getFShipCouriers = async (req, res) => {
  res.json({ couriers: [] });
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
        fship_sync_attempts: { [Op.lt]: MAX_SYNC_ATTEMPTS }
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
          const permanent = isPermanentShippingFailure(syncResult.error);
          await order.update({
            fship_sync_status: 'failed',
            fship_sync_error: syncResult.error || null,
            // Permanent failures can't succeed on retry — jump straight to the
            // attempt cap so the next cron cycle skips this order instead of
            // re-calling the courier API for a pincode that isn't serviceable.
            ...(permanent && { fship_sync_attempts: MAX_SYNC_ATTEMPTS }),
          }, { transaction: orderTransaction });
          results.errors++;
          results.errors_list.push({
            order_number: order.order_number,
            error: syncResult.error,
            permanent,
          });
        }

        await orderTransaction.commit();
      } catch (error) {
        await orderTransaction.rollback();
        logger.error(`❌ Error processing order ${order.order_number}:`, error.message);
        const permanent = isPermanentShippingFailure(error.message);
        await order.update({
          fship_sync_status: 'failed',
          fship_sync_error: error.message || null,
          ...(permanent && { fship_sync_attempts: MAX_SYNC_ATTEMPTS }),
        }).catch(() => {});
        results.errors++;
        results.errors_list.push({
          order_number: order.order_number,
          error: error.message,
          permanent,
        });
      }
    }

    // Warn about orders that JUST exhausted all sync attempts — exactly once.
    // Previously this alerted on every cron cycle for the same stuck orders,
    // producing an endless every-2-hours alert loop. We now alert only for
    // orders in the [MAX_SYNC_ATTEMPTS, PARKED_ATTEMPTS) window, then bump them
    // to the PARKED sentinel so they are never retried nor re-alerted again.
    const exhaustedOrders = await Order.findAll({
      where: {
        fship_sync_status: 'failed',
        fship_sync_attempts: { [Op.gte]: MAX_SYNC_ATTEMPTS, [Op.lt]: PARKED_ATTEMPTS },
        status: { [Op.notIn]: ['cancelled', 'delivered', 'rto delivered'] }
      },
      attributes: ['id', 'order_number', 'fship_sync_attempts', 'fship_sync_error']
    });
    if (exhaustedOrders.length > 0) {
      logger.warn(`⚠️ ADMIN ALERT: ${exhaustedOrders.length} order(s) need manual shipping attention (giving up auto-sync): ` +
        exhaustedOrders.map(o => `${o.order_number}${o.fship_sync_error ? ` (${o.fship_sync_error})` : ''}`).join(', ')
      );
      // Park them so this alert fires once per order, not every cron run.
      await Order.update(
        { fship_sync_attempts: PARKED_ATTEMPTS },
        { where: { id: { [Op.in]: exhaustedOrders.map(o => o.id) } } }
      ).catch((e) => logger.warn(`Failed to park exhausted orders: ${e.message}`));
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
      // STEP 2: Order not synced — create at the active provider.

      // iThink requires an explicit courier. If the caller didn't pick one,
      // auto-select the best available (delhivery → amazon → xpressbees) so the
      // Sync button and bulk sync book directly with no manual pick — restoring
      // the previous auto-courier behaviour. The recursive calls pass an explicit
      // courier, so there is no loop; FShip picks internally so it's unaffected.
      if (providerName === 'ithink' && !selectedLogistics) {
        logger.debug(`🔄 Order ${order.order_number}: no courier given — auto-selecting for iThink.`);
        const auto = await module.exports.autoSelectCourierWithFallback(order, provider, localTransaction);
        if (shouldCommit) {
          if (auto.success) await localTransaction.commit();
          else await localTransaction.rollback();
        }
        return auto.success
          ? { success: true, action: 'synced', provider: providerName, courier: auto.courier, ...(auto.result || {}) }
          : { success: false, error: auto.error || 'No serviceable courier could book this order.', notServiceable: auto.notServiceable, permanent: auto.permanent };
      }

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
    // Fold in the iThink booking diagnostics captured on THIS same request
    // (provider._lastBookingRaw) so the resolved pickup id, detected field
    // issues, and iThink's raw reply show up directly in the Sync-Failed
    // tooltip / courier modal — no separate URL, survives cPanel recycling.
    let diag = '';
    try {
      const raw = provider && provider._lastBookingRaw;
      // Only attach the raw technical diagnostic for genuinely unexplained errors.
      // Clear messages (e.g. "pincode not serviceable") stay clean for the admin.
      const generic = /did not return a waybill|some error occured|unknown error|network error|no response/i.test(error.message || '');
      if (raw && generic) {
        const parts = [];
        if (raw.resolved_pickup_address_id !== undefined) parts.push(`pickup_id=${raw.resolved_pickup_address_id || 'EMPTY'}`);
        // Data-level fields — a top-level "Some error occured" (no per-shipment
        // data) usually means iThink rejected one of these, not a shipment field.
        const rq = raw.request || {};
        parts.push(`logistics='${rq.logistics ?? ''}' s_type='${rq.s_type ?? ''}' order_type='${rq.order_type ?? ''}'`);
        if (Array.isArray(raw.field_issues) && raw.field_issues.length) parts.push(`issues: ${raw.field_issues.join('; ')}`);
        if (raw.response) parts.push(`iThink: ${JSON.stringify(raw.response).slice(0, 200)}`);
        if (raw.error) parts.push(`transport: ${raw.error}`);
        if (parts.length) diag = ` — [${parts.join(' | ')}]`;
      }
    } catch (_) { /* diagnostics must never mask the real error */ }
    return {
      success: false,
      error: `${error.message}${diag}`
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
    const dims = shippingProviderFactory.getProviderByName('ithink', 1).calculateShipmentDimensions(order.OrderItems);

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

    // STEP 4: Process each order with its own transaction, in bounded batches.
    // Each order opens a transaction + several sub-queries + a courier API call,
    // so a batch can hold up to BATCH_SIZE DB connections at once. Keep this a
    // few UNDER the DB pool (DB_POOL_MAX, default 10) so a batch can never drain
    // the whole pool — otherwise, on a slow/loaded DB, orders time out waiting
    // for a connection ("Operation timeout"). Env-tunable: raise it once the DB
    // is healthy (disk freed) for faster refreshes.
    const BATCH_SIZE = Math.max(1, parseInt(process.env.SHIPPING_REFRESH_BATCH, 10) || 5);
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
  try {
    const { id } = req.params;
    let { logistics, s_type, auto } = req.body;
    s_type = s_type || 'surface';

    logger.debug(`=== SYNC WITH COURIER (queued): Order ${id}, Logistics: ${logistics}, Auto: ${auto} ===`);

    // Lightweight, connection-safe pre-checks — plain reads, NO long-lived
    // transaction and NO external courier call on the request path. The slow
    // provider round-trip is handed to the integration queue so this endpoint
    // returns immediately and never pins a DB connection (which is what used
    // to exhaust `max_user_connections` and surface as "Network Error" on the
    // dashboard).
    const order = await Order.findByPk(id, {
      include: [{ model: ShippingAddress, as: 'ShippingAddress' }],
    });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'cancelled') {
      return res.json({
        success: true,
        message: `Order ${order.order_number} is cancelled. No sync needed.`,
        data: { order: { id: order.id, order_number: order.order_number, status: order.status, action: 'skipped' } },
      });
    }

    // Validate (reads only) before queueing so operators get instant feedback
    // on bad addresses instead of a silent queued failure.
    const { validateOrderForShipping } = require('../services/shippingValidationService');
    const validation = await validateOrderForShipping(id);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Order has validation errors',
        errors: validation.errors,
      });
    }

    // Hand off to the integration queue (Bull on Redis). Bounded worker
    // concurrency caps how many syncs hold a DB connection at once. If Redis
    // is down, enqueue() runs the job inline AFTER this response is sent, so
    // the request still never holds a connection during the provider call.
    const { enqueue } = require('../services/integrationQueue.js');
    await enqueue('shipping:sync-order', {
      orderId: order.id,
      logistics: (auto ? null : logistics) || null,
      serviceType: s_type,
      auto: !!auto || !logistics,
    });

    // NOTE: we deliberately do NOT pre-set fship_sync_status to 'syncing' here.
    // enhancedSyncSingleOrder treats 'syncing' as "already in flight" and would
    // skip the job we just queued. The worker owns the sync state machine.

    return res.status(202).json({
      success: true,
      queued: true,
      message: `Sync queued for order ${order.order_number}. Refresh status in a moment.`,
      data: {
        auto: !!auto || !logistics,
        logistics: (auto ? null : logistics) || null,
        order: { id: order.id, order_number: order.order_number, status: order.status, action: 'queued' },
      },
    });
  } catch (error) {
    logger.error('❌ SYNC WITH COURIER (queue) FAILED:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to queue order sync',
      error: error.message,
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

/**
 * Bulk re-queue stuck / failed shipping syncs.
 * POST /api/orders/shipping/requeue-failed   Body: { limit?: number }
 *
 * Finds orders whose sync failed or exhausted attempts (and that aren't
 * cancelled or already synced) and pushes each onto the integration queue so
 * they retry through the active provider (iThink). Returns immediately — the
 * actual provider calls happen in the bounded worker, never on this request.
 */
module.exports.requeueFailedShipments = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.body?.limit, 10) || 200, 500);
    const orders = await Order.findAll({
      where: {
        status: { [Op.notIn]: ['cancelled', 'delivered', 'returned'] },
        fship_waybill: { [Op.is]: null },
        [Op.or]: [
          { fship_sync_status: 'failed' },
          { fship_sync_attempts: { [Op.gte]: 5 } },
        ],
      },
      attributes: ['id', 'order_number'],
      limit,
      order: [['createdAt', 'ASC']],
    });

    const { enqueue } = require('../services/integrationQueue.js');
    let queued = 0;
    for (const o of orders) {
      await enqueue('shipping:sync-order', { orderId: o.id, auto: true, serviceType: 'surface' });
      queued += 1;
    }

    logger.info(`[requeue-failed] queued ${queued} stuck order(s) for re-sync`);
    return res.status(202).json({
      success: true,
      queued,
      message: `Re-queued ${queued} stuck order(s) for sync. Refresh status in a few minutes.`,
      order_numbers: orders.map((o) => o.order_number),
    });
  } catch (error) {
    logger.error('requeueFailedShipments error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to re-queue orders', error: error.message });
  }
};
