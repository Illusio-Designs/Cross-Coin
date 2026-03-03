const express = require('express');
const router = express.Router();
const brandSettingsController = require('../controller/brandSettingsController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticateToken, isAdmin);

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

module.exports = router;
