'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import { checkPhone, loginWithOtp } from '@/lib/api/auth';
import { toast } from '@/lib/toast';

// Phone + OTP login using the shared MSG91 widget (window.sendOtp /
// window.verifyOtp), exactly like Knitwink / Crosscoin / Gripzus. The widget's
// verified access_token is exchanged at /api/users/login for our JWT.
export default function LoginClient() {
  const { fetchUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '').slice(0, 10);
  // ⚠️ TEMPORARY test mode: shows the OTP boxes and lets OTP "1111" sign in
  // WITHOUT MSG91, until the Morbix domain is whitelisted in the MSG91 widget.
  // SECURITY: set this to false (or delete it) before real launch — while true,
  // anyone can sign in with 1111. Flip to real OTP by removing OTP_TEST_MODE.
  const OTP_TEST_MODE = true;
  const isLocal = OTP_TEST_MODE || process.env.NODE_ENV !== 'production';

  // Step 1 — send OTP via the MSG91 widget.
  const handleSendOtp = async () => {
    setError('');
    if (digits.length !== 10) { setError('Enter a valid 10-digit number.'); return; }
    if (isLocal) { setStep('otp'); toast.info('Enter OTP 1111 to continue'); return; }

    setLoading(true);
    try {
      const check = await checkPhone(digits);
      if (check.ok && !check.exists) {
        setError('No account found with this number. Please register first.');
        setLoading(false);
        return;
      }
    } catch { /* if check endpoint is unavailable, continue */ }
    setLoading(false);

    const identifier = '91' + digits;
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
    val = val.replace(/\D/g, '');
    if (val.length > 1) val = val.slice(-1);
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 3) otpRefs[i + 1].current?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  // Step 2 — verify OTP via the widget, then log in with the access_token.
  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < 4) { setError('Enter the full OTP.'); return; }
    setLoading(true);
    setError('');

    if (isLocal) {
      if (code !== '1111') { setError('Dev mode: use OTP 1111.'); setLoading(false); return; }
      doLogin('dev-localhost-bypass');
      return;
    }
    if (typeof window.verifyOtp !== 'function') { setError('OTP service not ready. Please refresh.'); setLoading(false); return; }
    window.verifyOtp(
      code,
      (data) => {
        const token = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data));
        doLogin(token);
      },
      () => { setError('Invalid OTP. Please try again.'); setLoading(false); }
    );
  };

  const doLogin = async (accessToken) => {
    try {
      await loginWithOtp({ phone: digits, access_token: accessToken });
      await fetchUser();
      window.location.replace('/account');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      toast.error(err.message || 'Login failed. Please try again.');
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
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    placeholder="10-digit mobile" />
                </div>
              </label>
              {error && <p className="auth-error">{error}{error.includes('register') && <> <Link href="/register" style={{ fontWeight: 600, textDecoration: 'underline' }}>Register</Link></>}</p>}
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSendOtp} disabled={loading || digits.length !== 10}>
                {loading ? 'Please wait…' : <>Send OTP <Icon name="ArrowRight" size={16} /></>}
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
              <button className="link-more" style={{ width: '100%', justifyContent: 'center', textAlign: 'center', marginTop: 4 }} onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setError(''); }}>
                Change number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
