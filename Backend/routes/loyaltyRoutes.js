const express = require('express');
const router = express.Router();

const loyaltyController = require('../controller/loyaltyController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// User loyalty endpoints. (POST /redeem was removed: it took points without
// linking them to an order and no storefront used it.)
router.get('/balance', isAuthenticated, loyaltyController.getBalance);
router.get('/history', isAuthenticated, loyaltyController.getHistory);

module.exports = router;

