'use strict';

const express = require('express');
const router = express.Router();
const { capture, recovered } = require('../controller/abandonedCartController.js');

// Public, brand-scoped (optionalBrand on the mount sets req.brandId).
router.post('/abandoned-cart', capture);
router.post('/abandoned-cart/recovered', recovered);

module.exports = router;
