'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.email || !form.password) { setError('All fields are required'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'knitwink' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          phone: form.phone.replace(/\D/g, '').slice(0, 10) || undefined,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Registration failed')
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-6 py-16 text-center md:px-10 md:py-20">
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Account Created</h1>
        </div>
      </section>
      <section className="bg-white px-4 py-12 text-center">
        <p className="text-sm text-gray-600">Your account has been created successfully.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-brand-black px-8 py-3 text-sm font-semibold text-white">
          Go to Login
        </Link>
      </section>
    </>
  )

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-6 py-16 text-center md:px-10 md:py-20">
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Create Account</h1>
          <p className="mt-3 text-sm text-white/45">Join Knitwink for exclusive offers</p>
        </div>
      </section>

      <section className="bg-white px-4 py-12 md:px-6">
        <div className="mx-auto max-w-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { label: 'Full Name', key: 'username', type: 'text', placeholder: 'Your name', required: true },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'you@email.com', required: true },
              { label: 'Phone (optional)', key: 'phone', type: 'tel', placeholder: '9876543210', required: false },
            ].map(({ label, key, type, placeholder, required }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">{label}</label>
                <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} required={required}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none" />
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">Password</label>
              <div className="flex items-center rounded-xl border border-gray-200 px-4 py-3">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min 8 characters" required
                  className="flex-1 text-sm text-brand-black outline-none placeholder:text-gray-300" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button type="submit" disabled={loading}
              className="mt-2 rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Account'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Already have an account? <Link href="/login" className="font-medium text-brand-black underline underline-offset-2">Login</Link>
            </p>
          </form>
        </div>
      </section>
    </>
  )
}
