const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const { capturePhoneLead, getLeads } = require('../controller/leadController.js');

// Public — visitor submits phone from the storefront popup.
router.post('/phone', capturePhoneLead);

// Admin — list captured leads for the dashboard.
router.get('/', authenticate, isAdmin, getLeads);

module.exports = router;
