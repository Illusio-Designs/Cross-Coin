import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import PageHero from '../components/common/PageHero';
import SeoWrapper from '../components/SeoWrapper';
import { trackOrder } from '../services/orders';

const STEPS = [
  { key: 'placed',           label: 'Order Placed',         short: 'Placed' },
  { key: 'confirmed',        label: 'Confirmed',            short: 'Confirmed' },
  { key: 'dispatched',       label: 'Packed & Dispatched',  short: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery',     short: 'On Way' },
  { key: 'delivered',        label: 'Delivered',            short: 'Delivered' },
];

/* Backend order status → stepper index. */
const STATUS_TO_STEP = {
  pending: 0, placed: 0, created: 0, new: 0,
  confirmed: 1, accepted: 1,
  processing: 2, packed: 2, dispatched: 2, ready_to_ship: 2,
  shipped: 3, out_for_delivery: 3, in_transit: 3,
  delivered: 4, completed: 4,
};

// Order-item images are ImageKit assets. Absolute URLs pass through; relative
// paths get the ImageKit endpoint (NOT the API host, which 404s on these paths).
const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL
  ?? process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  ?? 'https://ik.imagekit.io/wp2oatzmf';
function resolveImg(rawImg) {
  if (!rawImg || typeof rawImg !== 'string') return '';
  let url = rawImg;
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

const fmtDateTime = (v) => {
  if (!v) return '';
  try { return new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return ''; }
};
function buildTimeline(src, finalStatus) {
  const fship = src?.fship_data?.tracking_history;
  if (Array.isArray(fship) && fship.length) {
    return [...fship].reverse().map((h) => ({ status: h.status, note: h.location || h.description || '', time: h.timestamp || h.created_at || '' }));
  }
  const sh = src?.status_history;
  if (Array.isArray(sh) && sh.length) {
    const filtered = String(finalStatus).toLowerCase() !== 'cancelled' ? sh.filter((h) => h.status !== 'cancelled') : sh;
    return [...filtered].reverse().map((h) => ({ status: h.status, note: h.notes || '', time: h.created_at || h.createdAt || '' })).filter((i) => i.status);
  }
  return [];
}

/* Normalise the API order into the shape the page renders. */
function mapOrder(raw, fallbackId) {
  // Backend wraps the payload: { success, data: { order, items, shipping_address, ... } }
  const src = raw?.data || raw || {};
  const o = src.order || src || {};
  const addr = src.shipping_address || o.shipping_address || o.ShippingAddress || o.shippingAddress || {};
  const itemsArr = src.items || o.OrderItems || o.items || o.order_items || [];
  const itemCount = Array.isArray(itemsArr)
    ? itemsArr.reduce((s, it) => s + (Number(it.quantity) || 1), 0)
    : Number(o.item_count || 0);
  const placed = o.created_at || o.createdAt || o.placed_at;
  const addrLine = [addr.city || addr.City, addr.state || addr.State].filter(Boolean).join(', ');
  const pin = addr.postal_code || addr.pincode || addr.postalCode || '';
  const lineItems = (Array.isArray(itemsArr) ? itemsArr : []).map((it) => ({
    name: it.name || it.product?.name || it.Product?.name || it.product_name || 'Item',
    image: resolveImg(it.image || it.product?.image || it.Product?.image || it.image_url || ''),
    qty: Number(it.quantity || it.qty || 1),
    price: Number(it.price || it.unit_price || 0),
  }));
  const status = String(o.status || 'pending').toLowerCase();
  return {
    orderNumber: o.order_number || o.orderNumber || fallbackId,
    placedAt: placed
      ? new Date(placed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
    status,
    items: itemCount,
    lineItems,
    total: Number(o.final_amount || o.total_amount || o.total || 0),
    paymentType: String(o.payment_type || o.paymentType || '').toUpperCase(),
    paymentLabel: String(o.payment_type || '').toLowerCase() === 'cod' ? 'Cash on Delivery' : (String(o.payment_type || o.paymentType || '').toUpperCase() || '—'),
    awb: o.tracking_number || src.tracking?.tracking_number || '',
    trackUrl: o.tracking_url || src.tracking?.tracking_url || '',
    address: [addrLine, pin].filter(Boolean).join(' · '),
    timeline: buildTimeline(src, status),
  };
}

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const runTrack = useCallback(async (id) => {
    setError('');
    if (!id) { setError('Please enter your order number.'); return; }
    setLoading(true);
    setData(null);
    try {
      const raw = await trackOrder(id);
      setData(mapOrder(raw, id));
    } catch {
      setError('Order not found. Please check the order number and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTrack = (e) => {
    e.preventDefault();
    runTrack(orderId.trim());
  };

  // Auto-track when arriving from a placed order (?order=GZ-...).
  useEffect(() => {
    const q = router.query.order;
    if (q) {
      setOrderId(String(q));
      runTrack(String(q));
    }
  }, [router.query.order, runTrack]);

  const cancelled = data?.status === 'cancelled';
  const activeStep = data && !cancelled ? (STATUS_TO_STEP[data.status] ?? 0) : -1;
  const progressPct = activeStep > 0 ? (activeStep / (STEPS.length - 1)) * 100 : 0;

  return (
    <SeoWrapper pageName="track-order">
      <main className="bg-paper">
        <PageHero
          eyebrow="Where is my pair?"
          title="Track"
          accent="your order"
          intro="Enter your order number to see exactly where your pair is in transit."
        />

        <div className="wrap">
          <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-12 md:py-16">

          {/* Search form */}
          <form onSubmit={handleTrack} className="bg-paper-deep border border-line p-6 md:p-7 mb-8">
            <label className="text-[10px] tracking-[0.3em] uppercase text-ink-muted block mb-3">Order number</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. GZ-2026-01284"
                className="flex-1 bg-paper border border-line focus:border-ink outline-none px-5 py-3 text-base text-ink placeholder:text-ink-muted transition-colors"
              />
              <button type="submit" disabled={loading} className="pill-cta justify-center disabled:opacity-50">
                {loading ? 'Tracking…' : 'Track'}
              </button>
            </div>
            {error && <p className="text-clay-deep text-sm mt-4">{error}</p>}
          </form>

          {data && (
            <div className="space-y-6">

              {/* Header card */}
              <section className="bg-paper-deep border border-line p-6 md:p-7">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="eyebrow mb-1">Order</p>
                    <h2 className="font-display text-ink text-2xl md:text-3xl uppercase">#{data.orderNumber}</h2>
                    <p className="text-ink-muted text-xs mt-2 tracking-wider">
                      {[
                        data.placedAt,
                        data.items ? `${data.items} item${data.items === 1 ? '' : 's'}` : null,
                        data.total ? `₹${data.total.toLocaleString('en-IN')}` : null,
                        data.paymentType,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`text-[10px] tracking-[0.3em] uppercase px-3 py-1.5 ${
                    cancelled ? 'bg-clay text-paper' : 'bg-ink text-paper'
                  }`}>
                    {cancelled ? 'Cancelled' : (STEPS[activeStep]?.label || data.status)}
                  </span>
                </div>
              </section>

              {/* Stepper — hidden for cancelled orders */}
              {!cancelled && (
                <section className="bg-paper-deep border border-line p-5 md:p-8">
                  <p className="eyebrow mb-1">Shipment</p>
                  <h3 className="font-display text-ink uppercase tracking-tight text-2xl mb-7">Progress</h3>

                  <div className="relative">
                    <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-line" />
                    <div
                      className="absolute top-4 left-[10%] h-[2px] bg-ink transition-all duration-500"
                      style={{ width: `calc((100% - 20%) * ${progressPct / 100})` }}
                    />
                    <div className="relative grid grid-cols-5 gap-1 sm:gap-2">
                      {STEPS.map((step, i) => {
                        const done   = i < activeStep;
                        const active = i === activeStep;
                        return (
                          <div key={step.key} className="flex flex-col items-center text-center min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 border-2 bg-paper transition-all ${
                                done   ? 'border-ink text-ink' :
                                active ? 'border-ink text-ink ring-4 ring-ink/15' :
                                         'border-line text-ink-muted'
                              }`}
                            >
                              {(done || active)
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                : <span className="text-[11px] font-medium">{i + 1}</span>}
                            </div>
                            <p className={`text-[8px] sm:text-[10px] tracking-[0.05em] sm:tracking-[0.2em] uppercase leading-[1.25] break-words ${done || active ? 'text-ink font-semibold' : 'text-ink-muted'}`}>
                              <span className="hidden sm:inline">{step.label}</span>
                              <span className="sm:hidden">{step.short}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* Timeline */}
              {data.timeline?.length > 0 && (
                <section className="bg-paper-deep border border-line p-6 md:p-7">
                  <p className="eyebrow mb-1">Tracking</p>
                  <h3 className="font-display text-ink text-2xl uppercase mb-5">Timeline</h3>
                  <ol className="relative border-l border-line ml-1 space-y-4">
                    {data.timeline.map((ev, i) => (
                      <li key={i} className="pl-5 relative">
                        <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${i === 0 ? 'bg-ink border-ink' : 'bg-paper border-line'}`} />
                        <p className="text-ink text-sm font-medium capitalize">{String(ev.status).replace(/_/g, ' ')}</p>
                        {ev.note && <p className="text-ink-soft text-xs mt-0.5">{ev.note}</p>}
                        {ev.time && <p className="text-ink-muted text-[10px] tracking-[0.2em] uppercase mt-1">{fmtDateTime(ev.time)}</p>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Items */}
              {data.lineItems?.length > 0 && (
                <section className="bg-paper-deep border border-line p-6 md:p-7">
                  <p className="eyebrow mb-1">In this order</p>
                  <h3 className="font-display text-ink text-2xl uppercase mb-4">Items</h3>
                  <div className="flex flex-col divide-y divide-line">
                    {data.lineItems.map((it, i) => (
                      <div key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="w-16 h-16 shrink-0 border border-line bg-paper overflow-hidden flex items-center justify-center">
                          {it.image
                            ? <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                            : <span className="text-[10px] uppercase tracking-widest text-ink-muted">GZ</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-ink text-sm font-semibold truncate">{it.name}</p>
                          <p className="text-ink-muted text-xs mt-1 tracking-wider">Qty {it.qty}</p>
                        </div>
                        {it.price > 0 && (
                          <span className="text-ink text-sm font-semibold">₹{(it.price * it.qty).toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Address */}
              {data.address && (
                <section className="bg-paper-deep border border-line p-6 md:p-7">
                  <p className="eyebrow mb-1">Deliver to</p>
                  <h3 className="font-display text-ink text-2xl uppercase mb-3">Address</h3>
                  <p className="text-ink-soft text-sm">{data.address}</p>
                </section>
              )}

              {/* Payment summary */}
              <section className="bg-paper-deep border border-line p-6 md:p-7">
                <p className="eyebrow mb-1">Payment</p>
                <h3 className="font-display text-ink text-2xl uppercase mb-4">Summary</h3>
                <dl className="divide-y divide-line">
                  <div className="flex items-center justify-between py-2.5 first:pt-0 text-sm">
                    <dt className="text-ink-muted text-[10px] tracking-[0.3em] uppercase">Method</dt>
                    <dd className="text-ink">{data.paymentLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5 text-sm">
                    <dt className="text-ink-muted text-[10px] tracking-[0.3em] uppercase">AWB</dt>
                    <dd className="text-ink font-mono text-xs">{data.awb || 'Not assigned'}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5 last:pb-0 text-sm">
                    <dt className="text-ink-muted text-[10px] tracking-[0.3em] uppercase">Total</dt>
                    <dd className="text-ink font-semibold">₹{data.total.toLocaleString('en-IN')}</dd>
                  </div>
                </dl>
              </section>

              {/* Live courier tracking */}
              {data.trackUrl && (
                <a href={data.trackUrl} target="_blank" rel="noopener noreferrer" className="pill-cta justify-center w-full">
                  Track Shipment
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      </main>
    </SeoWrapper>
  );
}
