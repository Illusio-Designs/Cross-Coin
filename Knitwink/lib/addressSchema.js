import { z } from 'zod';

/**
 * Single source of truth for shipping-address validation on the
 * Knitwink storefront. Mirrors the Zod schema in
 * Backend/routes/shippingAddressRoutes.js so a payload that passes
 * here will pass there.
 *
 * Use with react-hook-form:
 *
 *   import { useForm } from 'react-hook-form';
 *   import { zodResolver } from '@hookform/resolvers/zod';
 *   import { addressSchema } from '@/lib/addressSchema';
 *
 *   const { register, handleSubmit, formState: { errors } } = useForm({
 *     resolver: zodResolver(addressSchema),
 *     defaultValues: { ... },
 *   });
 */

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?91)?\d{10}$/, 'Phone must be a 10-digit Indian number');

const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits');

const realAddressGuard = (val) => {
  const v = String(val).trim();
  const junk = [/^test/i, /^asdf/i, /^xxx/i, /^abc$/i, /^na$/i, /^n\/a$/i, /^\.+$/, /^-+$/];
  return !junk.some((p) => p.test(v));
};

export const addressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Name is too short')
    .max(255)
    .refine((v) => !/^\d+$/.test(v), 'Name cannot be only numbers'),
  phoneNumber: phoneSchema,
  address: z
    .string()
    .trim()
    .min(10, 'Address is too short (min 10 characters) — add house/flat number and area')
    .max(500)
    .refine(realAddressGuard, 'Address looks like a placeholder — please enter a real address'),
  landmark: z.string().trim().max(255).optional().default(''),
  city: z
    .string()
    .trim()
    .min(2, 'City is too short')
    .max(100)
    .refine((v) => !/^\d+$/.test(v), 'City cannot be only numbers'),
  state: z.string().trim().min(2).max(100),
  postalCode: pincodeSchema
    .refine((v) => !['000000', '111111', '999999'].includes(v), 'PIN code looks like a placeholder'),
  country: z.string().trim().max(100).default('India'),
  isDefault: z.boolean().optional().default(false),
});

/**
 * Convenience wrapper for callers that expect the legacy
 * { valid, errors, warnings } shape. Returns the FIRST error message
 * for one-toast UX consistency.
 */
export function validateAddress(addr) {
  const candidate = {
    fullName: addr.fullName ?? addr.full_name ?? '',
    phoneNumber: addr.phoneNumber ?? addr.phone_number ?? '',
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
  return {
    valid: false,
    errors: result.error.issues.map((i) => i.message),
    warnings: [],
    issues: result.error.issues,
  };
}
