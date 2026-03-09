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
    return `${url}?${JSON.stringify(sortedParams)}`;
  }

  // Check if data is in cache and still valid
  isValid(key, maxAge = 5 * 60 * 1000) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < maxAge;
  }

  // Get cached data
  get(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  // Set cache data
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Remove from cache
  remove(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Check if request is pending
  isPending(key) {
    return this.pendingRequests.has(key);
  }

  // Add pending request
  addPending(key, promise) {
    this.pendingRequests.set(key, promise);
    
    // Remove from pending when done
    promise
      .then((response) => {
        this.pendingRequests.delete(key);
        this.set(key, response.data);
        return response;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });
    
    return promise;
  }

  // Get pending request
  getPending(key) {
    return this.pendingRequests.get(key);
  }

  // Remove pending request
  removePending(key) {
    this.pendingRequests.delete(key);
  }
}

const apiCache = new ApiCache();

// Also export legacy functions for backward compatibility
export const getCachedData = (key, maxAge = 5 * 60 * 1000) => {
  if (apiCache.isValid(key, maxAge)) {
    return apiCache.get(key);
  }
  return null;
};

export const setCachedData = (key, data) => {
  apiCache.set(key, data);
};

export const clearCache = (key) => {
  if (key) {
    apiCache.remove(key);
  } else {
    apiCache.clear();
  }
};

export default apiCache;
