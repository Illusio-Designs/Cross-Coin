import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { toastRegisterSuccess, toastRegisterError } from '../utils/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

export default function RegisterPage() {
  const { fetchUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [step, setStep] = useState('details');
  const [otp, setOtp]   = useState(['', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const digits     = form.phone.replace(/\D/g, '').slice(0, 10);
  const identifier = '91' + digits;
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Step 1 — validate details and send OTP
  const handleSendOtp = (e) => {
    e?.preventDefault();
    setError('');
    if (!form.name.trim())    { setError('Please enter your name.'); return; }
    if (digits.length !== 10) { setError('Enter a valid 10-digit phone number.'); return; }

    if (isLocal) { setStep('otp'); return; }

    let attempts = 0;
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(identifier, () => setStep('otp'), () => setError('Failed to send OTP. Try again.'));
      } else if (attempts < 15) {
        attempts++;
        setTimeout(trySend, 400);
      } else {
        setError('OTP service not ready. Refresh the page.');
      }
    };
    trySend();
  };

  const handleOtpChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 3) otpRefs[i + 1].current?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  // Step 2 — verify OTP, register, then log in
  const handleVerify = (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 4) { setError('Enter the full 4-digit code.'); return; }
    setLoading(true);
    setError('');

    if (isLocal) {
      if (code !== '1111') { setError('Dev mode: use OTP 1111.'); setLoading(false); return; }
      doRegisterAndLogin('dev-localhost-bypass');
      return;
    }

    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready.'); setLoading(false); return; }
    window.verifyOtp(
      code,
      (data) => {
        const token = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data));
        doRegisterAndLogin(token);
      },
      () => { setError('Invalid OTP. Try again.'); setLoading(false); }
    );
  };

  const doRegisterAndLogin = async (accessToken) => {
    try {
      await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({
          username: form.name.trim(),
          email: form.email.trim() || `${digits}@phone.gripzus.in`,
          phone: digits,
          password: Math.random().toString(36).slice(-12) + 'Gz1!',
        }),
      }).catch(() => {});

      const loginRes = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.message || 'Login failed');
      if (!loginData.token) throw new Error('No token received.');

      localStorage.setItem('token', loginData.token);

      await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND, Authorization: `Bearer ${loginData.token}` },
        body: JSON.stringify({ username: form.name.trim() }),
      }).catch(() => {});

      await fetchUser();
      toastRegisterSuccess();
      window.location.replace('/account');
    } catch (err) {
      setError(err.message || 'Registration failed');
      toastRegisterError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create Account — Gripzus</title></Head>
      <main className="bg-paper">

        {/* Hero */}
        <section className="bg-ink text-center px-6 py-20 md:py-24">
          <span className="kicker kicker-light mb-5 justify-center inline-flex">Account · Register</span>
          <h1 className="h-mark text-paper text-5xl md:text-7xl mt-2">
            START THE CIRCLE.
          </h1>
          <p className="text-paper/55 text-sm mt-5 tracking-wide">
            {step === 'details' ? 'Register with your phone number — no password' : `Enter the code sent to +91 ${digits}`}
          </p>
        </section>

        {/* Form */}
        <section className="px-6 py-14 md:py-16">
          <div className="mx-auto w-full max-w-sm border-2 border-ink p-7 md:p-8">
            {step === 'details' ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
                <Field label="Full name" value={form.name} onChange={(v) => set('name', v)} placeholder="Anika Sharma" />
                <div>
                  <label className="eyebrow block mb-2">Phone number</label>
                  <div className="field flex items-center gap-2 !py-0">
                    <span className="text-ink-muted text-sm">+91</span>
                    <input
                      type="tel" value={form.phone}
                      onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      className="flex-1 bg-transparent outline-none py-3.5 text-base text-ink placeholder:text-ink-muted"
                    />
                  </div>
                </div>
                <Field label="Email (optional)" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="you@example.com" optional />
                {error && <p className="border-2 border-ink px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink">{error}</p>}
                <button type="submit" disabled={!form.name.trim() || digits.length !== 10} className="btn w-full justify-center !py-4 disabled:opacity-50">
                  Send OTP
                </button>
                <p className="text-center eyebrow">
                  Have an account?{' '}
                  <Link href="/login" className="text-ink font-bold hover:text-ink-soft underline underline-offset-4">Sign in</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="flex flex-col gap-5">
                <div className="flex justify-center gap-3">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="text" maxLength={1} inputMode="numeric" value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-14 w-14 text-center bg-paper border-2 border-line focus:border-ink outline-none font-display font-bold text-2xl text-ink transition-colors"
                    />
                  ))}
                </div>
                {error && <p className="border-2 border-ink px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-ink">{error}</p>}
                <button type="submit" disabled={loading} className="btn w-full justify-center !py-4 disabled:opacity-50">
                  {loading ? 'Creating account…' : 'Verify & Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('details'); setOtp(['', '', '', '']); setError(''); }}
                  className="text-center eyebrow hover:text-ink"
                >
                  ← Edit details
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', optional }) {
  return (
    <div>
      <label className="eyebrow block mb-2">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        required={!optional}
        className="field !text-base"
      />
    </div>
  );
}
