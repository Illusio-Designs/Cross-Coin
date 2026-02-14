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
        'confirmed': 'Order Confirmed',
        'processing': 'Processing',
        'booked': 'Booked',
        'pickup_initiated': 'Pickup Initiated',
        'pickup initiated': 'Pickup Initiated',
        'manifested': 'Manifested',
        'in_transit': 'In Transit',
        'in transit': 'In Transit',
        'shipped': 'Shipped',
        'out_for_delivery': 'Out for Delivery',
        'out for delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'undelivered': 'Undelivered',
        'rto': 'Return to Origin',
        'rto_delivered': 'RTO Delivered',
        'rto delivered': 'RTO Delivered',
        'cancelled': 'Cancelled',
        'order_cancelled': 'Order Cancelled',
        'order cancelled': 'Order Cancelled',
        'exception': 'Exception',
        'returned': 'Returned'
    };
    
    const lowerStatus = status.toLowerCase().replace(/\s+/g, '_');
    const normalizedStatus = status.toLowerCase();
    
    return statusMap[lowerStatus] || statusMap[normalizedStatus] || 
           status.split(/[_\s]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
        'confirmed': '#3B82F6',
        'processing': '#180D3E',
        'booked': '#3B82F6',
        'pickup_initiated': '#8B5CF6',
        'pickup initiated': '#8B5CF6',
        'manifested': '#06B6D4',
        'in_transit': '#F97316',
        'in transit': '#F97316',
        'shipped': '#CE1E36',
        'out_for_delivery': '#EF4444',
        'out for delivery': '#EF4444',
        'delivered': '#10B981',
        'undelivered': '#DC2626',
        'rto': '#F59E0B',
        'rto_delivered': '#8B5CF6',
        'rto delivered': '#8B5CF6',
        'cancelled': '#EF4444',
        'order_cancelled': '#EF4444',
        'order cancelled': '#EF4444',
        'exception': '#DC2626',
        'returned': '#6B7280'
    };
    
    const lowerStatus = status.toLowerCase().replace(/\s+/g, '_');
    const normalizedStatus = status.toLowerCase();
    
    return colorMap[lowerStatus] || colorMap[normalizedStatus] || '#6B7280';
};

/**
 * Check if status is a final state (cannot be changed)
 * @param {string} status - The status string
 * @returns {boolean} - True if status is final
 */
export const isFinalStatus = (status) => {
    if (!status) return false;
    
    const finalStatuses = ['delivered', 'cancelled', 'order cancelled', 'rto', 'rto delivered', 'returned'];
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
        'rto delivered': 11,
        'cancelled': 12,
        'order cancelled': 13,
        'exception': 14,
        'returned': 15
    };
    
    const lowerStatus = status.toLowerCase();
    return priorityMap[lowerStatus] || 999;
};