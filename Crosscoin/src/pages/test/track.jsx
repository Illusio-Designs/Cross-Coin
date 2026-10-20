import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { trackOrder, trackByAwb } from '../../components/test/real';
import { Sk, SkBusy } from '../../components/test/ui';
import { inr } from '../../components/test/data';
import { orderStatusLabel, orderStatusNote, paymentSummary, isCancelledStatus } from '../../utils/orderStatus';

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

  // /api/orders/track/* answers { order: {...}, items: [...], ... } — read the
  // order fields from `order.order` when present, else from the object itself.
  const info = order && (order.order || order);
  const status = info && (info.status || info.order_status || info.current_status || '');
  const items = order && (order.items || info.items || info.order_items || info.OrderItems || []);
  const awb = info && (info.awb_number || info.awb || info.tracking_number || info.shipping_waybill || '');
  const courier = info && (info.courier_name || info.courier || info.carrier || '');
  const cancelled = !!status && isCancelledStatus(status);
  const note = status ? orderStatusNote(status, info.payment_type) : '';
  const payment = info && (info.payment_type || info.payment_status) ? paymentSummary(info.payment_type, info.payment_status) : '';
  const total = info && (info.final_amount || info.total || info.total_amount || info.grandTotal);

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
        {loading && (
          <SkBusy className="trackcard" label="Looking up your order…">
            <div className="trackcard__top" aria-hidden="true">
              <div className="sk-stack" style={{ gap: 6 }}><Sk w={48} h={10} /><Sk w={150} h={20} /></div>
              <Sk w={96} h={28} />
            </div>
            <div className="trackcard__meta" aria-hidden="true"><Sk w={120} h={11} /><Sk w={90} h={11} /><Sk w={140} h={11} /></div>
            <div className="trackitems" aria-hidden="true">
              {[0, 1].map((i) => <div className="trackitem" key={i}><Sk w={i ? '48%' : '64%'} h={13} /><Sk w={60} h={13} /></div>)}
            </div>
            <div className="trackitem" aria-hidden="true" style={{ borderTop: '2px solid var(--line-ink)', marginTop: 4, paddingTop: 10 }}><Sk w={50} h={14} /><Sk w={70} h={14} /></div>
          </SkBusy>
        )}
        {err && <p className="mono" style={{ color: 'var(--crimson)', fontSize: 13, padding: '24px 0' }}>{err}</p>}
        {order && (
          <div className="trackcard">
            <div className="trackcard__top">
              <div><span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>ORDER</span><div style={{ fontWeight: 700, fontSize: 18 }}>{info.order_number || info.orderNumber || term}</div></div>
              {status && <span className="statuspill">{orderStatusLabel(status)}</span>}
            </div>
            <div className="trackcard__meta mono">
              {info.createdAt || info.created_at ? <span>Placed {fmt(info.createdAt || info.created_at)}</span> : null}
              {courier && !cancelled ? <span>· {courier}</span> : null}
              {awb && !cancelled ? <span>· AWB {awb}</span> : null}
              {payment ? <span>· {payment}</span> : null}
            </div>
            {note && <p className="mono" role="status" style={{ border: '2px solid var(--crimson)', borderRadius: 4, background: 'color-mix(in srgb,var(--crimson) 8%,var(--surface))', color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.55, padding: '10px 12px', margin: '14px 0 0' }}>{note}</p>}
            {cancelled && <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12.5, margin: '14px 0 0' }}>This order was cancelled and won&rsquo;t be shipped.</p>}
            {Array.isArray(items) && items.length > 0 && (
              <div className="trackitems">
                {items.map((it, i) => (
                  <div className="trackitem" key={i}>
                    <span>{it.product_name || it.name || it.productName || it.product?.name || `Item ${i + 1}`}{it.quantity ? ` × ${it.quantity}` : ''}</span>
                    {(it.price || it.total || it.total_price) ? <span className="mono">{inr(it.total || it.total_price || it.price)}</span> : null}
                  </div>
                ))}
              </div>
            )}
            {total ? (
              <div className="trackitem" style={{ fontWeight: 700, borderTop: '2px solid var(--line-ink)', marginTop: 4, paddingTop: 10 }}>
                <span>Total</span><span className="mono">{inr(total)}</span>
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
