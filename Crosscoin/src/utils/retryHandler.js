// Retry handler with exponential backoff for failed requests
class RetryHandler {
  constructor() {
    // Configuration for retry attempts
    this.config = {
      maxRetries: 3,
      initialDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffMultiplier: 2,
      // HTTP status codes that should trigger retry
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      // Network errors that should trigger retry
      retryableErrorCodes: ['ECONNABORTED', 'ENOTFOUND', 'ENETUNREACH', 'ETIMEDOUT'],
    };
  }

  // Check if error is retryable
  isRetryableError(error) {
    // Check for timeout error
    if (error.code === 'ECONNABORTED') return true;

    // Check for network errors
    if (this.config.retryableErrorCodes.includes(error.code)) return true;

    // Check for HTTP status codes that warrant retry
    if (error.response?.status && this.config.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    // Don't retry if it's a client error (4xx except those listed above)
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      if (!this.config.retryableStatusCodes.includes(error.response.status)) {
        return false;
      }
    }

    return false;
  }

  // Calculate delay with exponential backoff and jitter
  calculateDelay(attemptNumber) {
    const exponentialDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attemptNumber);
    const delay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add jitter (random +/- 20% of delay)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  // Wait for specified delay
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Execute function with retry logic
  async executeWithRetry(fn, context = {}) {
    const { maxRetries = this.config.maxRetries, onRetry = null } = context;

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // If not retryable or last attempt, throw error
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }

        // Calculate delay before retry
        const delay = this.calculateDelay(attempt);

        // Call onRetry callback if provided
        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            maxRetries,
            delay,
            error,
          });
        }

        // Wait before retrying
        await this.wait(delay);
      }
    }

    throw lastError;
  }

  // Retry with circuit breaker pattern
  async executeWithCircuitBreaker(fn, context = {}) {
    const {
      failureThreshold = 5, // Fail after 5 consecutive errors
      resetTimeout = 30000, // Reset after 30 seconds
      onStateChange = null,
    } = context;

    const circuitKey = context.circuitKey || 'default';

    // Initialize circuit state if needed
    if (!this.circuitBreakers) this.circuitBreakers = {};
    if (!this.circuitBreakers[circuitKey]) {
      this.circuitBreakers[circuitKey] = {
        state: 'closed', // closed, open, half-open
        failures: 0,
        successCount: 0,
        lastFailTime: null,
      };
    }

    const circuit = this.circuitBreakers[circuitKey];

    // Check circuit state
    if (circuit.state === 'open') {
      // Check if reset timeout has elapsed
      if (Date.now() - circuit.lastFailTime > resetTimeout) {
        circuit.state = 'half-open';
        circuit.successCount = 0;
        if (onStateChange) onStateChange({ key: circuitKey, state: 'half-open' });
      } else {
        // Circuit is open, fail fast
        throw new Error(`Circuit breaker open for ${circuitKey}`);
      }
    }

    try {
      const result = await fn();

      // Success - reset circuit or transition from half-open
      if (circuit.state === 'half-open') {
        circuit.state = 'closed';
        circuit.failures = 0;
        if (onStateChange) onStateChange({ key: circuitKey, state: 'closed' });
      } else if (circuit.state === 'closed') {
        circuit.failures = 0;
      }

      return result;
    } catch (error) {
      circuit.failures++;
      circuit.lastFailTime = Date.now();

      // Open circuit if failure threshold reached
      if (circuit.failures >= failureThreshold) {
        circuit.state = 'open';
        if (onStateChange) onStateChange({ key: circuitKey, state: 'open' });
      }

      throw error;
    }
  }

  // Get circuit breaker status
  getCircuitStatus(circuitKey = 'default') {
    if (!this.circuitBreakers) return null;
    return this.circuitBreakers[circuitKey] || null;
  }

  // Reset circuit breaker
  resetCircuit(circuitKey = 'default') {
    if (this.circuitBreakers && this.circuitBreakers[circuitKey]) {
      this.circuitBreakers[circuitKey] = {
        state: 'closed',
        failures: 0,
        successCount: 0,
        lastFailTime: null,
      };
    }
  }

  // Clear all circuit breakers
  clearCircuits() {
    this.circuitBreakers = {};
  }
}

// Export singleton instance
export const retryHandler = new RetryHandler();

// Export class for testing
export default RetryHandler;
