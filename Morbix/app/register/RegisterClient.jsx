'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import { register } from '@/lib/api/auth';

export default function RegisterClient() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim()) { setError('Please enter your name.'); return; }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) { setError('Please enter a valid email.'); return; }
    if (form.phone.length !== 10) { setError('Please enter a valid 10-digit phone number.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await register(form);
      await fetchUser();
      router.replace('/account');
    } catch (e2) {
      setError(e2.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="auth-wrap">
        <div className="page-hero" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
          <span className="eyebrow">Account</span>
          <h1>Create your account</h1>
          <p>Join Morbix for faster checkout and order tracking.</p>
        </div>

        <form className="contact-form auth-form" onSubmit={submit}>
          <label>Full name<input name="username" value={form.username} onChange={onChange} placeholder="Your name" autoComplete="name" required /></label>
          <label>Email<input name="email" type="email" value={form.email} onChange={onChange} placeholder="you@email.com" autoComplete="email" required /></label>
          <label>Phone<input name="phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={onChange} placeholder="10-digit mobile" autoComplete="tel" required /></label>
          <label>Password<input name="password" type="password" value={form.password} onChange={onChange} placeholder="Create a password" autoComplete="new-password" required /></label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating…' : <>Create account <Icon name="ArrowRight" size={16} /></>}
          </button>
          <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
            Already have an account? <Link href="/login" style={{ color: 'var(--navy)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
