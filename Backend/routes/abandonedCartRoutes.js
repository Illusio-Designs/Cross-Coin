'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const { capture, restore, adminList } = require('../controller/abandonedCartController.js');

// Public, brand-scoped (optionalBrand on the mount sets req.brandId).
router.post('/abandoned-cart', capture);
// Public — line items behind a WhatsApp cart-recovery link (unguessable token).
router.get('/abandoned-cart/restore/:token', restore);

// Admin — list captured abandoned carts + recovery stats for the dashboard.
router.get('/admin/abandoned-carts', authenticate, isAdmin, adminList);

module.exports = router;
