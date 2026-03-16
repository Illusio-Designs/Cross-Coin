/**
 * Timeout Error Handler Utility
 * Handles API timeout errors with retry logic and user-friendly messages
 * Requirements: 4.2
 */

import { API_TIMEOUTS } from '../config/apiConfig';

/**
 * Check if an error is a timeout error
 * @param {Error} error - The error object
 * @returns {boolean} True if error is a timeout
 */
export const isTimeoutError = (error) => {
  return error?.code === 'ECONNABORTED' || 
         error?.message?.includes('timeout') ||
         error?.message?.includes('timed out');
};

/**
 * Get user-friendly timeout error message
 * @param {string} endpoint - The API endpoint that timed out
 * @returns {string} User-friendly error message
 */
export const getTimeoutErrorMessage = (endpoint = '') => {
  if (endpoint.includes('/checkout') || endpoint.includes('/payment')) {
    return 'Payment processing is taking longer than expected. Please wait a moment and try again.';
  }
  
  if (endpoint.includes('/export') || endpoint.includes('/download')) {
    return 'The export is taking longer than expected. Please try again or contact support.';
  }
  
  if (endpoint.includes('/upload')) {
    return 'The upload is taking longer than expected. Please check your connection and try again.';
  }
  
  return 'The request took too long. Please check your connection and try again.';
};

/**
 * Retry logic for timeout errors
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns {Promise} Result of the API call
 */
export const retryWithTimeout = async (apiCall, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Only retry on timeout errors
      if (!isTimeoutError(error)) {
        throw error;
      }
      
      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        // Increase delay for next retry (exponential backoff)
        delayMs *= 1.5;
      }
    }
  }
  
  // All retries failed
  throw lastError;
};

/**
 * Timeout error handler for API responses
 * @param {Error} error - The error object
 * @param {string} endpoint - The API endpoint
 * @returns {Object} Formatted error object
 */
export const handleTimeoutError = (error, endpoint = '') => {
  return {
    isTimeout: isTimeoutError(error),
    message: getTimeoutErrorMessage(endpoint),
    originalError: error,
    code: error?.code,
    timestamp: new Date().toISOString()
  };
};

/**
 * Wrap an API call with timeout handling and retry logic
 * @param {Function} apiCall - The API call function
 * @param {Object} options - Configuration options
 * @returns {Promise} Result of the API call
 */
export const withTimeoutHandling = async (apiCall, options = {}) => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    endpoint = '',
    onTimeout = null,
    onRetry = null
  } = options;

  try {
    return await retryWithTimeout(apiCall, maxRetries, retryDelay);
  } catch (error) {
    if (isTimeoutError(error)) {
      const errorInfo = handleTimeoutError(error, endpoint);
      
      // Call timeout callback if provided
      if (onTimeout) {
        onTimeout(errorInfo);
      }
      
      throw new Error(errorInfo.message);
    }
    
    throw error;
  }
};

/**
 * Create a timeout-aware API call wrapper
 * @param {Function} apiFunction - The API function to wrap
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped API function
 */
export const createTimeoutAwareApiCall = (apiFunction, options = {}) => {
  return async (...args) => {
    return withTimeoutHandling(
      () => apiFunction(...args),
      {
        endpoint: options.endpoint || '',
        maxRetries: options.maxRetries || 2,
        retryDelay: options.retryDelay || 1000,
        onTimeout: options.onTimeout,
        onRetry: options.onRetry
      }
    );
  };
};




