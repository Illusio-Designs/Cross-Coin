import React, { useState } from 'react';
import Loader from '../common/Loader';
import DonutChart from '../common/DonutChart';
import { useDashboardStats } from '../../hooks/queries/useDashboard';
import { useAuth } from '../../context/AuthContext';
import { DateRangePicker } from '../ui';
import { PageHeader, Panel, StatGrid, StatTile } from './primitives';

/* ── Icons ── */
const IC = {
  rupee: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12M6 8h12M6 13l8 8M6 13h3a4 4 0 0 0 0-8H6"/></svg>,
  cart:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  recent:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  box:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  star:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  card:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  undo:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
  warn:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  trend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
};

const THEMES = {
  primary: { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  success: { bg: '#d1fae5', color: '#059669', border: '#6ee7b7' },
  warning: { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
  danger:  { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  info:    { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  orange:  { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  default: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
};

const fmt = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Greeting helper ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── KPI Tile ── */
function KpiTile({ label, value, color, prefix = '' }) {
  return (
    <div className="dc-kpi-tile" style={{ borderLeftColor: color }}>
      <span className="dc-kpi-label">{label}</span>
      <span className="dc-kpi-value" style={{ color }}>{prefix}{value}</span>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ title, value, description, icon, color = 'default' }) {
  const t = THEMES[color] || THEMES.default;
  return (
    <div className="dc-stat-card">
      <div className="dc-stat-icon" style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
        {icon}
      </div>
      <div className="dc-stat-body">
        <div className="dc-stat-label">{title}</div>
        <div className="dc-stat-value">{value}</div>
        {description && <div className="dc-stat-desc">{description}</div>}
      </div>
    </div>
  );
}

/* ── Section Title ── */
function SectionTitle({ icon, children }) {
  return (
    <div className="dc-section-title">
      <span className="dc-section-icon">{icon}</span>
      {children}
    </div>
  );
}

/* ── Collapsible Section ── */
function CollapsibleSection({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dashboard-section">
      <button className="dc-collapse-trigger" onClick={() => setOpen(!open)} type="button">
        <SectionTitle icon={icon}>{title}</SectionTitle>
        <span className="dc-collapse-chevron">{open ? IC.chevUp : IC.chevDown}</span>
      </button>
      {open && <div className="dc-collapse-body">{children}</div>}
    </div>
  );
}

/* ── Pipeline Step ── */
function PipelineStep({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="dc-pipe-step">
      <div className="dc-pipe-bar-track">
        <div className="dc-pipe-bar-fill" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
      </div>
      <div className="dc-pipe-info">
        <span className="dc-pipe-count" style={{ color }}>{count}</span>
        <span className="dc-pipe-label">{label}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */
function CardGrid() {
  const [dateFilter, setDateFilter] = useState({});
  const { data: stats, isLoading: loading, error: queryError } = useDashboardStats(dateFilter);
  const { user } = useAuth();
  const error = queryError ? 'Failed to load dashboard statistics' : null;

  const handleDateChange = (field, value) => {
    setDateFilter(prev => {
      const next = { ...prev, [field]: value || undefined };
      if (!next.start_date) delete next.start_date;
      if (!next.end_date) delete next.end_date;
      return next;
    });
  };

  const clearDateFilter = () => setDateFilter({});
  const hasDateFilter = !!(dateFilter.start_date || dateFilter.end_date);

  if (loading) return (
    <div className="dashboard-sections">
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'400px' }}>
        <Loader />
      </div>
    </div>
  );
  if (error) return <div className="dashboard-sections"><div style={{ textAlign:'center', padding:'40px', color:'#dc2626' }}>{error}</div></div>;
  if (!stats) return null;

  /* ── Derived counts ── */
  const orders = stats.orders || {};
  const revenue = stats.revenue || {};
  const customers = stats.customers || {};
  const products = stats.products || {};
  const reviews = stats.reviews || {};
  const sd = orders.statusDistribution || {};
  const shippedCount = (sd['shipped'] || 0) + (sd['in transit'] || 0) + (sd['out for delivery'] || 0);
  const confirmedCount = (sd['confirmed'] || 0) + (sd['processing'] || 0);
  const rtoCount = (sd['rto'] || 0) + (sd['rto delivered'] || 0) + (sd['return_initiated'] || 0) + (sd['returned_rto'] || 0);
  const codCount = stats.paymentDistribution?.cod?.count || 0;
  const prepaidCount = stats.paymentDistribution?.prepaid?.count || 0;
  const totalOrders = orders.total || 0;
  const pipelineTotal = totalOrders || 1;

  /* ── Alert items ── */
  const alerts = [];
  if (stats.lowStock?.outOfStockCount > 0) alerts.push(`${stats.lowStock.outOfStockCount} out of stock`);
  if (stats.lowStock?.lowStockCount > 0) alerts.push(`${stats.lowStock.lowStockCount} low stock`);
  if (stats.rtoStats?.rtoRate > 0) alerts.push(`RTO rate: ${stats.rtoStats.rtoRate}%`);
  if (orders.pending > 0) alerts.push(`${orders.pending} orders pending`);

  return (
    <div className="dashboard-sections">

      {/* ═══ 1. PAGE HEADER (greeting + date filter) ═══ */}
      <PageHeader
        title={`${getGreeting()}, ${user?.username || 'Admin'}`}
        subtitle={hasDateFilter ? 'Showing filtered data' : "Here's your store overview"}
        actions={
          <DateRangePicker
            label=""
            startDate={dateFilter.start_date || ''}
            endDate={dateFilter.end_date || ''}
            onStartChange={val => handleDateChange('start_date', val)}
            onEndChange={val => handleDateChange('end_date', val)}
            onClear={clearDateFilter}
            inline
          />
        }
      />

      {/* ═══ 2. ALERT BAR ═══ */}
      {alerts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: 'var(--ds-color-warn-bg)',
            border: '1px solid var(--ds-color-warn-bd)',
            borderRadius: 'var(--ds-radius-md)',
            color: 'var(--ds-color-warn)',
            fontSize: 'var(--ds-text-md)',
            fontWeight: 'var(--ds-weight-semi)',
            marginBottom: 'var(--ds-space-4)',
          }}
        >
          <span style={{ display: 'inline-flex' }} aria-hidden="true">{IC.warn}</span>
          <span>{alerts.join('  ·  ')}</span>
        </div>
      )}

      {/* ═══ 3. KPI STRIP — design-system StatTiles ═══ */}
      <StatGrid style={{ marginBottom: 'var(--ds-space-4)' }}>
        <StatTile label="Total Revenue"    value={fmt(revenue.total)}             prefix="₹" />
        <StatTile label="Earned"           value={fmt(revenue.earned)}            prefix="₹" tone="good" />
        <StatTile label="Active"           value={fmt(revenue.active)}            prefix="₹" tone="info" />
        <StatTile label="Lost (RTO)"       value={fmt(revenue.breakdown?.rto)}    prefix="₹" tone="warn" />
        <StatTile label="Lost (Cancelled)" value={fmt(revenue.breakdown?.cancelled)} prefix="₹" tone="danger" />
        <StatTile label="Monthly"          value={fmt(revenue.monthly)}           prefix="₹" />
        <StatTile label="Avg Order"        value={fmt(revenue.average)}           prefix="₹" tone="info" />
        <StatTile label="Customers"        value={customers.total || 0} />
        <StatTile label="Products"         value={`${products.active || 0}/${products.total || 0}`} sub="active / total" />
        <StatTile label="Reviews"          value={`${reviews.approved || 0}/${reviews.total || 0}`} sub="approved / total" tone="warn" />
      </StatGrid>

      {/* ═══ 4. ORDER PIPELINE + REVENUE DONUT (2-col) ═══ */}
      <div className="dc-two-col">
        <div className="dashboard-section">
          <SectionTitle icon={IC.truck}>Order Pipeline</SectionTitle>
          <div className="dc-pipeline">
            <PipelineStep label="Pending" count={orders.pending || 0} total={pipelineTotal} color="#f59e0b" />
            <PipelineStep label="Confirmed" count={confirmedCount} total={pipelineTotal} color="#3b82f6" />
            <PipelineStep label="Shipped" count={shippedCount} total={pipelineTotal} color="#0891b2" />
            <PipelineStep label="Delivered" count={orders.completed || 0} total={pipelineTotal} color="#10b981" />
            <PipelineStep label="Cancelled" count={orders.cancelled || 0} total={pipelineTotal} color="#ef4444" />
            <PipelineStep label="RTO / Returns" count={rtoCount} total={pipelineTotal} color="#64748b" />
          </div>
          <div className="dc-pipe-footer">
            <span>Total: {totalOrders}</span>
            <span>Last 30 days: {orders.recent || 0}</span>
            <span>COD: {codCount} · Prepaid: {prepaidCount}</span>
          </div>
        </div>

        {revenue.donutChart?.length > 0 && (
          <div className="dc-donut-wrap-single">
            <DonutChart
              data={revenue.donutChart}
              title="Revenue by Status"
              subtitle="Where the money sits"
              totalValue={`₹${(revenue.total || 0).toLocaleString('en-IN',{minimumFractionDigits:2})}`}
              totalLabel="Total Revenue"
              size={160} strokeWidth={22} showLegend={true}
            />
          </div>
        )}
      </div>

      {/* ═══ 5. ORDER STAT CARDS — design-system StatTiles ═══ */}
      <Panel title="Order Overview" style={{ marginBottom: 'var(--ds-space-4)' }}>
        <StatGrid>
          <StatTile label="Total Orders" value={totalOrders} sub={hasDateFilter ? 'Filtered period' : 'All time'} />
          <StatTile label="Pending"      value={orders.pending || 0}   tone="warn"   sub="Awaiting processing" />
          <StatTile label="Confirmed"    value={confirmedCount}        tone="info"   sub="Confirmed & processing" />
          <StatTile label="Shipped"      value={shippedCount}          tone="info"   sub="In transit / delivery" />
          <StatTile label="Delivered"    value={orders.completed || 0} tone="good"   sub={`${totalOrders > 0 ? Math.round(((orders.completed || 0)/totalOrders)*100) : 0}% success`} />
          <StatTile label="Cancelled"    value={orders.cancelled || 0} tone="danger" sub={`${totalOrders > 0 ? Math.round(((orders.cancelled || 0)/totalOrders)*100) : 0}% of total`} />
          <StatTile label="RTO / Returns" value={rtoCount}             tone="danger" sub={`${totalOrders > 0 ? Math.round((rtoCount/totalOrders)*100) : 0}% RTO rate`} />
          <StatTile label="COD Orders"   value={codCount}              tone="warn"   sub={`${totalOrders > 0 ? Math.round((codCount/totalOrders)*100) : 0}% of total`} />
          <StatTile label="Prepaid"      value={prepaidCount}          tone="good"   sub={`${totalOrders > 0 ? Math.round((prepaidCount/totalOrders)*100) : 0}% of total`} />
          <StatTile label="Recent"       value={orders.recent || 0}    tone="info"   sub="Last 30 days" />
        </StatGrid>
      </Panel>

      {/* ═══ 6. CHARTS ROW (2x2) ═══ */}
      <div className="dc-charts-2x2">
        {stats.paymentDistribution?.chart?.length > 0 && (
          <DonutChart data={stats.paymentDistribution.chart} title="Payment Methods" subtitle="COD vs Prepaid" totalValue={`${totalOrders}`} totalLabel="Total Orders" size={160} strokeWidth={22} showLegend={true} />
        )}
        {stats.paymentStatusDistribution?.chart?.length > 0 && (
          <DonutChart data={stats.paymentStatusDistribution.chart} title="Payment Status" subtitle="All payment statuses" totalValue={`${totalOrders}`} totalLabel="Total Orders" size={160} strokeWidth={22} showLegend={true} />
        )}
        {orders.statusChart?.length > 0 && (
          <DonutChart data={orders.statusChart} title="Order Pipeline" subtitle="Current pipeline" totalValue={`${totalOrders}`} totalLabel="Total Orders" size={160} strokeWidth={22} showLegend={true} />
        )}
        {stats.rtoStats?.totalRTO > 0 && (
          <div className="dc-rto-mini-card">
            <div className="dc-rto-mini-header">
              <span className="dc-rto-mini-icon">{IC.undo}</span>
              <span className="dc-rto-mini-title">RTO Summary</span>
            </div>
            <div className="dc-rto-mini-grid">
              <div className="dc-rto-mini-item">
                <span className="dc-rto-mini-val">{stats.rtoStats.totalRTO}</span>
                <span className="dc-rto-mini-lbl">Total RTO</span>
              </div>
              <div className="dc-rto-mini-item">
                <span className="dc-rto-mini-val">₹{fmt(stats.rtoStats.rtoRevenue)}</span>
                <span className="dc-rto-mini-lbl">Revenue Lost</span>
              </div>
              <div className="dc-rto-mini-item">
                <span className="dc-rto-mini-val">{stats.rtoStats.rtoRate}%</span>
                <span className="dc-rto-mini-lbl">RTO Rate</span>
              </div>
              <div className="dc-rto-mini-item">
                <span className="dc-rto-mini-val">₹{fmt(stats.rtoStats.averageRTOValue)}</span>
                <span className="dc-rto-mini-lbl">Avg RTO Value</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 7. RECENT ORDERS + TOP PRODUCTS (side by side) ═══ */}
      <div className="dc-two-col dc-two-col-tables">
        {stats.recentOrders?.length > 0 && (
          <div className="dashboard-section">
            <SectionTitle icon={IC.cart}>Recent Orders</SectionTitle>
            <div className="dashboard-table-container">
              <table className="dashboard-table">
                <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>{stats.recentOrders.map(o=>(
                  <tr key={o.id}>
                    <td className="table-order-number">{o.orderNumber}</td>
                    <td>{o.customerName}</td>
                    <td className="table-amount">₹{(o.amount || 0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td><span className={`payment-badge payment-${o.paymentType}`}>{o.paymentType?.toUpperCase()}</span></td>
                    <td><span className={`status-badge status-${o.status?.toLowerCase().replace(/\s+/g,'-')}`}>{o.status}</span></td>
                    <td className="table-date">{o.date ? new Date(o.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {stats.topProducts?.length > 0 && (
          <div className="dashboard-section">
            <SectionTitle icon={IC.star}>Top Products</SectionTitle>
            <div className="dashboard-table-container">
              <table className="dashboard-table">
                <thead><tr><th>#</th><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                <tbody>{stats.topProducts.slice(0, 5).map((p,i)=>(
                  <tr key={p.id}>
                    <td className="table-rank">#{i+1}</td>
                    <td className="table-product-name">{p.name}</td>
                    <td>{p.totalSold || 0} units</td>
                    <td className="table-revenue">₹{(p.totalRevenue || 0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 8. COLLAPSIBLE: MARKETING PERFORMANCE ═══ */}
      {stats.utmTracking && (stats.utmTracking.topSources?.length > 0 || stats.utmTracking.conversions?.length > 0) && (
        <CollapsibleSection icon={IC.chart} title="Marketing Performance (Last 30 Days)">
          {stats.utmTracking.topSources?.length > 0 && (
            <div className="dashboard-subsection">
              <h3 className="dashboard-subsection-title">Top Traffic Sources</h3>
              <div className="dashboard-table-container">
                <table className="dashboard-table">
                  <thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Sessions</th><th>Registered</th><th>Guests</th></tr></thead>
                  <tbody>{stats.utmTracking.topSources.slice(0,5).map((s,i)=>(
                    <tr key={i}><td><span className="utm-badge source">{s.source}</span></td><td><span className="utm-badge medium">{s.medium}</span></td><td><span className="utm-badge campaign">{s.campaign}</span></td><td>{s.sessions}</td><td>{s.registeredUsers}</td><td>{s.guestUsers}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {stats.utmTracking.conversions?.length > 0 && (
            <div className="dashboard-subsection">
              <h3 className="dashboard-subsection-title">Conversion Performance</h3>
              <div className="dashboard-table-container">
                <table className="dashboard-table">
                  <thead><tr><th>Source</th><th>Medium</th><th>Sessions</th><th>Orders</th><th>Conv. Rate</th><th>Revenue</th></tr></thead>
                  <tbody>{stats.utmTracking.conversions.slice(0,5).map((c,i)=>(
                    <tr key={i}><td><span className="utm-badge source">{c.source}</span></td><td><span className="utm-badge medium">{c.medium}</span></td><td>{c.sessions}</td><td>{c.orders}</td><td><span className={`conversion-badge ${c.conversionRate>5?'high':c.conversionRate>2?'medium':'low'}`}>{c.conversionRate}%</span></td><td className="table-revenue">₹{(c.revenue || 0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* ═══ 9. COLLAPSIBLE: STOCK DETAILS ═══ */}
      {stats.lowStock && (stats.lowStock.lowStockCount > 0 || stats.lowStock.outOfStockCount > 0) && (
        <CollapsibleSection icon={IC.warn} title="Stock Details">
          <div className="dashboard-alert-cards">
            {stats.lowStock.outOfStockCount > 0 && (
              <div className="dashboard-alert-card alert-danger">
                <div className="alert-icon">{IC.warn}</div>
                <div className="alert-content">
                  <div className="alert-title">Out of Stock</div>
                  <div className="alert-value">{stats.lowStock.outOfStockCount} products</div>
                  <div className="alert-description">Need immediate restocking</div>
                </div>
              </div>
            )}
            {stats.lowStock.lowStockCount > 0 && (
              <div className="dashboard-alert-card alert-warning">
                <div className="alert-icon">{IC.warn}</div>
                <div className="alert-content">
                  <div className="alert-title">Low Stock</div>
                  <div className="alert-value">{stats.lowStock.lowStockCount} products</div>
                  <div className="alert-description">Stock below 10 units</div>
                </div>
              </div>
            )}
          </div>
          {stats.lowStock.products?.length > 0 && (
            <div className="dashboard-table-container">
              <table className="dashboard-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Status</th></tr></thead>
                <tbody>{stats.lowStock.products.slice(0,10).map((p,i)=>(
                  <tr key={i}><td className="table-product-name">{p.name}</td><td>{p.sku}</td><td><span className={`stock-badge ${p.stock<5?'stock-critical':'stock-low'}`}>{p.stock} units</span></td><td><span className={`status-badge ${p.stock<5?'status-danger':'status-warning'}`}>{p.stock<5?'Critical':'Low'}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>
      )}

    </div>
  );
}

export default CardGrid;