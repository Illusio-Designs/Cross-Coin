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

const FIELD_BASE =
  'w-full rounded-[2px] border bg-cream px-4 py-3 text-sm text-ink placeholder:text-text-faint transition-colors duration-300 focus:outline-none';

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
  const fieldClass = (hasError) =>
    `${FIELD_BASE} ${hasError ? 'border-[#b8472f] focus:border-[#b8472f]' : 'border-line focus:border-ink'}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name} className="flex flex-col gap-2.5">
            <label htmlFor={`addr-${f.name}`} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
              {f.label}
            </label>
            {f.textarea ? (
              <textarea id={`addr-${f.name}`} rows={2} placeholder={f.placeholder}
                {...register(f.name)} aria-invalid={errors[f.name] ? 'true' : 'false'}
                className={fieldClass(!!errors[f.name])} />
            ) : (
              <input id={`addr-${f.name}`} inputMode={f.inputMode || 'text'} placeholder={f.placeholder}
                {...register(f.name)} aria-invalid={errors[f.name] ? 'true' : 'false'}
                className={fieldClass(!!errors[f.name])} />
            )}
            {errors[f.name] && (
              <p role="alert" className="text-xs text-[#b8472f]">{errors[f.name].message}</p>
            )}
          </div>
        ))}
      </div>

      {quality && (
        <div role="status" aria-live="polite"
          className={`mt-7 rounded-[2px] border px-4 py-3 text-sm ${
            quality.cod_allowed === false
              ? 'border-[#ecdcb4] bg-[#f6efe0] text-[#8a6d1f]'
              : 'border-[#cfe6d8] bg-[#eaf4ee] text-[#5f7a3c]'
          }`}>
          <strong className="font-semibold">Address quality: {quality.score}/100.</strong>{' '}
          {quality.cod_allowed === false
            ? 'Cash on delivery is not available for this address — please choose a prepaid option at checkout.'
            : 'Cash on delivery is available for this address.'}
        </div>
      )}

      {showDefaultCheckbox && (
        <label className="mt-7 flex cursor-pointer items-center gap-2.5 text-sm text-text-muted">
          <input type="checkbox" {...register('isDefault')} disabled={disabled}
            className="h-3.5 w-3.5 accent-ink" />
          Set as default address
        </label>
      )}

      <div className="mt-9 flex items-center justify-end gap-3 border-t border-line pt-7">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={disabled}
            className="rounded-full border border-line px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-text-muted transition-colors duration-300 hover:border-ink hover:text-ink disabled:opacity-55">
            Cancel
          </button>
        )}
        <button type="submit" disabled={disabled}
          className="rounded-full bg-[#1e1912] px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-55">
          {disabled ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
