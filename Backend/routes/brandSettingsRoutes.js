const express = require('express');
const router = express.Router();
const brandSettingsController = require('../controller/brandSettingsController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const shippingProviderFactory = require('../services/shippingProviderFactory.js');

// All routes require admin authentication
router.use('/', authenticate, isAdmin);

// Get all settings (with optional category filter via query param)
router.get('/brand-settings', brandSettingsController.getAllSettings);

// Get settings by category
router.get('/brand-settings/category/:category', brandSettingsController.getSettingsByCategory);

// Get a single setting by key
router.get('/brand-settings/:key', brandSettingsController.getSingleSetting);

// Create a new setting
router.post('/brand-settings', brandSettingsController.createSetting);

// Update an existing setting
router.put('/brand-settings/:key', brandSettingsController.updateSetting);

// Delete a setting
router.delete('/brand-settings/:key', brandSettingsController.deleteSetting);

// ── Shipping provider diagnostics ──────────────────────────────────────────
// List the pickup warehouses iThink considers visible to the brand's stored
// API credentials. Use this to debug "Warehouse Address Not Found" errors —
// if the warehouse you're trying to use doesn't appear here, the API token
// belongs to a different iThink (sub)account than the dashboard you're
// looking at.
router.get('/shipping/ithink-warehouses', async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId, 10) || 1;
    shippingProviderFactory.clearCache(brandId); // make sure we use the latest saved settings
    const provider = shippingProviderFactory.getProviderByName('ithink', brandId);
    const raw = await provider.listWarehouses();
    return res.json({ success: true, data: raw });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to list iThink warehouses',
    });
  }
});

module.exports = router;
