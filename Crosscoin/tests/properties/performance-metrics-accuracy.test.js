/**
 * Property Test: Performance Metrics Accuracy
 * Validates that performance metrics are within 10% of actual measured time
 */

import performanceMonitor from '../../src/services/performance-monitor';

describe('Property: Performance Metrics Accuracy', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    performanceMonitor.stopPeriodicFlush();
  });

  /**
   * Property: Average response time calculation is accurate
   * For any set of response times, the calculated average should be within 1% of actual average
   */
  test('average response time calculation is accurate', () => {
    const testCases = [
      { times: [100, 200, 300], endpoint: '/api/products' },
      { times: [50, 75, 100, 125, 150], endpoint: '/api/categories' },
      { times: [1000], endpoint: '/api/checkout' },
      { times: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], endpoint: '/api/orders' },
    ];

    testCases.forEach(({ times, endpoint }) => {
      performanceMonitor.clearMetrics();

      // Track metrics
      times.forEach(time => {
        performanceMonitor.trackMetric(endpoint, time, false, 200, 'GET');
      });

      // Calculate expected average
      const expectedAverage = times.reduce((a, b) => a + b, 0) / times.length;

      // Get actual average from monitor
      const actualAverage = performanceMonitor.getAverageResponseTime(endpoint);

      // Verify accuracy within 1%
      const tolerance = expectedAverage * 0.01;
      expect(Math.abs(actualAverage - expectedAverage)).toBeLessThanOrEqual(tolerance);
    });
  });

  /**
   * Property: Cache hit rate calculation is accurate
   * For any mix of cache hits and misses, the calculated rate should be exact
   */
  test('cache hit rate calculation is accurate', () => {
    const testCases = [
      { hits: 5, misses: 5, endpoint: '/api/products' }, // 50%
      { hits: 8, misses: 2, endpoint: '/api/categories' }, // 80%
      { hits: 0, misses: 10, endpoint: '/api/checkout' }, // 0%
      { hits: 10, misses: 0, endpoint: '/api/orders' }, // 100%
    ];

    testCases.forEach(({ hits, misses, endpoint }) => {
      performanceMonitor.clearMetrics();

      // Track cache hits
      for (let i = 0; i < hits; i++) {
        performanceMonitor.trackMetric(endpoint, 50, true, 200, 'GET');
      }

      // Track cache misses
      for (let i = 0; i < misses; i++) {
        performanceMonitor.trackMetric(endpoint, 200, false, 200, 'GET');
      }

      // Calculate expected rate
      const expectedRate = (hits / (hits + misses)) * 100;

      // Get actual rate from monitor
      const actualRate = performanceMonitor.getCacheHitRate(endpoint);

      // Verify exact match
      expect(actualRate).toBe(expectedRate);
    });
  });

  /**
   * Property: Min/Max response times are correctly identified
   * For any set of response times, min and max should match actual min/max
   */
  test('min and max response times are correctly identified', () => {
    const testCases = [
      { times: [100, 200, 300, 150, 250], endpoint: '/api/products' },
      { times: [50, 75, 100, 125, 150], endpoint: '/api/categories' },
      { times: [1000, 500, 750], endpoint: '/api/checkout' },
    ];

    testCases.forEach(({ times, endpoint }) => {
      performanceMonitor.clearMetrics();

      // Track metrics
      times.forEach(time => {
        performanceMonitor.trackMetric(endpoint, time, false, 200, 'GET');
      });

      // Get summary
      const summary = performanceMonitor.getPerformanceSummary();
      const endpointSummary = summary.endpoints[endpoint];

      // Verify min and max
      expect(endpointSummary.minResponseTime).toBe(Math.min(...times));
      expect(endpointSummary.maxResponseTime).toBe(Math.max(...times));
    });
  });

  /**
   * Property: Overall metrics are correctly aggregated
   * For multiple endpoints, overall average should be weighted average of all requests
   */
  test('overall metrics are correctly aggregated across endpoints', () => {
    // Track metrics for multiple endpoints
    const endpoint1Metrics = [100, 150, 200];
    const endpoint2Metrics = [50, 75, 100];

    endpoint1Metrics.forEach(time => {
      performanceMonitor.trackMetric('/api/products', time, false, 200, 'GET');
    });

    endpoint2Metrics.forEach(time => {
      performanceMonitor.trackMetric('/api/categories', time, false, 200, 'GET');
    });

    // Calculate expected overall average
    const allTimes = [...endpoint1Metrics, ...endpoint2Metrics];
    const expectedOverallAverage = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

    // Get actual overall average
    const summary = performanceMonitor.getPerformanceSummary();

    // Verify accuracy within 1%
    const tolerance = expectedOverallAverage * 0.01;
    expect(Math.abs(summary.overallAverageResponseTime - expectedOverallAverage))
      .toBeLessThanOrEqual(tolerance);
  });

  /**
   * Property: Metrics are correctly stored and retrieved
   * For any tracked metric, it should be retrievable with all original data
   */
  test('metrics are correctly stored and retrieved', () => {
    const testMetrics = [
      { endpoint: '/api/products', responseTime: 150, cacheHit: true, statusCode: 200, method: 'GET' },
      { endpoint: '/api/categories', responseTime: 75, cacheHit: false, statusCode: 200, method: 'GET' },
      { endpoint: '/api/checkout', responseTime: 500, cacheHit: false, statusCode: 201, method: 'POST' },
    ];

    testMetrics.forEach(metric => {
      performanceMonitor.trackMetric(
        metric.endpoint,
        metric.responseTime,
        metric.cacheHit,
        metric.statusCode,
        metric.method
      );
    });

    // Verify all metrics are stored
    expect(performanceMonitor.metrics.length).toBe(testMetrics.length);

    // Verify each metric has correct data
    testMetrics.forEach((expectedMetric, index) => {
      const storedMetric = performanceMonitor.metrics[index];
      expect(storedMetric.endpoint).toBe(expectedMetric.endpoint);
      expect(storedMetric.responseTime).toBe(expectedMetric.responseTime);
      expect(storedMetric.cacheHit).toBe(expectedMetric.cacheHit);
      expect(storedMetric.statusCode).toBe(expectedMetric.statusCode);
      expect(storedMetric.method).toBe(expectedMetric.method);
    });
  });

  /**
   * Property: Metrics are correctly limited to maxMetrics
   * When metrics exceed maxMetrics, oldest metrics should be removed
   */
  test('metrics are correctly limited to maxMetrics', () => {
    const maxMetrics = performanceMonitor.maxMetrics;

    // Track more metrics than maxMetrics
    for (let i = 0; i < maxMetrics + 100; i++) {
      performanceMonitor.trackMetric('/api/test', 100 + i, false, 200, 'GET');
    }

    // Verify only maxMetrics are stored
    expect(performanceMonitor.metrics.length).toBe(maxMetrics);

    // Verify oldest metrics were removed (first 100 should be gone)
    const firstStoredMetric = performanceMonitor.metrics[0];
    expect(firstStoredMetric.responseTime).toBeGreaterThanOrEqual(100 + 100);
  });

  /**
   * Property: Performance summary export is valid JSON
   * The exported metrics should be valid JSON that can be parsed
   */
  test('performance summary export is valid JSON', () => {
    // Track some metrics
    performanceMonitor.trackMetric('/api/products', 150, true, 200, 'GET');
    performanceMonitor.trackMetric('/api/categories', 75, false, 200, 'GET');

    // Export metrics
    const exported = performanceMonitor.exportMetrics();

    // Verify it's valid JSON
    expect(() => JSON.parse(exported)).not.toThrow();

    // Verify structure
    const parsed = JSON.parse(exported);
    expect(parsed).toHaveProperty('totalRequests');
    expect(parsed).toHaveProperty('endpoints');
    expect(parsed).toHaveProperty('overallAverageResponseTime');
    expect(parsed).toHaveProperty('overallCacheHitRate');
  });
});
