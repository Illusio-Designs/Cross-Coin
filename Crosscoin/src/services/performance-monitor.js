/**
 * Performance Monitoring Service
 * Tracks API response times, cache hits/misses, and sends metrics to analytics backend
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 1000; // Keep last 1000 metrics in memory
    this.batchSize = 50; // Send metrics in batches of 50
    this.flushInterval = 30000; // Flush every 30 seconds
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    
    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Track a metric for an API endpoint
   * @param {string} endpoint - The API endpoint (e.g., '/api/products')
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} cacheHit - Whether the response came from cache
   * @param {number} statusCode - HTTP status code
   * @param {string} method - HTTP method (GET, POST, etc.)
   */
  trackMetric(endpoint, responseTime, cacheHit = false, statusCode = 200, method = 'GET') {
    const metric = {
      endpoint,
      responseTime,
      cacheHit,
      statusCode,
      method,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    this.metrics.push(metric);

    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Auto-flush if we have enough metrics
    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }

    return metric;
  }

  /**
   * Get metrics for a specific endpoint
   * @param {string} endpoint - The endpoint to filter by
   * @returns {Array} Array of metrics for that endpoint
   */
  getMetricsForEndpoint(endpoint) {
    return this.metrics.filter(m => m.endpoint === endpoint);
  }

  /**
   * Get average response time for an endpoint
   * @param {string} endpoint - The endpoint to analyze
   * @returns {number} Average response time in milliseconds
   */
  getAverageResponseTime(endpoint) {
    const endpointMetrics = this.getMetricsForEndpoint(endpoint);
    if (endpointMetrics.length === 0) return 0;

    const sum = endpointMetrics.reduce((acc, m) => acc + m.responseTime, 0);
    return sum / endpointMetrics.length;
  }

  /**
   * Get cache hit rate for an endpoint
   * @param {string} endpoint - The endpoint to analyze
   * @returns {number} Cache hit rate as percentage (0-100)
   */
  getCacheHitRate(endpoint) {
    const endpointMetrics = this.getMetricsForEndpoint(endpoint);
    if (endpointMetrics.length === 0) return 0;

    const cacheHits = endpointMetrics.filter(m => m.cacheHit).length;
    return (cacheHits / endpointMetrics.length) * 100;
  }

  /**
   * Get performance summary for all endpoints
   * @returns {Object} Summary of performance metrics
   */
  getPerformanceSummary() {
    const endpoints = [...new Set(this.metrics.map(m => m.endpoint))];
    
    const summary = {
      totalRequests: this.metrics.length,
      endpoints: {},
      overallAverageResponseTime: 0,
      overallCacheHitRate: 0,
    };

    endpoints.forEach(endpoint => {
      const endpointMetrics = this.getMetricsForEndpoint(endpoint);
      const avgResponseTime = this.getAverageResponseTime(endpoint);
      const cacheHitRate = this.getCacheHitRate(endpoint);

      summary.endpoints[endpoint] = {
        requestCount: endpointMetrics.length,
        averageResponseTime: avgResponseTime,
        cacheHitRate: cacheHitRate,
        minResponseTime: Math.min(...endpointMetrics.map(m => m.responseTime)),
        maxResponseTime: Math.max(...endpointMetrics.map(m => m.responseTime)),
      };
    });

    // Calculate overall metrics
    if (this.metrics.length > 0) {
      const totalResponseTime = this.metrics.reduce((acc, m) => acc + m.responseTime, 0);
      summary.overallAverageResponseTime = totalResponseTime / this.metrics.length;

      const cacheHits = this.metrics.filter(m => m.cacheHit).length;
      summary.overallCacheHitRate = (cacheHits / this.metrics.length) * 100;
    }

    return summary;
  }

  /**
   * Flush metrics to the backend
   */
  async flush() {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = []; // Clear metrics after copying

    try {
      const response = await fetch(`${this.apiUrl}/api/analytics/performance-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsToSend,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        // Re-add metrics if send failed
        this.metrics = metricsToSend.concat(this.metrics);
      }
    } catch (error) {
      // Re-add metrics if send failed
      this.metrics = metricsToSend.concat(this.metrics);
    }
  }

  /**
   * Start periodic flush of metrics
   */
  startPeriodicFlush() {
    if (typeof window === 'undefined') return; // SSR guard
    this.flushIntervalId = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush() {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Get metrics as JSON for export
   * @returns {string} JSON string of all metrics
   */
  exportMetrics() {
    return JSON.stringify(this.getPerformanceSummary(), null, 2);
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

