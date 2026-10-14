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
  const [cpp, setCpp] = useState('0');

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
  const cppN = Number(cpp) || 0;

  // Apply the per-order knobs to a raw brand/total row → profit figures.
  const withProfit = (r) => {
    const orders = Number(r.orders) || 0;
    const revenue = Number(r.revenue) || 0;
    const cogs = Number(r.cogs) || 0;
    const shipTotal = shipN * orders;
    const svcTotal = svcN * orders;
    const beforeCpp = revenue - cogs - shipTotal - svcTotal;
    const cppTotal = cppN * orders;
    const afterCpp = beforeCpp - cppTotal;
    const marginAfter = revenue > 0 ? (afterCpp / revenue) * 100 : 0;
    return { ...r, orders, revenue, cogs, shipTotal, svcTotal, beforeCpp, cppTotal, afterCpp, marginAfter };
  };

  const brands = useMemo(() => (data?.brands || []).map(withProfit), [data, shipN, svcN, cppN]);
  const totals = useMemo(() => (data?.totals ? withProfit(data.totals) : null), [data, shipN, svcN, cppN]);
  const unitsWithoutCost = Number(data?.totals?.unitsWithoutCost || 0);

  // Per-brand rows + a pinned totals row at the bottom.
  const tableData = useMemo(() => {
    const rows = brands.map((b) => ({ ...b, _id: b.brandId ?? b.brand }));
    if (totals) rows.push({ ...totals, _id: '__total__', brand: 'Total', _isTotal: true });
    return rows;
  }, [brands, totals]);

  const columns = useMemo(() => [
    { header: 'Brand', accessor: 'brand', align: 'left', cell: ({ brand }) => brand },
    { header: 'Orders', accessor: 'orders', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Units', accessor: 'units', align: 'right', cell: ({ value }) => num(value) },
    { header: 'Revenue', accessor: 'revenue', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'COGS', accessor: 'cogs', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Shipping', accessor: 'shipTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Service', accessor: 'svcTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Profit (before CPP)', accessor: 'beforeCpp', align: 'right', cell: ({ value }) => ProfitCell(value) },
    { header: 'CPP', accessor: 'cppTotal', align: 'right', cell: ({ value }) => inr(value) },
    { header: 'Profit (after CPP)', accessor: 'afterCpp', align: 'right', cell: ({ value }) => ProfitCell(value) },
    { header: 'Margin', accessor: 'marginAfter', align: 'right', cell: ({ value }) => `${(Number(value) || 0).toFixed(1)}%` },
  ], []);

  const doExport = () => exportCsv(`revenue-profit_${from}_${to}.csv`, [
    { label: 'Brand', value: (r) => r.brand },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Units', value: (r) => r.units },
    { label: 'Revenue', value: (r) => r.revenue },
    { label: 'COGS (cost price)', value: (r) => r.cogs },
    { label: `Shipping (@${shipN}/order)`, value: (r) => r.shipTotal },
    { label: `Service (@${svcN}/order)`, value: (r) => r.svcTotal },
    { label: 'Gross profit (before CPP)', value: (r) => r.beforeCpp },
    { label: `CPP (@${cppN}/order)`, value: (r) => r.cppTotal },
    { label: 'Gross profit (after CPP)', value: (r) => r.afterCpp },
    { label: 'Margin % (after CPP)', value: (r) => r.marginAfter.toFixed(1) },
  ], brands);

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Revenue & Gross Profit"
        subtitle="Gross profit = Revenue − cost price (COGS) − shipping − service charge, then minus CPP. Shipping & service default to ₹90 / ₹30 per order; CPP (ad spend per order) is yours to enter and recalculates live. Units with no cost price count as ₹0, so profit is an upper bound until cost prices are filled in."
        actions={
          <>
            <DateRangePicker label="Period" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} onApply={load} maxDate={istDate()} />
            <Button variant="secondary" onClick={doExport} disabled={!brands.length || loading}>Export CSV</Button>
          </>
        }
      />

      {error ? <Panel><span style={{ color: 'var(--ds-color-danger, #dc2626)' }}>{error}</span></Panel> : null}

      {/* ── Cost knobs ── */}
      <Panel title="Cost assumptions" subtitle="Per order — change CPP to model different ad costs; both profit figures update instantly.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <Input label="Shipping / order" type="number" min="0" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          <Input label="Service charge / order" type="number" min="0" value={service} onChange={(e) => setService(e.target.value)} />
          <Input label="CPP / order (ad spend)" type="number" min="0" value={cpp} onChange={(e) => setCpp(e.target.value)} />
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
          <StatTile label="Gross profit · before CPP" value={inr(totals.beforeCpp)} tone={totals.beforeCpp >= 0 ? 'good' : 'bad'} />
          <StatTile label="Gross profit · after CPP" value={inr(totals.afterCpp)} tone={totals.afterCpp >= 0 ? 'good' : 'bad'} />
          <StatTile label="Margin · after CPP" value={`${totals.marginAfter.toFixed(1)}%`} />
          <StatTile label="Orders" value={num(totals.orders)} />
        </StatGrid>
      ) : null}

      {/* ── Per-brand table ── */}
      <Panel title="By brand" subtitle="Each brand's revenue, cost of goods and profit before/after CPP.">
        <Table
          columns={columns}
          data={tableData}
          sortable={false}
          loading={loading}
          emptyMessage="No sales in this period."
          getRowStyle={(row) => (row._isTotal ? { fontWeight: 800, background: 'var(--ds-color-surface-soft, rgba(0,0,0,0.03))' } : {})}
        />
      </Panel>
    </div>
  );
}
