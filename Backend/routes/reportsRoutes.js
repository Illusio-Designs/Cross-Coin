const express = require('express');
const router = express.Router();
const reportsController = require('../controller/reportsController');
const { isAuthenticated, isAdmin, isOrderManager } = require('../middleware/authMiddleware');

// Admin — brand-wise traffic & conversion funnel
router.get('/brand-traffic', isAuthenticated, isAdmin, reportsController.getBrandTraffic);

// Admin — revenue & gross-profit (COGS + per-order shipping/service/CPP)
router.get('/revenue-profit', isAuthenticated, isAdmin, reportsController.getRevenueProfit);

// Admin — active variations missing a cost price (feeds the profit report)
router.get('/missing-cost-prices', isAuthenticated, isAdmin, reportsController.getMissingCostPrices);

// Admin + order managers — the Reports Overview (sales, pipeline, RTO, returns)
router.get('/sales-summary', isAuthenticated, isOrderManager, reportsController.getSalesSummary);

module.exports = router;
