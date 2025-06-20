import express from 'express';
import { 
    getUserCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} from '../controller/cartController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', getUserCart);

// Add item to cart
router.post('/add', addToCart);

// Update cart item quantity
router.put('/item/:productId', updateCartItem);

// Remove item from cart
router.delete('/item/:productId', removeFromCart);

// Clear cart
router.delete('/clear', clearCart);

export default router; 