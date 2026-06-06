import { z } from 'zod';

/**
 * Shared address Zod schema — mirrors backend shippingAddressBase.
 * A payload that passes here passes the API.
 */

const phoneSchema = z.string().trim().regex(/^(?:\+?91)?\d{10}$/, 'Phone must be a 10-digit Indian number');
const pincodeSchema = z.string().trim().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits');

const realAddressGuard = (val) => {
  const v = String(val).trim();
  const junk = [/^test/i, /^asdf/i, /^xxx/i, /^abc$/i, /^na$/i, /^n\/a$/i, /^\.+$/, /^-+$/];
  return !junk.some((p) => p.test(v));
};

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is too short').max(255).refine((v) => !/^\d+$/.test(v), 'Name cannot be only numbers'),
  phoneNumber: phoneSchema,
  address: z.string().trim().min(10, 'Address is too short (min 10 characters)').max(500).refine(realAddressGuard, 'Address looks like a placeholder'),
  landmark: z.string().trim().max(255).optional().default(''),
  city: z.string().trim().min(2, 'City is too short').max(100).refine((v) => !/^\d+$/.test(v), 'City cannot be only numbers'),
  state: z.string().trim().min(2).max(100),
  postalCode: pincodeSchema.refine((v) => !['000000', '111111', '999999'].includes(v), 'PIN code looks like a placeholder'),
  country: z.string().trim().max(100).default('India'),
  isDefault: z.boolean().optional().default(false),
});

export function validateAddress(addr) {
  const candidate = {
    fullName: addr.fullName ?? addr.full_name ?? '',
    phoneNumber: addr.phoneNumber ?? addr.phone_number ?? addr.phone ?? '',
    address: addr.address ?? '',
    landmark: addr.landmark ?? '',
    city: addr.city ?? '',
    state: addr.state ?? '',
    postalCode: addr.postalCode ?? addr.postal_code ?? addr.pincode ?? '',
    country: addr.country ?? 'India',
    isDefault: addr.isDefault ?? addr.is_default ?? false,
  };
  const result = addressSchema.safeParse(candidate);
  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: candidate.address.length < 20 ? ['Address is short — add a landmark for better delivery'] : [],
      parsed: result.data,
    };
  }
  return { valid: false, errors: result.error.issues.map((i) => i.message), warnings: [], issues: result.error.issues };
}
