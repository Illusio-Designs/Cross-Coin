import express from 'express';
import { 
    createCoupon,
    getAllCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getPublicCoupons
} from '../controller/couponController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/validate', validateCoupon);
router.get('/public', getPublicCoupons);

// Admin routes
router.post('/', isAuthenticated, authorize(['admin']), createCoupon);
router.get('/', isAuthenticated, authorize(['admin']), getAllCoupons);
router.get('/:id', isAuthenticated, authorize(['admin']), getCoupon);
router.put('/:id', isAuthenticated, authorize(['admin']), updateCoupon);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteCoupon);

export default router; 