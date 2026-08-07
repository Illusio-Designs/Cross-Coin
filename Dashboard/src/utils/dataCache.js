// Simple client-side cache for API responses
// Allows graceful degradation when API is unavailable

class DataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    // Default TTL: 5 minutes
    this.defaultTTL = 5 * 60 * 1000;
  }

  // Generate cache key
  generateKey(endpoint, params = {}) {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${endpoint}:${paramStr}`;
  }

  // Store data in cache
  set(endpoint, data, params = {}, ttl = this.defaultTTL) {
    const key = this.generateKey(endpoint, params);
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + ttl);
  }

  // Retrieve data from cache
  get(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    const timestamp = this.timestamps.get(key);

    // Check if cache exists and hasn't expired
    if (timestamp && Date.now() < timestamp) {
      return this.cache.get(key);
    }

    // Cache expired or doesn't exist
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.timestamps.delete(key);
    }

    return null;
  }

  // Check if data is in cache (even if expired)
  has(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    return this.cache.has(key);
  }

  // Get stale data (even if expired) for fallback
  getStale(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    return this.cache.get(key) || null;
  }

  // Clear specific cache entry
  clear(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
    this.timestamps.clear();
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now < timestamp) {
        validCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      size: JSON.stringify([...this.cache]).length,
    };
  }
}

// Export singleton instance
export const dataCache = new DataCache();

// Wrapper to cache API responses
export const cachedApiCall = async (endpoint, requestFn, params = {}, options = {}) => {
  const { cacheTTL = 5 * 60 * 1000, useFallback = true } = options;

  // Check if fresh data exists in cache
  const cachedData = dataCache.get(endpoint, params);
  if (cachedData) {
    return cachedData;
  }

  try {
    // Make API request
    const result = await requestFn();

    // Store in cache on success
    if (result) {
      dataCache.set(endpoint, result, params, cacheTTL);
    }

    return result;
  } catch (error) {
    // API failed - try to use stale data as fallback
    if (useFallback) {
      const staleData = dataCache.getStale(endpoint, params);
      if (staleData) {
        console.warn(`Using stale cache for ${endpoint} due to API error: ${error.message}`);
        return staleData;
      }
    }

    // No cache available, rethrow error
    throw error;
  }
};

export default DataCache;
