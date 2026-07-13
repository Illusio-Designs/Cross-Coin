'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHero } from '@/components/layout/PageHero'
import { VelquiraLogo } from '@/components/brand/VelquiraLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('phone')
  const [otp, setOtp] = useState(['', '', '', ''])
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { fetchUser } = useAuth()

  const digits = phone.replace(/\D/g, '').slice(0, 10)
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const handleSendOtp = async () => {
    setError('')
    if (digits.length !== 10) { setError('Enter a valid 10-digit number'); return }

    if (isLocal) {
      setStep('otp')
      return
    }

    setLoading(true)
    try {
      const check = await fetch(`${API_URL}/api/users/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'velquira' },
        body: JSON.stringify({ phone: digits }),
      })
      const checkData = await check.json()
      if (!check.ok || !checkData.exists) {
        setError('No account found with this number. Please register first.')
        setLoading(false)
        return
      }
    } catch { /* proceed */ }
    setLoading(false)

    const identifier = '91' + digits
    let attempts = 0
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(identifier, () => setStep('otp'), () => setError('Failed to send OTP.'))
      } else if (attempts < 15) {
        attempts++
        setTimeout(trySend, 400)
      } else {
        setError('OTP service not ready. Refresh the page.')
      }
    }
    trySend()
  }

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

  const handleVerify = () => {
    const code = otp.join('')
    if (code.length < 4) { setError('Enter the full OTP'); return }
    setLoading(true)
    setError('')

    if (isLocal) {
      if (code !== '1111') { setError('Dev mode: use OTP 1111'); setLoading(false); return }
      doLogin('dev-localhost-bypass')
      return
    }

    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready.'); setLoading(false); return }
    window.verifyOtp(code,
      (data) => {
        const token = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data))
        doLogin(token)
      },
      () => { setError('Invalid OTP.'); setLoading(false) }
    )
  }

  const doLogin = async (accessToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'velquira' },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'USER_NOT_FOUND') throw new Error('No account found. Please register first.')
        throw new Error(data.message || 'Login failed')
      }
      if (!data.token) throw new Error('No token received')
      localStorage.setItem('token', data.token)
      await fetchUser()
      window.location.replace('/account')
    } catch (err) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Visual panel */}
      <div className="relative hidden min-h-full bg-brand-black lg:block">
        <Image
          src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200"
          alt=""
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <VelquiraLogo size="md" variant="light" />
          <div>
            <p className="vq-display text-4xl text-white">Welcome back.</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              Sign in to view orders, manage your wishlist, and access account services.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-ivory vq-lattice">
        <PageHero
          variant="minimal"
          align="left"
          className="lg:hidden"
          eyebrow="Account"
          title="Welcome Back"
          description="Sign in with your phone number"
        />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 lg:px-12">
          <div className="mb-10 hidden lg:block">
            <VelquiraLogo size="sm" />
            <h1 className="vq-display mt-6 text-3xl text-brand-black">Sign In</h1>
            <p className="mt-2 text-sm text-brand-black/55">Your account awaits.</p>
          </div>

          {step === 'phone' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Phone</label>
                <div className="flex items-center gap-2 border-b border-line bg-transparent py-3 focus-within:border-ink">
                  <span className="text-sm text-brand-black/40">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    className="flex-1 bg-transparent text-sm text-brand-black outline-none placeholder:text-brand-black/30"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp() }}
                  />
                </div>
              </div>
              {error && (
                <p className="text-xs text-error">
                  {error}
                  {error.includes('register') && (
                    <> <Link href="/register" className="font-semibold underline">Register</Link></>
                  )}
                </p>
              )}
              <button
                onClick={handleSendOtp}
                disabled={digits.length !== 10}
                className="flex items-center justify-center gap-2 rounded-full bg-ink py-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#3a3227] disabled:opacity-40"
              >
                Send OTP <ArrowRight size={14} />
              </button>
              <p className="text-center text-xs text-brand-black/45">
                New here? <Link href="/register" className="text-gold hover:underline">Create account</Link>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-brand-black/55">
                OTP sent to <span className="font-medium text-brand-black">+91 {digits}</span>
              </p>
              <div className="flex justify-center gap-3">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-14 w-14 border border-line bg-cream text-center text-xl font-display text-brand-black outline-none focus:border-ink"
                  />
                ))}
              </div>
              {error && <p className="text-center text-xs text-error">{error}</p>}
              <button
                onClick={handleVerify}
                disabled={loading}
                className="rounded-full bg-ink py-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#3a3227] disabled:opacity-40"
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setError('') }}
                className="text-center text-xs text-brand-black/45 underline"
              >
                Change number
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
