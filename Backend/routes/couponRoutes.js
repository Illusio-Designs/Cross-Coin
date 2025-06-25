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
const { isAuthenticated, authorize, authenticate } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public routes
router.post('/validate', authenticate, validateCoupon);
router.get('/public', getPublicCoupons);

// Authenticated user route
router.post('/apply', authenticate, applyCoupon);

// Admin routes
router.post('/', isAuthenticated, authorize(['admin']), createCoupon);
router.get('/', isAuthenticated, authorize(['admin']), getAllCoupons);
router.get('/:id', isAuthenticated, authorize(['admin']), getCoupon);
router.put('/:id', isAuthenticated, authorize(['admin']), updateCoupon);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteCoupon);

module.exports = router; 