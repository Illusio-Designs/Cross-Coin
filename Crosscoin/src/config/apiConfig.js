/**
 * API Client Configuration
 * Defines timeout settings for different types of API calls
 * Requirements: 4.2
 */

export const API_TIMEOUTS = {
  // Standard API calls - 30 seconds
  // Bumped from 15s after the dashboard /products?page=1&limit=10
  // list call kept getting cancelled on cold backend boots.
  default: 30000,

  // Quick operations (search, filters, etc.) - 20 seconds
  // Bumped from 10s for the same reason.
  quick: 20000,

  // Long-running operations (checkout, payment processing) - 60 seconds
  longRunning: 60000,

  // File uploads/downloads - 120 seconds
  fileOperation: 120000,

  // Batch operations - 60 seconds
  batch: 60000,

  // Export operations - 120 seconds
  export: 120000,
};

/**
 * Get timeout for a specific endpoint
 * @param {string} endpoint - API endpoint path
 * @returns {number} Timeout in milliseconds
 */
export const getTimeoutForEndpoint = (endpoint) => {
  // Long-running operations
  if (endpoint.includes('/checkout') || 
      endpoint.includes('/payment') ||
      endpoint.includes('/orders/fship/sync') ||
      endpoint.includes('/sync')) {
    return API_TIMEOUTS.longRunning;
  }

  // File operations
  if (endpoint.includes('/upload') || 
      endpoint.includes('/download') ||
      endpoint.includes('/export') ||
      endpoint.includes('/label')) {
    return API_TIMEOUTS.fileOperation;
  }

  // Batch operations
  if (endpoint.includes('/bulk') || 
      endpoint.includes('/batch')) {
    return API_TIMEOUTS.batch;
  }

  // Quick operations — only narrow sub-paths now. The bare /products
  // and /categories list reads used to fall in here and got cancelled
  // at 10s on cold backend boots; they belong in the default bucket
  // so the read has more time to finish.
  if (endpoint.includes('/search') ||
      endpoint.includes('/filter')) {
    return API_TIMEOUTS.quick;
  }

  // Default timeout
  return API_TIMEOUTS.default;
};

/**
 * Timeout error handler
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const handleTimeoutError = (error) => {
  if (error.code === 'ECONNABORTED') {
    return 'Request took too long. Please check your connection and try again.';
  }
  return error.message || 'An error occurred';
};
