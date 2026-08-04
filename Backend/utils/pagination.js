/**
 * Pagination utility for API endpoints
 * Handles pagination calculations and metadata generation
 */

/**
 * Calculate pagination parameters
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
const calculatePagination = (page, limit, total) => {
  // Validate and sanitize inputs
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.max(1, Math.min(100, parseInt(limit) || 20)); // Max 100 items per page
  total = Math.max(0, parseInt(total) || 0);

  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
};

/**
 * Paginate query results
 * @param {Array} items - Array of items to paginate
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} Paginated results with metadata
 */
const paginateArray = (items, page, limit) => {
  const pagination = calculatePagination(page, limit, items.length);
  const paginatedItems = items.slice(pagination.offset, pagination.offset + pagination.limit);

  return {
    data: paginatedItems,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
    },
  };
};

/**
 * Format pagination response
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Formatted response with data and pagination metadata
 */
const formatPaginatedResponse = (data, page, limit, total) => {
  const pagination = calculatePagination(page, limit, total);

  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
    },
  };
};

module.exports = {
  calculatePagination,
  paginateArray,
  formatPaginatedResponse,
};
