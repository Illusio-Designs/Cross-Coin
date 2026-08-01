import React, { useState } from 'react';
import Loader from '../../../components/common/Loader';
import DonutChart from '../../../components/common/DonutChart';
import { useDashboardStats } from '../../../hooks/queries/useDashboard';
import { orderService } from '../../../services';
import { DateRangePicker } from '../../../components/ui';
import { PageHeader, Panel, StatGrid, StatTile, ResponsiveTable } from '../../../components/Dashboard/primitives';
import { showSuccess, showError } from '../../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   Reports — a date-ranged, exportable view of store performance.
   Reuses the dashboard stats API (revenue, brand-wise sales, top
   products, payment + status breakdowns) and adds one-click CSV
   export per table plus a delivered-orders server export.
   ────────────────────────────────────────────────────────────── */

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => (Number(n) || 0).toLocaleString('en-IN');

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

const DL_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

function ExportButton({ onClick, children = 'Export CSV', disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="sl-add-btn"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.5 : 1 }}
    >
      <span className="sl-add-btn-icon" style={{ display: 'inline-flex' }}>{DL_ICON}</span>
      {children}
    </button>
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

  const statusRows = [
    { label: 'Delivered', value: (sd['delivered'] || 0) + (sd['completed'] || 0) },
    { label: 'Shipped / In transit', value: (sd['shipped'] || 0) + (sd['in transit'] || 0) + (sd['out for delivery'] || 0) },
    { label: 'Confirmed / Processing', value: (sd['confirmed'] || 0) + (sd['processing'] || 0) },
    { label: 'Pending', value: (sd['pending'] || 0) + (sd['awaiting_confirmation'] || 0) },
    { label: 'RTO / Returned', value: (sd['rto'] || 0) + (sd['rto delivered'] || 0) + (sd['return_initiated'] || 0) + (sd['returned_rto'] || 0) },
    { label: 'Cancelled', value: (sd['cancelled'] || 0) + (sd['order cancelled'] || 0) },
  ].filter((r) => r.value > 0);

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="Reports"
        subtitle={hasDateFilter ? `Period: ${periodLabel}` : 'All-time performance — pick a date range to narrow it'}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <DateRangePicker
              label=""
              startDate={dateFilter.start_date || ''}
              endDate={dateFilter.end_date || ''}
              onStartChange={(v) => setDate('start_date', v)}
              onEndChange={(v) => setDate('end_date', v)}
              onClear={clearDates}
              inline
            />
            <ExportButton onClick={exportSummary} disabled={!stats}>Export summary</ExportButton>
          </div>
        }
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Loader /></div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>Failed to load report data.</div>
      ) : !stats ? null : (
        <>
          {/* ── Summary KPIs ── */}
          <StatGrid style={{ marginBottom: 'var(--ds-space-4)' }}>
            <StatTile label="Total Revenue" value={money(revenue.total)} />
            <StatTile label="Earned" value={money(revenue.earned)} tone="good" sub="Delivered" />
            <StatTile label="Active" value={money(revenue.active)} tone="info" sub="In pipeline" />
            <StatTile label="Lost" value={money(revenue.lost)} tone="danger" sub="Cancelled + RTO" />
            <StatTile label="Avg Order" value={money(revenue.average)} tone="info" />
            <StatTile label="Orders" value={num(orders.total)} />
            <StatTile label="Delivered" value={num(orders.completed)} tone="good" />
            <StatTile label="Cancelled" value={num(orders.cancelled)} tone="danger" />
          </StatGrid>

          {/* ── Sales by Brand ── */}
          <div className="dc-two-col" style={{ marginBottom: 'var(--ds-space-4)' }}>
            <Panel
              title="Sales by Brand"
              actions={<ExportButton onClick={exportBrandSales} disabled={!brandSales.length} />}
              flush
            >
              <ResponsiveTable
                data={brandSales}
                rowKey="brandId"
                emptyMessage="No brand sales in this period"
                columns={[
                  { key: 'brand', label: 'Brand', cellStyle: { fontWeight: 600, color: 'var(--ds-color-brand)' },
                    render: (b) => (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                        {b.name}
                      </span>
                    ) },
                  { key: 'orders', label: 'Orders', render: (b) => num(b.orders) },
                  { key: 'revenue', label: 'Revenue', cellStyle: { fontWeight: 700, color: 'var(--ds-color-success)' }, render: (b) => money(b.revenue) },
                  { key: 'earned', label: 'Earned', render: (b) => money(b.earned) },
                  { key: 'share', label: 'Share', render: (b) => `${b.share || 0}%` },
                ]}
              />
            </Panel>

            {brandSales.length > 0 && (
              <Panel>
                <DonutChart
                  data={brandSales.map((b) => ({ label: b.name, value: b.revenue, color: b.color }))}
                  title="Revenue by Brand"
                  subtitle="Share of total revenue"
                  totalValue={money(revenue.total)}
                  totalLabel="Total Revenue"
                  size={160} strokeWidth={22} showLegend
                />
              </Panel>
            )}
          </div>

          {/* ── Top Products + Revenue by status ── */}
          <div className="dc-two-col" style={{ marginBottom: 'var(--ds-space-4)' }}>
            <Panel
              title="Top Products"
              actions={<ExportButton onClick={exportTopProducts} disabled={!topProducts.length} />}
              flush
            >
              <ResponsiveTable
                data={topProducts.slice(0, 10)}
                rowKey="id"
                emptyMessage="No products sold in this period"
                columns={[
                  { key: 'rank', label: '#', headerStyle: { width: 44 }, render: (_p, i) => i + 1 },
                  { key: 'name', label: 'Product', cellStyle: { fontWeight: 600, color: 'var(--ds-color-brand)', whiteSpace: 'normal', overflowWrap: 'break-word', minWidth: 160 }, render: (p) => p.name },
                  { key: 'sold', label: 'Units', render: (p) => num(p.totalSold) },
                  { key: 'revenue', label: 'Revenue', cellStyle: { fontWeight: 700, color: 'var(--ds-color-success)' }, render: (p) => money(p.totalRevenue) },
                ]}
              />
            </Panel>

            {revenue.donutChart?.length > 0 && (
              <Panel>
                <DonutChart
                  data={revenue.donutChart}
                  title="Revenue by Order Status"
                  subtitle="Where the money sits"
                  totalValue={money(revenue.total)}
                  totalLabel="Total Revenue"
                  size={160} strokeWidth={22} showLegend
                />
              </Panel>
            )}
          </div>

          {/* ── Order status + Payment breakdown ── */}
          <div className="dc-two-col" style={{ marginBottom: 'var(--ds-space-4)' }}>
            <Panel title="Order Status Breakdown">
              <StatGrid>
                {statusRows.map((r) => (
                  <StatTile key={r.label} label={r.label} value={num(r.value)}
                    sub={orders.total > 0 ? `${Math.round((r.value / orders.total) * 100)}%` : '0%'} />
                ))}
              </StatGrid>
            </Panel>

            <Panel title="Payment & Fulfilment">
              <StatGrid>
                <StatTile label="COD Orders" value={num(payment.cod?.count)} tone="warn" />
                <StatTile label="COD Revenue" value={money(payment.cod?.revenue)} tone="warn" />
                <StatTile label="Prepaid Orders" value={num(payment.prepaid?.count)} tone="good" />
                <StatTile label="Prepaid Revenue" value={money(payment.prepaid?.revenue)} tone="good" />
                <StatTile label="RTO Rate" value={`${stats.rtoStats?.rtoRate || 0}%`} tone="danger" />
                <StatTile label="RTO Value" value={money(breakdown.rto)} tone="danger" />
              </StatGrid>
            </Panel>
          </div>

          {/* ── Delivered-orders server export ── */}
          <Panel title="Delivered Orders Export">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '4px 2px' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
                Download a detailed CSV of all delivered orders for the selected date range (used for reconciliation & accounting).
                {!hasDateFilter && ' Pick a start and end date above first.'}
              </p>
              <ExportButton onClick={exportDeliveredOrders} disabled={exportingOrders || !dateFilter.start_date || !dateFilter.end_date}>
                {exportingOrders ? 'Exporting…' : 'Export delivered orders'}
              </ExportButton>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
