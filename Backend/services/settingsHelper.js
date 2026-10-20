const { BrandSetting } = require('../model/brandSettingModel');
const { decrypt } = require('../utils/encryption');

// Per-brand account credentials. The shared server (.env) values belong to the
// primary brand (1, Cross Coin) — another brand without its own keys must NOT
// silently send Purchase events to Cross Coin's pixel.
// Razorpay is deliberately NOT in this list: stores without their own keys keep
// taking payments on the shared account (the Brands page warns about it) —
// cutting them off would stop online payments on those stores.
// WhatsApp is one shared number by design: its env values also serve the shared
// WhatsApp brand (whatsappService then lends that brand's creds to the others).
const PRIMARY_BRAND_ID = 1;
const BRAND_CREDENTIAL_KEYS = new Set([
    'FB_PIXEL_ID', 'FB_ACCESS_TOKEN', 'FB_TEST_EVENT_CODE',
    'CUSTOM_CHECKOUT_API_KEY', 'CUSTOM_CHECKOUT_HMAC_SECRET',
    'WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID',
]);
function envFallbackAllowed(brandId, key, brandOnly = false) {
    if (brandOnly) return false;
    if (!BRAND_CREDENTIAL_KEYS.has(key)) return true;
    const id = Number(brandId);
    if (id === PRIMARY_BRAND_ID) return true;
    return String(key).startsWith('WHATSAPP_') && id === (Number(process.env.WHATSAPP_SHARED_BRAND_ID) || PRIMARY_BRAND_ID);
}

// Account credentials shared by ALL stores ("General · all stores" on the
// Brands page). Stored once, on GLOBAL_BRAND_ID, under the key ALL_<KEY>. When
// set they win for every store; until then each store's own value (then the
// usual env fallback) is used, so nothing changes until General is filled in.
const GLOBAL_BRAND_ID = 1;
const GLOBAL_PREFIX = 'ALL_';
const GLOBAL_KEYS = new Set([
    'FB_ACCESS_TOKEN', 'META_ADS_TOKEN',
    'ITHINK_ACCESS_TOKEN', 'ITHINK_SECRET_KEY', 'ITHINK_ENVIRONMENT',
    'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET',
]);

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
     * @param {object} options - brandOnly disables shared environment fallbacks
     * @returns {Promise<string>} Setting value
     */
    // The all-stores value of `key` (row ALL_<key> on GLOBAL_BRAND_ID), or null.
    async getGlobal(key) {
        const cacheKey = `global:${key}`;
        const hit = this.cache.get(cacheKey);
        if (hit && Date.now() - hit.timestamp < this.cacheTTL) return hit.value;
        let value = null;
        try {
            const row = await BrandSetting.findOne({ where: { brand_id: GLOBAL_BRAND_ID, key: GLOBAL_PREFIX + key } });
            const raw = row ? row.getDataValue('value') : null;
            value = raw ? (row.is_encrypted ? decrypt(raw) : raw) : null;
        } catch (_) { value = null; }
        this.cache.set(cacheKey, { value: value || null, timestamp: Date.now() });
        return value || null;
    }

    async getSetting(brandId, key, defaultValue = null, { brandOnly = false } = {}) {
        if (GLOBAL_KEYS.has(key)) {
            const shared = await this.getGlobal(key);
            if (shared) return shared;
        }
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

            // Fallback to environment variable (never another brand's credentials)
            const envValue = envFallbackAllowed(brandId, key, brandOnly) ? process.env[key] : null;
            if (envValue) {
                const { logger } = require('../config/logging');
                logger.debug(`Using environment variable for ${key} (not found in brand settings)`);
                return envValue;
            }

            return defaultValue;
        } catch (error) {
            console.error(`Error getting setting ${key}:`, error.message);
            
            // Fallback to environment variable on error
            const envValue = envFallbackAllowed(brandId, key, brandOnly) ? process.env[key] : null;
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
        // The all-stores values live on GLOBAL_BRAND_ID: clearing it (or
        // clearing everything) also drops them.
        const all = brandId === undefined || brandId === null;
        for (const key of this.cache.keys()) {
            if (all || key.startsWith(`${brandId}:`) || (Number(brandId) === GLOBAL_BRAND_ID && key.startsWith('global:'))) {
                this.cache.delete(key);
            }
        }
    }

}

// Export singleton instance
module.exports = new SettingsHelper();
module.exports.envFallbackAllowed = envFallbackAllowed;
module.exports.BRAND_CREDENTIAL_KEYS = BRAND_CREDENTIAL_KEYS;
module.exports.GLOBAL_KEYS = GLOBAL_KEYS;
module.exports.GLOBAL_BRAND_ID = GLOBAL_BRAND_ID;
module.exports.GLOBAL_PREFIX = GLOBAL_PREFIX;
