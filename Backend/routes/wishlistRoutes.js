const express = require('express');
const { isAuthenticated } = require('../middleware/authMiddleware.js');
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToCart
} = require('../controller/wishlistController.js');

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

module.exports = router; 