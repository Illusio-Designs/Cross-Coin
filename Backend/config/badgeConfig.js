/**
 * Badge Configuration
 * Defines thresholds and settings for product badges
 */

module.exports = {
  // New Arrival: Products created within this many days
  NEW_ARRIVAL_DAYS: 30,

  // Hot Selling: Products with this many or more sales
  HOT_SELLING_THRESHOLD: 25,

  // Low Stock: Variations with stock less than this
  LOW_STOCK_THRESHOLD: 10,

  // Out of Stock: Variations with stock at or below this
  OUT_OF_STOCK_THRESHOLD: 0,

  // Badge display configuration
  BADGE_DISPLAY: {
    'new_arrival': {
      color: '#4CAF50',
      label: 'New Arrival',
      icon: '✨',
      description: 'Recently added to our store'
    },
    'hot_selling': {
      color: '#FF9800',
      label: 'Hot Selling',
      icon: '🔥',
      description: 'Popular with customers'
    },
    'low_stock': {
      color: '#FFC107',
      label: 'Low Stock',
      icon: '⚠️',
      description: 'Limited quantity available'
    },
    'out_of_stock': {
      color: '#9E9E9E',
      label: 'Out of Stock',
      icon: '❌',
      description: 'Currently unavailable'
    },
    'none': {
      color: 'transparent',
      label: '',
      icon: '',
      description: ''
    }
  }
};
