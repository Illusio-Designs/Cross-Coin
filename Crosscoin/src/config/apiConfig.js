/**
 * API Client Configuration
 * Defines timeout settings for different types of API calls
 * Requirements: 4.2
 */

export const API_TIMEOUTS = {
  // Standard API calls - 15 seconds
  default: 15000,

  // Quick operations (search, filters, etc.) - 10 seconds
  quick: 10000,

  // Long-running operations (checkout, payment processing) - 30 seconds
  longRunning: 30000,

  // File uploads/downloads - 60 seconds
  fileOperation: 60000,

  // Batch operations - 45 seconds
  batch: 45000,

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

  // Quick operations
  if (endpoint.includes('/search') || 
      endpoint.includes('/filter') ||
      endpoint.includes('/categories') ||
      endpoint.includes('/products')) {
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
