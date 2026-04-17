const brandSettingsService = require('../services/brandSettingsService');
const { logger } = require('../config/logging.js');

/**
 * Get all settings for a brand
 * GET /api/admin/brand-settings?brandId=1&category=payment
 */
async function getAllSettings(req, res) {
    try {
        const { brandId, category } = req.query;
        
        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID is required'
            });
        }
        
        let settings;
        if (category) {
            settings = await brandSettingsService.getSettingsByCategory(brandId, category);
        } else {
            settings = await brandSettingsService.getAllSettings(brandId);
        }
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Error fetching brand settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand settings',
            error: error.message
        });
    }
}

/**
 * Get settings by category
 * GET /api/admin/brand-settings/category/:category?brandId=1
 */
async function getSettingsByCategory(req, res) {
    try {
        const { category } = req.params;
        const { brandId } = req.query;
        
        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID is required'
            });
        }
        
        const settings = await brandSettingsService.getSettingsByCategory(brandId, category);
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Error fetching settings by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
}

/**
 * Get a single setting
 * GET /api/admin/brand-settings/:key?brandId=1
 */
async function getSingleSetting(req, res) {
    try {
        const { key } = req.params;
        const { brandId } = req.query;
        
        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID is required'
            });
        }
        
        const setting = await brandSettingsService.getSetting(brandId, key);
        
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
        logger.error('Error fetching setting:', error);
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
        const { brand_id, key, value, category, is_encrypted, description } = req.body;
        
        if (!brand_id || !key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID, key, and value are required'
            });
        }
        
        const setting = await brandSettingsService.createSetting({
            brand_id,
            key,
            value,
            category: category || 'general',
            is_encrypted: is_encrypted || false,
            description: description || null,
            updated_by: req.user?.id || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Setting created successfully',
            data: setting
        });
    } catch (error) {
        logger.error('Error creating setting:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Setting with this key already exists for this brand'
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
 * PUT /api/admin/brand-settings/:key?brandId=1
 */
async function updateSetting(req, res) {
    try {
        const { key } = req.params;
        const { brandId } = req.query;
        const { value, is_encrypted } = req.body;
        
        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID is required'
            });
        }
        
        if (value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Setting value is required'
            });
        }
        
        const updated = await brandSettingsService.updateSetting(brandId, key, {
            value,
            is_encrypted,
            updated_by: req.user?.id || null
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
        logger.error('Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting',
            error: error.message
        });
    }
}

/**
 * Delete a setting
 * DELETE /api/admin/brand-settings/:key?brandId=1
 */
async function deleteSetting(req, res) {
    try {
        const { key } = req.params;
        const { brandId } = req.query;
        
        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID is required'
            });
        }
        
        const deleted = await brandSettingsService.deleteSetting(brandId, key);
        
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
        logger.error('Error deleting setting:', error);
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
