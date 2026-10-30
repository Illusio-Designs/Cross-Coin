import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { trafficReportService, brandService } from '../../../services';
import { DateRangePicker, Skeleton, SkeletonKpis } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download04Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { useReportState } from '../../../lib/reportFilters';
import { ChartCard, Donut, Empty, HBars, KpiTile, VBars, VisitGauge, gaugeTone } from '../../../components/reports/TrafficCharts';

/* ──────────────────────────────────────────────────────────────
   Traffic & Conversion — charts only (no tables): where visitors
   come from, how far they get, what the visits are made of, and
   where on Meta the ad visits came from. Every card has an ⓘ
   button explaining what it shows. Data: GET /api/reports/brand-traffic.

     · Visits   tracked sessions that STARTED in the range (bots,
                Meta's own checks and link previews excluded)
     · Orders   orders PLACED in the range, not cancelled — the same
                number as "Orders booked" on the Overview
     · Channel / campaign orders are credited to the ad click that
       led to them, even if that click was before the range.
   ────────────────────────────────────────────────────────────── */

// Categorical identity for the marketing channels (colour follows the
// channel, never its rank).
const CHANNEL_COLORS = {
  Facebook: 'var(--tr2-s1)', Direct: 'var(--tr2-s3)', Instagram: 'var(--tr2-s5)', Google: 'var(--tr2-s2)',
  WhatsApp: 'var(--tr2-s6)', 'AI chatbot': 'var(--tr2-s7)', Email: 'var(--tr2-s4)', SMS: 'var(--tr2-s8)',
  Referral: 'var(--ds-color-text-faint)', 'Direct / untracked': 'var(--ds-color-text-faint)',
};
const CHANNEL_LABEL = { Referral: 'Other websites & apps', 'Direct / untracked': 'No tracked visit' };
const chLabel = (name) => CHANNEL_LABEL[name] || name;
const SPLIT_COLORS = { Paid: 'var(--tr2-s1)', Organic: 'var(--tr2-s3)', Direct: 'var(--tr2-s4)' };
const DEVICE_COLORS = { mobile: 'var(--tr2-s1)', desktop: 'var(--tr2-s2)', tablet: 'var(--tr2-s3)', unknown: 'var(--ds-color-text-faint)' };
const DEVICE_LABEL = { mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet', unknown: 'Unknown' };
const PLATFORM_COLORS = { WhatsApp: 'var(--tr2-s1)', Facebook: 'var(--tr2-s2)', Instagram: 'var(--tr2-s3)', 'Audience Network': 'var(--tr2-s4)', Messenger: 'var(--tr2-s5)', Threads: 'var(--tr2-s7)' };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : '—');
const inr = (v) => `₹${num(Math.round(Number(v) || 0))}`;
const pct = (v) => (v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(Number(v) >= 10 ? 1 : 2)}%`);
const share = (n, of) => (of > 0 ? Math.min(100, Math.round((n / of) * 100)) : 0);
const plural = (n, word) => `${num(n)} ${word}${Number(n) === 1 ? '' : 's'}`;

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
// Invalid / empty day (e.g. a half-picked date range) is returned as-is.
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); if (Number.isNaN(d.getTime())) return s; d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtDay = (s, withYear = false) => {
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? String(s) : new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(d);
};
const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
const hourFull = (h) => `${h % 12 || 12}:00 ${h < 12 ? 'am' : 'pm'} – ${(h + 1) % 12 || 12}:00 ${(h + 1) % 24 < 12 ? 'am' : 'pm'}`;

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
const RefreshGlyph = () => <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} />;

// What each card shows — opened by its ⓘ button.
const INFO = {
  visits: 'A visit is a page that actually opened and ran the store’s tracker. Bots, Meta’s own ad-review checks and link previews are left out. A new visit starts after 30 minutes away, or when someone arrives from a new ad or campaign link.',
  orders: 'Every order placed in the period except cancelled ones, so it matches “Orders booked” on the Overview. Delivered shows how many have reached the customer.',
  conversion: 'Orders divided by tracked visits. 1 order from 100 visits is 1%.',
  revenue: 'The total value of the placed orders in the period (after discounts, with shipping). Average order is revenue divided by orders.',
  overTime: 'Tracked visits per hour of the day (India time) when one day is picked, or per day for a longer range. Hover a bar for its orders.',
  sources: 'Each visit gets one source, checked in this order: the link’s UTM tags, the site that sent the visitor, an ad click id in the link (Meta or Google), the app’s own browser (Instagram, Facebook), and otherwise Direct. Every spelling of a platform (fb, m.facebook.com…) counts as that platform.',
  visitCheck: 'Five checks on what the visits are made of. Different devices: how many different phones made them. From a Meta click: visits with a Facebook/Instagram click id; many visits sharing one click id means a link was copied and shared. Clicks → visits: our visits against Meta’s link clicks (from the connected ad account). Viewed a product: visits that went beyond landing. Paid tags: visits whose link carried UTM tags. Green 80%+, orange 50–80%, red under 50%.',
  funnel: 'Visits that reached each step: opened the store, viewed a product, added to cart or tapped Buy now, opened checkout, ordered. A later step counts for the earlier ones, so no bar is longer than the one above it.',
  split: 'Paid: visits from an ad (paid UTM tags or an ad click id). Organic: search engines, social posts, email and other sites. Direct: typed address, bookmarks and apps that send no source.',
  placements: 'Meta’s own landing page views per placement, named the way Ads Manager names them, from the connected ad account (Ads tab, synced every 3 hours). WhatsApp Status and Audience Network open the ad link in the phone’s browser, so the store sees them as plain Chrome visits; this shows where they really came from. Hover a bar for spend, link clicks and our own visits and orders from that placement (the ad’s URL parameters must end with &placement={{placement}}).',
  platforms: 'The same Meta landing page views grouped by app: Facebook, Instagram, WhatsApp, Messenger and Audience Network (ads inside other apps).',
  devices: 'Mobile, desktop or tablet, read from each visitor’s browser.',
  states: 'Where visitors are, from their network location, counted by the store on every page load. Indian states only; the top 8 are shown.',
  pages: 'The first page of each visit. Ads should land on the page they promise; a page with many visits and few product views needs a look.',
  campaigns: 'Visits per ad campaign, read from the utm_campaign tag on the ad link. Ads without URL parameters fall under “not tagged”. Hover a bar for its orders and revenue.',
};

export default function TrafficReport() {
  const [from, setFrom] = useReportState('from', shiftDay(istDate(), -29));
  const [to, setTo] = useReportState('to', istDate());
  const [brandId, setBrandId] = useReportState('brandId', '');
  const [brandList, setBrandList] = useState([]);

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  // Keyed on range + brand: a slow response for an old selection can never
  // replace the newer one.
  const { data, isLoading, isFetching, error, refetch } = useQuery({
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

  // Nothing from before tracking was rebuilt (the server's dataFrom, India
  // time) is shown, so charts start on that day and the header says so.
  const dataFrom = data?.dataFrom ? new Date(data.dataFrom) : null;
  const dataFromDay = dataFrom ? new Date(dataFrom.getTime() + 330 * 60000).toISOString().slice(0, 10) : '';
  const shownFrom = dataFromDay && from < dataFromDay ? dataFromDay : from;
  const dataFromLabel = dataFrom
    ? dataFrom.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
  const oneDay = shownFrom === to;

  const t = data?.totals;
  const brands = data?.brands || [];
  const vc = data?.visitCheck || null;
  const vis = data?.visitors || null;
  const visits = Number(t?.sessions) || 0;
  const brandName = brandId ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name) : 'All brands';

  // Per-day series for the tiles' sparklines and the multi-day bars.
  const days = useMemo(() => {
    const by = new Map((data?.daily || []).map((r) => [r.day, r]));
    const out = [];
    for (let d = shownFrom; d && d <= to && out.length < 400; d = shiftDay(d, 1)) {
      const r = by.get(d) || {};
      out.push({ day: d, visits: Number(r.trackedSessions) || 0, orders: Number(r.orders) || 0, value: Number(r.value) || 0, conversion: Number(r.conversion) || 0 });
    }
    return out;
  }, [data, shownFrom, to]);

  const overTime = useMemo(() => {
    if (oneDay) {
      return (data?.hourly || []).map((h) => ({ label: hourLabel(h.hour), full: hourFull(h.hour), value: h.visits }));
    }
    return days.map((d) => ({ label: fmtDay(d.day), full: fmtDay(d.day, true), value: d.visits, extra: `${plural(d.orders, 'order')} · ${inr(d.value)}` }));
  }, [oneDay, data, days]);

  const sources = (data?.channels || [])
    .filter((c) => !c.untracked && Number(c.sessions) > 0)
    .map((c) => ({ name: chLabel(c.channel), value: Number(c.sessions) || 0, color: CHANNEL_COLORS[c.channel] }));

  const split = (data?.trafficSplit || [])
    .filter((r) => Number(r.sessions) > 0)
    .map((r) => ({ name: r.type, value: Number(r.sessions) || 0, color: SPLIT_COLORS[r.type] }));
  const paidShare = share(split.find((r) => r.name === 'Paid')?.value || 0, split.reduce((n, r) => n + r.value, 0));

  const drop = data?.dropOff?.totals || { visits: 0, views: 0, carts: 0, checkouts: 0, ordered: 0 };
  const funnelBase = Number(drop.visits) || 0;
  const funnel = [
    { name: 'Visited the store', value: funnelBase },
    { name: 'Viewed a product', value: Number(drop.views) || 0 },
    { name: 'Added to cart / Buy now', value: Number(drop.carts) || 0 },
    { name: 'Opened checkout', value: Number(drop.checkouts) || 0 },
    { name: 'Ordered', value: Number(drop.ordered) || 0 },
  ].map((s, i, all) => ({
    ...s,
    text: `${num(s.value)} · ${share(s.value, funnelBase)}%`,
    tip: [`${plural(s.value, 'visit')} · ${share(s.value, funnelBase)}% of visits`, i ? `${num(Math.max(0, all[i - 1].value - s.value))} stopped before this step` : null].filter(Boolean),
  }));

  // Meta placements (Meta's numbers, or our tagged visits when Meta's aren't synced).
  const placements = (vc?.placements || []).map((p) => {
    const value = p.fromMeta ? p.landingPageViews : p.visits;
    const tip = [
      p.fromMeta ? `${num(p.landingPageViews)} landing page views · ${num(p.linkClicks)} link clicks · ${inr(p.spend)} spent` : null,
      p.devices?.length ? p.devices.join(', ') : null,
      p.visits ? `Our visits: ${num(p.visits)} · viewed a product ${num(p.active)} · ${plural(p.orders, 'order')}` : null,
    ].filter(Boolean);
    return { name: `${p.platform} · ${p.placement}`, platform: p.platform, value, tip, color: PLATFORM_COLORS[p.platform] || 'var(--ds-color-text-faint)' };
  }).filter((p) => p.value > 0);
  const placementsFromMeta = (vc?.placements || []).some((p) => p.fromMeta);
  const platformTotals = [...placements.reduce((m, p) => m.set(p.platform, (m.get(p.platform) || 0) + p.value), new Map())]
    .map(([name, value]) => ({ name, value, color: PLATFORM_COLORS[name] || 'var(--ds-color-text-faint)' }))
    .sort((a, b) => b.value - a.value);

  const devices = (data?.trackedDevices?.length ? data.trackedDevices.map((d) => ({ device: d.device, n: d.visits })) : (vis?.devices || []).map((d) => ({ device: d.device, n: d.sessions })))
    .filter((d) => d.n > 0)
    .map((d) => ({ name: DEVICE_LABEL[d.device] || d.device, value: d.n, color: DEVICE_COLORS[d.device] || 'var(--ds-color-text-faint)' }));

  const states = (vis?.states || []).slice(0, 8).map((s) => ({ name: s.state, value: Number(s.sessions) || 0, tip: `${plural(s.sessions, 'visit')} · ${pct(s.share)} of visits` }));

  const pages = (data?.landingPages || []).slice(0, 8).map((p) => ({
    name: p.path === '/' ? 'Home' : p.path, value: Number(p.sessions) || 0, tip: `${p.type} · ${plural(p.sessions, 'visit')} · ${pct(p.share)}`,
  }));

  // Campaigns: platform · campaign, summed over ad sets / ads.
  const campaigns = useMemo(() => {
    const m = new Map();
    for (const r of data?.campaigns || []) {
      // Direct and untracked visits aren't campaigns.
      if (r.channel === 'Direct / untracked' || r.channel === 'Direct') continue;
      const name = `${chLabel(r.channel || 'Referral')} · ${r.campaign && r.campaign !== 'none' ? r.campaign : 'not tagged'}`;
      const c = m.get(name) || { name, value: 0, orders: 0, revenue: 0, color: CHANNEL_COLORS[r.channel] };
      c.value += Number(r.sessions) || 0; c.orders += Number(r.orders) || 0; c.revenue += Number(r.revenue) || 0;
      m.set(name, c);
    }
    return [...m.values()].filter((c) => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 10)
      .map((c) => ({ ...c, tip: `${plural(c.value, 'visit')} · ${plural(c.orders, 'order')} · ${inr(c.revenue)}` }));
  }, [data]);

  // Visit check gauge.
  const checks = useMemo(() => {
    if (!vc) return [];
    const v = vc.visits;
    const shared = Math.max(0, vc.fbclid - vc.fbclidIds);
    const conv = vc.metaClicks ? share(v, vc.metaClicks) : null;
    return [
      { key: 'Devices', name: 'Different devices', pct: share(vc.devices, v), value: num(vc.devices),
        text: vc.devices >= v * 0.8 ? 'Almost every visit is a different phone.' : 'Many visits come from the same phones.', chip: vc.devices >= v * 0.8 ? 'New people' : 'Repeat phones' },
      { key: 'Meta click', name: 'From a Meta click', pct: share(vc.fbclid, v), value: num(vc.fbclid),
        text: vc.fbclid ? `${plural(vc.fbclidIds, 'different click')}${shared ? `; ${num(shared)} reused a click id (a shared link)` : ''}.` : 'No visits from a Facebook or Instagram link.',
        chip: !vc.fbclid ? 'None' : shared > vc.fbclid * 0.2 ? 'Shared link' : 'Not shared', tone: !vc.fbclid ? null : shared > vc.fbclid * 0.2 ? 'warn' : 'good' },
      { key: 'Clicks → visits', name: 'Meta clicks that became visits', pct: conv, value: vc.metaClicks ? `${num(v)} of ${num(vc.metaClicks)}` : '—',
        text: vc.metaClicks ? `${plural(Math.max(0, vc.metaClicks - v), 'tap')} never opened the page.` : 'Connect the ad account in the Ads tab to compare.',
        chip: conv == null ? 'Needs Meta' : conv >= 80 ? 'Normal gap' : conv >= 50 ? 'Page may be slow' : 'Too many lost' },
      { key: 'Viewed', name: 'Viewed a product', pct: share(vc.active, v), value: num(vc.active),
        text: `${num(Math.max(0, v - vc.active))} only landed and left.`, chip: share(vc.active, v) >= 80 ? 'Interested' : share(vc.active, v) >= 50 ? 'Many left fast' : 'Most left fast' },
      { key: 'Paid tags', name: 'Tagged as paid ads', pct: share(vc.paid, v), value: num(vc.paid),
        text: vc.paid ? 'Visits whose link carried UTM tags.' : 'No UTM tags on the ad links yet.', chip: vc.paid ? 'Tagged' : 'Check URL tags' },
    ];
  }, [vc]);

  const first = isLoading && !data;
  const refreshing = isFetching && !!data;
  const dim = refreshing ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;
  const busy = refreshing || undefined;

  const doExport = () => exportCsv(`traffic-conversion_${from}_${to}.csv`, [
    { label: 'Brand', value: (r) => r.brand },
    { label: 'Tracked visits', value: (r) => r.sessions },
    { label: 'Product views', value: (r) => r.views },
    { label: 'Add to cart / Buy now', value: (r) => r.carts },
    { label: 'Checkout opened', value: (r) => r.checkouts },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Delivered', value: (r) => r.delivered },
    { label: 'Conversion %', value: (r) => r.conversion_rate ?? '' },
    { label: 'Revenue', value: (r) => r.revenue },
    { label: 'AOV', value: (r) => r.aov },
  ], brands);

  return (
    <div className="dashboard-sections obz-rep">
      <PageHeader
        title="Traffic & Conversion"
        subtitle={`${brandName} · ${shownFrom} → ${to} (India time)${isFetching && data ? ' · updating…' : ''}. Where visitors come from and how many of them order.${dataFromLabel ? ` Data from ${dataFromLabel} IST onwards.` : ''}`}
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
            <button type="button" className="order-sync-main-btn" onClick={() => refetch()} disabled={isFetching} aria-busy={isFetching || undefined}>
              <RefreshGlyph /> {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" className="order-sync-main-btn" onClick={doExport} disabled={!brands.length}>
              <DlIcon /> CSV
            </button>
          </div>
        }
      />

      {first ? (
        <>
          <SkeletonKpis count={4} label="Loading traffic report…" />
          <div className="tr2-grid" aria-hidden="true">
            {[8, 4, 12, 8, 4].map((s, i) => (
              <section key={i} className={`tr2-card tr2-c${s}`}><Skeleton w="40%" h={14} r={7} /><Skeleton w="100%" h={180} r={10} /></section>
            ))}
          </div>
        </>
      ) : error ? (
        <div className="rep-state" style={{ color: 'var(--ds-color-danger)' }}>Couldn't load the report: {error.message || 'try again'}</div>
      ) : !data ? null : (
        <>
          <div className="tr2-kpis" style={dim} aria-busy={busy}>
            <KpiTile label="Visits" value={num(visits)} foot={vc ? `${plural(vc.devices, 'different device')}` : 'tracked visits, bots left out'}
              series={days.map((d) => d.visits)} info={INFO.visits} />
            <KpiTile label="Orders" value={num(t?.orders)} foot={`${num(t?.delivered)} delivered so far`}
              series={days.map((d) => d.orders)} color="var(--tr2-s3)" info={INFO.orders} />
            <KpiTile label="Conversion" value={pct(t?.conversion_rate)} foot="orders ÷ visits"
              series={days.map((d) => d.conversion)} color="var(--tr2-s7)" info={INFO.conversion} />
            <KpiTile label="Revenue booked" value={inr(t?.revenue)} foot={`avg order ${inr(t?.aov)}`}
              series={days.map((d) => d.value)} color="var(--tr2-s2)" info={INFO.revenue} />
          </div>

          <div className="tr2-grid">
            <ChartCard span={8} title={oneDay ? 'Visits by hour' : 'Visits by day'} hint="India time" info={INFO.overTime} style={dim} busy={busy}>
              {overTime.some((d) => d.value > 0)
                ? <VBars data={overTime} labelEvery={oneDay ? 2 : Math.max(1, Math.ceil(overTime.length / 12))} />
                : <Empty>No visits in this period yet.</Empty>}
            </ChartCard>
            <ChartCard span={4} title="Where visitors come from" hint="share of visits" info={INFO.sources} style={dim} busy={busy}>
              {sources.length ? <Donut data={sources} sub="visits" /> : <Empty>No visits in this period yet.</Empty>}
            </ChartCard>

            {vc ? (
              <ChartCard span={12} title="Visit check" hint="green 80%+, orange 50–80%, red under 50%" info={INFO.visitCheck} style={dim} busy={busy}>
                <div className="tr2-gauge-row">
                  <VisitGauge total={vc.visits} checks={checks} />
                  <ul className="tr2-checks">
                    {checks.map((c) => {
                      const tone = c.tone || gaugeTone(c.pct);
                      return (
                        <li key={c.key}>
                          <i className={`rep-vc-dot rep-vc-${gaugeTone(c.pct)}`} />
                          <span className="rep-vc-name">{c.name}<span className={`rep-vc-chip rep-vc-${tone}`}>{c.chip}</span></span>
                          <span className="rep-vc-val num">{c.value}</span>
                          <span className="rep-vc-text">{c.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </ChartCard>
            ) : null}

            <ChartCard span={8} title="How far visitors got" hint="visits that reached each step" info={INFO.funnel} style={dim} busy={busy}>
              {funnelBase ? <HBars data={funnel} max={funnelBase} /> : <Empty>No visits in this period yet.</Empty>}
            </ChartCard>
            <ChartCard span={4} title="Paid, organic, direct" hint={split.length ? `${paidShare}% from ads` : undefined} info={INFO.split} style={dim} busy={busy}>
              {split.length ? <Donut data={split} sub="visits" /> : <Empty>No visits in this period yet.</Empty>}
            </ChartCard>

            <ChartCard span={8} title="Meta ads by placement" hint={placementsFromMeta ? 'landing page views, from Ads Manager' : 'our visits per placement'} info={INFO.placements} style={dim} busy={busy}>
              {placements.length
                ? <HBars data={placements} unit={placementsFromMeta ? 'landing page views' : 'visits'} />
                : <Empty>Nothing yet. Connect the store’s ad account in the Ads tab (synced every 3 hours), and end each ad’s URL parameters with &amp;placement=&#123;&#123;placement&#125;&#125;.</Empty>}
            </ChartCard>
            <ChartCard span={4} title="Meta platforms" hint={placementsFromMeta ? 'landing page views' : 'visits'} info={INFO.platforms} style={dim} busy={busy}>
              {platformTotals.length ? <Donut data={platformTotals} sub={placementsFromMeta ? 'page views' : 'visits'} unit={placementsFromMeta ? 'landing page views' : 'visits'} /> : <Empty>No Meta placement data yet.</Empty>}
            </ChartCard>

            <ChartCard span={4} title="Device" info={INFO.devices} style={dim} busy={busy}>
              {devices.length ? <Donut data={devices} sub="visits" /> : <Empty>No visits in this period yet.</Empty>}
            </ChartCard>
            <ChartCard span={4} title="Top states" hint="visits" info={INFO.states} style={dim} busy={busy}>
              {states.length ? <HBars data={states} /> : <Empty>No location data yet. It comes from the store’s own page-load counter.</Empty>}
            </ChartCard>
            <ChartCard span={4} title="Landing pages" hint="first page of each visit" info={INFO.pages} style={dim} busy={busy}>
              {pages.length ? <HBars data={pages} /> : <Empty>No visits in this period yet.</Empty>}
            </ChartCard>

            <ChartCard span={12} title="Ad campaigns" hint="visits per campaign" info={INFO.campaigns} style={dim} busy={busy}>
              {campaigns.length ? <HBars data={campaigns} /> : <Empty>No visits in this period yet.</Empty>}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
