'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { toastRegisterSuccess, toastRegisterError, toastOtpSent, toastOtpError } from '@/lib/toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique'

export default function RegisterPage() {
  const [step, setStep] = useState('details')
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

  const handleSendOtp = () => {
    setError('')
    if (!form.username.trim()) { setError('Please enter your name'); return }
    if (digits.length !== 10) { setError('Enter a valid 10-digit phone number'); return }

    if (isLocal) {
      setStep('otp')
      toastOtpSent()
      return
    }

    let attempts = 0
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(
          identifier,
          () => { setStep('otp'); toastOtpSent() },
          () => { setError('Failed to send OTP. Try again.'); toastOtpError('Failed to send OTP. Try again.') }
        )
        // Belt-and-braces: MSG91's success callback occasionally
        // doesn't run even when the SMS is actually dispatched.
        setTimeout(() => {
          setStep(prev => {
            if (prev === 'details') {
              toastOtpSent()
              return 'otp'
            }
            return prev
          })
        }, 1500)
      } else if (attempts < 15) {
        attempts++
        setTimeout(trySend, 400)
      } else {
        setError('OTP service not ready. Refresh the page.')
        toastOtpError('OTP service not ready. Refresh the page.')
      }
    }
    trySend()
  }

  const handleOtpChange = (i, val) => {
    if (val.length > 1) val = val.slice(-1)
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 3) otpRefs[i + 1].current?.focus()
  }
  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus()
  }

  const handleVerify = () => {
    const code = otp.join('')
    if (code.length < 4) { setError('Enter the full OTP'); return }
    setLoading(true); setError('')

    if (isLocal) {
      if (code !== '1111') { setError('Dev mode: use OTP 1111'); setLoading(false); return }
      doRegisterAndLogin('dev-localhost-bypass'); return
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

  const doRegisterAndLogin = async (accessToken) => {
    try {
      // Register (silently ignore email-exists — they may be re-registering)
      await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim() || `${digits}@phone.velmique.in`,
          phone: digits,
          password: Math.random().toString(36).slice(-12) + 'Vm1!',
        }),
      }).catch(() => {})

      // Login with phone OTP
      const loginRes = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) throw new Error(loginData.message || 'Login failed')
      if (!loginData.token) throw new Error('No token received')

      localStorage.setItem('token', loginData.token)

      // Update profile name
      await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND, 'Authorization': `Bearer ${loginData.token}` },
        body: JSON.stringify({ username: form.username.trim() }),
      }).catch(() => {})

      await fetchUser()
      toastRegisterSuccess()
      window.location.replace('/account')
    } catch (err) {
      const msg = err.message || 'Registration failed'
      setError(msg)
      toastRegisterError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="bg-[var(--bg)] min-h-screen">

      {/* Hero band */}
      <section className="relative overflow-hidden bg-[var(--ink)] px-6 md:px-12 lg:px-20 pt-32 pb-16 md:pt-40 md:pb-20 text-center">
        <p className="text-[var(--gold)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">
          {step === 'details' ? 'Join The Maison' : 'Verify Phone'}
        </p>
        <h1 className="font-display text-white uppercase leading-[0.92] tracking-[-0.02em] mx-auto max-w-3xl"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.4rem)' }}>
          {step === 'details' ? <>Create <em className="not-italic gold-text">Account</em></> : <>Enter <em className="not-italic gold-text">OTP</em></>}
        </h1>
        <p className="mt-5 text-white/60 text-sm md:text-base font-body">
          {step === 'details' ? 'Register with your phone number' : `Sent to +91 ${digits}`}
        </p>
      </section>

      <section className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-md mx-auto bg-white border border-[var(--border)] rounded-2xl p-8 md:p-10">

          {step === 'details' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-[0.35em] uppercase font-body text-[var(--ink-muted)]">
                  Full Name
                </label>
                <input
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  placeholder="Priya Sharma"
                  className="rounded-full border border-[var(--border)] bg-transparent px-5 py-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none focus:border-[var(--gold)] transition-colors font-body"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-[0.35em] uppercase font-body text-[var(--ink-muted)]">
                  Phone Number
                </label>
                <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3.5 focus-within:border-[var(--gold)] transition-colors">
                  <span className="text-sm text-[var(--ink-muted)] font-body">+91</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] font-body"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-[0.35em] uppercase font-body text-[var(--ink-muted)]">
                  Email <span className="normal-case tracking-normal text-[var(--ink-muted)]">(optional)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@email.com"
                  className="rounded-full border border-[var(--border)] bg-transparent px-5 py-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none focus:border-[var(--gold)] transition-colors font-body"
                />
              </div>

              {error && <p className="text-xs text-red-500 font-body">{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={!form.username.trim() || digits.length !== 10}
                className="flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] hover:bg-[var(--gold)] hover:text-[var(--ink)] text-white py-3.5 text-[11px] tracking-[0.3em] uppercase font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send OTP <ArrowRight size={14} strokeWidth={1.6} />
              </button>

              <p className="text-center text-xs text-[var(--ink-muted)] font-body">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--gold-deep)] underline underline-offset-2 hover:text-[var(--ink)] transition-colors">
                  Login
                </Link>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex justify-center gap-3">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="h-14 w-14 rounded-xl border border-[var(--border)] text-center text-xl font-display text-[var(--ink)] outline-none focus:border-[var(--gold)] transition-colors"
                  />
                ))}
              </div>

              {error && <p className="text-center text-xs text-red-500 font-body">{error}</p>}

              <button
                onClick={handleVerify}
                disabled={loading}
                className="rounded-full bg-[var(--ink)] hover:bg-[var(--gold)] hover:text-[var(--ink)] text-white py-3.5 text-[11px] tracking-[0.3em] uppercase font-body font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Account…' : 'Verify & Create Account'}
              </button>

              <button
                onClick={() => { setStep('details'); setOtp(['','','','']); setError('') }}
                className="text-center text-xs text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)] transition-colors font-body"
              >
                Change details
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
