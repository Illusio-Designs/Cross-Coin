const express = require('express');
const router = express.Router();
const utmController = require('../controller/utmController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');
const { optionalBrand } = require('../middleware/brandMiddleware.js');

// Public route - track a visit / UTM. optionalBrand reads X-Brand-Name so each
// visit is stamped with the storefront's brand for the traffic report.
router.post('/track', optionalBrand, utmController.trackUTM);

// Admin routes - get analytics

module.exports = router;
