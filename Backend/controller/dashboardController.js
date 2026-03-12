const { getDashboardDataWithCache } = require("../services/dashboardService.js");

/**
 * Get dashboard statistics with caching
 * Uses aggregated queries and Redis caching for performance
 * Requirements: 1.4
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.id || 'admin'; // Get user ID from authenticated request
    
    // Get dashboard data with caching
    const dashboardData = await getDashboardDataWithCache(userId);
    
    res.status(200).json(dashboardData);
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
