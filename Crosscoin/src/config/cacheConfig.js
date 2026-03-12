/**
 * Frontend Cache Configuration
 * Defines TTL (Time To Live) values for different types of cached data
 * Requirements: 4.1
 */

export const CACHE_CONFIG = {
  // Dashboard data cache - 5 minutes
  dashboard: {
    ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
    key: 'dashboard_data',
    description: 'User dashboard stats, recent orders, badges'
  },

  // Product list cache - 30 minutes
  products: {
    ttl: 30 * 60 * 1000, // 30 minutes in milliseconds
    key: 'products_list',
    description: 'Product listings, filters, search results'
  },

  // Product details cache - 1 hour
  productDetails: {
    ttl: 60 * 60 * 1000, // 1 hour in milliseconds
    key: 'product_details',
    description: 'Individual product details, variations, reviews'
  },

  // Cart data cache - 24 hours
  cart: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    key: 'cart_data',
    description: 'Shopping cart items and quantities'
  },

  // User profile cache - 15 minutes
  profile: {
    ttl: 15 * 60 * 1000, // 15 minutes in milliseconds
    key: 'user_profile',
    description: 'User profile information, addresses, preferences'
  },

  // Categories cache - 1 hour
  categories: {
    ttl: 60 * 60 * 1000, // 1 hour in milliseconds
    key: 'categories_list',
    description: 'Product categories and subcategories'
  },

  // Wishlist cache - 24 hours
  wishlist: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    key: 'wishlist_data',
    description: 'User wishlist items'
  },

  // Coupons cache - 30 minutes
  coupons: {
    ttl: 30 * 60 * 1000, // 30 minutes in milliseconds
    key: 'coupons_list',
    description: 'Available coupons and offers'
  },

  // Orders cache - 1 hour
  orders: {
    ttl: 60 * 60 * 1000, // 1 hour in milliseconds
    key: 'orders_list',
    description: 'User order history'
  },

  // Reviews cache - 2 hours
  reviews: {
    ttl: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
    key: 'reviews_list',
    description: 'Product reviews and ratings'
  }
};

/**
 * Get cache configuration by type
 * @param {string} type - Cache type (e.g., 'dashboard', 'products')
 * @returns {Object} Cache configuration object
 */
export const getCacheConfig = (type) => {
  return CACHE_CONFIG[type] || null;
};

/**
 * Get cache TTL in seconds
 * @param {string} type - Cache type
 * @returns {number} TTL in seconds
 */
export const getCacheTTLSeconds = (type) => {
  const config = getCacheConfig(type);
  return config ? Math.floor(config.ttl / 1000) : 0;
};

/**
 * Get cache key for a specific type
 * @param {string} type - Cache type
 * @param {string} identifier - Optional identifier (e.g., userId, productId)
 * @returns {string} Full cache key
 */
export const getCacheKey = (type, identifier = '') => {
  const config = getCacheConfig(type);
  if (!config) return '';
  
  if (identifier) {
    return `${config.key}:${identifier}`;
  }
  return config.key;
};

export default CACHE_CONFIG;
