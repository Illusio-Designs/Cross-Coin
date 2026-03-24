'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AddressFields } from './AddressFields'
import { PaymentFields } from './PaymentFields'
import { createOrder } from '@/lib/api/orders'
import { useCart } from '@/hooks/useCart'

const addressSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  postalCode: z.string().min(4, 'Required'),
  country: z.string().min(1, 'Required'),
  phone: z.string().optional(),
})

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  shippingAddress: addressSchema,
  paymentDetails: z.object({
    cardNumber: z.string().min(16, 'Enter a valid card number'),
    expiry: z.string().min(5, 'Enter expiry date'),
    cvv: z.string().min(3, 'Enter CVV'),
    nameOnCard: z.string().min(1, 'Required'),
  }),
})

type FormValues = z.infer<typeof schema>

const sectionHeading = 'text-sm font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-3 mb-6'

export function CheckoutForm() {
  const router = useRouter()
  const { clearCart } = useCart()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      const order = await createOrder({
        shippingAddress: data.shippingAddress,
        paymentDetails: data.paymentDetails,
      })
      clearCart()
      router.push(`/account/orders/${order.id}`)
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10" noValidate>
      {/* Contact */}
      <section>
        <p className={sectionHeading}>Contact</p>
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
      </section>

      {/* Shipping */}
      <section>
        <p className={sectionHeading}>Shipping</p>
        <AddressFields register={register} errors={errors} />
      </section>

      {/* Payment */}
      <section>
        <p className={sectionHeading}>Payment</p>
        <PaymentFields register={register} errors={errors} />
      </section>

      {serverError && (
        <p className="text-sm text-error" role="alert">{serverError}</p>
      )}

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Placing Order…' : 'Place Order'}
      </Button>
    </form>
  )
}
