const express = require('express');
const router = express.Router();
const reportsController = require('../controller/reportsController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// Admin — brand-wise traffic & conversion funnel
router.get('/brand-traffic', isAuthenticated, isAdmin, reportsController.getBrandTraffic);

module.exports = router;
