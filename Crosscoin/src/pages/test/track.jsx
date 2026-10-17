import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { trackOrder, trackByAwb } from '../../components/test/real';
import { inr } from '../../components/test/data';

const fmt = (d) => { try { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; } catch (_) { return ''; } };

export default function TestTrack() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [mode, setMode] = useState('order'); // 'order' | 'awb'
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const v = term.trim();
    if (!v) return;
    setErr(''); setLoading(true); setOrder(null);
    try {
      const o = mode === 'awb' ? await trackByAwb(v) : await trackOrder(v);
      if (o) setOrder(o); else setErr(mode === 'awb' ? 'No shipment found for that AWB / tracking number.' : 'No order found for that number. Check and try again.');
    } catch (_) { setErr('Could not look up that order right now.'); }
    finally { setLoading(false); }
  };

  const status = order && (order.status || order.order_status || order.current_status || '');
  const items = order && (order.items || order.order_items || order.OrderItems || []);
  const awb = order && (order.awb_number || order.awb || order.tracking_number || '');
  const courier = order && (order.courier_name || order.courier || order.carrier || '');

  return (
    <TestLayout>
      <Head><title>Track order — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push(R.home)}>Home</span> / Track order</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Track your order</h2>
          <div className="trackmode" style={{ display: 'flex', gap: 8, margin: '14px 0 10px' }}>
            <button className={`chip${mode === 'order' ? ' on' : ''}`} onClick={() => { setMode('order'); setErr(''); }}>By order number</button>
            <button className={`chip${mode === 'awb' ? ' on' : ''}`} onClick={() => { setMode('awb'); setErr(''); }}>By AWB / tracking no.</button>
          </div>
          <form className="searchbar" onSubmit={submit}>
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={mode === 'awb' ? 'AWB / tracking number' : 'Order number e.g. CC-123456'} aria-label={mode === 'awb' ? 'AWB number' : 'Order number'} />
            <button className="btn btn--crimson" type="submit">Track</button>
          </form>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60, maxWidth: 760 }}>
        {loading && <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '24px 0' }}>Looking up your order…</p>}
        {err && <p className="mono" style={{ color: 'var(--crimson)', fontSize: 13, padding: '24px 0' }}>{err}</p>}
        {order && (
          <div className="trackcard">
            <div className="trackcard__top">
              <div><span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>ORDER</span><div style={{ fontWeight: 700, fontSize: 18 }}>{order.order_number || order.orderNumber || term}</div></div>
              {status && <span className="statuspill">{String(status).replace(/_/g, ' ')}</span>}
            </div>
            <div className="trackcard__meta mono">
              {order.createdAt || order.created_at ? <span>Placed {fmt(order.createdAt || order.created_at)}</span> : null}
              {courier ? <span>· {courier}</span> : null}
              {awb ? <span>· AWB {awb}</span> : null}
            </div>
            {Array.isArray(items) && items.length > 0 && (
              <div className="trackitems">
                {items.map((it, i) => (
                  <div className="trackitem" key={i}>
                    <span>{it.product_name || it.name || it.productName || `Item ${i + 1}`}{it.quantity ? ` × ${it.quantity}` : ''}</span>
                    {(it.price || it.total) ? <span className="mono">{inr(it.total || it.price)}</span> : null}
                  </div>
                ))}
              </div>
            )}
            {(order.total || order.total_amount || order.grandTotal) ? (
              <div className="trackitem" style={{ fontWeight: 700, borderTop: '2px solid var(--line-ink)', marginTop: 4, paddingTop: 10 }}>
                <span>Total</span><span className="mono">{inr(order.total || order.total_amount || order.grandTotal)}</span>
              </div>
            ) : null}
          </div>
        )}
        {!loading && !order && !err && (
          <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '24px 0' }}>Enter the order number from your confirmation to see live status.</p>
        )}
      </div>
    </TestLayout>
  );
}
