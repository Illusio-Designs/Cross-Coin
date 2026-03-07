/**
 * Simple in-memory cache for API responses
 * Reduces duplicate API calls and improves performance
 */

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes default

/**
 * Get cached data if it exists and is not expired
 * @param {string} key - Cache key
 * @param {number} maxAge - Maximum age in milliseconds (optional)
 * @returns {any|null} Cached data or null if not found/expired
 */
export const getCachedData = (key, maxAge = CACHE_DURATION) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < maxAge) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached.data;
  }
  if (cached) {
    console.log(`⏰ Cache EXPIRED: ${key}`);
    cache.delete(key);
  } else {
    console.log(`❌ Cache MISS: ${key}`);
  }
  return null;
};

/**
 * Store data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log(`💾 Cache SET: ${key}`);
};

/**
 * Clear cache for a specific key or all cache
 * @param {string} key - Cache key (optional, clears all if not provided)
 */
export const clearCache = (key) => {
  if (key) {
    cache.delete(key);
    console.log(`🗑️ Cache CLEAR: ${key}`);
  } else {
    cache.clear();
    console.log(`🗑️ Cache CLEAR: ALL`);
  }
};

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
};

// Clear expired cache entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        cache.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export default {
  getCachedData,
  setCachedData,
  clearCache,
  getCacheStats
};
