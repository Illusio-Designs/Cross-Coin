const { BrandSetting } = require('../model/brandSettingModel');

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
    
    const value = setting.value;
    
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
    
    return settings;
}

/**
 * Set or update a brand setting
 */
async function setBrandSetting(
  brandId,
  key,
  value,
  isEncrypted = false,
  category = 'general',
  description = null,
  updatedBy = null
) {
    const [setting] = await BrandSetting.upsert(
        {
            brand_id: brandId,
            key,
            value: value,
            is_encrypted: !!isEncrypted,
            category,
            description,
            updated_by: updatedBy
        },
        { returning: true }
    );
    
    // Clear cache — BOTH this service's cache AND the settingsHelper cache that
    // the booking/shipping path reads from. They're separate Maps; clearing only
    // this one left the shipping worker using the old value (e.g. a stale pickup
    // address ID) for up to settingsHelper's 5-minute TTL after an admin edit.
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    try { require('./settingsHelper').clearCache(brandId); } catch (_) {}
    
    return setting;
}

/**
 * Delete a brand setting
 */
async function deleteBrandSetting(brandId, key) {
    const deleted = await BrandSetting.destroy({
        where: { brand_id: brandId, key }
    });
    
    // Clear cache — BOTH this service's cache AND the settingsHelper cache that
    // the booking/shipping path reads from. They're separate Maps; clearing only
    // this one left the shipping worker using the old value (e.g. a stale pickup
    // address ID) for up to settingsHelper's 5-minute TTL after an admin edit.
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    try { require('./settingsHelper').clearCache(brandId); } catch (_) {}
    
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
    const setting = await BrandSetting.create({
        brand_id: data.brand_id,
        key: data.key,
        value: data.value,
        is_encrypted: !!data.is_encrypted,
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
    
    await setting.update({
        value: data.value,
        is_encrypted:
            data.is_encrypted !== undefined ? !!data.is_encrypted : setting.is_encrypted,
        updated_by: data.updated_by || null
    });
    
    // Clear cache — BOTH this service's cache AND the settingsHelper cache that
    // the booking/shipping path reads from. They're separate Maps; clearing only
    // this one left the shipping worker using the old value (e.g. a stale pickup
    // address ID) for up to settingsHelper's 5-minute TTL after an admin edit.
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    try { require('./settingsHelper').clearCache(brandId); } catch (_) {}
    
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
