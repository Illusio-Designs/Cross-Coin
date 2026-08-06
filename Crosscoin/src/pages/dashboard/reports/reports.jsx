import React, { useState } from 'react';
import Loader from '../../../components/common/Loader';
import { useDashboardStats } from '../../../hooks/queries/useDashboard';
import { orderService } from '../../../services';
import { DateRangePicker } from '../../../components/ui';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { showSuccess, showError } from '../../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   Reports — a date-ranged, exportable view of store performance.
   Monochrome Obzus treatment: grayscale share bars + segmented
   revenue bar (no rainbow donuts), KPI compare arrows, and a
   revenue-trend area chart. Reuses the dashboard stats API and
   adds one-click CSV export per table + a delivered-orders export.
   ────────────────────────────────────────────────────────────── */

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => (Number(n) || 0).toLocaleString('en-IN');
/* Compact ₹ for legends: 12,10,400 → ₹12.1L */
const moneyShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};

/* Grayscale ramp (flips for dark via the CSS vars on .obz-rep) */
const RAMP = ['var(--rr1)', 'var(--rr2)', 'var(--rr3)', 'var(--rr4)', 'var(--rr5)'];

/* Build a CSV string from rows + column defs, then trigger a download. */
function exportCsv(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n');
  const csv = head + '\n' + body;
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DlIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

/* KPI delta arrow (▲/▼ %) — green up, red down (matches dashboard home) */
function Delta({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  return <span className={`delta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(pct)}%</span>;
}

/* Revenue area chart — daily revenue, smooth monochrome line + soft fill */
function RevenueTrend({ data }) {
  if (!Array.isArray(data) || data.length < 2 || data.every((v) => !v)) {
    return <div className="rep-ph"><span className="hint">Not enough revenue history yet for a trend.</span></div>;
  }
  const W = 720, H = 180, PAD = 8;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - PAD - ((v || 0) / max) * (H - PAD * 2);
    return [x, y];
  });
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${d} L${W} ${H} L0 ${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg className="rep-chart" viewBox={`0 0 ${W} ${H}`} height="180" preserveAspectRatio="none" role="img" aria-label="Daily revenue trend">
      <line x1="0" y1={H * 0.33} x2={W} y2={H * 0.33} stroke="var(--ds-color-border-soft)" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={H * 0.66} x2={W} y2={H * 0.66} stroke="var(--ds-color-border-soft)" vectorEffect="non-scaling-stroke" />
      <path d={area} fill="var(--ds-color-surface-soft)" />
      <path d={d} fill="none" stroke="var(--ds-color-text)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--ds-color-text)" />
    </svg>
  );
}

export default function Reports() {
  const [dateFilter, setDateFilter] = useState({});
  const { data: stats, isLoading, error } = useDashboardStats(dateFilter);
  const [exportingOrders, setExportingOrders] = useState(false);

  const setDate = (field, value) =>
    setDateFilter((prev) => {
      const next = { ...prev, [field]: value || undefined };
      if (!next.start_date) delete next.start_date;
      if (!next.end_date) delete next.end_date;
      return next;
    });
  const clearDates = () => setDateFilter({});
  const hasDateFilter = !!(dateFilter.start_date || dateFilter.end_date);
  const periodLabel = hasDateFilter
    ? `${dateFilter.start_date || '…'} → ${dateFilter.end_date || '…'}`
    : 'All time';

  const revenue = stats?.revenue || {};
  const orders = stats?.orders || {};
  const brandSales = stats?.brandSales || [];
  const topProducts = stats?.topProducts || [];
  const breakdown = revenue.breakdown || {};
  const payment = stats?.paymentDistribution || {};
  const sd = orders.statusDistribution || {};
  const deltas = stats?.deltas || {};

  /* Revenue-by-status segments (earned / active / lost) */
  const earned = Number(revenue.earned) || 0;
  const active = Number(revenue.active) || 0;
  const lost = Number(revenue.lost) || 0;
  const segTotal = earned + active + lost || 1;

  /* ── Exports ── */
  const exportBrandSales = () =>
    exportCsv(`sales-by-brand_${periodLabel}.csv`,
      [
        { label: 'Brand', value: (b) => b.name },
        { label: 'Orders', value: (b) => b.orders },
        { label: 'Revenue', value: (b) => b.revenue },
        { label: 'Earned', value: (b) => b.earned },
        { label: 'Lost', value: (b) => b.lost },
        { label: 'Avg Order Value', value: (b) => b.avgOrderValue },
        { label: 'Share %', value: (b) => b.share },
      ], brandSales);

  const exportTopProducts = () =>
    exportCsv(`top-products_${periodLabel}.csv`,
      [
        { label: 'Product', value: (p) => p.name },
        { label: 'Units Sold', value: (p) => p.totalSold },
        { label: 'Orders', value: (p) => p.orderCount },
        { label: 'Revenue', value: (p) => p.totalRevenue },
      ], topProducts);

  const exportSummary = () => {
    const rows = [
      { k: 'Period', v: periodLabel },
      { k: 'Total Revenue', v: revenue.total },
      { k: 'Earned (delivered)', v: revenue.earned },
      { k: 'Active (in pipeline)', v: revenue.active },
      { k: 'Lost (cancelled + RTO)', v: revenue.lost },
      { k: 'Average Order Value', v: revenue.average },
      { k: 'Total Orders', v: orders.total },
      { k: 'Delivered Orders', v: orders.completed },
      { k: 'Cancelled Orders', v: orders.cancelled },
      { k: 'COD Orders', v: payment.cod?.count },
      { k: 'Prepaid Orders', v: payment.prepaid?.count },
    ];
    exportCsv(`sales-summary_${periodLabel}.csv`,
      [{ label: 'Metric', value: (r) => r.k }, { label: 'Value', value: (r) => r.v }], rows);
  };

  const exportDeliveredOrders = async () => {
    if (!dateFilter.start_date || !dateFilter.end_date) {
      showError('selectDates', 'Pick a start and end date to export delivered orders.');
      return;
    }
    setExportingOrders(true);
    try {
      await orderService.exportDeliveredOrders(dateFilter.start_date, dateFilter.end_date);
      showSuccess('exported', 'Delivered orders exported.');
    } catch (e) {
      showError('exportFailed', e.message || 'Failed to export delivered orders');
    } finally {
      setExportingOrders(false);
    }
  };

  const totalOrders = Number(orders.total) || 0;
  const pct = (v) => (totalOrders > 0 ? Math.round((v / totalOrders) * 1000) / 10 : 0);
  const statusRows = [
    { label: 'Delivered', value: (sd['delivered'] || 0) + (sd['completed'] || 0), c: RAMP[0] },
    { label: 'Shipped / In transit', value: (sd['shipped'] || 0) + (sd['in transit'] || 0) + (sd['out for delivery'] || 0), c: RAMP[1] },
    { label: 'Confirmed / Processing', value: (sd['confirmed'] || 0) + (sd['processing'] || 0), c: RAMP[2] },
    { label: 'Pending', value: (sd['pending'] || 0) + (sd['awaiting_confirmation'] || 0), c: RAMP[3] },
    { label: 'RTO / Returned', value: (sd['rto'] || 0) + (sd['rto delivered'] || 0) + (sd['return_initiated'] || 0) + (sd['returned_rto'] || 0), c: RAMP[3] },
    { label: 'Cancelled', value: (sd['cancelled'] || 0) + (sd['order cancelled'] || 0), c: RAMP[4] },
  ].filter((r) => r.value > 0);

  return (
    <div className="dashboard-sections obz-rep">
      <PageHeader
        title="Reports"
        subtitle={hasDateFilter ? `Period: ${periodLabel}` : 'All-time performance — pick a date range to narrow it'}
        actions={
          <div className="obz-rep-head">
            <DateRangePicker
              label=""
              startDate={dateFilter.start_date || ''}
              endDate={dateFilter.end_date || ''}
              onStartChange={(v) => setDate('start_date', v)}
              onEndChange={(v) => setDate('end_date', v)}
              onClear={clearDates}
              inline
            />
            <button type="button" className="order-sync-main-btn" onClick={exportSummary} disabled={!stats}>
              <DlIcon /> Export summary
            </button>
            <button
              type="button"
              className="order-sync-main-btn"
              onClick={exportDeliveredOrders}
              disabled={exportingOrders || !dateFilter.start_date || !dateFilter.end_date}
              title={(!dateFilter.start_date || !dateFilter.end_date)
                ? 'Pick a start and end date to export delivered orders'
                : 'Export a detailed CSV of delivered orders for the selected range'}
            >
              <DlIcon /> {exportingOrders ? 'Exporting…' : 'Export delivered'}
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="rep-state"><Loader /></div>
      ) : error ? (
        <div className="rep-state" style={{ color: 'var(--ds-color-danger)' }}>Failed to load report data.</div>
      ) : !stats ? null : (
        <>
          {/* ── KPI strip with compare arrows ── */}
          <div className="rep-kpis">
            <div className="rep-kpi">
              <div className="rep-kl">Total Revenue</div>
              <div className="rep-kv num">{money(revenue.total)}</div>
              <div className="rep-kf"><Delta pct={deltas.revenue?.pct} /> vs prev 30d</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Earned</div>
              <div className="rep-kv num">{money(revenue.earned)}</div>
              <div className="rep-kf">Delivered revenue</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Orders</div>
              <div className="rep-kv num">{num(orders.total)}</div>
              <div className="rep-kf"><Delta pct={deltas.orders?.pct} /> · {num(orders.completed)} delivered</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Avg Order</div>
              <div className="rep-kv num">{money(revenue.average)}</div>
              <div className="rep-kf"><Delta pct={deltas.aov?.pct} /> vs prev 30d</div>
            </div>
          </div>

          {/* ── Revenue trend ── */}
          <div className="rep-panel">
            <div className="rep-ph">
              <h3>Revenue Trend</h3>
              <span className="hint">Daily revenue · last 30 days</span>
            </div>
            <RevenueTrend data={stats.revenueTrend} />
          </div>

          {/* ── Sales by brand: table + monochrome share ── */}
          <div className="rep-grid2 rep-grid2--wide">
            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph">
                <h3>Sales by Brand</h3>
                <button type="button" className="order-sync-main-btn" onClick={exportBrandSales} disabled={!brandSales.length}>
                  <DlIcon /> Export CSV
                </button>
              </div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead>
                    <tr><th>Brand</th><th className="r">Orders</th><th className="r">Revenue</th><th className="r">Earned</th><th className="r">Share</th></tr>
                  </thead>
                  <tbody>
                    {brandSales.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ds-color-text-faint)' }}>No brand sales in this period</td></tr>
                    ) : brandSales.map((b, i) => (
                      <tr key={b.brandId ?? b.name}>
                        <td className="strong"><span className="rep-dot" style={{ background: RAMP[i % RAMP.length] }} />{b.name}</td>
                        <td className="r num">{num(b.orders)}</td>
                        <td className="r strong num">{money(b.revenue)}</td>
                        <td className="r num">{money(b.earned)}</td>
                        <td className="r num">{b.share || 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rep-panel">
              <div className="rep-ph"><h3>Revenue Share</h3><span className="hint">of {moneyShort(revenue.total)} total</span></div>
              <div className="rep-bars">
                {brandSales.length === 0 ? (
                  <span className="hint">No data</span>
                ) : brandSales.map((b, i) => (
                  <div className="rep-bar-row" key={b.brandId ?? b.name}>
                    <div className="rep-bar-top">
                      <span className="rep-bar-name">
                        <span className="rep-dot" style={{ background: RAMP[i % RAMP.length] }} />
                        <span className="lbl">{b.name}</span>
                      </span>
                      <span className="rep-bar-val num">{b.share || 0}%</span>
                    </div>
                    <div className="rep-track"><div className="rep-fill" style={{ width: `${b.share || 0}%`, background: RAMP[i % RAMP.length] }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Top products + order status breakdown (both tall) ── */}
          <div className="rep-grid2 rep-grid2--wide">
            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph">
                <h3>Top Products</h3>
                <button type="button" className="order-sync-main-btn" onClick={exportTopProducts} disabled={!topProducts.length}>
                  <DlIcon /> Export CSV
                </button>
              </div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead>
                    <tr><th style={{ width: 36 }}>#</th><th>Product</th><th className="r">Units</th><th className="r">Revenue</th></tr>
                  </thead>
                  <tbody>
                    {topProducts.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ds-color-text-faint)' }}>No products sold in this period</td></tr>
                    ) : topProducts.slice(0, 10).map((p, i) => (
                      <tr key={p.id ?? i}>
                        <td className="rank">{i + 1}</td>
                        <td className="strong rep-prod">{p.name}</td>
                        <td className="r num">{num(p.totalSold)}</td>
                        <td className="r strong num">{money(p.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rep-panel">
              <div className="rep-ph"><h3>Order Status Breakdown</h3><span className="hint">{num(orders.total)} orders</span></div>
              <div className="rep-bars">
                {statusRows.length === 0 ? (
                  <span className="hint">No orders in this period</span>
                ) : statusRows.map((r) => (
                  <div className="rep-bar-row" key={r.label}>
                    <div className="rep-bar-top">
                      <span className="rep-bar-name"><span className="lbl">{r.label}</span></span>
                      <span className="rep-sb-pct num">{num(r.value)} · {pct(r.value)}%</span>
                    </div>
                    <div className="rep-track"><div className="rep-fill" style={{ width: `${Math.max(pct(r.value), 1)}%`, background: r.c }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Revenue by status + payment ── */}
          <div className="rep-grid2">
            <div className="rep-panel">
              <div className="rep-ph"><h3>Revenue by Status</h3><span className="hint">where the money sits</span></div>
              <div className="rep-seg">
                <span style={{ width: `${(earned / segTotal) * 100}%`, background: RAMP[0] }} />
                <span style={{ width: `${(active / segTotal) * 100}%`, background: RAMP[2] }} />
                <span style={{ width: `${(lost / segTotal) * 100}%`, background: RAMP[4] }} />
              </div>
              <div className="rep-legend">
                <div className="rep-leg"><span className="d" style={{ background: RAMP[0] }} /><div><b className="num">{moneyShort(earned)}</b><small>Earned · delivered</small></div></div>
                <div className="rep-leg"><span className="d" style={{ background: RAMP[2] }} /><div><b className="num">{moneyShort(active)}</b><small>Active · in pipeline</small></div></div>
                <div className="rep-leg"><span className="d" style={{ background: RAMP[4] }} /><div><b className="num">{moneyShort(lost)}</b><small>Lost · cancelled + RTO</small></div></div>
              </div>
            </div>

            <div className="rep-panel">
              <div className="rep-ph"><h3>Payment &amp; Fulfilment</h3></div>
              <div className="rep-tiles">
                <div className="rep-tile"><div className="rep-tl">COD Orders</div><div className="rep-tv num">{num(payment.cod?.count)}</div><div className="rep-ts">to be collected</div></div>
                <div className="rep-tile"><div className="rep-tl">COD Revenue</div><div className="rep-tv num">{money(payment.cod?.revenue)}</div><div className="rep-ts">cash on delivery</div></div>
                <div className="rep-tile"><div className="rep-tl">Prepaid Orders</div><div className="rep-tv num">{num(payment.prepaid?.count)}</div><div className="rep-ts good">already paid</div></div>
                <div className="rep-tile"><div className="rep-tl">Prepaid Revenue</div><div className="rep-tv num">{money(payment.prepaid?.revenue)}</div><div className="rep-ts good">collected</div></div>
                <div className="rep-tile"><div className="rep-tl">RTO Rate</div><div className="rep-tv num">{stats.rtoStats?.rtoRate || 0}%</div><div className="rep-ts bad">returns</div></div>
                <div className="rep-tile"><div className="rep-tl">RTO Value</div><div className="rep-tv num">{money(breakdown.rto)}</div><div className="rep-ts bad">at risk</div></div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
