const express = require('express');
const router = express.Router();
const reportsController = require('../controller/reportsController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// Admin — brand-wise traffic & conversion funnel
router.get('/brand-traffic', isAuthenticated, isAdmin, reportsController.getBrandTraffic);

// Admin — revenue & gross-profit (COGS + per-order shipping/service/CPP)
router.get('/revenue-profit', isAuthenticated, isAdmin, reportsController.getRevenueProfit);

module.exports = router;
