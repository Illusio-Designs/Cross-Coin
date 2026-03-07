/**
 * Request deduplication utility
 * Prevents multiple simultaneous identical API calls
 */

const pendingRequests = new Map();

/**
 * Deduplicate API requests
 * If the same request is already in flight, return the existing promise
 * 
 * @param {string} key - Unique key for the request
 * @param {Function} requestFn - Function that returns a promise
 * @returns {Promise} The request promise
 */
export const deduplicateRequest = async (key, requestFn) => {
  // If request is already pending, return the existing promise
  if (pendingRequests.has(key)) {
    console.log(`🔄 Request DEDUPLICATED: ${key}`);
    return pendingRequests.get(key);
  }
  
  console.log(`🚀 Request STARTED: ${key}`);
  
  // Create new request
  const promise = requestFn()
    .then(result => {
      console.log(`✅ Request COMPLETED: ${key}`);
      return result;
    })
    .catch(error => {
      console.log(`❌ Request FAILED: ${key}`);
      throw error;
    })
    .finally(() => {
      // Remove from pending requests when done
      pendingRequests.delete(key);
    });
  
  // Store the promise
  pendingRequests.set(key, promise);
  
  return promise;
};

/**
 * Clear a specific pending request
 * @param {string} key - Request key to clear
 */
export const clearPendingRequest = (key) => {
  pendingRequests.delete(key);
};

/**
 * Clear all pending requests
 */
export const clearAllPendingRequests = () => {
  pendingRequests.clear();
};

/**
 * Get pending requests count
 * @returns {number} Number of pending requests
 */
export const getPendingRequestsCount = () => {
  return pendingRequests.size;
};

/**
 * Get all pending request keys
 * @returns {Array<string>} Array of pending request keys
 */
export const getPendingRequestKeys = () => {
  return Array.from(pendingRequests.keys());
};

export default {
  deduplicateRequest,
  clearPendingRequest,
  clearAllPendingRequests,
  getPendingRequestsCount,
  getPendingRequestKeys
};
