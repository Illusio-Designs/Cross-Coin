const express = require('express');
const router = express.Router();

const loyaltyController = require('../controller/loyaltyController');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');

router.post('/adjust', isAuthenticated, authorize(['admin']), loyaltyController.adminAdjustPoints);
router.get('/transactions', isAuthenticated, authorize(['admin']), loyaltyController.adminGetTransactions);

module.exports = router;

