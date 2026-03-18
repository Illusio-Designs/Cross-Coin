import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import Loader from '../common/Loader';
import DonutChart from '../common/DonutChart';
import cacheManager from '../../services/cacheManager';

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
};

const THEMES = {
  primary: { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  success: { bg: '#d1fae5', color: '#059669', border: '#6ee7b7' },
  warning: { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
  danger:  { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  info:    { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  default: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
};

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

function SectionTitle({ icon, children }) {
  return (
    <div className="dc-section-title">
      <span className="dc-section-icon">{icon}</span>
      {children}
    </div>
  );
}

function CardGrid() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchDashboardStats(); }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const cached = cacheManager.getByType('dashboard');
      if (cached) { setStats(cached); setError(null); setLoading(false); return; }
      const res = await dashboardService.getDashboardStats();
      if (res.success) { setStats(res.stats); cacheManager.setByType('dashboard', res.stats); }
      setError(null);
    } catch { setError('Failed to load dashboard statistics'); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="dashboard-sections">
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'400px' }}>
        <Loader />
      </div>
    </div>
  );
  if (error) return <div className="dashboard-sections"><div style={{ textAlign:'center', padding:'40px', color:'#dc2626' }}>{error}</div></div>;
  if (!stats) return null;

  const orderCards = [
    { title:'Total Orders',     value:stats.orders.total,     description:'All time orders',       icon:IC.cart,   color:'primary' },
    { title:'Pending Orders',   value:stats.orders.pending,   description:'Awaiting processing',   icon:IC.clock,  color:'warning' },
    { title:'Completed Orders', value:stats.orders.completed, description:`${stats.orders.total > 0 ? Math.round((stats.orders.completed/stats.orders.total)*100) : 0}% success rate`, icon:IC.check, color:'success' },
    { title:'Recent Orders',    value:stats.orders.recent,    description:'Last 30 days',           icon:IC.recent, color:'info' },
  ];
  const productCards = [
    { title:'Total Products',  value:stats.products.total,  description:`${stats.products.active} active`,  icon:IC.box,  color:'primary' },
    { title:'Active Products', value:stats.products.active, description:`${stats.products.total > 0 ? Math.round((stats.products.active/stats.products.total)*100) : 0}% of total`, icon:IC.check, color:'success' },
    { title:'Total Reviews',   value:stats.reviews.total,   description:`${stats.reviews.approved} approved`, icon:IC.star, color:'warning' },
  ];

  return (
    <div className="dashboard-sections">

      {/* ── Hero Revenue Card ── */}
      <div className="dc-hero-card">
        <div className="dc-hero-bg-orb dc-hero-orb1" aria-hidden="true" />
        <div className="dc-hero-bg-orb dc-hero-orb2" aria-hidden="true" />
        <div className="dc-hero-top">
          <div className="dc-hero-icon-wrap">{IC.rupee}</div>
          <div className="dc-hero-label-group">
            <span className="dc-hero-eyebrow">Total Revenue</span>
            <div className="dc-hero-amount">
              ₹{stats.revenue.total.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}
            </div>
            <span className="dc-hero-sub">All time earnings</span>
          </div>
          <div className="dc-hero-badge">
            <span className="dc-hero-badge-icon">{IC.trend}</span>
            <span>Growing</span>
          </div>
        </div>
        <div className="dc-hero-pills">
          <div className="dc-hero-pill">
            <span className="dc-hero-pill-label">Monthly</span>
            <span className="dc-hero-pill-value">₹{stats.revenue.monthly.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}</span>
          </div>
          <div className="dc-hero-pill-sep" />
          <div className="dc-hero-pill">
            <span className="dc-hero-pill-label">Avg Order</span>
            <span className="dc-hero-pill-value">₹{stats.revenue.average.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}</span>
          </div>
          <div className="dc-hero-pill-sep" />
          <div className="dc-hero-pill">
            <span className="dc-hero-pill-label">Customers</span>
            <span className="dc-hero-pill-value">{stats.customers.total}</span>
          </div>
        </div>
      </div>

      {/* ── Order Overview ── */}
      <div className="dashboard-section">
        <SectionTitle icon={IC.cart}>Order Overview</SectionTitle>
        <div className="dashboard-card-grid">
          {orderCards.map(c => <StatCard key={c.title} {...c} />)}
        </div>
      </div>

      {/* ── Product Overview ── */}
      <div className="dashboard-section">
        <SectionTitle icon={IC.box}>Product Overview</SectionTitle>
        <div className="dashboard-card-grid dashboard-card-grid-3">
          {productCards.map(c => <StatCard key={c.title} {...c} />)}
        </div>
      </div>

      {/* ── Charts Row — DonutChart is the card itself, no wrapper needed ── */}
      <div className="dashboard-charts-row">
        {stats.revenue?.donutChart?.length > 0 && (
          <DonutChart
            data={stats.revenue.donutChart}
            title="Revenue by Status"
            subtitle="By order status"
            totalValue={`₹${stats.revenue.total.toLocaleString('en-IN',{minimumFractionDigits:2})}`}
            totalLabel="Total Revenue"
            size={160} strokeWidth={22} showLegend={true}
          />
        )}
        {stats.paymentDistribution?.chart?.length > 0 && (
          <DonutChart
            data={stats.paymentDistribution.chart}
            title="Payment Methods"
            subtitle="COD vs Prepaid"
            totalValue={`${stats.orders.total}`}
            totalLabel="Total Orders"
            size={160} strokeWidth={22} showLegend={true}
          />
        )}
        {stats.paymentStatusDistribution?.chart?.length > 0 && (
          <DonutChart
            data={stats.paymentStatusDistribution.chart}
            title="Payment Status"
            subtitle="All payment statuses"
            totalValue={`${stats.orders.total}`}
            totalLabel="Total Orders"
            size={160} strokeWidth={22} showLegend={true}
          />
        )}
        {stats.orders?.statusChart?.length > 0 && (
          <DonutChart
            data={stats.orders.statusChart}
            title="Order Pipeline"
            subtitle="Current pipeline"
            totalValue={`${stats.orders.total}`}
            totalLabel="Total Orders"
            size={160} strokeWidth={22} showLegend={true}
          />
        )}
      </div>

      {/* ── RTO Statistics ── */}
      {stats.rtoStats?.totalRTO > 0 && (
        <div className="dashboard-section">
          <SectionTitle icon={IC.undo}>RTO Statistics</SectionTitle>
          <div className="dashboard-card-grid dashboard-card-grid-3">
            <StatCard title="Total RTO Orders" value={stats.rtoStats.totalRTO} description={`${stats.rtoStats.rtoRate}% of total orders`} icon={IC.undo} color="danger" />
            <StatCard title="RTO Revenue Loss" value={`₹${stats.rtoStats.rtoRevenue.toLocaleString('en-IN',{minimumFractionDigits:2})}`} description={`${stats.rtoStats.rtoPercentageOfRevenue}% of total revenue`} icon={IC.rupee} color="danger" />
            <StatCard title="Avg RTO Value" value={`₹${stats.rtoStats.averageRTOValue.toLocaleString('en-IN',{minimumFractionDigits:2})}`} description="Per RTO order" icon={IC.chart} color="danger" />
          </div>
        </div>
      )}

      {/* ── Marketing Performance ── */}
      {stats.utmTracking && (stats.utmTracking.topSources?.length > 0 || stats.utmTracking.conversions?.length > 0) && (
        <div className="dashboard-section">
          <SectionTitle icon={IC.chart}>Marketing Performance (Last 30 Days)</SectionTitle>
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
                  <thead><tr><th>Source</th><th>Medium</th><th>Sessions</th><th>Orders</th><th>Conversion Rate</th><th>Revenue</th></tr></thead>
                  <tbody>{stats.utmTracking.conversions.slice(0,5).map((c,i)=>(
                    <tr key={i}><td><span className="utm-badge source">{c.source}</span></td><td><span className="utm-badge medium">{c.medium}</span></td><td>{c.sessions}</td><td>{c.orders}</td><td><span className={`conversion-badge ${c.conversionRate>5?'high':c.conversionRate>2?'medium':'low'}`}>{c.conversionRate}%</span></td><td className="table-revenue">₹{c.revenue.toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {stats.utmTracking.sourceChart?.length > 0 && (
            <div style={{ marginTop:'20px' }}>
              <DonutChart
                data={stats.utmTracking.sourceChart}
                title="Traffic Sources"
                subtitle="Top 5 sources"
                totalValue={stats.utmTracking.sourceChart.reduce((s,i)=>s+i.value,0).toString()}
                totalLabel="Total Sessions"
                size={160} strokeWidth={22} showLegend={true}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Stock Alerts ── */}
      {stats.lowStock && (stats.lowStock.lowStockCount > 0 || stats.lowStock.outOfStockCount > 0) && (
        <div className="dashboard-section">
          <SectionTitle icon={IC.warn}>Stock Alerts</SectionTitle>
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
        </div>
      )}

      {/* ── Top Selling Products ── */}
      {stats.topProducts?.length > 0 && (
        <div className="dashboard-section">
          <SectionTitle icon={IC.star}>Top Selling Products</SectionTitle>
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead><tr><th>#</th><th>Product</th><th>Price</th><th>Sold</th><th>Orders</th><th>Revenue</th></tr></thead>
              <tbody>{stats.topProducts.map((p,i)=>(
                <tr key={p.id}><td className="table-rank">#{i+1}</td><td className="table-product-name">{p.name}</td><td>₹{p.price.toLocaleString('en-IN')}</td><td>{p.totalSold} units</td><td>{p.orderCount}</td><td className="table-revenue">₹{p.totalRevenue.toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Orders ── */}
      {stats.recentOrders?.length > 0 && (
        <div className="dashboard-section">
          <SectionTitle icon={IC.cart}>Recent Orders</SectionTitle>
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{stats.recentOrders.map(o=>(
                <tr key={o.id}><td className="table-order-number">{o.orderNumber}</td><td>{o.customerName}</td><td className="table-amount">₹{o.amount.toLocaleString('en-IN',{minimumFractionDigits:2})}</td><td><span className={`payment-badge payment-${o.paymentType}`}>{o.paymentType.toUpperCase()}</span></td><td><span className={`status-badge status-${o.status.toLowerCase().replace(/\s+/g,'-')}`}>{o.status}</span></td><td className="table-date">{new Date(o.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default CardGrid;
