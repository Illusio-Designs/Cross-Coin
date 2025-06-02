import express from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { 
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToCart
} from '../controller/wishlistController.js';

const router = express.Router();

// All wishlist routes are protected and require authentication

// Get user's wishlist
router.get('/', isAuthenticated, getWishlist);

// Add product to wishlist
router.post('/add/:productId', isAuthenticated, addToWishlist);

// Remove product from wishlist
router.delete('/remove/:productId', isAuthenticated, removeFromWishlist);

// Clear entire wishlist
router.delete('/clear', isAuthenticated, clearWishlist);

// Move product to cart
router.post('/move-to-cart/:productId', isAuthenticated, moveToCart);

export default router; 