const express = require('express');
const { isAuthenticated } = require('../middleware/authMiddleware.js');
const { getWishlist, addToWishlist, removeFromWishlist, clearWishlist, moveToCart } = require('../controller/wishlistController.js');

const router = express.Router();

router.get('/',                     isAuthenticated, getWishlist);
router.post('/:productId',         isAuthenticated, addToWishlist);
router.delete('/:productId',      isAuthenticated, removeFromWishlist);
router.delete('/',                  isAuthenticated, clearWishlist);
router.post('/:productId/move-to-cart', isAuthenticated, moveToCart);

module.exports = router;
