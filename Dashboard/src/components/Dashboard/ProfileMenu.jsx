/**
 * Header profile menu — avatar → dropdown → (Edit profile · Logout).
 *
 * Reads the signed-in staff user straight from AuthContext, which is
 * hydrated by the `/api/users/me` ("Me") API. Editing saves through
 * userService.updateProfile (PUT /api/users/profile) and then re-runs
 * checkAuth() so the header reflects the change immediately.
 *
 * This replaces the old sidebar "Logout" row — logout now lives here and
 * calls the real AuthContext.logout() (clears token + hits the API) rather
 * than the previous hard redirect that left the session alive.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services';
import { showProfileUpdateSuccessToast, showProfileUpdateErrorToast } from '../../utils/toast';
import Modal from '../ui/Modal';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, UserEdit01Icon, Logout01Icon } from '@hugeicons/core-free-icons';

const ROLE_LABELS = {
  admin:            'Admin',
  product_manager:  'Product Manager',
  order_manager:    'Order Manager',
  whatsapp_manager: 'WhatsApp Manager',
};

const initialsOf = (name = '', email = '') => {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

export default function ProfileMenu() {
  const { user, roles, logout, checkAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!user) return null;

  const name = user.username || user.name || 'Staff';
  const email = user.email || '';
  const primaryRole = (roles || []).includes('admin') ? 'admin' : (roles || [])[0];
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole || 'Staff';
  const avatarUrl = user.profileImageUrl || null;

  return (
    <>
      <div className="dh-profile" ref={wrapRef}>
        <button
          className="dh-profile-btn"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          title={name}
        >
          <span className="dh-avatar" aria-hidden="true">
            {avatarUrl
              ? <img src={avatarUrl} alt="" />
              : <span className="dh-avatar-ini">{initialsOf(name, email)}</span>}
          </span>
          <span className="dh-profile-meta">
            <span className="dh-profile-name">{name}</span>
            <span className="dh-profile-role">{roleLabel}</span>
          </span>
          <span className={`dh-profile-chev${open ? ' is-open' : ''}`}>
            <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={2} />
          </span>
        </button>

        {open && (
          <div className="dh-menu" role="menu">
            <div className="dh-menu-head">
              <span className="dh-avatar dh-avatar--lg" aria-hidden="true">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" />
                  : <span className="dh-avatar-ini">{initialsOf(name, email)}</span>}
              </span>
              <div className="dh-menu-idty">
                <span className="dh-menu-name">{name}</span>
                {email && <span className="dh-menu-email" title={email}>{email}</span>}
                <span className="dh-menu-rolechip">{roleLabel}</span>
              </div>
            </div>

            <div className="dh-menu-sep" />

            <button className="dh-menu-item" role="menuitem"
              onClick={() => { setOpen(false); setEditing(true); }}>
              <HugeiconsIcon icon={UserEdit01Icon} size={17} strokeWidth={1.9} />
              Edit profile
            </button>
            <button className="dh-menu-item dh-menu-item--danger" role="menuitem"
              onClick={() => { setOpen(false); logout(); }}>
              <HugeiconsIcon icon={Logout01Icon} size={17} strokeWidth={1.9} />
              Logout
            </button>
          </div>
        )}
      </div>

      {editing && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={async () => { setEditing(false); await checkAuth(); }}
        />
      )}
    </>
  );
}

function EditProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ username: user.username || '', email: user.email || '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setErr(null);
    if (!form.username.trim()) { setErr('Name is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setErr('Enter a valid email.'); return; }
    setSaving(true);
    try {
      await userService.updateProfile({ username: form.username.trim(), email: form.email.trim() });
      showProfileUpdateSuccessToast();
      await onSaved();
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e?.message || 'Failed to update profile.');
      setErr(msg);
      showProfileUpdateErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title="Edit profile"
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="dh-mbtn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="dh-mbtn dh-mbtn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div className="dh-editform">
        <label className="dh-field">
          <span className="dh-field-lbl">Name</span>
          <input className="dh-input" value={form.username} onChange={set('username')} placeholder="Your name" autoFocus />
        </label>
        <label className="dh-field">
          <span className="dh-field-lbl">Email</span>
          <input className="dh-input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </label>
        {err && <div className="dh-field-err">{err}</div>}
      </div>
    </Modal>
  );
}
