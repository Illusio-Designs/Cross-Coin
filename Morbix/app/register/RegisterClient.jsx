'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import { API_URL, BRAND } from '@/lib/api/client';
import { loginWithOtp } from '@/lib/api/auth';
import { toast } from '@/lib/toast';

// Phone-OTP registration (no password), identical flow to the other brands:
// name + phone (+ optional email) -> MSG91 OTP -> create the account -> log in.
export default function RegisterClient() {
  const { fetchUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [step, setStep] = useState('details');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const digits = form.phone.replace(/\D/g, '').slice(0, 10);
  const identifier = '91' + digits;
  // ⚠️ TEMPORARY test mode: OTP boxes always show and "1111" creates the
  // account without MSG91, until the Morbix domain is whitelisted in MSG91.
  // SECURITY: set to false before real launch (while true anyone can register
  // with 1111).
  const OTP_TEST_MODE = true;
  const isLocal = OTP_TEST_MODE || process.env.NODE_ENV !== 'production';

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSendOtp = (e) => {
    e?.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (digits.length !== 10) { setError('Enter a valid 10-digit phone number.'); return; }
    if (isLocal) { setStep('otp'); toast.info('Enter OTP 1111 to continue'); return; }

    let attempts = 0;
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(identifier, () => { setStep('otp'); toast.info(`OTP sent to +91 ${digits}`); }, (err) => {
          console.error('MSG91 sendOtp failed:', err);
          const msg = typeof err === 'string' ? err : (err?.message || err?.type);
          setError(msg ? `Couldn’t send OTP: ${msg}` : 'Failed to send OTP. Please try again.');
        });
      } else if (attempts < 15) {
        attempts++;
        setTimeout(trySend, 400);
      } else {
        setError('OTP service is still loading — please try again in a moment.');
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
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

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
    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready. Please refresh.'); setLoading(false); return; }
    window.verifyOtp(
      code,
      (data) => {
        const token = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data));
        doRegisterAndLogin(token);
      },
      () => { setError('Invalid OTP. Please try again.'); setLoading(false); }
    );
  };

  const doRegisterAndLogin = async (accessToken) => {
    try {
      // Create the account (phone-verified; password is a throwaway the user
      // never uses — login is OTP-based). Same shape as the other brands.
      await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({
          username: form.name.trim(),
          email: form.email.trim() || `${digits}@phone.morbixsocks.com`,
          phone: digits,
          password: Math.random().toString(36).slice(-12) + 'Mx1!',
          role: 'consumer',
        }),
      }).catch(() => {});

      await loginWithOtp({ phone: digits, access_token: accessToken });
      await fetchUser();
      window.location.replace('/account');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      toast.error(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="auth-wrap">
        <div className="page-hero" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
          <span className="eyebrow">Account</span>
          <h1>Create your account</h1>
          <p>{step === 'details' ? 'Register with your phone number — no password.' : `Enter the code sent to +91 ${digits}`}</p>
        </div>

        <div className="contact-form auth-form">
          {step === 'details' ? (
            <form onSubmit={handleSendOtp}>
              <label>Full name
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" autoComplete="name" required />
              </label>
              <label>Phone number
                <div className="phone-input">
                  <span>+91</span>
                  <input type="tel" inputMode="numeric" value={form.phone}
                    onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(-10))}
                    placeholder="10-digit mobile" />
                </div>
              </label>
              <label>Email (optional)
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" autoComplete="email" />
              </label>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!form.name.trim() || digits.length !== 10}>
                Send OTP <Icon name="ArrowRight" size={16} />
              </button>
              <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
                Already have an account? <Link href="/login" style={{ color: 'var(--navy)', fontWeight: 600 }}>Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKey(i, e)} />
                ))}
              </div>
              {error && <p className="auth-error" style={{ textAlign: 'center' }}>{error}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Creating account…' : 'Verify & create account'}
              </button>
              <button type="button" className="link-more" style={{ justifyContent: 'center' }}
                onClick={() => { setStep('details'); setOtp(['', '', '', '']); setError(''); }}>
                ← Edit details
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
