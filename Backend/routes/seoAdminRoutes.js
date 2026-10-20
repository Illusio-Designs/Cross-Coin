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

// SEO page: score, tiles and the "To fix" list for one store.
const seoOverview = require('../services/seoOverviewService.js');
const fail = (res, err, msg) => res.status(err.status || 500).json({ success: false, message: err.status ? err.message : msg });
router.get('/admin/seo/overview', isAuthenticated, isProductManager, async (req, res) => {
  try { res.json({ success: true, ...(await seoOverview.getOverview(req.query.brandId)) }); }
  catch (err) { fail(res, err, 'Could not load the SEO overview'); }
});
// Store details (SEO_* brand settings only), so product managers can keep them
// without access to the rest of the store settings.
router.get('/admin/seo/store-details', isAuthenticated, isProductManager, async (req, res) => {
  try { res.json({ success: true, ...(await seoOverview.getStoreDetails(req.query.brandId)) }); }
  catch (err) { fail(res, err, 'Could not load the store details'); }
});
router.put('/admin/seo/store-details', isAuthenticated, isProductManager, async (req, res) => {
  try { res.json({ success: true, ...(await seoOverview.saveStoreDetails(req.body?.brandId, req.body?.values, req.user?.id)) }); }
  catch (err) { fail(res, err, 'Could not save the store details'); }
});

// Website area (Photos library, policies list, SEO pages list) — /api/admin/website/*.
router.use(require('./websiteAdminRoutes.js'));

module.exports = router;
