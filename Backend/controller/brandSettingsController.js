const brandSettingsService = require('../services/brandSettingsService');

/**
 * Get all settings
 * GET /api/admin/brand-settings?category=payment
 */
async function getAllSettings(req, res) {
    try {
        const { category } = req.query;
        
        let settings;
        if (category) {
            settings = await brandSettingsService.getSettingsByCategory(category);
        } else {
            settings = await brandSettingsService.getAllSettings();
        }
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching brand settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand settings',
            error: error.message
        });
    }
}

/**
 * Get settings by category
 * GET /api/admin/brand-settings/category/:category
 */
async function getSettingsByCategory(req, res) {
    try {
        const { category } = req.params;
        
        const settings = await brandSettingsService.getSettingsByCategory(category);
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching settings by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
}

/**
 * Get a single setting
 * GET /api/admin/brand-settings/:key
 */
async function getSingleSetting(req, res) {
    try {
        const { key } = req.params;
        
        const setting = await brandSettingsService.getSetting(key);
        
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }
        
        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch setting',
            error: error.message
        });
    }
}

/**
 * Create a new setting
 * POST /api/admin/brand-settings
 */
async function createSetting(req, res) {
    try {
        const { setting_key, setting_value, category, is_encrypted, description } = req.body;
        
        if (!setting_key || setting_value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Setting key and value are required'
            });
        }
        
        const setting = await brandSettingsService.createSetting({
            setting_key,
            setting_value,
            category: category || 'general',
            is_encrypted: is_encrypted || false,
            description: description || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Setting created successfully',
            data: setting
        });
    } catch (error) {
        console.error('Error creating setting:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Setting with this key already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create setting',
            error: error.message
        });
    }
}

/**
 * Update an existing setting
 * PUT /api/admin/brand-settings/:key
 */
async function updateSetting(req, res) {
    try {
        const { key } = req.params;
        const { setting_value, is_encrypted } = req.body;
        
        if (setting_value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Setting value is required'
            });
        }
        
        const updated = await brandSettingsService.updateSetting(key, {
            setting_value,
            is_encrypted
        });
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Setting updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting',
            error: error.message
        });
    }
}

/**
 * Delete a setting
 * DELETE /api/admin/brand-settings/:key
 */
async function deleteSetting(req, res) {
    try {
        const { key } = req.params;
        
        const deleted = await brandSettingsService.deleteSetting(key);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete setting',
            error: error.message
        });
    }
}

module.exports = {
    getAllSettings,
    getSettingsByCategory,
    getSingleSetting,
    createSetting,
    updateSetting,
    deleteSetting
};
