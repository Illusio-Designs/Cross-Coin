'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { toastLoginSuccess, toastLoginError, toastOtpSent, toastOtpError } from '@/lib/toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique'

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

  // Step 1 — send OTP
  // Always run check-phone FIRST (even on localhost) so "register first"
  // is shown BEFORE OTP is sent, never after.
  const handleSendOtp = async () => {
    setError('')
    if (digits.length !== 10) { setError('Enter a valid 10-digit number'); return }

    setLoading(true)
    try {
      const check = await fetch(`${API_URL}/api/users/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits }),
      })
      const checkData = await check.json().catch(() => ({}))
      if (!check.ok || !checkData.exists) {
        setError('No account found with this number. Please register first.')
        setLoading(false)
        return
      }
    } catch {
      setError('Could not verify your number. Please try again.')
      setLoading(false)
      return
    }
    setLoading(false)

    // Phone is registered — proceed to OTP step.
    if (isLocal) {
      setStep('otp')
      toastOtpSent()
      return
    }

    const identifier = '91' + digits
    let attempts = 0
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(
          identifier,
          () => { setStep('otp'); toastOtpSent() },
          () => { setError('Failed to send OTP.'); toastOtpError('Failed to send OTP.') }
        )
        // Belt-and-braces: MSG91's success callback is occasionally
        // not invoked even when the SMS is actually dispatched, so we
        // also flip the step + toast here. The verify call will fail
        // cleanly if the OTP wasn't really sent.
        setTimeout(() => {
          setStep(prev => {
            if (prev === 'phone') {
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

  // Step 2 — verify OTP
  const handleVerify = () => {
    const code = otp.join('')
    if (code.length < 4) { setError('Enter the full OTP'); return }
    setLoading(true); setError('')

    if (isLocal) {
      if (code !== '1111') { setError('Dev mode: use OTP 1111'); setLoading(false); return }
      doLogin('dev-localhost-bypass'); return
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
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        // We already verified the phone exists at the check-phone step,
        // so a USER_NOT_FOUND here is an edge case (race condition / db purge).
        // Don't push the user to /register — surface a generic login error.
        throw new Error(data.message || 'Login failed. Please try again.')
      }
      if (!data.token) throw new Error('No token received')

      localStorage.setItem('token', data.token)
      await fetchUser()
      toastLoginSuccess()
      window.location.replace('/account')
    } catch (err) {
      const msg = err.message || 'Login failed. Please try again.'
      setError(msg)
      toastLoginError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="bg-[var(--bg)] min-h-screen">

      {/* Hero band */}
      <section className="relative overflow-hidden bg-[var(--ink)] px-6 md:px-12 lg:px-20 pt-32 pb-16 md:pt-40 md:pb-20 text-center">
        <p className="text-[var(--gold)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">
          Account
        </p>
        <h1 className="font-display text-white uppercase leading-[0.92] tracking-[-0.02em] mx-auto max-w-3xl"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.4rem)' }}>
          Welcome <em className="not-italic gold-text">Back</em>
        </h1>
        <p className="mt-5 text-white/60 text-sm md:text-base font-body">
          Sign in with your phone number
        </p>
      </section>

      {/* Form card */}
      <section className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-md mx-auto bg-white border border-[var(--border)] rounded-2xl p-8 md:p-10">
          {step === 'phone' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-[0.35em] uppercase font-body text-[var(--ink-muted)]">
                  Phone Number
                </label>
                <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3.5 focus-within:border-[var(--gold)] transition-colors">
                  <span className="text-sm text-[var(--ink-muted)] font-body">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] font-body"
                    onKeyDown={e => { if (e.key === 'Enter') handleSendOtp() }}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-body">
                  {error}
                  {error.includes('register') && (
                    <> <Link href="/register" className="font-semibold underline">Register here</Link></>
                  )}
                </p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={digits.length !== 10 || loading}
                className="flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] hover:bg-[var(--gold)] hover:text-[var(--ink)] text-white py-3.5 text-[11px] tracking-[0.3em] uppercase font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Checking…' : 'Send OTP'}
                {!loading && <ArrowRight size={14} strokeWidth={1.6} />}
              </button>

              <p className="text-center text-xs text-[var(--ink-muted)] font-body">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-[var(--gold-deep)] underline underline-offset-2 hover:text-[var(--ink)] transition-colors">
                  Register
                </Link>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-center text-sm text-[var(--ink-soft)] font-body">
                Enter the OTP sent to <span className="font-serif italic text-[var(--ink)]">+91 {digits}</span>
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
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>

              <button
                onClick={() => { setStep('phone'); setOtp(['','','','']); setError('') }}
                className="text-center text-xs text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)] transition-colors font-body"
              >
                Change number
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
