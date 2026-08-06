const { getDashboardDataWithCache } = require("../services/dashboardService.js");
const { logger } = require('../config/logging.js');

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

    // Parse date filters — anchored to IST day boundaries (see utils/dateRange).
    // Using new Date()+setHours() computed the day in the server's UTC timezone,
    // so early-morning IST orders (e.g. placed 12:05 AM) landed on the previous
    // UTC day and were dropped from "today".
    const { dayStartTZ, dayEndTZ } = require('../utils/dateRange.js');
    const dateFilter = {};
    if (start_date) dateFilter.startDate = dayStartTZ(start_date);
    if (end_date) dateFilter.endDate = dayEndTZ(end_date); // full IST end day

    const hasDateFilter = !!(start_date || end_date);

    // Skip cache when custom date filter is used
    if (hasDateFilter) {
      const data = await require('../services/dashboardService.js').aggregateDashboardData(userId, brandId, dateFilter);
      return res.status(200).json({ ...data, cacheHit: false, dateFilter: { start_date, end_date } });
    }

    const dashboardData = await getDashboardDataWithCache(userId, brandId);
    res.status(200).json(dashboardData);
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error);
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
