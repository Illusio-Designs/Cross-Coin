'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Reveal } from '@/components/ui/Reveal'

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

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setError('')
    if (digits.length !== 10) { setError('Enter a valid 10-digit number'); return }

    if (isLocal) {
      setStep('otp')
      return
    }

    // Check if phone is registered before sending OTP
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
    } catch {
      // If check endpoint doesn't exist, proceed anyway
    }
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

  // Step 2: Verify OTP and login
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

  // Call backend login API
  const doLogin = async (accessToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'velquira' },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'USER_NOT_FOUND') {
          throw new Error('No account found. Please register first.')
        }
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
    <>
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
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
                    type="tel" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="flex-1 text-sm text-brand-black outline-none placeholder:text-gray-300"
                    onKeyDown={e => { if (e.key === 'Enter') handleSendOtp() }}
                  />
                </div>
              </div>
              {error && (
                <p className="text-xs text-red-500">
                  {error}
                  {error.includes('register') && (
                    <> <a href="/register" className="font-semibold underline">Register here</a></>
                  )}
                </p>
              )}
              <button onClick={handleSendOtp} disabled={digits.length !== 10}
                className="flex items-center justify-center gap-2 rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50">
                Send OTP <ArrowRight size={15} />
              </button>
              <p className="text-center text-xs text-gray-400">
                Don't have an account? <Link href="/register" className="font-medium text-brand-black underline underline-offset-2">Register</Link>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-center text-sm text-gray-500">
                Enter the OTP sent to <span className="font-semibold text-brand-black">+91 {digits}</span>
              </p>
              <div className="flex justify-center gap-3">
                {otp.map((d, i) => (
                  <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="h-14 w-14 rounded-xl border border-gray-200 text-center text-xl font-bold text-brand-black outline-none focus:border-brand-black"
                  />
                ))}
              </div>
              {error && <p className="text-center text-xs text-red-500">{error}</p>}
              <button onClick={handleVerify} disabled={loading}
                className="rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50">
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>
              <button onClick={() => { setStep('phone'); setOtp(['','','','']); setError('') }}
                className="text-center text-xs text-gray-400 underline underline-offset-2">
                Change number
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
