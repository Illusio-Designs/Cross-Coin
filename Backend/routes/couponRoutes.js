const express = require('express');
const {
    createCoupon, getAllCoupons, getCouponById, updateCoupon, deleteCoupon,
    validateCoupon, getPublicCoupons, applyCoupon
} = require('../controller/couponController.js');
const { isAuthenticated, authenticate, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public
router.get('/listing',    getPublicCoupons);
router.post('/validate',  validateCoupon);

// Authenticated
router.post('/apply',     authenticate, applyCoupon);

// Admin
router.post('/',          isAuthenticated, isOrderManager, createCoupon);
router.get('/',           isAuthenticated, isOrderManager, getAllCoupons);
router.get('/:id',        isAuthenticated, isOrderManager, getCouponById);
router.put('/:id',        isAuthenticated, isOrderManager, updateCoupon);
router.delete('/:id',    isAuthenticated, isOrderManager, deleteCoupon);

module.exports = router;
