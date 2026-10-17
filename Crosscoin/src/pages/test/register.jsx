import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import Msg91Loader from '../../components/common/Msg91Loader';
import { toast } from '../../components/test/ui';
import { registerOtp } from '../../components/test/auth';

export default function TestRegister() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', age: false });
  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [otp, setOtp] = useState(['', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const otpRefs = useRef([]);
  const pollRef = useRef(null);
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const digits = form.phone.replace(/\D/g, '');

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setOtp((prev) => { const n = [...prev]; n[i] = d; return n; });
    if (d && i < 3) otpRefs.current[i + 1]?.focus();
  };
  const onOtpKey = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); };
  const onOtpPaste = (e) => {
    const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!t) return; e.preventDefault();
    setOtp(Array.from({ length: 4 }, (_, i) => t[i] || ''));
    otpRefs.current[Math.min(t.length, 3)]?.focus();
  };

  const sendCode = (e) => {
    e && e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('Please enter your name'); return; }
    if (digits.length !== 10) { setErr('Enter a valid 10-digit mobile number'); return; }
    if (!form.age) { setErr('Please confirm you are 18 or older'); return; }
    setBusy(true);
    let attempts = 0;
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(digits, () => { setStep('otp'); setBusy(false); }, (e2) => { setErr(typeof e2 === 'string' ? e2 : (e2?.message || 'Could not send code.')); setBusy(false); });
      } else if (attempts < 12) { attempts += 1; pollRef.current = setTimeout(trySend, 500); }
      else { setErr('OTP service is still loading — please try again in a moment.'); setBusy(false); }
    };
    trySend();
  };

  const verify = (e) => {
    e && e.preventDefault();
    const code = otp.join('');
    if (code.length < 4) { setErr('Enter the code you received'); return; }
    if (typeof window.verifyOtp !== 'function') { setErr('OTP service not ready — please refresh.'); return; }
    setErr(''); setBusy(true);
    window.verifyOtp(
      code,
      async (data) => {
        const accessToken = typeof data === 'string' ? data : (data?.message || data?.token || data?.accessToken || JSON.stringify(data));
        const res = await registerOtp({ name: form.name.trim(), email: form.email.trim(), phone: digits, access_token: accessToken });
        if (res.ok) { toast('Account created ✓'); router.push('/test/account'); }
        else { setErr(res.message); setBusy(false); }
      },
      () => { setErr('Invalid code. Please try again.'); setBusy(false); },
    );
  };

  return (
    <TestLayout>
      <Head><title>Create account — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>
      <Msg91Loader />

      <div className="wrap" style={{ paddingBlock: '40px 70px' }}>
        <div className="authsplit">
          <div className="authsplit__brand">
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>CrossCoin</span>
            <h1>Join CrossCoin</h1>
            <p>Create an account for faster checkout, order tracking and member offers.</p>
            <div className="authsplit__stats">
              <div><b>Free</b><span>Shipping ₹799+</span></div>
              <div><b>7-Day</b><span>Returns</span></div>
              <div><b>COD</b><span>Available</span></div>
            </div>
          </div>

          <div className="authsplit__form">
            {step === 'details' ? (
              <form onSubmit={sendCode}>
                <h2>Create account</h2>
                <p className="authsplit__d">We verify your mobile with a one-time code.</p>
                <div className="ffield"><label>Full name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" /></div>
                <div className="ffield"><label>Email <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" /></div>
                <div className="ffield"><label>Mobile number</label>
                  <div className="phoneinput"><span className="phoneinput__cc">+91</span>
                    <input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98XXXXXXXX" /></div>
                </div>
                <label className="agecheck"><input type="checkbox" checked={form.age} onChange={(e) => set('age', e.target.checked)} /><span>I am 18 years or older.</span></label>
                {err && <div className="autherr mono">{err}</div>}
                <button className="btn btn--crimson btn--block btn--lg" type="submit" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Sending…' : 'Send code →'}</button>
                <div className="authsplit__alt">Already have an account? <a onClick={() => router.push('/test/login')}>Sign in</a></div>
              </form>
            ) : (
              <form onSubmit={verify}>
                <h2>Enter code</h2>
                <p className="authsplit__d">We sent a 4-digit code to +91 {digits}. <button type="button" className="authlink" onClick={() => { setStep('details'); setErr(''); }}>Change</button></p>
                <div className="ffield"><label>4-digit code</label>
                  <div className="otpboxes" onPaste={onOtpPaste}>
                    {otp.map((d, i) => (
                      <input key={i} ref={(el) => { otpRefs.current[i] = el; }} className="otpbox" inputMode="numeric" maxLength={1} value={d} autoFocus={i === 0} aria-label={`Digit ${i + 1}`} onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onOtpKey(i, e)} />
                    ))}
                  </div>
                </div>
                {err && <div className="autherr mono">{err}</div>}
                <button className="btn btn--crimson btn--block btn--lg" type="submit" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Creating…' : 'Verify & create account'}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </TestLayout>
  );
}
