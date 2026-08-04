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
// Verify the brand's configured iThink pickup address by asking iThink to
// resolve it using the brand's stored Access Token / Secret Key. iThink has
// no documented "list all warehouses" endpoint, so we look up the saved
// Pickup Address ID directly — if iThink finds an approved warehouse with
// that ID for these credentials, the sync will work; otherwise we surface
// the exact reason ("Warehouse not found", "Pending approval", etc.).
router.get('/shipping/ithink-warehouses', async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId, 10) || 1;
    const overrideId = (req.query.warehouseId || '').toString().trim();
    shippingProviderFactory.clearCache(brandId); // ensure latest saved settings are used

    const provider = shippingProviderFactory.getProviderByName('ithink', brandId);

    // If the caller didn't pass an explicit warehouse_id, ask iThink about
    // the brand's saved ITHINK_PICKUP_ADDRESS_ID.
    const settingsHelper = require('../services/settingsHelper');
    const savedId = overrideId
      || (await settingsHelper.getSetting(brandId, 'ITHINK_PICKUP_ADDRESS_ID'))
      || '';

    if (!savedId) {
      return res.status(400).json({
        success: false,
        message: 'No iThink Pickup Address ID is configured for this brand yet.',
      });
    }

    const raw = await provider.getWarehouse(savedId);
    return res.json({ success: true, warehouse_id: savedId, data: raw });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify iThink pickup address',
    });
  }
});

module.exports = router;
