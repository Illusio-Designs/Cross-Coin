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

/* Normalise the API order into the shape the page renders. */
function mapOrder(raw, fallbackId) {
  const o = raw?.order || raw || {};
  const addr = o.shipping_address || o.ShippingAddress || o.shippingAddress || {};
  const itemsArr = o.OrderItems || o.items || o.order_items || [];
  const itemCount = Array.isArray(itemsArr)
    ? itemsArr.reduce((s, it) => s + (Number(it.quantity) || 1), 0)
    : Number(o.item_count || 0);
  const placed = o.created_at || o.createdAt || o.placed_at;
  const addrLine = [addr.city || addr.City, addr.state || addr.State].filter(Boolean).join(', ');
  const pin = addr.postal_code || addr.pincode || addr.postalCode || '';
  return {
    orderNumber: o.order_number || o.orderNumber || fallbackId,
    placedAt: placed
      ? new Date(placed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
    status: String(o.status || 'pending').toLowerCase(),
    items: itemCount,
    total: Number(o.final_amount || o.total_amount || o.total || 0),
    paymentType: String(o.payment_type || o.paymentType || '').toUpperCase(),
    address: [addrLine, pin].filter(Boolean).join(' · '),
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

              {/* Address */}
              {data.address && (
                <section className="bg-paper-deep border border-line p-6 md:p-7">
                  <p className="eyebrow mb-1">Deliver to</p>
                  <h3 className="font-display text-ink text-2xl uppercase mb-3">Address</h3>
                  <p className="text-ink-soft text-sm">{data.address}</p>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
      </main>
    </SeoWrapper>
  );
}
