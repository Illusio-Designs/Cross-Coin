'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { register } from '@/lib/api/auth'
import { useAuth } from '@/context/AuthContext'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) router.replace('/account')
  }, [isAuthenticated, router])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.email || !form.password) { setError('All fields are required'); return }
    setLoading(true)
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, '').slice(0, 10),
        password: form.password,
      })
      router.push('/login')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-6 py-16 text-center md:px-10 md:py-20">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Create Account</h1>
          <p className="mt-3 text-sm text-white/45">Join Knitwink for exclusive offers and easy checkout</p>
        </div>
      </section>

      <section className="bg-white px-4 py-12 md:px-6">
        <div className="mx-auto max-w-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { label: 'Full Name', key: 'username', type: 'text', placeholder: 'Priya Sharma' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'priya@email.com' },
              { label: 'Phone (optional)', key: 'phone', type: 'tel', placeholder: '9876543210' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none"
                  required={key !== 'phone'}
                />
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">Password</label>
              <div className="flex items-center rounded-xl border border-gray-200 px-4 py-3">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min 8 characters"
                  className="flex-1 text-sm text-brand-black outline-none placeholder:text-gray-300"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-brand-black underline underline-offset-2">Login</Link>
            </p>

            <p className="text-center text-[10px] text-gray-400">
              By creating an account you agree to our{' '}
              <Link href="/policies/terms-and-conditions" className="underline">Terms</Link> and{' '}
              <Link href="/policies/privacy-policy" className="underline">Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </section>
    </>
  )
}
