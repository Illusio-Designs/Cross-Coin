'use strict';

const pickedUpStatus = 'pickup initiated';

// Some bookings still use the processing status. The AWB can be stored on the
// original order, the shipment record, or both.
function fulfillmentStageSql(orderAlias) {
  const order = `\`${orderAlias}\``;
  const hasWaybill = `(NULLIF(TRIM(${order}.shipping_waybill), '') IS NOT NULL OR EXISTS (
    SELECT 1 FROM order_shipments shipment
    WHERE shipment.order_id = ${order}.id AND NULLIF(TRIM(shipment.waybill), '') IS NOT NULL
  ))`;
  const pending = `LOWER(${order}.status) IN ('confirmed','processing')`;
  return {
    toShip: `(${pending} AND NOT ${hasWaybill})`,
    booked: `(LOWER(${order}.status) IN ('booked','manifested') OR (${pending} AND ${hasWaybill}))`,
  };
}

module.exports = { fulfillmentStageSql, pickedUpStatus };
