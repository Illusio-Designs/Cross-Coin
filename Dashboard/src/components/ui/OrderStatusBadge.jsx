import React from 'react';

const OrderStatusBadge = ({ status }) => {
  // Token pairs so the pill reads in both light and dark themes.
  const tone = (t) => (t === 'neutral'
    ? { bg: 'var(--ds-color-surface-soft)', color: 'var(--ds-color-text-muted)' }
    : { bg: `var(--ds-color-${t}-bg)`, color: `var(--ds-color-${t})` });
  const statusConfig = {
    pending: { ...tone('warn'), label: 'Pending' },
    awaiting_confirmation: { ...tone('warn'), label: 'Awaiting Confirmation' },
    confirmed: { ...tone('info'), label: 'Confirmed' },
    processing: { ...tone('info'), label: 'Processing' },
    booked: { ...tone('accent2'), label: 'Booked' },
    'pickup initiated': { ...tone('info'), label: 'Pickup Initiated' },
    manifested: { ...tone('accent2'), label: 'Manifested' },
    'in transit': { ...tone('info'), label: 'In Transit' },
    shipped: { ...tone('info'), label: 'Shipped' },
    'out for delivery': { ...tone('info'), label: 'Out for Delivery' },
    delivered: { ...tone('success'), label: 'Delivered', bold: true },
    undelivered: { ...tone('danger'), label: 'Undelivered' },
    rto: { ...tone('danger'), label: 'RTO' },
    'rto delivered': { ...tone('accent2'), label: 'RTO Delivered' },
    'return_initiated': { ...tone('accent2'), label: 'Return Initiated' },
    'returned_rto': { ...tone('accent2'), label: 'Returned RTO' },
    cancelled: { ...tone('danger'), label: 'Cancelled' },
    'order cancelled': { ...tone('danger'), label: 'Order Cancelled' },
    exception: { ...tone('warn'), label: 'Exception', bold: true }
  };

  const config = statusConfig[status] || { ...tone('neutral'), label: status };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: config.bg,
        color: config.color,
        padding: '4px 11px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: config.bold ? '700' : '600',
        letterSpacing: '0.01em',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor', flex: 'none' }} />
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;
