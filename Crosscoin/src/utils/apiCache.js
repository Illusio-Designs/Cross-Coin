// Enhanced API cache utility with TTL support and better performance
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  // Generate cache key from URL and params
  getCacheKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    return `${url}_${JSON.stringify(sortedParams)}`;
  }

  // Check if request is already pending
  isPending(cacheKey) {
    return this.pendingRequests.has(cacheKey);
  }

  // Get pending request promise
  getPending(cacheKey) {
    return this.pendingRequests.get(cacheKey);
  }

  // Add pending request
  addPending(cacheKey, promise) {
    this.pendingRequests.set(cacheKey, promise);
    // Auto-cleanup after promise resolves
    promise.finally(() => {
      this.removePending(cacheKey);
    });
    return promise;
  }

  // Remove pending request
  removePending(cacheKey) {
    this.pendingRequests.delete(cacheKey);
  }

  // Get cached data
  get(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }

  // Set cached data with custom TTL
  set(cacheKey, data, ttl = this.defaultTTL) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  // Check if cache is valid
  isValid(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    return Date.now() < cached.expiresAt;
  }

  // Clear cache
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Clear specific cache entry
  clearEntry(cacheKey) {
    this.cache.delete(cacheKey);
    this.pendingRequests.delete(cacheKey);
  }

  // Clear expired entries (cleanup)
  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      pending: this.pendingRequests.size
    };
  }
}

// Create singleton instance
const apiCache = new ApiCache();

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.clearExpired();
  }, 5 * 60 * 1000);
}

export default apiCache;

// Helper function for easy cache usage
export const getCachedData = (key) => apiCache.get(key);
export const setCachedData = (key, data, ttl) => apiCache.set(key, data, ttl);
export const clearCache = () => apiCache.clear();
