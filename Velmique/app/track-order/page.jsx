'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Calendar, ShoppingBag, Truck, Phone, MapPin,
  CheckCircle2, Clock, ArrowRight, RotateCcw, Package,
} from 'lucide-react';
import { trackOrder } from '@/lib/api/orders';
import PageHeader from '@/components/layout/PageHeader';
import SeoWrapper from '@/components/SeoWrapper';

const STEPS = [
  { key: 'placed',           label: 'Order Placed',         shortLabel: 'Placed' },
  { key: 'confirmed',        label: 'Confirmed',            shortLabel: 'Confirmed' },
  { key: 'dispatched',       label: 'Packed & Dispatched',  shortLabel: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery',     shortLabel: 'On Way' },
  { key: 'delivered',        label: 'Delivered',            shortLabel: 'Delivered' },
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function getStepIndex(orderData) {
  const status = String(orderData?.order?.status || '').toLowerCase();
  if (status === 'delivered') return 4;
  if (status === 'out_for_delivery' || status === 'out for delivery') return 3;
  if (['shipped', 'in_transit', 'in transit', 'processing', 'booked', 'pickup_initiated', 'manifested', 'dispatched'].includes(status)) return 2;
  if (status === 'confirmed') return 1;
  if (status === 'cancelled' || status === 'order cancelled') return -1;
  return 0;
}

function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}
function fmtDateTime(v) {
  if (!v) return '';
  try { return new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return ''; }
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered')                 return { bg: '#16a34a',  fg: '#fff', label: 'Delivered' };
  if (s === 'cancelled')                 return { bg: '#dc2626',  fg: '#fff', label: 'Cancelled' };
  if (s === 'out_for_delivery')          return { bg: '#0ea5e9',  fg: '#fff', label: 'Out for Delivery' };
  if (s === 'shipped' || s === 'dispatched' || s === 'in_transit') return { bg: '#8B6914', fg: '#fff', label: 'Shipped' };
  if (s === 'confirmed')                 return { bg: '#C9A84C',  fg: '#1A1612', label: 'Confirmed' };
  if (s === 'processing')                return { bg: '#EAE0C7',  fg: '#4A3F33', label: 'Processing' };
  return { bg: '#F5EFE0', fg: '#8A7E6C', label: status || 'Pending' };
}

function getTimeline(orderData) {
  const fship = orderData?.fship_data?.tracking_history;
  if (Array.isArray(fship) && fship.length) {
    return [...fship].reverse().map(h => ({
      status: h.status,
      note:   h.location || h.description || '',
      time:   h.timestamp || h.created_at || '',
    }));
  }
  const sh = orderData?.status_history;
  const finalStatus = String(orderData?.order?.status || '').toLowerCase();
  if (Array.isArray(sh) && sh.length) {
    const filtered = finalStatus !== 'cancelled'
      ? sh.filter(h => h.status !== 'cancelled')
      : sh;
    return [...filtered].reverse().map(h => ({
      status: h.status,
      note:   h.notes || '',
      time:   h.created_at || h.createdAt || '',
    })).filter(i => i.status);
  }
  return [];
}

const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  ?? process.env.NEXT_PUBLIC_IMAGEKIT_URL
  ?? 'https://ik.imagekit.io/wp2oatzmf';

/* Strip doubled https:// prefixes ("https://...https://...") and prepend
   the ImageKit endpoint for relative paths. Same logic used elsewhere in
   the app for product images. */
function resolveImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw;
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

function pickItemImage(it) {
  const p = it.product || it.Product || {};
  const v = it.variation || it.ProductVariation || {};
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

function fmtAttrs(attrs) {
  if (!attrs) return '';
  const a = typeof attrs === 'string' ? (() => { try { return JSON.parse(attrs); } catch { return {}; } })() : attrs;
  const parts = [];
  Object.entries(a).forEach(([k, v]) => {
    const val = Array.isArray(v) ? v.join(', ') : v;
    if (val) parts.push(`${k}: ${val}`);
  });
  return parts.join(' · ');
}

/* ────────────────────────────────────────────────────────────────────── */

function TrackOrderInner() {
  const params = useSearchParams();
  const initial = params?.get('order') || '';

  const [input, setInput]       = useState(initial);
  const [data,  setData]        = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleTrack = async (orderRef) => {
    const ref = (orderRef ?? input).trim();
    if (!ref) {
      setError('Please enter your order number');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const resp = await trackOrder(ref);
      const payload = resp?.data || resp;
      if (payload && payload.order) setData(payload);
      else setError(resp?.message || 'Order not found');
    } catch (err) {
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) handleTrack(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const activeStep = data ? getStepIndex(data) : -1;
  const timeline   = data ? getTimeline(data) : [];
  const status     = statusBadge(data?.order?.status);
  const progressPct = activeStep > 0 ? (activeStep / (STEPS.length - 1)) * 100 : 0;

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Order Status"
        title="TRACK YOUR"
        accent="ORDER"
        intro="Enter your order number below to see live shipment progress."
      />

      <div className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20 pb-24">

        {/* Search bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleTrack(); }}
          className="bg-white border border-[var(--border)] rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-8"
        >
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            <Search size={16} className="text-[var(--ink-muted)] shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. VLM-2026-001284"
              className="flex-1 bg-transparent outline-none text-sm font-body text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="pill-cta pill-cta-dark justify-center !py-3.5 !px-7"
          >
            {loading ? 'Tracking…' : <>Track <ArrowRight size={13} /></>}
          </button>
        </form>

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-body rounded-2xl px-5 py-4 mb-8">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">

            {/* Order header card */}
            <section className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-7">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="min-w-0">
                  <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-1.5">Order</p>
                  <h2 className="font-serif italic text-[var(--ink)] text-2xl md:text-3xl">#{data.order.order_number}</h2>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-[var(--ink-soft)] text-xs font-body">
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-[var(--gold-deep)]" /> {fmtDate(data.order.created_at || data.order.createdAt || data.order.placed_at || data.order.order_date)}</span>
                    <span className="flex items-center gap-1.5"><ShoppingBag size={12} className="text-[var(--gold-deep)]" /> {data.items?.length || 0} item{(data.items?.length || 0) !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1.5">{fmt(data.order.final_amount)}</span>
                  </div>
                </div>
                <span className="inline-flex items-center text-[10px] tracking-[0.3em] uppercase font-body rounded-full px-3.5 py-1.5 shrink-0"
                  style={{ background: status.bg, color: status.fg }}>
                  {status.label}
                </span>
              </div>
            </section>

            {/* Stepper */}
            <section className="bg-white border border-[var(--border)] rounded-2xl p-5 md:p-8">
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-1">Shipment</p>
              <h3 className="font-display text-[var(--ink)] uppercase tracking-tight text-2xl mb-7">Progress</h3>

              <div className="relative">
                {/* Base track + filled gold portion based on active step */}
                <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-[var(--border)]" />
                <div
                  className="absolute top-4 left-[10%] h-[2px] bg-[var(--gold)] transition-all duration-500"
                  style={{ width: `calc((100% - 20%) * ${progressPct / 100})` }}
                />

                <div className="relative grid grid-cols-5 gap-1 sm:gap-2">
                  {STEPS.map((step, i) => {
                    const done   = i < activeStep;
                    const active = i === activeStep;
                    const pending = i > activeStep;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 border-2 transition-all bg-white ${
                            done
                              ? 'border-[var(--gold)] text-[var(--gold-deep)]'
                              : active
                                ? 'border-[var(--gold)] text-[var(--gold-deep)] ring-4 ring-[var(--gold)]/25'
                                : 'border-[var(--border)] text-[var(--ink-muted)]'
                          }`}
                        >
                          {(done || active)
                            ? <CheckCircle2 size={14} strokeWidth={2.5} />
                            : <span className="text-[11px] font-body font-medium">{i + 1}</span>
                          }
                        </div>
                        <p className={`text-[8px] sm:text-[10px] tracking-[0.05em] sm:tracking-[0.2em] uppercase font-body leading-[1.25] px-0.5 break-words ${
                          done || active ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-muted)]'
                        }`}>
                          <span className="hidden sm:inline">{step.label}</span>
                          <span className="sm:hidden">{step.shortLabel || step.label}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Timeline + Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Timeline */}
              <section className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-7">
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-1">Tracking</p>
                <h3 className="font-display text-[var(--ink)] uppercase tracking-tight text-2xl mb-5">Timeline</h3>

                {timeline.length ? (
                  <ol className="relative border-l border-[var(--border)] ml-2 space-y-5">
                    {timeline.map((ev, i) => (
                      <li key={i} className="pl-6 relative">
                        <span className={`absolute left-[-7px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${i === 0 ? 'bg-[var(--gold)] border-[var(--gold)]' : 'bg-white border-[var(--border)]'}`} />
                        <p className="text-[var(--ink)] text-sm font-body font-medium capitalize">{String(ev.status).replace(/_/g, ' ')}</p>
                        {ev.note && <p className="text-[var(--ink-soft)] text-xs font-body mt-0.5">{ev.note}</p>}
                        {ev.time && (
                          <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.2em] uppercase font-body mt-1 flex items-center gap-1">
                            <Clock size={10} /> {fmtDateTime(ev.time)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[var(--ink-muted)] text-sm font-body italic">No tracking events yet.</p>
                )}
              </section>

              {/* Items */}
              <section className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-7">
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-1">Order</p>
                <h3 className="font-display text-[var(--ink)] uppercase tracking-tight text-2xl mb-5">Items</h3>

                <div className="space-y-4">
                  {(data.items || []).map((it, i) => {
                    const img = pickItemImage(it);
                    const attrs = fmtAttrs(it.variation?.attributes || it.ProductVariation?.attributes);
                    return (
                      <div key={i} className="flex gap-4 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                        <div className="w-20 h-24 rounded-md overflow-hidden bg-[var(--surface-2)] shrink-0">
                          {img
                            ? <img src={img} alt={it.product?.name || it.Product?.name || ''}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-[var(--ink-muted)]"><Package size={20} /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif italic text-[var(--ink)] text-base leading-tight">
                            {it.product?.name || it.Product?.name || 'Item'}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {it.variation?.sku && (
                              <span className="text-[9px] tracking-[0.2em] uppercase font-body bg-[var(--surface)] text-[var(--ink-soft)] px-2 py-1 rounded-full">
                                SKU · {String(it.variation.sku).replace(/^\s*SKU\s*[:·-]\s*/i, '')}
                              </span>
                            )}
                            {attrs && (
                              <span className="text-[9px] tracking-[0.2em] uppercase font-body bg-[var(--surface)] text-[var(--ink-soft)] px-2 py-1 rounded-full">{attrs}</span>
                            )}
                            <span className="text-[9px] tracking-[0.2em] uppercase font-body bg-[var(--surface)] text-[var(--ink-soft)] px-2 py-1 rounded-full">Qty · {it.quantity}</span>
                          </div>
                          <p className="font-serif italic text-[var(--ink)] mt-2">
                            {fmt(it.total_price || (parseFloat(it.price) * (it.quantity || 1)))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Address + Payment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-7">
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-1">Deliver To</p>
                <h3 className="font-display text-[var(--ink)] uppercase tracking-tight text-2xl mb-5">Address</h3>

                {data.shipping_address ? (
                  <div className="space-y-1.5">
                    <p className="font-serif italic text-[var(--ink)] text-lg">{data.shipping_address.full_name}</p>
                    <p className="text-[var(--ink-soft)] text-sm font-body flex items-start gap-2">
                      <MapPin size={13} className="text-[var(--gold-deep)] mt-0.5 shrink-0" />
                      <span>{data.shipping_address.address}, {data.shipping_address.city}, {data.shipping_address.state} - {data.shipping_address.pincode || data.shipping_address.postal_code}</span>
                    </p>
                    <p className="text-[var(--ink-soft)] text-sm font-body flex items-center gap-2">
                      <Phone size={13} className="text-[var(--gold-deep)]" /> {data.shipping_address.phone || data.shipping_address.phone_number}
                    </p>
                  </div>
                ) : (
                  <p className="text-[var(--ink-muted)] text-sm font-body italic">No address available.</p>
                )}
              </section>

              <section className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-7">
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-1">Payment</p>
                <h3 className="font-display text-[var(--ink)] uppercase tracking-tight text-2xl mb-5">Summary</h3>

                <dl className="divide-y divide-[var(--border)]">
                  <Row label="Method" value={data.order.payment_type === 'cod' ? 'Cash on Delivery' : 'Prepaid'} />
                  <Row label="AWB" value={data.order.tracking_number || data.tracking?.tracking_number || 'Not assigned'} mono />
                  <Row label="Total Amount" value={fmt(data.order.final_amount)} highlight />
                </dl>
              </section>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {(data.tracking?.tracking_url || data.order.tracking_url) && (
                <a
                  href={data.tracking?.tracking_url || data.order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill-cta !py-3 !px-6"
                >
                  <Truck size={14} /> Track Shipment
                </a>
              )}
              <button
                onClick={() => { setInput(''); setData(null); setError(''); }}
                className="pill-cta pill-cta-light !py-3 !px-6"
              >
                <RotateCcw size={13} /> Track Another
              </button>
              <Link
                href="/account"
                className="text-[var(--ink-muted)] text-[10px] tracking-[0.3em] uppercase font-body hover:text-[var(--gold-deep)] transition-colors"
              >
                Back to my orders
              </Link>
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="bg-white border border-[var(--border)] rounded-2xl py-16 text-center">
            <Package size={40} className="text-[var(--ink-muted)] mx-auto mb-4" />
            <p className="font-display text-[var(--ink)] uppercase tracking-tight text-2xl mb-2">Your shipment, in real time</p>
            <p className="text-[var(--ink-muted)] text-sm font-body max-w-md mx-auto">
              Enter your order number above to view its current status, delivery timeline and items.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight, mono }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm font-body">
      <span className="text-[var(--ink-muted)] text-[10px] tracking-[0.3em] uppercase">{label}</span>
      <span className={`${highlight ? 'font-serif italic text-[var(--ink)] text-lg' : 'text-[var(--ink)]'} ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <SeoWrapper pageName="track-order">
      <Suspense fallback={
        <div className="bg-[var(--bg)] min-h-screen flex items-center justify-center">
          <p className="text-[var(--ink-muted)] text-xs tracking-[0.3em] uppercase font-body">Loading…</p>
        </div>
      }>
        <TrackOrderInner />
      </Suspense>
    </SeoWrapper>
  );
}
