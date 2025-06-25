const express = require('express');
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../controller/cartController.js');
const { authenticate } = require('../middleware/authMiddleware.js');

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', getCart);

// Add item to cart
router.post('/add', addToCart);

// Update cart item quantity
router.put('/item/:productId', updateCartItem);

// Remove item from cart
router.delete('/item/:productId', removeFromCart);

// Clear cart
router.delete('/clear', clearCart);

module.exports = router; 