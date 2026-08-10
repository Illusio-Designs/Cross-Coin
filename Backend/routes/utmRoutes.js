const express = require('express');
const router = express.Router();
const utmController = require('../controller/utmController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// Public route - track UTM
router.post('/track', utmController.trackUTM);

// Admin routes - get analytics
router.get('/analytics', isAuthenticated, isAdmin, utmController.getUTMAnalytics);
router.get('/all', isAuthenticated, isAdmin, utmController.getAllUTMData);

module.exports = router;
