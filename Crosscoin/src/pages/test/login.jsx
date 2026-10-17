import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I, toast } from '../../components/test/ui';

export default function TestLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [otp, setOtp] = useState('');

  const sendCode = (e) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length !== 10) { toast('Enter a valid 10-digit mobile number'); return; }
    setStep('otp');
    toast('Preview — enter any 6 digits to continue');
  };
  const verify = (e) => {
    e.preventDefault();
    toast('Sign-in is preview-only — checkout works as guest ✓');
  };

  return (
    <TestLayout>
      <Head><title>Sign in — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="wrap authwrap">
        <div className="authcard">
          <span className="eyebrow">CrossCoin</span>
          <h1 className="authcard__h">{step === 'phone' ? 'Sign in' : 'Enter code'}</h1>
          <p className="authcard__d">
            {step === 'phone'
              ? 'Log in with your mobile number — we send a one-time code.'
              : `We sent a 6-digit code to +91 ${phone}.`}
          </p>

          {step === 'phone' ? (
            <form onSubmit={sendCode}>
              <div className="ffield"><label>Mobile number</label>
                <div className="phoneinput">
                  <span className="phoneinput__cc">+91</span>
                  <input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98XXXXXXXX" autoFocus />
                </div>
              </div>
              <button className="btn btn--crimson btn--block btn--lg" type="submit" style={{ marginTop: 14 }}>Send code {I.arrow(16)}</button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <div className="ffield"><label>6-digit code</label>
                <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" autoFocus style={{ letterSpacing: '.4em', fontFamily: '"Space Mono",monospace' }} />
              </div>
              <button className="btn btn--crimson btn--block btn--lg" type="submit" style={{ marginTop: 14 }}>Verify &amp; continue</button>
              <button type="button" className="authlink" onClick={() => setStep('phone')} style={{ marginTop: 12 }}>← Change number</button>
            </form>
          )}

          <div className="authcard__alt">
            New to CrossCoin? <a onClick={() => router.push('/test/register')}>Create an account</a>
          </div>
          <p className="authcard__note mono">Preview note — sign-in is a UI demo; your cart checks out as a guest.</p>
        </div>

        <ul className="authperks">
          <li>{I.truck(18)} Free shipping over ₹799</li>
          <li>{I.ret(18)} 7-day easy returns</li>
          <li>{I.shield(18)} 100% genuine, secure checkout</li>
        </ul>
      </div>
    </TestLayout>
  );
}
