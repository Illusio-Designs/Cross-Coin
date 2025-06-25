const express = require('express');
const {
    getAllShippingFees,
    createShippingFee,
    updateShippingFee,
    getShippingFeeByType,
    deleteShippingFee
} = require('../controller/shippingFeeController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public routes
router.get('/', getAllShippingFees);
router.get('/:type', getShippingFeeByType);

// Admin routes
router.post('/', isAuthenticated, authorize(['admin']), createShippingFee);
router.put('/:id', isAuthenticated, authorize(['admin']), updateShippingFee);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteShippingFee);

module.exports = router; 