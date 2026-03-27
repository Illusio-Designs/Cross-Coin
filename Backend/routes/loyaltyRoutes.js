const express = require('express');
const router = express.Router();

const loyaltyController = require('../controller/loyaltyController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// User loyalty endpoints
router.get('/balance', isAuthenticated, loyaltyController.getBalance);
router.get('/history', isAuthenticated, loyaltyController.getHistory);
router.post('/redeem', isAuthenticated, loyaltyController.redeemPoints);

module.exports = router;

