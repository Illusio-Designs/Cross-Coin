import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Loader from '../../../components/common/Loader';
import { trafficReportService, brandService } from '../../../services';
import { DateRangePicker } from '../../../components/ui';
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
  Other: '#94a3b8', 'Direct / untracked': '#64748b',
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
const blank = (v) => !v || v === 'none';
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
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

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

  // Hide ad set / ad / creative columns when no campaign uses them.
  const campCols = useMemo(() => ({
    adset: campaigns.some((c) => !blank(c.adset)),
    ad: campaigns.some((c) => !blank(c.ad)),
    creative: campaigns.some((c) => !blank(c.creative)),
  }), [campaigns]);
  const shownCampaigns = showAllCampaigns ? campaigns : campaigns.slice(0, 15);
  const splitRevenue = split.reduce((n, r) => n + (Number(r.revenue) || 0), 0);

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

      {isLoading ? (
        <div className="rep-state"><Loader /></div>
      ) : error ? (
        <div className="rep-state" style={{ color: 'var(--ds-color-danger)' }}>Couldn't load the report: {error.message || 'try again'}</div>
      ) : !data ? null : (
        <>
          <div className="rep-kpis">
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

          <div className="rep-masonry">
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

            {/* Funnel */}
            <div className="rep-panel">
              <div className="rep-ph"><h3>Funnel</h3><span className="hint">% of visits · step %</span></div>
              <div className="rep-bars">
                {(t?.stages || []).map((st) => {
                  const w = Math.min(100, Math.max(0, Number(st.overall_rate) || 0));
                  return (
                    <div className="rep-bar-row" key={st.key}>
                      <div className="rep-bar-top">
                        <span className="rep-bar-name"><span className="lbl">{st.label}</span></span>
                        <span className="rep-sb-pct num">
                          {num(st.count)}
                          {st.step_rate != null && st.count > 0 && <span style={{ color: 'var(--ds-color-text-faint)' }}> · {pct(st.step_rate)} of prev</span>}
                        </span>
                      </div>
                      <div className="rep-track"><div className="rep-fill" style={{ width: `${w > 0 ? Math.max(1, w) : 0}%`, background: 'var(--rr1)' }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channels */}
            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph"><h3>Channels</h3><span className="hint">orders credited to the visit that led to them</span></div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead><tr><th>Channel</th><th className="r">Visits</th><th className="r">Share</th><th className="r">Orders</th><th className="r">Conv.</th></tr></thead>
                  <tbody>
                    {channels.length === 0 ? <Empty cols={5} text="No visits in this period" /> : channels.map((c) => (
                      <tr key={c.channel}>
                        <td className="strong" style={{ whiteSpace: 'nowrap' }}><Dot color={chColor(c.channel)} />{c.channel}</td>
                        <td className="r num">{c.untracked ? <Dash /> : num(c.sessions)}</td>
                        <td className="r num">{c.untracked ? <Dash /> : pct(c.share)}</td>
                        <td className="r strong num">{num(c.orders)}</td>
                        <td className="r num">{c.untracked ? <Dash /> : pct(c.conversion_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

          {/* Campaigns — full width, it's the widest table */}
          <div className="rep-panel rep-panel--flush">
            <div className="rep-ph">
              <h3>Ad campaigns</h3>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="hint">from the ad link's utm tags</span>
                <button type="button" className="order-sync-main-btn" onClick={exportCampaigns} disabled={!campaigns.length}><DlIcon /> CSV</button>
              </span>
            </div>
            <div className="rep-tbl-wrap">
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Source</th><th>Campaign</th>
                    {campCols.adset && <th>Ad set</th>}
                    {campCols.ad && <th>Ad</th>}
                    {campCols.creative && <th>Creative</th>}
                    <th className="r">Visits</th><th className="r">Orders</th><th className="r">Conv.</th><th className="r">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? <Empty cols={9} text="No campaign traffic in this period" /> : shownCampaigns.map((r) => (
                    <tr key={`${r.source}|${r.medium}|${r.campaign}|${r.adset}|${r.ad}|${r.creative}`}>
                      <td className="strong" style={{ whiteSpace: 'nowrap' }}>
                        {srcLabel(r.source)}
                        {!blank(r.medium) && <span style={{ color: 'var(--ds-color-text-faint)', fontWeight: 400 }}> / {r.medium}</span>}
                      </td>
                      <td>{blank(r.campaign) ? <Dash /> : r.campaign}</td>
                      {campCols.adset && <td>{blank(r.adset) ? <Dash /> : r.adset}</td>}
                      {campCols.ad && <td>{blank(r.ad) ? <Dash /> : r.ad}</td>}
                      {campCols.creative && <td>{blank(r.creative) ? <Dash /> : r.creative}</td>}
                      <td className="r num">{r.source === '(untracked)' ? <Dash /> : num(r.sessions)}</td>
                      <td className="r num">{num(r.orders)}</td>
                      <td className="r num">{pct(r.conversion_rate)}</td>
                      <td className="r strong num">{inr(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {campaigns.length > 15 && (
              <div style={{ padding: '10px 16px' }}>
                <button type="button" className="order-sync-main-btn order-sync-main-btn--ghost" onClick={() => setShowAllCampaigns((v) => !v)}>
                  {showAllCampaigns ? 'Show top 15' : `Show all ${campaigns.length}`}
                </button>
              </div>
            )}
          </div>

          <div className="rep-panel">
            <div className="rep-ph"><h3>How this is counted</h3></div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 }}>
              <li><b style={{ color: 'var(--ds-color-text)' }}>Visits</b> are visits that started in this period from shoppers who allowed cookies; bots are left out. Page loads count every visitor but can't be tied to orders.</li>
              <li><b style={{ color: 'var(--ds-color-text)' }}>Orders</b> are orders placed in this period that weren't cancelled — the same as “Orders booked” on the Overview.</li>
              <li>A channel or campaign gets the order even if the ad click was before this period. Orders with no tracked visit show as <b style={{ color: 'var(--ds-color-text)' }}>Direct / untracked</b>, so every table adds up to the Orders total.</li>
              <li>Paid = ads tagged utm_medium paid / cpc. Direct = no source or our own sites. Everything else (search, social posts, email, referral) is Organic.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
