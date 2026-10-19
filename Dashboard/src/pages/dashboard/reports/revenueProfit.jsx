import { useState, useEffect, useCallback, useMemo } from 'react';
import { trafficReportService } from '../../../services';
import { Button, DateRangePicker, Input, Table } from '../../../components/ui';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';

/**
 * Revenue & Gross Profit — per brand, on orders that were DELIVERED in the
 * period (customer returns included, refunds subtracted). Same basis as the
 * Reports overview's net sales.
 *
 *   Revenue        = delivered value − refunds paid
 *   Revenue ex-GST = revenue ÷ (1 + brand GST %)   ← GST isn't your money
 *   Costs          = COGS (cost price × kept units)
 *                  + shipping × shipped orders + return shipping × RTO orders
 *                  + service charge × delivered orders
 *                  + gateway % of prepaid revenue + COD fee % of COD revenue
 *   Profit before ads = revenue ex-GST − costs;  after ads = − ad spend/unit × units
 *
 * Every cost knob and each brand's ad spend is remembered in this browser.
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

// Profit cell — green when positive, red when negative; bold on the totals row.
const ProfitCell = (v, bold) => (
  <span style={{ fontWeight: bold ? 800 : 700, color: (Number(v) || 0) >= 0 ? 'var(--ds-color-success, #12b76a)' : 'var(--ds-color-danger, #dc2626)' }}>
    {inr(v)}
  </span>
);

export default function RevenueProfitReport() {
  const [from, setFrom] = useState(shiftDay(istDate(), -29));
  const [to, setTo] = useState(istDate());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Cost knobs, remembered in this browser between visits.
  const [knobs, setKnobs] = useState(() => {
    const base = { shipping: '90', rtoShipping: '90', service: '30', gatewayPct: '2', codPct: '2' };
    try { return { ...base, ...JSON.parse(localStorage.getItem('rp_knobs') || '{}') }; } catch { return base; }
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
    const shipTotal = k('shipping') * (Number(r.shippedOrders) || 0) + k('rtoShipping') * (Number(r.rtoOrders) || 0);
    const svcTotal = k('service') * orders;
    const feeTotal = (k('gatewayPct') / 100) * (Number(r.prepaidRevenue) || 0) + (k('codPct') / 100) * (Number(r.codRevenue) || 0);
    const beforeAds = revenueExGst - cogs - shipTotal - svcTotal - feeTotal;
    const adPerUnit = cppPerUnit(brandId);
    const adSpend = adPerUnit * units;
    const afterAds = beforeAds - adSpend;
    const marginAfter = revenueExGst > 0 ? (afterAds / revenueExGst) * 100 : 0;
    return { ...r, brandId, orders, units, revenue, revenueExGst, refunds: Number(r.refunds) || 0, rtoOrders: Number(r.rtoOrders) || 0,
      cogs, shipTotal, svcTotal, feeTotal, beforeAds, adPerUnit, adSpend, afterAds, marginAfter };
  };

  const brands = useMemo(() => (data?.brands || []).map(withProfit), [data, knobs, cppByBrand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Totals aggregate the per-brand rows so each brand's own ad spend flows up.
  const totals = useMemo(() => {
    if (!brands.length) return null;
    const t = brands.reduce((a, r) => {
      a.orders += r.orders; a.units += r.units; a.revenue += r.revenue; a.revenueExGst += r.revenueExGst; a.cogs += r.cogs;
      a.refunds += r.refunds; a.rtoOrders += r.rtoOrders;
      a.shipTotal += r.shipTotal; a.svcTotal += r.svcTotal; a.feeTotal += r.feeTotal;
      a.beforeAds += r.beforeAds; a.adSpend += r.adSpend; a.afterAds += r.afterAds;
      return a;
    }, { orders: 0, units: 0, revenue: 0, revenueExGst: 0, refunds: 0, rtoOrders: 0, cogs: 0, shipTotal: 0, svcTotal: 0, feeTotal: 0, beforeAds: 0, adSpend: 0, afterAds: 0 });
    t.adPerUnit = t.units > 0 ? t.adSpend / t.units : 0; // blended ad spend / unit
    t.marginAfter = t.revenueExGst > 0 ? (t.afterAds / t.revenueExGst) * 100 : 0;
    return t;
  }, [brands]);

  const unitsWithoutCost = Number(data?.totals?.unitsWithoutCost || 0);

  // Per-brand rows + a pinned totals row at the bottom.
  const tableData = useMemo(() => {
    const rows = brands.map((b) => ({ ...b, _id: b.brandId ?? b.brand }));
    if (totals) rows.push({ ...totals, _id: '__total__', brand: 'Total', _isTotal: true });
    return rows;
  }, [brands, totals]);

  const adInputStyle = { width: 84, textAlign: 'right', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface)', color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' };

  const columns = useMemo(() => [
    { header: 'Brand', accessor: 'brand', align: 'left', cell: ({ brand }) => brand },
    { header: 'Delivered', accessor: 'orders', align: 'right', cell: ({ value }) => num(value) },
    { header: 'RTO', accessor: 'rtoOrders', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Units kept', accessor: 'units', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Revenue', accessor: 'revenue', align: 'right', cell: ({ value, refunds }) => (
      <span title={refunds ? `after ${inr(refunds)} refunds` : undefined}>{inr(value)}</span>
    ) },
    { header: 'Ex-GST', accessor: 'revenueExGst', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'COGS', accessor: 'cogs', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Shipping', accessor: 'shipTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Service', accessor: 'svcTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Fees', accessor: 'feeTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Profit (before ads)', accessor: 'beforeAds', align: 'right', cell: ({ value }) => ProfitCell(value) },
    { header: 'Ad spend / unit', accessor: 'adPerUnit', align: 'right', cell: ({ brandId, _isTotal, value }) => (_isTotal ? inr(value) : (
      <input
        type="number" min="0" inputMode="decimal" placeholder="0"
        value={cppByBrand[brandId] ?? ''}
        onChange={(e) => setCppByBrand((m) => ({ ...m, [brandId]: e.target.value }))}
        style={adInputStyle}
        aria-label="Ad spend per unit"
      />
    )) },
    { header: 'Total spend', accessor: 'adSpend', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Profit (after ads)', accessor: 'afterAds', align: 'right', cell: ({ value }) => ProfitCell(value) },
    { header: 'Margin', accessor: 'marginAfter', align: 'right', cell: ({ value }) => `${(Number(value) || 0).toFixed(1)}%` },
  ], [cppByBrand]);

  const doExport = () => exportCsv(`revenue-profit_${from}_${to}.csv`, [
    { label: 'Brand', value: (r) => r.brand },
    { label: 'Delivered orders', value: (r) => r.orders },
    { label: 'RTO orders', value: (r) => r.rtoOrders },
    { label: 'Units kept', value: (r) => r.units },
    { label: 'Refunds', value: (r) => r.refunds },
    { label: 'Revenue (after refunds)', value: (r) => r.revenue },
    { label: 'Revenue ex-GST', value: (r) => r.revenueExGst },
    { label: 'COGS (cost price)', value: (r) => r.cogs },
    { label: `Shipping (@${k('shipping')}/shipped, @${k('rtoShipping')}/RTO)`, value: (r) => Math.round(r.shipTotal) },
    { label: `Service (@${k('service')}/order)`, value: (r) => r.svcTotal },
    { label: `Fees (${k('gatewayPct')}% prepaid, ${k('codPct')}% COD)`, value: (r) => Math.round(r.feeTotal) },
    { label: 'Gross profit (before ads)', value: (r) => Math.round(r.beforeAds) },
    { label: 'Ad spend / unit', value: (r) => Math.round(r.adPerUnit) },
    { label: 'Total ad spend', value: (r) => Math.round(r.adSpend) },
    { label: 'Gross profit (after ads)', value: (r) => Math.round(r.afterAds) },
    { label: 'Margin % (after ads, of ex-GST revenue)', value: (r) => r.marginAfter.toFixed(1) },
  ], brands);

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Revenue & Gross Profit"
        subtitle="Orders delivered in this period, minus refunds, GST taken out. Profit = ex-GST revenue − cost price − shipping (incl. RTO return legs) − service − payment fees − ad spend. Your cost numbers and each brand's ad spend are remembered on this browser."
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
      <Panel title="Cost assumptions" subtitle="Shipping is charged on every shipped order; RTO orders also pay the return leg. Fees are a % of prepaid and COD revenue.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 170px', maxWidth: 230 }}><Input label="Shipping / shipped order (₹)" type="number" min="0" value={knobs.shipping} onChange={setKnob('shipping')} /></div>
          <div style={{ flex: '1 1 170px', maxWidth: 230 }}><Input label="RTO return shipping (₹)" type="number" min="0" value={knobs.rtoShipping} onChange={setKnob('rtoShipping')} /></div>
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
      {totals ? (
        <StatGrid>
          <StatTile label="Revenue (after refunds)" value={inr(totals.revenue)} />
          <StatTile label="Revenue ex-GST" value={inr(totals.revenueExGst)} />
          <StatTile label="COGS (cost price)" value={inr(totals.cogs)} />
          <StatTile label="Shipping + fees" value={inr(totals.shipTotal + totals.feeTotal + totals.svcTotal)} />
          <StatTile label="Gross profit · before ads" value={inr(totals.beforeAds)} tone={totals.beforeAds >= 0 ? 'good' : 'danger'} />
          <StatTile label="Total ad spend" value={inr(totals.adSpend)} />
          <StatTile label="Gross profit · after ads" value={inr(totals.afterAds)} tone={totals.afterAds >= 0 ? 'good' : 'danger'} />
          <StatTile label="Margin · after ads" value={`${totals.marginAfter.toFixed(1)}%`} />
          <StatTile label="Delivered orders" value={num(totals.orders)} />
        </StatGrid>
      ) : null}

      {/* ── Per-brand table ── */}
      <Panel title="By brand" subtitle="Type each brand's ad spend per unit — its total spend (per-unit × units) and after-ads profit recalculate instantly.">
        <Table
          columns={columns}
          data={tableData}
          sortable={false}
          loading={loading}
          emptyMessage="No sales in this period."
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
              columns={[
                { header: 'Brand', accessor: 'brand', align: 'left', cell: ({ brand }) => brand || '—' },
                { header: 'Product', accessor: 'productName', align: 'left', cell: ({ productName }) => <strong>{productName}</strong> },
                { header: 'Variant', accessor: 'variant', align: 'left', cell: ({ variant }) => variant || '—' },
                { header: 'SKU', accessor: 'sku', align: 'left', cell: ({ sku }) => sku || '—' },
                { header: 'Price', accessor: 'price', align: 'right', cell: ({ value }) => inr(value) },
              ]}
              data={missing.items}
              sortable={false}
              emptyMessage="None — all variations are costed."
            />
          </>
        )}
      </Panel>
    </div>
  );
}
