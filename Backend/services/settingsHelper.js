const { BrandSetting } = require('../model/brandSettingModel');
const { decrypt } = require('../utils/encryption');

/**
 * Helper to get brand settings from database
 * Falls back to environment variables if not found
 */
class SettingsHelper {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get a setting value for a brand
     * @param {number} brandId - Brand ID
     * @param {string} key - Setting key
     * @param {string} defaultValue - Default value if not found
     * @returns {Promise<string>} Setting value
     */
    async getSetting(brandId, key, defaultValue = null) {
        const cacheKey = `${brandId}:${key}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTTL) {
                return cached.value;
            }
            this.cache.delete(cacheKey);
        }

        try {
            const setting = await BrandSetting.findOne({
                where: { brand_id: brandId, key }
            });

            if (setting) {
                const rawValue = setting.getDataValue('value');
                let value = rawValue;

                // Decrypt sensitive values when the row is flagged as encrypted.
                if (setting.is_encrypted && rawValue) {
                    value = decrypt(rawValue);
                }

                // Cache the result
                this.cache.set(cacheKey, {
                    value,
                    timestamp: Date.now()
                });

                return value;
            }

            // Fallback to environment variable
            const envValue = process.env[key];
            if (envValue) {
                const { logger } = require('../config/logging');
                logger.debug(`Using environment variable for ${key} (not found in brand settings)`);
                return envValue;
            }

            return defaultValue;
        } catch (error) {
            console.error(`Error getting setting ${key}:`, error.message);
            
            // Fallback to environment variable on error
            const envValue = process.env[key];
            if (envValue) {
                return envValue;
            }

            return defaultValue;
        }
    }

    /**
     * Get multiple settings at once
     * @param {number} brandId - Brand ID
     * @param {string[]} keys - Array of setting keys
     * @returns {Promise<Object>} Object with key-value pairs
     */
    async getSettings(brandId, keys) {
        const settings = {};
        
        for (const key of keys) {
            settings[key] = await this.getSetting(brandId, key);
        }

        return settings;
    }

    /**
     * Clear cache for a brand
     * @param {number} brandId - Brand ID
     */
    clearCache(brandId) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${brandId}:`)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clearAllCache() {
        this.cache.clear();
    }
}

// Export singleton instance
module.exports = new SettingsHelper();
