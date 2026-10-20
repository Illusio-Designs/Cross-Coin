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

// Admin + order managers — one service file per report under
// services/reports/. Cost and margin figures are only returned to admins
// (see canSeeCost in services/reports/common.js).
const report = (name) => (req, res) => require(`../services/reports/${name}.js`).handler(req, res);
router.get('/location', isAuthenticated, isOrderManager, report('locationReport'));
router.get('/products', isAuthenticated, isOrderManager, report('productReport'));
router.get('/customers', isAuthenticated, isOrderManager, report('customerReport'));
router.get('/inventory', isAuthenticated, isOrderManager, report('inventoryReport'));
router.get('/coupons', isAuthenticated, isOrderManager, report('couponReport'));

module.exports = router;
