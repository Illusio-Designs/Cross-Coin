const express = require('express');
const router = express.Router();
const reportsController = require('../controller/reportsController');
const { isAuthenticated, isAdmin, isOrderManager } = require('../middleware/authMiddleware');

// Admin — brand-wise traffic & conversion funnel
router.get('/brand-traffic', isAuthenticated, isAdmin, reportsController.getBrandTraffic);

// Admin — revenue & gross-profit (COGS + per-order shipping/service/CPP)
router.get('/revenue-profit', isAuthenticated, isAdmin, reportsController.getRevenueProfit);

const reportCosts = require('../services/reportCostSettingsService.js');
router.get('/cost-rates', isAuthenticated, isAdmin, async (req, res, next) => {
  try { res.json({ success: true, rates: await reportCosts.readRates() }); }
  catch (error) { next(error); }
});
router.put('/cost-rates', isAuthenticated, isAdmin, async (req, res, next) => {
  const rates = reportCosts.validateRates(req.body);
  if (!rates) return res.status(400).json({ success: false, message: 'Enter valid rates with up to two decimal places. Percentages must be 0–100.' });
  try { res.json({ success: true, rates: await reportCosts.saveRates(rates) }); }
  catch (error) { next(error); }
});

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
// Admin only — Meta ad spend joined to our orders by campaign / ad set / ad name.
router.get('/ads', isAuthenticated, isAdmin, report('adsReport'));
router.get('/marketing-orders', isAuthenticated, isAdmin, report('marketingOrdersReport'));

module.exports = router;
