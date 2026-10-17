const express = require('express');
const router = express.Router();
const bundleController = require('../controller/bundleController.js');
const { authenticate, isAdmin } = require('../middleware/authMiddleware.js');

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/public/bundle-tiers', bundleController.getPublicBundleTiers);
// Store-wide "Build Your Pack" tiers (mix any products, % off by item count).
router.get('/public/pack-tiers', bundleController.getPublicPackTiers);

// ── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/bundle-tiers',        authenticate, isAdmin, bundleController.listBundleTiers);
router.post('/admin/bundle-tiers',        authenticate, isAdmin, bundleController.createBundleTier);
router.put('/admin/bundle-tiers/:id',     authenticate, isAdmin, bundleController.updateBundleTier);
router.delete('/admin/bundle-tiers/:id',  authenticate, isAdmin, bundleController.deleteBundleTier);

module.exports = router;
