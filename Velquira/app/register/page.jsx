'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Reveal } from '@/components/ui/Reveal'

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
      const regRes = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'velquira' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim() || `${digits}@phone.velquira.in`,
          phone: digits,
          password: Math.random().toString(36).slice(-12) + 'Kw1!',
        }),
      })
      await regRes.json()

      const loginRes = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'velquira' },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) throw new Error(loginData.message || 'Login failed')
      if (!loginData.token) throw new Error('No token received')

      if (loginData.token) {
        localStorage.setItem('token', loginData.token)
        await fetch(`${API_URL}/api/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'velquira', 'Authorization': `Bearer ${loginData.token}` },
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
    <main className="bg-ivory">
      {/* Refined page header */}
      <section className="vq-container pt-36 pb-10 text-center">
        <Reveal>
          <span className="vq-diamond mx-auto block" aria-hidden />
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Account</p>
        </Reveal>
        <Reveal delay={0.16}>
          <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-brand-black md:text-5xl">
            Create Your Account
          </h1>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brand-black/55">
            A private space for your saved items, orders, and custom requests.
          </p>
        </Reveal>
        <Reveal delay={0.32}>
          <div className="mx-auto mt-6 h-px w-12 bg-gold vq-rule" />
        </Reveal>
      </section>

      {/* Form */}
      <section className="vq-container pb-24">
        <Reveal delay={0.1}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendOtp() }}
            className="mx-auto flex max-w-sm flex-col gap-7"
          >
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Full Name</label>
              <input
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="Your name"
                className="border-0 border-b border-line bg-transparent px-0 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Phone</label>
              <div className="flex items-center gap-3 border-b border-line focus-within:border-ink">
                <span className="text-sm text-brand-black/55">+91</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  className="flex-1 border-0 bg-transparent px-0 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Email <span className="ml-1 text-brand-black/40 normal-case tracking-normal">(optional)</span></label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@email.com"
                className="border-0 border-b border-line bg-transparent px-0 py-2.5 text-sm text-brand-black placeholder:text-brand-black/30 focus:border-ink focus:outline-none"
              />
            </div>

            {error && <p className="text-xs italic text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={!form.username.trim() || digits.length !== 10}
              className="vq-lift mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#3a3227] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send Verification <ArrowRight size={13} strokeWidth={1.6} />
            </button>

            <p className="text-center text-[11px] tracking-wide text-brand-black/55">
              Already have an account?{' '}
              <Link href="/login" className="font-medium uppercase tracking-[0.2em] text-gold underline-offset-4 hover:text-gold-deep">
                Sign In
              </Link>
            </p>
          </form>
        </Reveal>
      </section>
    </main>
  )

  return (
    <main className="bg-ivory">
      {/* Refined page header */}
      <section className="vq-container pt-36 pb-10 text-center">
        <Reveal>
          <span className="vq-diamond mx-auto block" aria-hidden />
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-gold">One Last Step</p>
        </Reveal>
        <Reveal delay={0.16}>
          <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-brand-black md:text-5xl">
            Verify Your Phone
          </h1>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brand-black/55">
            We sent a four-digit code to +91 {digits}.
          </p>
        </Reveal>
        <Reveal delay={0.32}>
          <div className="mx-auto mt-6 h-px w-12 bg-gold vq-rule" />
        </Reveal>
      </section>

      <section className="vq-container pb-24">
        <Reveal delay={0.1}>
          <div className="mx-auto flex max-w-sm flex-col gap-7">
            <div className="flex justify-center gap-4">
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
                  className="h-14 w-12 border-0 border-b border-line bg-transparent text-center font-display text-2xl text-brand-black focus:border-ink focus:outline-none"
                />
              ))}
            </div>

            {error && <p className="text-center text-xs italic text-red-500">{error}</p>}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="vq-lift inline-flex items-center justify-center rounded-full bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#3a3227] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating Account…' : 'Verify & Create Account'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('details'); setOtp(['','','','']); setError('') }}
              className="text-center text-[10px] uppercase tracking-[0.3em] text-brand-black/55 underline-offset-4 hover:text-gold"
            >
              Change number
            </button>
          </div>
        </Reveal>
      </section>
    </main>
  )
}