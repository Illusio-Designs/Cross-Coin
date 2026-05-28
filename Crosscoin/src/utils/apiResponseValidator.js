/**
 * API Response Validator
 * Safely validates and normalizes API responses to prevent crashes from unexpected formats
 */

/**
 * Validate list response with items
 * @param {*} response - API response
 * @param {string} itemsKey - Key containing items array (default: 'data' or 'items')
 * @returns {Array} Validated items array or empty array
 */
export const validateListResponse = (response, itemsKey = 'data') => {
  try {
    if (!response) return [];

    // Try itemsKey first, then common alternatives
    const items = response[itemsKey] ||
      response.items ||
      response.data ||
      response.results ||
      response.orders ||
      (Array.isArray(response) ? response : []);

    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn(`Failed to validate list response with key "${itemsKey}":`, err);
    return [];
  }
};

/**
 * Validate single item response
 * @param {*} response - API response
 * @param {string} itemKey - Key containing item (default: 'data')
 * @returns {Object|null} Validated item or null
 */
export const validateItemResponse = (response, itemKey = 'data') => {
  try {
    if (!response) return null;

    // Try itemKey first, then common alternatives
    const item = response[itemKey] ||
      response.item ||
      (typeof response === 'object' && response.id ? response : null);

    return item && typeof item === 'object' ? item : null;
  } catch (err) {
    console.warn(`Failed to validate item response with key "${itemKey}":`, err);
    return null;
  }
};

/**
 * Validate paginated response
 * @param {*} response - API response
 * @returns {Object} Validated pagination object
 */
export const validatePaginatedResponse = (response) => {
  try {
    if (!response) return { items: [], total: 0, page: 1, pages: 0 };

    const items = validateListResponse(response);
    const result = {
      items,
      total: Number(response.total || response.count || 0),
      page: Number(response.page || 1),
      pages: Number(response.pages || Math.ceil((response.total || 0) / (response.limit || 10))),
      limit: Number(response.limit || 10)
    };

    if (typeof window !== 'undefined') {
      console.log('[API Validator]', {
        responseType: typeof response,
        responseKeys: Array.isArray(response) ? 'array' : Object.keys(response || {}),
        itemsFound: items.length,
        total: result.total,
        firstItem: items[0],
        fullResponse: response
      });
    }

    return result;
  } catch (err) {
    console.warn('Failed to validate paginated response:', err);
    return { items: [], total: 0, page: 1, pages: 0 };
  }
};

/**
 * Validate generic response
 * @param {*} response - API response
 * @param {Object} schema - Expected schema { key: 'type' } e.g. { name: 'string', age: 'number' }
 * @returns {Object} Validated response or empty object
 */
export const validateResponse = (response, schema = {}) => {
  try {
    if (!response || typeof response !== 'object') return {};

    const validated = {};
    Object.keys(schema).forEach(key => {
      const expectedType = schema[key];
      const value = response[key];

      // Check type matching
      if (expectedType === 'string') {
        validated[key] = typeof value === 'string' ? value : '';
      } else if (expectedType === 'number') {
        validated[key] = typeof value === 'number' ? value : 0;
      } else if (expectedType === 'boolean') {
        validated[key] = typeof value === 'boolean' ? value : false;
      } else if (expectedType === 'array') {
        validated[key] = Array.isArray(value) ? value : [];
      } else if (expectedType === 'object') {
        validated[key] = typeof value === 'object' && value !== null ? value : {};
      } else {
        // Unknown type, pass through if exists
        validated[key] = value !== undefined ? value : null;
      }
    });

    return validated;
  } catch (err) {
    console.warn('Failed to validate response with schema:', err);
    return {};
  }
};

/**
 * Safe response access with defaults
 * @param {*} response - API response
 * @param {string} path - Dot notation path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default if path doesn't exist
 * @returns {*} Value at path or default
 */
export const getResponseValue = (response, path, defaultValue = null) => {
  try {
    if (!response || !path) return defaultValue;

    const keys = path.split('.');
    let value = response;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  } catch (err) {
    return defaultValue;
  }
};

/**
 * Ensure response has success flag
 * @param {*} response - API response
 * @returns {boolean} Whether response indicates success
 */
export const isSuccessResponse = (response) => {
  if (!response || typeof response !== 'object') return false;

  return (
    response.success === true ||
    response.ok === true ||
    response.status === 'success' ||
    response.error === false ||
    (response.data !== undefined && response.data !== null)
  );
};

/**
 * Extract error message from response
 * @param {*} response - API response
 * @returns {string} Error message or generic message
 */
export const getErrorMessage = (response) => {
  if (!response) return 'Unknown error';
  if (typeof response === 'string') return response;

  return (
    response.message ||
    response.error ||
    response.msg ||
    response.errors?.[0]?.message ||
    response.details ||
    'Operation failed'
  );
};

/**
 * Batch validate multiple responses
 * @param {Array} responses - Array of API responses
 * @param {Function} validator - Validation function for each response
 * @returns {Array} Array of validated responses
 */
export const validateBatch = (responses, validator) => {
  if (!Array.isArray(responses)) return [];

  return responses
    .map(response => {
      try {
        return validator ? validator(response) : response;
      } catch (err) {
        console.warn('Failed to validate batch item:', err);
        return null;
      }
    })
    .filter(item => item !== null);
};

export default {
  validateListResponse,
  validateItemResponse,
  validatePaginatedResponse,
  validateResponse,
  getResponseValue,
  isSuccessResponse,
  getErrorMessage,
  validateBatch
};
