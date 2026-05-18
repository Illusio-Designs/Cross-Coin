import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [step, setStep]   = useState('phone');
  const [otp, setOtp]     = useState(['', '', '', '']);

  const onSendOtp = (e) => { e.preventDefault(); if (phone.length >= 10) setStep('otp'); };
  const onVerify  = (e) => { e.preventDefault(); };

  return (
    <>
      <Head><title>Sign In — Gripzus</title></Head>
      <main className="bg-paper">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-100px)]">

          {/* Left — editorial image panel */}
          <aside className="relative hidden lg:block bg-ink overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=1200&q=85&auto=format&fit=crop"
              alt="Gripzus pair"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-14">
              <p className="eyebrow text-clay mb-4">Members get</p>
              <h2 className="font-display uppercase text-paper leading-[0.9] tracking-[-0.035em]" style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', fontWeight: 700 }}>
                Early access<br /><em className="not-italic font-serif italic font-normal text-clay">to every drop.</em>
              </h2>
              <p className="text-paper/70 text-sm max-w-sm mt-4">
                Inner Sole members see new pairs 48 hours before the public, and get the welcome 10%.
              </p>
            </div>
          </aside>

          {/* Right — form */}
          <div className="flex items-center justify-center px-6 md:px-12 py-16">
            <div className="w-full max-w-md">
              <p className="eyebrow mb-4">Account · Sign In</p>
              <h1 className="h-display text-5xl md:text-6xl uppercase mb-3">
                Welcome <em className="h-italic">back.</em>
              </h1>
              <p className="prose-body text-sm md:text-base mb-9">
                Sign in with your phone number — we&apos;ll text you a 4-digit code. No password to remember.
              </p>

              {step === 'phone' && (
                <form onSubmit={onSendOtp} className="space-y-5">
                  <Field label="Mobile number" value={phone} onChange={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} placeholder="98201 43210" />
                  <button type="submit" className="cta w-full justify-center !py-4">Send OTP</button>
                  <p className="text-center eyebrow">
                    New here?{' '}
                    <Link href="/register" className="text-clay-deep hover:text-ink underline underline-offset-4">Create an account</Link>
                  </p>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={onVerify}>
                  <p className="eyebrow mb-4">Enter the 4-digit code</p>
                  <div className="flex gap-3 mb-6">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        type="text" maxLength={1} inputMode="numeric" value={d}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(-1); const n = [...otp]; n[i] = v; setOtp(n); }}
                        className="flex-1 text-center bg-paper-deep border border-line focus:border-ink outline-none py-4 font-display font-bold text-2xl text-ink transition-colors"
                      />
                    ))}
                  </div>
                  <button type="submit" className="cta w-full justify-center !py-4">Verify & Sign In</button>
                  <button type="button" onClick={() => setStep('phone')} className="block w-full text-center eyebrow mt-4 hover:text-ink">
                    ← Use a different number
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="eyebrow block mb-2">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-paper-deep border border-line focus:border-ink outline-none px-4 py-3.5 text-base text-ink placeholder:text-ink-muted transition-colors"
      />
    </div>
  );
}
