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
// POST /api/shipping-addresses - Create new address
router.post('/', isAuthenticated, createShippingAddress);
// GET /api/shipping-addresses - Get all addresses for user
router.get('/', isAuthenticated, getUserShippingAddresses);
// GET /api/shipping-addresses/:id - Get address by ID
router.get('/:id', isAuthenticated, getShippingAddressById);
// PUT /api/shipping-addresses/:id - Update address
router.put('/:id', isAuthenticated, updateShippingAddress);
// DELETE /api/shipping-addresses/:id - Delete address
router.delete('/:id', isAuthenticated, deleteShippingAddress);
// PUT /api/shipping-addresses/:id/default - Set default address
router.put('/:id/default', isAuthenticated, setDefaultShippingAddress);

export default router; 