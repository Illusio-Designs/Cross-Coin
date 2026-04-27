'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Save } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

export default function ProfilePage() {
  const [form, setForm] = useState({ firstName: 'Guest', lastName: 'User', email: 'guest@velmique.com', phone: '', currentPass: '', newPass: '' });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-10">
        <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] font-body mb-8">
          <Link href="/account" className="hover:text-[var(--gold-deep)] transition-colors">Account</Link>
          <ChevronRight size={10} />
          <span className="text-[var(--ink)]">Profile</span>
        </div>
      </div>

      <PageHeader
        eyebrow="Settings"
        title="EDIT"
        accent="PROFILE"
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="space-y-6 max-w-3xl">
          <div className="bg-white border border-[var(--border)] rounded-2xl p-7">
            <h2 className="font-display text-[var(--ink)] uppercase text-2xl tracking-tight mb-6">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([name, label]) => (
                <div key={name}>
                  <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</label>
                  <input value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                    className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                </div>
              ))}
            </div>
            {[['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'tel']].map(([name, label, type]) => (
              <div key={name} className="mb-4">
                <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</label>
                <input type={type} value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                  className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
              </div>
            ))}
          </div>

          <div className="bg-white border border-[var(--border)] rounded-2xl p-7">
            <h2 className="font-display text-[var(--ink)] uppercase text-2xl tracking-tight mb-6">Change Password</h2>
            {[['currentPass', 'Current Password'], ['newPass', 'New Password']].map(([name, label]) => (
              <div key={name} className="mb-4">
                <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</label>
                <input type="password" className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
              </div>
            ))}
          </div>

          <button onClick={handleSave}
            className={`pill-cta w-full justify-center !py-4 ${saved ? '!bg-green-700' : ''}`}>
            <Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
