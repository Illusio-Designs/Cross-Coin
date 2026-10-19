const express = require('express');
const router = express.Router();

const loyaltyController = require('../controller/loyaltyController');
const { isAuthenticated, isOrderManager, isAdmin } = require('../middleware/authMiddleware');

router.post('/adjust', isAuthenticated, isOrderManager, loyaltyController.adminAdjustPoints);
router.get('/transactions', isAuthenticated, isOrderManager, loyaltyController.adminGetTransactions);
router.get('/summary', isAuthenticated, isOrderManager, loyaltyController.adminSummary);
router.get('/customer/:userId', isAuthenticated, isOrderManager, loyaltyController.adminCustomerCard);
router.put('/rules', isAuthenticated, isAdmin, loyaltyController.adminSetRules);

module.exports = router;

