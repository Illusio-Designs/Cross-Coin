'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const { capture, recovered, adminList } = require('../controller/abandonedCartController.js');

// Public, brand-scoped (optionalBrand on the mount sets req.brandId).
router.post('/abandoned-cart', capture);
router.post('/abandoned-cart/recovered', recovered);

// Admin — list captured abandoned carts + recovery stats for the dashboard.
router.get('/admin/abandoned-carts', authenticate, isAdmin, adminList);

module.exports = router;
