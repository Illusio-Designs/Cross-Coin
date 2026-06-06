'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema } from '@/lib/addressSchema';
import { apiClient } from '@/lib/api/client';

/**
 * RHF + Zod address form. Bound to the shared schema.
 * Address-quality probe at 600ms debounce shows COD eligibility
 * inline before submit.
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
  fullName: '', phoneNumber: '', address: '', landmark: '',
  city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

export default function AddressFormRHF({
  defaultValues = EMPTY,
  onSubmit,
  submitLabel = 'Save Address',
  onCancel,
  busy = false,
  showDefaultCheckbox = true,
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
    mode: 'onBlur',
  });

  const [quality, setQuality] = useState(null);
  const pincode = watch('postalCode');
  const phone = watch('phoneNumber');
  const address = watch('address');

  useEffect(() => {
    if (!/^\d{6}$/.test(String(pincode || '').trim())) return;
    if (!/^(?:\+?91)?\d{10}$/.test(String(phone || '').trim())) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const resp = await apiClient.post(
          '/api/orders/check-address-quality',
          { line1: address || 'placeholder', landmark: watch('landmark') || '', city: watch('city') || '', state: watch('state') || '', pincode, phone },
          { suppressErrorToast: true, silentError: true },
        );
        if (!cancelled) {
          const data = resp?.data || resp;
          setQuality({ score: data?.score, cod_allowed: data?.cod_allowed, recommendation: data?.recommendation });
        }
      } catch { if (!cancelled) setQuality(null); }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pincode, phone, address, watch]);

  const disabled = busy || isSubmitting;
  const inputBase = (hasError) => ({
    border: hasError ? '1px solid #dc2626' : '1px solid #d1d5db',
    borderRadius: 6, padding: '8px 10px', fontSize: 14, background: '#fff',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {FIELDS.map((f) => (
          <div key={f.name} style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor={`addr-${f.name}`} style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{f.label}</label>
            {f.textarea ? (
              <textarea id={`addr-${f.name}`} rows={2} placeholder={f.placeholder}
                {...register(f.name)} aria-invalid={errors[f.name] ? 'true' : 'false'}
                style={inputBase(!!errors[f.name])} />
            ) : (
              <input id={`addr-${f.name}`} inputMode={f.inputMode || 'text'} placeholder={f.placeholder}
                {...register(f.name)} aria-invalid={errors[f.name] ? 'true' : 'false'}
                style={inputBase(!!errors[f.name])} />
            )}
            {errors[f.name] && (
              <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors[f.name].message}</p>
            )}
          </div>
        ))}
      </div>

      {quality && (
        <div role="status" aria-live="polite"
          style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 8, fontSize: 13,
            background: quality.cod_allowed === false ? '#fef3c7' : '#ecfdf5',
            color: quality.cod_allowed === false ? '#92400e' : '#065f46',
            border: `1px solid ${quality.cod_allowed === false ? '#fcd34d' : '#a7f3d0'}`,
          }}>
          <strong>Address quality: {quality.score}/100.</strong>{' '}
          {quality.cod_allowed === false
            ? 'COD is not available for this address — please choose a prepaid option at checkout.'
            : 'COD is available for this address.'}
        </div>
      )}

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
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#111', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
          {disabled ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
