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

    // Get completed orders count
    const completedOrders = await Order.count({
      where: { status: "delivered" },
    });

    // Get total revenue from completed/delivered orders
    const revenueResult = await Order.sum("total_amount", {
      where: {
        status: {
          [Op.in]: ["delivered", "completed"],
        },
      },
    });
    const totalRevenue = revenueResult || 0;

    // Get total customers (users with role 'user')
    const totalCustomers = await User.count({
      where: { role: "user" },
    });

    // Get recent customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCustomers = await User.count({
      where: {
        role: "user",
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

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

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get monthly revenue for current month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenueResult = await Order.sum("total_amount", {
      where: {
        status: {
          [Op.in]: ["delivered", "completed"],
        },
        createdAt: {
          [Op.gte]: firstDayOfMonth,
        },
      },
    });
    const monthlyRevenue = monthlyRevenueResult || 0;

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
          completed: completedOrders,
          recent: recentOrders,
        },
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          monthly: parseFloat(monthlyRevenue.toFixed(2)),
          average: parseFloat(avgOrderValue.toFixed(2)),
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
