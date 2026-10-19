'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { setAuthToken } from '@/lib/authToken';
import { sendOtp, verifyOtp, safeNext } from '@/lib/otp';
import { toastLoginSuccess, toastLoginError, toastOtpSent, toastOtpError } from '@/lib/toast';
import OtpInput from '../_components/OtpInput';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

/* Phone + OTP sign-in (there are no passwords, so no "forgot password"). The
   number is checked first so an unregistered phone is sent to Register before
   any OTP goes out. */
export default function LoginClient() {
  const next = safeNext(useSearchParams().get('next'));
  const { fetchUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const digits = phone.replace(/\D/g, '').slice(0, 10);

  const requestOtp = async (e) => {
    e?.preventDefault();
    setError(''); setNotFound(false);
    if (!/^[6-9]\d{9}$/.test(digits)) { setError('Enter a valid 10-digit mobile number.'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/users/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.exists) { setNotFound(true); setError('No account found with this number.'); return; }
      await sendOtp(digits);
      setStep('otp');
      toastOtpSent();
    } catch (err) {
      const msg = err.message?.includes('fetch') ? 'Could not verify your number. Please try again.' : (err.message || 'Could not send the OTP.');
      setError(msg);
      toastOtpError(msg);
    } finally { setLoading(false); }
  };

  const verify = async (code) => {
    const c = code || otp.join('');
    if (c.length < 4) { setError('Enter the full 4-digit code.'); return; }
    setLoading(true); setError('');
    try {
      const accessToken = await verifyOtp(c);
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Login failed. Please try again.');
      if (!data.token) throw new Error('No token received');
      setAuthToken(data.token);
      await fetchUser();
      toastLoginSuccess();
      window.location.replace(next);
    } catch (err) {
      const msg = err.message || 'Login failed. Please try again.';
      setError(msg);
      toastLoginError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Your account</span>
        <h1>{step === 'phone' ? 'Welcome Back.' : 'Check Your Phone.'}</h1>
        <p>{step === 'phone' ? 'Sign in with your mobile number — we’ll text you a one-time code.' : `Enter the 4-digit code sent to +91 ${digits}.`}</p>
      </section>
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <div className="m-authcard m-formcard">
          {step === 'phone' ? (
            <form onSubmit={requestOtp} noValidate>
              <div className="m-field">
                <label className="m-label" htmlFor="login-phone">Mobile number</label>
                <div className="m-phone">
                  <span>+91</span>
                  <input id="login-phone" className="m-input" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" aria-invalid={!!error} />
                </div>
              </div>
              {error ? (
                <p className="m-formerr" role="alert">{error}{notFound ? <> <Link className="m-textlink" href={`/register?phone=${digits}`}>Create an account</Link></> : null}</p>
              ) : null}
              <button type="submit" className="m-btn m-btn--fill m-btn--block" disabled={digits.length !== 10 || loading}>{loading ? 'Checking…' : 'Send OTP'}</button>
              <p className="m-authcard__alt">New to Velmique? <Link className="m-textlink" href="/register">Create an account</Link></p>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); verify(); }} noValidate>
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} />
              {error ? <p className="m-formerr" role="alert" style={{ textAlign: 'center' }}>{error}</p> : null}
              <button type="submit" className="m-btn m-btn--fill m-btn--block" disabled={loading}>{loading ? 'Verifying…' : 'Verify & sign in'}</button>
              <div className="m-authcard__alt">
                <button type="button" className="m-linkbtn" onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setError(''); }}>Change number</button>
                <span aria-hidden="true"> · </span>
                <button type="button" className="m-linkbtn" disabled={loading} onClick={() => { setOtp(['', '', '', '']); requestOtp(); }}>Resend code</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
