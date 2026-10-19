const express = require('express');
const router = express.Router();
const { recordConsent, getUserConsentHistory } = require('../controller/consentController.js');
const { optionalAuth, isAuthenticated, isAdmin } = require('../middleware/authMiddleware.js');

// Public — record the visitor's consent (DPDP S6).
router.post('/', optionalAuth, recordConsent);

// Admin — a user's consent history.
router.get('/user/:id', isAuthenticated, isAdmin, getUserConsentHistory);

module.exports = router;
