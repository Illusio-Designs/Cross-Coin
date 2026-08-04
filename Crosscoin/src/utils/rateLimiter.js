// Rate limiting utility to prevent API overload from rapid/duplicate requests
class RateLimiter {
  constructor() {
    this.requestTimestamps = new Map(); // { endpoint: [timestamps...] }
    this.pendingRequests = new Map(); // { cacheKey: Promise }
    // Default limits: 5 requests per endpoint per 1 second (adaptive per endpoint)
    this.limits = {
      default: { maxRequests: 5, windowMs: 1000 },
      '/api/orders': { maxRequests: 3, windowMs: 2000 },
      '/api/products': { maxRequests: 5, windowMs: 1000 },
      '/api/payments': { maxRequests: 3, windowMs: 2000 },
      '/api/categories': { maxRequests: 5, windowMs: 1000 },
      '/api/coupons': { maxRequests: 5, windowMs: 1000 },
      '/api/shipping': { maxRequests: 3, windowMs: 2000 },
    };
  }

  getLimitForEndpoint(endpoint) {
    for (const [path, limit] of Object.entries(this.limits)) {
      if (endpoint.includes(path)) return limit;
    }
    return this.limits.default;
  }

  canMakeRequest(endpoint) {
    const now = Date.now();
    const limit = this.getLimitForEndpoint(endpoint);
    const timestamps = this.requestTimestamps.get(endpoint) || [];

    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(ts => now - ts < limit.windowMs);
    this.requestTimestamps.set(endpoint, recentTimestamps);

    // Check if we can make a request
    if (recentTimestamps.length < limit.maxRequests) {
      recentTimestamps.push(now);
      this.requestTimestamps.set(endpoint, recentTimestamps);
      return true;
    }

    return false;
  }

  getWaitTime(endpoint) {
    const limit = this.getLimitForEndpoint(endpoint);
    const timestamps = this.requestTimestamps.get(endpoint) || [];

    if (timestamps.length === 0) return 0;

    const oldestTimestamp = timestamps[0];
    const waitTime = Math.max(0, limit.windowMs - (Date.now() - oldestTimestamp));
    return waitTime;
  }

  // Deduplication cache to prevent duplicate concurrent requests
  async deduplicateRequest(cacheKey, requestFn) {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create new promise and store it
    const promise = requestFn()
      .then(result => {
        this.pendingRequests.delete(cacheKey);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  // Wait until rate limit allows request
  async waitForSlot(endpoint) {
    while (!this.canMakeRequest(endpoint)) {
      const waitTime = this.getWaitTime(endpoint);
      await new Promise(resolve => setTimeout(resolve, waitTime + 50)); // +50ms buffer
    }
  }

  // Clear rate limit history (for testing or reset)
  clear(endpoint = null) {
    if (endpoint) {
      this.requestTimestamps.delete(endpoint);
      this.pendingRequests.delete(endpoint);
    } else {
      this.requestTimestamps.clear();
      this.pendingRequests.clear();
    }
  }

  // Get stats for monitoring
  getStats(endpoint) {
    const now = Date.now();
    const limit = this.getLimitForEndpoint(endpoint);
    const timestamps = (this.requestTimestamps.get(endpoint) || []).filter(
      ts => now - ts < limit.windowMs
    );

    return {
      endpoint,
      currentRequests: timestamps.length,
      maxRequests: limit.maxRequests,
      windowMs: limit.windowMs,
      availableSlots: Math.max(0, limit.maxRequests - timestamps.length),
      nextAvailableIn: this.getWaitTime(endpoint),
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export class for testing
export default RateLimiter;
