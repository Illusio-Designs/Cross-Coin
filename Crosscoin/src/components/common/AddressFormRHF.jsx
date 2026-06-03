import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema } from '../../utils/addressSchema';

/**
 * Standalone, controlled-by-react-hook-form address form.
 *
 * Drop-in replacement for any hand-rolled shipping-address form. Uses
 * the shared Zod schema in utils/addressSchema.js so field rules stay
 * in sync between frontend forms and the backend route.
 *
 * Usage:
 *
 *   <AddressFormRHF
 *     defaultValues={existingAddress}
 *     onSubmit={async (values) => { await saveAddress(values); onSuccess(); }}
 *     submitLabel="Save Address"
 *   />
 *
 * The CartDrawer keeps its legacy hand-rolled form for now to avoid
 * changing live checkout UX in one go. New forms (profile-page
 * address modal rewrite, admin address-edit forms) should use this.
 */

const FIELDS = [
  { name: 'fullName', label: 'Full Name', placeholder: 'Name on the package' },
  { name: 'phoneNumber', label: 'Phone', placeholder: '10-digit mobile', inputMode: 'tel' },
  { name: 'address', label: 'Address', placeholder: 'House/flat no., street, area', textarea: true },
  { name: 'landmark', label: 'Landmark (optional)', placeholder: 'Near hospital, opposite school' },
  { name: 'city', label: 'City' },
  { name: 'state', label: 'State' },
  { name: 'postalCode', label: 'PIN Code', placeholder: '6 digits', inputMode: 'numeric' },
  { name: 'country', label: 'Country' },
];

const EMPTY = {
  fullName: '',
  phoneNumber: '',
  address: '',
  landmark: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
};

export default function AddressFormRHF({
  defaultValues = EMPTY,
  onSubmit,
  submitLabel = 'Save Address',
  onCancel,
  busy = false,
  showDefaultCheckbox = true,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
    mode: 'onBlur',
  });

  const disabled = busy || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {FIELDS.map((f) => (
          <div key={f.name} style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor={`addr-${f.name}`} style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{f.label}</label>
            {f.textarea ? (
              <textarea
                id={`addr-${f.name}`}
                rows={2}
                placeholder={f.placeholder}
                {...register(f.name)}
                aria-invalid={errors[f.name] ? 'true' : 'false'}
                style={{
                  border: errors[f.name] ? '1px solid #dc2626' : '1px solid #d1d5db',
                  borderRadius: 6, padding: '8px 10px', fontSize: 14,
                }}
              />
            ) : (
              <input
                id={`addr-${f.name}`}
                inputMode={f.inputMode || 'text'}
                placeholder={f.placeholder}
                {...register(f.name)}
                aria-invalid={errors[f.name] ? 'true' : 'false'}
                style={{
                  border: errors[f.name] ? '1px solid #dc2626' : '1px solid #d1d5db',
                  borderRadius: 6, padding: '8px 10px', fontSize: 14,
                }}
              />
            )}
            {errors[f.name] && (
              <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>
                {errors[f.name].message}
              </p>
            )}
          </div>
        ))}
      </div>

      {showDefaultCheckbox && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13 }}>
          <input type="checkbox" {...register('isDefault')} disabled={disabled} />
          Set as default address
        </label>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={disabled}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={disabled}
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#CE1E36', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
          {disabled ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
