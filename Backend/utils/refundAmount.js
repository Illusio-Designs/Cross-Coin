'use strict';

function positivePaise(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null;
}

// Null/undefined alone means the whole eligible amount. Zero, NaN, blanks and
// malformed strings must never silently become a full refund.
function resolveRefundAmount(value, maximum) {
  const maxPaise = positivePaise(maximum);
  if (maxPaise == null) throw new Error('The refundable payment amount is invalid');
  const paise = value == null ? maxPaise : positivePaise(value);
  if (paise == null || paise > maxPaise) {
    throw new Error(`Refund amount must be positive, use at most two decimal places, and not exceed ₹${(maxPaise / 100).toFixed(2)}`);
  }
  return { amount: paise / 100, paise, isPartial: paise < maxPaise };
}

module.exports = { resolveRefundAmount };
