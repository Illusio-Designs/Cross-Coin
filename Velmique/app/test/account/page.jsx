'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getUserOrders } from '@/lib/api/orders';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

export default function MaisonAccount() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [oLoading, setOLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!isAuthenticated) { setOLoading(false); return; }
    getUserOrders({ limit: 20 })
      .then((list) => { if (alive) { setOrders(Array.isArray(list) ? list : []); setOLoading(false); } })
      .catch(() => { if (alive) { setOrders([]); setOLoading(false); } });
    return () => { alive = false; };
  }, [isAuthenticated]);

  if (loading) {
    return <div className="m-wrap m-ph"><h1>My Account.</h1><p>Loading…</p></div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        <section className="m-wrap m-ph"><span className="m-eyebrow">Your account</span><h1>Welcome Back.</h1></section>
        <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
          <div className="m-empty">
            <h3>Sign in to continue</h3>
            <p style={{ marginBottom: 20 }}>Access your orders, addresses and wishlist.</p>
            <Link className="m-btn m-btn--fill" href="/test/login" style={{ justifyContent: 'center' }}>Sign in</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="m-wrap m-ph"><span className="m-eyebrow">Your account</span><h1>My Maison.</h1></section>
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <div className="m-acct">
          <aside className="m-acctside">
            <div className="nm">{user?.name || user?.username || 'Welcome'}</div>
            {user?.email ? <div className="em">{user.email}</div> : null}
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              <Link className="m-btn m-btn--ghost" href="/test/track-order" style={{ justifyContent: 'center' }}>Track an order</Link>
              <Link className="m-btn m-btn--ghost" href="/test/wishlist" style={{ justifyContent: 'center' }}>Wishlist</Link>
              <button className="m-btn m-btn--ghost" onClick={logout} style={{ justifyContent: 'center' }}>Sign out</button>
            </div>
          </aside>

          <div>
            <h2 style={{ fontSize: 'clamp(24px,3vw,34px)', marginBottom: 18 }}>Order History</h2>
            {oLoading ? (
              <div className="m-empty" style={{ padding: '40px 24px' }}><p>Loading your orders…</p></div>
            ) : orders.length ? (
              orders.map((o) => (
                <div className="m-ordrow" key={o.id || o.order_number}>
                  <div>
                    <div className="onum">#{o.order_number || o.orderNumber || o.id}</div>
                    <div className="ometa">{fmtDate(o.created_at || o.createdAt)} · {fmt(o.final_amount || o.total || o.finalAmount)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="m-badge" style={{ background: 'var(--m-bg-tint)', color: 'var(--m-ink)' }}>{String(o.status || 'Pending').replace(/_/g, ' ')}</span>
                    <Link className="m-btn m-btn--ghost" href={`/test/track-order?order=${encodeURIComponent(o.order_number || o.orderNumber || '')}`} style={{ padding: '10px 16px' }}>Track</Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="m-empty" style={{ padding: '40px 24px' }}>
                <h3>No orders yet</h3>
                <p style={{ marginBottom: 20 }}>Your signature scent is waiting.</p>
                <Link className="m-btn m-btn--fill" href="/test/shop" style={{ justifyContent: 'center' }}>Explore the collection</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
