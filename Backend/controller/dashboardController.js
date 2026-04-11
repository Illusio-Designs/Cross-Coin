const { getDashboardDataWithCache } = require("../services/dashboardService.js");

/**
 * Get dashboard statistics with caching
 * Uses aggregated queries and Redis caching for performance
 * Requirements: 1.4
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const brandId = req.brandId || null;
    const { start_date, end_date } = req.query;

    // Parse date filters
    const dateFilter = {};
    if (start_date) dateFilter.startDate = new Date(start_date);
    if (end_date) {
      dateFilter.endDate = new Date(end_date);
      dateFilter.endDate.setHours(23, 59, 59, 999); // include full end day
    }

    const hasDateFilter = !!(start_date || end_date);

    // Skip cache when custom date filter is used
    if (hasDateFilter) {
      const data = await require('../services/dashboardService.js').aggregateDashboardData(userId, brandId, dateFilter);
      return res.status(200).json({ ...data, cacheHit: false, dateFilter: { start_date, end_date } });
    }

    const dashboardData = await getDashboardDataWithCache(userId, brandId);
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
