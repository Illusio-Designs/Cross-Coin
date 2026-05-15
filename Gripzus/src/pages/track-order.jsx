import { useState } from 'react';
import Head from 'next/head';
import PageHero from '../components/common/PageHero';

const STEPS = [
  { key: 'placed',           label: 'Order Placed',         short: 'Placed' },
  { key: 'confirmed',        label: 'Confirmed',            short: 'Confirmed' },
  { key: 'dispatched',       label: 'Packed & Dispatched',  short: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery',     short: 'On Way' },
  { key: 'delivered',        label: 'Delivered',            short: 'Delivered' },
];

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleTrack = (e) => {
    e.preventDefault();
    setError('');
    const id = orderId.trim();
    if (!id) { setError('Please enter your order number.'); return; }
    // Demo response — replace with real fetch
    setData({
      orderNumber: id,
      placedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'dispatched',
      items: 2,
      total: 1098,
      address: 'Mumbai, Maharashtra · 400050',
    });
  };

  const activeStep = data ? Math.max(0, STEPS.findIndex((s) => s.key === data.status)) : -1;
  const progressPct = activeStep > 0 ? (activeStep / (STEPS.length - 1)) * 100 : 0;

  return (
    <>
      <Head><title>Track Order — Gripzus</title></Head>
      <main className="bg-paper">
        <PageHero
          eyebrow="Where is my pair?"
          title="Track"
          accent="your order"
          intro="Enter your order number to see exactly where your pair is in transit."
        />

        <div className="max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-16">

          {/* Search form */}
          <form onSubmit={handleTrack} className="bg-paper-deep border border-rule p-6 md:p-7 mb-8">
            <label className="text-[10px] tracking-[0.3em] uppercase text-ink-muted block mb-3">Order number</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. GZ-2026-01284"
                className="flex-1 bg-paper border border-rule focus:border-ink outline-none px-5 py-3 text-base text-ink placeholder:text-ink-muted transition-colors"
              />
              <button type="submit" className="pill-cta justify-center">Track</button>
            </div>
            {error && <p className="text-red-700 text-sm mt-4">{error}</p>}
          </form>

          {data && (
            <div className="space-y-6">

              {/* Header card */}
              <section className="bg-paper-deep border border-rule p-6 md:p-7">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="eyebrow mb-1">Order</p>
                    <h2 className="font-display text-ink text-2xl md:text-3xl uppercase">#{data.orderNumber}</h2>
                    <p className="text-ink-muted text-xs mt-2 tracking-wider">
                      {data.placedAt} · {data.items} item{data.items === 1 ? '' : 's'} · ₹{data.total.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className="bg-ink text-paper text-[10px] tracking-[0.3em] uppercase px-3 py-1.5">
                    {STEPS[activeStep]?.label}
                  </span>
                </div>
              </section>

              {/* Stepper */}
              <section className="bg-paper-deep border border-rule p-5 md:p-8">
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
                                       'border-rule text-ink-muted'
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

              {/* Address */}
              <section className="bg-paper-deep border border-rule p-6 md:p-7">
                <p className="eyebrow mb-1">Deliver to</p>
                <h3 className="font-display text-ink text-2xl uppercase mb-3">Address</h3>
                <p className="text-ink-soft text-sm">{data.address}</p>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
