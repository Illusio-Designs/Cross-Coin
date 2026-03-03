const { BrandSetting } = require('../model/brandSettingModel');
const { encrypt, decrypt } = require('../utils/encryption');

// In-memory cache for settings (5 minutes TTL)
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a single brand setting
 */
async function getBrandSetting(brandId, key, useCache = true) {
    const cacheKey = `${brandId}:${key}`;
    
    // Check cache first
    if (useCache && settingsCache.has(cacheKey)) {
        const cached = settingsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.value;
        }
        settingsCache.delete(cacheKey);
    }
    
    const setting = await BrandSetting.findOne({
        where: { brand_id: brandId, key }
    });
    
    if (!setting) {
        return null;
    }
    
    // Decrypt if needed
    let value = setting.value;
    if (setting.is_encrypted && value) {
        value = decrypt(value);
    }
    
    // Cache the result
    if (useCache) {
        settingsCache.set(cacheKey, {
            value,
            timestamp: Date.now()
        });
    }
    
    return value;
}

/**
 * Get all settings for a brand (optionally filtered by category)
 */
async function getAllBrandSettings(brandId, category = null) {
    const where = { brand_id: brandId };
    if (category) {
        where.category = category;
    }
    
    const settings = await BrandSetting.findAll({ where });
    
    const result = {};
    for (const setting of settings) {
        let value = setting.value;
        if (setting.is_encrypted && value) {
            value = decrypt(value);
        }
        result[setting.key] = {
            value,
            category: setting.category,
            description: setting.description,
            is_encrypted: setting.is_encrypted
        };
    }
    
    return result;
}

/**
 * Set or update a brand setting
 */
async function setBrandSetting(brandId, key, value, isEncrypted = false, category = 'general', description = null, updatedBy = null) {
    // Encrypt if needed
    let finalValue = value;
    if (isEncrypted && value) {
        finalValue = encrypt(value);
    }
    
    const [setting, created] = await BrandSetting.upsert({
        brand_id: brandId,
        key,
        value: finalValue,
        is_encrypted: isEncrypted,
        category,
        description,
        updated_by: updatedBy
    }, {
        returning: true
    });
    
    // Clear cache
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    
    return setting;
}

/**
 * Delete a brand setting
 */
async function deleteBrandSetting(brandId, key) {
    const deleted = await BrandSetting.destroy({
        where: { brand_id: brandId, key }
    });
    
    // Clear cache
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    
    return deleted > 0;
}

/**
 * Clear all cached settings for a brand
 */
function clearBrandCache(brandId) {
    for (const key of settingsCache.keys()) {
        if (key.startsWith(`${brandId}:`)) {
            settingsCache.delete(key);
        }
    }
}

/**
 * Get all settings for a brand
 */
async function getAllSettings(brandId) {
    return await getAllBrandSettings(brandId);
}

/**
 * Get settings by category
 */
async function getSettingsByCategory(brandId, category) {
    return await getAllBrandSettings(brandId, category);
}

/**
 * Get a single setting
 */
async function getSetting(brandId, key) {
    const setting = await BrandSetting.findOne({
        where: { brand_id: brandId, key }
    });
    return setting;
}

/**
 * Create a new setting
 */
async function createSetting(data) {
    let finalValue = data.value;
    if (data.is_encrypted && finalValue) {
        finalValue = encrypt(finalValue);
    }
    
    const setting = await BrandSetting.create({
        brand_id: data.brand_id,
        key: data.key,
        value: finalValue,
        is_encrypted: data.is_encrypted || false,
        category: data.category || 'general',
        description: data.description || null,
        updated_by: data.updated_by || null
    });
    
    return setting;
}

/**
 * Update a setting
 */
async function updateSetting(brandId, key, data) {
    const setting = await BrandSetting.findOne({
        where: { brand_id: brandId, key }
    });
    
    if (!setting) {
        return null;
    }
    
    let finalValue = data.value;
    if (data.is_encrypted && finalValue) {
        finalValue = encrypt(finalValue);
    }
    
    await setting.update({
        value: finalValue,
        is_encrypted: data.is_encrypted !== undefined ? data.is_encrypted : setting.is_encrypted,
        updated_by: data.updated_by || null
    });
    
    // Clear cache
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    
    return setting;
}

/**
 * Delete a setting
 */
async function deleteSetting(brandId, key) {
    return await deleteBrandSetting(brandId, key);
}

module.exports = {
    getBrandSetting,
    getAllBrandSettings,
    setBrandSetting,
    deleteBrandSetting,
    clearBrandCache,
    getAllSettings,
    getSettingsByCategory,
    getSetting,
    createSetting,
    updateSetting,
    deleteSetting
};
