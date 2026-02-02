/**
 * Utility functions for handling order status display and formatting
 */

/**
 * Convert status string to CSS class name
 * @param {string} status - The status string
 * @returns {string} - CSS class name
 */
export const getStatusClassName = (status) => {
    if (!status) return 'unknown';
    
    return status
        .toLowerCase()
        .replace(/\s+/g, '-')  // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, ''); // Remove any other special characters
};

/**
 * Get display text for status
 * @param {string} status - The status string
 * @returns {string} - Formatted display text
 */
export const getStatusDisplayText = (status) => {
    if (!status) return 'Unknown';
    
    const statusMap = {
        'pending': 'Order Pending',
        'processing': 'Processing',
        'booked': 'Booked',
        'pickup initiated': 'Pickup Initiated',
        'manifested': 'Manifested',
        'in transit': 'In Transit',
        'shipped': 'Shipped',
        'out for delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'rto': 'Return to Origin',
        'cancelled': 'Cancelled',
        'order cancelled': 'Order Cancelled',
        'exception': 'Exception',
        'returned': 'Returned'
    };
    
    const lowerStatus = status.toLowerCase();
    return statusMap[lowerStatus] || status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * Get color for status
 * @param {string} status - The status string
 * @returns {string} - Color hex code
 */
export const getStatusColor = (status) => {
    if (!status) return '#6B7280';
    
    const colorMap = {
        'pending': '#F59E0B',
        'processing': '#180D3E',
        'booked': '#3B82F6',
        'pickup initiated': '#8B5CF6',
        'manifested': '#06B6D4',
        'in transit': '#F97316',
        'shipped': '#CE1E36',
        'out for delivery': '#EF4444',
        'delivered': '#10B981',
        'rto': '#F59E0B',
        'cancelled': '#EF4444',
        'order cancelled': '#EF4444',
        'exception': '#DC2626',
        'returned': '#6B7280'
    };
    
    const lowerStatus = status.toLowerCase();
    return colorMap[lowerStatus] || '#6B7280';
};

/**
 * Check if status is a final state (cannot be changed)
 * @param {string} status - The status string
 * @returns {boolean} - True if status is final
 */
export const isFinalStatus = (status) => {
    if (!status) return false;
    
    const finalStatuses = ['delivered', 'cancelled', 'order cancelled', 'rto', 'returned'];
    return finalStatuses.includes(status.toLowerCase());
};

/**
 * Check if status allows cancellation
 * @param {string} status - The status string
 * @returns {boolean} - True if order can be cancelled
 */
export const canCancelOrder = (status) => {
    if (!status) return false;
    
    const cancellableStatuses = ['pending', 'processing', 'booked'];
    return cancellableStatuses.includes(status.toLowerCase());
};

/**
 * Get status priority for sorting (lower number = higher priority)
 * @param {string} status - The status string
 * @returns {number} - Priority number
 */
export const getStatusPriority = (status) => {
    if (!status) return 999;
    
    const priorityMap = {
        'pending': 1,
        'processing': 2,
        'booked': 3,
        'pickup initiated': 4,
        'manifested': 5,
        'in transit': 6,
        'shipped': 7,
        'out for delivery': 8,
        'delivered': 9,
        'rto': 10,
        'cancelled': 11,
        'order cancelled': 12,
        'exception': 13,
        'returned': 14
    };
    
    const lowerStatus = status.toLowerCase();
    return priorityMap[lowerStatus] || 999;
};