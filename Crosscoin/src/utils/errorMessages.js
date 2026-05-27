/**
 * Standardized error messages across the application
 * Ensures consistent UX for error handling
 */

const ERROR_TYPES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  NO_RESPONSE: 'No response from server. Please try again.',

  // Data errors
  INVALID_DATA: 'Invalid data format. Please check and try again.',
  MISSING_REQUIRED: 'Please fill in all required fields.',
  VALIDATION_ERROR: 'Please correct the errors and try again.',

  // Authorization errors
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested item was not found.',

  // Server errors
  SERVER_ERROR: 'Something went wrong on the server. Please try again later.',
  BAD_GATEWAY: 'Gateway error. Please try again.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  OPERATION_FAILED: 'Operation failed. Please try again.',
  LOAD_FAILED: 'Failed to load data. Please try again.',
  SAVE_FAILED: 'Failed to save changes. Please try again.',
  DELETE_FAILED: 'Failed to delete item. Please try again.',
  UPDATE_FAILED: 'Failed to update item. Please try again.',
};

/**
 * Get standardized error message based on HTTP status or error type
 * @param {number|string} statusOrError - HTTP status code or error type
 * @param {string} customMessage - Optional custom message
 * @returns {string} Standardized error message
 */
export const getStandardErrorMessage = (statusOrError, customMessage = null) => {
  if (customMessage) return customMessage;

  // Map HTTP status codes to messages
  const statusMap = {
    400: ERROR_TYPES.INVALID_DATA,
    401: ERROR_TYPES.UNAUTHORIZED,
    403: ERROR_TYPES.FORBIDDEN,
    404: ERROR_TYPES.NOT_FOUND,
    408: ERROR_TYPES.TIMEOUT_ERROR,
    429: 'Too many requests. Please wait a moment and try again.',
    500: ERROR_TYPES.SERVER_ERROR,
    502: ERROR_TYPES.BAD_GATEWAY,
    503: ERROR_TYPES.SERVICE_UNAVAILABLE,
    504: ERROR_TYPES.TIMEOUT_ERROR,
  };

  if (typeof statusOrError === 'number' && statusMap[statusOrError]) {
    return statusMap[statusOrError];
  }

  if (typeof statusOrError === 'string') {
    return ERROR_TYPES[statusOrError] || statusOrError;
  }

  return ERROR_TYPES.UNKNOWN_ERROR;
};

/**
 * Extract and standardize error message from API response
 * @param {*} error - Axios error object or custom error
 * @returns {string} Standardized error message
 */
export const extractErrorMessage = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN_ERROR;

  // If it's a canceled request, return empty (handled elsewhere)
  if (error.name === 'CanceledError') return '';

  // Network errors
  if (error.code === 'ECONNABORTED') return ERROR_TYPES.TIMEOUT_ERROR;
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return ERROR_TYPES.NETWORK_ERROR;

  // Response errors
  if (error.response?.status) {
    const customMsg = error.response.data?.message || error.response.data?.error;
    return getStandardErrorMessage(error.response.status, customMsg);
  }

  // Request errors
  if (error.request && !error.response) {
    return ERROR_TYPES.NO_RESPONSE;
  }

  // Custom error message
  if (error.message) return error.message;

  return ERROR_TYPES.UNKNOWN_ERROR;
};

/**
 * Format error for display (remove technical details)
 * @param {string} errorMsg - Error message
 * @returns {string} Cleaned error message
 */
export const formatErrorForDisplay = (errorMsg) => {
  if (!errorMsg) return ERROR_TYPES.UNKNOWN_ERROR;

  // Remove Axios technical prefixes
  let msg = errorMsg.replace(/^Error: /, '');
  msg = msg.replace(/^Request failed with status code \d+: /, '');

  // Cap at reasonable length
  if (msg.length > 200) {
    msg = msg.substring(0, 197) + '...';
  }

  return msg;
};

export default {
  ERROR_TYPES,
  getStandardErrorMessage,
  extractErrorMessage,
  formatErrorForDisplay,
};
