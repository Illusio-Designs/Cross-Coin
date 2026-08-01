  /**
   * ┌────────────────────────────────────────────────────────────────┐
   * │ DOMAIN MAP — this file is being split incrementally.           │
   * │                                                                │
   * │ Functions here are grouped by domain in controller/orders/:    │
   * │   create.*    : createOrder, createGuestOrder,                 │
   * │                 adminCreateManualOrder, checkAddressQuality    │
   * │   tracking.*  : trackOrderByAWB, trackOrderByOrderNumber,      │
   * │                 getOrder, getUserOrders                        │
   * │   lifecycle.* : confirmOrder, updateOrderStatus, cancelOrder,  │
   * │                 adminCancelOrder, initiateReturn,              │
   * │                 updateAwbNumber                                │
   * │   admin.*     : getAllOrders, getOrderStats                    │
   * │                                                                │
   * │ Route files can import from controller/orders/<domain> today;  │
   * │ they'll get the right function. When you touch one, MOVE it    │
   * │ out of this file and point the shim at the new home.           │
   * └────────────────────────────────────────────────────────────────┘
   */

  const { Order } = require("../model/orderModel.js");
  const { OrderItem } = require("../model/orderItemModel.js");
  const { OrderStatusHistory } = require("../model/orderStatusHistoryModel.js");
  const { Product } = require("../model/productModel.js");
  const { ProductVariation } = require("../model/productVariationModel.js");
  const { ShippingAddress } = require("../model/shippingAddressModel.js");
  const { ShippingFee } = require("../model/shippingFeeModel.js");
  const { Payment } = require("../model/paymentModel.js");
  const { User } = require("../model/userModel.js");
  const { GuestUser } = require("../model/guestUserModel.js");
  const { ProductImage } = require("../model/productImageModel.js");
  const Brand = require("../model/brandModel.js");
  const FShipLabelDownload = require("../model/fshipLabelDownloadModel.js");
  const UTMTracking = require("../model/utmModel.js");
  const { Op, Transaction } = require("sequelize");
  const XLSX = require("xlsx");
  const { OrderShipment } = require("../model/orderShipmentModel.js");
  const { sequelize } = require("../config/db.js");
  const axios = require('axios');
  const { logger } = require("../config/logging.js");
  // Import FShip service for shipping integration
  const fshipService = require("../services/fshipService.js");
  const { generateOrderNumber, generateUniqueOrderNumber } = require("../services/orderCreationService.js");
  const { setImmediate } = require("timers");
  const { sendFacebookEvent } = require("../integration/facebookPixel.js");
  const { sendGAEvent } = require("../integration/googleAnalytics.js");
  const settingsHelper = require("../services/settingsHelper");
  const { calculateAddressQuality, getAddressHash } = require("../services/addressQualityService.js");
  const { AddressQualityScore } = require("../model/addressQualityScoreModel.js");

  // ── Dual-write helper: sync shipment data to order_shipments table ──────
  async function upsertShipment(orderId, data, transaction = null) {
    try {
      const opts = transaction ? { transaction } : {};
      const existing = await OrderShipment.findOne({ where: { order_id: orderId }, ...opts });
      const payload = {
        order_id: orderId,
        provider: data.provider || 'fship',
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
  // Import batch fetch utilities for performance optimization
  const { batchFetchProducts, batchFetchVariations, batchFetchVariationsByProductIds } = require("../utils/batchFetch.js");
  // Import batch insert utility for efficient bulk operations
  const { batchInsert } = require("../utils/batchInsert.js");
  // Import dashboard cache invalidation
  const { invalidateDashboardCache } = require("../services/dashboardService.js");
  const loyaltyService = require("../services/loyaltyService.js");

  // ─── Validation helpers ───────────────────────────────────────────────────
  const PHONE_REGEX = /^[6-9]\d{9}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DISPATCHED_STATUSES = [
    'booked', 'pickup initiated', 'manifested', 'in transit',
    'shipped', 'out for delivery', 'delivered', 'return_initiated', 'returned_rto'
  ];

  /**
   * Compute server-side discount for a coupon against a subtotal.
   * Returns the discount amount in rupees.
   */
  async function computeCouponDiscount(couponId, subTotal, items = []) {
    if (!couponId) return 0;
    const { Coupon } = require('../model/associations.js');
    const coupon = await Coupon.findOne({
      where: {
        id: couponId,
        status: 'active',
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() },
      },
    });
    if (!coupon) return 0;
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return 0;
    if (coupon.minPurchase && subTotal < parseFloat(coupon.minPurchase)) return 0;

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (subTotal * parseFloat(coupon.value)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
    } else if (coupon.type === 'fixed') {
      discount = parseFloat(coupon.value);
    } else if (coupon.type === 'tiered') {
      let tiers = coupon.tieredDiscounts;
      if (typeof tiers === 'string') { try { tiers = JSON.parse(tiers); } catch { tiers = []; } }
      if (!Array.isArray(tiers)) tiers = [];
      const tier = tiers.sort((a, b) => b.minAmount - a.minAmount).find(t => subTotal >= t.minAmount);
      if (tier) discount = parseFloat(tier.discount);
    } else if (coupon.type === 'quantity_based') {
      const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
      let tiers = coupon.quantityBasedDiscounts;
      if (typeof tiers === 'string') { try { tiers = JSON.parse(tiers); } catch { tiers = []; } }
      if (!Array.isArray(tiers)) tiers = [];
      const tier = tiers.sort((a, b) => b.minQuantity - a.minQuantity).find(t => totalQty >= t.minQuantity);
      if (tier) discount = parseFloat(tier.discount);
    }
    return Math.min(discount, subTotal);
  }

  /**
   * Get count of RTO orders for a phone number in the last 6 months.
   */
  async function getRtoCount(phone, userId) {
    if (!userId) return 0;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return Order.count({
      where: {
        user_id: userId,
        status: 'returned_rto',
        createdAt: { [Op.gte]: sixMonthsAgo },
      },
    });
  }

  // Calculate shipping fee based on payment type
  const calculateShippingFee = async (paymentType) => {
    const orderType = paymentType === "cod" ? "cod" : "prepaid";
    try {
      const shippingFee = await ShippingFee.findOne({ where: { orderType } });
      return shippingFee ? Number(shippingFee.fee) : orderType === "cod" ? 5.99 : 0.0;
    } catch (error) {
      logger.error("Error calculating shipping fee:", error);
      return orderType === "cod" ? 5.99 : 0.0;
    }
  };

  // Helper function to calculate shipment dimensions - FIXED VALUES
  const calculateShipmentDimensions = (orderItems) => {
    // FIXED DIMENSIONS FOR ALL ORDERS
    // As per business requirement: 14cm x 3cm x 10cm, 70g per item

    let totalQuantity = 0;

    // Calculate total quantity of all items
    orderItems.forEach(item => {
      totalQuantity += item.quantity;
    });

    // Fixed dimensions per item (in cm)
    const FIXED_LENGTH = 14;
    const FIXED_WIDTH = 3;
    const FIXED_HEIGHT = 10;
    const FIXED_WEIGHT_PER_ITEM = 0.07; // 70g = 0.07kg

    // For multiple items, we stack them (increase height)
    const finalWeight = FIXED_WEIGHT_PER_ITEM * totalQuantity;
    const finalLength = FIXED_LENGTH;
    const finalWidth = FIXED_WIDTH;
    const finalHeight = FIXED_HEIGHT * totalQuantity; // Stack items vertically

    logger.debug(`📦 Calculated FIXED dimensions for ${totalQuantity} items:`);
    logger.debug(`   Weight: ${finalWeight}kg (${finalWeight * 1000}g)`);
    logger.debug(`   Dimensions: ${finalLength}cm × ${finalWidth}cm × ${finalHeight}cm`);

    return {
      weight: finalWeight,
      length: finalLength,
      width: finalWidth,
      height: finalHeight
    };
  };

  // checkAddressQuality has been MIGRATED to controller/orders/createController.js.
  // The export is re-shimmed at the bottom of this file for backwards
  // compatibility — any existing `require('./orderController').checkAddressQuality`
  // still works.

  // Create a new order
  module.exports.createOrder = async (req, res) => {
    logger.debug("createOrder: Starting order creation...");
    let transaction = null;

    try {
      // Start transaction with READ_COMMITTED isolation level
      transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
      });
      logger.debug("✅ Transaction started for order creation");

      const {
        shipping_address_id,
        items,
        payment_type,
        notes,
        coupon_id,
        discount_amount,
      } = req.body;
      const userId = req.user.id;
      logger.debug("createOrder: Request data:", {
        shipping_address_id,
        items,
        payment_type,
        notes,
        coupon_id,
        discount_amount,
      });
      logger.debug("createOrder: User ID:", userId);

      if (!shipping_address_id || !items || !payment_type) {
        await transaction.rollback();
        logger.debug("❌ Validation failed: Missing required fields");
        return res.status(400).json({
          message: "Shipping address, items, and payment type are required",
        });
      }

      logger.debug("createOrder: Validating shipping address...");
      // Validate shipping address belongs to user
      const shippingAddress = await ShippingAddress.findOne({
        where: { id: shipping_address_id, user_id: userId },
        transaction
      });

      if (!shippingAddress) {
        await transaction.rollback();
        logger.debug("❌ Validation failed: Shipping address not found");
        return res.status(404).json({ message: "Shipping address not found" });
      }
      logger.debug("createOrder: Shipping address validated");

      // ── Comprehensive shipping address validation ─────────────────────────
      const { validateShippingAddress } = require('../services/shippingValidationService');
      const addrValidation = validateShippingAddress({
        full_name: shippingAddress.full_name,
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        phone: shippingAddress.phone,
      });

      if (!addrValidation.valid) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Shipping address has issues that will cause delivery failure',
          errors: addrValidation.errors,
          warnings: addrValidation.warnings,
        });
      }

      // Validate pincode serviceability before proceeding
      if (shippingAddress.pincode) {
        try {
          const warehousePincode = await settingsHelper.getSetting(1, 'FSHIP_WAREHOUSE_PINCODE', '395006');
          const serviceability = await fshipService.checkServiceability(warehousePincode, shippingAddress.pincode.trim());
          if (!serviceability || (Array.isArray(serviceability) && serviceability.length === 0)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Sorry, delivery is not available for this pincode. Please use a different address.' });
          }
        } catch (svcErr) {
          logger.warn('Pincode serviceability check failed (allowing order):', svcErr.message);
          // Allow order to proceed if serviceability API is down — FShip sync will catch it later
        }
      }

      // ── Idempotency key dedup — DB-based (survives Redis downtime) ────────
      const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotency_key;
      if (idempotencyKey) {
        const existingOrder = await Order.findOne({
          where: { idempotency_key: idempotencyKey },
          transaction,
        });
        if (existingOrder) {
          await transaction.rollback();
          return res.status(200).json({ message: "Order already created", order: existingOrder });
        }
      }

      // Calculate total amount and validate items
      let totalAmount = 0;
      const validatedItems = [];

      logger.debug(
        "createOrder: Starting item validation for",
        items.length,
        "items"
      );

      // BATCH FETCH: Extract all product and variation IDs upfront
      const productIds = items.map((item) => item.product_id);
      const variationIds = items
        .filter((item) => item.variation_id)
        .map((item) => item.variation_id);

      // Fetch all products and variations in parallel (2 queries instead of N+1)
      logger.debug("createOrder: Batch fetching", productIds.length, "products and", variationIds.length, "variations...");
      const [productMap, variationMap, variationsByProductMap] = await Promise.all([
        batchFetchProducts(productIds),
        batchFetchVariations(variationIds),
        batchFetchVariationsByProductIds(productIds),
      ]);
      logger.debug("✅ createOrder: Batch fetch complete - reduced N+1 queries");

      // Validate items using pre-fetched data
      for (const item of items) {
        const { product_id, quantity } = item;
        let { variation_id } = item;

        if (!product_id || !quantity) {
          await transaction.rollback();
          return res.status(400).json({
            message: "Product ID and quantity are required for each item",
          });
        }

        // Task 4: qty >= 1 guard
        if (quantity < 1) {
          await transaction.rollback();
          return res.status(400).json({ message: "Quantity must be at least 1 for each item." });
        }

        // Get product from map (O(1) lookup instead of database query)
        const product = productMap.get(product_id);
        if (!product) {
          await transaction.rollback();
          return res
            .status(404)
            .json({ message: `Product with ID ${product_id} not found` });
        }
        logger.debug("createOrder: Product validated:", product.name);

        let price;
        let stockAvailable;
        let variation;

        if (variation_id) {
          // Get variation from map (O(1) lookup instead of database query)
          variation = variationMap.get(variation_id);
          if (!variation || variation.productId !== product_id) {
            await transaction.rollback();
            return res
              .status(404)
              .json({ message: `Invalid variation for product ${product_id}` });
          }
          price = variation.price;
          stockAvailable = variation.stock;
          logger.debug(
            "createOrder: Variation validated, price:",
            price,
            "stock:",
            stockAvailable
          );
        } else {
          // Get variations for this product from map (already fetched in batch)
          const variations = variationsByProductMap.get(product_id) || [];
          if (variations.length > 0) {
            // Default to the first variation
            variation = variations[0];
            variation_id = variation.id;
            price = variation.price;
            stockAvailable = variation.stock;
          } else {
            // No variations exist
            await transaction.rollback();
            return res.status(400).json({
              message: `Product ${product_id} has no variations defined. Please contact support.`,
            });
          }

          if (!price || price <= 0) {
            await transaction.rollback();
            return res
              .status(400)
              .json({ message: `No price found for product ${product_id}` });
          }
        }

        // STOCK CHECK — account for Redis reservations (prepaid checkouts in progress)
        const stockReservationService = require('../services/stockReservationService.js');
        const reservedQty = await stockReservationService.getReservedQty(variation_id);
        const effectiveStock = (typeof stockAvailable === 'number' ? stockAvailable : 0) - reservedQty;
        logger.debug(
          "createOrder: Stock check - dbStock:",
          stockAvailable,
          "reserved:",
          reservedQty,
          "effective:",
          effectiveStock,
          "requested:",
          quantity
        );
        if (effectiveStock < quantity) {
          await transaction.rollback();
          return res.status(400).json({
            message: `Product is out of stock or insufficient quantity for product ${product_id}`,
          });
        }
        logger.debug("createOrder: Stock check passed");

        // Apply discount if exists (simplified version)
        let discount = 0;
        // You would add discount calculation logic here

        const subtotal = price * quantity - discount;
        totalAmount += subtotal;

        validatedItems.push({
          product_id,
          variation_id: variation_id || null,
          quantity,
          price,
          discount,
          subtotal,
          _variation: variation, // Pass the variation instance for later stock decrement
        });
      }

      const subTotal = Number(totalAmount);
      const appliedDiscount = discount_amount ? Number(discount_amount) : 0;
      const shippingFee = Number(await calculateShippingFee(payment_type));
      const finalAmount = subTotal - appliedDiscount + shippingFee;
      logger.debug("subTotal:", subTotal);
      logger.debug("appliedDiscount:", appliedDiscount);
      logger.debug("shippingFee:", shippingFee);
      logger.debug("finalAmount:", finalAmount);

      // ── Task 5: Server-side discount verification ─────────────────────────
      // Allow prepaid instant discount without coupon (configured via env)
      const PREPAID_DISCOUNT = payment_type !== 'cod'
        ? parseFloat(await settingsHelper.getSetting(req.brand?.id || 1, 'PREPAID_INSTANT_DISCOUNT', '50'))
        : 0;

      if (appliedDiscount > 0 && !coupon_id && appliedDiscount > PREPAID_DISCOUNT + 1) {
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid discount amount." });
      }
      if (coupon_id) {
        const serverDiscount = await computeCouponDiscount(coupon_id, subTotal, validatedItems);
        const expectedTotal = serverDiscount + PREPAID_DISCOUNT;
        if (Math.abs(appliedDiscount - expectedTotal) > 1) {
          await transaction.rollback();
          return res.status(400).json({ message: "Order total mismatch. Please refresh and try again." });
        }
      }

      // ── Task 6: RTO risk scoring for ALL payment types ────────────────────
      let rtoRiskScore = 0;
      const rtoCount = await getRtoCount(shippingAddress.phone, userId);
      if (rtoCount >= 1) rtoRiskScore += 20;
      if (String(shippingAddress.address || '').trim().length < 30) rtoRiskScore += 10;

      // ── Address quality scoring (separate from per-user RTO history) ─────
      // Reads / writes address_quality_scores table via the existing
      // service in services/addressQualityService.js. Score is a 0-100
      // signal driven by pincode validity, phone validity, completeness
      // and historical delivery success at this exact address.
      let addressQuality = null;
      try {
        addressQuality = await calculateAddressQuality({
          line1: shippingAddress.address,
          line2: shippingAddress.landmark || '',
          landmark: shippingAddress.landmark || '',
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          phone: shippingAddress.phone,
        });

        // Prefer the hash already persisted on shipping_addresses (computed
        // by the model's beforeSave hook). Falls back to on-the-fly hash if
        // the row predates the migration and the backfill hasn't run.
        const hash = shippingAddress.address_hash || getAddressHash({
          line1: shippingAddress.address,
          line2: shippingAddress.landmark || '',
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
        });

        // Upsert the freshly-computed score so future address-quality
        // lookups (and the delivery_success/failure counters updated
        // downstream in orderShippingController) have a row to work on.
        await AddressQualityScore.upsert({
          address_hash: hash,
          pincode: shippingAddress.pincode,
          quality_score: addressQuality.score,
        }, { transaction });
      } catch (qErr) {
        // Quality scoring is advisory — never block the order on a DB hiccup.
        logger.warn(`Address quality calc skipped for order: ${qErr.message}`);
      }

      if (payment_type === 'cod') {
        const codMax = parseFloat(await settingsHelper.getSetting(req.brand?.id || 1, 'COD_MAX_ORDER_VALUE', '1500'));
        if (finalAmount > codMax) {
          await transaction.rollback();
          return res.status(400).json({ message: `COD is not available for orders above ₹${codMax}. Please pay online.` });
        }
        if (rtoCount >= 2) {
          await transaction.rollback();
          return res.status(400).json({ message: "COD is not available for your account. Please pay online." });
        }
        // New: block COD when the calculated address quality score is below
        // the configured threshold (default 60 — matches the recommendation
        // tiers documented in addressQualityService). Admins can soften this
        // by setting COD_MIN_ADDRESS_QUALITY=0 in brand_settings while
        // tuning the heuristic.
        if (addressQuality) {
          const minQuality = parseInt(
            await settingsHelper.getSetting(req.brand?.id || 1, 'COD_MIN_ADDRESS_QUALITY', '60'),
            10,
          );
          if (Number.isFinite(minQuality) && addressQuality.score < minQuality) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `COD isn't available for this address (quality score ${addressQuality.score}/100). Please choose prepaid.`,
              addressQuality,
            });
          }
        }
      }
      // Handle UTM tracking
      const UTMTracking = require("../model/utmModel.js");
      let utmTrackingId = null;

      logger.debug('🍪 createOrder - Cookies received:', req.cookies);
      logger.debug('📦 createOrder - Request body utm_session_id:', req.body.utm_session_id);

      // Try to get session_id from request body first, then cookies
      const sessionId = req.body.utm_session_id || req.cookies?.session_id;
      logger.debug('🔑 createOrder - Session ID (body or cookie):', sessionId);

      if (sessionId) {
        try {
          logger.debug('🔍 createOrder - Looking for UTM record with session_id:', sessionId);

          const utmRecord = await UTMTracking.findOne({
            where: { session_id: sessionId },
            order: [['created_at', 'DESC']]
          });

          if (utmRecord) {
            utmTrackingId = utmRecord.id;
            logger.debug("✅ createOrder: Associated with UTM tracking ID:", utmTrackingId);
            logger.debug("📊 createOrder: UTM Campaign:", utmRecord.utm_campaign);
          } else {
            logger.debug("❌ createOrder: No UTM record found for session_id:", sessionId);
          }
        } catch (utmError) {
          logger.error("❌ createOrder: Error fetching UTM data:", utmError);
          // Continue with order creation even if UTM fails
        }
      } else {
        logger.debug("⚠️ createOrder: No session_id provided in body or cookies");
      }

      // Create order
      const order = await Order.create(
        {
          order_number: await generateUniqueOrderNumber(transaction, req.brand ? req.brand.id : 1),
          user_id: userId,
          shipping_address_id: shipping_address_id,
          total_amount: subTotal,
          discount_amount: appliedDiscount,
          coupon_id: coupon_id || null,
          shipping_fee: shippingFee,
          final_amount: finalAmount,
          payment_type,
          payment_status: "pending",
          status: "awaiting_confirmation",
          notes: notes || null,
          utm_tracking_id: utmTrackingId,
          brand_id: req.brand ? req.brand.id : 1,
          rto_risk_score: rtoRiskScore,
          idempotency_key: idempotencyKey || null,
        },
        { transaction }
      );
      logger.debug("createOrder: Order created with ID:", order.id);

      // Audit trail: record the order creation event with the inputs
      // that drove eligibility decisions (RTO score, address quality,
      // payment type). The auditLog helper lives in services/orderService.js.
      try {
        const { auditLog } = require('../services/orderService.js');
        await auditLog(order.id, 'create', userId || null, userId ? 'user' : 'guest', {
          payment_type,
          final_amount: finalAmount,
          rto_risk_score: rtoRiskScore,
          address_quality_score: addressQuality?.score ?? null,
          item_count: validatedItems.length,
          coupon_id: coupon_id || null,
          utm_tracking_id: utmTrackingId,
        }, transaction);
      } catch (auditErr) {
        logger.warn(`Audit log skipped for new order ${order.order_number}: ${auditErr.message}`);
      }

      // BATCH INSERT: Create all order items in a single bulk operation
      logger.debug("createOrder: Batch inserting", validatedItems.length, "order items...");
      const orderItemsData = validatedItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        subtotal: item.subtotal,
      }));

      await batchInsert(OrderItem, orderItemsData, { transaction });
      logger.debug("✅ createOrder: Batch insert complete - reduced N individual inserts to 1 query");

      // DECREMENT STOCK for all items
      logger.debug("createOrder: Decrementing stock for", validatedItems.length, "items...");
      for (const item of validatedItems) {
        if (item._variation) {
          item._variation.stock -= item.quantity;
          await item._variation.save({ transaction });
        } else {
          // This shouldn't happen in this system as all products should have variations
          // Log error but don't fail the order
          logger.error(`Warning: Order item ${item.product_id} has no variation for stock management`);
        }
      }
      logger.debug("✅ createOrder: Stock decremented for all items");

      // Create initial status history
      await OrderStatusHistory.create(
        {
          order_id: order.id,
          status: "pending",
          updated_by: userId,
        },
        { transaction }
      );

      // If payment type is not COD, create a payment record
      if (payment_type !== "cod") {
        await Payment.create(
          {
            order_id: order.id,
            user_id: userId,
            payment_type,
            amount_paid: finalAmount,
            status: "pending",
            brand_id: req.brand ? req.brand.id : 1, // ✅ Store brand context in payment record
          },
          { transaction }
        );
      }

      logger.debug("createOrder: Committing transaction...");

      // Record coupon usage atomically
      if (coupon_id && appliedDiscount > 0) {
        const { Coupon, CouponUsage } = require('../model/associations.js');
        const coupon = await Coupon.findByPk(coupon_id, { transaction });
        if (coupon) {
          await CouponUsage.create({
            couponId: coupon_id,
            userId: userId,
            guestUserId: null,
            orderId: order.id,
            discountAmount: appliedDiscount
          }, { transaction });
          await coupon.increment('usageCount', { by: 1, transaction });
        }
      }

      await transaction.commit();
      logger.debug("createOrder: Transaction committed successfully");

      // COD orders stay at awaiting_confirmation — admin reviews RTO score and confirms manually
      // Prepaid orders get confirmed automatically after payment verification in paymentController

      // Idempotency is now DB-based (idempotency_key column on orders table)

      // Enqueue badge recalculation for async processing (non-blocking)
      logger.debug("createOrder: Enqueueing badge recalculation for products in order...");
      try {
        const BadgeService = require("../services/badgeService");
        // Enqueue job - returns immediately without blocking
        await BadgeService.enqueueBadgeRecalculation(userId);
        logger.debug(`✅ Badge recalculation job enqueued for user ${userId}`);
      } catch (badgeError) {
        logger.error("⚠️ Warning: Error enqueueing badge recalculation:", badgeError.message);
        // Don't fail the order creation if badge queue fails
      }

      // Fetch the created order with its items
      logger.debug("createOrder: Fetching created order with details...");
      const createdOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: OrderItem,
            as: 'OrderItems', // ✅ Use the alias defined in associations
            include: [
              { model: Product, as: "Product" },
              { model: ProductVariation, as: "ProductVariation" }
            ]
          },
          { model: User, attributes: ["id", "username", "email"] },
          {
            model: OrderStatusHistory,
            as: 'OrderStatusHistories', // ✅ Use the alias
            order: [["updated_at", "DESC"]]
          },
        ],
      });
      logger.debug("createOrder: Order fetched successfully");

      // Emit order.created event (SSE notification + logging)
      const orderEmitter = require('../services/orderEvents.js');
      setImmediate(() => {
        try {
          createdOrder._itemCount = validatedItems.length;
          orderEmitter.emit('order.created', createdOrder);
        } catch (e) {
          logger.warn('order.created emit failed:', e.message);
        }
      });

      logger.debug("createOrder: Sending success response...");
      res.status(201).json({
        message: "Order created successfully",
        order: createdOrder,
      });
      logger.debug("createOrder: Response sent successfully");

      // Send WhatsApp order confirmation (fire-and-forget)
      setImmediate(async () => {
        try {
          const whatsappService = require('../services/whatsappService.js');
          const addr = await ShippingAddress.findByPk(shipping_address_id);
          if (addr && addr.phone) {
            if (payment_type === 'cod') {
              // COD: send address confirmation request (customer must reply YES)
              const fullAddress = [addr.full_name, addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
              await whatsappService.sendCodConfirmation(addr.phone, {
                orderNumber: createdOrder.order_number,
                amount: parseFloat(createdOrder.final_amount).toFixed(2),
                fullAddress,
              }, createdOrder.brand_id || 1);
              // Mark order as awaiting address confirmation
              await Order.update(
                { cod_address_confirmed: false },
                { where: { id: createdOrder.id } }
              );
              logger.debug(`createOrder: COD address confirmation WhatsApp sent for ${createdOrder.order_number}`);
            } else {
              // Prepaid: send standard confirmation
              await whatsappService.sendOrderConfirmation(addr.phone, {
                orderNumber: createdOrder.order_number,
                itemCount: validatedItems.length,
                total: parseFloat(createdOrder.final_amount).toFixed(2),
                estimatedDelivery: '3-5 working days'
              }, createdOrder.brand_id || 1);
            }
          }
        } catch (waErr) {
          logger.warn('WhatsApp order confirmation failed:', waErr.message);
        }
      });

      // Fire AddShippingInfo for all orders + InitiateCheckout for COD (prepaid fires InitiateCheckout in createRazorpayOrder)
      setImmediate(async () => {
        try {
          const [orderUser, orderAddress] = await Promise.all([
            User.findByPk(userId, { attributes: ['email', 'username'] }),
            ShippingAddress.findByPk(shipping_address_id),
          ]);
          const nameParts = (orderUser?.username || '').trim().split(/\s+/);
          const basePayload = {
            brand_id: createdOrder.brand_id || 1,
            order_number: createdOrder.order_number,
            total_amount: parseFloat(createdOrder.final_amount),
            final_amount: parseFloat(createdOrder.final_amount),
            currency: "INR",
            ip_address: req.ip || null,
            user_agent: req.headers["user-agent"] || null,
            email: orderUser?.email || null,
            phone: orderAddress?.phone || null,
            first_name: nameParts[0] || null,
            last_name: nameParts.slice(1).join(' ') || null,
            zip_code: orderAddress?.pincode || null,
            city: orderAddress?.city || null,
            state: orderAddress?.state || null,
            country: 'in',
            fbc: req.cookies?._fbc || req.body?.fbc || null,
            fbp: req.cookies?._fbp || null,
            items: createdOrder.OrderItems.map(i => ({
              product_id: i.product_id,
              quantity: i.quantity,
              price: parseFloat(i.price || 0),
              name: i.Product?.name || '',
            })),
          };

          // AddShippingInfo fires for all orders when shipping address is confirmed
          await sendFacebookEvent("AddShippingInfo", basePayload);
          await sendGAEvent("add_shipping_info", basePayload);

          // COD: also fire InitiateCheckout + AddPaymentInfo here (prepaid fires these in createRazorpayOrder)
          if (payment_type === 'cod') {
            await sendFacebookEvent("InitiateCheckout", basePayload);
            await sendGAEvent("begin_checkout", basePayload);
            await sendFacebookEvent("AddPaymentInfo", basePayload);
            await sendGAEvent("add_payment_info", basePayload);
          }
        } catch (fbErr) {
          logger.error("createOrder: AddShippingInfo/InitiateCheckout analytics error:", fbErr.message);
        }
      });

      // Fire Purchase analytics ONLY for COD orders — prepaid fires in updateOrderPayment after payment confirmation
      if (payment_type === 'cod') {
        setImmediate(async () => {
          try {
            // Fetch user + address for enriched user_data
            const [orderUser, orderAddress] = await Promise.all([
              User.findByPk(userId, { attributes: ['email', 'username'] }),
              ShippingAddress.findByPk(shipping_address_id),
            ]);
            const nameParts = (orderUser?.username || '').trim().split(/\s+/);
            const eventPayload = {
              brand_id: createdOrder.brand_id || 1,
              order_number: createdOrder.order_number,
              total_amount: parseFloat(createdOrder.final_amount),
              final_amount: parseFloat(createdOrder.final_amount),
              currency: "INR",
              ip_address: req.ip || null,
              user_agent: req.headers["user-agent"] || null,
              email: orderUser?.email || null,
              phone: orderAddress?.phone || null,
              first_name: nameParts[0] || null,
              last_name: nameParts.slice(1).join(' ') || null,
              zip_code: orderAddress?.pincode || null,
              city: orderAddress?.city || null,
              state: orderAddress?.state || null,
              country: 'in',
              fbc: req.cookies?._fbc || req.body?.fbc || null,
              fbp: req.cookies?._fbp || null,
              items: createdOrder.OrderItems.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity,
                price: parseFloat(i.price || 0),
                name: i.Product?.name || '',
              })),
            };
            await sendFacebookEvent("Purchase", eventPayload);
            await sendGAEvent("purchase", eventPayload);
          } catch (fbErr) {
            logger.error("createOrder: analytics event error:", fbErr.message);
          }
        });
      }

      // Invalidate dashboard cache for the user (non-blocking)
      try {
        await invalidateDashboardCache(userId);
      } catch (cacheError) {
        logger.warn("⚠️ Warning: Error invalidating dashboard cache:", cacheError.message);
        // Don't fail the order creation if cache invalidation fails
      }

      // Note: Full sync removed - cron job handles periodic syncing
      // Individual order is already synced above via createOrUpdateForwardOrder
    } catch (error) {
      logger.error("createOrder: Error caught:", error.message);
      logger.error("createOrder: Error stack:", error.stack);

      // Ensure transaction is rolled back on any error
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
          logger.debug("✅ Transaction rolled back due to error");
        } catch (rollbackError) {
          logger.error("❌ Error rolling back transaction:", rollbackError.message);
        }
      }

      logger.error("Error creating order:", error);
      res
        .status(500)
        .json({ message: "Failed to create order", error: error.message });
    }
  };

  // Create order — auto-creates a consumer account if not authenticated
  // Replaces the old guest checkout flow. Guest info (phone, email, name) is used
  // to find-or-create a user, then the order is placed under that user.
  module.exports.createGuestOrder = async (req, res) => {
    logger.debug("createGuestOrder: Auto-user order creation...");
    try {
      const { guest_info, shipping_address, items, payment_type, notes, coupon_id, discount_amount, session_id, idempotency_key } = req.body;

      if (!guest_info || !shipping_address || !items || !payment_type) {
        return res.status(400).json({ success: false, message: "Guest info, shipping address, items, and payment type are required" });
      }

      const { email, firstName, lastName, phone } = guest_info;
      if (!email || !firstName || !phone) {
        return res.status(400).json({ success: false, message: "Email, first name, and phone are required" });
      }

      const digits = String(phone).replace(/\D/g, '').slice(-10);
      if (!PHONE_REGEX.test(digits)) {
        return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number." });
      }
      if (!EMAIL_REGEX.test(String(email).trim())) {
        return res.status(400).json({ success: false, message: "Please enter a valid email address." });
      }

      const bcrypt = require('bcrypt');
      const jwt = require('jsonwebtoken');

      // Find or create user by phone (primary) or email (fallback)
      let user = await User.findOne({ where: { phone: digits } });
      if (!user) {
        user = await User.findOne({ where: { email: email.toLowerCase() } });
      }
      if (!user) {
        const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
        const fullName = `${firstName} ${lastName || ''}`.trim() || 'Guest';
        user = await User.create({
          username: `${fullName} (${digits})`,
          email: email.toLowerCase(),
          phone: digits,
          password: tempPassword,
          role: 'consumer',
          source_brand_id: req.brandId || null,
        });
        logger.debug(`createGuestOrder: Created new consumer user ${user.id} for ${email}`);
      } else {
        // Update name if user has a generated username
        if (user.username && user.username.startsWith('user_')) {
          const fullName = `${firstName} ${lastName || ''}`.trim();
          await user.update({ username: fullName });
        }
        logger.debug(`createGuestOrder: Found existing user ${user.id} for ${email}`);
      }

      // Create shipping address under this user
      const newAddress = await ShippingAddress.create({
        user_id: user.id,
        full_name: shipping_address.fullName,
        address: shipping_address.address,
        city: shipping_address.city,
        state: shipping_address.state,
        pincode: shipping_address.pincode,
        phone: shipping_address.phone || digits,
        country: shipping_address.country || 'India',
        is_default: false,
      });

      // ── Validate the shipping address before proceeding ─────────────────
      const { validateShippingAddress } = require('../services/shippingValidationService');
      const addrValidation = validateShippingAddress({
        full_name: shipping_address.fullName,
        address: shipping_address.address,
        city: shipping_address.city,
        state: shipping_address.state,
        pincode: shipping_address.pincode,
        phone: shipping_address.phone || digits,
      });

      if (!addrValidation.valid) {
        // Clean up the address we just created
        await newAddress.destroy().catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Shipping address has issues that will cause delivery failure',
          errors: addrValidation.errors,
          warnings: addrValidation.warnings,
        });
      }

      // Issue a short-lived token so the order can be placed as this user
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Inject user into req and call createOrder internally
      req.user = user;
      req.body = {
        shipping_address_id: newAddress.id,
        items,
        payment_type,
        notes,
        coupon_id,
        discount_amount,
        idempotency_key,
        utm_session_id: req.body.utm_session_id,
      };

      // Add token to response header so frontend can store it
      res.setHeader('X-Auth-Token', token);
      res.setHeader('X-User-Id', user.id);

      // Call createOrder directly
      return module.exports.createOrder(req, res);
    } catch (error) {
      logger.error("createGuestOrder error:", error.message);
      res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
    }
  };


  // ══════════════════════════════════════════════════════════════════════════
  // Admin Manual Order Creation
  // Creates an order from the admin dashboard with full tracking (FB, GA, WA, FShip)
  // ══════════════════════════════════════════════════════════════════════════
  module.exports.adminCreateManualOrder = async (req, res) => {
    let transaction = null;
    try {
      transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      });

      const {
        customer_phone,
        customer_email,
        customer_name,
        shipping_address, // { full_name, address, city, state, pincode, phone, country }
        items,            // [{ product_id, variation_id?, quantity }]
        payment_type,     // 'cod' | 'razorpay' | 'upi' etc.
        payment_status,   // 'paid' | 'pending'
        notes,
        discount_amount,
        coupon_id,
        brand_id: bodyBrandId,
      } = req.body;

      const adminId = req.user.id;
      const brandId = bodyBrandId ? parseInt(bodyBrandId) : (req.brand?.id || 1);

      // ── Validation ──────────────────────────────────────────────────────
      if (!customer_phone || !shipping_address || !items?.length || !payment_type) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Customer phone, shipping address, items, and payment type are required.' });
      }

      const digits = String(customer_phone).replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(digits)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
      }

      // ── Find or create customer ─────────────────────────────────────────
      const bcrypt = require('bcrypt');
      let user = await User.findOne({ where: { phone: digits } });
      if (!user && customer_email) {
        user = await User.findOne({ where: { email: customer_email.toLowerCase() } });
      }
      if (!user) {
        const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
        user = await User.create({
          username: customer_name || `Customer ${digits.slice(-4)}`,
          email: customer_email?.toLowerCase() || `${digits}@manual.order`,
          phone: digits,
          password: tempPassword,
          role: 'consumer',
        }, { transaction });
        logger.info(`[AdminManualOrder] Created new consumer user ${user.id}`);
      }

      // ── Create shipping address ─────────────────────────────────────────
      const addr = await ShippingAddress.create({
        user_id: user.id,
        full_name: shipping_address.full_name || customer_name || user.username,
        address: shipping_address.address,
        city: shipping_address.city,
        state: shipping_address.state,
        pincode: shipping_address.pincode,
        phone: shipping_address.phone || digits,
        country: shipping_address.country || 'India',
        is_default: false,
      }, { transaction });

      // ── Validate items & calculate totals ───────────────────────────────
      const productIds = items.map(i => i.product_id);
      const variationIds = items.filter(i => i.variation_id).map(i => i.variation_id);
      const [productMap, variationMap, variationsByProductMap] = await Promise.all([
        batchFetchProducts(productIds),
        batchFetchVariations(variationIds),
        batchFetchVariationsByProductIds(productIds),
      ]);

      let totalAmount = 0;
      const validatedItems = [];

      for (const item of items) {
        const { product_id, quantity } = item;
        let { variation_id } = item;

        if (!product_id || !quantity || quantity < 1) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Product ID and quantity (≥1) are required for each item.' });
        }

        const product = productMap.get(product_id);
        if (!product) {
          await transaction.rollback();
          return res.status(404).json({ success: false, message: `Product ${product_id} not found.` });
        }

        let variation;
        if (variation_id) {
          variation = variationMap.get(variation_id);
          if (!variation || variation.productId !== product_id) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: `Invalid variation for product ${product_id}.` });
          }
        } else {
          const variations = variationsByProductMap.get(product_id) || [];
          if (!variations.length) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: `Product ${product_id} has no variations.` });
          }
          variation = variations[0];
          variation_id = variation.id;
        }

        // Stock check (admin can override but we still warn)
        if (variation.stock < quantity) {
          logger.warn(`[AdminManualOrder] Low stock for variation ${variation_id}: ${variation.stock} < ${quantity}`);
        }

        const price = parseFloat(variation.price);
        const subtotal = price * quantity;
        totalAmount += subtotal;

        validatedItems.push({
          product_id,
          variation_id,
          quantity,
          price,
          discount: 0,
          subtotal,
          _variation: variation,
        });
      }

      const subTotal = Number(totalAmount);
      const appliedDiscount = discount_amount ? Number(discount_amount) : 0;
      const shippingFee = Number(await calculateShippingFee(payment_type));
      const finalAmount = Math.max(0, subTotal - appliedDiscount + shippingFee);

      // ── RTO risk scoring ────────────────────────────────────────────────
      let rtoRiskScore = 0;
      const rtoCount = await getRtoCount(digits, user.id);
      if (rtoCount >= 1) rtoRiskScore += 20;
      if (String(shipping_address.address || '').trim().length < 30) rtoRiskScore += 10;

      // ── Create order ────────────────────────────────────────────────────
      const orderStatus = (payment_status === 'paid' && payment_type !== 'cod') ? 'confirmed' : 'awaiting_confirmation';
      const order = await Order.create({
        order_number: await generateUniqueOrderNumber(transaction, brandId),
        user_id: user.id,
        shipping_address_id: addr.id,
        total_amount: subTotal,
        discount_amount: appliedDiscount,
        coupon_id: coupon_id || null,
        shipping_fee: shippingFee,
        final_amount: finalAmount,
        payment_type,
        payment_status: payment_status || 'pending',
        status: orderStatus,
        notes: `[Manual Order by Admin #${adminId}] ${notes || ''}`.trim(),
        brand_id: brandId,
        rto_risk_score: rtoRiskScore,
      }, { transaction });

      // ── Create order items ──────────────────────────────────────────────
      const orderItemsData = validatedItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        subtotal: item.subtotal,
      }));
      await batchInsert(OrderItem, orderItemsData, { transaction });

      // ── Decrement stock ─────────────────────────────────────────────────
      for (const item of validatedItems) {
        if (item._variation) {
          item._variation.stock -= item.quantity;
          await item._variation.save({ transaction });
        }
      }

      // ── Payment record ──────────────────────────────────────────────────
      const { toSmallestUnit } = require('../utils/amountConverter');
      await Payment.create({
        order_id: order.id,
        user_id: user.id,
        payment_type,
        amount_paid: payment_type === 'cod' ? finalAmount : toSmallestUnit(finalAmount, 'INR'),
        status: payment_status === 'paid' ? 'successful' : 'pending',
        payment_gateway: payment_type === 'cod' ? null : 'Manual',
        brand_id: brandId,
        notes: `Manual order created by admin #${adminId}`,
      }, { transaction });

      // ── Status history ──────────────────────────────────────────────────
      await OrderStatusHistory.create({
        order_id: order.id,
        status: orderStatus,
        updated_by: adminId,
        notes: `Manual order created by admin`,
      }, { transaction });

      // ── Coupon usage ────────────────────────────────────────────────────
      if (coupon_id && appliedDiscount > 0) {
        const { Coupon, CouponUsage } = require('../model/associations.js');
        const coupon = await Coupon.findByPk(coupon_id, { transaction });
        if (coupon) {
          await CouponUsage.create({
            couponId: coupon_id, userId: user.id, orderId: order.id, discountAmount: appliedDiscount,
          }, { transaction });
          await coupon.increment('usageCount', { by: 1, transaction });
        }
      }

      await transaction.commit();
      logger.info(`[AdminManualOrder] Order ${order.order_number} created by admin #${adminId}`);

      // ── Fetch full order ────────────────────────────────────────────────
      const createdOrder = await Order.findByPk(order.id, {
        include: [
          { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }, { model: ProductVariation, as: 'ProductVariation' }] },
          { model: User, attributes: ['id', 'username', 'email'] },
          { model: ShippingAddress, as: 'ShippingAddress' },
        ],
      });

      // ── Post-creation side effects (non-blocking) ──────────────────────

      // SSE notification
      const orderEmitter = require('../services/orderEvents.js');
      setImmediate(() => {
        try {
          createdOrder._itemCount = validatedItems.length;
          orderEmitter.emit('order.created', createdOrder);
          if (orderStatus === 'confirmed') {
            orderEmitter.emit('order.confirmed', createdOrder);
          }
        } catch (e) {
          logger.warn('[AdminManualOrder] order event emit failed:', e.message);
        }
      });

      // WhatsApp notification
      setImmediate(async () => {
        try {
          const whatsappService = require('../services/whatsappService.js');
          if (addr.phone) {
            if (payment_type === 'cod') {
              const fullAddress = [addr.full_name, addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
              await whatsappService.sendCodConfirmation(addr.phone, {
                orderNumber: createdOrder.order_number,
                amount: parseFloat(createdOrder.final_amount).toFixed(2),
                fullAddress,
              }, brandId);
              await Order.update({ cod_address_confirmed: false }, { where: { id: order.id } });
            } else {
              await whatsappService.sendOrderConfirmation(addr.phone, {
                orderNumber: createdOrder.order_number,
                itemCount: validatedItems.length,
                total: parseFloat(createdOrder.final_amount).toFixed(2),
                estimatedDelivery: '3-5 working days',
              }, brandId);
            }
          }
        } catch (e) { logger.warn('[AdminManualOrder] WhatsApp failed:', e.message); }
      });

      // Analytics: FB Pixel + GA4
      setImmediate(async () => {
        try {
          const eventPayload = {
            brand_id: brandId,
            order_number: createdOrder.order_number,
            total_amount: parseFloat(createdOrder.final_amount),
            final_amount: parseFloat(createdOrder.final_amount),
            currency: 'INR',
            email: user.email,
            phone: addr.phone || digits,
            first_name: (user.username || '').split(/\s+/)[0] || null,
            last_name: (user.username || '').split(/\s+/).slice(1).join(' ') || null,
            zip_code: addr.pincode || null,
            city: addr.city || null,
            state: addr.state || null,
            country: 'in',
            items: createdOrder.OrderItems.map(i => ({
              product_id: i.product_id,
              quantity: i.quantity,
              price: parseFloat(i.price || 0),
              name: i.Product?.name || '',
            })),
          };
          await sendFacebookEvent('Purchase', eventPayload);
          await sendGAEvent('purchase', eventPayload);
          await sendFacebookEvent('AddShippingInfo', eventPayload);
          await sendGAEvent('add_shipping_info', eventPayload);
        } catch (e) { logger.error('[AdminManualOrder] Analytics error:', e.message); }
      });

      // Badge recalculation
      setImmediate(async () => {
        try {
          const BadgeService = require('../services/badgeService');
          await BadgeService.enqueueBadgeRecalculation(user.id);
        } catch (e) { logger.warn('[AdminManualOrder] Badge recalc failed:', e.message); }
      });

      res.status(201).json({
        success: true,
        message: `Manual order ${createdOrder.order_number} created successfully`,
        order: createdOrder,
      });

    } catch (error) {
      if (transaction && !transaction.finished) {
        try { await transaction.rollback(); } catch (e) { /* ignore */ }
      }
      logger.error('[AdminManualOrder] Error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to create manual order', error: error.message });
    }
  };


  // Track order by AWB number (works for both registered and guest orders)
  module.exports.trackOrderByAWB = async (req, res) => {
    try {
      const { awb_number } = req.query;

      if (!awb_number) {
        return res.status(400).json({
          success: false,
          message: "AWB number is required",
        });
      }

      // Find order by tracking number (AWB)
      const order = await Order.findOne({
        where: { tracking_number: awb_number },
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "email", "username"],
            required: false,
          },
          {
            model: GuestUser,
            as: "GuestUser",
            attributes: ["id", "email", "firstName", "lastName", "phone"],
            required: false,
          },
          {
            model: ShippingAddress,
            as: "ShippingAddress",
            attributes: [
              "id",
              "full_name",
              "address",
              "city",
              "state",
              "pincode",
              "phone",
            ],
          },
          {
            model: OrderItem,
            as: "OrderItems",
            include: [
              {
                model: Product,
                as: "Product",
                attributes: ["id", "name", "slug"],
                include: [
                  {
                    model: ProductImage,
                    as: "ProductImages",
                    attributes: ["image_url"],
                    separate: true,
                  },
                ],
              },
              {
                model: ProductVariation,
                as: "ProductVariation",
                attributes: ["id", "sku", "price", "attributes"],
                required: false,
                include: [
                  {
                    model: ProductImage,
                    as: "VariationImages",
                    attributes: ["image_url"],
                    separate: true,
                  },
                ],
              },
            ],
          },
          {
            model: OrderStatusHistory,
            as: "OrderStatusHistories",
            order: [["created_at", "DESC"]],
            required: false,
          },
        ],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found with this AWB number",
        });
      }

      // Determine if it's a guest order or registered user order
      const isGuestOrder = !!order.guest_user_id;
      const customerInfo = isGuestOrder ? order.GuestUser : order.User;

      res.json({
        success: true,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            shipping_fee: order.shipping_fee,
            discount_amount: order.discount_amount,
            final_amount: order.final_amount,
            payment_type: order.payment_type,
            status: order.status,
            payment_status: order.payment_status,
            tracking_number: order.tracking_number,
            courier_name: order.courier_name,
            tracking_url: order.tracking_url,
            created_at: order.created_at,
            updated_at: order.updated_at,
          },
          customer: {
            type: isGuestOrder ? "guest" : "registered",
            info: customerInfo,
          },
          shipping_address: order.ShippingAddress,
          items: order.OrderItems.map((item) => ({
            id: item.id,
            product: {
              id: item.Product.id,
              name: item.Product.name,
              slug: item.Product.slug,
              image: item.ProductVariation?.VariationImages?.[0]?.image_url || item.Product.ProductImages?.[0]?.image_url || null,
            },
            variation: item.ProductVariation
              ? {
                  id: item.ProductVariation.id,
                  sku: item.ProductVariation.sku,
                  price: item.ProductVariation.price,
                  attributes: item.ProductVariation.attributes,
                }
              : null,
            quantity: item.quantity,
            price: item.price,
            total_price: item.subtotal,
          })),
          status_history: order.OrderStatusHistories.map((history) => ({
            id: history.id,
            status: history.status,
            notes: history.notes,
            created_at: history.created_at,
            created_by: history.created_by,
          })),
        },
      });
    } catch (error) {
      logger.error("Error tracking order by AWB:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track order",
        error: error.message,
      });
    }
  };

  // Get all orders (admin)
  module.exports.getAllOrders = async (req, res) => {
    try {
      const {
        status,
        payment_status,
        payment_type,
        brand_id,
        start_date,
        end_date,
        page = 1,
        limit = 20,
        search,
        sort = "createdAt",
        order = "DESC"
      } = req.query;

      const safeLimit = Math.min(parseInt(limit) || 20, 100);

      logger.debug("=== GET ALL ORDERS DEBUG ===");
      logger.debug("Query parameters:", {
        status,
        payment_status,
        payment_type,
        brand_id,
        start_date,
        end_date,
        page,
        limit,
        search,
        sort,
        order
      });

      // Build filter based on query parameters
      const filter = {};

      // Brand filter
      if (brand_id && brand_id !== 'all') {
        filter.brand_id = parseInt(brand_id);
      }

      // Status filter
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Payment status filter
      if (payment_status && payment_status !== 'all') {
        filter.payment_status = payment_status;
      }

      // Payment type filter
      if (payment_type && payment_type !== 'all') {
        if (payment_type === 'prepaid') {
          // Prepaid includes all payment types except COD
          filter.payment_type = {
            [Op.in]: ['credit_card', 'debit_card', 'upi', 'wallet', 'razorpay']
          };
        } else {
          filter.payment_type = payment_type;
        }
      }

      // Date range filter — supports partial ranges (start only, end only, or both).
      // end_date is normalised to 23:59:59.999 of the chosen day so orders placed
      // later that day are included (otherwise Op.between to YYYY-MM-DD 00:00:00
      // would cut off everything after midnight on the end date).
      // Date range filter — via the shared helper so the Symbol-key gotcha
      // (Object.keys ignores Op.gte/Op.lte → always 0) can't silently disable
      // it again. See utils/dateRange.js.
      {
        const { buildCreatedAtRange } = require('../utils/dateRange.js');
        const { range, hasRange } = buildCreatedAtRange(start_date, end_date);
        if (hasRange) filter.createdAt = range;
      }

      // Search functionality
      const searchConditions = [];
      if (search && search.trim()) {
        const searchTerm = search.trim();

        // Search in order fields
        searchConditions.push(
          { order_number: { [Op.like]: `%${searchTerm}%` } },
          { tracking_number: { [Op.like]: `%${searchTerm}%` } },
          { courier_name: { [Op.like]: `%${searchTerm}%` } },
          { fship_waybill: { [Op.like]: `%${searchTerm}%` } }
        );

        // Search in final amount
        if (!isNaN(searchTerm)) {
          searchConditions.push({
            final_amount: { [Op.like]: `%${searchTerm}%` }
          });
        }

        // Search in associated User
        searchConditions.push(
          { '$User.username$': { [Op.like]: `%${searchTerm}%` } },
          { '$User.email$': { [Op.like]: `%${searchTerm}%` } }
        );

        // Search in associated GuestUser
        searchConditions.push(
          { '$GuestUser.email$': { [Op.like]: `%${searchTerm}%` } },
          { '$GuestUser.firstName$': { [Op.like]: `%${searchTerm}%` } },
          { '$GuestUser.lastName$': { [Op.like]: `%${searchTerm}%` } },
          { '$GuestUser.phone$': { [Op.like]: `%${searchTerm}%` } }
        );

        // Search in associated ShippingAddress
        searchConditions.push(
          { '$ShippingAddress.full_name$': { [Op.like]: `%${searchTerm}%` } },
          { '$ShippingAddress.phone$': { [Op.like]: `%${searchTerm}%` } },
          { '$ShippingAddress.address$': { [Op.like]: `%${searchTerm}%` } },
          { '$ShippingAddress.city$': { [Op.like]: `%${searchTerm}%` } },
          { '$ShippingAddress.pincode$': { [Op.like]: `%${searchTerm}%` } }
        );
      }

      // Pagination
      const offset = (page - 1) * safeLimit;

      // Build order clause
      const orderClause = [[sort, order.toUpperCase()]];

      // Build the main query
      const hasSearch = searchConditions.length > 0;
      const queryOptions = {
        where: filter,
        distinct: true,
        col: "id",
        ...(hasSearch ? { subQuery: false } : {}),
        include: [
          {
            model: Brand,
            as: "Brand",
            attributes: ["id", "name", "display_name", "primary_color"],
            required: false,
          },
          {
            model: User,
            as: "User",
            attributes: ["id", "username", "email"],
            required: false,
          },
          {
            model: GuestUser,
            as: "GuestUser",
            attributes: ["id", "email", "firstName", "lastName", "phone"],
            required: false,
          },
          {
            model: ShippingAddress,
            as: "ShippingAddress",
            attributes: [
              "id",
              "full_name",
              "phone",
              "address",
              "city",
              "state",
              "pincode",
              "country",
            ],
            required: false,
          },
          {
            model: require("../model/orderShipmentModel.js").OrderShipment,
            as: "Shipment",
            required: false,
            attributes: [
              "provider", "provider_order_id", "waybill", "tracking_number",
              "tracking_url", "courier_name", "label_url", "sync_status",
              "sync_error", "last_synced_at",
            ],
          },
          {
            model: OrderItem,
            as: "OrderItems",
            include: [
              {
                model: Product,
                as: "Product",
                include: [
                  { model: ProductImage, as: "ProductImages", separate: true },
                  {
                    model: Brand,
                    as: "Brands",
                    through: { attributes: ['status'] }
                  }
                ],
              },
              {
                model: ProductVariation,
                as: "ProductVariation",
                attributes: ["id", "sku", "price", "attributes"],
                include: [
                  {
                    model: ProductImage,
                    as: "VariationImages",
                    attributes: ["id", "image_url", "alt_text", "is_primary"]
                  }
                ],
                required: false,
              },
            ],
          },
        ],
        order: orderClause,
        limit: safeLimit,
        offset: parseInt(offset),
      };

      // Add search conditions to main where clause if any
      if (searchConditions.length > 0) {
        if (Object.keys(filter).length > 0) {
          queryOptions.where = {
            [Op.and]: [
              filter,
              {
                [Op.or]: searchConditions
              }
            ]
          };
        } else {
          queryOptions.where = {
            [Op.or]: searchConditions
          };
        }
      }

      const orders = await Order.findAndCountAll(queryOptions);

      const totalPages = Math.ceil(orders.count / safeLimit);

      logger.debug("Query results:", {
        totalCount: orders.count,
        returnedRows: orders.rows.length,
        limit: safeLimit,
        page: parseInt(page),
        totalPages,
        searchTerm: search || 'none',
        filtersApplied: {
          status: status || 'all',
          payment_status: payment_status || 'all',
          hasDateRange: !!(start_date && end_date)
        }
      });

      const { getRtoRiskLevel } = require('../services/orderService.js');

      res.json({
        orders: orders.rows.map(o => ({
          ...o.toJSON(),
          rto_risk_level: getRtoRiskLevel(o.rto_risk_score || 0),
        })),
        total: orders.count,
        totalPages: totalPages,
        pagination: {
          total: orders.count,
          page: parseInt(page),
          limit: safeLimit,
          totalPages,
        },
        filters: {
          status: status || 'all',
          payment_status: payment_status || 'all',
          search: search || '',
          sort,
          order
        }
      });
    } catch (error) {
      logger.error("Error getting orders:", error);
      res
        .status(500)
        .json({ message: "Failed to get orders", error: error.message });
    }
  };

  // Get user's orders
  module.exports.getUserOrders = async (req, res) => {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      // Build filter
      const filter = { user_id: userId };
      if (status) filter.status = status;

      // Pagination
      const offset = (page - 1) * limit;

      const orders = await Order.findAndCountAll({
        where: filter,
        include: [
          {
            model: OrderItem,
            as: "OrderItems",
            include: [
              {
                model: Product,
                as: "Product",
                include: [{ model: ProductImage, as: "ProductImages" }],
              },
              {
                model: ProductVariation,
                as: "ProductVariation",
                attributes: ["id", "sku", "price", "attributes"],
                include: [
                  {
                    model: ProductImage,
                    as: "VariationImages",
                    attributes: ["id", "image_url", "alt_text", "is_primary"]
                  }
                ],
                required: false,
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      const totalPages = Math.ceil(orders.count / limit);
      const { getRtoRiskLevel } = require('../services/orderService.js');
      const imagekitService = require('../services/imagekitService');

      const transformImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        try { return imagekitService.getOptimizedUrl(url, 'medium'); } catch { return url; }
      };

      res.json({
        orders: orders.rows.map(o => {
          const order = o.toJSON();
          order.OrderItems = (order.OrderItems || []).map(item => ({
            ...item,
            Product: item.Product ? {
              ...item.Product,
              ProductImages: (item.Product.ProductImages || []).map(img => ({
                ...img,
                image_url: transformImageUrl(img.image_url),
              })),
            } : null,
            ProductVariation: item.ProductVariation ? {
              ...item.ProductVariation,
              VariationImages: (item.ProductVariation.VariationImages || []).map(img => ({
                ...img,
                image_url: transformImageUrl(img.image_url),
              })),
            } : null,
          }));
          return { ...order, rto_risk_level: getRtoRiskLevel(o.rto_risk_score || 0) };
        }),
        pagination: {
          total: orders.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
        },
      });
    } catch (error) {
      logger.error("Error getting user orders:", error);
      res
        .status(500)
        .json({ message: "Failed to get orders", error: error.message });
    }
  };

  // Get Order by ID
  module.exports.getOrder = async (req, res) => {
    try {
      const { id } = req.params; // Assuming the order ID is passed as a URL parameter

      const order = await Order.findByPk(id, {
        include: [
          {
            model: OrderItem,
            as: "OrderItems",
            include: [
              {
                model: Product,
                as: "Product",
                include: [{ model: ProductImage, as: "ProductImages" }],
              },
              {
                model: ProductVariation,
                as: "ProductVariation",
                attributes: ["id", "sku", "price", "attributes"],
                include: [
                  {
                    model: ProductImage,
                    as: "VariationImages",
                    attributes: ["id", "image_url", "alt_text", "is_primary"]
                  }
                ],
                required: false,
              },
            ],
          },
          {
            model: User,
            as: "User",
            attributes: ["id", "username", "email"],
            required: false,
          },
          {
            model: GuestUser,
            as: "GuestUser",
            attributes: ["id", "email", "firstName", "lastName", "phone"],
            required: false,
          },
          {
            model: ShippingAddress,
            as: "ShippingAddress",
            attributes: [
              "id",
              "full_name",
              "phone",
              "address",
              "city",
              "state",
              "pincode",
              "country",
            ],
            required: false,
          },
        ],
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      logger.error("Error fetching order:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch order", error: error.message });
    }
  };

  // Update order status — uses state machine validation + emits events
  module.exports.updateOrderStatus = async (req, res) => {
    try {
      const { status, notes } = req.body;
      if (!status) return res.status(400).json({ message: 'Status is required' });

      const orderService = require('../services/orderService.js');
      const orderEmitter = require('../services/orderEvents.js');
      const order = await Order.findByPk(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      // Validate transition
      orderService.assertTransition(order.status, status);

      await order.update({ status });
      await OrderStatusHistory.create({
        order_id: order.id,
        status,
        updated_by: req.user.id,
        notes: notes || `Status updated to ${status}`,
      });

      // Emit lifecycle events
      if (status === 'shipped') setImmediate(() => { try { orderEmitter.emit('order.shipped', order); } catch (e) { logger.warn('order.shipped emit failed:', e.message); } });
      if (status === 'delivered') setImmediate(() => { try { orderEmitter.emit('order.delivered', order); } catch (e) { logger.warn('order.delivered emit failed:', e.message); } });

      res.json({ success: true, message: `Order status updated to ${status}`, order });
    } catch (error) {
      const status = error.message.includes('Cannot transition') ? 400 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  // Cancel order (by user) — delegates to orderService
  module.exports.cancelOrder = async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Cancellation reason is required' });
      }
      const orderService = require('../services/orderService.js');
      const order = await orderService.cancelOrder(req.params.id, {
        reason,
        cancelledBy: req.user.id,
        isAdmin: false,
      });
      // Verify ownership
      const found = await Order.findByPk(req.params.id);
      if (found && found.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      res.json({ success: true, message: 'Order cancelled successfully', order });
    } catch (error) {
      const status = error.message.includes('Cannot cancel') ? 400 : 500;
      res.status(status).json({ message: error.message });
    }
  };


  // Initiate return (Task 11) — transitions delivered → return_initiated
  module.exports.initiateReturn = async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const { reason } = req.body;

      const order = await Order.findByPk(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.user_id !== userId) return res.status(403).json({ message: "Access denied" });
      if (order.status !== 'delivered') {
        return res.status(400).json({ message: "Returns can only be initiated for delivered orders." });
      }

      await order.update({ status: 'return_initiated' });
      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'return_initiated',
        updated_by: userId,
        notes: reason || 'Return initiated by customer',
      });

      // Audit trail.
      try {
        const { auditLog } = require('../services/orderService.js');
        await auditLog(order.id, 'return_initiated', userId, 'user', { reason: reason || null });
      } catch (e) { logger.warn(`Audit log skipped for return ${order.order_number}: ${e.message}`); }

      res.json({ success: true, message: "Return initiated successfully.", order });
    } catch (error) {
      logger.error("Error initiating return:", error);
      res.status(500).json({ message: "Failed to initiate return", error: error.message });
    }
  };

  // Get order statistics
  module.exports.getOrderStats = async (req, res) => {
    try {
      // Date filter support
      const { start_date, end_date } = req.query;
      const dateWhere = {};
      if (start_date) dateWhere[Op.gte] = new Date(start_date);
      if (end_date) {
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
        dateWhere[Op.lte] = endDate;
      }
      const hasDateFilter = Object.keys(dateWhere).length > 0;
      const orderWhere = hasDateFilter ? { createdAt: dateWhere } : {};

      const totalOrders = await Order.count({ where: orderWhere });

      // Total revenue = ALL orders (full picture)
      const totalRevenue = await Order.sum("final_amount", { where: orderWhere }) || 0;

      // Count each status
      const [statusRows] = await sequelize.query(`
        SELECT status, COUNT(*) as count, COALESCE(SUM(final_amount), 0) as revenue
        FROM orders
        ${hasDateFilter ? `WHERE created_at >= :startDate AND created_at <= :endDate` : ''}
        GROUP BY status
      `, {
        replacements: hasDateFilter ? { startDate: start_date, endDate: end_date ? new Date(new Date(end_date).setHours(23, 59, 59, 999)) : new Date() } : {},
      });
      const sc = {};
      const sr = {};
      statusRows.forEach(r => {
        sc[r.status] = parseInt(r.count);
        sr[r.status] = parseFloat(r.revenue || 0);
      });

      const totalCancelledOrders = (sc['cancelled'] || 0) + (sc['order cancelled'] || 0);
      const totalRtoOrders = (sc['rto'] || 0) + (sc['rto delivered'] || 0) + (sc['returned_rto'] || 0);
      const deliveredRevenue = (sr['delivered'] || 0);
      const cancelledRevenue = (sr['cancelled'] || 0) + (sr['order cancelled'] || 0);
      const rtoRevenue = (sr['rto'] || 0) + (sr['rto delivered'] || 0) + (sr['return_initiated'] || 0) + (sr['returned_rto'] || 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      res.json({
        totalOrders,
        totalRevenue,
        earnedRevenue: deliveredRevenue,
        lostRevenue: cancelledRevenue + rtoRevenue,
        averageOrderValue,
        statusBreakdown: {
          awaiting_confirmation: sc['awaiting_confirmation'] || 0,
          pending: sc['pending'] || 0,
          confirmed: sc['confirmed'] || 0,
          processing: sc['processing'] || 0,
          booked: sc['booked'] || 0,
          pickup_initiated: sc['pickup initiated'] || 0,
          manifested: sc['manifested'] || 0,
          in_transit: sc['in transit'] || 0,
          shipped: sc['shipped'] || 0,
          out_for_delivery: sc['out for delivery'] || 0,
          delivered: sc['delivered'] || 0,
          undelivered: sc['undelivered'] || 0,
          rto: sc['rto'] || 0,
          rto_delivered: sc['rto delivered'] || 0,
          return_initiated: sc['return_initiated'] || 0,
          returned_rto: sc['returned_rto'] || 0,
          cancelled: totalCancelledOrders,
          exception: sc['exception'] || 0,
        },
        revenueBreakdown: {
          delivered: deliveredRevenue,
          shipped: (sr['shipped'] || 0) + (sr['in transit'] || 0) + (sr['out for delivery'] || 0) + (sr['booked'] || 0) + (sr['pickup initiated'] || 0) + (sr['manifested'] || 0),
          processing: (sr['processing'] || 0) + (sr['confirmed'] || 0),
          pending: (sr['pending'] || 0) + (sr['awaiting_confirmation'] || 0),
          rto: rtoRevenue,
          cancelled: cancelledRevenue,
        },
        // Legacy fields for backward compatibility
        totalPendingOrders: (sc['pending'] || 0) + (sc['awaiting_confirmation'] || 0),
        totalProcessingOrders: (sc['processing'] || 0) + (sc['confirmed'] || 0),
        totalShippedOrders: (sc['shipped'] || 0) + (sc['in transit'] || 0) + (sc['out for delivery'] || 0),
        totalDeliveredOrders: sc['delivered'] || 0,
        totalCancelledOrders,
        totalRtoOrders,
        ...(hasDateFilter ? { dateFilter: { start_date, end_date } } : {}),
      });
    } catch (error) {
      logger.error("Error fetching order statistics:", error);
      res.status(500).json({
        message: "Failed to fetch order statistics",
        error: error.message,
      });
    }
  };

  // Admin cancel order — delegates to orderService
  module.exports.adminCancelOrder = async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Cancellation reason is required' });
      }
      const orderService = require('../services/orderService.js');
      const order = await orderService.cancelOrder(req.params.id, {
        reason,
        cancelledBy: req.user.id,
        isAdmin: true,
      });
      res.json({ success: true, message: 'Order cancelled successfully', order });
    } catch (error) {
      const status = error.message.includes('Cannot cancel') ? 400 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  // Confirm order (admin) — triggers FShip sync
  module.exports.confirmOrder = async (req, res) => {
    try {
      const orderService = require('../services/orderService.js');
      const order = await orderService.confirmOrder(req.params.id, req.user.id);
      res.json({ success: true, message: 'Order confirmed', order });
    } catch (error) {
      const status = error.message.includes('Cannot transition') ? 400 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  // Update AWB number manually
  module.exports.updateAwbNumber = async (req, res) => {
    try {
      const orderId = req.params.id;
      const { awbNumber, courierName } = req.body;

      if (!awbNumber || !awbNumber.trim()) {
        return res.status(400).json({
          success: false,
          message: "AWB number is required"
        });
      }

      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      // Update AWB and courier information
      order.fship_waybill = awbNumber.trim();
      if (courierName && courierName.trim()) {
        order.courier_name = courierName.trim();
      }
      order.tracking_number = awbNumber.trim(); // Also update tracking number

      await order.save();

      // Create status history entry
      await OrderStatusHistory.create({
        order_id: order.id,
        status: order.status,
        updated_by: req.user?.id || null,
        notes: `AWB number manually updated to: ${awbNumber.trim()}${courierName ? ` (Courier: ${courierName.trim()})` : ''}`,
        created_by: "admin"
      });

      logger.debug(`✅ AWB updated for order ${order.order_number}: ${awbNumber.trim()}`);

      // Audit trail.
      try {
        const { auditLog } = require('../services/orderService.js');
        await auditLog(order.id, 'awb_update', req.user?.id || null, 'admin', {
          awb: awbNumber.trim(),
          courier_name: courierName?.trim() || null,
        });
      } catch (e) { logger.warn(`Audit log skipped for AWB update on ${order.order_number}: ${e.message}`); }

      res.status(200).json({
        success: true,
        message: "AWB number updated successfully",
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            fship_waybill: order.fship_waybill,
            courier_name: order.courier_name,
            tracking_number: order.tracking_number
          }
        }
      });
    } catch (error) {
      logger.error("Error updating AWB number:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update AWB number",
        error: error.message
      });
    }
  };

  // Track order by order number (works for both registered and guest orders)
  module.exports.trackOrderByOrderNumber = async (req, res) => {
    try {
      const { order_number } = req.params;

      if (!order_number) {
        return res.status(400).json({
          success: false,
          message: "Order number is required",
        });
      }

      logger.debug(`Tracking order by order number: ${order_number}`);

      // Find order by order number
      const order = await Order.findOne({
        where: { order_number: order_number },
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "email", "username"],
            required: false,
          },
          {
            model: GuestUser,
            as: "GuestUser",
            attributes: ["id", "email", "firstName", "lastName", "phone"],
            required: false,
          },
          {
            model: ShippingAddress,
            as: "ShippingAddress",
            attributes: [
              "id",
              "full_name",
              "address",
              "city",
              "state",
              "pincode",
              "phone",
            ],
          },
          {
            model: OrderItem,
            as: "OrderItems",
            include: [
              {
                model: Product,
                as: "Product",
                attributes: ["id", "name", "slug"],
                include: [
                  {
                    model: ProductImage,
                    as: "ProductImages",
                    attributes: ["image_url"],
                    separate: true,
                  },
                ],
              },
              {
                model: ProductVariation,
                as: "ProductVariation",
                attributes: ["id", "sku", "price", "attributes"],
                required: false,
                include: [
                  {
                    model: ProductImage,
                    as: "VariationImages",
                    attributes: ["image_url"],
                    separate: true,
                  },
                ],
              },
            ],
          },
          {
            model: OrderStatusHistory,
            as: "OrderStatusHistories",
            order: [["created_at", "DESC"]],
            required: false,
          },
        ],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found with this order number",
        });
      }

      // Determine if it's a guest order or registered user order
      const isGuestOrder = !!order.guest_user_id;
      const customerInfo = isGuestOrder ? order.GuestUser : order.User;

      const orderJson = order.toJSON ? order.toJSON() : order;
      const orderCreatedAt = orderJson.created_at || orderJson.createdAt || null;
      const orderUpdatedAt = orderJson.updated_at || orderJson.updatedAt || null;

      res.json({
        success: true,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            shipping_fee: order.shipping_fee,
            discount_amount: order.discount_amount,
            final_amount: order.final_amount,
            payment_type: order.payment_type,
            status: order.status,
            payment_status: order.payment_status,
            tracking_number: order.tracking_number,
            courier_name: order.courier_name,
            tracking_url: order.tracking_url,
            fship_waybill: order.fship_waybill,
            created_at: orderCreatedAt,
            createdAt: orderCreatedAt,
            updated_at: orderUpdatedAt,
            updatedAt: orderUpdatedAt,
          },
          customer: {
            type: isGuestOrder ? "guest" : "registered",
            info: customerInfo,
          },
          shipping_address: order.ShippingAddress,
          items: order.OrderItems.map((item) => ({
            id: item.id,
            product: {
              id: item.Product.id,
              name: item.Product.name,
              slug: item.Product.slug,
              image: item.ProductVariation?.VariationImages?.[0]?.image_url || item.Product.ProductImages?.[0]?.image_url || null,
            },
            variation: item.ProductVariation
              ? {
                  id: item.ProductVariation.id,
                  sku: item.ProductVariation.sku,
                  price: item.ProductVariation.price,
                  attributes: item.ProductVariation.attributes,
                }
              : null,
            quantity: item.quantity,
            price: item.price,
            total_price: item.subtotal,
          })),
          status_history: order.OrderStatusHistories.map((history) => ({
            id: history.id,
            status: history.status,
            notes: history.notes,
            created_at: history.created_at,
            created_by: history.created_by,
          })),
        },
      });
    } catch (error) {
      logger.error("Error tracking order by order number:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track order",
        error: error.message,
      });
    }
  };


  // Backward-compatibility re-shim for functions migrated OUT of this file.
  // When a function moves to controller/orders/<domain>Controller.js, add a
  // line here so existing `require("./orderController").<fn>` keeps working.
  module.exports.checkAddressQuality = require("./orders/createController.js").checkAddressQuality;
