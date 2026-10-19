const express = require('express');
const {
    getAllOrderStatusHistory
} = require('../controller/orderStatusHistoryController.js');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Order Manager routes
router.get('/', isAuthenticated, isOrderManager, getAllOrderStatusHistory);


module.exports = router; 