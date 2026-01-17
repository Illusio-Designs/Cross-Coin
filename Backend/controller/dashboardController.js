const { Product, Order, User, Payment, Review } = require("../model/associations.js");
const { sequelize } = require("../config/db.js");
const { Op } = require("sequelize");

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

    // Calculate revenue - let's be more inclusive to match orders page
    let totalRevenue = 0;
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
      
      // Add to all orders revenue for comparison
      allOrdersRevenue += orderTotal;
      
      // Include ALL orders except cancelled and pending for now (to match your expectation)
      let includeInRevenue = false;
      
      if (orderStatus !== 'cancelled' && orderStatus !== 'pending' && orderTotal > 0) {
        includeInRevenue = true;
      }
      
      if (includeInRevenue) {
        totalRevenue += orderTotal;
        completedOrdersCount++;
        
        // Check if order is from current month
        const orderDate = new Date(order.createdAt);
        if (orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth) {
          monthlyRevenue += orderTotal;
        }
      }
      
      console.log(`Order ${order.id}: Status=${orderStatus}, PaymentType=${paymentType}, PaymentStatus=${paymentStatus}, Amount=${orderTotal}, Included=${includeInRevenue}`);
    });
    
    console.log('=== ORDER STATUS BREAKDOWN ===');
    console.log('Status counts:', statusCounts);
    console.log('Payment type counts:', paymentTypeCounts);

    // Calculate average order value based on completed orders
    const avgOrderValue = completedOrdersCount > 0 ? totalRevenue / completedOrdersCount : 0;

    console.log('=== REVENUE CALCULATION RESULTS ===');
    console.log('All orders revenue (sum of all final_amounts):', allOrdersRevenue);
    console.log('Total revenue (calculated):', totalRevenue);
    console.log('Monthly revenue:', monthlyRevenue);
    console.log('Completed orders count:', completedOrdersCount);
    console.log('Total orders in system:', allOrders.length);
    console.log('Expected total should be around 5300, actual:', totalRevenue);

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
          recent: recentOrders,
        },
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          monthly: parseFloat(monthlyRevenue.toFixed(2)),
          average: parseFloat((completedOrdersCount > 0 ? totalRevenue / completedOrdersCount : 0).toFixed(2)),
        },
        customers: {
          total: totalCustomers,
          recent: recentCustomers,
        },
        reviews: {
          total: totalReviews,
          approved: approvedReviews,
        },
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