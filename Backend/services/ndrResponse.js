'use strict';

// iThink can return HTTP 200 while rejecting an individual AWB.
function ndrResult(response, awb) {
  const object = response && typeof response === 'object' && !Array.isArray(response) ? response : null;
  const entry = object?.data && !Array.isArray(object.data) ? object.data[String(awb).trim()] : null;
  const success = value => String(value || '').trim().toLowerCase() === 'success';
  const accepted = Boolean(object && success(object.status) && Number(object.status_code) === 200 && entry && success(entry.status));
  const raw = entry?.remark || entry?.message || object?.message || object?.status_message || object?.error || object?.html_message;
  const message = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, '').trim().slice(0, 500) : '';
  return {
    accepted,
    message: message || (accepted ? 'Courier accepted the instruction.' : 'iThink did not confirm this AWB. Check that the shipment is eligible for an NDR action in the iThink panel.'),
  };
}

module.exports = { ndrResult };
