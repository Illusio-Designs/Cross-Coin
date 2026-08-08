import React, { useState } from 'react';
import Loader from '../common/Loader';
import DonutChart from '../common/DonutChart';
import { useDashboardStats } from '../../hooks/queries/useDashboard';
import { useAuth } from '../../context/AuthContext';
import { DateRangePicker } from '../ui';
import { PageHeader, Panel, StatGrid, StatTile, ResponsiveTable } from './primitives';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoneyBag02Icon, ShoppingCart01Icon, Clock01Icon, Tick02Icon, RefreshIcon,
  Package01Icon, StarIcon, CreditCardIcon, UndoIcon, Alert02Icon,
  Analytics01Icon, ChartUpIcon, UserMultiple02Icon, DeliveryTruck01Icon,
  ArrowDown01Icon, ArrowUp01Icon, ArrowRight01Icon,
  WhatsappIcon, Building01Icon, SlidersHorizontalIcon, News01Icon,
  Share08Icon, Search01Icon, File01Icon, DashboardSquare01Icon,
} from '@hugeicons/core-free-icons';

/* Navigate the dashboard shell to another view (same pattern as the
   notification bell): push the path and fire popstate so index.jsx swaps
   the mounted view without any prop threading. An optional order-status
   hint is stashed in sessionStorage so the Orders page lands pre-filtered. */
function goToView(view, orderStatus) {
  if (orderStatus) { try { sessionStorage.setItem('obz-orders-status', orderStatus); } catch {} }
  const url = view === 'main' ? '/dashboard' : `/dashboard/${view}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/* ── Icons ── */
const IC = {
  rupee: <HugeiconsIcon icon={MoneyBag02Icon} size={16} strokeWidth={2} />,
  cart:  <HugeiconsIcon icon={ShoppingCart01Icon} size={16} strokeWidth={2} />,
  clock: <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={2} />,
  check: <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />,
  recent:<HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} />,
  box:   <HugeiconsIcon icon={Package01Icon} size={16} strokeWidth={2} />,
  star:  <HugeiconsIcon icon={StarIcon} size={16} strokeWidth={2} />,
  card:  <HugeiconsIcon icon={CreditCardIcon} size={16} strokeWidth={2} />,
  undo:  <HugeiconsIcon icon={UndoIcon} size={16} strokeWidth={2} />,
  warn:  <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} />,
  chart: <HugeiconsIcon icon={Analytics01Icon} size={16} strokeWidth={2} />,
  trend: <HugeiconsIcon icon={ChartUpIcon} size={16} strokeWidth={2} />,
  users: <HugeiconsIcon icon={UserMultiple02Icon} size={16} strokeWidth={2} />,
  truck: <HugeiconsIcon icon={DeliveryTruck01Icon} size={16} strokeWidth={2} />,
  chevDown: <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} />,
  chevUp: <HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={2} />,
  arrow: <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />,
};

/* ── Action inbox card — one actionable queue, click-through to act ── */
function ActionCard({ tone, icon, count, label, hint, onClick }) {
  return (
    <button type="button" className={`inbox-card tone-${tone}`} onClick={onClick}>
      <span className="ic-chip">{icon}</span>
      <span className="ic-body">
        <span className="ic-top"><b className="num">{count}</b><span className="ic-label">{label}</span></span>
        <span className="ic-hint">{hint}</span>
      </span>
      <span className="ic-go" aria-hidden="true">{IC.arrow}</span>
    </button>
  );
}

const THEMES = {
  primary: { bg: '#f2f2f3', color: '#0a0a0a', border: '#e0e0e3' },
  success: { bg: '#f2f2f3', color: '#0a0a0a', border: '#e0e0e3' },
  warning: { bg: '#f2f2f3', color: '#6b6b73', border: '#e0e0e3' },
  danger:  { bg: '#f2f2f3', color: '#0a0a0a', border: '#e0e0e3' },
  info:    { bg: '#f2f2f3', color: '#0a0a0a', border: '#e0e0e3' },
  orange:  { bg: '#f2f2f3', color: '#6b6b73', border: '#e0e0e3' },
  default: { bg: '#f2f2f3', color: '#6b6b73', border: '#e0e0e3' },
};

const fmt = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = (n) => (n || 0).toLocaleString('en-IN');

/* Customer initials for the avatar chip (e.g. "Jay Maurya" → "JM"). */
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/* Map an order status to a pill tone (good/info/warn/bad/mut). */
function orderPill(status) {
  const s = String(status || '').toLowerCase();
  if (/deliver|complet/.test(s))                                return ['good', status || '—'];
  if (/ship|transit|out for|booked|manifest|pickup|dispatch/.test(s)) return ['info', status];
  if (/pend|await|process|confirm/.test(s))                     return ['warn', status];
  if (/cancel|fail/.test(s))                                    return ['bad', status];
  if (/rto|return/.test(s))                                     return ['rto', status];
  return ['mut', status || '—'];
}

/* ── Greeting helper ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── KPI delta arrow (▲/▼ %) — green up, red down ── */
function Delta({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  return <span className={`delta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(pct)}%</span>;
}

/* ── Revenue area chart — cumulative daily revenue (smooth upward line) ── */
function RevenueTrend({ data }) {
  if (!Array.isArray(data) || data.length < 2 || data.every((v) => !v)) {
    return <div className="h-hint">Not enough revenue history yet for a trend.</div>;
  }
  let sum = 0;
  const cum = data.map((v) => (sum += (v || 0)));
  const W = 640, H = 150, PAD = 6;
  const max = Math.max(1, ...cum);
  const pts = cum.map((v, i) => {
    const x = (i / (cum.length - 1)) * W;
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return [x, y];
  });
  // Smooth the polyline with a light Catmull-Rom → cubic-bezier pass.
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${d} L${W} ${H} L0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="150" preserveAspectRatio="none" style={{ display: 'block' }} role="img" aria-label="Cumulative revenue trend, last 30 days">
      <line x1="0" y1={H * 0.33} x2={W} y2={H * 0.33} stroke="var(--ds-color-border-soft)" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={H * 0.66} x2={W} y2={H * 0.66} stroke="var(--ds-color-border-soft)" vectorEffect="non-scaling-stroke" />
      <path d={area} fill="var(--ds-color-surface-soft)" />
      <path d={d} fill="none" stroke="var(--ds-color-text)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
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
   ROLE HOME — non-reporting staff (WhatsApp / product / content
   managers) never see the store's financial overview. They land on a
   clean home with quick links to only the sections their role can open.
   ══════════════════════════════════════════════════════════════ */
const ic = (icon) => <HugeiconsIcon icon={icon} size={20} strokeWidth={2} />;
// Curated primary destinations (sub-tabs like seo-health / whatsapp-chat are
// intentionally omitted). Order here = order shown on the home.
const QUICK_LINKS = [
  { view: 'whatsapp',      label: 'WhatsApp',   hint: 'Reply to customer chats',   tone: 'success', icon: ic(WhatsappIcon) },
  { view: 'products',      label: 'Products',   hint: 'Manage catalog & stock',    tone: 'info',    icon: ic(Package01Icon) },
  { view: 'categories',    label: 'Categories', hint: 'Organize the catalog',      tone: 'info',    icon: ic(DashboardSquare01Icon) },
  { view: 'media-gallery', label: 'Media',      hint: 'Images & brand assets',     tone: 'info',    icon: ic(File01Icon) },
  { view: 'brands',        label: 'Brands',     hint: 'Brand pages & settings',    tone: 'info',    icon: ic(Building01Icon) },
  { view: 'slider',        label: 'Sliders',    hint: 'Homepage banners',          tone: 'info',    icon: ic(SlidersHorizontalIcon) },
  { view: 'blogs',         label: 'Blogs',      hint: 'Articles & content',        tone: 'info',    icon: ic(News01Icon) },
  { view: 'lookbooks',     label: 'Lookbooks',  hint: 'Social commerce',           tone: 'info',    icon: ic(Share08Icon) },
  { view: 'seo',           label: 'SEO',        hint: 'Search optimization',       tone: 'info',    icon: ic(Search01Icon) },
];

function RoleHome() {
  const { user, canAccessView } = useAuth();
  const links = QUICK_LINKS.filter((l) => canAccessView(l.view));
  return (
    <div className="obz-home">
      <PageHeader
        title={`${getGreeting()}, ${user?.username || 'there'}`}
        subtitle="Here's your workspace"
      />
      {links.length > 0 ? (
        <div className="panel">
          <div className="panel-h">
            <h3>Quick access</h3>
            <span className="h-hint">{links.length} {links.length === 1 ? 'section' : 'sections'} · tap to open</span>
          </div>
          <div className="inbox-grid">
            {links.map((l) => (
              <button key={l.view} type="button" className={`inbox-card tone-${l.tone}`} onClick={() => goToView(l.view)}>
                <span className="ic-chip">{l.icon}</span>
                <span className="ic-body">
                  <span className="ic-top"><span className="ic-label">{l.label}</span></span>
                  <span className="ic-hint">{l.hint}</span>
                </span>
                <span className="ic-go" aria-hidden="true">{IC.arrow}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel"><div className="h-hint">Use the menu on the left to get started.</div></div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */
function CardGrid() {
  const [dateFilter, setDateFilter] = useState({});
  const { user, roles } = useAuth();
  // The home's revenue/order reporting is only for roles that can open the
  // Orders + Reports views (admin, order_manager). Everyone else (WhatsApp /
  // product / content managers) gets a role-appropriate home and never pulls
  // store-wide financials. Gate BOTH the fetch and the render on this.
  const canSeeReporting = roles.includes('admin') || roles.includes('order_manager');
  const { data: stats, isLoading: loading, error: queryError } = useDashboardStats(dateFilter, { enabled: canSeeReporting });
  const error = queryError ? 'Failed to load dashboard statistics' : null;

  if (!canSeeReporting) return <RoleHome />;

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
  if (error) return <div className="dashboard-sections"><div style={{ textAlign:'center', padding:'40px', color:'var(--ds-color-text)' }}>{error}</div></div>;
  if (!stats) return null;

  /* ── Derived counts ── */
  const orders = stats.orders || {};
  const revenue = stats.revenue || {};
  const customers = stats.customers || {};
  const products = stats.products || {};
  const reviews = stats.reviews || {};
  const sd = orders.statusDistribution || {};
  const g = (k) => sd[k] || 0;
  // Mutually-exclusive, EXHAUSTIVE status buckets so the Order Overview tiles
  // actually sum to Total Orders. Before this, "processing" was double-counted
  // (in both Pending and Confirmed) and booked/manifested/pickup/undelivered/
  // exception weren't shown anywhere, so the tiles never added up.
  const pendingCount   = g('awaiting_confirmation') + g('pending');
  const confirmedCount = g('confirmed') + g('processing');
  const shippedCount   = g('booked') + g('pickup initiated') + g('manifested')
                       + g('in transit') + g('shipped') + g('out for delivery')
                       + g('undelivered') + g('exception');
  const rtoCount       = g('rto') + g('rto delivered') + g('return_initiated') + g('returned_rto');
  const codCount = stats.paymentDistribution?.cod?.count || 0;
  const prepaidCount = stats.paymentDistribution?.prepaid?.count || 0;
  const totalOrders = orders.total || 0;
  const pipelineTotal = totalOrders || 1;

  /* ── Action inbox — "needs attention" queues, each click-throughs to the
     page where the operator can act. Only non-empty queues are shown, most
     urgent first; counts always match what the destination page displays. ── */
  const outOfStock = stats.lowStock?.outOfStockCount || 0;
  const lowStock = stats.lowStock?.lowStockCount || 0;
  // Prefer the exact pending-moderation count; fall back to total-approved for
  // any Redis-cached payload written before the backend added reviews.pending.
  const reviewsPending = reviews.pending ?? Math.max(0, (reviews.total || 0) - (reviews.approved || 0));

  const inbox = [
    { key: 'confirm', tone: 'warn',   icon: IC.clock, count: pendingCount, label: 'Orders to confirm', hint: 'Awaiting confirmation', onClick: () => goToView('orders', 'pending') },
    { key: 'rto',     tone: 'danger', icon: IC.undo,  count: rtoCount,     label: 'RTO / returns',     hint: 'Review & re-attempt',   onClick: () => goToView('orders', 'rto') },
    { key: 'oos',     tone: 'danger', icon: IC.warn,  count: outOfStock,   label: 'Out of stock',      hint: 'Restock now',           onClick: () => goToView('products') },
    { key: 'low',     tone: 'warn',   icon: IC.box,   count: lowStock,     label: 'Low stock',         hint: 'Below 10 units',        onClick: () => goToView('products') },
    { key: 'reviews', tone: 'info',   icon: IC.star,  count: reviewsPending, label: 'Reviews to moderate', hint: 'Awaiting approval',   onClick: () => goToView('reviews') },
  ].filter((i) => i.count > 0);

  /* ── Segmented order-overview buckets (each order counted once) ── */
  // Explicit vivid hues (not neutral tokens) so every bucket reads as its own
  // colour in both light and dark — matches the re-colorized status charts.
  const segs = [
    { label: 'Pending',       count: pendingCount,          color: '#f59e0b' }, // amber
    { label: 'Confirmed',     count: confirmedCount,        color: '#3b82f6' }, // blue
    { label: 'Shipped',       count: shippedCount,          color: '#06b6d4' }, // cyan
    { label: 'Delivered',     count: orders.completed || 0, color: '#10b981' }, // green
    { label: 'Cancelled',     count: orders.cancelled || 0, color: '#ef4444' }, // red
    { label: 'RTO / Returns', count: rtoCount,              color: '#f97316' }, // orange
  ];
  const segTotal = segs.reduce((a, s) => a + s.count, 0) || 1;
  const brandSales = stats.brandSales || [];
  const brandMax = Math.max(1, ...brandSales.map((b) => b.revenue || 0));
  const deltas = stats.deltas || {};

  return (
    <div className="obz-home">

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

      {/* ═══ 2. ACTION INBOX — needs attention ═══ */}
      {inbox.length > 0 && (
        <div className="panel inbox" role="region" aria-label="Needs attention">
          <div className="panel-h">
            <h3>Needs attention</h3>
            <span className="h-hint">{inbox.length} {inbox.length === 1 ? 'queue' : 'queues'} · tap to act</span>
          </div>
          <div className="inbox-grid">
            {inbox.map((i) => (
              <ActionCard key={i.key} tone={i.tone} icon={i.icon} count={inr(i.count)} label={i.label} hint={i.hint} onClick={i.onClick} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ 3. KPI ROW ═══ */}
      <div className="kpis">
        <div className="kpi">
          <div className="kl">Revenue (earned)</div>
          <div className="kv num">₹{fmt(revenue.earned)}</div>
          <div className="kf"><Delta pct={deltas.revenue?.pct} /> <span className="mut">vs prev 30d</span></div>
        </div>
        <div className="kpi">
          <div className="kl">Orders</div>
          <div className="kv num">{inr(totalOrders)}</div>
          <div className="kf"><Delta pct={deltas.orders?.pct} /> <span className="mut">{inr(deltas.orders?.today ?? 0)} today</span></div>
        </div>
        <div className="kpi">
          <div className="kl">Customers</div>
          <div className="kv num">{inr(customers.total || 0)}</div>
          <div className="kf">{(deltas.customersNew ?? 0) > 0 && <span className="delta up">▲ {inr(deltas.customersNew)}</span>} <span className="mut">new this month</span></div>
        </div>
        <div className="kpi">
          <div className="kl">Avg order value</div>
          <div className="kv num">₹{fmt(revenue.average)}</div>
          <div className="kf"><Delta pct={deltas.aov?.pct} /> <span className="mut">vs prev 30d</span></div>
        </div>
      </div>

      {/* ═══ 4. REVENUE + SALES BY BRAND ═══ */}
      <div className="grid2">
        <div className="panel">
          <div className="panel-h">
            <h3>Revenue</h3>
            <span className="h-hint">
              Total ₹{fmt(revenue.total)} · Earned ₹{fmt(revenue.earned)} · Active ₹{fmt(revenue.active)} · Lost ₹{fmt((revenue.breakdown?.rto || 0) + (revenue.breakdown?.cancelled || 0))}
            </span>
          </div>
          <RevenueTrend data={stats.revenueTrend} />
        </div>

        <div className="panel">
          <div className="panel-h"><h3>Sales by brand</h3></div>
          {brandSales.length > 0 ? brandSales.map((b) => (
            <div className="rb" key={b.brandId}>
              <span className="n">{b.name}</span>
              <span className="t"><span className="f" style={{ width: `${Math.max(4, ((b.revenue || 0) / brandMax) * 100)}%` }} /></span>
              <span className="v num">₹{inr(b.revenue || 0)}</span>
            </div>
          )) : (
            <div className="h-hint">No brand sales yet.</div>
          )}
        </div>
      </div>

      {/* ═══ 5. ORDER OVERVIEW — segmented bar + legend ═══ */}
      <div className="panel">
        <div className="panel-h">
          <h3>Order overview</h3>
          <span className="h-hint">every order counted once — reconciles to {inr(totalOrders)}</span>
        </div>
        <div className="seg">
          {segs.map((s) => s.count > 0 && (
            <span key={s.label} style={{ width: `${(s.count / segTotal) * 100}%`, background: s.color }} />
          ))}
        </div>
        <div className="legend">
          {segs.map((s) => (
            <div className="leg" key={s.label}>
              <span className="d" style={{ background: s.color }} />
              <span><b className="num">{inr(s.count)}</b><small>{s.label}</small></span>
            </div>
          ))}
        </div>
        <div className="rb" style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--ds-color-border-soft)', color: 'var(--ds-color-text-muted)', fontSize: 12, gap: 18 }}>
          <span>COD: {inr(codCount)}</span>
          <span>Prepaid: {inr(prepaidCount)}</span>
          <span>Recent (30d): {inr(orders.recent || 0)}</span>
        </div>
      </div>

      {/* ═══ 6. RECENT ORDERS ═══ */}
      {stats.recentOrders?.length > 0 && (
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-h" style={{ padding: '18px 18px 0' }}>
            <h3>Recent orders</h3>
            <span className="h-hint">live</span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {stats.recentOrders.slice(0, 8).map((o) => {
                  const [tone, label] = orderPill(o.status);
                  const pay = String(o.paymentType || '').toLowerCase();
                  return (
                    <tr key={o.id}>
                      <td><span className="oid">{o.orderNumber}</span></td>
                      <td><span className="cust"><span className="ca">{initialsOf(o.customerName)}</span>{o.customerName || '—'}</span></td>
                      <td className="num cell-strong">₹{inr(o.amount || 0)}</td>
                      <td><span className={`pill ${pay === 'cod' ? 'warn' : 'mut'}`}>{(o.paymentType || '—').toUpperCase()}</span></td>
                      <td><span className={`pill ${tone}`}>{label}</span></td>
                      <td className="mut">{o.date ? new Date(o.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
            <ResponsiveTable
              data={stats.lowStock.products.slice(0, 10)}
              rowKey={(_p, i) => i}
              columns={[
                { key: 'name',   label: 'Product', render: (p) => <span className="table-product-name">{p.name}</span> },
                { key: 'sku',    label: 'SKU',     render: (p) => p.sku },
                { key: 'stock',  label: 'Stock',
                  render: (p) => <span className={`stock-badge ${p.stock<5?'stock-critical':'stock-low'}`}>{p.stock} units</span> },
                { key: 'status', label: 'Status',
                  render: (p) => <span className={`status-badge ${p.stock<5?'status-danger':'status-warning'}`}>{p.stock<5?'Critical':'Low'}</span> },
              ]}
            />
          )}
        </CollapsibleSection>
      )}

    </div>
  );
}

export default CardGrid;