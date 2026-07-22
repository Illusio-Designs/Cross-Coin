'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import AccountGate from '@/components/account/AccountGate';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { getUserOrders } from '@/lib/api/orders';
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/lib/api/addresses';

const EMPTY = { full_name: '', phone: '', address: '', city: '', state: '', pincode: '', country: 'India', is_default: false };

function statusClass(s) {
  const v = (s || '').toLowerCase();
  if (v === 'delivered') return 'ok';
  if (v === 'cancelled') return 'bad';
  return 'pending';
}

function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await getUserOrders({ limit: 5 });
      setOrders(data?.orders || data?.data || (Array.isArray(data) ? data : []));
    } catch { setOrders([]); }
    finally { setLoadingOrders(false); }
  }, []);

  const loadAddresses = useCallback(async () => {
    setLoadingAddr(true);
    try { setAddresses(await getAddresses()); }
    catch { setAddresses([]); }
    finally { setLoadingAddr(false); }
  }, []);

  useEffect(() => { loadOrders(); loadAddresses(); }, [loadOrders, loadAddresses]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = type === 'checkbox' ? checked : value;
    if (name === 'phone') v = String(v).replace(/\D/g, '').slice(0, 10);
    if (name === 'pincode') v = String(v).replace(/\D/g, '').slice(0, 6);
    setForm((p) => ({ ...p, [name]: v }));
  };

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setShowForm(true); setErr(''); };
  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      full_name: a.full_name || a.fullName || '', phone: a.phone_number || a.phone || '',
      address: a.address || '', city: a.city || '', state: a.state || '',
      pincode: a.postal_code || a.pincode || '', country: a.country || 'India',
      is_default: a.is_default || a.isDefault || false,
    });
    setShowForm(true); setErr('');
  };

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      if (editingId) await updateAddress(editingId, form);
      else await createAddress(form);
      await loadAddresses();
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
    } catch (e2) { setErr(e2.message || 'Failed to save address.'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => { try { await deleteAddress(id); await loadAddresses(); } catch {} };
  const makeDefault = async (id) => { try { await setDefaultAddress(id); await loadAddresses(); } catch {} };
  const doLogout = async () => { await logout(); router.replace('/'); };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="account-head">
        <div className="page-hero">
          <span className="eyebrow">Account</span>
          <h1>Hi{user?.username ? `, ${user.username}` : ''}</h1>
          <p>{user?.email || user?.phone || 'Welcome back to Morbix.'}</p>
        </div>
        <button className="btn btn-ghost" onClick={doLogout}><Icon name="ArrowUpRight" size={15} /> Log out</button>
      </div>

      <div className="account-links">
        <Link href="/account/orders" className="account-link"><span className="ic"><Icon name="ShoppingBag" size={18} /></span><b>My orders</b><span className="muted">View order history</span></Link>
        <Link href="/wishlist" className="account-link"><span className="ic"><Icon name="Heart" size={18} /></span><b>Wishlist</b><span className="muted">Saved products</span></Link>
        <Link href="/track-order" className="account-link"><span className="ic"><Icon name="Truck" size={18} /></span><b>Track order</b><span className="muted">Check delivery</span></Link>
        <Link href="/account/settings" className="account-link"><span className="ic"><Icon name="User" size={18} /></span><b>Settings</b><span className="muted">Profile & password</span></Link>
      </div>

      {/* Recent orders */}
      <section className="account-section">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20 }}>Recent orders</h2>
          <Link href="/account/orders" className="link-more">View all <Icon name="ArrowRight" size={14} /></Link>
        </div>
        {loadingOrders ? (
          <div style={{ display: 'grid', gap: 10 }}><Skeleton height={64} radius={14} /><Skeleton height={64} radius={14} /></div>
        ) : orders.length === 0 ? (
          <div className="empty">No orders yet. <Link href="/products" className="btn btn-primary">Start shopping</Link></div>
        ) : (
          <div className="order-list">
            {orders.map((o) => (
              <Link href={`/account/orders/${o.id}`} className="order-row" key={o.id}>
                <div><b>#{o.order_number}</b><span className="muted">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span></div>
                <span className={`order-status ${statusClass(o.status)}`}>{o.status}</span>
                <b>₹{Number(o.final_amount || o.total_amount || 0).toFixed(0)}</b>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Addresses */}
      <section className="account-section">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20 }}>Saved addresses</h2>
          {!showForm && <button className="link-more" onClick={openAdd}><Icon name="Sparkles" size={14} /> Add new</button>}
        </div>

        {showForm && (
          <form className="contact-form" onSubmit={save} style={{ marginBottom: 18 }}>
            <div className="field-row">
              <label>Full name<input name="full_name" value={form.full_name} onChange={onChange} required /></label>
              <label>Phone<input name="phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={onChange} required /></label>
            </div>
            <label>Address<input name="address" value={form.address} onChange={onChange} required /></label>
            <div className="field-row">
              <label>City<input name="city" value={form.city} onChange={onChange} required /></label>
              <label>State<input name="state" value={form.state} onChange={onChange} required /></label>
            </div>
            <div className="field-row">
              <label>PIN code<input name="pincode" value={form.pincode} onChange={onChange} required /></label>
              <label>Country<input name="country" value={form.country} onChange={onChange} /></label>
            </div>
            <label className="co-checkbox"><input type="checkbox" name="is_default" checked={form.is_default} onChange={onChange} /> Set as default</label>
            {err && <p className="auth-error">{err}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update address' : 'Save address'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
            </div>
          </form>
        )}

        {loadingAddr ? (
          <div style={{ display: 'grid', gap: 10 }}><Skeleton height={90} radius={14} /></div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="empty">No saved addresses yet.</div>
        ) : (
          <div className="addr-grid">
            {addresses.map((a) => (
              <div className="addr-card" key={a.id}>
                <div>
                  <b>{a.full_name || a.fullName} {(a.is_default || a.isDefault) && <span className="default-tag">Default</span>}</b>
                  <span className="muted">{a.address}, {a.city}, {a.state} {a.postal_code || a.pincode}</span>
                  <span className="muted">{a.phone_number || a.phone}</span>
                </div>
                <div className="addr-actions">
                  <button onClick={() => openEdit(a)}>Edit</button>
                  {!(a.is_default || a.isDefault) && <button onClick={() => makeDefault(a.id)}>Set default</button>}
                  <button onClick={() => remove(a.id)} className="danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccountClient() {
  return (
    <AccountGate title="Your account">
      <Dashboard />
    </AccountGate>
  );
}
