'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import AccountGate from '@/components/account/AccountGate';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, changePassword } from '@/lib/api/auth';
import { toast } from '@/lib/toast';

function Settings() {
  const { user, fetchUser } = useAuth();
  const [profile, setProfile] = useState({ username: '', email: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) setProfile({ username: user.username || '', email: user.email || '' });
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setSavingProfile(true);
    try {
      await updateProfile(profile);
      await fetchUser();
      setProfileMsg('Profile updated.');
      toast.success('Profile updated');
    } catch (e2) { setProfileMsg(e2.message || 'Update failed.'); toast.error(e2.message || 'Update failed'); }
    finally { setSavingProfile(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pw.newPassword.length < 6) { setPwMsg('New password must be at least 6 characters.'); toast.error('New password must be at least 6 characters'); return; }
    if (pw.newPassword !== pw.confirm) { setPwMsg('Passwords do not match.'); toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      await changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg('Password updated.');
      toast.success('Password updated');
    } catch (e2) { setPwMsg(e2.message || 'Password change failed.'); toast.error(e2.message || 'Password change failed'); }
    finally { setSavingPw(false); }
  };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs">
        <Link href="/account">Account</Link> <span>/</span> <b>Settings</b>
      </nav>
      <div className="page-hero"><span className="eyebrow">Account</span><h1>Settings</h1></div>

      <div className="settings-grid">
        <form className="contact-form" onSubmit={saveProfile}>
          <h3 style={{ margin: 0 }}>Profile details</h3>
          <label>Full name<input value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} placeholder="Your name" /></label>
          <label>Email<input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="you@email.com" /></label>
          {profileMsg && <p className="auth-error" style={{ color: 'var(--teal-600)' }}>{profileMsg}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : <>Save changes <Icon name="ArrowRight" size={15} /></>}</button>
        </form>

        <form className="contact-form" onSubmit={savePassword}>
          <h3 style={{ margin: 0 }}>Change password</h3>
          <label>Current password<input type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" /></label>
          <label>New password<input type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" /></label>
          <label>Confirm new password<input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" /></label>
          {pwMsg && <p className="auth-error" style={{ color: pwMsg.includes('updated') ? 'var(--teal-600)' : undefined }}>{pwMsg}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw ? 'Saving…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <AccountGate title="Settings"><Settings /></AccountGate>;
}
