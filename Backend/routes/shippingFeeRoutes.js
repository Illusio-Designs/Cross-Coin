import express from 'express';
import { 
    getAllShippingFees,
    createShippingFee,
    updateShippingFee,
    getShippingFeeByType,
    deleteShippingFee
} from '../controller/shippingFeeController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllShippingFees);
router.get('/:type', getShippingFeeByType);

// Admin routes
router.post('/', isAuthenticated, authorize(['admin']), createShippingFee);
router.put('/:id', isAuthenticated, authorize(['admin']), updateShippingFee);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteShippingFee);

export default router; 