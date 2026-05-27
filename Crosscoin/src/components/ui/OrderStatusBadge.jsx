import React from 'react';

const OrderStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { bg: '#f5f5f5', color: '#666', label: 'Pending' },
    awaiting_confirmation: { bg: '#fff8e1', color: '#f57f17', label: 'Awaiting Confirmation' },
    confirmed: { bg: '#e3f2fd', color: '#1976d2', label: 'Confirmed' },
    processing: { bg: '#e3f2fd', color: '#1976d2', label: 'Processing' },
    booked: { bg: '#e8f5e9', color: '#388e3c', label: 'Booked' },
    'pickup initiated': { bg: '#e0f2f1', color: '#00897b', label: 'Pickup Initiated' },
    manifested: { bg: '#f3e5f5', color: '#7b1fa2', label: 'Manifested' },
    'in transit': { bg: '#e0f7fa', color: '#0097a7', label: 'In Transit' },
    shipped: { bg: '#e8f5e9', color: '#388e3c', label: 'Shipped' },
    'out for delivery': { bg: '#fce4ec', color: '#c2185b', label: 'Out for Delivery' },
    delivered: { bg: '#c8e6c9', color: '#2e7d32', label: 'Delivered', bold: true },
    undelivered: { bg: '#ffccbc', color: '#d84315', label: 'Undelivered' },
    rto: { bg: '#ffe0b2', color: '#e65100', label: 'RTO' },
    'rto delivered': { bg: '#c8e6c9', color: '#2e7d32', label: 'RTO Delivered' },
    'return_initiated': { bg: '#fff3e0', color: '#e65100', label: 'Return Initiated' },
    'returned_rto': { bg: '#c8e6c9', color: '#2e7d32', label: 'Returned RTO' },
    cancelled: { bg: '#ffcdd2', color: '#c62828', label: 'Cancelled' },
    'order cancelled': { bg: '#ffcdd2', color: '#c62828', label: 'Order Cancelled' },
    exception: { bg: '#ffcdd2', color: '#c62828', label: 'Exception', bold: true }
  };

  const config = statusConfig[status] || { bg: '#f5f5f5', color: '#666', label: status };

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: config.bg,
        color: config.color,
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: config.bold ? '700' : '500',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap'
      }}
    >
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;
