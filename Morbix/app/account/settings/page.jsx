'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import AccountGate from '@/components/account/AccountGate';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/api/auth';
import { toast } from '@/lib/toast';

function Settings() {
  const router = useRouter();
  const { user, fetchUser } = useAuth();
  const [profile, setProfile] = useState({ username: '', email: '', phone: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) setProfile({
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || user.phone_number || '',
    });
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setSavingProfile(true);
    try {
      await updateProfile(profile);
      await fetchUser();
      toast.success('Profile updated');
      // Go straight back to the account page after saving.
      router.push('/account');
    } catch (e2) {
      setProfileMsg(e2.message || 'Update failed.');
      toast.error(e2.message || 'Update failed');
      setSavingProfile(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs">
        <Link href="/account">Account</Link> <span>/</span> <b>Settings</b>
      </nav>
      <div className="page-hero"><span className="eyebrow">Account</span><h1>Settings</h1></div>

      <div className="settings-single">
        <form className="contact-form" onSubmit={saveProfile}>
          <h3 style={{ margin: 0 }}>Profile details</h3>
          <label>Full name<input value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} placeholder="Your name" /></label>
          <label>Email<input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="you@email.com" /></label>
          <label>Phone number
            <div className="phone-input">
              <span>+91</span>
              <input type="tel" inputMode="numeric" value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(-10) }))}
                placeholder="10-digit mobile" />
            </div>
          </label>
          {profileMsg && <p className="auth-error">{profileMsg}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : <>Save changes <Icon name="ArrowRight" size={15} /></>}</button>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <AccountGate title="Settings"><Settings /></AccountGate>;
}
