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
    expect(addressSchema.safeParse(VALID).success).toBe(true);
  });
  test('rejects sub-10-char address', () => {
    expect(addressSchema.safeParse({ ...VALID, address: 'short' }).success).toBe(false);
  });
  test('rejects junk placeholder address', () => {
    expect(addressSchema.safeParse({ ...VALID, address: 'asdfasdfasdf' }).success).toBe(false);
  });
  test('rejects 5-digit pincode', () => {
    expect(addressSchema.safeParse({ ...VALID, postalCode: '12345' }).success).toBe(false);
  });
  test('rejects placeholder pincode 999999', () => {
    expect(addressSchema.safeParse({ ...VALID, postalCode: '999999' }).success).toBe(false);
  });
  test('accepts 91-prefixed phone', () => {
    expect(addressSchema.safeParse({ ...VALID, phoneNumber: '919876543210' }).success).toBe(true);
  });
  test('rejects 9-digit phone', () => {
    expect(addressSchema.safeParse({ ...VALID, phoneNumber: '987654321' }).success).toBe(false);
  });
  test('rejects all-digit name', () => {
    expect(addressSchema.safeParse({ ...VALID, fullName: '12345' }).success).toBe(false);
  });
  test('landmark is optional', () => {
    const { landmark, ...rest } = VALID;
    expect(addressSchema.safeParse(rest).success).toBe(true);
  });
});

describe('validateAddress (legacy-shape wrapper)', () => {
  test('valid:true on good address', () => {
    const r = validateAddress(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });
  test('returns first error message for the bubble-up UX', () => {
    const r = validateAddress({ ...VALID, postalCode: '12' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/PIN code/i);
  });
  test('maps legacy alias keys', () => {
    const r = validateAddress({
      full_name: 'Alice Sharma', phone_number: '9876543210',
      address: 'A-203, Maple Heights, Citylight', landmark: '',
      city: 'Surat', state: 'Gujarat', postal_code: '395007',
      country: 'India', is_default: false,
    });
    expect(r.valid).toBe(true);
  });
  test('warns about short addresses', () => {
    const r = validateAddress({ ...VALID, address: 'A-203 Maple Hts' });
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
