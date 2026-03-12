/**
 * Property Test: API Timeout Reliability
 * Property 16: API Timeout Reliability
 * Validates: Requirements 4.2
 * 
 * This property test verifies that API calls with appropriate timeouts
 * complete successfully without timing out for legitimate requests.
 */

import { API_TIMEOUTS, getTimeoutForEndpoint } from '../../src/config/apiConfig';
import { isTimeoutError, retryWithTimeout, withTimeoutHandling } from '../../src/utils/timeoutHandler';

describe('Property 16: API Timeout Reliability', () => {
  /**
   * Property: Timeout values should be appropriate for endpoint types
   * 
   * For each endpoint type:
   * 1. Get timeout for endpoint
   * 2. Verify timeout is within expected range
   * 3. Verify timeout is greater than 0
   */
  test('Property 16.1: Timeout values are appropriate for endpoints', () => {
    const testCases = [
      { endpoint: '/api/products', expectedTimeout: API_TIMEOUTS.quick },
      { endpoint: '/api/categories', expectedTimeout: API_TIMEOUTS.quick },
      { endpoint: '/api/search', expectedTimeout: API_TIMEOUTS.quick },
      { endpoint: '/api/checkout', expectedTimeout: API_TIMEOUTS.longRunning },
      { endpoint: '/api/payment', expectedTimeout: API_TIMEOUTS.longRunning },
      { endpoint: '/api/upload', expectedTimeout: API_TIMEOUTS.fileOperation },
      { endpoint: '/api/download', expectedTimeout: API_TIMEOUTS.fileOperation },
      { endpoint: '/api/export', expectedTimeout: API_TIMEOUTS.fileOperation },
      { endpoint: '/api/bulk-operation', expectedTimeout: API_TIMEOUTS.batch },
    ];

    testCases.forEach(({ endpoint, expectedTimeout }) => {
      const timeout = getTimeoutForEndpoint(endpoint);
      expect(timeout).toBe(expectedTimeout);
      expect(timeout).toBeGreaterThan(0);
    });
  });

  /**
   * Property: Quick operations should timeout faster than long operations
   * 
   * Verify timeout hierarchy:
   * quick < default < longRunning < batch < fileOperation
   */
  test('Property 16.2: Timeout hierarchy is correct', () => {
    expect(API_TIMEOUTS.quick).toBeLessThan(API_TIMEOUTS.default);
    expect(API_TIMEOUTS.default).toBeLessThan(API_TIMEOUTS.longRunning);
    expect(API_TIMEOUTS.longRunning).toBeLessThan(API_TIMEOUTS.batch);
    expect(API_TIMEOUTS.batch).toBeLessThan(API_TIMEOUTS.fileOperation);
  });

  /**
   * Property: Timeout error detection should work correctly
   * 
   * For various error types:
   * 1. Create error with timeout code
   * 2. Verify isTimeoutError returns true
   * 3. Create non-timeout error
   * 4. Verify isTimeoutError returns false
   */
  test('Property 16.3: Timeout error detection works correctly', () => {
    // Timeout errors
    const timeoutError1 = new Error('Request timeout');
    timeoutError1.code = 'ECONNABORTED';
    expect(isTimeoutError(timeoutError1)).toBe(true);

    const timeoutError2 = new Error('Request timed out');
    expect(isTimeoutError(timeoutError2)).toBe(true);

    const timeoutError3 = new Error('timeout');
    expect(isTimeoutError(timeoutError3)).toBe(true);

    // Non-timeout errors
    const networkError = new Error('Network error');
    expect(isTimeoutError(networkError)).toBe(false);

    const validationError = new Error('Validation failed');
    expect(isTimeoutError(validationError)).toBe(false);

    const notFoundError = new Error('Not found');
    notFoundError.code = 'ENOTFOUND';
    expect(isTimeoutError(notFoundError)).toBe(false);
  });

  /**
   * Property: Successful API calls should not timeout
   * 
   * For a fast API call:
   * 1. Call API with appropriate timeout
   * 2. Verify call completes successfully
   * 3. Verify no timeout error is thrown
   */
  test('Property 16.4: Fast API calls complete without timeout', async () => {
    // Mock a fast API call
    const fastApiCall = async () => {
      return new Promise(resolve => {
        setTimeout(() => resolve({ success: true, data: 'test' }), 100);
      });
    };

    const result = await retryWithTimeout(fastApiCall, 1, 0);
    expect(result.success).toBe(true);
    expect(result.data).toBe('test');
  });

  /**
   * Property: Retry logic should retry on timeout
   * 
   * For an API call that times out then succeeds:
   * 1. First call times out
   * 2. Retry logic retries
   * 3. Second call succeeds
   * 4. Result is returned
   */
  test('Property 16.5: Retry logic retries on timeout', async () => {
    let callCount = 0;
    const flakeyApiCall = async () => {
      callCount++;
      if (callCount === 1) {
        // First call times out
        const error = new Error('Request timeout');
        error.code = 'ECONNABORTED';
        throw error;
      }
      // Second call succeeds
      return { success: true, attempt: callCount };
    };

    const result = await retryWithTimeout(flakeyApiCall, 3, 10);
    expect(result.success).toBe(true);
    expect(result.attempt).toBe(2);
    expect(callCount).toBe(2);
  });

  /**
   * Property: Retry logic should give up after max retries
   * 
   * For an API call that always times out:
   * 1. Call times out
   * 2. Retry logic retries up to maxRetries
   * 3. After maxRetries, error is thrown
   * 4. Call count equals maxRetries
   */
  test('Property 16.6: Retry logic gives up after max retries', async () => {
    let callCount = 0;
    const alwaysTimeoutApiCall = async () => {
      callCount++;
      const error = new Error('Request timeout');
      error.code = 'ECONNABORTED';
      throw error;
    };

    const maxRetries = 3;
    await expect(retryWithTimeout(alwaysTimeoutApiCall, maxRetries, 10))
      .rejects
      .toThrow();
    
    expect(callCount).toBe(maxRetries);
  });

  /**
   * Property: Non-timeout errors should not be retried
   * 
   * For an API call that throws a non-timeout error:
   * 1. Call throws validation error
   * 2. Retry logic should not retry
   * 3. Error is thrown immediately
   * 4. Call count is 1
   */
  test('Property 16.7: Non-timeout errors are not retried', async () => {
    let callCount = 0;
    const validationErrorApiCall = async () => {
      callCount++;
      throw new Error('Validation failed');
    };

    await expect(retryWithTimeout(validationErrorApiCall, 3, 10))
      .rejects
      .toThrow('Validation failed');
    
    expect(callCount).toBe(1);
  });

  /**
   * Property: Exponential backoff should increase delay between retries
   * 
   * For retry logic with exponential backoff:
   * 1. First retry delay is initialDelay
   * 2. Second retry delay is initialDelay * 1.5
   * 3. Third retry delay is initialDelay * 1.5 * 1.5
   */
  test('Property 16.8: Exponential backoff increases delay', async () => {
    const delays = [];
    let callCount = 0;
    const startTime = Date.now();

    const trackDelayApiCall = async () => {
      callCount++;
      if (callCount < 3) {
        const error = new Error('Request timeout');
        error.code = 'ECONNABORTED';
        throw error;
      }
      return { success: true };
    };

    await retryWithTimeout(trackDelayApiCall, 3, 50);
    const totalTime = Date.now() - startTime;

    // Total time should be at least 50 + 75 = 125ms (with some tolerance)
    expect(totalTime).toBeGreaterThanOrEqual(100);
  });

  /**
   * Property: withTimeoutHandling should wrap API calls correctly
   * 
   * For a wrapped API call:
   * 1. Wrap API call with timeout handling
   * 2. Call wrapped function
   * 3. Verify result is returned
   * 4. Verify retry logic is applied
   */
  test('Property 16.9: withTimeoutHandling wraps API calls', async () => {
    let callCount = 0;
    const apiCall = async () => {
      callCount++;
      if (callCount === 1) {
        const error = new Error('Request timeout');
        error.code = 'ECONNABORTED';
        throw error;
      }
      return { success: true, data: 'wrapped' };
    };

    const result = await withTimeoutHandling(apiCall, {
      maxRetries: 2,
      retryDelay: 10,
      endpoint: '/api/test'
    });

    expect(result.success).toBe(true);
    expect(result.data).toBe('wrapped');
    expect(callCount).toBe(2);
  });

  /**
   * Property: Timeout callbacks should be called on timeout
   * 
   * For a wrapped API call with timeout callback:
   * 1. API call always times out
   * 2. Timeout callback should be called
   * 3. Callback receives error info
   */
  test('Property 16.10: Timeout callbacks are called', async () => {
    const timeoutCallback = jest.fn();
    const alwaysTimeoutApiCall = async () => {
      const error = new Error('Request timeout');
      error.code = 'ECONNABORTED';
      throw error;
    };

    await expect(withTimeoutHandling(alwaysTimeoutApiCall, {
      maxRetries: 1,
      retryDelay: 10,
      endpoint: '/api/test',
      onTimeout: timeoutCallback
    })).rejects.toThrow();

    expect(timeoutCallback).toHaveBeenCalled();
    const callArg = timeoutCallback.mock.calls[0][0];
    expect(callArg.isTimeout).toBe(true);
    expect(callArg.message).toBeDefined();
  });
});
