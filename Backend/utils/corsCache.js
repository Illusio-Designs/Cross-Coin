// Backend/utils/corsCache.js
// Utility to manually refresh CORS cache

/**
 * Force refresh CORS cache
 * Call this after creating/updating/deleting brands
 */
const refreshCorsCache = async () => {
    try {
        // Import dynamically to avoid circular dependencies
        const corsConfig = require('../config/corsConfig.js');
        
        // Reset cache timestamp to force refresh
        if (corsConfig.getBrandDomains) {
            // Force cache refresh by calling getBrandDomains
            await corsConfig.getBrandDomains();
            console.log('✅ CORS cache manually refreshed');
            return true;
        } else {
            console.warn('⚠️ CORS config does not support cache refresh');
            return false;
        }
    } catch (error) {
        console.error('❌ Error refreshing CORS cache:', error);
        return false;
    }
};

module.exports = { refreshCorsCache };
