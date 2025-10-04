// Simple API cache utility to prevent multiple calls
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
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

  // Add pending request
  addPending(cacheKey, promise) {
    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  // Remove pending request
  removePending(cacheKey) {
    this.pendingRequests.delete(cacheKey);
  }

  // Get cached data
  get(cacheKey) {
    return this.cache.get(cacheKey);
  }

  // Set cached data
  set(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  // Check if cache is valid (5 minutes)
  isValid(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - cached.timestamp) < fiveMinutes;
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
}

// Create singleton instance
const apiCache = new ApiCache();

export default apiCache;
