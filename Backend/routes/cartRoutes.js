const express = require('express');
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controller/cartController.js');
const { authenticate } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.use(authenticate);

router.get('/',                              getCart);
router.post('/items',                        addToCart);
router.put('/items/:productId',              updateCartItem);
router.delete('/items/:productId(/:variationId)?', removeFromCart);
router.delete('/',                           clearCart);

module.exports = router;
