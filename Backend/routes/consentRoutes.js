const express = require('express');
const router = express.Router();
const { recordConsent, getMyConsent, getUserConsentHistory } = require('../controller/consentController.js');
const { optionalAuth, isAuthenticated, isAdmin } = require('../middleware/authMiddleware.js');

// Public — record / read the visitor's own consent (DPDP S6).
router.post('/', optionalAuth, recordConsent);
router.get('/me', optionalAuth, getMyConsent);

// Admin — a user's consent history.
router.get('/user/:id', isAuthenticated, isAdmin, getUserConsentHistory);

module.exports = router;
