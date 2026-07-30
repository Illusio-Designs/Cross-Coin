'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import AccountGate from '@/components/account/AccountGate';
import { Skeleton } from '@/components/ui/Skeleton';
import ShimmerImg from '@/components/ui/ShimmerImg';
import { useAuth } from '@/context/AuthContext';
import { getOrder, cancelOrder } from '@/lib/api/orders';

// Order-item images are ImageKit assets. Absolute URLs pass through; relative
// paths get the ImageKit endpoint (NOT the API host, which 404s on these paths
// and left the order thumbnails blank).
const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL
  || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  || 'https://ik.imagekit.io/wp2oatzmf';
function resolveOrderImg(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw;
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

function statusClass(s) {
  const v = (s || '').toLowerCase();
  if (v === 'delivered') return 'ok';
  if (v === 'cancelled') return 'bad';
  return 'pending';
}

function OrderDetail({ id }) {
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrder(id);
      setOrder(data?.order || data);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const doCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try { await cancelOrder(order.id, 'Requested by customer'); await load(); }
    catch {} finally { setCancelling(false); }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
          <Skeleton height={30} width="40%" />
          <Skeleton height={120} radius={16} />
          <Skeleton height={200} radius={16} />
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div className="cart-empty">
          <Icon name="ShoppingBag" size={40} color="#c3ccd2" />
          <p>We couldn’t find that order.</p>
          <Link href="/account/orders" className="btn btn-primary">Back to orders</Link>
        </div>
      </div>
    );
  }

  const items = order.OrderItems || order.items || order.order_items || [];
  const canCancel = !['delivered', 'cancelled', 'shipped'].includes((order.status || '').toLowerCase());

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs">
        <Link href="/account">Account</Link> <span>/</span> <Link href="/account/orders">Orders</Link> <span>/</span> <b>#{order.order_number}</b>
      </nav>

      <div className="account-head">
        <div className="page-hero">
          <span className="eyebrow">Order</span>
          <h1>#{order.order_number}</h1>
          <p>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
        </div>
        <span className={`order-status ${statusClass(order.status)}`} style={{ height: 'fit-content' }}>{order.status}</span>
      </div>

      <div className="order-detail-grid">
        <div className="order-items-card">
          <h3>Items</h3>
          {items.length === 0 ? <p className="muted">No item details available.</p> : items.map((it, i) => {
            const name = it.name || it.product?.name || it.Product?.name || it.product_name || 'Item';
            const rawImg = it.image || it.image_url || it.product?.image || it.Product?.image
              || it.product?.ProductImages?.[0]?.image_url || it.Product?.ProductImages?.[0]?.image_url
              || it.variation?.VariationImages?.[0]?.image_url || it.ProductVariation?.VariationImages?.[0]?.image_url || '';
            const img = resolveOrderImg(rawImg);
            const price = Number(it.price || it.unit_price || 0);
            const qty = it.quantity || it.qty || 1;
            return (
              <div className="order-item" key={i}>
                <div className="order-item-thumb">
                  {img ? <ShimmerImg src={img} alt="" /> : <Icon name="Footprints" size={22} color="#c3ccd2" />}
                </div>
                <div className="order-item-info"><b>{name}</b>{it.size && <span className="muted">Size {it.size}</span>}<span className="muted">Qty {qty}</span></div>
                <b>₹{(price * qty).toFixed(0)}</b>
              </div>
            );
          })}
        </div>

        <aside className="order-summary-card">
          <h3>Summary</h3>
          <div className="row"><span className="muted">Subtotal</span><b>₹{Number(order.total_amount || order.subtotal || 0).toFixed(0)}</b></div>
          {order.shipping_fee != null && <div className="row"><span className="muted">Shipping</span><b>₹{Number(order.shipping_fee).toFixed(0)}</b></div>}
          {Number(order.discount_amount) > 0 && <div className="row"><span className="muted">Discount</span><b style={{ color: 'var(--teal-600)' }}>−₹{Number(order.discount_amount).toFixed(0)}</b></div>}
          <div className="row total"><span>Total</span><b>₹{Number(order.final_amount || order.total_amount || 0).toFixed(0)}</b></div>
          {order.payment_type && <div className="row"><span className="muted">Payment</span><b style={{ textTransform: 'uppercase' }}>{order.payment_type}</b></div>}

          {order.shipping_address && (
            <div className="order-address">
              <span className="muted">Delivery to</span>
              <p>{order.shipping_address.full_name || order.shipping_address.fullName}<br />
                {order.shipping_address.address}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code || order.shipping_address.pincode}</p>
            </div>
          )}

          <Link href={`/track-order?order=${order.order_number}`} className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }}>Track order</Link>
          {canCancel && (
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={doCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }) {
  const { id } = use(params);
  return <AccountGate title="Order details"><OrderDetail id={id} /></AccountGate>;
}
