const express = require('express');
const router = express.Router();
const utmController = require('../controller/utmController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route - track UTM
router.post('/track', utmController.trackUTM);

// Get UTM by session
router.get('/session', utmController.getUTMBySession);

// Admin routes - get analytics
router.get('/analytics', authenticateToken, utmController.getUTMAnalytics);
router.get('/all', authenticateToken, utmController.getAllUTMData);

module.exports = router;
