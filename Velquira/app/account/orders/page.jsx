'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import AccountGate from '@/components/account/AccountGate';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { getUserOrders } from '@/lib/api/orders';

function statusClass(s) {
  const v = (s || '').toLowerCase();
  if (v === 'delivered') return 'ok';
  if (v === 'cancelled') return 'bad';
  return 'pending';
}

function OrdersList() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserOrders({ limit: 50 });
      setOrders(data?.orders || data?.data || (Array.isArray(data) ? data : []));
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs">
        <Link href="/account">Account</Link> <span>/</span> <b>Orders</b>
      </nav>
      <div className="page-hero"><span className="eyebrow">Account</span><h1>My orders</h1></div>

      {loading ? (
        <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={72} radius={14} />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="cart-empty">
          <Icon name="ShoppingBag" size={40} color="#c3ccd2" />
          <p>You haven’t placed any orders yet.</p>
          <Link href="/products" className="btn btn-primary">Start shopping</Link>
        </div>
      ) : (
        <div className="order-list" style={{ marginTop: 24 }}>
          {orders.map((o) => (
            <Link href={`/account/orders/${o.id}`} className="order-row" key={o.id}>
              <div>
                <b>#{o.order_number}</b>
                <span className="muted">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
              </div>
              <span className={`order-status ${statusClass(o.status)}`}>{o.status}</span>
              <b>₹{Number(o.final_amount || o.total_amount || 0).toFixed(0)}</b>
              <Icon name="ArrowRight" size={15} color="#6a7186" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return <AccountGate title="My orders"><OrdersList /></AccountGate>;
}
