import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import Msg91Loader from '../../components/common/Msg91Loader';
import { toast } from '../../components/test/ui';
import { checkPhone, loginOtp } from '../../components/test/auth';

export default function TestLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [otp, setOtp] = useState(['', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resend, setResend] = useState(0);
  const otpRefs = useRef([]);
  const pollRef = useRef(null);
  const digits = phone.replace(/\D/g, '');
  const OTP_LEN = 4;

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);
  useEffect(() => {
    if (resend <= 0) return;
    const t = setTimeout(() => setResend((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resend]);

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setOtp((prev) => { const n = [...prev]; n[i] = d; return n; });
    if (d && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
  };
  const onOtpKey = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); };
  const onOtpPaste = (e) => {
    const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LEN);
    if (!t) return; e.preventDefault();
    setOtp(Array.from({ length: OTP_LEN }, (_, i) => t[i] || ''));
    otpRefs.current[Math.min(t.length, OTP_LEN - 1)]?.focus();
  };

  const sendCode = async (e) => {
    e && e.preventDefault();
    setErr('');
    if (digits.length !== 10) { setErr('Enter a valid 10-digit mobile number'); return; }
    setBusy(true);
    const chk = await checkPhone(digits);
    if (chk.exists === false) { setErr('No account found with this number. Please register first.'); setBusy(false); return; }
    let attempts = 0;
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(
          digits,
          () => { setStep('otp'); setBusy(false); setResend(30); },
          (e2) => { setErr(typeof e2 === 'string' ? e2 : (e2?.message || 'Could not send code.')); setBusy(false); },
        );
      } else if (attempts < 12) { attempts += 1; pollRef.current = setTimeout(trySend, 500); }
      else { setErr('OTP service is still loading — please try again in a moment.'); setBusy(false); }
    };
    trySend();
  };

  const verify = (e) => {
    e && e.preventDefault();
    const code = otp.join('');
    if (code.length < OTP_LEN) { setErr('Enter the code you received'); return; }
    if (typeof window.verifyOtp !== 'function') { setErr('OTP service not ready — please refresh.'); return; }
    setErr(''); setBusy(true);
    window.verifyOtp(
      code,
      async (data) => {
        const accessToken = typeof data === 'string' ? data : (data?.message || data?.token || data?.accessToken || JSON.stringify(data));
        const res = await loginOtp({ phone: digits, access_token: accessToken });
        if (res.ok) { toast('Signed in ✓'); router.push('/test/account'); }
        else { setErr(res.message); setBusy(false); }
      },
      () => { setErr('Invalid code. Please try again.'); setBusy(false); },
    );
  };

  const resendCode = () => { if (resend <= 0) { setOtp(['', '', '', '']); sendCode(); } };

  return (
    <TestLayout>
      <Head><title>Sign in — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>
      <Msg91Loader />

      <div className="wrap" style={{ paddingBlock: '40px 70px' }}>
        <div className="authsplit">
          <div className="authsplit__brand">
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>CrossCoin</span>
            <h1>Welcome back</h1>
            <p>Sign in to track orders, save addresses and unlock member offers.</p>
            <div className="authsplit__stats">
              <div><b>50k</b><span>Happy feet</span></div>
              <div><b>4.8★</b><span>Rated</span></div>
              <div><b>7-Day</b><span>Returns</span></div>
            </div>
          </div>

          <div className="authsplit__form">
            {step === 'phone' ? (
              <form onSubmit={sendCode}>
                <h2>Sign in</h2>
                <p className="authsplit__d">We send a one-time code to your mobile.</p>
                <div className="ffield"><label>Mobile number</label>
                  <div className="phoneinput"><span className="phoneinput__cc">+91</span>
                    <input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98XXXXXXXX" autoFocus /></div>
                </div>
                {err && <div className="autherr mono">{err}</div>}
                <button className="btn btn--crimson btn--block btn--lg" type="submit" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Sending…' : 'Send code →'}</button>
                <div className="authsplit__alt">New to CrossCoin? <a onClick={() => router.push('/test/register')}>Create an account</a></div>
              </form>
            ) : (
              <form onSubmit={verify}>
                <h2>Enter code</h2>
                <p className="authsplit__d">We sent a 4-digit code to +91 {digits}. <button type="button" className="authlink" onClick={() => { setStep('phone'); setErr(''); }}>Change</button></p>
                <div className="ffield"><label>4-digit code</label>
                  <div className="otpboxes" onPaste={onOtpPaste}>
                    {otp.map((d, i) => (
                      <input key={i} ref={(el) => { otpRefs.current[i] = el; }} className="otpbox" inputMode="numeric" maxLength={1} value={d} autoFocus={i === 0} aria-label={`Digit ${i + 1}`} onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onOtpKey(i, e)} />
                    ))}
                  </div>
                </div>
                {err && <div className="autherr mono">{err}</div>}
                <button className="btn btn--crimson btn--block btn--lg" type="submit" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
                <div className="authsplit__alt">{resend > 0 ? `Resend code in ${resend}s` : <button type="button" className="authlink" onClick={resendCode}>Resend code</button>}</div>
              </form>
            )}
          </div>
        </div>
      </div>
    </TestLayout>
  );
}
