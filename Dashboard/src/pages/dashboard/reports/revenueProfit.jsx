import { useState, useEffect, useCallback, useMemo } from 'react';
import { trafficReportService } from '../../../services';
import { Button, DateRangePicker, Input, Table, SkeletonKpis } from '../../../components/ui';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';
import Dropdown from '../../../components/ui/Dropdown';
import { useReportState } from '../../../lib/reportFilters';

/**
 * Revenue & Gross Profit — per brand, on the Shopify basis: a sale counts when
 * the order is PLACED in the period (cancelled and RTO orders left out, refunds
 * subtracted), so revenue lines up with the period's shipping and ad spend.
 *
 *   Revenue        = value of orders sold − refunds paid
 *   Revenue ex-GST = revenue ÷ (1 + brand GST %)   ← GST isn't your money
 *   Costs          = COGS (cost price × units sold)
 *                  + shipping × shipped orders + return shipping × RTO orders
 *                  + service charge × delivered orders
 *                  + gateway % of prepaid revenue + COD fee % of COD revenue
 *   Profit before ads = revenue ex-GST − costs;  after ads = − ad spend/unit × units
 *
 * Orders received / units ordered count every order PLACED in the period
 * (all but cancelled), whatever happened to it later — and "Orders by source"
 * splits them by the channel the order came from (same channels as Traffic).
 *
 * Ad spend: when Meta spend is synced for a brand (Reports → Ads), the
 * backend sends it as `adSpend` for the period and it is used as is ("from
 * Meta"). Brands with no synced spend keep the manual ad spend per unit.
 * Every cost knob and each manual ad spend is remembered in this browser.
 */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : '—');
const inr = (v) => `₹${num(Math.round(Number(v) || 0))}`;

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

const MISSING_COLUMNS = [
  { header: 'Brand', accessor: 'brand', align: 'left', cell: ({ brand }) => brand || '—' },
  { header: 'Product', accessor: 'productName', align: 'left', cell: ({ productName }) => <strong>{productName}</strong> },
  { header: 'Variant', accessor: 'variant', align: 'left', cell: ({ variant }) => variant || '—' },
  { header: 'SKU', accessor: 'sku', align: 'left', cell: ({ sku }) => sku || '—' },
  { header: 'Price', accessor: 'price', align: 'right', cell: ({ value }) => inr(value) },
];

// Small label under the ad spend figures: "from Meta" / "manual".
const adTagStyle = { fontSize: 10.5, fontWeight: 600, color: 'var(--ds-color-text-faint)', whiteSpace: 'nowrap' };

// Profit cell — green when positive, red when negative; bold on the totals row.
const ProfitCell = (v, bold) => (
  <span style={{ fontWeight: bold ? 800 : 700, color: (Number(v) || 0) >= 0 ? 'var(--ds-color-success, #12b76a)' : 'var(--ds-color-danger, #dc2626)' }}>
    {inr(v)}
  </span>
);

export default function RevenueProfitReport() {
  const [from, setFrom] = useReportState('from', shiftDay(istDate(), -29));
  const [to, setTo] = useReportState('to', istDate());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Cost knobs, remembered in this browser between visits.
  const [knobs, setKnobs] = useState(() => {
    const base = { shipping: '90', service: '30', gatewayPct: '2', codPct: '2' };
    // rtoShipping was a separate knob earlier; the shipping rate already covers
    // the RTO return leg, so drop any saved value instead of charging twice.
    try { const { rtoShipping, ...saved } = JSON.parse(localStorage.getItem('rp_knobs') || '{}'); void rtoShipping; return { ...base, ...saved }; } catch { return base; }
  });
  const setKnob = (k) => (e) => setKnobs((m) => ({ ...m, [k]: e.target.value }));
  // Ad spend per UNIT, per brand (each brand runs its own ads). Keyed by brandId.
  const [cppByBrand, setCppByBrand] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rp_cpp') || '{}'); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem('rp_knobs', JSON.stringify(knobs)); } catch { /* private mode */ } }, [knobs]);
  useEffect(() => { try { localStorage.setItem('rp_cpp', JSON.stringify(cppByBrand)); } catch { /* private mode */ } }, [cppByBrand]);

  // "Missing cost price" finder (loaded on demand).
  const [missing, setMissing] = useState(null);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingError, setMissingError] = useState('');

  const loadMissing = useCallback(async () => {
    setMissingLoading(true); setMissingError('');
    try {
      const res = await trafficReportService.getMissingCostPrices();
      if (res?.success) setMissing(res); else setMissingError(res?.message || 'Failed to load');
    } catch (e) {
      setMissingError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally { setMissingLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await trafficReportService.getRevenueProfit(from, to);
      if (res?.success) {
        setData(res);
      } else setError(res?.message || 'Failed to load report');
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load report');
    } finally { setLoading(false); }
  }, [from, to]);

  // Reload as soon as a complete range is picked — no Apply button.
  useEffect(() => { if (from && to) load(); /* eslint-disable-next-line */ }, [from, to]);

  const k = (name) => Number(knobs[name]) || 0;
  const cppPerUnit = (brandId) => Number(cppByBrand[brandId] ?? '') || 0;

  // Apply the knobs to a raw brand row → cost lines and profit.
  const withProfit = (r) => {
    const brandId = r.brandId;
    const orders = Number(r.orders) || 0;
    const units = Number(r.units) || 0;
    const revenue = Number(r.revenue) || 0;
    const revenueExGst = Number(r.revenueExGst ?? revenue) || 0;
    const cogs = Number(r.cogs) || 0;
    // One shipping charge per shipped order. RTO orders are already in
    // shippedOrders and the rate includes the return leg — never charged twice.
    const shipTotal = k('shipping') * (Number(r.shippedOrders) || 0);
    const svcTotal = k('service') * orders;
    const feeTotal = (k('gatewayPct') / 100) * (Number(r.prepaidRevenue) || 0) + (k('codPct') / 100) * (Number(r.codRevenue) || 0);
    const beforeAds = revenueExGst - cogs - shipTotal - svcTotal - feeTotal;
    // Real Meta spend when synced; otherwise the manual figure per unit.
    const adFromMeta = r.adSpend !== null && r.adSpend !== undefined;
    const adSpend = adFromMeta ? Number(r.adSpend) || 0 : cppPerUnit(brandId) * units;
    const adPerUnit = adFromMeta ? (units > 0 ? adSpend / units : 0) : cppPerUnit(brandId);
    const afterAds = beforeAds - adSpend;
    const marginAfter = revenueExGst > 0 ? (afterAds / revenueExGst) * 100 : 0;
    return { ...r, brandId, orders, units, revenue, revenueExGst, refunds: Number(r.refunds) || 0, rtoOrders: Number(r.rtoOrders) || 0,
      cogs, shipTotal, svcTotal, feeTotal, beforeAds, adPerUnit, adSpend, adFromMeta, afterAds, marginAfter };
  };

  const brands = useMemo(() => (data?.brands || []).map(withProfit), [data, knobs, cppByBrand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Totals aggregate the per-brand rows so each brand's own ad spend flows up.
  const totals = useMemo(() => {
    if (!brands.length) return null;
    const t = brands.reduce((a, r) => {
      a.placedOrders += Number(r.placedOrders) || 0; a.placedUnits += Number(r.placedUnits) || 0;
      a.orders += r.orders; a.units += r.units; a.revenue += r.revenue; a.revenueExGst += r.revenueExGst; a.cogs += r.cogs;
      a.refunds += r.refunds; a.rtoOrders += r.rtoOrders;
      a.shipTotal += r.shipTotal; a.svcTotal += r.svcTotal; a.feeTotal += r.feeTotal;
      a.beforeAds += r.beforeAds; a.adSpend += r.adSpend; a.afterAds += r.afterAds;
      return a;
    }, { placedOrders: 0, placedUnits: 0, orders: 0, units: 0, revenue: 0, revenueExGst: 0, refunds: 0, rtoOrders: 0, cogs: 0, shipTotal: 0, svcTotal: 0, feeTotal: 0, beforeAds: 0, adSpend: 0, afterAds: 0 });
    t.adPerUnit = t.units > 0 ? t.adSpend / t.units : 0; // blended ad spend / unit
    t.marginAfter = t.revenueExGst > 0 ? (t.afterAds / t.revenueExGst) * 100 : 0;
    return t;
  }, [brands]);

  const unitsWithoutCost = Number(data?.totals?.unitsWithoutCost || 0);
  const placed = data?.totals || null;

  // Orders by source — all stores, or the one picked.
  const [sourceBrand, setSourceBrand] = useState('');
  const sourceTable = useMemo(() => {
    const acc = new Map();
    for (const r of data?.sources || []) {
      if (sourceBrand && String(r.brandId) !== String(sourceBrand)) continue;
      const a = acc.get(r.channel) || { channel: r.channel, orders: 0, units: 0, value: 0, delivered: 0, revenue: 0 };
      a.orders += Number(r.orders) || 0; a.units += Number(r.units) || 0; a.value += Number(r.value) || 0;
      a.delivered += Number(r.delivered) || 0; a.revenue += Number(r.revenue) || 0;
      acc.set(r.channel, a);
    }
    const rows = [...acc.values()].sort((a, b) => b.orders - a.orders || b.value - a.value);
    const total = rows.reduce((t, r) => ({ orders: t.orders + r.orders, units: t.units + r.units, value: t.value + r.value, delivered: t.delivered + r.delivered, revenue: t.revenue + r.revenue }), { orders: 0, units: 0, value: 0, delivered: 0, revenue: 0 });
    const out = rows.map((r) => ({ ...r, _id: r.channel, share: total.orders ? (r.orders / total.orders) * 100 : 0 }));
    if (out.length > 1) out.push({ ...total, channel: 'Total', _id: '__total__', _isTotal: true, share: 100 });
    return out;
  }, [data, sourceBrand]);
  const sourceBrandOptions = [{ value: '', label: 'All stores' }, ...(data?.brands || []).map((b) => ({ value: String(b.brandId), label: b.brand }))];

  // Per-brand rows + a pinned totals row at the bottom.
  const tableData = useMemo(() => {
    const rows = brands.map((b) => ({ ...b, _id: b.brandId ?? b.brand }));
    if (totals) rows.push({ ...totals, _id: '__total__', brand: 'Total', _isTotal: true });
    return rows;
  }, [brands, totals]);

  const adInputStyle = { width: 84, textAlign: 'right', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface)', color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' };

  const columns = useMemo(() => [
    { header: 'Brand', accessor: 'brand', align: 'left', cell: ({ brand }) => brand },
    { header: 'Orders received', accessor: 'placedOrders', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Units ordered', accessor: 'placedUnits', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Delivered', accessor: 'orders', align: 'right', cell: ({ value }) => num(value) },
    { header: 'RTO', accessor: 'rtoOrders', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Units sold', accessor: 'units', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Revenue', accessor: 'revenue', align: 'right', cell: ({ value, refunds }) => (
      <span title={refunds ? `after ${inr(refunds)} refunds` : undefined}>{inr(value)}</span>
    ) },
    { header: 'Ex-GST', accessor: 'revenueExGst', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'COGS', accessor: 'cogs', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Shipping', accessor: 'shipTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Service', accessor: 'svcTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Fees', accessor: 'feeTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Profit (before ads)', accessor: 'beforeAds', align: 'right', cell: ({ value }) => ProfitCell(value) },
    { header: 'Ad spend / unit', accessor: 'adPerUnit', align: 'right', cell: ({ brandId, _isTotal, adFromMeta, value }) => (_isTotal || adFromMeta ? inr(value) : (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <input
          type="number" min="0" inputMode="decimal" placeholder="0"
          value={cppByBrand[brandId] ?? ''}
          onChange={(e) => setCppByBrand((m) => ({ ...m, [brandId]: e.target.value }))}
          style={adInputStyle}
          aria-label="Ad spend per unit (manual)"
        />
        <span style={adTagStyle}>manual · no Meta data</span>
      </span>
    )) },
    { header: 'Total spend', accessor: 'adSpend', align: 'right', cell: ({ value, adFromMeta, _isTotal }) => (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        {inr(value)}
        {!_isTotal && adFromMeta ? <span style={{ ...adTagStyle, color: 'var(--ds-color-success-text, #067647)' }}>from Meta</span> : null}
      </span>
    ) },
    { header: 'Profit (after ads)', accessor: 'afterAds', align: 'right', cell: ({ value }) => ProfitCell(value) },
    { header: 'Margin', accessor: 'marginAfter', align: 'right', cell: ({ value }) => `${(Number(value) || 0).toFixed(1)}%` },
  ], [cppByBrand]);

  const doExport = () => exportCsv(`revenue-profit_${from}_${to}.csv`, [
    { label: 'Brand', value: (r) => r.brand },
    { label: 'Orders received', value: (r) => r.placedOrders },
    { label: 'Units ordered', value: (r) => r.placedUnits },
    { label: 'Order value (received)', value: (r) => r.placedValue },
    { label: 'Delivered orders', value: (r) => r.orders },
    { label: 'RTO orders', value: (r) => r.rtoOrders },
    { label: 'Units sold', value: (r) => r.units },
    { label: 'Refunds', value: (r) => r.refunds },
    { label: 'Revenue (after refunds)', value: (r) => r.revenue },
    { label: 'Revenue ex-GST', value: (r) => r.revenueExGst },
    { label: 'COGS (cost price)', value: (r) => r.cogs },
    { label: `Shipping (@${k('shipping')} per shipped order, RTO included)`, value: (r) => Math.round(r.shipTotal) },
    { label: `Service (@${k('service')}/order)`, value: (r) => r.svcTotal },
    { label: `Fees (${k('gatewayPct')}% prepaid, ${k('codPct')}% COD)`, value: (r) => Math.round(r.feeTotal) },
    { label: 'Gross profit (before ads)', value: (r) => Math.round(r.beforeAds) },
    { label: 'Ad spend / unit', value: (r) => Math.round(r.adPerUnit) },
    { label: 'Total ad spend', value: (r) => Math.round(r.adSpend) },
    { label: 'Ad spend source', value: (r) => (r.adFromMeta ? 'Meta (synced)' : 'manual per unit') },
    { label: 'Gross profit (after ads)', value: (r) => Math.round(r.afterAds) },
    { label: 'Margin % (after ads, of ex-GST revenue)', value: (r) => r.marginAfter.toFixed(1) },
  ], brands);

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Revenue & Gross Profit"
        subtitle="Orders received and units ordered count every order placed in this period. Revenue counts orders placed in this period (as Shopify does), less cancelled and RTO orders and refunds, GST taken out. Profit = ex-GST revenue − cost price − shipping (once per shipped order, RTO included) − service − payment fees − ad spend. Ad spend comes from Meta for brands whose ad account is linked on Reports → Ads; for the others type an ad spend per unit. Your cost numbers and manual ad spend are remembered on this browser."
        actions={
          <>
            <DateRangePicker label="Period" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()} />
            <Button variant="secondary" onClick={doExport} disabled={!brands.length || loading}>Export CSV</Button>
          </>
        }
      />

      {error ? <Panel><span style={{ color: 'var(--ds-color-danger, #dc2626)' }}>{error}</span></Panel> : null}

      {/* ── Cost knobs ── */}
      <Panel title="Cost assumptions" subtitle="Shipping is charged once per shipped order — the rate already includes the RTO return, so RTO orders aren't charged again. Fees are a % of prepaid and COD revenue.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 170px', maxWidth: 230 }}><Input label="Shipping / shipped order, incl. RTO (₹)" type="number" min="0" value={knobs.shipping} onChange={setKnob('shipping')} /></div>
          <div style={{ flex: '1 1 170px', maxWidth: 230 }}><Input label="Service charge / order (₹)" type="number" min="0" value={knobs.service} onChange={setKnob('service')} /></div>
          <div style={{ flex: '1 1 170px', maxWidth: 230 }}><Input label="Payment gateway % (prepaid)" type="number" min="0" step="0.1" value={knobs.gatewayPct} onChange={setKnob('gatewayPct')} /></div>
          <div style={{ flex: '1 1 170px', maxWidth: 230 }}><Input label="COD fee % (courier)" type="number" min="0" step="0.1" value={knobs.codPct} onChange={setKnob('codPct')} /></div>
        </div>
      </Panel>

      {unitsWithoutCost > 0 ? (
        <Panel>
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
            ⚠️ {num(unitsWithoutCost)} unit{unitsWithoutCost === 1 ? '' : 's'} sold in this period have no cost price set
            (counted as ₹0 COGS). Add cost prices on those product variations for an accurate gross profit — the figures
            below are an upper bound until then.
          </span>
        </Panel>
      ) : null}

      {/* ── KPI tiles ── */}
      {loading && !data ? (
        <SkeletonKpis count={11} label="Loading revenue and profit…" />
      ) : totals ? (
        <div style={loading ? { opacity: 0.6, transition: 'opacity .15s' } : undefined} aria-busy={loading || undefined}>
        <StatGrid>
          <StatTile label="Orders received" value={num(placed?.placedOrders)} sub={`${inr(placed?.placedValue)} ordered`} />
          <StatTile label="Units ordered" value={num(placed?.placedUnits)} sub={placed?.placedOrders ? `${(placed.placedUnits / placed.placedOrders).toFixed(1)} per order` : undefined} />
          <StatTile label="Revenue (after refunds)" value={inr(totals.revenue)} />
          <StatTile label="Revenue ex-GST" value={inr(totals.revenueExGst)} />
          <StatTile label="COGS (cost price)" value={inr(totals.cogs)} />
          <StatTile label="Shipping + fees" value={inr(totals.shipTotal + totals.feeTotal + totals.svcTotal)} />
          <StatTile label="Gross profit · before ads" value={inr(totals.beforeAds)} tone={totals.beforeAds >= 0 ? 'good' : 'danger'} />
          <StatTile label="Total ad spend" value={inr(totals.adSpend)} sub={(() => {
            const meta = brands.filter((b) => b.adFromMeta).length;
            return meta ? `from Meta for ${meta} of ${brands.length} brand${brands.length === 1 ? '' : 's'}${meta < brands.length ? ', manual for the rest' : ''}` : 'manual — link ad accounts on Reports → Ads';
          })()} />
          <StatTile label="Gross profit · after ads" value={inr(totals.afterAds)} tone={totals.afterAds >= 0 ? 'good' : 'danger'} />
          <StatTile label="Margin · after ads" value={`${totals.marginAfter.toFixed(1)}%`} />
          <StatTile label="Delivered orders" value={num(totals.orders)} />
        </StatGrid>
        </div>
      ) : null}

      {/* ── Per-brand table ── */}
      <Panel title="By brand" subtitle="Brands marked “from Meta” use the real spend synced from their ad account for this period. For the rest, type the ad spend per unit — total spend (per-unit × units sold) and after-ads profit recalculate instantly.">
        <Table
          columns={columns}
          data={tableData}
          sortable={false}
          loading={loading}
          emptyMessage="No sales in this period."
          getRowStyle={(row) => (row._isTotal ? { fontWeight: 800, background: 'var(--ds-color-surface-soft, rgba(0,0,0,0.03))' } : {})}
        />
      </Panel>

      {/* ── Orders by source ── */}
      <Panel
        title="Orders by source"
        subtitle="Every order received in this period (cancelled ones left out), by where the shopper came from — the same channels as the Traffic report. Delivered shows how many have reached the customer; revenue leaves out cancelled and RTO orders and refunds."
        actions={sourceBrandOptions.length > 2 ? <div style={{ minWidth: 180 }}><Dropdown value={sourceBrand} onChange={(v) => setSourceBrand(String(v))} options={sourceBrandOptions} /></div> : null}
      >
        <Table
          columns={[
            { header: 'Source', accessor: 'channel', align: 'left', cell: ({ channel, _isTotal }) => (_isTotal ? channel : <strong>{channel}</strong>) },
            { header: 'Orders', accessor: 'orders', align: 'right', cell: ({ value }) => num(value) },
            { header: 'Share', accessor: 'share', align: 'right', cell: ({ value }) => `${(Number(value) || 0).toFixed(1)}%` },
            { header: 'Units', accessor: 'units', align: 'right', cell: ({ value }) => num(value) },
            { header: 'Order value', accessor: 'value', align: 'right', cell: ({ value }) => inr(value) },
            { header: 'Delivered', accessor: 'delivered', align: 'right', cell: ({ value }) => num(value) },
            { header: 'Revenue (after refunds)', accessor: 'revenue', align: 'right', cell: ({ value }) => inr(value) },
          ]}
          data={sourceTable}
          sortable={false}
          loading={loading}
          emptyMessage="No orders in this period."
          getRowStyle={(row) => (row._isTotal ? { fontWeight: 800, background: 'var(--ds-color-surface-soft, rgba(0,0,0,0.03))' } : {})}
        />
      </Panel>

      {/* ── Missing cost-price finder ── */}
      <Panel
        title="Variations missing a cost price"
        subtitle="Active variations with no cost price set — these count as ₹0 COGS and inflate the profit above. Fill their cost in Products → edit the product."
        actions={
          <Button variant="secondary" onClick={loadMissing} disabled={missingLoading}>
            {missingLoading ? 'Checking…' : (missing ? 'Refresh' : 'Find missing cost prices')}
          </Button>
        }
      >
        {missingError ? (
          <span style={{ color: 'var(--ds-color-danger, #dc2626)' }}>{missingError}</span>
        ) : missingLoading && !missing ? (
          <Table columns={MISSING_COLUMNS} data={[]} loading sortable={false} />
        ) : !missing ? (
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
            Click “Find missing cost prices” to list every active variation that still needs a cost price.
          </span>
        ) : missing.count === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--ds-color-success, #12b76a)', fontWeight: 600 }}>
            ✅ Every active variation has a cost price. Gross profit above is fully costed.
          </span>
        ) : (
          <>
            <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
              {num(missing.count)}{missing.limited ? '+' : ''} variation{missing.count === 1 ? '' : 's'} need a cost price.
              Search the SKU in <strong>Products</strong> to edit it.
            </div>
            <Table
              columns={MISSING_COLUMNS}
              data={missing.items}
              loading={missingLoading}
              sortable={false}
              emptyMessage="None — all variations are costed."
            />
          </>
        )}
      </Panel>
    </div>
  );
}
