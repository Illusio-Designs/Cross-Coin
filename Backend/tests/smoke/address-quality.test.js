/**
 * Smoke tests for the address quality service.
 *
 * These don't hit MySQL/Redis — they exercise the pure scoring logic
 * with the historical-lookup query stubbed at the sequelize level.
 * This is the minimum viable safety net for the COD-blocking path.
 */

jest.mock('../../config/db.js', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([null]),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const {
  validatePincode,
  validatePhoneNumber,
  validateAddressCompleteness,
  calculateAddressQuality,
  getAddressHash,
} = require('../../services/addressQualityService.js');

describe('address quality — primitives', () => {
  test('validatePincode accepts 6 digits, rejects everything else', () => {
    expect(validatePincode('395006')).toBe(true);
    expect(validatePincode('12345')).toBe(false);
    expect(validatePincode('1234567')).toBe(false);
    expect(validatePincode('abc456')).toBe(false);
    expect(validatePincode('')).toBe(false);
    expect(validatePincode(null)).toBe(false);
  });

  test('validatePhoneNumber accepts 10 digits or 91-prefixed 12', () => {
    expect(validatePhoneNumber('9876543210')).toBe(true);
    expect(validatePhoneNumber('919876543210')).toBe(true);
    expect(validatePhoneNumber('98 7654 3210')).toBe(true);
    expect(validatePhoneNumber('98765')).toBe(false);
    expect(validatePhoneNumber('')).toBe(false);
  });

  test('validateAddressCompleteness flags every missing required field', () => {
    const r = validateAddressCompleteness({ line1: 'x', city: '', state: 'GJ', pincode: '395006', phone: '9876543210' });
    expect(r.isComplete).toBe(false);
    expect(r.missingFields).toContain('city');
  });
});

describe('address quality — scoring', () => {
  const complete = {
    line1: 'A-203, Maple Heights, Citylight',
    landmark: 'Near VR Mall',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395007',
    phone: '9876543210',
  };

  test('a fully complete address with landmark scores ≥ 90 (cod-eligible)', async () => {
    const r = await calculateAddressQuality(complete);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.factors.pincodeValid).toBe(true);
    expect(r.factors.phoneValid).toBe(true);
    expect(r.factors.addressComplete).toBe(true);
    expect(r.factors.landmarkProvided).toBe(true);
    expect(r.recommendation).toBe('cod');
  });

  test('landmark presence is worth at least 10 points', async () => {
    const withLandmark = await calculateAddressQuality(complete);
    const withoutLandmark = await calculateAddressQuality({ ...complete, landmark: '' });
    expect(withLandmark.score - withoutLandmark.score).toBeGreaterThanOrEqual(10);
    expect(withoutLandmark.factors.landmarkProvided).toBe(false);
  });

  test('missing pincode AND phone drops below COD threshold of 60', async () => {
    // Empty fields fail completeness → no landmark bonus → no historical fallback bonus.
    const r = await calculateAddressQuality({ ...complete, pincode: '', phone: '', landmark: '' });
    expect(r.score).toBeLessThan(60);
    expect(r.recommendation).toBe('prepaid');
  });
});

describe('address quality — hash stability', () => {
  test('same address → same hash regardless of accepted alias keys', () => {
    const a = getAddressHash({
      line1: 'A-203, Maple Heights',
      line2: 'Near VR Mall',
      city: 'Surat', state: 'Gujarat', pincode: '395007',
    });
    const b = getAddressHash({
      address: 'A-203, Maple Heights',
      landmark: 'Near VR Mall',
      city: 'Surat', state: 'Gujarat', pincode: '395007',
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  test('different landmark → different hash (so shared buildings get distinct reputations)', () => {
    const flat1 = getAddressHash({ line1: 'Maple Heights', landmark: 'Flat 203', city: 'Surat', state: 'GJ', pincode: '395007' });
    const flat2 = getAddressHash({ line1: 'Maple Heights', landmark: 'Flat 405', city: 'Surat', state: 'GJ', pincode: '395007' });
    expect(flat1).not.toBe(flat2);
  });
});
