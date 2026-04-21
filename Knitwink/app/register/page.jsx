'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'

export default function RegisterPage() {
  const [step, setStep] = useState('details') // details → otp → done
  const [form, setForm] = useState({ username: '', phone: '', email: '' })
  const [otp, setOtp] = useState(['', '', '', ''])
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { fetchUser } = useAuth()

  const digits = form.phone.replace(/\D/g, '').slice(0, 10)
  const identifier = '91' + digits
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Step 1: Validate details and send OTP
  const handleSendOtp = () => {
    setError('')
    if (!form.username.trim()) { setError('Please enter your name'); return }
    if (digits.length !== 10) { setError('Enter a valid 10-digit phone number'); return }

    if (isLocal) { setStep('otp'); return }

    let attempts = 0
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(identifier, () => setStep('otp'), () => setError('Failed to send OTP. Try again.'))
      } else if (attempts < 15) {
        attempts++
        setTimeout(trySend, 400)
      } else {
        setError('OTP service not ready. Refresh the page.')
      }
    }
    trySend()
  }

  // OTP input
  const handleOtpChange = (i, val) => {
    if (val.length > 1) val = val.slice(-1)
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 3) otpRefs[i + 1].current?.focus()
  }
  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus()
  }

  // Step 2: Verify OTP → register + login
  const handleVerify = () => {
    const code = otp.join('')
    if (code.length < 4) { setError('Enter the full OTP'); return }
    setLoading(true)
    setError('')

    if (isLocal) {
      if (code !== '1111') { setError('Dev mode: use OTP 1111'); setLoading(false); return }
      doRegisterAndLogin('dev-localhost-bypass')
      return
    }

    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready.'); setLoading(false); return }
    window.verifyOtp(code,
      (data) => {
        const token = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data))
        doRegisterAndLogin(token)
      },
      () => { setError('Invalid OTP. Try again.'); setLoading(false) }
    )
  }

  // Register user then login with same OTP token
  const doRegisterAndLogin = async (accessToken) => {
    try {
      // First register the user with their details
      const regRes = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'knitwink' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim() || `${digits}@phone.knitwink.in`,
          phone: digits,
          password: Math.random().toString(36).slice(-12) + 'Kw1!', // random strong password
        }),
      })
      const regData = await regRes.json()
      // If email already exists, that's fine — user might be re-registering
      // Just proceed to login

      // Now login with phone OTP
      const loginRes = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'knitwink' },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) throw new Error(loginData.message || 'Login failed')
      if (!loginData.token) throw new Error('No token received')

      // Update username if user was just created
      if (loginData.token) {
        localStorage.setItem('token', loginData.token)
        // Update profile with the name they entered
        await fetch(`${API_URL}/api/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'knitwink', 'Authorization': `Bearer ${loginData.token}` },
          body: JSON.stringify({ username: form.username.trim() }),
        }).catch(() => {})
      }

      await fetchUser()
      window.location.replace('/account')
    } catch (err) {
      setError(err.message || 'Registration failed')
      setLoading(false)
    }
  }

  if (step === 'details') return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Create Account</h1>
          <p className="mt-3 text-sm text-white/45">Register with your phone number</p>
        </div>
      </section>
      <section className="bg-white px-4 py-12 md:px-6">
        <div className="mx-auto max-w-sm flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">Full Name</label>
            <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="Priya Sharma"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">Phone Number</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
              <span className="text-sm text-gray-400">+91</span>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit number"
                className="flex-1 text-sm text-brand-black outline-none placeholder:text-gray-300" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">Email (optional)</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={handleSendOtp} disabled={!form.username.trim() || digits.length !== 10}
            className="flex items-center justify-center gap-2 rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50">
            Send OTP <ArrowRight size={15} />
          </button>
          <p className="text-center text-xs text-gray-400">
            Already have an account? <Link href="/login" className="font-medium text-brand-black underline underline-offset-2">Login</Link>
          </p>
        </div>
      </section>
    </>
  )

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Verify Phone</h1>
          <p className="mt-3 text-sm text-white/45">Enter the OTP sent to +91 {digits}</p>
        </div>
      </section>
      <section className="bg-white px-4 py-12 md:px-6">
        <div className="mx-auto max-w-sm flex flex-col gap-5">
          <div className="flex justify-center gap-3">
            {otp.map((d, i) => (
              <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1}
                value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                className="h-14 w-14 rounded-xl border border-gray-200 text-center text-xl font-bold text-brand-black outline-none focus:border-brand-black" />
            ))}
          </div>
          {error && <p className="text-center text-xs text-red-500">{error}</p>}
          <button onClick={handleVerify} disabled={loading}
            className="rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50">
            {loading ? 'Creating Account…' : 'Verify & Create Account'}
          </button>
          <button onClick={() => { setStep('details'); setOtp(['','','','']); setError('') }}
            className="text-center text-xs text-gray-400 underline underline-offset-2">
            Change number
          </button>
        </div>
      </section>
    </>
  )
}
