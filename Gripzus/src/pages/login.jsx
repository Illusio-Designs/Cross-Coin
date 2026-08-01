import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import { useAuth } from '../context/AuthContext';
import { toastLoginSuccess, toastLoginError } from '../utils/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

export default function LoginPage() {
  const { fetchUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [step, setStep]   = useState('phone');
  const [otp, setOtp]     = useState(['', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const digits  = phone.replace(/\D/g, '').slice(0, 10);
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Step 1 — send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    if (digits.length !== 10) { setError('Enter a valid 10-digit number.'); return; }

    if (isLocal) { setStep('otp'); return; }

    setLoading(true);
    try {
      const check = await fetch(`${API_URL}/api/users/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits }),
      });
      const checkData = await check.json();
      if (check.ok && checkData.exists === false) {
        setError('No account found with this number. Please register first.');
        setLoading(false);
        return;
      }
    } catch {
      // check endpoint unavailable — proceed anyway
    }
    setLoading(false);

    const identifier = '91' + digits;
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

  // Step 2 — verify OTP and log in
  const handleVerify = (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 4) { setError('Enter the full 4-digit code.'); return; }
    setLoading(true);
    setError('');

    if (isLocal) {
      if (code !== '1111') { setError('Dev mode: use OTP 1111.'); setLoading(false); return; }
      doLogin('dev-localhost-bypass');
      return;
    }

    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready.'); setLoading(false); return; }
    window.verifyOtp(
      code,
      (data) => {
        const token = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data));
        doLogin(token);
      },
      () => { setError('Invalid OTP. Try again.'); setLoading(false); }
    );
  };

  const doLogin = async (accessToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'USER_NOT_FOUND') throw new Error('No account found. Please register first.');
        throw new Error(data.message || 'Login failed');
      }
      if (!data.token) throw new Error('No token received.');

      localStorage.setItem('token', data.token);
      await fetchUser();
      toastLoginSuccess();
      window.location.replace('/account');
    } catch (err) {
      setError(err.message || 'Login failed');
      toastLoginError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Sign In — Gripzus</title></Head>
      <main className="bg-paper">

        {/* Hero — shared PageHero, consistent with the rest of the site */}
        <PageHero
          eyebrow="Account"
          title="Welcome"
          accent="back."
          intro={step === 'phone' ? 'Sign in with your phone number.' : `Enter the code sent to +91 ${digits}`}
        />

        {/* Form */}
        <section className="section-y">
          <div className="wrap">
           <div className="mx-auto w-full max-w-sm">
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
                <div>
                  <label className="eyebrow block mb-2">Phone number</label>
                  <div className="flex items-center gap-2 bg-paper-deep border border-line focus-within:border-ink px-4 transition-colors">
                    <span className="text-ink-muted text-sm">+91</span>
                    <input
                      type="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      className="flex-1 bg-transparent outline-none py-3.5 text-base text-ink placeholder:text-ink-muted"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading || digits.length !== 10} className="cta w-full justify-center !py-4 disabled:opacity-50">
                  {loading ? 'Please wait…' : 'Send OTP'}
                </button>
                <p className="text-center eyebrow">
                  New here?{' '}
                  <Link href="/register" className="text-clay-deep hover:text-ink underline underline-offset-4">Create an account</Link>
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
                      className="h-14 w-14 text-center bg-paper-deep border border-line focus:border-ink outline-none font-display font-bold text-2xl text-ink transition-colors"
                    />
                  ))}
                </div>
                {error && <p className="text-center text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading} className="cta w-full justify-center !py-4 disabled:opacity-50">
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setError(''); }}
                  className="text-center eyebrow hover:text-ink"
                >
                  ← Use a different number
                </button>
              </form>
            )}
           </div>
          </div>
        </section>
      </main>
    </>
  );
}
