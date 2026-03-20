'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function LoginPageClient() {
  const { login, loading } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      await login(data.email, data.password)
    } catch {
      setServerError('Invalid email or password.')
    }
  }

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white">
      <div className="flex min-h-[80vh] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-10">
        <h1 className="mb-8 font-display text-3xl font-normal text-brand-black">Welcome back</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />

          {serverError && (
            <p className="text-sm text-error" role="alert">
              {serverError}
            </p>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/forgot-password"
            className="text-sm text-gray-600 underline underline-offset-4 hover:text-brand-black transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            Forgot password?
          </Link>
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-brand-black underline underline-offset-4 hover:text-sage transition-colors duration-150"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
      </div>
    </section>
  )
}
