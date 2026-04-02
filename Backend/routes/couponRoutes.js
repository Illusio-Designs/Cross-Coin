const express = require('express');
const {
    createCoupon,
    getAllCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getPublicCoupons,
    applyCoupon
} = require('../controller/couponController.js');
const { isAuthenticated, authorize, authenticate, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public routes (no authentication required)
router.post('/validate', validateCoupon);
router.get('/public', getPublicCoupons);

// Authenticated user route
router.post('/apply', authenticate, applyCoupon);

// Order Manager routes
router.post('/', isAuthenticated, isOrderManager, createCoupon);
router.get('/', isAuthenticated, isOrderManager, getAllCoupons);
router.get('/:id', isAuthenticated, isOrderManager, getCoupon);
router.put('/:id', isAuthenticated, isOrderManager, updateCoupon);
router.delete('/:id', isAuthenticated, isOrderManager, deleteCoupon);

module.exports = router; 