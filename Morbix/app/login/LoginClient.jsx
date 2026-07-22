'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import { checkPhone, sendOtp, verifyOtp, loginWithOtp } from '@/lib/api/auth';

export default function LoginClient() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '').slice(0, 10);

  const handleSendOtp = async () => {
    setError('');
    if (digits.length !== 10) { setError('Enter a valid 10-digit number.'); return; }
    setLoading(true);
    try {
      const check = await checkPhone(digits);
      if (check.ok && !check.exists) {
        setError('No account found with this number. Please register first.');
        setLoading(false);
        return;
      }
      await sendOtp({ phone: digits });
      setStep('otp');
    } catch (e) {
      setError(e.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val.length > 1) val = val.slice(-1);
    const next = [...otp];
    next[i] = val.replace(/\D/g, '');
    setOtp(next);
    if (val && i < 5) otpRefs[i + 1].current?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 4) { setError('Enter the OTP sent to your phone.'); return; }
    setLoading(true);
    setError('');
    try {
      const verified = await verifyOtp({ phone: digits, otp: code, access_token: code });
      // Prefer an access_token to complete the users/login exchange; if the
      // verify already returned a session token, we're signed in.
      if (!verified.token) {
        const accessToken = verified.access_token || verified.accessToken || code;
        await loginWithOtp({ phone: digits, access_token: accessToken });
      }
      await fetchUser();
      router.replace('/account');
    } catch (e) {
      setError(e.message || 'Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="auth-wrap">
        <div className="page-hero" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
          <span className="eyebrow">Account</span>
          <h1>Welcome back</h1>
          <p>Sign in with your phone number.</p>
        </div>

        <div className="contact-form auth-form">
          {step === 'phone' ? (
            <>
              <label>Phone number
                <div className="phone-input">
                  <span>+91</span>
                  <input type="tel" inputMode="numeric" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    placeholder="10-digit mobile" />
                </div>
              </label>
              {error && <p className="auth-error">{error}{error.includes('register') && <> <Link href="/register" style={{ fontWeight: 600, textDecoration: 'underline' }}>Register</Link></>}</p>}
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSendOtp} disabled={loading || digits.length !== 10}>
                {loading ? 'Sending…' : <>Send OTP <Icon name="ArrowRight" size={16} /></>}
              </button>
              <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
                New to Morbix? <Link href="/register" style={{ color: 'var(--navy)', fontWeight: 600 }}>Create an account</Link>
              </p>
            </>
          ) : (
            <>
              <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>
                Enter the OTP sent to <b style={{ color: 'var(--ink)' }}>+91 {digits}</b>
              </p>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKey(i, e)} />
                ))}
              </div>
              {error && <p className="auth-error" style={{ textAlign: 'center' }}>{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleVerify} disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button className="link-more" style={{ justifyContent: 'center' }} onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}>
                Change number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
