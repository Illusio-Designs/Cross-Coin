import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I, toast } from '../../components/test/ui';

export default function TestRegister() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', age: false });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast('Please enter your name'); return; }
    if (form.phone.replace(/\D/g, '').length !== 10) { toast('Enter a valid 10-digit mobile number'); return; }
    if (!form.age) { toast('Please confirm you are 18 or older'); return; }
    toast('Registration is preview-only — checkout works as guest ✓');
  };

  return (
    <TestLayout>
      <Head><title>Create account — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="wrap authwrap">
        <div className="authcard">
          <span className="eyebrow">CrossCoin</span>
          <h1 className="authcard__h">Create your account</h1>
          <p className="authcard__d">Join for faster checkout, order tracking and member offers.</p>

          <form onSubmit={submit}>
            <div className="ffield"><label>Full name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" /></div>
            <div className="ffield"><label>Email <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" /></div>
            <div className="ffield"><label>Mobile number</label>
              <div className="phoneinput">
                <span className="phoneinput__cc">+91</span>
                <input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98XXXXXXXX" />
              </div>
            </div>
            <label className="agecheck"><input type="checkbox" checked={form.age} onChange={(e) => set('age', e.target.checked)} /><span>I am 18 years or older.</span></label>
            <button className="btn btn--crimson btn--block btn--lg" type="submit" style={{ marginTop: 14 }}>Create account {I.arrow(16)}</button>
          </form>

          <div className="authcard__alt">Already have an account? <a onClick={() => router.push('/test/login')}>Sign in</a></div>
          <p className="authcard__note mono">Preview note — registration is a UI demo; your cart checks out as a guest.</p>
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
