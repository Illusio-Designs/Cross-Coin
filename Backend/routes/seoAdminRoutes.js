const express = require('express');
const router = express.Router();
const {
  getSeoHealthSummary,
  listProductSeo,
  bulkUpdateProductSeo,
} = require('../controller/productController.js');
const { isAuthenticated, isProductManager } = require('../middleware/authMiddleware.js');

// ── Admin-only SEO dashboard endpoints ──────────────────────────────────────
// Health summary: counts of records missing each common SEO field, used by
// the Dashboard > SEO > Health page.
router.get('/admin/seo/health',         isAuthenticated, isProductManager, getSeoHealthSummary);

// Bulk SEO editor: list all products with their meta fields, then save
// edits in one shot.
router.get('/admin/seo/products',        isAuthenticated, isProductManager, listProductSeo);
router.put('/admin/seo/products/bulk',   isAuthenticated, isProductManager, bulkUpdateProductSeo);

module.exports = router;
