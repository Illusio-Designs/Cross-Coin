const express = require('express');
const router = express.Router();

const loyaltyController = require('../controller/loyaltyController');
const { isAuthenticated, authorize, isOrderManager } = require('../middleware/authMiddleware');

router.post('/adjust', isAuthenticated, isOrderManager, loyaltyController.adminAdjustPoints);
router.get('/transactions', isAuthenticated, isOrderManager, loyaltyController.adminGetTransactions);

module.exports = router;

