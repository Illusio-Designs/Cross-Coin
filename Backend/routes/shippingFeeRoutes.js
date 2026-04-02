const express = require('express');
const {
    getAllShippingFees,
    createShippingFee,
    updateShippingFee,
    getShippingFeeByType,
    deleteShippingFee
} = require('../controller/shippingFeeController.js');
const { isAuthenticated, authorize, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public routes
router.get('/', getAllShippingFees);
router.get('/:type', getShippingFeeByType);

// Order Manager routes
router.post('/', isAuthenticated, isOrderManager, createShippingFee);
router.put('/:id', isAuthenticated, isOrderManager, updateShippingFee);
router.delete('/:id', isAuthenticated, isOrderManager, deleteShippingFee);

module.exports = router; 