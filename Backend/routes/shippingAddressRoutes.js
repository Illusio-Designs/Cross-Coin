import express from 'express';
import { 
    createShippingAddress,
    getUserShippingAddresses,
    getShippingAddressById,
    updateShippingAddress,
    deleteShippingAddress,
    setDefaultShippingAddress
} from '../controller/shippingAddressController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.post('/', isAuthenticated, createShippingAddress);
router.get('/', isAuthenticated, getUserShippingAddresses);
router.get('/:id', isAuthenticated, getShippingAddressById);
router.put('/:id', isAuthenticated, updateShippingAddress);
router.delete('/:id', isAuthenticated, deleteShippingAddress);
router.put('/:id/default', isAuthenticated, setDefaultShippingAddress);

export default router; 