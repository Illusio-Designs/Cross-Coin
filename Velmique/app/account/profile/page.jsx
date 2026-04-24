'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Save } from 'lucide-react';

export default function ProfilePage() {
  const [form, setForm] = useState({ firstName: 'Guest', lastName: 'User', email: 'guest@velmique.com', phone: '', currentPass: '', newPass: '' });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        <div className="flex items-center gap-2 text-xs text-[#f3ede0]/30 font-body mb-8">
          <Link href="/account" className="hover:text-[#d4927f] transition-colors">Account</Link>
          <ChevronRight size={10} />
          <span className="text-[#f3ede0]/60">Profile</span>
        </div>
        <div className="mb-8">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Settings</p>
          <h1 className="font-serif text-4xl text-[#f3ede0]">Edit Profile</h1>
          <div className="gold-divider w-16 mt-4" />
        </div>

        <div className="space-y-6">
          <div className="bg-[#1d1915] border border-[#b8624f]/15 rounded-sm p-6">
            <h2 className="font-serif text-lg text-[#f3ede0] mb-5">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([name, label]) => (
                <div key={name}>
                  <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">{label}</label>
                  <input value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                    className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                </div>
              ))}
            </div>
            {[['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'tel']].map(([name, label, type]) => (
              <div key={name} className="mb-4">
                <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">{label}</label>
                <input type={type} value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                  className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
              </div>
            ))}
          </div>

          <div className="bg-[#1d1915] border border-[#b8624f]/15 rounded-sm p-6">
            <h2 className="font-serif text-lg text-[#f3ede0] mb-5">Change Password</h2>
            {[['currentPass', 'Current Password'], ['newPass', 'New Password']].map(([name, label]) => (
              <div key={name} className="mb-4">
                <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">{label}</label>
                <input type="password" className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
              </div>
            ))}
          </div>

          <button onClick={handleSave}
            className={`btn-gold w-full py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm ${saved ? 'bg-green-600 text-white' : ''}`}>
            <Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
