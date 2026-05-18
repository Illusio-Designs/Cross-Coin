import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [step, setStep] = useState('details');
  const [otp, setOtp]   = useState(['', '', '', '']);

  const onSubmit = (e) => { e.preventDefault(); if (form.name.trim() && form.phone.length >= 10) setStep('otp'); };
  const onVerify = (e) => { e.preventDefault(); };

  return (
    <>
      <Head><title>Create Account — Gripzus</title></Head>
      <main className="bg-paper">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-100px)]">

          <aside className="relative hidden lg:block bg-ink overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1577538928305-3807c3993047?w=1200&q=85&auto=format&fit=crop"
              alt="Gripzus pair"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-14">
              <p className="eyebrow text-clay mb-4">Join the circle</p>
              <h2 className="font-display uppercase text-paper leading-[0.9] tracking-[-0.035em]" style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', fontWeight: 700 }}>
                10% off<br /><em className="not-italic font-serif italic font-normal text-clay">your first pair.</em>
              </h2>
              <p className="text-paper/70 text-sm max-w-sm mt-4">
                Plus early access to every drop and the occasional notes from the knit room.
              </p>
            </div>
          </aside>

          <div className="flex items-center justify-center px-6 md:px-12 py-16">
            <div className="w-full max-w-md">
              <p className="eyebrow mb-4">Account · Register</p>
              <h1 className="h-display text-5xl md:text-6xl uppercase mb-3">
                Start the <em className="h-italic">circle.</em>
              </h1>
              <p className="prose-body text-sm md:text-base mb-9">
                Two minutes, no password. We verify your phone with a one-time code.
              </p>

              {step === 'details' && (
                <form onSubmit={onSubmit} className="space-y-5">
                  <Field label="Full name *"      value={form.name}  onChange={(v) => setForm({ ...form, name: v })} placeholder="Anika Sharma" />
                  <Field label="Mobile number *"  value={form.phone} onChange={(v) => setForm({ ...form, phone: v.replace(/\D/g, '').slice(0, 10) })} placeholder="98201 43210" />
                  <Field label="Email (optional)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" type="email" />
                  <button type="submit" className="cta w-full justify-center !py-4">Send OTP</button>
                  <p className="text-center eyebrow">
                    Have an account?{' '}
                    <Link href="/login" className="text-clay-deep hover:text-ink underline underline-offset-4">Sign in</Link>
                  </p>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={onVerify}>
                  <p className="eyebrow mb-4">Code sent to +91 {form.phone}</p>
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
                  <button type="submit" className="cta w-full justify-center !py-4">Verify & Create Account</button>
                  <button type="button" onClick={() => setStep('details')} className="block w-full text-center eyebrow mt-4 hover:text-ink">
                    ← Edit details
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
