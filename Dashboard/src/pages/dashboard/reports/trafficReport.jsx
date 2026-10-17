import { useState, useEffect, useCallback } from 'react';
import { trafficReportService, brandService } from '../../../services';
import { Button, DateRangePicker } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader, Panel, StatGrid, StatTile, ResponsiveTable } from '../../../components/Dashboard/primitives';

/**
 * Traffic & Conversion — a per-brand funnel: sessions (first-party visit
 * tracking) → orders → revenue, with conversion rate, AOV and a channel
 * (source/medium) breakdown. Themed via --ds tokens (light/dark).
 */

// Brand colours for the Shopify-style marketing channels — categorical identity
// that reads at a glance against the otherwise-monochrome Obzus chrome.
const CHANNEL_COLORS = {
  Direct: '#0f766e', Facebook: '#1877f2', Instagram: '#e1306c', Google: '#ea4335',
  'AI chatbot': '#8b5cf6', Email: '#d97706', SMS: '#16a34a', Referral: '#6366f1',
  Other: '#94a3b8', 'Direct / untracked': '#64748b',
};
const chColor = (name) => CHANNEL_COLORS[name] || 'var(--ds-color-accent, #2563eb)';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : '—');
const inr = (v) => `₹${num(Math.round(Number(v) || 0))}`;
const pct = (v) => `${(Number(v) || 0).toFixed(2)}%`;

// Colours for the Paid / Organic / Direct split (blue / green / slate).
const SPLIT_COLORS = { Paid: '#2f6fed', Organic: '#16a34a', Direct: '#64748b' };
// Normalise provider short-codes for display: fb → facebook, ig → instagram.
const srcLabel = (s) => {
  const k = String(s || '').toLowerCase().trim();
  if (k === 'fb' || k === 'facebook') return 'facebook';
  if (k === 'ig' || k === 'instagram') return 'instagram';
  return s;
};

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

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' },
  sub: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  controls: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  panel: { background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, padding: 18 },
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 },
  kpi: { minWidth: 0, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, padding: '16px 18px 14px' },
  kLab: { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' },
  kVal: { fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 'clamp(18px, 5vw, 26px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 0', color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'right', padding: '10px 12px', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)', borderBottom: '1px solid var(--ds-color-border)', whiteSpace: 'nowrap' },
  thL: { textAlign: 'left' },
  td: { textAlign: 'right', padding: '11px 12px', color: 'var(--ds-color-text)', borderBottom: '1px solid var(--ds-color-border)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  tdL: { textAlign: 'left', fontWeight: 700 },
  chan: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  chip: { fontSize: 10.5, fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', color: 'var(--ds-color-text-muted)', border: '1px solid var(--ds-color-border)', borderRadius: 20, padding: '2px 8px' },
  empty: { padding: 40, textAlign: 'center', color: 'var(--ds-color-text-muted)', fontSize: 13 },
};

// Tabular-number cells for the ResponsiveTable numeric columns.
const tdNum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export default function TrafficReport() {
  const [from, setFrom] = useState(shiftDay(istDate(), -29));
  const [to, setTo] = useState(istDate());
  const [brandId, setBrandId] = useState('');     // '' = all brands
  const [brandList, setBrandList] = useState([]);  // for the dropdown options
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Brand options for the filter dropdown — fetched once, independent of the
  // report response (which collapses to a single brand once one is selected).
  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  const load = useCallback(async (bId = brandId) => {
    setLoading(true); setError('');
    try {
      const res = await trafficReportService.getBrandTraffic(from, to, bId || undefined);
      if (res?.success) setData(res); else setError(res?.message || 'Failed to load report');
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load report');
    } finally { setLoading(false); }
  }, [from, to, brandId]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Changing the brand reloads immediately (date changes still apply on "Apply").
  const onBrandChange = (val) => { const v = val === 'all' ? '' : val; setBrandId(v); load(v); };

  const t = data?.totals;
  const brands = data?.brands || [];

  const doExport = () => exportCsv(`traffic-conversion_${from}_${to}.csv`, [
    { label: 'Brand', value: (r) => r.brand },
    { label: 'Visits', value: (r) => r.sessions },
    { label: 'Product views', value: (r) => r.views },
    { label: 'Add to cart', value: (r) => r.carts },
    { label: 'Checkout', value: (r) => r.checkouts },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Delivered', value: (r) => r.delivered },
    { label: 'Conversion %', value: (r) => r.conversion_rate },
    { label: 'Revenue', value: (r) => r.revenue },
    { label: 'AOV', value: (r) => r.aov },
  ], brands);

  return (
    <div style={S.wrap}>
      <PageHeader
        title="Traffic & Conversion"
        subtitle="Visits → views → cart → checkout → orders per brand. Visits/views/cart/checkout are first-party tracked events; orders & revenue are the real store sales in this window (they match the Overview report). Per-channel orders below count only orders we can attribute to a tracked visit."
        actions={
          <>
            <Dropdown
              value={brandId || 'all'}
              onChange={onBrandChange}
              options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: b.id, label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <DateRangePicker label="Period" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} onApply={() => load()} maxDate={istDate()} />
            <Button variant="ghost" onClick={doExport} disabled={!brands.length || loading}>Export CSV</Button>
          </>
        }
      />

      {error ? <div style={{ ...S.panel, color: 'var(--ds-color-danger, #dc2626)' }}>{error}</div> : null}

      {/* Totals */}
      <StatGrid>
        <StatTile label="All visits" value={num(t?.allVisits)} sub="Every visitor · cookieless" />
        <StatTile label="Tracked visits" value={num(t?.sessions)} sub="Consented · drives funnel" />
        <StatTile label="Orders" value={num(t?.orders)} />
        <StatTile label="Conversion" value={t ? pct(t.conversion_rate) : '—'} />
        <StatTile label="Revenue" value={t ? inr(t.revenue) : '—'} />
        <StatTile label="AOV" value={t ? inr(t.aov) : '—'} />
      </StatGrid>

      {/* Paid vs Organic vs Direct — the hero split, right under the KPIs so
          spend is managed at a glance: a stacked revenue bar + colour-coded
          rows. Paid = utm_medium=paid/cpc; Direct includes untracked orders. */}
      {data?.trafficSplit?.length ? (() => {
        const totRev = data.trafficSplit.reduce((n, r) => n + (Number(r.revenue) || 0), 0) || 1;
        return (
          <Panel
            title="Paid vs Organic vs Direct"
            subtitle="Where your revenue came from. Paid = ads tagged utm_medium=paid/cpc; Direct includes untracked orders; everything else (organic search, social, referral, email) is Organic. Reconciles with the headline Orders."
          >
            <div style={{ display: 'flex', height: 14, borderRadius: 8, overflow: 'hidden', margin: '2px 0 16px', background: 'var(--ds-color-border)' }}>
              {data.trafficSplit.map((r) => (
                <div key={r.type} title={`${r.type}: ${inr(r.revenue)}`}
                  style={{ width: `${Math.max(0, (Number(r.revenue) || 0) / totRev * 100)}%`, background: SPLIT_COLORS[r.type] || '#94a3b8' }} />
              ))}
            </div>
            <div style={{ display: 'grid', gap: 11 }}>
              {data.trafficSplit.map((r) => (
                <div key={r.type} style={{ display: 'grid', gridTemplateColumns: '13px 1fr auto auto', gap: 12, alignItems: 'center' }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: SPLIT_COLORS[r.type] || '#94a3b8' }} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ds-color-text)' }}>{r.type}</span>
                  <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {num(r.sessions)} visits · {num(r.orders)} orders{r.conversion_rate != null ? ` · ${pct(r.conversion_rate)}` : ''}
                  </span>
                  <span style={{ fontWeight: 700, textAlign: 'right', minWidth: 84, fontVariantNumeric: 'tabular-nums', color: 'var(--ds-color-text)' }}>{inr(r.revenue)}</span>
                </div>
              ))}
            </div>
          </Panel>
        );
      })() : null}

      {/* Funnel (all brands combined) */}
      {t?.stages?.length ? (
        <Panel title={`Funnel — ${brandId ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || 'brand') : 'all brands'}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {t.stages.map((st) => {
              const w = Math.min(100, Math.max(0, st.overall_rate ?? 0));
              const inside = w >= 16; // wide enough to hold the label inside the fill
              return (
              <div key={st.key} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 190px', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ds-color-text)', fontWeight: 600 }}>{st.label}</span>
                <div style={{ background: 'var(--ds-color-border)', borderRadius: 8, height: 26, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${Math.max(2, w)}%`, height: '100%', background: 'var(--ds-color-accent, #2563eb)', borderRadius: 8, transition: 'width .3s' }} />
                  <span style={{
                    position: 'absolute', top: 0, height: '100%', display: 'flex', alignItems: 'center',
                    fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                    left: inside ? 10 : `calc(${w}% + 8px)`,
                    color: inside ? 'var(--ds-color-surface)' : 'var(--ds-color-text)',
                  }}>{pct(st.overall_rate ?? 0)}</span>
                </div>
                <span style={{ fontSize: 12.5, textAlign: 'right', color: 'var(--ds-color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  <b style={{ color: 'var(--ds-color-text)' }}>{num(st.count)}</b>
                  {st.step_rate != null ? <span> · {pct(st.step_rate)} from prev</span> : null}
                </span>
              </div>
              );
            })}
          </div>
          <p style={{ ...S.sub, marginTop: 12 }}>Bar % = share of Visits (top = 100%); the right shows the count and the step conversion from the previous stage. Bot/crawler traffic is excluded. Visits/views/cart/checkout are first-party events; orders/delivered come from the order records.</p>
        </Panel>
      ) : null}

      {/* Traffic sources — grouped into Shopify-style marketing channels */}
      {data?.channels?.length ? (
        <Panel
          title="Traffic sources — where visitors come from"
          subtitle="Grouped the way Shopify does: Direct (no referrer or a hop within our own sites), Facebook/Instagram/Google, AI chatbots, Email, SMS and Referral. Self-referrals from our own domains roll into Direct. Orders here are only those we can tie to a tracked visit; orders with no visit are shown as the Direct / untracked row so the totals always reconcile."
          flush
        >
          <ResponsiveTable
            rowKey={(r) => r.channel}
            data={data.channels}
            emptyMessage="No traffic sources yet."
            columns={[
              { key: 'channel', label: 'Channel', render: (s) => (
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: chColor(s.channel), marginRight: 8, verticalAlign: 'middle' }} />{s.channel}</span>
              ) },
              { key: 'allVisits', label: 'All visits', cellStyle: tdNum, render: (s) => (s.untracked ? '—' : num(s.allVisits)) },
              { key: 'sessions', label: 'Tracked', cellStyle: tdNum, render: (s) => (s.untracked ? '—' : num(s.sessions)) },
              { key: 'share', label: 'Share', cellStyle: tdNum, render: (s) => (s.untracked ? '—' : pct(s.share)) },
              { key: 'orders', label: 'Orders', cellStyle: tdNum, render: (s) => num(s.orders) },
              // Untracked orders have no tracked visit, so a visit→order rate is N/A.
              { key: 'conversion_rate', label: 'Conversion', cellStyle: tdNum, render: (s) => (s.untracked || s.conversion_rate == null ? '—' : pct(s.conversion_rate)) },
              { key: 'bar', label: 'Share of visits', headerStyle: { width: '30%' }, render: (s) => (
                <div style={{ background: 'var(--ds-color-border)', borderRadius: 6, height: 14, overflow: 'hidden', minWidth: 120 }}>
                  {!s.untracked && (
                    <div style={{ width: `${Math.min(100, Math.max(2, s.share))}%`, height: '100%', background: chColor(s.channel), borderRadius: 6 }} />
                  )}
                </div>
              ) },
            ]}
          />
        </Panel>
      ) : null}

      {/* Campaigns (UTM) — folded in from the retired UTM Analytics page.
          Source / medium / campaign with visits, orders, conversion & revenue,
          counted the same way as the channel table so the numbers reconcile. */}
      {data?.campaigns?.length ? (
        <Panel
          title="Campaigns (UTM) — campaign · ad set · ad · creative"
          subtitle="Attributed from the ad URL's utm_* tags (source/medium/campaign = {{campaign.name}}, ad set = utm_term, ad = utm_content, creative = utm_creative). Orders & revenue exclude cancelled orders, so these reconcile with the headline totals."
          flush
        >
          <ResponsiveTable
            rowKey={(r) => `${r.source}|${r.medium}|${r.campaign}|${r.adset}|${r.ad}|${r.creative}`}
            data={data.campaigns}
            emptyMessage="No campaign traffic yet."
            columns={[
              { key: 'source', label: 'Source', render: (r) => <span style={S.chip}>{srcLabel(r.source)}</span> },
              { key: 'campaign', label: 'Campaign', render: (r) => (r.campaign && r.campaign !== 'none' ? r.campaign : <span style={{ color: 'var(--ds-color-text-faint)' }}>—</span>) },
              { key: 'adset', label: 'Ad set', render: (r) => (r.adset && r.adset !== 'none' ? r.adset : <span style={{ color: 'var(--ds-color-text-faint)' }}>—</span>) },
              { key: 'ad', label: 'Ad', render: (r) => (r.ad && r.ad !== 'none' ? r.ad : <span style={{ color: 'var(--ds-color-text-faint)' }}>—</span>) },
              { key: 'creative', label: 'Creative', render: (r) => (r.creative && r.creative !== 'none' ? <span style={S.chip}>{r.creative}</span> : <span style={{ color: 'var(--ds-color-text-faint)' }}>—</span>) },
              { key: 'sessions', label: 'Visits', cellStyle: tdNum, render: (r) => num(r.sessions) },
              { key: 'orders', label: 'Orders', cellStyle: tdNum, render: (r) => num(r.orders) },
              { key: 'conversion_rate', label: 'Conv.', cellStyle: tdNum, render: (r) => pct(r.conversion_rate) },
              { key: 'revenue', label: 'Revenue', cellStyle: tdNum, render: (r) => inr(r.revenue) },
            ]}
          />
        </Panel>
      ) : null}

      {/* Per-brand table */}
      <Panel flush>
        <ResponsiveTable
          rowKey="brand_id"
          data={brands}
          emptyMessage={loading ? 'Loading…' : 'No data for this period yet.'}
          columns={[
            { key: 'brand', label: 'Brand', render: (b) => b.brand },
            { key: 'sessions', label: 'Visits', cellStyle: tdNum, render: (b) => num(b.sessions) },
            { key: 'views', label: 'Views', cellStyle: tdNum, render: (b) => num(b.views) },
            { key: 'carts', label: 'Cart', cellStyle: tdNum, render: (b) => num(b.carts) },
            { key: 'checkouts', label: 'Checkout', cellStyle: tdNum, render: (b) => num(b.checkouts) },
            { key: 'orders', label: 'Orders', cellStyle: tdNum, render: (b) => num(b.orders) },
            { key: 'delivered', label: 'Delivered', cellStyle: tdNum, render: (b) => num(b.delivered) },
            { key: 'conversion_rate', label: 'Conv.', cellStyle: tdNum, render: (b) => pct(b.conversion_rate) },
            { key: 'revenue', label: 'Revenue', cellStyle: tdNum, render: (b) => inr(b.revenue) },
            { key: 'aov', label: 'AOV', cellStyle: tdNum, render: (b) => inr(b.aov) },
            { key: 'channels', label: 'Top channels', render: (b) => (
              <div style={S.chan}>
                {(b.channels || []).length === 0 ? <span style={S.chip}>—</span>
                  : b.channels.map((c, i) => (
                    <span key={i} style={S.chip}>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: chColor(c.channel), marginRight: 6, verticalAlign: 'middle' }} />
                      {c.channel} · {num(c.sessions)}
                    </span>
                  ))}
              </div>
            ) },
          ]}
        />
      </Panel>
    </div>
  );
}
