'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('phone')
  const [otp, setOtp] = useState(['', '', '', ''])
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) router.replace('/account')
  }, [isAuthenticated, router])

  const digits = phone.replace(/\D/g, '').slice(0, 10)
  const identifier = digits.length === 10 ? '91' + digits : digits

  // Send OTP
  const handleSendOtp = () => {
    setError('')
    if (digits.length !== 10) { setError('Enter a valid 10-digit number'); return }
    setOtpSending(true)

    let attempts = 0
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(identifier, () => {
          setOtpSending(false)
          setStep('otp')
          setTimeout(() => otpRefs[0].current?.focus(), 100)
        }, () => {
          setOtpSending(false)
          setError('Failed to send OTP. Try again.')
        })
      } else if (attempts < 15) {
        attempts++
        setTimeout(trySend, 400)
      } else {
        setOtpSending(false)
        setError('OTP service not ready. Please refresh the page.')
      }
    }
    trySend()
  }

  // OTP input handlers
  const handleOtpChange = (i, val) => {
    if (val.length > 1) val = val.slice(-1)
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 3) otpRefs[i + 1].current?.focus()
    // Auto-verify when all 4 digits entered
    if (val && i === 3 && next.every(d => d)) {
      setTimeout(() => handleVerify(next.join('')), 100)
    }
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus()
  }

  // Verify OTP and login
  const handleVerify = async (code) => {
    const otpCode = code || otp.join('')
    if (otpCode.length < 4) { setError('Enter the full OTP'); return }
    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready.'); return }
    setLoading(true)
    setError('')

    window.verifyOtp(
      otpCode,
      async (data) => {
        const accessToken = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data))
        try {
          const res = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'knitwink' },
            body: JSON.stringify({ phone: digits, access_token: accessToken }),
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.message || 'Login failed')
          if (result.token) {
            localStorage.setItem('token', result.token)
            // Full page reload to re-init auth context with new token
            window.location.href = '/account'
          } else {
            setError('No token received. Try again.')
            setLoading(false)
          }
        } catch (err) {
          setError(err.message || 'Login failed')
          setLoading(false)
        }
      },
      () => {
        setError('Invalid OTP. Try again.')
        setLoading(false)
      }
    )
  }

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-6 py-16 text-center md:px-10 md:py-20">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Welcome Back</h1>
          <p className="mt-3 text-sm text-white/45">Sign in with your phone number</p>
        </div>
      </section>

      <section className="bg-white px-4 py-12 md:px-6">
        <div className="mx-auto max-w-sm">
          {step === 'phone' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-brand-black">Phone Number</label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
                  <span className="text-sm text-gray-400">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="flex-1 text-sm text-brand-black outline-none placeholder:text-gray-300"
                    maxLength={10}
                    onKeyDown={e => { if (e.key === 'Enter' && digits.length === 10) handleSendOtp() }}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={otpSending || digits.length !== 10}
                className="flex items-center justify-center gap-2 rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {otpSending ? 'Sending OTP…' : 'Send OTP'}
                <ArrowRight size={15} />
              </button>

              <p className="text-center text-xs text-gray-400">
                Don't have an account?{' '}
                <Link href="/register" className="font-medium text-brand-black underline underline-offset-2">Register</Link>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-center text-sm text-gray-500">
                Enter the OTP sent to <span className="font-semibold text-brand-black">+91 {digits}</span>
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
                    className="h-14 w-14 rounded-xl border border-gray-200 text-center text-xl font-bold text-brand-black outline-none focus:border-brand-black"
                  />
                ))}
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <button
                onClick={() => handleVerify()}
                disabled={loading}
                className="rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>

              <button onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setError('') }}
                className="text-center text-xs text-gray-400 underline underline-offset-2"
              >
                Change number
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
