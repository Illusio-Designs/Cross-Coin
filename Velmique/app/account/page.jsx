'use client';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Package, LogOut, ArrowUpRight,
  MapPin, Plus, Pencil, Trash2, Check, X, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/layout/PageHeader';
import { updateProfile } from '@/lib/api/auth';
import { getUserOrders, cancelOrder } from '@/lib/api/orders';
import {
  getAddresses, createAddress, updateAddress,
  deleteAddress, setDefaultAddress,
} from '@/lib/api/addresses';

const TABS = [
  { key: 'orders',    label: 'My Orders',     icon: Package },
  { key: 'addresses', label: 'Addresses',     icon: MapPin },
  { key: 'details',   label: 'Account',       icon: User },
];

const EMPTY_ADDR = {
  full_name: '', phone: '', address: '',
  city: '', state: '', pincode: '', country: 'India', is_default: false,
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  const map = {
    pending:        { bg: '#fff7ed', fg: '#9a3412', label: 'Pending' },
    processing:     { bg: '#fef3c7', fg: '#92400e', label: 'Processing' },
    shipped:        { bg: '#dbeafe', fg: '#1e40af', label: 'Shipped' },
    'in transit':   { bg: '#dbeafe', fg: '#1e40af', label: 'In Transit' },
    delivered:      { bg: '#dcfce7', fg: '#166534', label: 'Delivered' },
    cancelled:      { bg: '#fee2e2', fg: '#991b1b', label: 'Cancelled' },
  };
  return map[s] || { bg: '#f3f4f6', fg: '#374151', label: status || 'Unknown' };
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout, fetchUser } = useAuth();

  const [tab, setTab] = useState('orders');
  const [toast, setToast] = useState(null);

  // Auth gate
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, router]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg)] min-h-screen flex items-center justify-center">
        <p className="text-[var(--ink-muted)] text-xs tracking-[0.3em] uppercase font-body">Loading…</p>
      </div>
    );
  }
  if (!user) return null;

  const firstName = (user.username || user.name || 'friend').split(' ')[0];

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="MY"
        accent="ACCOUNT"
        intro="Your orders, addresses and personal details — all in one place."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">

        {/* Profile header card */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-7 mb-6 flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0">
            <User size={26} className="text-[var(--gold-deep)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif italic text-[var(--ink)] text-2xl truncate">{user.username || 'Velmique Member'}</h2>
            <p className="text-[var(--ink-soft)] text-sm font-body truncate">{user.email || user.phone}</p>
            <p className="text-[var(--gold-deep)] text-[10px] font-body mt-1 tracking-[0.3em] uppercase">
              Velmique Inner Circle
            </p>
          </div>
          <button
            onClick={async () => { await logout(); router.replace('/login'); }}
            className="inline-flex items-center gap-2 text-[var(--ink-muted)] hover:text-red-600 transition-colors text-[10px] tracking-[0.3em] uppercase font-body shrink-0"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Tabs nav */}
        <div className="flex gap-1 md:gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] tracking-[0.25em] uppercase font-body transition-all ${
                  active
                    ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                    : 'border border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon size={13} strokeWidth={1.6} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === 'orders'    && <OrdersTab    showToast={showToast} />}
        {tab === 'addresses' && <AddressesTab showToast={showToast} />}
        {tab === 'details'   && <DetailsTab   user={user} fetchUser={fetchUser} showToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-xs font-body tracking-wider shadow-lg ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-[var(--ink)] text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── ORDERS TAB ─────────────────────────── */
function OrdersTab({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getUserOrders({ limit: 20 })
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id) => {
    const reason = window.prompt('Reason for cancellation (optional):') ?? '';
    setCancellingId(id);
    try {
      await cancelOrder(id, reason);
      showToast('Order cancelled');
      load();
    } catch (err) {
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <CardLoader text="Loading your orders…" />;

  if (!orders.length) return (
    <EmptyCard
      icon={Package}
      title="No orders yet"
      subtitle="Your first scent awaits."
      cta={{ label: 'Explore Fragrances', href: '/shop' }}
    />
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {orders.map(order => {
        const statusInfo = statusBadge(order.status);
        const isCancellable = ['pending', 'processing', 'awaiting_confirmation'].includes(String(order.status || '').toLowerCase());
        const total = order.final_amount ?? order.total ?? order.totalAmount ?? 0;
        const items = order.OrderItems || order.items || [];
        const orderRef = order.order_number || order.orderNumber || `#${order.id}`;

        return (
          <article key={order.id} className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col">
            {/* Header strip */}
            <header className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[var(--gold-deep)] text-[9px] tracking-[0.35em] uppercase font-body mb-1">Order</p>
                <p className="font-serif italic text-[var(--ink)] text-base md:text-lg leading-tight truncate">{orderRef}</p>
                <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.2em] uppercase font-body mt-1">
                  {fmtDate(order.createdAt || order.created_at)}
                </p>
              </div>
              <span className="shrink-0 inline-block text-[9px] tracking-[0.25em] uppercase font-body rounded-full px-2.5 py-1"
                style={{ background: statusInfo.bg, color: statusInfo.fg }}>
                {statusInfo.label}
              </span>
            </header>

            {/* Item image stack + summary */}
            <div className="px-5 py-4 flex-1 flex gap-3 items-start">
              <div className="flex -space-x-3">
                {items.slice(0, 3).map((it, idx) => {
                  const img = pickItemImage(it);
                  return (
                    <div key={it.id || idx}
                      className="w-16 h-20 rounded-md overflow-hidden border-2 border-white bg-[var(--surface-2)] shrink-0 shadow-sm">
                      {img
                        ? <img src={img} alt={it.Product?.name || it.name || ''} className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : <div className="w-full h-full flex items-center justify-center text-[var(--ink-muted)] text-[9px] tracking-wider uppercase font-body">No image</div>
                      }
                    </div>
                  );
                })}
                {items.length > 3 && (
                  <div className="w-16 h-20 rounded-md border-2 border-white bg-[var(--surface)] shrink-0 flex items-center justify-center font-serif italic text-[var(--ink)] text-base shadow-sm">
                    +{items.length - 3}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.25em] uppercase font-body mb-1.5">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-1">
                  {items.slice(0, 2).map((it, idx) => (
                    <li key={it.id || idx} className="text-[var(--ink)] text-xs font-body truncate">
                      {(it.Product?.name || it.name || 'Item')}
                      {it.quantity ? <span className="text-[var(--ink-muted)]"> × {it.quantity}</span> : null}
                    </li>
                  ))}
                  {items.length > 2 && (
                    <li className="text-[var(--ink-muted)] text-[11px] font-body italic">+ {items.length - 2} more</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <footer className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[var(--ink-muted)] text-[9px] tracking-[0.25em] uppercase font-body">Total</p>
                <p className="font-serif italic text-[var(--ink)] text-xl">{fmt(total)}</p>
              </div>
              <div className="flex items-center gap-3">
                {isCancellable && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    className="text-[10px] tracking-[0.3em] uppercase font-body text-[var(--ink-muted)] hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {cancellingId === order.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
                <Link
                  href={`/track-order?order=${encodeURIComponent(orderRef)}`}
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase font-body bg-[var(--ink)] text-white rounded-full px-4 py-2 hover:bg-[var(--gold-deep)] transition-colors"
                >
                  Track <ChevronRight size={12} />
                </Link>
              </div>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  ?? process.env.NEXT_PUBLIC_IMAGEKIT_URL
  ?? 'https://ik.imagekit.io/wp2oatzmf';

function resolveImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw;
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

/* Pull the best image URL out of a Product / OrderItem regardless of which
   relation the backend included on this row, then resolve it against the
   ImageKit base if it's relative. */
function pickItemImage(it) {
  const p = it.Product || it.product || {};
  const v = it.ProductVariation || it.variation || {};
  const raw =
    p.image ||
    p.ProductImages?.[0]?.image_url ||
    p.images?.[0]?.image_url ||
    p.images?.[0]?.url ||
    v.images?.[0]?.image_url ||
    v.VariationImages?.[0]?.image_url ||
    it.image ||
    '';
  return resolveImageUrl(raw);
}

/* ───────────────────────── ADDRESSES TAB ────────────────────────── */
function AddressesTab({ showToast }) {
  const [addrs, setAddrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(EMPTY_ADDR);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getAddresses()
      .then(list => setAddrs(list || []))
      .catch(() => setAddrs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm(EMPTY_ADDR); setEditing('new'); };
  const startEdit = (a) => {
    setForm({
      full_name:   a.full_name    || '',
      phone:       a.phone_number || a.phone || '',
      address:     a.address      || '',
      city:        a.city         || '',
      state:       a.state        || '',
      pincode:     a.postal_code  || a.pincode || '',
      country:     a.country      || 'India',
      is_default:  a.is_default   || false,
    });
    setEditing(a.id);
  };
  const cancel = () => { setEditing(null); setForm(EMPTY_ADDR); };

  const handleSave = async () => {
    // Light validation
    if (!form.full_name.trim() || !form.phone.replace(/\D/g, '').length || !form.address.trim() ||
        !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (!/^\d{6}$/.test(form.pincode)) {
      showToast('PIN must be 6 digits', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editing === 'new') {
        await createAddress(form);
        showToast('Address added');
      } else {
        await updateAddress(editing, form);
        showToast('Address updated');
      }
      cancel();
      load();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    setBusyId(id);
    try {
      await deleteAddress(id);
      showToast('Address removed');
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (id) => {
    setBusyId(id);
    try {
      await setDefaultAddress(id);
      showToast('Default address updated');
      load();
    } catch (err) {
      showToast(err.message || 'Failed to set default', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <CardLoader text="Loading addresses…" />;

  const visibleAddrs = addrs.filter(a => editing !== a.id);

  return (
    <div className="space-y-4">
      {/* Add new button — stays full-width (action element) */}
      {editing !== 'new' && (
        <button
          onClick={startNew}
          className="w-full bg-white border border-dashed border-[var(--border)] hover:border-[var(--gold)] rounded-2xl p-5 flex items-center justify-center gap-2 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors text-[11px] tracking-[0.3em] uppercase font-body"
        >
          <Plus size={14} /> Add New Address
        </button>
      )}

      {/* Form — full-width while editing */}
      {editing && <AddressForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancel} saving={saving} isNew={editing === 'new'} />}

      {/* Empty state */}
      {addrs.length === 0 && editing !== 'new' && (
        <EmptyCard icon={MapPin} title="No saved addresses" subtitle="Add one to speed up checkout." />
      )}

      {/* List — 2 per row on desktop, 1 per row on mobile */}
      {visibleAddrs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleAddrs.map(a => (
            <div key={a.id} className="bg-white border border-[var(--border)] rounded-2xl p-6 flex flex-col">
              {/* Top: name + default badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <p className="font-serif italic text-[var(--ink)] text-lg truncate">{a.full_name}</p>
                  {a.is_default && (
                    <span className="inline-block text-[9px] tracking-[0.25em] uppercase font-body bg-[var(--gold)] text-[var(--ink)] rounded-full px-2.5 py-0.5 shrink-0">
                      Default
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1">
                <p className="text-sm text-[var(--ink-soft)] font-body leading-relaxed">{a.address}</p>
                <p className="text-sm text-[var(--ink-soft)] font-body">
                  {a.city}, {a.state} — {a.postal_code}
                </p>
                <p className="text-sm text-[var(--ink-muted)] font-body mt-1">
                  {a.country || 'India'} · {a.phone_number || a.phone}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                {!a.is_default && (
                  <button
                    onClick={() => handleSetDefault(a.id)}
                    disabled={busyId === a.id}
                    title="Set as default"
                    className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--ink-muted)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)] transition-all disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={() => startEdit(a)}
                  title="Edit"
                  className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--ink-muted)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)] transition-all"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={busyId === a.id}
                  title="Delete"
                  className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--ink-muted)] hover:border-red-500 hover:text-red-600 transition-all disabled:opacity-50 ml-auto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressForm({ form, setForm, onSave, onCancel, saving, isNew }) {
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggle = (k) => () => setForm(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="bg-white border border-[var(--gold)] rounded-2xl p-6 md:p-7">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-[var(--ink)] text-xl uppercase tracking-tight">
          {isNew ? 'New Address' : 'Edit Address'}
        </h3>
        <button onClick={onCancel} className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name *" value={form.full_name} onChange={set('full_name')} />
        <Field label="Phone *" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit mobile" />
        <Field label="Address *" value={form.address} onChange={set('address')} className="md:col-span-2" />
        <Field label="City *" value={form.city} onChange={set('city')} />
        <Field label="State *" value={form.state} onChange={set('state')} />
        <Field label="Pincode *" value={form.pincode} onChange={(e) => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="6-digit PIN" />
        <Field label="Country" value={form.country} onChange={set('country')} />
      </div>

      <label className="mt-5 inline-flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_default} onChange={toggle('is_default')} className="accent-[var(--gold)]" />
        <span className="text-xs font-body text-[var(--ink-soft)]">Set as default shipping address</span>
      </label>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-full bg-[var(--ink)] hover:bg-[var(--gold)] hover:text-[var(--ink)] text-white py-3 text-[11px] tracking-[0.3em] uppercase font-body font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : isNew ? 'Save Address' : 'Update Address'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-full border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--ink)] text-[11px] tracking-[0.3em] uppercase font-body transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── DETAILS TAB ──────────────────────────── */
function DetailsTab({ user, fetchUser, showToast }) {
  const [form, setForm] = useState({
    username: user.username || '',
    email:    user.email || '',
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ username: form.username, email: form.email });
      await fetchUser();
      showToast('Profile updated');
      setEditing(false);
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-7">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-[var(--ink)] text-2xl uppercase tracking-tight">Account Details</h3>
        <button
          onClick={editing ? handleSave : () => setEditing(true)}
          disabled={saving}
          className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body hover:underline disabled:opacity-50"
        >
          {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div className="space-y-4">
        <DetailRow label="Name" editable={editing} value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} />
        <DetailRow label="Email" editable={editing} value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
        <DetailRow label="Phone" value={user.phone || '—'} />
        {editing && (
          <p className="text-[10px] text-[var(--ink-muted)] font-body italic">
            Phone number can&apos;t be changed — it&apos;s your login.
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── shared bits ─────────────────────────── */
function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-[10px] tracking-[0.3em] uppercase font-body text-[var(--ink-muted)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="rounded-full border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none focus:border-[var(--gold)] transition-colors font-body"
      />
    </div>
  );
}

function DetailRow({ label, value, editable, onChange }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</p>
      {editable ? (
        <input
          value={value}
          onChange={onChange}
          className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm font-body text-[var(--ink)] outline-none focus:border-[var(--gold)] transition-colors"
        />
      ) : (
        <p className="text-[var(--ink)] font-body text-sm">{value || '—'}</p>
      )}
    </div>
  );
}

function CardLoader({ text }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center">
      <p className="text-[var(--ink-muted)] text-xs tracking-[0.3em] uppercase font-body">{text}</p>
    </div>
  );
}

function EmptyCard({ icon: Icon, title, subtitle, cta }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center">
      <Icon size={28} className="mx-auto mb-3 text-[var(--ink-muted)]" />
      <p className="font-serif italic text-[var(--ink)] text-lg">{title}</p>
      {subtitle && <p className="text-[var(--ink-muted)] text-sm font-body mt-1">{subtitle}</p>}
      {cta && (
        <Link href={cta.href} className="pill-cta mt-5 inline-flex">
          {cta.label} <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}
