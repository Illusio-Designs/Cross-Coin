/**
 * API Timeout Behavior Tests
 * Tests timeout error handling and retry logic
 * Requirements: 4.2
 */

import { API_TIMEOUTS, getTimeoutForEndpoint } from '../../src/config/apiConfig';
import { isTimeoutError, getTimeoutErrorMessage, retryWithTimeout } from '../../src/utils/timeoutHandler';

describe('API Timeout Behavior', () => {
  describe('Timeout Configuration', () => {
    test('should have appropriate timeout values', () => {
      expect(API_TIMEOUTS.quick).toBe(10000);
      expect(API_TIMEOUTS.default).toBe(15000);
      expect(API_TIMEOUTS.longRunning).toBe(30000);
      expect(API_TIMEOUTS.fileOperation).toBe(60000);
      expect(API_TIMEOUTS.batch).toBe(45000);
      expect(API_TIMEOUTS.export).toBe(120000);
    });

    test('should assign correct timeout for quick endpoints', () => {
      expect(getTimeoutForEndpoint('/api/search')).toBe(API_TIMEOUTS.quick);
      expect(getTimeoutForEndpoint('/api/filter')).toBe(API_TIMEOUTS.quick);
      expect(getTimeoutForEndpoint('/api/categories')).toBe(API_TIMEOUTS.quick);
      expect(getTimeoutForEndpoint('/api/products')).toBe(API_TIMEOUTS.quick);
    });

    test('should assign correct timeout for long-running endpoints', () => {
      expect(getTimeoutForEndpoint('/api/checkout')).toBe(API_TIMEOUTS.longRunning);
      expect(getTimeoutForEndpoint('/api/payment')).toBe(API_TIMEOUTS.longRunning);
      expect(getTimeoutForEndpoint('/api/orders/fship/sync')).toBe(API_TIMEOUTS.longRunning);
    });

    test('should assign correct timeout for file operations', () => {
      expect(getTimeoutForEndpoint('/api/upload')).toBe(API_TIMEOUTS.fileOperation);
      expect(getTimeoutForEndpoint('/api/download')).toBe(API_TIMEOUTS.fileOperation);
      expect(getTimeoutForEndpoint('/api/export')).toBe(API_TIMEOUTS.fileOperation);
      expect(getTimeoutForEndpoint('/api/label')).toBe(API_TIMEOUTS.fileOperation);
    });

    test('should assign correct timeout for batch operations', () => {
      expect(getTimeoutForEndpoint('/api/bulk-operation')).toBe(API_TIMEOUTS.batch);
      expect(getTimeoutForEndpoint('/api/batch-update')).toBe(API_TIMEOUTS.batch);
    });

    test('should use default timeout for unknown endpoints', () => {
      expect(getTimeoutForEndpoint('/api/unknown')).toBe(API_TIMEOUTS.default);
      expect(getTimeoutForEndpoint('/api/other')).toBe(API_TIMEOUTS.default);
    });
  });

  describe('Timeout Error Detection', () => {
    test('should detect ECONNABORTED timeout errors', () => {
      const error = new Error('Request timeout');
      error.code = 'ECONNABORTED';
      expect(isTimeoutError(error)).toBe(true);
    });

    test('should detect timeout in error message', () => {
      expect(isTimeoutError(new Error('Request timeout'))).toBe(true);
      expect(isTimeoutError(new Error('timed out'))).toBe(true);
      expect(isTimeoutError(new Error('timeout'))).toBe(true);
    });

    test('should not detect non-timeout errors', () => {
      expect(isTimeoutError(new Error('Network error'))).toBe(false);
      expect(isTimeoutError(new Error('Validation failed'))).toBe(false);
      expect(isTimeoutError(new Error('Not found'))).toBe(false);
    });

    test('should handle null/undefined errors', () => {
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
    });
  });

  describe('Timeout Error Messages', () => {
    test('should provide checkout-specific timeout message', () => {
      const message = getTimeoutErrorMessage('/api/checkout');
      expect(message).toContain('Payment processing');
      expect(message).toContain('longer than expected');
    });

    test('should provide payment-specific timeout message', () => {
      const message = getTimeoutErrorMessage('/api/payment');
      expect(message).toContain('Payment processing');
    });

    test('should provide export-specific timeout message', () => {
      const message = getTimeoutErrorMessage('/api/export');
      expect(message).toContain('export');
      expect(message).toContain('longer than expected');
    });

    test('should provide upload-specific timeout message', () => {
      const message = getTimeoutErrorMessage('/api/upload');
      expect(message).toContain('upload');
      expect(message).toContain('connection');
    });

    test('should provide generic timeout message for unknown endpoints', () => {
      const message = getTimeoutErrorMessage('/api/unknown');
      expect(message).toContain('took too long');
      expect(message).toContain('connection');
    });
  });

  describe('Retry Logic', () => {
    test('should retry on timeout and succeed', async () => {
      let attempts = 0;
      const apiCall = async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('timeout');
          error.code = 'ECONNABORTED';
          throw error;
        }
        return { success: true };
      };

      const result = await retryWithTimeout(apiCall, 3, 10);
      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });

    test('should fail after max retries', async () => {
      let attempts = 0;
      const apiCall = async () => {
        attempts++;
        const error = new Error('timeout');
        error.code = 'ECONNABORTED';
        throw error;
      };

      await expect(retryWithTimeout(apiCall, 2, 10))
        .rejects
        .toThrow();
      
      expect(attempts).toBe(2);
    });

    test('should not retry non-timeout errors', async () => {
      let attempts = 0;
      const apiCall = async () => {
        attempts++;
        throw new Error('Validation failed');
      };

      await expect(retryWithTimeout(apiCall, 3, 10))
        .rejects
        .toThrow('Validation failed');
      
      expect(attempts).toBe(1);
    });

    test('should succeed on first attempt if no timeout', async () => {
      let attempts = 0;
      const apiCall = async () => {
        attempts++;
        return { success: true, data: 'test' };
      };

      const result = await retryWithTimeout(apiCall, 3, 10);
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
      expect(attempts).toBe(1);
    });
  });

  describe('Timeout Scenarios', () => {
    test('should handle quick endpoint timeout', async () => {
      const timeout = getTimeoutForEndpoint('/api/products');
      expect(timeout).toBe(API_TIMEOUTS.quick);
      expect(timeout).toBeLessThan(API_TIMEOUTS.default);
    });

    test('should handle long-running endpoint timeout', async () => {
      const timeout = getTimeoutForEndpoint('/api/checkout');
      expect(timeout).toBe(API_TIMEOUTS.longRunning);
      expect(timeout).toBeGreaterThan(API_TIMEOUTS.default);
    });

    test('should handle file operation timeout', async () => {
      const timeout = getTimeoutForEndpoint('/api/export');
      expect(timeout).toBe(API_TIMEOUTS.fileOperation);
      expect(timeout).toBeGreaterThan(API_TIMEOUTS.longRunning);
    });

    test('should handle batch operation timeout', async () => {
      const timeout = getTimeoutForEndpoint('/api/bulk-download');
      expect(timeout).toBe(API_TIMEOUTS.batch);
      expect(timeout).toBeGreaterThan(API_TIMEOUTS.longRunning);
    });
  });

  describe('Timeout Recovery', () => {
    test('should recover from single timeout', async () => {
      let attempts = 0;
      const apiCall = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('timeout');
          error.code = 'ECONNABORTED';
          throw error;
        }
        return { success: true, recovered: true };
      };

      const result = await retryWithTimeout(apiCall, 3, 10);
      expect(result.recovered).toBe(true);
      expect(attempts).toBe(2);
    });

    test('should recover from multiple timeouts', async () => {
      let attempts = 0;
      const apiCall = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('timeout');
          error.code = 'ECONNABORTED';
          throw error;
        }
        return { success: true, attempts };
      };

      const result = await retryWithTimeout(apiCall, 4, 10);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    test('should not recover if max retries exceeded', async () => {
      let attempts = 0;
      const apiCall = async () => {
        attempts++;
        const error = new Error('timeout');
        error.code = 'ECONNABORTED';
        throw error;
      };

      await expect(retryWithTimeout(apiCall, 2, 10))
        .rejects
        .toThrow();
      
      expect(attempts).toBe(2);
    });
  });
});
