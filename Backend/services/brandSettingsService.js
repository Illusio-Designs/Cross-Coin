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

module.exports = {
    getBrandSetting,
    getAllBrandSettings,
    setBrandSetting,
    deleteBrandSetting,
    clearBrandCache
};
