import { useState, useEffect, useCallback, useMemo } from 'react';
import { trafficReportService } from '../../../services';
import { Button, DateRangePicker, Input, Table } from '../../../components/ui';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';

/**
 * Revenue & Gross Profit — per-brand margin after the real per-order costs.
 *
 *   Gross profit (before CPP) = Revenue − COGS − Shipping − Service charge
 *   Gross profit (after CPP)  = (before CPP) − CPP × orders
 *
 * COGS = Σ(variation cost_price × qty); units with no cost price count as ₹0, so
 * the profit is an UPPER bound until those cost prices are filled in. Shipping
 * (₹90) and Service (₹30) default to the business's standard costs; CPP (cost per
 * purchase / ad spend per order) varies per campaign, so it's a live input — type
 * it and both profit figures recalculate instantly, no reload.
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

  // Per-order cost knobs. Shipping ₹90 + Service ₹30 are the business defaults;
  // CPP starts at 0 and is typed per run (it varies every campaign).
  const [shipping, setShipping] = useState('90');
  const [service, setService] = useState('30');
  // CPP (ad spend per order) is PER BRAND — each brand runs its own ads — edited
  // inline in the table. Keyed by brandId; the brand's total ad spend is then
  // CPP × that brand's orders.
  const [cppByBrand, setCppByBrand] = useState({});

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
        if (res.defaults) {
          setShipping((s) => (s === '90' ? String(res.defaults.shippingPerOrder ?? 90) : s));
          setService((s) => (s === '30' ? String(res.defaults.servicePerOrder ?? 30) : s));
        }
      } else setError(res?.message || 'Failed to load report');
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load report');
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const shipN = Number(shipping) || 0;
  const svcN = Number(service) || 0;
  // Each brand's ad spend PER UNIT (typed in the table). Total spend = per-unit × units.
  const cppPerUnit = (brandId) => Number(cppByBrand[brandId] ?? '') || 0;

  // Apply the knobs to a raw brand row → profit figures. Shipping/service are per
  // order; ad spend is per UNIT, and the brand's total spend = per-unit × units.
  const withProfit = (r) => {
    const brandId = r.brandId;
    const orders = Number(r.orders) || 0;
    const units = Number(r.units) || 0;
    const revenue = Number(r.revenue) || 0;
    const cogs = Number(r.cogs) || 0;
    const shipTotal = shipN * orders;
    const svcTotal = svcN * orders;
    const beforeAds = revenue - cogs - shipTotal - svcTotal;
    const adPerUnit = cppPerUnit(brandId);
    const adSpend = adPerUnit * units;              // calculated total spend
    const afterAds = beforeAds - adSpend;
    const marginAfter = revenue > 0 ? (afterAds / revenue) * 100 : 0;
    return { ...r, brandId, orders, units, revenue, cogs, shipTotal, svcTotal, beforeAds, adPerUnit, adSpend, afterAds, marginAfter };
  };

  const brands = useMemo(() => (data?.brands || []).map(withProfit), [data, shipN, svcN, cppByBrand]);

  // Totals aggregate the per-brand rows so each brand's own ad spend flows up.
  const totals = useMemo(() => {
    if (!brands.length) return null;
    const t = brands.reduce((a, r) => {
      a.orders += r.orders; a.units += r.units; a.revenue += r.revenue; a.cogs += r.cogs;
      a.shipTotal += r.shipTotal; a.svcTotal += r.svcTotal;
      a.beforeAds += r.beforeAds; a.adSpend += r.adSpend; a.afterAds += r.afterAds;
      return a;
    }, { orders: 0, units: 0, revenue: 0, cogs: 0, shipTotal: 0, svcTotal: 0, beforeAds: 0, adSpend: 0, afterAds: 0 });
    t.adPerUnit = t.units > 0 ? t.adSpend / t.units : 0; // blended ad spend / unit
    t.marginAfter = t.revenue > 0 ? (t.afterAds / t.revenue) * 100 : 0;
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
    { header: 'Orders', accessor: 'orders', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Units', accessor: 'units', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Revenue', accessor: 'revenue', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'COGS', accessor: 'cogs', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Shipping', accessor: 'shipTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Service', accessor: 'svcTotal', align: 'right', cell: ({ value }) => inr(value) },
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
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Units', value: (r) => r.units },
    { label: 'Revenue', value: (r) => r.revenue },
    { label: 'COGS (cost price)', value: (r) => r.cogs },
    { label: `Shipping (@${shipN}/order)`, value: (r) => r.shipTotal },
    { label: `Service (@${svcN}/order)`, value: (r) => r.svcTotal },
    { label: 'Gross profit (before ads)', value: (r) => Math.round(r.beforeAds) },
    { label: 'Ad spend / unit', value: (r) => Math.round(r.adPerUnit) },
    { label: 'Total ad spend', value: (r) => Math.round(r.adSpend) },
    { label: 'Gross profit (after ads)', value: (r) => Math.round(r.afterAds) },
    { label: 'Margin % (after ads)', value: (r) => r.marginAfter.toFixed(1) },
  ], brands);

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Revenue & Gross Profit"
        subtitle="Gross profit = Revenue − cost price (COGS) − shipping − service charge, then minus ad spend. Shipping & service default to ₹90 / ₹30 per order. Ad spend is PER BRAND: type each brand's spend per unit in the table and its total spend (per-unit × units) and after-ads profit recalculate live. Units with no cost price count as ₹0, so profit is an upper bound until cost prices are filled in."
        actions={
          <>
            <DateRangePicker label="Period" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} onApply={load} maxDate={istDate()} />
            <Button variant="secondary" onClick={doExport} disabled={!brands.length || loading}>Export CSV</Button>
          </>
        }
      />

      {error ? <Panel><span style={{ color: 'var(--ds-color-danger, #dc2626)' }}>{error}</span></Panel> : null}

      {/* ── Cost knobs (shipping & service are flat per-order costs) ── */}
      <Panel title="Cost assumptions" subtitle="Flat per-order costs. Ad spend is set per brand in the table below (per unit).">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <Input label="Shipping / order" type="number" min="0" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          <Input label="Service charge / order" type="number" min="0" value={service} onChange={(e) => setService(e.target.value)} />
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
          <StatTile label="Revenue" value={inr(totals.revenue)} />
          <StatTile label="COGS (cost price)" value={inr(totals.cogs)} />
          <StatTile label="Gross profit · before ads" value={inr(totals.beforeAds)} tone={totals.beforeAds >= 0 ? 'good' : 'danger'} />
          <StatTile label="Total ad spend" value={inr(totals.adSpend)} />
          <StatTile label="Gross profit · after ads" value={inr(totals.afterAds)} tone={totals.afterAds >= 0 ? 'good' : 'danger'} />
          <StatTile label="Margin · after ads" value={`${totals.marginAfter.toFixed(1)}%`} />
          <StatTile label="Orders" value={num(totals.orders)} />
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
