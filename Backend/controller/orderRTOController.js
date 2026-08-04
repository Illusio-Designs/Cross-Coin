const { Order } = require("../model/orderModel.js");
const { OrderItem } = require("../model/orderItemModel.js");
const { OrderStatusHistory } = require("../model/orderStatusHistoryModel.js");
const { Product } = require("../model/productModel.js");
const { ProductVariation } = require("../model/productVariationModel.js");
const { ShippingAddress } = require("../model/shippingAddressModel.js");
const { Payment } = require("../model/paymentModel.js");
const { User } = require("../model/userModel.js");
const { GuestUser } = require("../model/guestUserModel.js");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db.js");
const { logger } = require("../config/logging.js");
const shippingProviderFactory = require("../services/shippingProviderFactory.js");

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

    // Cancel the shipment at the courier (iThink) if one was booked.
    if (order.fship_waybill) {
      try {
        const provider = await shippingProviderFactory.getShippingProvider(order.brand_id || 1);
        await provider.cancelOrder(
          order.fship_waybill,
          `RTO - ${reason || 'Return to Origin'}`
        );
        logger.debug(`✅ Shipment cancelled for RTO: ${order.fship_waybill}`);
      } catch (cancelError) {
        logger.error(`❌ Failed to cancel shipment: ${cancelError.message}`);
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
