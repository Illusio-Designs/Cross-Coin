'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, ArrowRight } from 'lucide-react'
import { loginWithOtp } from '@/lib/api/auth'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('phone')
  const [otp, setOtp] = useState(['', '', '', ''])
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const router = useRouter()
  const { isAuthenticated, checkAuth } = useAuth()

  useEffect(() => {
    if (isAuthenticated) router.replace('/account')
  }, [isAuthenticated, router])

  const digits = phone.replace(/\D/g, '').slice(0, 10)
  const identifier = digits.length === 10 ? '91' + digits : digits

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
        }, (err) => {
          setOtpSending(false)
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          setError(isLocalhost
            ? 'OTP does not work on localhost. Deploy to a real domain to test.'
            : 'Failed to send OTP. Try again.')
        })
      } else if (attempts < 20) {
        attempts++
        setTimeout(trySend, 300)
      } else {
        setOtpSending(false)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        setError(isLocalhost
          ? 'OTP does not work on localhost. Deploy to a real domain to test.'
          : 'OTP service not ready. Please refresh.')
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

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 4) { setError('Enter the full OTP'); return }
    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready. Please refresh.'); return }
    setLoading(true)
    setError('')

    window.verifyOtp(
      code,
      async (data) => {
        const accessToken = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data))
        try {
          await loginWithOtp({ phone: digits, access_token: accessToken })
          // Token is saved in localStorage by loginWithOtp
          // Force redirect immediately
          window.location.href = '/account'
        } catch (err) {
          setError(err.message || 'Login failed')
          setLoading(false)
        }
      },
      (err) => {
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
                onClick={handleVerify}
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
