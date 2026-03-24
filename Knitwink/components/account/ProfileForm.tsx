'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AddressFields } from '@/components/checkout/AddressFields'
import { updateProfile, updatePassword } from '@/lib/api/auth'
import type { User } from '@/types'

const sectionHeading =
  'text-sm font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-3 mb-6'

// ── schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const addressSchema = z.object({
  address: z.object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    line1: z.string().min(1, 'Required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'Required'),
    state: z.string().min(1, 'Required'),
    postalCode: z.string().min(4, 'Required'),
    country: z.string().min(1, 'Required'),
    phone: z.string().optional(),
  }),
})

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>
type AddressValues = z.infer<typeof addressSchema>

// ── toast helper ─────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-full bg-sage/10 px-4 py-2 text-sm text-sage-dark"
    >
      <CheckCircle size={14} aria-hidden="true" />
      {message}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface ProfileFormProps {
  user: User | null
}

export function ProfileForm({ user }: ProfileFormProps) {
  return (
    <div className="flex flex-col gap-12">
      <ProfileSection user={user} />
      <PasswordSection />
      <AddressSection user={user} />
    </div>
  )
}

// ── profile section ───────────────────────────────────────────────────────────

function ProfileSection({ user }: { user: User | null }) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  })

  const onSubmit = async (data: ProfileValues) => {
    setError(null)
    setSaved(false)
    try {
      await updateProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save changes. Please try again.')
    }
  }

  return (
    <section>
      <p className={sectionHeading}>Profile</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            autoComplete="given-name"
            {...register('firstName')}
            error={errors.firstName?.message}
          />
          <Input
            label="Last Name"
            autoComplete="family-name"
            {...register('lastName')}
            error={errors.lastName?.message}
          />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          {...register('phone')}
          error={errors.phone?.message}
        />
        {error && <p className="text-sm text-error" role="alert">{error}</p>}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
          {saved && <Toast message="Changes saved" />}
        </div>
      </form>
    </section>
  )
}

// ── password section ──────────────────────────────────────────────────────────

function PasswordSection() {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  const onSubmit = async (data: PasswordValues) => {
    setError(null)
    setSaved(false)
    try {
      await updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setSaved(true)
      reset()
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Current password is incorrect.')
    }
  }

  return (
    <section>
      <p className={sectionHeading}>Password</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <Input
          label="Current Password"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          error={errors.currentPassword?.message}
        />
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          error={errors.newPassword?.message}
        />
        <Input
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        {error && <p className="text-sm text-error" role="alert">{error}</p>}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating…' : 'Update Password'}
          </Button>
          {saved && <Toast message="Password updated" />}
        </div>
      </form>
    </section>
  )
}

// ── address section ───────────────────────────────────────────────────────────

function AddressSection({ user }: { user: User | null }) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address: {
        firstName: user?.defaultAddress?.firstName ?? user?.firstName ?? '',
        lastName: user?.defaultAddress?.lastName ?? user?.lastName ?? '',
        line1: user?.defaultAddress?.line1 ?? '',
        line2: user?.defaultAddress?.line2 ?? '',
        city: user?.defaultAddress?.city ?? '',
        state: user?.defaultAddress?.state ?? '',
        postalCode: user?.defaultAddress?.postalCode ?? '',
        country: user?.defaultAddress?.country ?? 'India',
        phone: user?.defaultAddress?.phone ?? user?.phone ?? '',
      },
    },
  })

  const onSubmit = async (data: AddressValues) => {
    setError(null)
    setSaved(false)
    try {
      await updateProfile({ defaultAddress: data.address })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save address. Please try again.')
    }
  }

  return (
    <section>
      <p className={sectionHeading}>Default Shipping Address</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <AddressFields register={register} errors={errors} prefix="address" />
        {error && <p className="text-sm text-error" role="alert">{error}</p>}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Address'}
          </Button>
          {saved && <Toast message="Address saved" />}
        </div>
      </form>
    </section>
  )
}
