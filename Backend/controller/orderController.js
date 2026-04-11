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
  const { sequelize } = require("../config/db.js");
  const axios = require('axios');
  const { logger } = require("../config/logging.js");
  // Import FShip service for shipping integration
  const fshipService = require("../services/fshipService.js");
  const { setImmediate } = require("timers");
  const { sendFacebookEvent } = require("../integration/facebookPixel.js");
  const { sendGAEvent } = require("../integration/googleAnalytics.js");
  const settingsHelper = require("../services/settingsHelper");
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

  // Generate unique order number with collision retry (Requirement 5.3)
  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `ORD-${year}${month}${day}-${random}`;
  };

  // Generate a unique order number, retrying up to 3 times on collision
  const generateUniqueOrderNumber = async (transaction) => {
    const { UniqueConstraintError } = require("sequelize");
    for (let attempt = 0; attempt < 3; attempt++) {
      const orderNumber = generateOrderNumber();
      const existing = await Order.findOne({ where: { order_number: orderNumber }, transaction });
      if (!existing) return orderNumber;
    }
    // Fallback: append timestamp for guaranteed uniqueness
    return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  // Calculate shipping fee based on payment type
  const calculateShippingFee = async (paymentType) => {
    try {
      const orderType = paymentType === "cod" ? "cod" : "prepaid";
      const shippingFee = await ShippingFee.findOne({ where: { orderType } });
      return shippingFee ? Number(shippingFee.fee) : orderType === "cod" ? 5.99 : 0.0;
    } catch (error) {
      logger.error("Error calculating shipping fee:", error);
      return orderType === "cod" ? 5.99 : 0.0; // Default values if calculation fails
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

      // ── Input validation (Task 4) ─────────────────────────────────────────
      if (shippingAddress.phone && !PHONE_REGEX.test(String(shippingAddress.phone).replace(/\D/g, '').slice(-10))) {
        await transaction.rollback();
        return res.status(400).json({ message: "Please enter a valid 10-digit mobile number on your delivery address." });
      }
      if (shippingAddress.address && String(shippingAddress.address).trim().length < 15) {
        await transaction.rollback();
        return res.status(400).json({ message: "Address must be at least 15 characters." });
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
          order_number: await generateUniqueOrderNumber(transaction),
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
        createdOrder._itemCount = validatedItems.length;
        orderEmitter.emit('order.created', createdOrder);
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
        const fullName = `${firstName} ${lastName || ''}`.trim();
        user = await User.create({
          username: fullName,
          email: email.toLowerCase(),
          phone: digits,
          password: tempPassword,
          role: 'consumer',
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

  // Get all orders (admin)
  module.exports.getAllOrders = async (req, res) => {
    try {
      const {
        status,
        payment_status,
        payment_type,
        start_date,
        end_date,
        page = 1,
        limit = 20,
        search,
        sort = "createdAt",
        order = "DESC"
      } = req.query;

      const cappedLimit = Math.min(parseInt(limit) || 20, 100);

      logger.debug("=== GET ALL ORDERS DEBUG ===");
      logger.debug("Query parameters:", {
        status,
        payment_status,
        payment_type,
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

      // Date range filter
      if (start_date && end_date) {
        filter.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      }

      // Search functionality
      const searchConditions = [];
      if (search && search.trim()) {
        const searchTerm = search.trim();
        
        // Search in order number
        searchConditions.push({
          order_number: {
            [Op.like]: `%${searchTerm}%`
          }
        });
        
        // Search in final amount
        if (!isNaN(searchTerm)) {
          searchConditions.push({
            final_amount: {
              [Op.like]: `%${searchTerm}%`
            }
          });
        }
        
        // Search in tracking number
        searchConditions.push({
          tracking_number: {
            [Op.like]: `%${searchTerm}%`
          }
        });
        
        // Search in courier name
        searchConditions.push({
          courier_name: {
            [Op.like]: `%${searchTerm}%`
          }
        });
      }

      // Pagination
      const offset = (page - 1) * limit;

      // Build order clause
      const orderClause = [[sort, order.toUpperCase()]];

      // Build the main query
      const queryOptions = {
        where: filter,
        distinct: true,
        col: "id",
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
            ...(search && search.trim() ? {
              where: {
                [Op.or]: [
                  {
                    username: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    email: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  }
                ]
              }
            } : {})
          },
          {
            model: GuestUser,
            as: "GuestUser",
            attributes: ["id", "email", "firstName", "lastName", "phone"],
            required: false,
            ...(search && search.trim() ? {
              where: {
                [Op.or]: [
                  {
                    email: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    firstName: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    lastName: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    phone: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  }
                ]
              }
            } : {})
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
            ...(search && search.trim() ? {
              where: {
                [Op.or]: [
                  {
                    full_name: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    phone: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    address: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    city: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  },
                  {
                    pincode: {
                      [Op.like]: `%${search.trim()}%`
                    }
                  }
                ]
              }
            } : {})
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
        limit: parseInt(limit),
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

      const totalPages = Math.ceil(orders.count / limit);

      logger.debug("Query results:", {
        totalCount: orders.count,
        returnedRows: orders.rows.length,
        limit: parseInt(limit),
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
          limit: parseInt(limit),
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

      res.json({
        orders: orders.rows.map(o => ({
          ...o.toJSON(),
          rto_risk_level: getRtoRiskLevel(o.rto_risk_score || 0),
        })),
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
      if (status === 'shipped') setImmediate(() => orderEmitter.emit('order.shipped', order));
      if (status === 'delivered') setImmediate(() => orderEmitter.emit('order.delivered', order));

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

  // Get FShip tracking info for an order
  module.exports.getFShipTrackingForOrder = async (req, res) => {
    try {
      const { id } = req.params; // order id
      const order = await Order.findByPk(id);
      if (!order || !order.fship_waybill) {
        return res
          .status(404)
          .json({ message: "Order or FShip waybill not found" });
      }
      const tracking = await fshipService.getShipmentStatus(order.fship_waybill);
      res.json({ tracking });
    } catch (error) {
      logger.error("Error fetching FShip tracking:", error);
      res.status(500).json({
        message: "Failed to fetch FShip tracking",
        error: error.message,
      });
    }
  };

  // Get FShip label for an order
  module.exports.getFShipLabelForOrder = async (req, res) => {
    try {
      const { id } = req.params; // order id
      const order = await Order.findByPk(id);
      if (!order || !order.fship_waybill) {
        return res
          .status(404)
          .json({ message: "Order or FShip waybill not found" });
      }
      const labelData = await fshipService.getShippingLabel(order.fship_waybill);
      res.json({ label_data: labelData });
    } catch (error) {
      logger.error("Error fetching FShip label:", error);
      res.status(500).json({
        message: "Failed to fetch FShip label",
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

  // Cancel orders in FShip (bulk)
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
            results.errors.push(`Order ${orderId}: No FShip waybill found`);
            continue;
          }

          const cancelResult = await fshipService.cancelOrder(
            order.fship_waybill,
            "Bulk cancellation"
          );
          
          results.successful++;
          logger.debug(`Order ${orderId} cancelled in FShip successfully`);
          
          // Update local order status
          await order.update({ status: "cancelled" });
          
          // Add status history
          await OrderStatusHistory.create({
            order_id: order.id,
            status: "cancelled",
            notes: "Cancelled via FShip bulk operation",
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
      logger.error("Error cancelling orders in FShip:", error);
      res.status(500).json({
        message: "Failed to cancel orders in FShip",
        error: error.message,
      });
    }
  };

  // Enhanced sync functions with comprehensive order management
  module.exports.syncOrdersWithFShip = async (req, res) => {
    try {
      logger.debug("=== ENHANCED FSHIP SYNC PROCESS START ===");
      logger.debug("Flow: Check sync status → Create if needed → Update status → Handle COD payments");

      // STEP 1: Test FShip connection
      try {
        logger.debug("=== STEP 1: TESTING FSHIP CONNECTION ===");
        const testResult = await fshipService.testConnection();
        if (!testResult.success) {
          throw new Error(testResult.message);
        }
        logger.debug("✅ FSHIP CONNECTION SUCCESS");
      } catch (authError) {
        logger.error("❌ FSHIP CONNECTION FAILED");
        return res.status(400).json({
          success: false,
          message: "FShip connection failed",
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
  module.exports.enhancedSyncSingleOrder = async (order, transaction = null) => {
    const localTransaction = transaction || await sequelize.transaction();
    const shouldCommit = !transaction;

    try {
      logger.debug(`🔍 Enhanced sync for order: ${order.order_number}`);

      // STEP 1: Check if order is already synced
      const isSynced = order.fship_order_id && order.fship_waybill;
      
      if (!isSynced) {
        // STEP 2: Order not synced - Create in FShip
        logger.debug(`📝 Order ${order.order_number} not synced. Creating in FShip...`);
        
        const createResult = await this.createOrderInFShip(order, localTransaction);
        
        if (createResult.success) {
          logger.debug(`✅ Order ${order.order_number} created in FShip`);
          
          if (shouldCommit) await localTransaction.commit();
          
          return {
            success: true,
            action: 'synced',
            status: order.status,
            fship_order_id: createResult.fship_order_id,
            waybill: createResult.waybill,
            message: 'Order created and synced with FShip'
          };
        } else {
          throw new Error(createResult.error);
        }
      } else {
        // STEP 3: Order already synced - Update status
        logger.debug(`🔄 Order ${order.order_number} already synced. Checking for updates...`);
        
        const updateResult = await this.updateOrderStatusFromFShip(order, localTransaction);
        
        if (updateResult.success) {
          logger.debug(`✅ Order ${order.order_number} status updated`);
          
          if (shouldCommit) await localTransaction.commit();
          
          return {
            success: true,
            action: updateResult.statusChanged ? 'updated' : 'skipped',
            status: updateResult.newStatus || order.status,
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

  // Create order in FShip
  module.exports.createOrderInFShip = async (order, transaction) => {
    try {
      logger.debug(`🚀 Creating order ${order.order_number} in FShip...`);

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

      // Prepare order data for FShip
      const fshipOrderData = await this.prepareFShipOrderData(order);
      
      // Create order using enhanced FShip service
      const result = await fshipService.createOrUpdateForwardOrder(fshipOrderData);
      
      logger.debug('=== FShip Create Order Result ===');
      logger.debug('Success:', result.success);
      logger.debug('Order ID:', result.orderId);
      logger.debug('Waybill:', result.waybill);
      logger.debug('Label URL:', result.labelUrl);
      logger.debug('Full Result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        // Always fetch label URL separately using waybill
        let labelUrl = result.labelUrl || null;
        
        if (result.waybill) {
          logger.debug(`📄 Fetching shipping label for waybill: ${result.waybill}`);
          try {
            const labelData = await fshipService.getShippingLabel(result.waybill);
            logger.debug('📦 Label API Response:', JSON.stringify(labelData, null, 2));
            
            // Try multiple possible response structures
            if (labelData) {
              // Check if data is in array format
              if (Array.isArray(labelData.data) && labelData.data.length > 0) {
                labelUrl = labelData.data[0].labelurl || labelData.data[0].label_url || labelData.data[0].LabelUrl;
              }
              // Check if data is direct object
              else if (labelData.data && typeof labelData.data === 'object') {
                labelUrl = labelData.data.labelurl || labelData.data.label_url || labelData.data.LabelUrl;
              }
              // Check root level
              else if (labelData.labelurl || labelData.label_url || labelData.LabelUrl) {
                labelUrl = labelData.labelurl || labelData.label_url || labelData.LabelUrl;
              }
              
              if (labelUrl) {
                logger.debug(`✅ Label URL found: ${labelUrl}`);
              } else {
                logger.debug('⚠️ Label URL not found in response. Full response:', JSON.stringify(labelData, null, 2));
              }
            }
          } catch (labelError) {
            logger.error('❌ Failed to fetch label URL:', labelError.message);
            logger.error('Error details:', labelError);
          }
        }
        
        // Update order with FShip details
        await order.update({
          fship_order_id: result.orderId,
          fship_waybill: result.waybill,
          fship_route_code: result.routeCode,
          fship_label_url: labelUrl,
          fship_courier_id: result.courierId || null,
          courier_name: result.courierName || null,
          tracking_number: result.waybill,
          status: 'processing', // Update status to processing when synced
          fship_last_synced_at: new Date() // Track last sync time
        }, { transaction });

        // Create status history
        await OrderStatusHistory.create({
          order_id: order.id,
          status: 'processing',
          notes: `Order synced with FShip. AWB: ${result.waybill}${result.courierName ? ` - Courier: ${result.courierName}` : ''}`,
          created_by: 'fship_sync_system'
        }, { transaction });

        logger.debug(`✅ Order ${order.order_number} created in FShip with AWB: ${result.waybill}${result.courierName ? `, Courier: ${result.courierName}` : ''}`);
        
        // If courier name not in create response, try to get from shipment summary
        if (!result.courierName && result.waybill) {
          try {
            const shipmentStatus = await fshipService.getShipmentStatus(result.waybill);
            const courierFromSummary = shipmentStatus?.courier_name || shipmentStatus?.courierName || shipmentStatus?.summary?.courier_name || null;
            if (courierFromSummary) {
              await order.update({ courier_name: courierFromSummary }, { transaction });
              logger.debug(`📦 Courier name fetched from shipment summary: ${courierFromSummary}`);
            }
          } catch (courierErr) {
            logger.debug(`⚠️ Could not fetch courier name from shipment summary: ${courierErr.message}`);
          }
        }
        
        return {
          success: true,
          fship_order_id: result.orderId,
          waybill: result.waybill,
          route_code: result.routeCode
        };
      } else {
        throw new Error(result.message || 'Failed to create order in FShip');
      }

    } catch (error) {
      logger.error(`❌ Failed to create order ${order.order_number} in FShip:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Update order status from FShip
  module.exports.updateOrderStatusFromFShip = async (order, transaction) => {
    try {
      logger.debug(`🔄 Updating status for order ${order.order_number} from FShip...`);
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
        logger.debug(`📄 Label URL missing. Constructing label URL for waybill: ${waybill}`);
        
        // FShip label URL format: https://manifest.fship.in/files/label_html/label_{WAYBILL}_{FSHIP_ORDER_ID}_TH.pdf
        const fshipOrderId = order.fship_order_id;
        
        if (fshipOrderId) {
          const labelUrl = `https://manifest.fship.in/files/label_html/label_${waybill}_${fshipOrderId}_TH.pdf`;
          
          logger.debug(`✅ Label URL constructed: ${labelUrl}`);
          
          try {
            await order.update({ 
              fship_label_url: labelUrl,
              notes: order.notes ? `${order.notes}\nLabel URL constructed from waybill and FShip order ID` : 'Label URL constructed from waybill and FShip order ID'
            }, { transaction });
            await order.reload({ transaction });
            logger.debug(`💾 Label URL saved to database`);
          } catch (updateError) {
            logger.error('❌ Failed to save label URL:', updateError.message);
          }
        } else {
          logger.debug('⚠️ FShip order ID not found, cannot construct label URL');
        }
      } else {
        logger.debug(`✓ Label URL already exists: ${order.fship_label_url}`);
      }

      // Get tracking history from FShip
      const trackingResult = await fshipService.getTrackingHistory(waybill);
      
      if (trackingResult && trackingResult.summary) {
        const fshipStatus = trackingResult.summary.status;
        const newStatus = fshipService.mapFShipStatusToCrossCoin(fshipStatus);
        
        // Extract courier name from tracking data
        const courierFromTracking = trackingResult.summary.courier_name || trackingResult.summary.courierName || trackingResult.courier_name || trackingResult.courierName || trackingResult.summary.courier || null;
        if (courierFromTracking && courierFromTracking !== order.courier_name) {
          await order.update({ courier_name: courierFromTracking }, { transaction });
          logger.debug(`📦 Courier name updated from tracking: ${courierFromTracking}`);
        }
        
        logger.debug(`📊 FShip status: "${fshipStatus}" → CrossCoin status: "${newStatus}"`);
        
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
            notes: `Status updated from FShip. FShip status: ${fshipStatus}${updateData.payment_status ? `. Payment status: ${updateData.payment_status}` : ''}`,
            created_by: 'fship_sync_system'
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
      } else {
        return {
          success: false,
          error: 'No tracking data found in FShip'
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
  module.exports.prepareFShipOrderData = async (order) => {
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

      // Prepare FShip order data
      const fshipOrderData = {
        orderId: order.order_number,
        customer_Name: customerName,
        customer_Mobile: customerMobile,
        customer_Emailid: customerEmail,
        customer_Address: shippingAddress?.address || '',
        landMark: '',
        customer_Address_Type: 'Home',
        customer_PinCode: shippingAddress?.pincode || '',
        customer_City: shippingAddress?.city || '',
        customer_State: shippingAddress?.state || '',
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
        pick_Address_ID: parseInt(await settingsHelper.getSetting(1, 'FSHIP_DEFAULT_WAREHOUSE_ID', '227729')),
        return_Address_ID: parseInt(await settingsHelper.getSetting(1, 'FSHIP_DEFAULT_WAREHOUSE_ID', '227729')),
        products: products,
        courierId: 0 // Auto-selection
      };

      return fshipOrderData;

    } catch (error) {
      logger.error('Error preparing FShip order data:', error);
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
      
      // Test FShip connection
      try {
        const testResult = await fshipService.testConnection();
        if (!testResult.success) {
          throw new Error(testResult.message);
        }
        logger.debug("✅ FShip connection successful");
      } catch (authError) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "FShip connection failed",
          error: authError.message
        });
      }
      
      // Use enhanced sync logic
      const syncResult = await this.enhancedSyncSingleOrder(order, transaction);
      
      if (syncResult.success) {
        await transaction.commit();
        
        return res.json({
          success: true,
          message: `Order ${order.order_number} sync completed`,
          data: {
            order: {
              id: order.id,
              order_number: order.order_number,
              status: syncResult.status,
              fship_order_id: syncResult.fship_order_id,
              waybill: syncResult.waybill,
              action: syncResult.action
            },
            result: syncResult
          }
        });
      } else {
        await transaction.rollback();
        
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
      logger.error("Error tracking order by order number:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track order",
        error: error.message,
      });
    }
  };

  // ===================================================================
  // RTO (Return to Origin) Management Functions
  // ===================================================================

  // Mark order as RTO and handle stock restoration
  module.exports.markOrderAsRTO = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { reason, notes } = req.body;
      const adminId = req.user?.id;

      logger.debug(`=== MARKING ORDER AS RTO: ${id} ===`);

      // Find the order with all necessary includes
      const order = await Order.findByPk(id, {
        include: [
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
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      // Check if order can be marked as RTO
      const validStatuses = ['shipped', 'out for delivery', 'undelivered', 'in transit'];
      if (!validStatuses.includes(order.status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot mark order as RTO. Current status: ${order.status}. Valid statuses: ${validStatuses.join(', ')}`
        });
      }

      // Check if already RTO
      if (order.status === 'rto') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Order is already marked as RTO"
        });
      }

      logger.debug(`Order ${order.order_number} current status: ${order.status}`);

      // Prepare update data
      const updateData = {
        status: 'rto',
        updated_at: new Date()
      };

      // Handle payment status based on payment type
      if (order.payment_type === 'cod') {
        updateData.payment_status = 'failed';
        logger.debug(`💳 COD payment marked as failed`);
      } else if (order.payment_status === 'paid') {
        // Prepaid order - initiate refund
        updateData.payment_status = 'refunded';
        
        // Update payment record
        const payment = order.Payment || null;
        if (payment) {
          await payment.update({
            status: 'refunded',
            notes: `Manual RTO refund. Reason: ${reason || 'Return to Origin'}. ${notes || ''}`
          }, { transaction });
          
          logger.debug(`💰 Prepaid order marked for refund: ₹${order.final_amount}`);
        }
      }

      // Update order status to RTO
      await order.update(updateData, { transaction });

      // Create status history entry
      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'rto',
        notes: `Order marked as RTO. Reason: ${reason || 'Not specified'}. ${notes || ''}${order.payment_type !== 'cod' && order.payment_status === 'paid' ? ' - Refund initiated' : ''}`,
        updated_by: adminId,
        created_by: adminId ? 'admin' : 'system'
      }, { transaction });

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

          logger.debug(`📦 Restored variation stock: ${item.ProductVariation.sku} - ${stockBefore} → ${stockAfter} (+${item.quantity})`);
        } else {
          // This system manages stock only through variations
          // Products without variations should not reach this point
          logger.error(`⚠️ Warning: RTO stock restoration attempted for product ${item.Product.name} without variation`);
          stockBefore = 0;
          stockAfter = 0;
        }

        // Log stock restoration
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
            adminId ? `admin_${adminId}` : 'system',
            `Stock restored for RTO order: ${order.order_number}`
          ],
          transaction
        });

        stockRestorations.push({
          product_id: item.product_id,
          product_name: item.Product.name,
          variation_id: item.variation_id,
          variation_sku: item.ProductVariation?.sku || null,
          quantity_restored: item.quantity,
          stock_before: stockBefore,
          stock_after: stockAfter
        });
      }

      // Cancel in FShip if exists
      if (order.fship_waybill) {
        try {
          await fshipService.cancelOrder(
            order.fship_waybill,
            `RTO - ${reason || 'Return to Origin'}`
          );
          logger.debug(`✅ FShip order cancelled for RTO: ${order.fship_waybill}`);
        } catch (fshipError) {
          logger.error(`❌ Failed to cancel FShip order: ${fshipError.message}`);
          // Don't fail the entire operation
        }
      }

      await transaction.commit();

      logger.debug(`✅ Order ${order.order_number} successfully marked as RTO`);

      res.json({
        success: true,
        message: `Order ${order.order_number} successfully marked as RTO`,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            status: 'rto',
            payment_status: updateData.payment_status,
            payment_type: order.payment_type,
            final_amount: order.final_amount,
            refund_initiated: order.payment_type !== 'cod' && order.payment_status === 'paid'
          },
          stock_restorations: stockRestorations,
          total_items_restored: stockRestorations.length,
          total_quantity_restored: stockRestorations.reduce((sum, item) => sum + item.quantity_restored, 0)
        }
      });

    } catch (error) {
      await transaction.rollback();
      logger.error("❌ Error marking order as RTO:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark order as RTO",
        error: error.message
      });
    }
  };

  // Get RTO orders with detailed information
  module.exports.getRTOOrders = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        start_date,
        end_date,
        search,
        sort = 'created_at',
        order = 'DESC'
      } = req.query;

      logger.debug("=== GET RTO ORDERS ===");

      // Build filter
      const filter = { status: 'rto' };

      // Date range filter
      if (start_date && end_date) {
        filter.created_at = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      // Search functionality
      const searchConditions = [];
      if (search && search.trim()) {
        const searchTerm = search.trim();
        
        searchConditions.push(
          { order_number: { [Op.like]: `%${searchTerm}%` } },
          { tracking_number: { [Op.like]: `%${searchTerm}%` } },
          { courier_name: { [Op.like]: `%${searchTerm}%` } }
        );
      }

      // Pagination
      const offset = (page - 1) * limit;

      // Build query options
      const queryOptions = {
        where: filter,
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "username", "email"],
            required: false,
            ...(search && search.trim() ? {
              where: {
                [Op.or]: [
                  { username: { [Op.like]: `%${search.trim()}%` } },
                  { email: { [Op.like]: `%${search.trim()}%` } }
                ]
              }
            } : {})
          },
          {
            model: GuestUser,
            as: "GuestUser",
            attributes: ["id", "email", "firstName", "lastName", "phone"],
            required: false,
            ...(search && search.trim() ? {
              where: {
                [Op.or]: [
                  { email: { [Op.like]: `%${search.trim()}%` } },
                  { firstName: { [Op.like]: `%${search.trim()}%` } },
                  { lastName: { [Op.like]: `%${search.trim()}%` } }
                ]
              }
            } : {})
          },
          {
            model: ShippingAddress,
            as: "ShippingAddress",
            attributes: ["id", "full_name", "phone", "address", "city", "state", "pincode"]
          },
          {
            model: OrderItem,
            as: "OrderItems",
            include: [
              {
                model: Product,
                as: "Product",
                attributes: ["id", "name", "slug"]
              },
              {
                model: ProductVariation,
                as: "ProductVariation",
                attributes: ["id", "sku", "price", "attributes"],
                required: false
              }
            ]
          }
        ],
        order: [[sort, order.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      };

      // Add search conditions to main where clause if any
      if (searchConditions.length > 0) {
        queryOptions.where = {
          [Op.and]: [
            filter,
            { [Op.or]: searchConditions }
          ]
        };
      }

      const rtoOrders = await Order.findAndCountAll(queryOptions);

      // Get stock restoration details for these orders
      const orderIds = rtoOrders.rows.map(order => order.id);
      let stockRestorations = [];
      
      if (orderIds.length > 0) {
        const [restorationResults] = await sequelize.query(`
          SELECT 
            rsr.*,
            p.name as product_name,
            pv.sku as variation_sku
          FROM rto_stock_restoration rsr
          LEFT JOIN products p ON rsr.product_id = p.id
          LEFT JOIN product_variations pv ON rsr.variation_id = pv.id
          WHERE rsr.order_id IN (${orderIds.map(() => '?').join(',')})
          ORDER BY rsr.restoration_date DESC
        `, {
          replacements: orderIds
        });
        
        stockRestorations = restorationResults;
      }

      // Enhance orders with restoration data
      const enhancedOrders = rtoOrders.rows.map(order => {
        const orderRestorations = stockRestorations.filter(r => r.order_id === order.id);
        
        return {
          ...order.toJSON(),
          stock_restorations: orderRestorations,
          total_quantity_restored: orderRestorations.reduce((sum, r) => sum + r.quantity_restored, 0),
          restoration_count: orderRestorations.length,
          last_restoration_date: orderRestorations.length > 0 ? orderRestorations[0].restoration_date : null
        };
      });

      const totalPages = Math.ceil(rtoOrders.count / limit);

      res.json({
        success: true,
        data: {
          orders: enhancedOrders,
          pagination: {
            total: rtoOrders.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages
          },
          summary: {
            total_rto_orders: rtoOrders.count,
            total_amount: enhancedOrders.reduce((sum, order) => sum + parseFloat(order.final_amount || 0), 0),
            total_quantity_restored: enhancedOrders.reduce((sum, order) => sum + order.total_quantity_restored, 0)
          }
        }
      });

    } catch (error) {
      logger.error("Error getting RTO orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get RTO orders",
        error: error.message
      });
    }
  };

  // Get RTO statistics and analytics
  module.exports.getRTOStats = async (req, res) => {
    try {
      logger.debug("=== GET RTO STATISTICS ===");

      // Basic RTO stats
      const [basicStats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_rto_orders,
          SUM(final_amount) as total_amount_lost,
          AVG(final_amount) as avg_order_value,
          COUNT(CASE WHEN payment_type = 'cod' THEN 1 END) as cod_orders,
          COUNT(CASE WHEN payment_type != 'cod' THEN 1 END) as prepaid_orders,
          MIN(created_at) as oldest_rto,
          MAX(created_at) as newest_rto
        FROM orders 
        WHERE status = 'rto'
      `);

      // RTO by courier
      const [courierStats] = await sequelize.query(`
        SELECT 
          COALESCE(courier_name, 'Unknown') as courier,
          COUNT(*) as rto_count,
          SUM(final_amount) as total_amount,
          AVG(final_amount) as avg_amount
        FROM orders 
        WHERE status = 'rto'
        GROUP BY courier_name
        ORDER BY rto_count DESC
      `);

      // RTO by location (top 10)
      const [locationStats] = await sequelize.query(`
        SELECT 
          sa.state,
          sa.city,
          COUNT(DISTINCT o.id) as rto_count,
          SUM(o.final_amount) as total_amount
        FROM orders o
        LEFT JOIN shipping_addresses sa ON (
          (o.user_id IS NOT NULL AND sa.user_id = o.user_id) OR
          (o.guest_user_id IS NOT NULL AND sa.guest_user_id = o.guest_user_id)
        )
        WHERE o.status = 'rto' AND sa.state IS NOT NULL
        GROUP BY sa.state, sa.city
        ORDER BY rto_count DESC
        LIMIT 10
      `);

      // Stock restoration summary
      const [stockStats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_restorations,
          SUM(quantity_restored) as total_quantity_restored,
          COUNT(DISTINCT order_id) as orders_processed,
          COUNT(DISTINCT product_id) as products_affected,
          AVG(quantity_restored) as avg_quantity_per_restoration
        FROM rto_stock_restoration
      `);

      // Monthly RTO trend (last 6 months)
      const [monthlyTrend] = await sequelize.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as rto_count,
          SUM(final_amount) as total_amount
        FROM orders 
        WHERE status = 'rto' 
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC
      `);

      // Product-wise RTO impact
      const [productImpact] = await sequelize.query(`
        SELECT 
          p.name as product_name,
          COUNT(DISTINCT o.id) as rto_orders,
          SUM(oi.quantity) as total_quantity_lost,
          SUM(oi.subtotal) as revenue_lost,
          AVG(oi.price) as avg_selling_price
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.status = 'rto'
        GROUP BY p.id, p.name
        ORDER BY total_quantity_lost DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          overview: basicStats[0] || {},
          courier_breakdown: courierStats || [],
          location_breakdown: locationStats || [],
          stock_restoration: stockStats[0] || {},
          monthly_trend: monthlyTrend || [],
          product_impact: productImpact || [],
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error("Error getting RTO statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get RTO statistics",
        error: error.message
      });
    }
  };

  // Bulk mark orders as RTO
  module.exports.bulkMarkOrdersAsRTO = async (req, res) => {
    try {
      const { orderIds, reason, notes } = req.body;
      const adminId = req.user?.id;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required"
        });
      }

      logger.debug(`=== BULK RTO PROCESSING: ${orderIds.length} orders ===`);

      const results = {
        total: orderIds.length,
        successful: 0,
        failed: 0,
        errors: [],
        processed_orders: []
      };

      // Process each order individually to ensure data integrity
      for (const orderId of orderIds) {
        const transaction = await sequelize.transaction();
        
        try {
          // Use the existing markOrderAsRTO logic
          const mockReq = {
            params: { id: orderId },
            body: { reason, notes },
            user: { id: adminId }
          };
          
          const mockRes = {
            status: (code) => ({
              json: (data) => {
                if (code === 200) {
                  results.successful++;
                  results.processed_orders.push({
                    order_id: orderId,
                    status: 'success',
                    data: data.data
                  });
                } else {
                  results.failed++;
                  results.errors.push({
                    order_id: orderId,
                    error: data.message || 'Unknown error'
                  });
                }
              }
            }),
            json: (data) => {
              results.successful++;
              results.processed_orders.push({
                order_id: orderId,
                status: 'success',
                data: data.data
              });
            }
          };

          // Find and process the order
          const order = await Order.findByPk(orderId, {
            include: [
              {
                model: OrderItem,
                as: "OrderItems",
                include: [
                  { model: Product, as: "Product" },
                  { model: ProductVariation, as: "ProductVariation" }
                ]
              }
            ],
            transaction
          });

          if (!order) {
            results.failed++;
            results.errors.push({
              order_id: orderId,
              error: "Order not found"
            });
            await transaction.rollback();
            continue;
          }

          // Check if order can be marked as RTO
          const validStatuses = ['shipped', 'out for delivery', 'undelivered', 'in transit'];
          if (!validStatuses.includes(order.status)) {
            results.failed++;
            results.errors.push({
              order_id: orderId,
              error: `Invalid status: ${order.status}. Valid statuses: ${validStatuses.join(', ')}`
            });
            await transaction.rollback();
            continue;
          }

          if (order.status === 'rto') {
            results.failed++;
            results.errors.push({
              order_id: orderId,
              error: "Order is already marked as RTO"
            });
            await transaction.rollback();
            continue;
          }

          // Process the RTO
          await order.update({
            status: 'rto',
            payment_status: order.payment_type === 'cod' ? 'failed' : (order.payment_status === 'paid' ? 'refunded' : order.payment_status),
            updated_at: new Date()
          }, { transaction });

          // Handle refund for prepaid orders
          if (order.payment_type !== 'cod' && order.payment_status === 'paid') {
            const payment = await Payment.findOne({
              where: { order_id: order.id },
              transaction
            });
            
            if (payment) {
              await payment.update({
                status: 'refunded',
                notes: `Bulk RTO refund. Reason: ${reason || 'Return to Origin'}. ${notes || ''}`
              }, { transaction });
            }
          }

          // Create status history
          await OrderStatusHistory.create({
            order_id: order.id,
            status: 'rto',
            notes: `Bulk RTO processing. Reason: ${reason || 'Not specified'}. ${notes || ''}${order.payment_type !== 'cod' && order.payment_status === 'paid' ? ' - Refund initiated' : ''}`,
            updated_by: adminId,
            created_by: adminId ? 'admin' : 'system'
          }, { transaction });

          // Restore stock
          const stockRestorations = [];
          for (const item of order.OrderItems) {
            let stockBefore = 0;
            let stockAfter = 0;

            if (item.variation_id && item.ProductVariation) {
              stockBefore = item.ProductVariation.stock || 0;
              stockAfter = stockBefore + item.quantity;
              
              await item.ProductVariation.update({
                stock: stockAfter
              }, { transaction });
            } else {
              // This system manages stock only through variations
              logger.error(`Warning: Bulk RTO stock restoration attempted for product without variation`);
              stockBefore = 0;
              stockAfter = 0;
            }

            // Log restoration
            await sequelize.query(`
              INSERT INTO rto_stock_restoration (
                order_id, order_number, product_id, variation_id, 
                quantity_restored, stock_before, stock_after, restored_by, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, {
              replacements: [
                order.id, order.order_number, item.product_id, item.variation_id,
                item.quantity, stockBefore, stockAfter,
                adminId ? `admin_${adminId}` : 'bulk_system',
                `Bulk RTO stock restoration: ${order.order_number}`
              ],
              transaction
            });

            stockRestorations.push({
              product_id: item.product_id,
              quantity_restored: item.quantity,
              stock_before: stockBefore,
              stock_after: stockAfter
            });
          }

          await transaction.commit();
          
          results.successful++;
          results.processed_orders.push({
            order_id: orderId,
            order_number: order.order_number,
            status: 'success',
            stock_restorations: stockRestorations.length,
            total_quantity_restored: stockRestorations.reduce((sum, item) => sum + item.quantity_restored, 0)
          });

          logger.debug(`✅ Order ${order.order_number} processed successfully`);

        } catch (error) {
          await transaction.rollback();
          results.failed++;
          results.errors.push({
            order_id: orderId,
            error: error.message
          });
          logger.error(`❌ Failed to process order ${orderId}:`, error.message);
        }
      }

      logger.debug(`=== BULK RTO COMPLETED: ${results.successful}/${results.total} successful ===`);

      res.json({
        success: true,
        message: `Bulk RTO processing completed: ${results.successful}/${results.total} orders processed successfully`,
        data: results
      });

    } catch (error) {
      logger.error("Error in bulk RTO processing:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process bulk RTO",
        error: error.message
      });
    }
  };

  // Get stock restoration history
  module.exports.getStockRestorationHistory = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        order_id,
        product_id,
        start_date,
        end_date
      } = req.query;

      logger.debug("=== GET STOCK RESTORATION HISTORY ===");

      // Build filter conditions
      const whereConditions = [];
      const replacements = [];

      if (order_id) {
        whereConditions.push('rsr.order_id = ?');
        replacements.push(order_id);
      }

      if (product_id) {
        whereConditions.push('rsr.product_id = ?');
        replacements.push(product_id);
      }

      if (start_date && end_date) {
        whereConditions.push('rsr.restoration_date BETWEEN ? AND ?');
        replacements.push(start_date, end_date);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get total count
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM rto_stock_restoration rsr
        ${whereClause}
      `, { replacements });

      const total = countResult[0].total;
      const offset = (page - 1) * limit;

      // Get restoration history with details
      const [restorations] = await sequelize.query(`
        SELECT 
          rsr.*,
          p.name as product_name,
          p.slug as product_slug,
          pv.sku as variation_sku,
          pv.attributes as variation_attributes,
          o.order_number,
          o.status as order_status,
          o.payment_type,
          o.final_amount as order_amount
        FROM rto_stock_restoration rsr
        LEFT JOIN products p ON rsr.product_id = p.id
        LEFT JOIN product_variations pv ON rsr.variation_id = pv.id
        LEFT JOIN orders o ON rsr.order_id = o.id
        ${whereClause}
        ORDER BY rsr.restoration_date DESC
        LIMIT ? OFFSET ?
      `, {
        replacements: [...replacements, parseInt(limit), offset]
      });

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          restorations,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages
          },
          summary: {
            total_restorations: total,
            total_quantity_restored: restorations.reduce((sum, r) => sum + r.quantity_restored, 0),
            unique_orders: [...new Set(restorations.map(r => r.order_id))].length,
            unique_products: [...new Set(restorations.map(r => r.product_id))].length
          }
        }
      });

    } catch (error) {
      logger.error("Error getting stock restoration history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get stock restoration history",
        error: error.message
      });
    }
  };


  // Export delivered orders to Excel
  module.exports.exportDeliveredOrders = async (req, res) => {
    logger.debug('=== Export Delivered Orders Endpoint Hit ===');
    
    try {
      const { startDate, endDate } = req.query;
      
      logger.debug('Start Date:', startDate);
      logger.debug('End Date:', endDate);

      // Build query conditions for orders with delivered status
      const whereConditions = {
        status: 'delivered'
      };

      // Build date filter for OrderStatusHistory (delivery date)
      let statusHistoryWhere = {
        status: 'delivered'
      };

      // Add date filter for delivery date if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        statusHistoryWhere.createdAt = {
          [Op.between]: [start, end]
        };
        logger.debug('Delivery date range filter applied:', start, 'to', end);
      } else if (startDate) {
        statusHistoryWhere.createdAt = {
          [Op.gte]: new Date(startDate)
        };
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        statusHistoryWhere.createdAt = {
          [Op.lte]: end
        };
      }

      logger.debug('Query conditions:', JSON.stringify(whereConditions, null, 2));
      logger.debug('Status history conditions:', JSON.stringify(statusHistoryWhere, null, 2));

      // Fetch delivered orders with all related data
      logger.debug('Fetching orders from database...');
      let orders;
      try {
        orders = await Order.findAll({
          where: whereConditions,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'username', 'email'],
              required: false
            },
            {
              model: GuestUser,
              as: 'GuestUser',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
              required: false
            },
            {
              model: ShippingAddress,
              as: 'ShippingAddress',
              attributes: ['full_name', 'phone', 'address', 'city', 'state', 'pincode', 'country'],
              required: false
            },
            {
              model: OrderItem,
              as: 'OrderItems',
              required: false,
              include: [
                {
                  model: Product,
                  as: 'Product',
                  attributes: ['id', 'name', 'slug'],
                  required: false
                },
                {
                  model: ProductVariation,
                  as: 'ProductVariation',
                  attributes: ['id', 'sku', 'attributes'],
                  required: false
                }
              ]
            },
            {
              model: OrderStatusHistory,
              as: 'OrderStatusHistories',
              where: statusHistoryWhere,
              required: true, // Only include orders with matching delivery date
              attributes: ['status', 'createdAt'],
              separate: false
            }
          ],
          order: [['createdAt', 'DESC']]
        });
        logger.debug('Database query successful. Found orders:', orders.length);
      } catch (dbError) {
        logger.error('Database query error:', dbError.message);
        logger.error('Database error stack:', dbError.stack);
        throw new Error(`Database query failed: ${dbError.message}`);
      }

      if (orders.length === 0) {
        logger.debug('No orders found, returning empty response');
        return res.status(200).json({
          success: true,
          message: 'No delivered orders found for the selected date range',
          count: 0
        });
      }

      logger.debug('Processing orders for Excel export...');

      // Prepare data for Excel
      const excelData = [];

      orders.forEach(order => {
        const customerName = order.User?.username || 
                            (order.GuestUser ? `${order.GuestUser.firstName} ${order.GuestUser.lastName}` : 'N/A');
        const customerEmail = order.User?.email || order.GuestUser?.email || 'N/A';
        const customerPhone = order.GuestUser?.phone || order.ShippingAddress?.phone || 'N/A';
        const customerType = order.GuestUser ? 'Guest' : 'Registered';

        // Shipping address
        const shippingName = order.ShippingAddress?.full_name || 'N/A';
        const shippingPhone = order.ShippingAddress?.phone || 'N/A';
        const shippingAddress = order.ShippingAddress?.address || 'N/A';
        const shippingCity = order.ShippingAddress?.city || 'N/A';
        const shippingState = order.ShippingAddress?.state || 'N/A';
        const shippingPincode = order.ShippingAddress?.pincode || 'N/A';
        const shippingCountry = order.ShippingAddress?.country || 'India';

        // Order details
        const orderNumber = order.order_number;
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');
        
        // Get actual delivery date from status history
        const deliveredStatusHistory = order.OrderStatusHistories?.find(h => h.status === 'delivered');
        const deliveryDate = deliveredStatusHistory 
          ? new Date(deliveredStatusHistory.createdAt).toLocaleDateString('en-IN') 
          : 'N/A';
        
        // Payment details
        const paymentType = order.payment_type === 'cod' ? 'COD' : 'Prepaid';
        const paymentStatus = order.payment_status === 'paid' ? 'Paid' : 'Pending';
        
        // Shipping details
        const awbNumber = order.fship_waybill || 'N/A';
        const courierName = order.courier_name || 'N/A';
        const trackingNumber = order.tracking_number || 'N/A';

        // Order totals
        const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
        const shippingFee = parseFloat(order.shipping_fee || 0).toFixed(2);
        const discountAmount = parseFloat(order.discount_amount || 0).toFixed(2);
        const finalAmount = parseFloat(order.final_amount || 0).toFixed(2);

        // Add each order item as a separate row
        if (order.OrderItems && order.OrderItems.length > 0) {
          order.OrderItems.forEach((item, index) => {
            const productName = item.Product?.name || 'N/A';
            const sku = item.ProductVariation?.sku || 'N/A';
            const quantity = item.quantity || 0;
            const price = parseFloat(item.price || 0).toFixed(2);
            const itemSubtotal = parseFloat(item.subtotal || 0).toFixed(2);

            // Parse attributes
            let attributes = '';
            if (item.ProductVariation?.attributes) {
              try {
                const attrs = typeof item.ProductVariation.attributes === 'string' 
                  ? JSON.parse(item.ProductVariation.attributes) 
                  : item.ProductVariation.attributes;
                
                const attrParts = [];
                if (attrs.size) attrParts.push(`Size: ${Array.isArray(attrs.size) ? attrs.size.join(', ') : attrs.size}`);
                if (attrs.color) attrParts.push(`Color: ${Array.isArray(attrs.color) ? attrs.color.join(', ') : attrs.color}`);
                attributes = attrParts.join(' | ');
              } catch (e) {
                attributes = 'N/A';
              }
            }

            excelData.push({
              'Order Number': orderNumber,
              'Order Date': orderDate,
              'Delivery Date': deliveryDate,
              'Customer Name': customerName,
              'Customer Email': customerEmail,
              'Customer Phone': customerPhone,
              'Customer Type': customerType,
              'Shipping Name': shippingName,
              'Shipping Phone': shippingPhone,
              'Shipping Address': shippingAddress,
              'City': shippingCity,
              'State': shippingState,
              'Pincode': shippingPincode,
              'Country': shippingCountry,
              'Product Name': productName,
              'SKU': sku,
              'Attributes': attributes,
              'Quantity': quantity,
              'Price per Unit': price,
              'Item Subtotal': itemSubtotal,
              'Order Subtotal': index === 0 ? subtotal : '',
              'Shipping Fee': index === 0 ? shippingFee : '',
              'Discount': index === 0 ? discountAmount : '',
              'Final Amount': index === 0 ? finalAmount : '',
              'Payment Type': paymentType,
              'Payment Status': paymentStatus,
              'AWB Number': awbNumber,
              'Courier': courierName,
              'Tracking Number': trackingNumber,
              'Order Status': 'Delivered'
            });
          });
        } else {
          // If no items, add order without product details
          excelData.push({
            'Order Number': orderNumber,
            'Order Date': orderDate,
            'Delivery Date': deliveryDate,
            'Customer Name': customerName,
            'Customer Email': customerEmail,
            'Customer Phone': customerPhone,
            'Customer Type': customerType,
            'Shipping Name': shippingName,
            'Shipping Phone': shippingPhone,
            'Shipping Address': shippingAddress,
            'City': shippingCity,
            'State': shippingState,
            'Pincode': shippingPincode,
            'Country': shippingCountry,
            'Product Name': 'N/A',
            'SKU': 'N/A',
            'Attributes': 'N/A',
            'Quantity': 0,
            'Price per Unit': '0.00',
            'Item Subtotal': '0.00',
            'Order Subtotal': subtotal,
            'Shipping Fee': shippingFee,
            'Discount': discountAmount,
            'Final Amount': finalAmount,
            'Payment Type': paymentType,
            'Payment Status': paymentStatus,
            'AWB Number': awbNumber,
            'Courier': courierName,
            'Tracking Number': trackingNumber,
            'Order Status': 'Delivered'
          });
        }
      });

      logger.debug('Excel data prepared. Total rows:', excelData.length);

      // Create workbook and worksheet
      logger.debug('Creating Excel workbook...');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      logger.debug('Worksheet created successfully');

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Order Number
        { wch: 12 }, // Order Date
        { wch: 12 }, // Delivery Date
        { wch: 20 }, // Customer Name
        { wch: 25 }, // Customer Email
        { wch: 15 }, // Customer Phone
        { wch: 12 }, // Customer Type
        { wch: 20 }, // Shipping Name
        { wch: 15 }, // Shipping Phone
        { wch: 35 }, // Shipping Address
        { wch: 15 }, // City
        { wch: 15 }, // State
        { wch: 10 }, // Pincode
        { wch: 10 }, // Country
        { wch: 30 }, // Product Name
        { wch: 15 }, // SKU
        { wch: 25 }, // Attributes
        { wch: 10 }, // Quantity
        { wch: 12 }, // Price per Unit
        { wch: 12 }, // Item Subtotal
        { wch: 12 }, // Order Subtotal
        { wch: 12 }, // Shipping Fee
        { wch: 10 }, // Discount
        { wch: 12 }, // Final Amount
        { wch: 12 }, // Payment Type
        { wch: 12 }, // Payment Status
        { wch: 15 }, // AWB Number
        { wch: 15 }, // Courier
        { wch: 15 }, // Tracking Number
        { wch: 12 }  // Order Status
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Delivered Orders');
      logger.debug('Worksheet added to workbook');

      // Generate buffer
      logger.debug('Generating Excel buffer...');
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      logger.debug('Excel buffer generated. Size:', excelBuffer.length, 'bytes');

      // Set response headers
      const filename = `Delivered_Orders_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`;
      logger.debug('Setting response headers. Filename:', filename);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Send the file
      logger.debug('Sending Excel file...');
      res.send(excelBuffer);
      logger.debug('Export completed successfully!');

    } catch (error) {
      logger.error('=== Error exporting delivered orders ===');
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
      logger.error('Error details:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to export delivered orders',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

  // ============================================
  // FShip Label Management Functions
  // ============================================

  // Mark label as downloaded
  module.exports.markLabelDownloaded = async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const order = await Order.findByPk(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (!order.fship_label_url) {
        return res.status(400).json({
          success: false,
          message: 'No shipping label available for this order'
        });
      }

      // Update order
      await order.update({
        fship_label_downloaded: true,
        fship_label_downloaded_at: new Date(),
        fship_label_downloaded_by: userId
      });

      // Create download history record
      await FShipLabelDownload.create({
        order_id: orderId,
        user_id: userId,
        download_type: 'single',
        ip_address: ipAddress
      });

      res.status(200).json({
        success: true,
        message: 'Label marked as downloaded',
        data: order
      });
    } catch (error) {
      logger.error('Error marking label as downloaded:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking label as downloaded',
        error: error.message
      });
    }
  };

  // Download single label
  module.exports.downloadLabel = async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const order = await Order.findByPk(orderId);
      
      if (!order || !order.fship_label_url) {
        return res.status(404).json({
          success: false,
          message: 'Label not found'
        });
      }

      // Download the label from FShip URL
      const response = await axios.get(order.fship_label_url, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });

      // Mark as downloaded
      await order.update({
        fship_label_downloaded: true,
        fship_label_downloaded_at: new Date(),
        fship_label_downloaded_by: userId
      });

      // Create download history
      await FShipLabelDownload.create({
        order_id: orderId,
        user_id: userId,
        download_type: 'single',
        ip_address: ipAddress
      });

      // Send file to client
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=label-${order.order_number}.pdf`);
      res.send(Buffer.from(response.data));
    } catch (error) {
      logger.error('Error downloading label:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading label',
        error: error.message
      });
    }
  };

  // Bulk download labels
  module.exports.bulkDownloadLabels = async (req, res) => {
    try {
      const { orderIds } = req.body; // Array of order IDs
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide order IDs'
        });
      }

      // Fetch orders with labels
      const orders = await Order.findAll({
        where: {
          id: orderIds,
          fship_label_url: { [Op.ne]: null }
        }
      });

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No labels found for selected orders'
        });
      }

      // Import pdf-lib for merging PDFs
      const { PDFDocument } = require('pdf-lib');
      
      logger.debug('=== Starting PDF merge process ===');
      logger.debug(`Merging ${orders.length} labels`);
      
      // Create a new merged PDF document
      const mergedPdf = await PDFDocument.create();

      // Download and merge each label
      for (const order of orders) {
        try {
          const response = await axios.get(order.fship_label_url, {
            responseType: 'arraybuffer',
            timeout: 30000
          });

          // Load the PDF
          const pdfDoc = await PDFDocument.load(response.data);
          
          // Copy all pages from this PDF to the merged PDF
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
          });

          // Mark as downloaded
          await order.update({
            fship_label_downloaded: true,
            fship_label_downloaded_at: new Date(),
            fship_label_downloaded_by: userId
          });

          // Create download history
          await FShipLabelDownload.create({
            order_id: order.id,
            user_id: userId,
            download_type: 'bulk',
            ip_address: ipAddress
          });
        } catch (error) {
          logger.error(`Error downloading label for order ${order.id}:`, error);
        }
      }

      // Save the merged PDF
      const mergedPdfBytes = await mergedPdf.save();
      
      logger.debug('=== PDF merge completed ===');
      logger.debug(`Merged PDF size: ${mergedPdfBytes.length} bytes`);
      
      // Send the merged PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=merged-labels-${Date.now()}.pdf`);
      res.send(Buffer.from(mergedPdfBytes));

    } catch (error) {
      logger.error('Error bulk downloading labels:', error);
      res.status(500).json({
        success: false,
        message: 'Error bulk downloading labels',
        error: error.message
      });
    }
  };

  // Get orders with pending labels
  module.exports.getPendingLabels = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await Order.findAndCountAll({
        where: {
          fship_label_url: { [Op.ne]: null },
          fship_label_downloaded: false
        },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          { 
            model: User, 
            as: 'User',
            attributes: ['id', 'name', 'email'] 
          },
          { 
            model: GuestUser, 
            as: 'GuestUser',
            attributes: ['id', 'name', 'email'] 
          },
          { 
            model: ShippingAddress, 
            as: 'ShippingAddress' 
          }
        ]
      });

      res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching pending labels:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching pending labels',
        error: error.message
      });
    }
  };

  // Get label download statistics
  module.exports.getLabelDownloadStats = async (req, res) => {
    try {
      const totalLabels = await Order.count({
        where: { fship_label_url: { [Op.ne]: null } }
      });

      const downloadedLabels = await Order.count({
        where: {
          fship_label_url: { [Op.ne]: null },
          fship_label_downloaded: true
        }
      });

      const pendingLabels = totalLabels - downloadedLabels;

      const recentDownloads = await FShipLabelDownload.findAll({
        limit: 10,
        order: [['downloaded_at', 'DESC']],
        include: [
          { 
            model: Order, 
            as: 'Order',
            attributes: ['id', 'order_number'] 
          },
          { 
            model: User, 
            as: 'DownloadedBy',
            attributes: ['id', 'username', 'email'] 
          }
        ]
      });

      res.status(200).json({
        success: true,
        data: {
          totalLabels,
          downloadedLabels,
          pendingLabels,
          downloadRate: totalLabels > 0 ? ((downloadedLabels / totalLabels) * 100).toFixed(2) : 0,
          recentDownloads
        }
      });
    } catch (error) {
      logger.error('Error fetching label stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching label statistics',
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
      logger.debug("=== BULK FSHIP STATUS REFRESH START ===");

      // STEP 1: Test FShip connection
      const testResult = await fshipService.testConnection();
      if (!testResult.success) {
        return res.status(400).json({ success: false, message: 'FShip connection failed', error: testResult.message });
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
              results.errors_list.push({ order_number: order.order_number, error: refreshResult.error });
            }
          } catch (err) {
            await orderTx.rollback();
            results.errors++;
            results.errors_list.push({ order_number: order.order_number, error: err.message });
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
