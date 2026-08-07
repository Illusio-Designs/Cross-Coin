/**
 * Frontend Badge Configuration
 */

export const BADGE_CONFIG = {
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
  }
};

export const getBadgeDisplay = (badge) => {
  return BADGE_CONFIG[badge] || { color: 'transparent', label: '', icon: '' };
};

export const formatBadge = (badge) => {
  const display = getBadgeDisplay(badge);
  return display.label;
};
