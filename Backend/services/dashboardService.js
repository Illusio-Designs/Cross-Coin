const { Product, Order, User, Review, OrderItem, ProductVariation, GuestUser, UTMTracking } = require("../model/associations.js");
const { sequelize } = require("../config/db.js");
const { Op, QueryTypes } = require("sequelize");
const cacheManager = require("./cacheManager.js");

// Cache configuration
const DASHBOARD_CACHE_TTL = 5 * 60; // 5 minutes in seconds
const DASHBOARD_CACHE_KEY = (userId) => `dashboard:${userId}:stats`;

/**
 * Aggregates all dashboard data from database
 * Combines user stats, recent orders, badges, recommendations
 * Requirements: 1.4
 */
const aggregateDashboardData = async (userId) => {
  try {
    // Get total products count
    const totalProducts = await Product.count();

    // Get total active products count
    const activeProducts = await Product.count({
      where: { status: "active" },
    });

    // Get total orders count
    const totalOrders = await Order.count();

    // Get pending orders count
    const pendingOrders = await Order.count({
      where: {
        status: {
          [Op.in]: ["pending", "processing"],
        },
      },
    });

    // Get cancelled orders count
    const cancelledOrders = await Order.count({
      where: {
        status: "cancelled",
      },
    });

    // Get all orders for revenue calculation (optimized with aggregation)
    const allOrders = await Order.findAll({
      attributes: ['id', 'status', 'payment_type', 'payment_status', 'final_amount', 'total_amount', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Calculate revenue breakdown
    let totalRevenue = 0;
    let deliveredRevenue = 0;
    let cancelledRevenue = 0;
    let rtoRevenue = 0;
    let pendingRevenue = 0;
    let processingRevenue = 0;
    let shippedRevenue = 0;
    let completedOrdersCount = 0;
    let monthlyRevenue = 0;
    let allOrdersRevenue = 0;
    
    const statusCounts = {};
    const paymentTypeCounts = {};
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    allOrders.forEach(order => {
      const paymentType = order.payment_type?.toLowerCase();
      const orderStatus = order.status?.toLowerCase();
      const orderTotal = parseFloat(order.final_amount || 0);
      
      statusCounts[orderStatus] = (statusCounts[orderStatus] || 0) + 1;
      paymentTypeCounts[paymentType] = (paymentTypeCounts[paymentType] || 0) + 1;
      
      allOrdersRevenue += orderTotal;
      
      switch (orderStatus) {
        case 'delivered':
        case 'completed':
          deliveredRevenue += orderTotal;
          totalRevenue += orderTotal;
          completedOrdersCount++;
          break;
        case 'cancelled':
          cancelledRevenue += orderTotal;
          break;
        case 'rto':
        case 'rto delivered':
          rtoRevenue += orderTotal;
          totalRevenue += orderTotal;
          break;
        case 'pending':
          pendingRevenue += orderTotal;
          totalRevenue += orderTotal;
          break;
        case 'processing':
        case 'confirmed':
          processingRevenue += orderTotal;
          totalRevenue += orderTotal;
          break;
        case 'shipped':
        case 'out for delivery':
        case 'in transit':
          shippedRevenue += orderTotal;
          totalRevenue += orderTotal;
          break;
        default:
          totalRevenue += orderTotal;
      }
      
      const orderDate = new Date(order.createdAt);
      if (orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth && orderStatus !== 'cancelled') {
        monthlyRevenue += orderTotal;
      }
    });

    const nonCancelledOrdersCount = allOrders.filter(order => order.status?.toLowerCase() !== 'cancelled').length;
    const avgOrderValue = nonCancelledOrdersCount > 0 ? totalRevenue / nonCancelledOrdersCount : 0;

    // Get total customers
    const totalRegisteredCustomers = await User.count({
      where: { role: "consumer" },
    });

    const totalGuestCustomers = await Order.count({
      where: {
        guest_user_id: {
          [Op.not]: null
        }
      },
      distinct: true,
      col: 'guest_user_id'
    });

    const totalCustomers = totalRegisteredCustomers + totalGuestCustomers;

    // Get recent customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRegisteredCustomers = await User.count({
      where: {
        role: "consumer",
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    const recentGuestCustomers = await Order.count({
      where: {
        guest_user_id: {
          [Op.not]: null
        },
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      distinct: true,
      col: 'guest_user_id'
    });

    const recentCustomers = recentRegisteredCustomers + recentGuestCustomers;

    // Get total reviews count
    const totalReviews = await Review.count();

    // Get approved reviews count
    const approvedReviews = await Review.count({
      where: { status: "approved" },
    });

    // Get recent orders (last 30 days)
    const recentOrders = await Order.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    // Get recent orders list (Last 10 orders)
    const recentOrdersList = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
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
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      attributes: ['id', 'order_number', 'final_amount', 'status', 'payment_type', 'payment_status', 'createdAt']
    });

    const formattedRecentOrders = recentOrdersList.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.User ? order.User.username : 
                    order.GuestUser ? `${order.GuestUser.firstName} ${order.GuestUser.lastName}` : 
                    'Guest',
      customerEmail: order.User ? order.User.email : 
                     order.GuestUser ? order.GuestUser.email : 
                     'N/A',
      amount: parseFloat(order.final_amount),
      status: order.status,
      paymentType: order.payment_type,
      paymentStatus: order.payment_status,
      date: order.createdAt
    }));

    // Get top selling products (Top 10 by revenue)
    const topProducts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count,
        AVG(oi.price) as avg_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('cancelled')
      GROUP BY p.id, p.name, p.slug
      ORDER BY total_revenue DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    const formattedTopProducts = topProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.avg_price || 0),
      totalSold: parseInt(product.total_sold || 0),
      totalRevenue: parseFloat(product.total_revenue || 0),
      orderCount: parseInt(product.order_count || 0)
    }));

    // Get low stock products
    const lowStockProducts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        pv.id as variation_id,
        pv.sku,
        pv.stock,
        pv.attributes
      FROM product_variations pv
      JOIN products p ON pv.productId = p.id
      WHERE pv.stock < 10 AND pv.stock > 0
      ORDER BY pv.stock ASC
      LIMIT 20
    `, { type: QueryTypes.SELECT });

    const outOfStockCount = await ProductVariation.count({
      where: { stock: 0 }
    });

    const formattedLowStock = lowStockProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      variationId: product.variation_id,
      sku: product.sku,
      stock: parseInt(product.stock),
      attributes: product.attributes
    }));

    // Order status distribution
    const orderStatusDistribution = {
      pending: statusCounts['pending'] || 0,
      processing: statusCounts['processing'] || 0,
      confirmed: statusCounts['confirmed'] || 0,
      shipped: statusCounts['shipped'] || 0,
      'out for delivery': statusCounts['out for delivery'] || 0,
      'in transit': statusCounts['in transit'] || 0,
      delivered: statusCounts['delivered'] || 0,
      completed: statusCounts['completed'] || 0,
      cancelled: statusCounts['cancelled'] || 0,
      rto: statusCounts['rto'] || 0,
      undelivered: statusCounts['undelivered'] || 0
    };

    const orderStatusChart = [
      {
        label: 'Pending',
        value: (statusCounts['pending'] || 0),
        color: '#8b5cf6'
      },
      {
        label: 'Processing',
        value: (statusCounts['processing'] || 0) + (statusCounts['confirmed'] || 0),
        color: '#f59e0b'
      },
      {
        label: 'Shipped',
        value: (statusCounts['shipped'] || 0) + (statusCounts['out for delivery'] || 0) + (statusCounts['in transit'] || 0),
        color: '#3b82f6'
      },
      {
        label: 'Delivered',
        value: (statusCounts['delivered'] || 0) + (statusCounts['completed'] || 0),
        color: '#10b981'
      },
      {
        label: 'Cancelled',
        value: (statusCounts['cancelled'] || 0),
        color: '#6b7280'
      },
      {
        label: 'RTO',
        value: (statusCounts['rto'] || 0),
        color: '#ef4444'
      }
    ].filter(item => item.value > 0);

    // Payment distribution
    const paymentDistribution = {
      cod: {
        count: paymentTypeCounts['cod'] || 0,
        revenue: allOrders
          .filter(o => o.payment_type?.toLowerCase() === 'cod' && o.status?.toLowerCase() !== 'cancelled')
          .reduce((sum, o) => sum + parseFloat(o.final_amount || 0), 0)
      },
      prepaid: {
        count: Object.keys(paymentTypeCounts)
          .filter(type => type !== 'cod')
          .reduce((sum, type) => sum + (paymentTypeCounts[type] || 0), 0),
        revenue: allOrders
          .filter(o => o.payment_type?.toLowerCase() !== 'cod' && o.status?.toLowerCase() !== 'cancelled')
          .reduce((sum, o) => sum + parseFloat(o.final_amount || 0), 0)
      }
    };

    const paymentStatusCounts = {
      pending: 0,
      paid: 0,
      failed: 0,
      refunded: 0,
      cancelled: 0,
      refund_pending: 0
    };

    allOrders.forEach(order => {
      const paymentStatus = order.payment_status?.toLowerCase();
      if (paymentStatusCounts.hasOwnProperty(paymentStatus)) {
        paymentStatusCounts[paymentStatus]++;
      }
    });

    const paymentStatusChart = [
      {
        label: 'Paid',
        value: paymentStatusCounts['paid'],
        color: '#10b981'
      },
      {
        label: 'Pending',
        value: paymentStatusCounts['pending'],
        color: '#f59e0b'
      },
      {
        label: 'Failed',
        value: paymentStatusCounts['failed'],
        color: '#ef4444'
      },
      {
        label: 'Refunded',
        value: paymentStatusCounts['refunded'],
        color: '#8b5cf6'
      },
      {
        label: 'Refund Pending',
        value: paymentStatusCounts['refund_pending'],
        color: '#a78bfa'
      },
      {
        label: 'Cancelled',
        value: paymentStatusCounts['cancelled'],
        color: '#6b7280'
      }
    ].filter(item => item.value > 0);

    const paymentChart = [
      {
        label: 'COD',
        value: paymentDistribution.cod.revenue,
        count: paymentDistribution.cod.count,
        color: '#f59e0b',
        percentage: totalRevenue > 0 ? parseFloat(((paymentDistribution.cod.revenue / totalRevenue) * 100).toFixed(1)) : 0
      },
      {
        label: 'Prepaid',
        value: paymentDistribution.prepaid.revenue,
        count: paymentDistribution.prepaid.count,
        color: '#10b981',
        percentage: totalRevenue > 0 ? parseFloat(((paymentDistribution.prepaid.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }
    ].filter(item => item.value > 0);

    // RTO statistics
    const rtoOrders = allOrders.filter(o => {
      const status = o.status?.toLowerCase();
      return status === 'rto' || status === 'rto delivered';
    });
    const rtoStats = {
      totalRTO: statusCounts['rto'] + (statusCounts['rto delivered'] || 0),
      rtoRevenue: parseFloat(rtoRevenue.toFixed(2)),
      rtoRate: totalOrders > 0 ? parseFloat((((statusCounts['rto'] + (statusCounts['rto delivered'] || 0)) / totalOrders) * 100).toFixed(2)) : 0,
      rtoPercentageOfRevenue: allOrdersRevenue > 0 ? parseFloat(((rtoRevenue / allOrdersRevenue) * 100).toFixed(2)) : 0,
      averageRTOValue: rtoOrders.length > 0 ? parseFloat((rtoRevenue / rtoOrders.length).toFixed(2)) : 0
    };

    // UTM tracking analytics
    const utmStats = await sequelize.query(`
      SELECT 
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) as registered_users,
        COUNT(DISTINCT CASE WHEN guest_user_id IS NOT NULL THEN guest_user_id END) as guest_users
      FROM utm_tracking
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY utm_source, utm_medium, utm_campaign
      ORDER BY sessions DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    const utmConversions = await sequelize.query(`
      SELECT 
        utm.utm_source,
        utm.utm_medium,
        COUNT(DISTINCT utm.session_id) as total_sessions,
        COUNT(DISTINCT o.id) as orders,
        SUM(CASE WHEN o.status NOT IN ('cancelled') THEN o.final_amount ELSE 0 END) as revenue
      FROM utm_tracking utm
      LEFT JOIN orders o ON utm.id = o.utm_tracking_id
      WHERE utm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY utm.utm_source, utm.utm_medium
      ORDER BY revenue DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    const formattedUTMStats = utmStats.map(stat => ({
      source: stat.utm_source || 'Direct',
      medium: stat.utm_medium || 'None',
      campaign: stat.utm_campaign || 'N/A',
      sessions: parseInt(stat.sessions || 0),
      registeredUsers: parseInt(stat.registered_users || 0),
      guestUsers: parseInt(stat.guest_users || 0)
    }));

    const formattedUTMConversions = utmConversions.map(conv => ({
      source: conv.utm_source || 'Direct',
      medium: conv.utm_medium || 'None',
      sessions: parseInt(conv.total_sessions || 0),
      orders: parseInt(conv.orders || 0),
      revenue: parseFloat(conv.revenue || 0),
      conversionRate: parseInt(conv.total_sessions || 0) > 0 
        ? parseFloat(((parseInt(conv.orders || 0) / parseInt(conv.total_sessions || 0)) * 100).toFixed(2))
        : 0
    }));

    const utmSourceChart = formattedUTMStats.slice(0, 5).map((stat, index) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
      return {
        label: stat.source,
        value: stat.sessions,
        color: colors[index % colors.length]
      };
    });

    return {
      success: true,
      stats: {
        products: {
          total: totalProducts,
          active: activeProducts,
          inactive: totalProducts - activeProducts,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrdersCount,
          cancelled: cancelledOrders,
          recent: recentOrders,
          statusDistribution: orderStatusDistribution,
          statusChart: orderStatusChart
        },
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          monthly: parseFloat(monthlyRevenue.toFixed(2)),
          average: parseFloat((nonCancelledOrdersCount > 0 ? totalRevenue / nonCancelledOrdersCount : 0).toFixed(2)),
          breakdown: {
            delivered: parseFloat(deliveredRevenue.toFixed(2)),
            cancelled: parseFloat(cancelledRevenue.toFixed(2)),
            rto: parseFloat(rtoRevenue.toFixed(2)),
            pending: parseFloat(pendingRevenue.toFixed(2)),
            processing: parseFloat(processingRevenue.toFixed(2)),
            shipped: parseFloat(shippedRevenue.toFixed(2)),
          },
          donutChart: [
            {
              label: 'Delivered',
              value: parseFloat(deliveredRevenue.toFixed(2)),
              color: '#10b981',
              percentage: totalRevenue > 0 ? parseFloat(((deliveredRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Shipped',
              value: parseFloat(shippedRevenue.toFixed(2)),
              color: '#3b82f6',
              percentage: totalRevenue > 0 ? parseFloat(((shippedRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Processing',
              value: parseFloat(processingRevenue.toFixed(2)),
              color: '#f59e0b',
              percentage: totalRevenue > 0 ? parseFloat(((processingRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Pending',
              value: parseFloat(pendingRevenue.toFixed(2)),
              color: '#8b5cf6',
              percentage: totalRevenue > 0 ? parseFloat(((pendingRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'RTO',
              value: parseFloat(rtoRevenue.toFixed(2)),
              color: '#ef4444',
              percentage: totalRevenue > 0 ? parseFloat(((rtoRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Cancelled',
              value: parseFloat(cancelledRevenue.toFixed(2)),
              color: '#6b7280',
              percentage: allOrdersRevenue > 0 ? parseFloat(((cancelledRevenue / allOrdersRevenue) * 100).toFixed(1)) : 0
            }
          ].filter(item => item.value > 0)
        },
        customers: {
          total: totalCustomers,
          recent: recentCustomers,
        },
        reviews: {
          total: totalReviews,
          approved: approvedReviews,
        },
        recentOrders: formattedRecentOrders,
        topProducts: formattedTopProducts,
        lowStock: {
          products: formattedLowStock,
          outOfStockCount: outOfStockCount,
          lowStockCount: formattedLowStock.length
        },
        paymentDistribution: {
          cod: paymentDistribution.cod,
          prepaid: paymentDistribution.prepaid,
          chart: paymentChart
        },
        paymentStatusDistribution: {
          counts: paymentStatusCounts,
          chart: paymentStatusChart
        },
        rtoStats: rtoStats,
        utmTracking: {
          topSources: formattedUTMStats,
          conversions: formattedUTMConversions,
          sourceChart: utmSourceChart
        }
      },
    };
  } catch (error) {
    console.error("Error aggregating dashboard data:", error);
    throw error;
  }
};

/**
 * Gets dashboard data with Redis caching
 * Checks cache first, returns cached data if available
 * Otherwise aggregates from database and stores in cache
 * Requirements: 1.4
 */
const getDashboardDataWithCache = async (userId) => {
  const cacheKey = DASHBOARD_CACHE_KEY(userId);
  
  try {
    // Check if data exists in cache
    const cachedData = await cacheManager.get(cacheKey);

    if (cachedData) {
      console.log(`✅ Dashboard cache HIT for user ${userId}`);
      return {
        ...cachedData,
        cacheHit: true
      };
    }

    console.log(`⚠️ Dashboard cache MISS for user ${userId}, aggregating from database...`);
    
    // Aggregate data from database
    const aggregatedData = await aggregateDashboardData(userId);

    // Store in cache with TTL
    await cacheManager.set(cacheKey, aggregatedData, DASHBOARD_CACHE_TTL);

    console.log(`✅ Dashboard data cached for user ${userId} with TTL ${DASHBOARD_CACHE_TTL}s`);
    
    return {
      ...aggregatedData,
      cacheHit: false
    };
  } catch (error) {
    console.error("Error getting dashboard data with cache:", error);
    // Fallback to direct aggregation if cache fails
    const aggregatedData = await aggregateDashboardData(userId);
    return {
      ...aggregatedData,
      cacheHit: false,
      cacheError: error.message
    };
  }
};

/**
 * Invalidates dashboard cache for a user
 * Called when relevant user actions occur (order creation, badge updates, profile changes)
 * Requirements: 1.4
 */
const invalidateDashboardCache = async (userId) => {
  const cacheKey = DASHBOARD_CACHE_KEY(userId);
  
  try {
    await cacheManager.delete(cacheKey);
    console.log(`✅ Dashboard cache invalidated for user ${userId}`);
  } catch (error) {
    console.error("Error invalidating dashboard cache:", error);
  }
};

module.exports = {
  aggregateDashboardData,
  getDashboardDataWithCache,
  invalidateDashboardCache,
  DASHBOARD_CACHE_KEY,
  DASHBOARD_CACHE_TTL
};
