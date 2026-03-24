import { Input } from '@/components/ui/Input'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'

interface AddressFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>
  prefix?: string
}

export function AddressFields({ register, errors, prefix = 'shippingAddress' }: AddressFieldsProps) {
  const field = (name: string) => `${prefix}.${name}` as const
  const err = (name: string) => {
    const prefixErrors = errors?.[prefix]
    if (!prefixErrors || typeof prefixErrors !== 'object') return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prefixErrors as Record<string, any>)?.[name]?.message as string | undefined
  }

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
    </div>
  )
}
