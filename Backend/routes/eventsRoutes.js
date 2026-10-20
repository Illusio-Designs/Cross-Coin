const express = require('express');
const router = express.Router();
const eventsController = require('../controller/eventsController');
const { optionalBrand } = require('../middleware/brandMiddleware.js');

// Public — record a first-party funnel event (view_item / add_to_cart /
// begin_checkout). optionalBrand reads X-Brand-Name; session via the cookie or
// body. Legacy path for cached clients; current storefronts post to /api/i/e.
router.post('/track', optionalBrand, eventsController.trackEvent);

module.exports = router;
