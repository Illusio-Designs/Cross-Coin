/**
 * Smoke tests for the shared address Zod schema.
 *
 * Mirrors the backend's shippingAddressBase schema — a payload that
 * passes here will pass the API.
 */

import { addressSchema, validateAddress } from '@/lib/addressSchema';

const VALID = {
  fullName: 'Alice Sharma',
  phoneNumber: '9876543210',
  address: 'A-203, Maple Heights, Citylight',
  landmark: 'Near VR Mall',
  city: 'Surat',
  state: 'Gujarat',
  postalCode: '395007',
  country: 'India',
  isDefault: false,
};

describe('addressSchema (Zod)', () => {
  test('accepts a fully valid Indian address', () => {
    const r = addressSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  test('rejects sub-10-char address', () => {
    const r = addressSchema.safeParse({ ...VALID, address: 'short' });
    expect(r.success).toBe(false);
  });

  test('rejects junk placeholder address', () => {
    const r = addressSchema.safeParse({ ...VALID, address: 'asdfasdfasdf' });
    expect(r.success).toBe(false);
  });

  test('rejects 5-digit pincode', () => {
    const r = addressSchema.safeParse({ ...VALID, postalCode: '12345' });
    expect(r.success).toBe(false);
  });

  test('rejects placeholder pincode 999999', () => {
    const r = addressSchema.safeParse({ ...VALID, postalCode: '999999' });
    expect(r.success).toBe(false);
  });

  test('accepts 91-prefixed phone', () => {
    const r = addressSchema.safeParse({ ...VALID, phoneNumber: '919876543210' });
    expect(r.success).toBe(true);
  });

  test('rejects 9-digit phone', () => {
    const r = addressSchema.safeParse({ ...VALID, phoneNumber: '987654321' });
    expect(r.success).toBe(false);
  });

  test('rejects all-digit name', () => {
    const r = addressSchema.safeParse({ ...VALID, fullName: '12345' });
    expect(r.success).toBe(false);
  });

  test('landmark is optional', () => {
    const { landmark, ...withoutLandmark } = VALID;
    const r = addressSchema.safeParse(withoutLandmark);
    expect(r.success).toBe(true);
  });
});

describe('validateAddress (legacy-shape wrapper)', () => {
  test('returns valid:true for a valid address', () => {
    const r = validateAddress(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  test('returns first error message for the bubble-up UX', () => {
    const r = validateAddress({ ...VALID, postalCode: '12' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/PIN code/i);
  });

  test('maps legacy alias keys (postal_code, phone_number, full_name)', () => {
    const r = validateAddress({
      full_name: 'Alice Sharma',
      phone_number: '9876543210',
      address: 'A-203, Maple Heights, Citylight',
      landmark: '',
      city: 'Surat',
      state: 'Gujarat',
      postal_code: '395007',
      country: 'India',
      is_default: false,
    });
    expect(r.valid).toBe(true);
  });

  test('warns about short addresses without landmark', () => {
    const r = validateAddress({ ...VALID, address: 'A-203 Maple Hts' });   // 15 chars
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
