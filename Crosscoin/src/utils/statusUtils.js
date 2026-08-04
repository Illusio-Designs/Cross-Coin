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
        'awaiting_confirmation': 'Awaiting Confirmation',
        'awaiting confirmation': 'Awaiting Confirmation',
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
        'return_initiated': 'Return Initiated',
        'return initiated': 'Return Initiated',
        'returned_rto': 'Returned (RTO)',
        'returned rto': 'Returned (RTO)',
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
        'awaiting_confirmation': '#F97316',
        'awaiting confirmation': '#F97316',
        'confirmed': '#3B82F6',
        'processing': '#3B82F6',
        'booked': '#6366F1',
        'pickup_initiated': '#8B5CF6',
        'pickup initiated': '#8B5CF6',
        'manifested': '#0891B2',
        'in_transit': '#F97316',
        'in transit': '#F97316',
        'shipped': '#EA580C',
        'out_for_delivery': '#65A30D',
        'out for delivery': '#65A30D',
        'delivered': '#10B981',
        'undelivered': '#DC2626',
        'rto': '#F59E0B',
        'rto_delivered': '#64748B',
        'rto delivered': '#64748B',
        'cancelled': '#EF4444',
        'order_cancelled': '#EF4444',
        'order cancelled': '#EF4444',
        'exception': '#DC2626',
        'return_initiated': '#F59E0B',
        'return initiated': '#F59E0B',
        'returned_rto': '#64748B',
        'returned rto': '#64748B',
        'returned': '#64748B'
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
        'awaiting confirmation': 2,
        'confirmed': 3,
        'processing': 4,
        'booked': 5,
        'pickup initiated': 6,
        'manifested': 7,
        'in transit': 8,
        'shipped': 9,
        'out for delivery': 10,
        'delivered': 11,
        'undelivered': 12,
        'return initiated': 13,
        'rto': 14,
        'rto delivered': 15,
        'returned rto': 16,
        'cancelled': 17,
        'order cancelled': 18,
        'exception': 19,
        'returned': 20
    };
    
    const lowerStatus = status.toLowerCase();
    return priorityMap[lowerStatus] || 999;
};