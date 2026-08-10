const express = require('express');
const {
    createCoupon, getAllCoupons, getCouponById, updateCoupon, deleteCoupon,
    validateCoupon, getPublicCoupons, applyCoupon
} = require('../controller/couponController.js');
const { isAuthenticated, authenticate, isOrderManager } = require('../middleware/authMiddleware.js');
const { validateBody, z } = require('../middleware/validate.js');

const router = express.Router();

// ── Zod schemas ────────────────────────────────────────────────────
// `validate` is hit on every checkout — keep it cheap. We only enforce
// that a code string came in and (optionally) a positive cart total so
// downstream math can't crash on missing fields.
const validateCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50),
  cart_total: z.coerce.number().nonnegative().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  cartTotal: z.coerce.number().nonnegative().optional(),
  user_id: z.coerce.number().int().positive().optional(),
});

const applyCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50),
  order_id: z.coerce.number().int().positive().optional(),
});

// Public
router.get('/listing',    getPublicCoupons);
router.post('/validate',  validateBody(validateCouponSchema), validateCoupon);

// Admin
router.post('/',          isAuthenticated, isOrderManager, createCoupon);
router.get('/',           isAuthenticated, isOrderManager, getAllCoupons);
router.get('/:id',        isAuthenticated, isOrderManager, getCouponById);
router.put('/:id',        isAuthenticated, isOrderManager, updateCoupon);
router.delete('/:id',    isAuthenticated, isOrderManager, deleteCoupon);

module.exports = router;
