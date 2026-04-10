import { Input } from '@/components/ui/Input';










export function AddressFields({ register, errors, prefix = 'shippingAddress' }) {
  const field = (name) => `${prefix}.${name}`;
  const err = (name) => {
    const prefixErrors = errors?.[prefix];
    if (!prefixErrors || typeof prefixErrors !== 'object') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prefixErrors?.[name]?.message;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" {...register(field('firstName'))} error={err('firstName')} />
        <Input label="Last Name" {...register(field('lastName'))} error={err('lastName')} />
      </div>
      <Input label="Address" {...register(field('line1'))} error={err('line1')} />
      <Input label="Apartment, suite, etc. (optional)" {...register(field('line2'))} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" {...register(field('city'))} error={err('city')} />
        <Input label="State" {...register(field('state'))} error={err('state')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Postal Code" {...register(field('postalCode'))} error={err('postalCode')} />
        <Input label="Country" defaultValue="India" {...register(field('country'))} error={err('country')} />
      </div>
      <Input label="Phone" type="tel" {...register(field('phone'))} error={err('phone')} />
    </div>);

}