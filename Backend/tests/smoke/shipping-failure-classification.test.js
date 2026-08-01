/**
 * Smoke tests for isPermanentShippingFailure — decides whether a shipping-sync
 * failure is permanent (park the order, surface it, offer manual courier) or
 * transient (let Bull retry). Getting this wrong means either endless doomed
 * retries or an order stuck at "Pending Sync" with no reason. These guard the
 * "pincode not serviceable" behaviour end-to-end.
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { isPermanentShippingFailure } = require('../../controller/orderShippingController.js');

describe('isPermanentShippingFailure', () => {
  test.each([
    'Pincode not serviceable',
    'PIN code 795001 is not serviceable',
    'Destination not deliverable',
    'pincode is missing',
    'Phone must be exactly 10 digits',
    'City is missing',
    'Order has no items',
    'No customer details found',
  ])('permanent: %s', (msg) => {
    expect(isPermanentShippingFailure(msg)).toBe(true);
  });

  test.each([
    'ETIMEDOUT connecting to courier API',
    'socket hang up',
    'ECONNRESET',
    'Internal Server Error 500 from provider',
    'Request timeout',
    'Temporary provider outage',
  ])('transient: %s', (msg) => {
    expect(isPermanentShippingFailure(msg)).toBe(false);
  });

  test('empty / nullish message is not permanent', () => {
    expect(isPermanentShippingFailure('')).toBe(false);
    expect(isPermanentShippingFailure(null)).toBe(false);
    expect(isPermanentShippingFailure(undefined)).toBe(false);
  });
});
