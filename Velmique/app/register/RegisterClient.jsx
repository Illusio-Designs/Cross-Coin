'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { setAuthToken } from '@/lib/authToken';
import { sendOtp, verifyOtp, safeNext } from '@/lib/otp';
import { toastRegisterSuccess, toastRegisterError, toastOtpSent, toastOtpError } from '@/lib/toast';
import OtpInput from '../_components/OtpInput';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

/* Phone + OTP registration with the DPDP 18+ / privacy-policy affirmation. */
export default function RegisterClient() {
  const sp = useSearchParams();
  const next = safeNext(sp.get('next'));
  const { fetchUser } = useAuth();
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ username: '', phone: (sp.get('phone') || '').replace(/\D/g, '').slice(0, 10), email: '' });
  const [ageOk, setAgeOk] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const digits = form.phone.replace(/\D/g, '').slice(0, 10);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value }));

  const requestOtp = async (e) => {
    e?.preventDefault();
    setError('');
    if (!form.username.trim()) { setError('Please enter your name.'); return; }
    if (!/^[6-9]\d{9}$/.test(digits)) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Please enter a valid email, or leave it empty.'); return; }
    if (!ageOk) { setError('Please confirm you are 18 or older.'); return; }
    // Record the age affirmation so marketing/analytics tags can suppress
    // tracking for anyone who did not confirm they are an adult (DPDP).
    try { localStorage.setItem('vlm-age-ok', '1'); } catch { /* storage blocked */ }
    setLoading(true);
    try {
      await sendOtp(digits);
      setStep('otp');
      toastOtpSent();
    } catch (err) {
      setError(err.message);
      toastOtpError(err.message);
    } finally { setLoading(false); }
  };

  const verify = async (code) => {
    const c = code || otp.join('');
    if (c.length < 4) { setError('Enter the full 4-digit code.'); return; }
    setLoading(true); setError('');
    try {
      const accessToken = await verifyOtp(c);
      // Register (an existing account for this phone simply signs in below).
      await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim() || `${digits}@phone.velmique.in`,
          phone: digits,
          age_confirmed: ageOk,
          password: Math.random().toString(36).slice(-12) + 'Vm1!',
        }),
      }).catch(() => {});
      const loginRes = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ phone: digits, access_token: accessToken }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) throw new Error(loginData.message || 'Registration failed');
      if (!loginData.token) throw new Error('No token received');
      setAuthToken(loginData.token);
      await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND, Authorization: `Bearer ${loginData.token}` },
        body: JSON.stringify({ username: form.username.trim() }),
      }).catch(() => {});
      await fetchUser();
      toastRegisterSuccess();
      window.location.replace(next);
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      toastRegisterError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">{step === 'details' ? 'Join the maison' : 'Verify your phone'}</span>
        <h1>{step === 'details' ? 'Create Your Account.' : 'Check Your Phone.'}</h1>
        <p>{step === 'details' ? 'Track orders, request returns and collect loyalty points.' : `Enter the 4-digit code sent to +91 ${digits}.`}</p>
      </section>
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <div className="m-authcard m-formcard">
          {step === 'details' ? (
            <form onSubmit={requestOtp} noValidate>
              <div className="m-field"><label className="m-label" htmlFor="reg-name">Full name</label><input id="reg-name" className="m-input" value={form.username} onChange={set('username')} autoComplete="name" placeholder="Priya Sharma" /></div>
              <div className="m-field">
                <label className="m-label" htmlFor="reg-phone">Mobile number</label>
                <div className="m-phone"><span>+91</span><input id="reg-phone" className="m-input" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={set('phone')} placeholder="10-digit number" /></div>
              </div>
              <div className="m-field"><label className="m-label" htmlFor="reg-email">Email (optional)</label><input id="reg-email" className="m-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@email.com" /></div>
              <label className="m-check">
                <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} />
                <span>I confirm I am 18 years of age or older and agree to the <Link className="m-textlink" href="/privacy-policy">Privacy Policy</Link>.</span>
              </label>
              {error ? <p className="m-formerr" role="alert">{error}</p> : null}
              <button type="submit" className="m-btn m-btn--fill m-btn--block" disabled={loading || !form.username.trim() || digits.length !== 10 || !ageOk}>{loading ? 'Sending…' : 'Send OTP'}</button>
              <p className="m-authcard__alt">Already have an account? <Link className="m-textlink" href="/login">Sign in</Link></p>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); verify(); }} noValidate>
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} />
              {error ? <p className="m-formerr" role="alert" style={{ textAlign: 'center' }}>{error}</p> : null}
              <button type="submit" className="m-btn m-btn--fill m-btn--block" disabled={loading}>{loading ? 'Creating account…' : 'Verify & create account'}</button>
              <div className="m-authcard__alt">
                <button type="button" className="m-linkbtn" onClick={() => { setStep('details'); setOtp(['', '', '', '']); setError(''); }}>Change details</button>
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
