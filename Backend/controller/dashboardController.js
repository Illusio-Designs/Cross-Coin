const { Product, Order, User, Payment, Review, OrderItem, ProductVariation, GuestUser } = require("../model/associations.js");
const { sequelize } = require("../config/db.js");
const { Op, QueryTypes } = require("sequelize");

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
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

    // Get all orders to calculate revenue the same way as orders page
    const allOrders = await Order.findAll({
      attributes: ['id', 'status', 'payment_type', 'payment_status', 'final_amount', 'total_amount', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log('=== DASHBOARD CALCULATION DEBUG ===');
    console.log('Total orders found:', allOrders.length);
    
    // Log first few orders to see their status
    console.log('Sample orders:', allOrders.slice(0, 5).map(order => ({
      id: order.id,
      status: order.status,
      payment_type: order.payment_type,
      payment_status: order.payment_status,
      final_amount: order.final_amount,
      total_amount: order.total_amount
    })));

    // Calculate revenue breakdown for donut chart
    let totalRevenue = 0;
    let deliveredRevenue = 0;
    let cancelledRevenue = 0;
    let rtoRevenue = 0;
    let pendingRevenue = 0;
    let processingRevenue = 0;
    let shippedRevenue = 0;
    let completedOrdersCount = 0;
    let monthlyRevenue = 0;
    let allOrdersRevenue = 0; // Track all orders revenue for comparison
    
    // Count orders by status for debugging
    const statusCounts = {};
    const paymentTypeCounts = {};
    
    // Get current month boundaries
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    allOrders.forEach(order => {
      const paymentType = order.payment_type?.toLowerCase();
      const paymentStatus = order.payment_status?.toLowerCase();
      const orderStatus = order.status?.toLowerCase();
      const orderTotal = parseFloat(order.final_amount || 0);
      
      // Count statuses for debugging
      statusCounts[orderStatus] = (statusCounts[orderStatus] || 0) + 1;
      paymentTypeCounts[paymentType] = (paymentTypeCounts[paymentType] || 0) + 1;
      
      // Track all orders revenue
      allOrdersRevenue += orderTotal;
      
      // Revenue breakdown by status
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
          totalRevenue += orderTotal; // Include RTO in total as it was attempted
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
          // Include other statuses in total revenue
          totalRevenue += orderTotal;
      }
      
      // Check if order is from current month (exclude cancelled from monthly revenue)
      const orderDate = new Date(order.createdAt);
      if (orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth && orderStatus !== 'cancelled') {
        monthlyRevenue += orderTotal;
      }
      
      console.log(`Order ${order.id}: Status=${orderStatus}, PaymentType=${paymentType}, PaymentStatus=${paymentStatus}, Amount=${orderTotal}`);
    });
    
    console.log('=== ORDER STATUS BREAKDOWN ===');
    console.log('Status counts:', statusCounts);
    console.log('Payment type counts:', paymentTypeCounts);

    // Calculate average order value based on non-cancelled orders
    const nonCancelledOrdersCount = allOrders.filter(order => order.status?.toLowerCase() !== 'cancelled').length;
    const avgOrderValue = nonCancelledOrdersCount > 0 ? totalRevenue / nonCancelledOrdersCount : 0;

    console.log('=== REVENUE CALCULATION RESULTS ===');
    console.log('All orders revenue (sum of all final_amounts):', allOrdersRevenue);
    console.log('Total revenue (calculated - EXCLUDING CANCELLED):', totalRevenue);
    console.log('Delivered revenue:', deliveredRevenue);
    console.log('Cancelled revenue:', cancelledRevenue);
    console.log('RTO revenue:', rtoRevenue);
    console.log('Pending revenue:', pendingRevenue);
    console.log('Processing revenue:', processingRevenue);
    console.log('Shipped revenue:', shippedRevenue);
    console.log('Monthly revenue:', monthlyRevenue);
    console.log('Completed orders count:', completedOrdersCount);
    console.log('Total orders in system:', allOrders.length);
    console.log('Non-cancelled orders:', nonCancelledOrdersCount);
    console.log('Revenue calculation excludes cancelled orders from total');

    // Get total customers (registered users + unique guest users)
    const totalRegisteredCustomers = await User.count({
      where: { role: "consumer" },
    });

    // Get unique guest customers (count distinct guest users who have placed orders)
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

    // Get recent customers (last 30 days) - both registered and guest
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

    console.log('=== CUSTOMER CALCULATION ===');
    console.log('Total registered customers:', totalRegisteredCustomers);
    console.log('Total guest customers:', totalGuestCustomers);
    console.log('Total customers:', totalCustomers);
    console.log('Recent customers (30 days):', recentCustomers);

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

    // ===== NEW FEATURES =====
    
    // 1. RECENT ORDERS LIST (Last 10 orders)
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

    // Format recent orders
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

    // 2. TOP SELLING PRODUCTS (Top 10 by revenue)
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

    // Format top products
    const formattedTopProducts = topProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.avg_price || 0),
      totalSold: parseInt(product.total_sold || 0),
      totalRevenue: parseFloat(product.total_revenue || 0),
      orderCount: parseInt(product.order_count || 0)
    }));

    // 3. LOW STOCK PRODUCTS (Stock < 10)
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

    // Count out of stock
    const outOfStockCount = await ProductVariation.count({
      where: { stock: 0 }
    });

    // Format low stock products
    const formattedLowStock = lowStockProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      variationId: product.variation_id,
      sku: product.sku,
      stock: parseInt(product.stock),
      attributes: product.attributes
    }));

    // 4. ORDER STATUS DISTRIBUTION (Already have statusCounts)
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

    // Format for chart (combine similar statuses)
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

    // 5. PAYMENT METHOD DISTRIBUTION
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

    // 5a. PAYMENT STATUS DISTRIBUTION (All statuses from Order model)
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

    // Format payment status for chart
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

    // Format for chart
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

    // 6. RTO STATISTICS
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

    res.status(200).json({
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
          // Revenue breakdown for donut chart
          breakdown: {
            delivered: parseFloat(deliveredRevenue.toFixed(2)),
            cancelled: parseFloat(cancelledRevenue.toFixed(2)),
            rto: parseFloat(rtoRevenue.toFixed(2)),
            pending: parseFloat(pendingRevenue.toFixed(2)),
            processing: parseFloat(processingRevenue.toFixed(2)),
            shipped: parseFloat(shippedRevenue.toFixed(2)),
          },
          // Donut chart data format
          donutChart: [
            {
              label: 'Delivered',
              value: parseFloat(deliveredRevenue.toFixed(2)),
              color: '#10b981', // green
              percentage: totalRevenue > 0 ? parseFloat(((deliveredRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Shipped',
              value: parseFloat(shippedRevenue.toFixed(2)),
              color: '#3b82f6', // blue
              percentage: totalRevenue > 0 ? parseFloat(((shippedRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Processing',
              value: parseFloat(processingRevenue.toFixed(2)),
              color: '#f59e0b', // amber
              percentage: totalRevenue > 0 ? parseFloat(((processingRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Pending',
              value: parseFloat(pendingRevenue.toFixed(2)),
              color: '#8b5cf6', // purple
              percentage: totalRevenue > 0 ? parseFloat(((pendingRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'RTO',
              value: parseFloat(rtoRevenue.toFixed(2)),
              color: '#ef4444', // red
              percentage: totalRevenue > 0 ? parseFloat(((rtoRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Cancelled',
              value: parseFloat(cancelledRevenue.toFixed(2)),
              color: '#6b7280', // gray
              percentage: allOrdersRevenue > 0 ? parseFloat(((cancelledRevenue / allOrdersRevenue) * 100).toFixed(1)) : 0
            }
          ].filter(item => item.value > 0) // Only include categories with revenue
        },
        customers: {
          total: totalCustomers,
          recent: recentCustomers,
        },
        reviews: {
          total: totalReviews,
          approved: approvedReviews,
        },
        // NEW FEATURES
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
        rtoStats: rtoStats
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};