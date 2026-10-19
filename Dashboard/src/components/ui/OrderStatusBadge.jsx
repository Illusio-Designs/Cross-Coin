import React from 'react';
import StatusPill from './StatusPill';

// Order status → [tone, label]. Tones follow the shared status colours
// (StatusPill): done / in progress / needs you / problem / neutral.
const ORDER_STATUS = {
  pending: ['needs', 'Pending'],
  awaiting_confirmation: ['needs', 'Awaiting Confirmation'],
  confirmed: ['progress', 'Confirmed'],
  processing: ['progress', 'Processing'],
  booked: ['progress', 'Booked'],
  'pickup initiated': ['progress', 'Pickup Initiated'],
  manifested: ['progress', 'Manifested'],
  'in transit': ['progress', 'In Transit'],
  shipped: ['progress', 'Shipped'],
  'out for delivery': ['progress', 'Out for Delivery'],
  delivered: ['done', 'Delivered'],
  undelivered: ['problem', 'Undelivered'],
  rto: ['problem', 'RTO'],
  'rto delivered': ['problem', 'RTO Delivered'],
  return_initiated: ['needs', 'Return Initiated'],
  returned_rto: ['problem', 'Returned RTO'],
  cancelled: ['neutral', 'Cancelled'],
  'order cancelled': ['neutral', 'Order Cancelled'],
  exception: ['problem', 'Exception'],
};

const OrderStatusBadge = ({ status }) => {
  const [tone, label] = ORDER_STATUS[String(status || '').toLowerCase()] || ['neutral', status];
  return <StatusPill tone={tone} dot style={{ textTransform: 'capitalize' }}>{label}</StatusPill>;
};

export default OrderStatusBadge;
