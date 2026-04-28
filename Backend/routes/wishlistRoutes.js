const express = require('express');
const { optionalAuth } = require('../middleware/authMiddleware.js');
const { getWishlist, addToWishlist, removeFromWishlist, clearWishlist, moveToCart } = require('../controller/wishlistController.js');

const router = express.Router();

// Wishlist works for both signed-in users and guests. Authed users are
// identified by JWT (req.user); guests by an X-Guest-Token header that the
// frontend generates and persists in localStorage.
router.use(optionalAuth);

router.get('/',                          getWishlist);
router.post('/:productId',               addToWishlist);
router.delete('/:productId',             removeFromWishlist);
router.delete('/',                       clearWishlist);
router.post('/:productId/move-to-cart',  moveToCart);

module.exports = router;
