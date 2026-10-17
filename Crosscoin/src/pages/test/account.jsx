import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I, toast } from '../../components/test/ui';
import { inr } from '../../components/test/data';
import { useAuthed, signOut, fetchMe, fetchMyOrders, fetchMyAddresses } from '../../components/test/auth';

const fmt = (d) => { try { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; } catch (_) { return ''; } };
const initials = (n) => (n || 'You').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const statusClass = (s) => {
  const x = (s || '').toLowerCase();
  if (x.includes('deliver')) return 'pill--ok';
  if (x.includes('cancel')) return 'pill--no';
  return 'pill--info';
};
const statusLabel = (s) => (s ? String(s).split(/[_\s]+/).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : 'Pending');
const TABS = [['orders', 'My Orders'], ['addr', 'Addresses'], ['acct', 'Account Details']];

export default function TestAccount() {
  const router = useRouter();
  const authed = useAuthed();
  const [tab, setTab] = useState('orders');
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authed) return;
    let off = false;
    setLoading(true);
    Promise.all([fetchMe(), fetchMyOrders(), fetchMyAddresses()])
      .then(([m, o, a]) => { if (off) return; setMe(m); setOrders(o); setAddresses(a); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [authed]);

  const name = me?.username || me?.name || me?.firstName || '';
  const contact = [me?.phone && `+91 ${String(me.phone).slice(-10)}`, me?.email].filter(Boolean).join(' · ');
  const doSignOut = () => { signOut(); toast('Signed out'); };

  const tiles = useMemo(() => ([
    ['Track an order', 'Live status by order number or AWB.', '/test/track'],
    ['Returns', 'Start a return within 7 days.', '/test/returns'],
    ['Your wishlist', 'Everything you saved to buy later.', '/test/wishlist'],
    ['Shop the mint', 'Browse the full catalogue.', '/test/shop'],
  ]), []);

  return (
    <TestLayout>
      <Head><title>Account — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Account</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Your account</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60, maxWidth: 860 }}>
        {!authed ? (
          <>
            <div className="acctsignin">
              <div className="acctsignin__ic">{I.user(26)}</div>
              <div className="acctsignin__t"><b>Sign in to CrossCoin</b><span>Track orders, save addresses and get member offers. You can also check out as a guest.</span></div>
              <div className="acctsignin__btns">
                <button className="btn btn--crimson" onClick={() => router.push('/test/login')}>Sign in</button>
                <button className="btn" onClick={() => router.push('/test/register')}>Create account</button>
              </div>
            </div>
            <div className="collgrid" style={{ marginTop: 22 }}>
              {tiles.map(([t, d, href]) => (
                <button className="acctile" key={t} onClick={() => router.push(href)}>
                  <span className="acctile__ic">{I.arrow(18)}</span><b>{t}</b><span className="acctile__d">{d}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Signed-in header */}
            <div className="phead">
              <div className="phead__av">{initials(name)}</div>
              <div className="phead__who"><b>{name || 'Welcome back'}</b><span>{contact || 'CrossCoin member'}</span></div>
              <div className="phead__stats">
                <div className="pstat"><b>{orders.length}</b><span>Orders</span></div>
                <div className="pstat"><b>{addresses.length}</b><span>Saved</span></div>
              </div>
              <button className="btn" onClick={doSignOut}>Sign out</button>
            </div>

            <div className="accttabs">
              {TABS.map(([k, label]) => <button key={k} className={`accttab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{label}</button>)}
            </div>

            {loading && <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '18px 0' }}>Loading your account…</p>}

            {!loading && tab === 'orders' && (
              orders.length === 0
                ? <div className="acctempty mono">No orders yet. <a onClick={() => router.push('/test/shop')} style={{ color: 'var(--crimson)', cursor: 'pointer' }}>Start shopping</a></div>
                : orders.map((o) => (
                  <div className="order" key={o.id || o.number}>
                    <div className="order__top">
                      <div><div className="order__no">{o.number}</div>{o.date && <div className="order__date">Placed {fmt(o.date)}</div>}</div>
                      <span className={`pill ${statusClass(o.status)}`}>{statusLabel(o.status)}</span>
                    </div>
                    {o.items.length > 0 && <div className="order__items2">{o.items.map((it, i) => <span key={i} className="oitem2"><b>{it.name}</b>{it.variant ? ` · ${it.variant}` : ''} ×{it.qty}</span>)}</div>}
                    <div className="order__bot">
                      <div className="order__total">Total <b>{inr(o.total)}</b></div>
                      <div className="order__acts"><button className="btn btn--sm" onClick={() => router.push(`/test/track?order=${encodeURIComponent(o.number.replace('#', ''))}`)}>Track</button><button className="btn btn--sm" onClick={() => router.push('/test/returns')}>Return</button></div>
                    </div>
                  </div>
                ))
            )}

            {!loading && tab === 'addr' && (
              addresses.length === 0
                ? <div className="acctempty mono">No saved addresses yet — they&rsquo;ll appear here after your first order.</div>
                : addresses.map((a, i) => (
                  <div className={`addr${a.isDefault || a.is_default ? ' def' : ''}`} key={a.id || i}>
                    {(a.isDefault || a.is_default) && <span className="addr__tag">Default</span>}
                    <b>{a.fullName || a.full_name || name || 'Delivery address'}</b>
                    <p>{[a.address, a.landmark, a.city, a.state, a.postalCode || a.postal_code || a.pincode].filter(Boolean).join(', ')}<br />{a.phoneNumber || a.phone_number || a.phone || ''}</p>
                  </div>
                ))
            )}

            {!loading && tab === 'acct' && (
              <div style={{ maxWidth: 440 }}>
                <div className="ffield"><label>Name</label><input defaultValue={name} /></div>
                <div className="ffield"><label>Email</label><input defaultValue={me?.email || ''} /></div>
                <div className="ffield"><label>Mobile</label><input defaultValue={me?.phone ? `+91 ${String(me.phone).slice(-10)}` : ''} disabled /></div>
                <button className="btn btn--crimson" onClick={() => toast('Saved ✓')}>Save changes</button>
              </div>
            )}
          </>
        )}
      </div>
    </TestLayout>
  );
}
