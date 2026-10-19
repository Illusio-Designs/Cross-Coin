'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, deleteAccount, exportMyData } from '@/lib/api/auth';
import { getUserOrders, cancelOrder } from '@/lib/api/orders';
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/lib/api/addresses';
import { getAuthToken } from '@/lib/authToken';
import {
  toastProfileUpdated, toastProfileError,
  toastAddressAdded, toastAddressUpdated, toastAddressDeleted, toastAddressDefault, toastAddressError,
  toastOrderCancelled, toastOrderError,
} from '@/lib/toast';
import {
  orderStatusLabel, orderStatusTone, isActiveOrder, canCancelOrder,
  canRequestReturn, paymentSummary, orderStatusNote,
} from '@/utils/orderStatus';
import { resolveImageUrl, pickItemImage, fmtAttrs } from '@/lib/orderItems';
import ConfirmDialog from '../_components/ConfirmDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'profile', label: 'Profile & privacy' },
];
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const asList = (d) => (Array.isArray(d) ? d : (d?.orders || d?.data || []));

// Loyalty balance (/api/loyalty/balance); falls back to the profile field.
async function getLoyaltyPoints() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/loyalty/balance`, { headers: { 'X-Brand-Name': BRAND, Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const j = await res.json();
    return Number(j?.data?.points ?? 0);
  } catch { return null; }
}

export default function AccountClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, loading, isAuthenticated, logout, fetchUser } = useAuth();
  const [tab, setTab] = useState(() => (TABS.some((t) => t.key === sp.get('tab')) ? sp.get('tab') : 'orders'));
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [points, setPoints] = useState(null);

  const loadOrders = useCallback(() => {
    setOrdersLoading(true);
    setOrdersError('');
    getUserOrders({ limit: 50 })
      .then((d) => setOrders(asList(d)))
      .catch((e) => { setOrders([]); setOrdersError(e.message || 'Could not load your orders.'); })
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadOrders();
    getLoyaltyPoints().then((p) => setPoints(p));
  }, [isAuthenticated, loadOrders]);

  const switchTab = (k) => {
    setTab(k);
    const q = new URLSearchParams(sp.toString());
    if (k === 'orders') q.delete('tab'); else q.set('tab', k);
    router.replace(`/account${q.toString() ? `?${q}` : ''}`, { scroll: false });
  };

  if (loading) {
    return <div className="m-wrap m-ph"><span className="m-eyebrow">Your account</span><h1>My Maison.</h1><p>Loading…</p></div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        <section className="m-wrap m-ph"><span className="m-eyebrow">Your account</span><h1>Welcome Back.</h1></section>
        <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
          <div className="m-empty">
            <h3>Sign in to continue</h3>
            <p style={{ marginBottom: 20 }}>Your orders, returns, addresses and loyalty points — all in one place.</p>
            <div className="m-oc__cta">
              <Link className="m-btn m-btn--fill" href="/login">Sign in</Link>
              <Link className="m-btn m-btn--ghost" href="/register">Create an account</Link>
            </div>
            <p style={{ marginTop: 18, fontSize: 13 }}>Checked out as a guest? <Link href="/track-order" className="m-textlink">Track an order</Link></p>
          </div>
        </div>
      </>
    );
  }

  const name = user?.username || user?.name || 'Velmique member';
  const loyalty = points ?? Number(user?.loyalty_points || 0);
  const delivered = orders.filter((o) => String(o.status || '').toLowerCase() === 'delivered').length;
  const active = orders.filter((o) => isActiveOrder(o.status)).length;

  return (
    <>
      <section className="m-wrap m-ph"><span className="m-eyebrow">Welcome back, {name.split(' ')[0]}</span><h1>My Maison.</h1></section>
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <div className="m-acct">
          <aside className="m-acctside">
            <div className="nm">{name}</div>
            <div className="em">{user?.email && !/@phone\./.test(user.email) ? user.email : ''}{user?.phone ? <><br />+91 {user.phone}</> : null}</div>
            <dl className="m-stats">
              <div><dt>Orders</dt><dd>{orders.length}</dd></div>
              <div><dt>Active</dt><dd>{active}</dd></div>
              <div><dt>Delivered</dt><dd>{delivered}</dd></div>
              <div title="Earn points on delivered orders and redeem them on future orders."><dt>Points</dt><dd>{loyalty}</dd></div>
            </dl>
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              <Link className="m-btn m-btn--ghost" href="/account/returns" style={{ justifyContent: 'center' }}>Returns &amp; refunds</Link>
              <Link className="m-btn m-btn--ghost" href="/track-order" style={{ justifyContent: 'center' }}>Track an order</Link>
              <Link className="m-btn m-btn--ghost" href="/wishlist" style={{ justifyContent: 'center' }}>Wishlist</Link>
              <button type="button" className="m-btn m-btn--ghost" onClick={async () => { await logout(); router.replace('/login'); }} style={{ justifyContent: 'center' }}>Sign out</button>
            </div>
          </aside>

          <div>
            <div className="m-tabs" role="tablist" aria-label="Account sections">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" id={`m-tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`m-panel-${t.key}`}
                  className={`m-tab ${tab === t.key ? 'on' : ''}`} onClick={() => switchTab(t.key)}>{t.label}</button>
              ))}
            </div>
            <div role="tabpanel" id={`m-panel-${tab}`} aria-labelledby={`m-tab-${tab}`}>
              {tab === 'orders' ? <OrdersTab orders={orders} loading={ordersLoading} error={ordersError} reload={loadOrders} /> : null}
              {tab === 'addresses' ? <AddressesTab /> : null}
              {tab === 'profile' ? <ProfileTab user={user} fetchUser={fetchUser} logout={logout} /> : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────── Orders ─────────────── */
function OrdersTab({ orders, loading, error, reload }) {
  const [dialog, setDialog] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null);

  const askCancel = (o) => setDialog({
    title: 'Cancel this order?',
    message: `Order ${o.order_number || `#${o.id}`} will be cancelled. Tell us why if you like — it helps us improve.`,
    confirmLabel: 'Cancel order',
    cancelLabel: 'Keep order',
    withReason: true,
    danger: true,
    onConfirm: async (reason) => {
      setBusyId(o.id);
      try { await cancelOrder(o.id, reason); toastOrderCancelled(); reload(); }
      catch (err) { toastOrderError(err.message || 'Failed to cancel order'); }
      finally { setBusyId(null); }
    },
  });

  if (loading) return <div className="m-empty" style={{ padding: '40px 24px' }}><p>Loading your orders…</p></div>;
  if (error) {
    return (
      <div className="m-empty" style={{ padding: '40px 24px' }}>
        <h3>We couldn&rsquo;t load your orders</h3>
        <p style={{ marginBottom: 18 }}>{error}</p>
        <button type="button" className="m-btn m-btn--ghost" onClick={reload}>Try again</button>
      </div>
    );
  }
  if (!orders.length) {
    return (
      <div className="m-empty" style={{ padding: '40px 24px' }}>
        <h3>No orders yet</h3>
        <p style={{ marginBottom: 20 }}>Your signature scent is waiting.</p>
        <Link className="m-btn m-btn--fill" href="/shop" style={{ justifyContent: 'center' }}>Explore the collection</Link>
      </div>
    );
  }

  return (
    <>
      <ul className="m-olist">
        {orders.map((o) => {
          const items = o.OrderItems || o.items || [];
          const ref = o.order_number || o.orderNumber || `#${o.id}`;
          const note = orderStatusNote(o.status, o.payment_type);
          const open = openId === o.id;
          return (
            <li key={o.id} className="m-ordcard m-ocard">
              <div className="m-ordhead">
                <div>
                  <div className="m-crow__n">{ref}</div>
                  <div className="m-jcard__meta" style={{ marginTop: 4 }}>{fmtDate(o.createdAt || o.created_at)} · {items.length} item{items.length === 1 ? '' : 's'} · {fmt(o.final_amount ?? o.total_amount)}</div>
                </div>
                <span className={`m-badge m-badge--${orderStatusTone(o.status)}`}>{orderStatusLabel(o.status)}</span>
              </div>

              <div className="m-othumbs" aria-hidden="true">
                {items.slice(0, 4).map((it, i) => {
                  const img = pickItemImage(it);
                  return img ? <img key={it.id || i} src={resolveImageUrl(img)} alt="" loading="lazy" /> : <span key={it.id || i} className="m-olines__ph" />;
                })}
                {items.length > 4 ? <span className="m-othumbs__more">+{items.length - 4}</span> : null}
              </div>

              <p className="m-muted" style={{ fontSize: 12.5, marginTop: 10 }}>{paymentSummary(o.payment_type, o.payment_status)}</p>
              {note ? <p className="m-note-line">{note}</p> : null}

              {open ? (
                <div className="m-odetail" id={`m-od-${o.id}`}>
                  <ul className="m-olines">
                    {items.map((it, i) => {
                      const img = pickItemImage(it);
                      const attrs = fmtAttrs(it.ProductVariation?.attributes || it.variation?.attributes);
                      return (
                        <li key={it.id || i}>
                          {img ? <img src={resolveImageUrl(img)} alt="" loading="lazy" /> : <span className="m-olines__ph" />}
                          <div>
                            {it.Product?.slug ? <Link href={`/product/${it.Product.slug}`}><b>{it.Product?.name}</b></Link> : <b>{it.Product?.name || it.name || 'Item'}</b>}
                            <small>{attrs ? `${attrs} · ` : ''}Qty {it.quantity}</small>
                          </div>
                          <span>{fmt(it.subtotal ?? (Number(it.price) * (it.quantity || 1)))}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="m-sumrow"><span>Items</span><span>{fmt(o.total_amount)}</span></div>
                  {Number(o.discount_amount) > 0 ? <div className="m-sumrow"><span>Discount</span><span>− {fmt(o.discount_amount)}</span></div> : null}
                  <div className="m-sumrow"><span>Shipping</span><span>{Number(o.shipping_fee) > 0 ? fmt(o.shipping_fee) : 'Free'}</span></div>
                  <div className="m-sumrow tot"><span>Total</span><b>{fmt(o.final_amount)}</b></div>
                  {o.tracking_number ? <p className="m-muted" style={{ fontSize: 12.5 }}>AWB {o.tracking_number}{o.courier_name ? ` · ${o.courier_name}` : ''}</p> : null}
                </div>
              ) : null}

              <div className="m-oactions">
                <button type="button" className="m-linkbtn" aria-expanded={open} aria-controls={`m-od-${o.id}`} onClick={() => setOpenId(open ? null : o.id)}>{open ? 'Hide details' : 'Order details'}</button>
                {canCancelOrder(o.status) ? (
                  <button type="button" className="m-linkbtn m-linkbtn--danger" disabled={busyId === o.id} onClick={() => askCancel(o)}>{busyId === o.id ? 'Cancelling…' : 'Cancel'}</button>
                ) : null}
                {canRequestReturn(o.status) ? <Link className="m-btn m-btn--ghost m-btn--sm" href={`/account/returns?order=${encodeURIComponent(o.id)}`}>Return</Link> : null}
                {o.invoice_url ? <a className="m-btn m-btn--ghost m-btn--sm" href={o.invoice_url} target="_blank" rel="noopener noreferrer">Invoice</a> : null}
                <Link className="m-btn m-btn--fill m-btn--sm" href={`/track-order?order=${encodeURIComponent(ref.replace(/^#/, ''))}`}>Track</Link>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

/* ─────────────── Addresses ─────────────── */
const EMPTY_ADDR = { full_name: '', phone: '', address: '', city: '', state: '', pincode: '', country: 'India', is_default: false };

function AddressesTab() {
  const [addrs, setAddrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(EMPTY_ADDR);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getAddresses().then((l) => setAddrs(l || [])).catch(() => setAddrs([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm(EMPTY_ADDR); setFormError(''); setEditing('new'); };
  const startEdit = (a) => {
    setForm({
      full_name: a.full_name || '', phone: a.phone_number || a.phone || '', address: a.address || '',
      city: a.city || '', state: a.state || '', pincode: a.postal_code || a.pincode || '',
      country: a.country || 'India', is_default: !!a.is_default,
    });
    setFormError('');
    setEditing(a.id);
  };
  const cancel = () => { setEditing(null); setForm(EMPTY_ADDR); setFormError(''); };

  const save = async (e) => {
    e.preventDefault();
    const errs = [];
    if (form.full_name.trim().length < 2) errs.push('name');
    if (!/^[6-9]\d{9}$/.test(form.phone)) errs.push('a valid 10-digit mobile');
    if (form.address.trim().length < 10) errs.push('the full street address');
    if (!form.city.trim()) errs.push('city');
    if (!form.state.trim()) errs.push('state');
    if (!/^\d{6}$/.test(form.pincode)) errs.push('a 6-digit PIN code');
    if (errs.length) { setFormError(`Please add ${errs.join(', ')}.`); return; }
    setSaving(true);
    try {
      if (editing === 'new') { await createAddress(form); toastAddressAdded(); }
      else { await updateAddress(editing, form); toastAddressUpdated(); }
      cancel();
      load();
    } catch (err) {
      setFormError(err.message || 'Save failed');
      toastAddressError(err.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const askDelete = (a) => setDialog({
    title: 'Delete this address?',
    message: `${a.full_name}, ${a.city} — this can’t be undone.`,
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: async () => {
      setBusyId(a.id);
      try { await deleteAddress(a.id); toastAddressDeleted(); load(); }
      catch (err) { toastAddressError(err.message || 'Delete failed'); }
      finally { setBusyId(null); }
    },
  });

  const makeDefault = async (id) => {
    setBusyId(id);
    try { await setDefaultAddress(id); toastAddressDefault(); load(); }
    catch (err) { toastAddressError(err.message || 'Failed to set default'); }
    finally { setBusyId(null); }
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  if (loading) return <div className="m-empty" style={{ padding: '40px 24px' }}><p>Loading addresses…</p></div>;

  return (
    <>
      {editing ? (
        <form className="m-formcard" onSubmit={save} noValidate style={{ marginBottom: 18 }}>
          <span className="m-eyebrow">{editing === 'new' ? 'New address' : 'Edit address'}</span>
          <div className="m-grid2" style={{ marginTop: 16 }}>
            <div className="m-field"><label className="m-label" htmlFor="a-name">Full name</label><input id="a-name" className="m-input" value={form.full_name} onChange={set('full_name')} autoComplete="name" /></div>
            <div className="m-field"><label className="m-label" htmlFor="a-phone">Mobile</label><input id="a-phone" className="m-input" inputMode="numeric" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit mobile" autoComplete="tel-national" /></div>
          </div>
          <div className="m-field"><label className="m-label" htmlFor="a-addr">Address</label><input id="a-addr" className="m-input" value={form.address} onChange={set('address')} placeholder="House / flat, street, area" autoComplete="street-address" /></div>
          <div className="m-grid2">
            <div className="m-field"><label className="m-label" htmlFor="a-city">City</label><input id="a-city" className="m-input" value={form.city} onChange={set('city')} autoComplete="address-level2" /></div>
            <div className="m-field"><label className="m-label" htmlFor="a-state">State</label><input id="a-state" className="m-input" value={form.state} onChange={set('state')} autoComplete="address-level1" /></div>
            <div className="m-field"><label className="m-label" htmlFor="a-pin">PIN code</label><input id="a-pin" className="m-input" inputMode="numeric" value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} autoComplete="postal-code" /></div>
            <div className="m-field"><label className="m-label" htmlFor="a-country">Country</label><input id="a-country" className="m-input" value={form.country} onChange={set('country')} autoComplete="country-name" /></div>
          </div>
          <label className="m-check"><input type="checkbox" checked={form.is_default} onChange={() => setForm((p) => ({ ...p, is_default: !p.is_default }))} /> Use as my default delivery address</label>
          {formError ? <p className="m-formerr" role="alert">{formError}</p> : null}
          <div className="m-modal__actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="m-btn m-btn--fill" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Save address' : 'Update address'}</button>
            <button type="button" className="m-btn m-btn--ghost" onClick={cancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className="m-addcard" onClick={startNew}>+ Add a new address</button>
      )}

      {addrs.length === 0 && editing !== 'new' ? (
        <div className="m-empty" style={{ padding: '36px 24px' }}><h3>No saved addresses</h3><p>Add one to check out faster.</p></div>
      ) : (
        <ul className="m-addrgrid">
          {addrs.filter((a) => a.id !== editing).map((a) => (
            <li key={a.id} className="m-ordcard m-addr">
              <div className="m-ordhead">
                <b className="m-crow__n" style={{ fontSize: 18 }}>{a.full_name}</b>
                {a.is_default ? <span className="m-badge">Default</span> : null}
              </div>
              <p className="m-muted" style={{ marginTop: 8 }}>{a.address}<br />{a.city}, {a.state} — {a.postal_code}<br />{a.country || 'India'} · {a.phone_number || a.phone}</p>
              <div className="m-oactions">
                {!a.is_default ? <button type="button" className="m-linkbtn" disabled={busyId === a.id} onClick={() => makeDefault(a.id)}>Make default</button> : null}
                <button type="button" className="m-linkbtn" onClick={() => startEdit(a)}>Edit</button>
                <button type="button" className="m-linkbtn m-linkbtn--danger" disabled={busyId === a.id} onClick={() => askDelete(a)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

/* ─────────────── Profile & privacy ─────────────── */
function ProfileTab({ user, fetchUser, logout }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: user.username || '', email: user.email && !/@phone\./.test(user.email) ? user.email : '' });
  const [saving, setSaving] = useState(false);
  const [dl, setDl] = useState({ busy: false, error: '' });
  const [del, setDel] = useState({ open: false, consent: false, busy: false, error: '', done: false });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ username: form.username.trim(), ...(form.email.trim() ? { email: form.email.trim() } : {}) });
      await fetchUser();
      toastProfileUpdated();
    } catch (err) { toastProfileError(err.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  // DPDP data rights: download a copy of the data held, or erase the account.
  const download = async () => {
    setDl({ busy: true, error: '' });
    try {
      const blob = await exportMyData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velmique-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setDl({ busy: false, error: '' });
    } catch (err) { setDl({ busy: false, error: err.message || 'Could not prepare your data. Please try again.' }); }
  };
  const erase = async () => {
    setDel((d) => ({ ...d, busy: true, error: '' }));
    try {
      await deleteAccount();
      try { await logout(); } catch { /* session cleared regardless */ }
      setDel((d) => ({ ...d, busy: false, done: true }));
      setTimeout(() => router.push('/'), 3500);
    } catch (err) { setDel((d) => ({ ...d, busy: false, error: err.message || 'Could not delete your account. Please try again.' })); }
  };

  return (
    <>
      <form className="m-formcard" onSubmit={save}>
        <span className="m-eyebrow">Your details</span>
        <div className="m-grid2" style={{ marginTop: 16 }}>
          <div className="m-field"><label className="m-label" htmlFor="p-name">Name</label><input id="p-name" className="m-input" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} autoComplete="name" /></div>
          <div className="m-field"><label className="m-label" htmlFor="p-email">Email</label><input id="p-email" className="m-input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} autoComplete="email" /></div>
        </div>
        <div className="m-field"><span className="m-label">Mobile (your login)</span><p>{user.phone ? `+91 ${user.phone}` : '—'}</p></div>
        <button type="submit" className="m-btn m-btn--fill" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </form>

      <section className="m-formcard" style={{ marginTop: 18 }} aria-labelledby="m-privacy-h">
        <span className="m-eyebrow" id="m-privacy-h">Your data &amp; privacy</span>
        <p className="m-muted" style={{ margin: '12px 0 16px', fontSize: 13.5, lineHeight: 1.7 }}>
          Download a copy of the personal data we hold about your account, or permanently delete your account under the
          DPDP Act, 2023. Order and invoice records are kept in anonymised form as tax law requires; everything else is erased.
        </p>
        <div className="m-modal__actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="m-btn m-btn--ghost" onClick={download} disabled={dl.busy}>{dl.busy ? 'Preparing…' : 'Download my data'}</button>
          <button type="button" className="m-btn m-btn--danger-ghost" onClick={() => setDel({ open: true, consent: false, busy: false, error: '', done: false })}>Delete account</button>
        </div>
        {dl.error ? <p className="m-formerr" role="alert">{dl.error}</p> : null}
      </section>

      {del.open ? (
        <div className="m-modal" role="presentation" onClick={(e) => { if (e.target === e.currentTarget && !del.busy && !del.done) setDel((d) => ({ ...d, open: false })); }}>
          <div className="m-modal__card m-modal__card--sm" role="alertdialog" aria-modal="true" aria-labelledby="m-del-h">
            {del.done ? (
              <>
                <h2 id="m-del-h" className="m-modal__h">Account deleted</h2>
                <p className="m-modal__p">Your account and personal data have been permanently deleted and you have been signed out. Taking you home…</p>
              </>
            ) : (
              <>
                <h2 id="m-del-h" className="m-modal__h" style={{ color: 'var(--m-rose)' }}>Delete your account?</h2>
                <p className="m-modal__p">This permanently deletes your account and personal data — addresses, wishlist and contact history. This can&rsquo;t be undone.</p>
                <label className="m-check"><input type="checkbox" checked={del.consent} onChange={(e) => setDel((d) => ({ ...d, consent: e.target.checked }))} /> I understand and consent to this permanent erasure.</label>
                {del.error ? <p className="m-formerr" role="alert">{del.error}</p> : null}
                <div className="m-modal__actions">
                  <button type="button" className="m-btn m-btn--ghost" disabled={del.busy} onClick={() => setDel((d) => ({ ...d, open: false }))}>Cancel</button>
                  <button type="button" className="m-btn m-btn--danger" disabled={!del.consent || del.busy} onClick={erase}>{del.busy ? 'Deleting…' : 'Permanently delete'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
