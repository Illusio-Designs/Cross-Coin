const express = require('express');
const router = express.Router();

const {
  getLookbooks,
  getLookbookBySlug,
} = require('../controller/lookbookController.js');

// Public routes
router.get('/', getLookbooks);
router.get('/:slug', getLookbookBySlug);

module.exports = router;

