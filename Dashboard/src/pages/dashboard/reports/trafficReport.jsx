import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { trafficReportService, brandService } from '../../../services';
import { DateRangePicker, Skeleton, SkeletonKpis, SkeletonTableRows } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download04Icon } from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   Traffic & Conversion — visits → product views → cart → checkout
   → orders, per brand and per marketing channel / ad campaign.

   How it counts (GET /api/reports/brand-traffic):
     · Visits    tracked sessions that STARTED in the range (bots excluded)
     · Orders    orders PLACED in the range, not cancelled — the same
                 number as "Orders booked" on the Overview
     · Channel / campaign orders are credited to the ad click that led to
       them, even if that click was before the range. Orders with no
       tracked visit show as "Direct / untracked" so totals reconcile.
   Same look as the Reports overview (.obz-rep / .rep-* in reports.css).
   ────────────────────────────────────────────────────────────── */

// Categorical identity for the marketing channels (reads in both themes).
const CHANNEL_COLORS = {
  Direct: '#0f766e', Facebook: '#1877f2', Instagram: '#e1306c', Google: '#ea4335',
  'AI chatbot': '#8b5cf6', Email: '#d97706', SMS: '#16a34a', Referral: '#6366f1',
  WhatsApp: '#25d366', Other: '#94a3b8', 'Direct / untracked': '#64748b',
};
// Display names: "Referral" is any other website or app (YouTube, blogs…).
const CHANNEL_LABEL = { Referral: 'Other websites & apps', 'Direct / untracked': 'No tracked visit' };
const chLabel = (name) => CHANNEL_LABEL[name] || name;
// Where visitors left — one colour per exit point, green for "ordered".
const LEFT_STAGES = [
  { key: 'landing',  label: 'Left without opening a product', short: 'Left on landing', color: '#94a3b8' },
  { key: 'product',  label: 'Viewed a product, left before cart', short: 'Left after product', color: '#f59e0b' },
  { key: 'cart',     label: 'Added to cart, left before checkout', short: 'Left at cart', color: '#f97316' },
  { key: 'checkout', label: 'Started checkout, didn’t order', short: 'Left at checkout', color: '#ef4444' },
  { key: 'ordered',  label: 'Ordered', short: 'Ordered', color: '#16a34a' },
];
const leftSlices = (r) => {
  const v = Number(r.visits) || 0;
  const parts = {
    landing: v - r.views, product: r.views - r.carts, cart: r.carts - r.checkouts,
    checkout: r.checkouts - r.ordered, ordered: r.ordered,
  };
  return LEFT_STAGES.map((st) => ({ ...st, n: Math.max(0, parts[st.key] || 0), pct: v > 0 ? (Math.max(0, parts[st.key] || 0) / v) * 100 : 0 }));
};
const chColor = (name) => CHANNEL_COLORS[name] || 'var(--ds-color-text-muted)';
const SPLIT_COLORS = { Paid: '#2f6fed', Organic: '#16a34a', Direct: '#64748b' };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : '—');
const inr = (v) => `₹${num(Math.round(Number(v) || 0))}`;
const pct = (v) => (v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(Number(v) >= 10 ? 1 : 2)}%`);
const srcLabel = (s) => {
  const k = String(s || '').toLowerCase().trim();
  if (k === 'fb') return 'facebook';
  if (k === 'ig') return 'instagram';
  return s;
};
const plural = (n, word) => `${num(n)} ${word}${Number(n) === 1 ? '' : 's'}`;

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function exportCsv(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n');
  const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const DlIcon = () => <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={2} />;
const Dot = ({ color }) => (
  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 8, verticalAlign: 'middle', flex: 'none' }} />
);
const Dash = () => <span style={{ color: 'var(--ds-color-text-faint)' }}>—</span>;
const Empty = ({ cols, text }) => (
  <tr><td colSpan={cols} style={{ textAlign: 'center', color: 'var(--ds-color-text-faint)' }}>{text}</td></tr>
);

export default function TrafficReport() {
  const [from, setFrom] = useState(shiftDay(istDate(), -29));
  const [to, setTo] = useState(istDate());
  const [brandId, setBrandId] = useState('');
  const [brandList, setBrandList] = useState([]);
  const [showAdsets, setShowAdsets] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [sitesOpen, setSitesOpen] = useState(null); // null = auto (open when few sites)

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  // Keyed on range + brand: a slow response for an old selection can never
  // replace the newer one (the bug that showed a previous range's numbers).
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['reports', 'brand-traffic', from, to, brandId],
    queryFn: async () => {
      const r = await trafficReportService.getBrandTraffic(from, to, brandId || undefined);
      if (!r?.success) throw new Error(r?.message || 'Failed to load the report');
      return r;
    },
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const t = data?.totals;
  const brands = data?.brands || [];
  const channels = data?.channels || [];
  const split = data?.trafficSplit || [];
  const campaigns = data?.campaigns || [];
  const brandName = brandId ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name) : 'All brands';

  // "Other websites & apps" by actual site name (YouTube, Pinterest, a blog…).
  const otherSites = (data?.otherSites || []).map((x) => ({
    name: x.site, sessions: x.sessions, share: x.share, orders: x.orders,
    conversion: x.conversion_rate, revenue: x.revenue, campaigns: x.campaigns || [], adsets: [],
  }));
  const showSites = sitesOpen ?? otherSites.length <= 6;
  const drop = data?.dropOff || { channels: [], totals: { visits: 0, views: 0, carts: 0, checkouts: 0, ordered: 0 } };

  // Platform → campaign → ad set, merging every spelling of a platform (fb,
  // facebook, m.facebook.com…) and every medium into one group.
  const { platforms, hasAdsets, revenueByChannel } = useMemo(() => {
    const totalVisits = campaigns.reduce((n, r) => n + (Number(r.sessions) || 0), 0) || 1;
    const rate = (o, v) => (v > 0 ? (o / v) * 100 : null);
    const groups = new Map();
    for (const r of campaigns) {
      const ch = r.channel || 'Referral';
      const g = groups.get(ch) || { channel: ch, untracked: ch === 'Direct / untracked', sessions: 0, orders: 0, revenue: 0, camps: new Map() };
      g.sessions += Number(r.sessions) || 0; g.orders += Number(r.orders) || 0; g.revenue += Number(r.revenue) || 0;
      if (!g.untracked) {
        const name = r.campaign || 'none';
        const c = g.camps.get(name) || { name, sessions: 0, orders: 0, revenue: 0, sets: new Map(), utm: new Set() };
        c.sessions += Number(r.sessions) || 0; c.orders += Number(r.orders) || 0; c.revenue += Number(r.revenue) || 0;
        // The exact UTM tags behind this campaign (one per source/medium spelling).
        c.utm.add(`utm_source=${r.source || 'direct'} · utm_medium=${r.medium || 'none'}`);
        const an = r.adset || 'none';
        const a = c.sets.get(an) || { name: an, sessions: 0, orders: 0, revenue: 0, ads: new Map() };
        a.sessions += Number(r.sessions) || 0; a.orders += Number(r.orders) || 0; a.revenue += Number(r.revenue) || 0;
        // Ad (utm_content) + creative code (utm_creative) under each ad set.
        const adName = r.ad || 'none';
        const ad = a.ads.get(adName) || { name: adName, creatives: new Set(), sessions: 0, orders: 0, revenue: 0 };
        ad.sessions += Number(r.sessions) || 0; ad.orders += Number(r.orders) || 0; ad.revenue += Number(r.revenue) || 0;
        if (r.creative && r.creative !== 'none') ad.creatives.add(r.creative);
        a.ads.set(adName, ad);
        c.sets.set(an, a);
        g.camps.set(name, c);
      }
      groups.set(ch, g);
    }
    const fin = (x) => ({ ...x, share: (x.sessions / totalVisits) * 100, conversion: rate(x.orders, x.sessions) });
    const byRev = (a, b) => b.revenue - a.revenue || b.orders - a.orders || b.sessions - a.sessions;
    const list = [...groups.values()].map((g) => fin({
      ...g,
      campaigns: [...g.camps.values()].map((c) => fin({
        ...c,
        utm: [...c.utm],
        adsets: [...c.sets.values()].map((a) => fin({ ...a, ads: [...a.ads.values()].map((d) => fin({ ...d, creatives: [...d.creatives] })).sort(byRev) })).sort(byRev),
      })).sort(byRev),
      // Only real (utm_campaign-tagged) campaigns count; untagged visits show
      // as a sub-row only when the platform also has tagged campaigns.
      tagged: [...g.camps.keys()].filter((n) => n !== 'none').length,
    })).sort((a, b) => (a.untracked - b.untracked) || byRev(a, b));
    return {
      platforms: list,
      hasAdsets: list.some((g) => g.campaigns.some((c) => c.adsets.length > 1 || c.adsets.some((a) => a.ads.length > 1 || a.ads.some((d) => d.name !== 'none')))),
      revenueByChannel: new Map(list.map((g) => [g.channel, g.revenue])),
    };
  }, [campaigns]);

  // Source list for "Where visitors come from": channels with revenue added.
  const sources = channels.map((c) => ({ ...c, revenue: revenueByChannel.get(c.channel) || 0 }))
    .filter((c) => c.sessions > 0 || c.orders > 0);
  const sourceTotal = channels.reduce((n, c) => n + (c.untracked ? 0 : Number(c.sessions) || 0), 0);
  const splitRevenue = split.reduce((n, r) => n + (Number(r.revenue) || 0), 0);

  // First load (nothing to show yet) → skeletons in place of each section.
  // A date-range / brand change keeps the old figures on screen, dimmed.
  const first = isLoading && !data;
  const refreshing = isFetching && !!data;
  const dim = refreshing ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;
  const busy = refreshing || undefined;

  const howCounted = (
    <div className="rep-panel">
      <div className="rep-ph"><h3>How this is counted</h3></div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 }}>
        <li><b style={{ color: 'var(--ds-color-text)' }}>Visits</b> are visits that started in this period from shoppers who allowed cookies; bots are left out. Page loads count every visitor but can't be tied to orders.</li>
        <li><b style={{ color: 'var(--ds-color-text)' }}>Orders</b> are orders placed in this period that weren't cancelled — the same as “Orders booked” on the Overview.</li>
        <li>A channel or campaign gets the order even if the ad click was before this period. Orders with no tracked visit show as <b style={{ color: 'var(--ds-color-text)' }}>No tracked visit</b>, so every table adds up to the Orders total.</li>
        <li><b style={{ color: 'var(--ds-color-text)' }}>Where visitors left</b> follows the visitors who came in this period: how many opened a product, added to cart, started checkout and ordered. Each colour is where that share of visitors stopped.</li>
        <li>Every Facebook link (fb, m.facebook.com, paid or post) counts as Facebook; the same for Instagram, Google and WhatsApp. YouTube, Pinterest, blogs and other sites are “Other websites & apps” — click that row to see each site by name.</li>
        <li>Paid = ads tagged utm_medium paid / cpc. Direct = no source or our own sites. Everything else (search, social posts, email, referral) is Organic.</li>
      </ul>
    </div>
  );

  const doExport = () => exportCsv(`traffic-conversion_${from}_${to}.csv`, [
    { label: 'Brand', value: (r) => r.brand },
    { label: 'Tracked visits', value: (r) => r.sessions },
    { label: 'All visits (cookieless)', value: (r) => r.allVisits },
    { label: 'Product views', value: (r) => r.views },
    { label: 'Add to cart', value: (r) => r.carts },
    { label: 'Checkout', value: (r) => r.checkouts },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Delivered', value: (r) => r.delivered },
    { label: 'Conversion %', value: (r) => r.conversion_rate ?? '' },
    { label: 'Revenue', value: (r) => r.revenue },
    { label: 'AOV', value: (r) => r.aov },
  ], brands);

  const exportCampaigns = () => exportCsv(`campaigns_${from}_${to}.csv`, [
    { label: 'Platform', value: (r) => chLabel(r.channel) },
    { label: 'Source', value: (r) => srcLabel(r.source) },
    { label: 'Medium', value: (r) => r.medium },
    { label: 'Campaign', value: (r) => r.campaign },
    { label: 'Ad set', value: (r) => r.adset },
    { label: 'Ad', value: (r) => r.ad },
    { label: 'Creative', value: (r) => r.creative },
    { label: 'Visits', value: (r) => r.sessions },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Conversion %', value: (r) => r.conversion_rate ?? '' },
    { label: 'Revenue', value: (r) => r.revenue },
  ], campaigns);

  return (
    <div className="dashboard-sections obz-rep">
      <PageHeader
        title="Traffic & Conversion"
        subtitle={`${brandName} · ${from} → ${to} (India time)${isFetching && data ? ' · updating…' : ''}. Where visitors come from and how many of them order.`}
        actions={
          <div className="obz-rep-head">
            <Dropdown
              value={brandId || 'all'}
              onChange={(v) => setBrandId(v === 'all' ? '' : v)}
              options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: b.id, label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <DateRangePicker label="" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()} />
            <button type="button" className="order-sync-main-btn" onClick={doExport} disabled={!brands.length}>
              <DlIcon /> CSV
            </button>
          </div>
        }
      />

      {first ? (
        <>
          <SkeletonKpis count={4} label="Loading traffic report…" />
          <div className="rep-panel" aria-hidden="true">
            <div className="rep-ph"><h3>Where visitors come from</h3></div>
            <Skeleton w="100%" h={14} r={7} style={{ marginBottom: 16 }} />
            <div className="rep-tbl-wrap">
              <table className="rep-table">
                <thead><tr><th>Source</th><th className="r">Visits</th><th style={{ width: '32%' }}>Share of visits</th><th className="r">Orders</th><th className="r">Conv.</th><th className="r">Revenue</th></tr></thead>
                <tbody><SkeletonTableRows rows={5} cols={6} /></tbody>
              </table>
            </div>
          </div>
          <div className="rep-panel" aria-hidden="true">
            <div className="rep-ph"><h3>Where visitors left</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
              {LEFT_STAGES.map((st) => (
                <div key={st.key} className="rep-tile"><Skeleton w="70%" h={10} /><Skeleton w="40%" h={18} style={{ marginTop: 7 }} /><Skeleton w="55%" h={10} style={{ marginTop: 6 }} /></div>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 160px) 1fr 70px', gap: 12, alignItems: 'center' }}>
                  <Skeleton w="70%" h={12} /><Skeleton w="100%" h={22} r={6} /><Skeleton w="100%" h={10} />
                </div>
              ))}
            </div>
          </div>
          <div className="rep-masonry" aria-hidden="true">
            <div className="rep-panel">
              <div className="rep-ph"><h3>Paid vs organic vs direct</h3></div>
              <Skeleton w="100%" h={12} r={6} style={{ marginBottom: 14 }} />
              <div className="rep-tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rep-tile"><Skeleton w="50%" h={10} /><Skeleton w="60%" h={18} style={{ marginTop: 7 }} /><Skeleton w="80%" h={10} style={{ marginTop: 6 }} /></div>
                ))}
              </div>
            </div>
            {!brandId && (
              <div className="rep-panel rep-panel--flush">
                <div className="rep-ph"><h3>By brand</h3></div>
                <div className="rep-tbl-wrap">
                  <table className="rep-table">
                    <thead><tr><th>Brand</th><th className="r">Visits</th><th className="r">Cart</th><th className="r">Orders</th><th className="r">Conv.</th><th className="r">Revenue</th></tr></thead>
                    <tbody><SkeletonTableRows rows={4} cols={6} /></tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="rep-panel rep-panel--flush" aria-hidden="true">
            <div className="rep-ph"><h3>Ad campaigns by platform</h3></div>
            <div className="rep-tbl-wrap">
              <table className="rep-table">
                <thead><tr><th>Platform / campaign</th><th className="r">Visits</th><th className="r">Share</th><th className="r">Orders</th><th className="r">Conv.</th><th className="r">Revenue</th></tr></thead>
                <tbody><SkeletonTableRows rows={6} cols={6} /></tbody>
              </table>
            </div>
          </div>
          {howCounted}
        </>
      ) : error ? (
        <div className="rep-state" style={{ color: 'var(--ds-color-danger)' }}>Couldn't load the report: {error.message || 'try again'}</div>
      ) : !data ? null : (
        <>
          <div className="rep-kpis" style={dim} aria-busy={busy}>
            <div className="rep-kpi">
              <div className="rep-kl">Visits</div>
              <div className="rep-kv num">{num(t?.sessions)}</div>
              <div className="rep-kf">{t?.allVisits ? `${num(t.allVisits)} page loads incl. no-cookie visitors` : 'tracked visitors who allowed cookies'}</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Orders</div>
              <div className="rep-kv num">{num(t?.orders)}</div>
              <div className="rep-kf">{num(t?.delivered)} delivered so far</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Conversion</div>
              <div className="rep-kv num">{pct(t?.conversion_rate)}</div>
              <div className="rep-kf">orders ÷ tracked visits</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Revenue booked</div>
              <div className="rep-kv num">{inr(t?.revenue)}</div>
              <div className="rep-kf">avg order {inr(t?.aov)}</div>
            </div>
          </div>

          {/* ── 1. Where visitors come from ── */}
          <div className="rep-panel" style={dim} aria-busy={busy}>
            <div className="rep-ph"><h3>Where visitors come from</h3><span className="hint">share of {num(sourceTotal)} tracked visits</span></div>
            {sourceTotal > 0 && (
              <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--ds-color-surface-soft)', marginBottom: 16 }}>
                {sources.filter((c) => c.sessions > 0).map((c) => (
                  <div key={c.channel} title={`${chLabel(c.channel)}: ${pct(c.share)}`} style={{ width: `${c.share}%`, background: chColor(c.channel) }} />
                ))}
              </div>
            )}
            <div className="rep-tbl-wrap">
              <table className="rep-table">
                <thead><tr><th>Source</th><th className="r">Visits</th><th style={{ width: '32%' }}>Share of visits</th><th className="r">Orders</th><th className="r">Conv.</th><th className="r">Revenue</th></tr></thead>
                <tbody>
                  {sources.length === 0 ? <Empty cols={6} text="No visits in this period" /> : sources.map((c) => {
                    const expandable = c.channel === 'Referral' && otherSites.length > 0;
                    return (
                    <React.Fragment key={c.channel}>
                    <tr onClick={expandable ? () => setSitesOpen(!showSites) : undefined} style={expandable ? { cursor: 'pointer' } : undefined}>
                      <td className="strong" style={{ whiteSpace: 'nowrap' }}>
                        <Dot color={chColor(c.channel)} />{chLabel(c.channel)}
                        {expandable && <span style={{ fontWeight: 400, color: 'var(--ds-color-text-faint)', marginLeft: 6 }}>{showSites ? '▾' : '▸'} {plural(otherSites.length, 'site')}</span>}
                      </td>
                      <td className="r num">{c.untracked ? <Dash /> : num(c.sessions)}</td>
                      <td>
                        {c.untracked ? <span style={{ fontSize: 12, color: 'var(--ds-color-text-faint)' }}>orders with no tracked visit</span> : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--ds-color-surface-soft)', overflow: 'hidden', minWidth: 60 }}>
                              <div style={{ width: `${Math.min(100, c.share)}%`, height: '100%', background: chColor(c.channel) }} />
                            </div>
                            <b className="num" style={{ fontSize: 12.5, minWidth: 46, textAlign: 'right' }}>{pct(c.share)}</b>
                          </div>
                        )}
                      </td>
                      <td className="r num">{num(c.orders)}</td>
                      <td className="r num">{c.untracked ? <Dash /> : pct(c.conversion_rate)}</td>
                      <td className="r strong num">{inr(c.revenue)}</td>
                    </tr>
                    {expandable && showSites && otherSites.map((x) => (
                      <tr key={x.name}>
                        <td style={{ paddingLeft: 34, color: 'var(--ds-color-text-muted)' }}>↳ {x.name}</td>
                        <td className="r num">{num(x.sessions)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--ds-color-surface-soft)', overflow: 'hidden', minWidth: 60 }}>
                              <div style={{ width: `${Math.min(100, x.share)}%`, height: '100%', background: chColor('Referral'), opacity: 0.7 }} />
                            </div>
                            <span className="num" style={{ fontSize: 12, minWidth: 46, textAlign: 'right', color: 'var(--ds-color-text-muted)' }}>{pct(x.share)}</span>
                          </div>
                        </td>
                        <td className="r num">{num(x.orders)}</td>
                        <td className="r num">{pct(x.conversion)}</td>
                        <td className="r num">{inr(x.revenue)}</td>
                      </tr>
                    ))}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 2. Where visitors left ── */}
          <div className="rep-panel" style={dim} aria-busy={busy}>
            <div className="rep-ph"><h3>Where visitors left</h3><span className="hint">what each visitor did before leaving</span></div>
            {drop.totals.visits > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
                  {leftSlices(drop.totals).map((sl) => (
                    <div key={sl.key} className="rep-tile" style={{ borderTop: `3px solid ${sl.color}` }}>
                      <div className="rep-tl">{sl.label}</div>
                      <div className="rep-tv num">{pct(sl.pct)}</div>
                      <div className="rep-ts">{plural(sl.n, 'visitor')}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {drop.channels.map((r) => (
                    <div key={r.channel} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 160px) 1fr 70px', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Dot color={chColor(r.channel)} />{chLabel(r.channel)}</span>
                      <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: 'var(--ds-color-surface-soft)' }}>
                        {leftSlices(r).filter((sl) => sl.n > 0).map((sl) => (
                          <div key={sl.key} title={`${sl.short}: ${plural(sl.n, 'visitor')} (${pct(sl.pct)})`}
                            style={{ width: `${sl.pct}%`, background: sl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {sl.pct >= 12 ? `${Math.round(sl.pct)}%` : ''}
                          </div>
                        ))}
                      </div>
                      <span className="num" style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', textAlign: 'right' }}>{plural(r.visits, 'visit')}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 14, fontSize: 12, color: 'var(--ds-color-text-muted)' }}>
                  {LEFT_STAGES.map((st) => (
                    <span key={st.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: st.color }} />{st.short}
                    </span>
                  ))}
                </div>
              </>
            ) : <span className="hint">No tracked visits in this period.</span>}
          </div>

          <div className="rep-masonry" style={dim} aria-busy={busy}>
            {/* Paid / Organic / Direct */}
            <div className="rep-panel">
              <div className="rep-ph"><h3>Paid vs organic vs direct</h3><span className="hint">share of revenue</span></div>
              {splitRevenue > 0 && (
                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--ds-color-surface-soft)', marginBottom: 14 }}>
                  {split.map((r) => (
                    <div key={r.type} title={`${r.type}: ${inr(r.revenue)}`}
                      style={{ width: `${((Number(r.revenue) || 0) / splitRevenue) * 100}%`, background: SPLIT_COLORS[r.type] }} />
                  ))}
                </div>
              )}
              <div className="rep-tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                {split.map((r) => (
                  <div className="rep-tile" key={r.type}>
                    <div className="rep-tl"><Dot color={SPLIT_COLORS[r.type]} />{r.type}</div>
                    <div className="rep-tv num">{inr(r.revenue)}</div>
                    <div className="rep-ts">{plural(r.orders, 'order')} · {plural(r.sessions, 'visit')}{r.conversion_rate != null ? ` · ${pct(r.conversion_rate)} conv.` : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per brand — only when looking at all brands */}
            {!brandId && (
              <div className="rep-panel rep-panel--flush">
                <div className="rep-ph"><h3>By brand</h3></div>
                <div className="rep-tbl-wrap">
                  <table className="rep-table">
                    <thead><tr><th>Brand</th><th className="r">Visits</th><th className="r">Cart</th><th className="r">Orders</th><th className="r">Conv.</th><th className="r">Revenue</th></tr></thead>
                    <tbody>
                      {brands.filter((b) => b.sessions || b.orders).length === 0 ? <Empty cols={6} text="No visits or orders in this period" />
                        : brands.filter((b) => b.sessions || b.orders).map((b) => (
                          <tr key={b.brand_id}>
                            <td className="strong">{b.brand}</td>
                            <td className="r num">{num(b.sessions)}</td>
                            <td className="r num">{num(b.carts)}</td>
                            <td className="r num">{num(b.orders)}</td>
                            <td className="r num">{pct(b.conversion_rate)}</td>
                            <td className="r strong num">{inr(b.revenue)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Ad campaigns, grouped by platform ── */}
          <div className="rep-panel rep-panel--flush" style={dim} aria-busy={busy}>
            <div className="rep-ph">
              <h3>Ad campaigns by platform</h3>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className={`order-sync-main-btn${showAdsets ? ' order-sync-main-btn--primary' : ''}`} onClick={() => setShowAdsets((v) => !v)} disabled={!hasAdsets}>
                  {showAdsets ? 'Hide ad sets & ads' : 'Show ad sets & ads'}
                </button>
                <button type="button" className="order-sync-main-btn" onClick={exportCampaigns} disabled={!campaigns.length}><DlIcon /> CSV</button>
              </span>
            </div>
            <div className="rep-tbl-wrap">
              <table className="rep-table">
                <thead><tr><th>Platform / campaign</th><th className="r">Visits</th><th className="r">Share</th><th className="r">Orders</th><th className="r">Conv.</th><th className="r">Revenue</th></tr></thead>
                <tbody>
                  {platforms.length === 0 ? <Empty cols={6} text="No campaign traffic in this period" /> : platforms.map((g) => {
                    const isSites = g.channel === 'Referral' && otherSites.length > 0;
                    const rows = isSites ? otherSites : (g.tagged ? g.campaigns : []);
                    const open = openGroups[g.channel] ?? g.campaigns.length <= 3;
                    return (
                      <React.Fragment key={g.channel}>
                        <tr onClick={() => rows.length && setOpenGroups((m) => ({ ...m, [g.channel]: !open }))}
                          style={{ cursor: rows.length ? 'pointer' : 'default', background: 'var(--ds-color-surface-soft)' }}>
                          <td className="strong" style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-block', width: 14, color: 'var(--ds-color-text-faint)' }}>{rows.length ? (open ? '▾' : '▸') : ''}</span>
                            <Dot color={chColor(g.channel)} />{chLabel(g.channel)}
                            {(isSites || g.tagged > 0) && <span style={{ fontWeight: 400, color: 'var(--ds-color-text-faint)', marginLeft: 6 }}>{isSites ? plural(otherSites.length, 'site') : plural(g.tagged, 'campaign')}</span>}
                          </td>
                          <td className="r strong num">{g.untracked ? <Dash /> : num(g.sessions)}</td>
                          <td className="r num">{g.untracked ? <Dash /> : pct(g.share)}</td>
                          <td className="r strong num">{num(g.orders)}</td>
                          <td className="r num">{g.untracked ? <Dash /> : pct(g.conversion)}</td>
                          <td className="r strong num">{inr(g.revenue)}</td>
                        </tr>
                        {open && rows.map((c) => (
                          <React.Fragment key={c.name}>
                            <tr>
                              <td style={{ paddingLeft: 40 }}>
                                {c.name === 'none' ? <span style={{ color: 'var(--ds-color-text-faint)' }}>Without a campaign tag (posts, bio links, shares)</span> : c.name}
                                {isSites && c.campaigns.length > 0 && <span style={{ color: 'var(--ds-color-text-faint)', fontSize: 12 }}> · {c.campaigns.join(', ')}</span>}
                                {!isSites && c.utm?.length > 0 && (
                                  <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--ds-font-mono)', fontSize: 11, color: 'var(--ds-color-text-faint)', overflowWrap: 'anywhere' }}>
                                    {c.name !== 'none' && `utm_campaign=${c.name} · `}{c.utm.join(' | ')}
                                  </span>
                                )}
                              </td>
                              <td className="r num">{num(c.sessions)}</td>
                              <td className="r num">{pct(c.share)}</td>
                              <td className="r num">{num(c.orders)}</td>
                              <td className="r num">{pct(c.conversion)}</td>
                              <td className="r num">{inr(c.revenue)}</td>
                            </tr>
                            {showAdsets && !isSites && (c.adsets.length > 1 || c.adsets.some((a) => a.ads.some((d) => d.name !== 'none'))) && c.adsets.map((a) => (
                              <React.Fragment key={a.name}>
                                <tr>
                                  <td style={{ paddingLeft: 64, fontSize: 12, color: 'var(--ds-color-text-muted)' }}>↳ Ad set: {a.name === 'none' ? 'no ad set tag (utm_term)' : a.name}</td>
                                  <td className="r num" style={{ fontSize: 12 }}>{num(a.sessions)}</td>
                                  <td className="r num" style={{ fontSize: 12 }}>{pct(a.share)}</td>
                                  <td className="r num" style={{ fontSize: 12 }}>{num(a.orders)}</td>
                                  <td className="r num" style={{ fontSize: 12 }}>{pct(a.conversion)}</td>
                                  <td className="r num" style={{ fontSize: 12 }}>{inr(a.revenue)}</td>
                                </tr>
                                {a.ads.filter((d) => d.name !== 'none' || a.ads.length > 1).map((d) => (
                                  <tr key={d.name}>
                                    <td style={{ paddingLeft: 88, fontSize: 12, color: 'var(--ds-color-text-faint)' }}>
                                      ↳ Ad: {d.name === 'none' ? 'no ad tag (utm_content)' : d.name}
                                      {d.creatives.length > 0 && <span style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 11 }}> · creative {d.creatives.join(', ')}</span>}
                                    </td>
                                    <td className="r num" style={{ fontSize: 12 }}>{num(d.sessions)}</td>
                                    <td className="r num" style={{ fontSize: 12 }}>{pct(d.share)}</td>
                                    <td className="r num" style={{ fontSize: 12 }}>{num(d.orders)}</td>
                                    <td className="r num" style={{ fontSize: 12 }}>{pct(d.conversion)}</td>
                                    <td className="r num" style={{ fontSize: 12 }}>{inr(d.revenue)}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {howCounted}
        </>
      )}
    </div>
  );
}
