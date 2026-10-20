import React, { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Skeleton, SkeletonList, SkeletonTableRows } from '../ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from './primitives';
import { dashboardService, brandService } from '../../services';
import Dropdown from '../ui/Dropdown';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Package01Icon, ArrowRight01Icon, WhatsappIcon, Building01Icon,
  SlidersHorizontalIcon, News01Icon, Search01Icon, File01Icon, DashboardSquare01Icon,
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

const IC = { arrow: <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} /> };

/* ── Greeting helper ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

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
   TODAY HOME (admin / order managers) — GET /api/dashboard/today
   Work queues first (most urgent on top), then the order pipeline,
   headline numbers, the last 7 days, today by brand and a feed of
   what just happened. Every queue opens the matching Orders tab.
   ══════════════════════════════════════════════════════════════ */
const rupee = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const plural = (n, w) => `${Number(n || 0).toLocaleString('en-IN')} ${w}${Number(n) === 1 ? '' : 's'}`;
const PRIORITY_LABEL = { urgent: 'Urgent', today: 'Today', later: 'When free' };

// Card copy for each queue the backend returns.
function queueCard(q) {
  switch (q.key) {
    case 'to_confirm': return {
      title: 'COD orders to confirm', action: 'Call & confirm',
      detail: q.overdue > 0 ? `${q.overdue} waiting over 24 h — oldest ${q.oldestHours} h. Call, then confirm or cancel.` : 'Call the customer, then confirm or cancel.',
    };
    case 'ndr': return {
      title: 'Delivery problems', action: 'Resolve',
      detail: q.replied > 0 ? `${plural(q.replied, 'customer')} replied on WhatsApp — act on their choice.` : 'Courier couldn’t deliver — waiting for the customer’s reply.',
    };
    case 'refund_failed': return { title: 'Refund failed', action: 'Retry refund', detail: `${rupee(q.amount)} still owed — Razorpay refused it. Retry or pay by UPI.` };
    case 'to_ship': return {
      title: 'Ready to ship', action: q.labelsPending > 0 ? 'Download labels' : 'Open',
      detail: [q.labelsPending > 0 ? `${plural(q.labelsPending, 'label')} not downloaded` : null,
        q.notBooked > 0 ? `${q.notBooked} not booked yet${q.nextBatch ? ' — next booking 11:00' : ''}` : null].filter(Boolean).join(' · ') || 'Booked and waiting for pickup.',
    };
    case 'returns_refund': return { title: 'Returns to refund', action: 'Refund', detail: `Parcels received — ${rupee(q.amount)} owed.${q.toReview ? ` ${q.toReview} more to review.` : ''}` };
    case 'booking_failed': return { title: 'Booking failed', action: 'Fix', detail: q.sample ? String(q.sample).slice(0, 90) : 'No courier could book these — fix the address or enter the AWB.' };
    case 'whatsapp': return { title: 'Unread WhatsApp', action: 'Open inbox', detail: `${plural(q.messages, 'message')}${q.oldestHours != null ? ` · oldest ${q.oldestHours < 1 ? 'under an hour' : q.oldestHours + ' h'} ago` : ''}` };
    case 'stock': return { title: 'Out of stock', action: 'Restock', detail: q.low ? `${plural(q.low, 'more variant')} below 10 units.` : 'Variants with no stock left.' };
    case 'reviews': return { title: 'Reviews to approve', action: 'Review', detail: 'Waiting before they show on the stores.' };
    default: return { title: q.key, action: 'Open', detail: '' };
  }
}
const openQueue = (q, brandId) => {
  if (q.view === 'whatsapp-chat') return goToView('whatsapp-chat');
  // "Reviews to approve" lands on the Waiting tab, filtered to the brand picked here.
  if (q.key === 'reviews') { try { sessionStorage.setItem('obz-reviews', JSON.stringify({ tab: 'pending', brandId: brandId || '' })); } catch { /* storage blocked */ } }
  // "Out of stock → Restock" lands on the Products page's Out of stock filter.
  if (q.key === 'stock') { try { sessionStorage.setItem('obz-products-filter', 'out'); } catch { /* storage blocked */ } }
  if (q.view) return goToView(q.view);
  // Delivery problems / returns to refund / failed refunds open Orders → Problems on that filter.
  const problems = { ndr: 'problems:ndr', returns_refund: 'problems:refund', refund_failed: 'problems:refund' }[q.key];
  return goToView('orders', problems || q.tab);
};
const timeAgo = (d) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return `${m} min`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} h`;
  return `${Math.floor(m / 1440)} d`;
};
const SearchIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);

function TodayHome() {
  const { user } = useAuth();
  const [brandId, setBrandId] = useState('');
  const [brandList, setBrandList] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true).then((r) => { if (!off && r?.success) setBrandList(r.data || []); }).catch(() => {});
    return () => { off = true; };
  }, []);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['dashboard', 'today', brandId],
    queryFn: () => dashboardService.getToday(brandId || undefined),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,      // the queues should feel live
    refetchOnWindowFocus: true,
  });

  const runSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    try { sessionStorage.setItem('obz-orders-search', q); } catch { /* storage blocked */ }
    goToView('orders');
  };

  // First load: the page keeps its layout and every block shimmers in place
  // (a brand switch or the 60s refresh keeps the old numbers — keepPreviousData).
  const first = isLoading && !data;
  const num = (v, w = 56, h = 24) => (first ? <Skeleton w={w} h={h} /> : v);
  if (error && !data) return <div className="obz-home"><div className="panel">Couldn’t load today’s dashboard: {error.message || 'try again'}</div></div>;

  const queues = (data?.queues || []).filter((q) => q.count > 0);
  const counts = { all: queues.length, urgent: 0, today: 0, later: 0 };
  queues.forEach((q) => { counts[q.priority] += 1; });
  const shown = queues.filter((q) => tab === 'all' || q.priority === tab);
  const urgentItems = queues.filter((q) => q.priority === 'urgent').reduce((n, q) => n + q.count, 0);
  const totalItems = queues.reduce((n, q) => n + q.count, 0);
  const p = data?.pipeline || {};
  const k = data?.kpis || {};
  const week = data?.week || [];
  const weekMax = Math.max(1, ...week.map((w) => w.value));
  const weekTotal = week.reduce((n, w) => n + w.value, 0);
  const todayYmd = week.length ? week[week.length - 1].day : '';
  const dayName = (ymd) => (ymd === todayYmd ? 'Today' : new Date(ymd + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }));
  const Delta = ({ v, suffix = '%' }) => (v == null ? null : <b className={v >= 0 ? 'up' : 'down'}>{v >= 0 ? '▲' : '▼'} {Math.abs(v)}{suffix}</b>);
  const rtoDelta = k.rto30 != null && k.rto30Prev ? Math.round((k.rto30 - k.rto30Prev) * 10) / 10 : null;

  return (
    <div className="obz-home">
      <div className="hm-head">
        <div>
          <h1>{getGreeting()}{user?.username ? `, ${user.username}` : ''}</h1>
          <p>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
            {first ? '' : ' · '}{first ? '' : totalItems > 0 ? `${plural(totalItems, 'thing')} need you today${urgentItems ? `, ${urgentItems} urgent` : ''}.` : 'Nothing waiting — all clear.'}
            {isFetching && data ? ' Updating…' : ''}
          </p>
        </div>
        <div className="hm-tools">
          <form className="hm-search" onSubmit={runSearch} role="search">
            <label htmlFor="hm-search-input" style={{ position: 'absolute', left: -9999 }}>Search orders</label>
            <SearchIcon />
            <input id="hm-search-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order no., phone, AWB or customer…" />
          </form>
          <Dropdown
            value={brandId || 'all'}
            onChange={(v) => setBrandId(v === 'all' ? '' : v)}
            options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: b.id, label: b.display_name || b.name }))]}
            className="bset-brand-select"
          />
        </div>
      </div>

      <section className="panel" aria-label="Today's work">
        <div className="panel-h">
          <div>
            <h3>Today’s work</h3>
            <span className="h-hint">Most urgent first. Each button opens the right page.</span>
          </div>
          <div className="hm-tabs" role="tablist" aria-label="Filter work">
            {['all', 'urgent', 'today', 'later'].map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={`hm-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
                {t === 'all' ? 'All' : PRIORITY_LABEL[t]}{!first && <span className="n">{counts[t]}</span>}
              </button>
            ))}
          </div>
        </div>
        {first ? (
          <div className="hm-cards" role="status" aria-busy="true">
            <span className="ds-sr-only">Loading today’s work…</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="hm-card" aria-hidden="true" style={{ borderColor: 'var(--ds-color-border)' }}>
                <div className="top"><Skeleton w={64} h={18} r={999} /><Skeleton w={40} h={28} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}><Skeleton w="70%" h={14} /><Skeleton w="90%" h={11} /></div>
                <Skeleton w="100%" h={34} r={10} />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="hm-empty">{queues.length === 0 ? 'Nothing waiting. Nice work.' : 'Nothing in this group.'}</div>
        ) : (
          <div className="hm-cards">
            {shown.map((q) => {
              const c = queueCard(q);
              return (
                <article key={q.key} className={`hm-card p-${q.priority}`}>
                  <div className="top"><span className="tag">{PRIORITY_LABEL[q.priority]}</span><span className="count">{q.count.toLocaleString('en-IN')}</span></div>
                  <div><h3>{c.title}</h3><p>{c.detail}</p></div>
                  <button type="button" className="go" onClick={() => openQueue(q, brandId)}>{c.action} →</button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel" aria-label="Orders right now">
        <div className="panel-h"><h3>Orders right now</h3><span className="h-hint">click a stage to open it</span></div>
        <div className="hm-flow">
          {[
            { l: 'To confirm', v: p.toConfirm, tab: 'to_confirm' },
            { l: 'To ship', v: p.toShip, tab: 'to_ship' },
            { l: 'In transit', v: p.inTransit, tab: 'in_transit' },
            { l: 'Delivered today', v: p.deliveredToday, sub: rupee(p.deliveredTodayValue), tab: 'delivered' },
          ].map((s, i, arr) => (
            <div className="step" key={s.l}>
              <button type="button" onClick={() => goToView('orders', s.tab)}>
                <span className="l">{s.l}</span>
                <span className="v">{num(Number(s.v || 0).toLocaleString('en-IN'), 48, 26)}</span>
                {s.sub && <span className="l">{num(s.sub, 60, 11)}</span>}
              </button>
              {i < arr.length - 1 && <span className="arrow" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
        <div className="hm-chips">
          <button type="button" className="hm-chip bad" onClick={() => goToView('orders', 'problems')}>Delivery problems · {first ? '–' : p.problems || 0}</button>
          <button type="button" className="hm-chip ret" onClick={() => goToView('orders', 'returns')}>Returns open · {first ? '–' : p.returnsOpen || 0}</button>
          <button type="button" className="hm-chip" onClick={() => goToView('orders', 'cancelled_rto')}>Cancelled &amp; RTO today · {first ? '–' : p.closedToday || 0}</button>
        </div>
      </section>

      {first ? (
        <section className="hm-kpis" aria-label="Numbers" role="status" aria-busy="true">
          <span className="ds-sr-only">Loading figures…</span>
          {['Orders today', 'Booked today', 'Net sales · this month', 'RTO rate · 30 days'].map((l) => (
            <div className="hm-kpi" key={l}><span className="kl">{l}</span><Skeleton w="55%" h={26} /><Skeleton w="80%" h={11} /></div>
          ))}
        </section>
      ) : (
      <section className="hm-kpis" aria-label="Numbers">
        <div className="hm-kpi"><span className="kl">Orders today</span><span className="kv">{(k.ordersToday || 0).toLocaleString('en-IN')}</span><span className="kf"><Delta v={k.ordersDelta} /> vs same time yesterday</span></div>
        <div className="hm-kpi"><span className="kl">Booked today</span><span className="kv">{rupee(k.bookedToday)}</span><span className="kf"><Delta v={k.bookedDelta} /> avg order {rupee(k.aovToday)}</span></div>
        <div className="hm-kpi"><span className="kl">Net sales · this month</span><span className="kv">{rupee(k.netSalesMonth)}</span><span className="kf">delivered minus {rupee(k.refundsMonth)} refunds</span></div>
        <div className="hm-kpi"><span className="kl">RTO rate · 30 days</span><span className="kv">{k.rto30 ?? 0}%</span><span className="kf">{rtoDelta != null && <b className={rtoDelta <= 0 ? 'up' : 'down'}>{rtoDelta <= 0 ? '▼' : '▲'} {Math.abs(rtoDelta)} pts </b>}COD {k.codRto30 ?? 0}% · prepaid {k.prepaidRto30 ?? 0}%</span></div>
      </section>
      )}

      <div className="hm-grid3">
        <section className="panel">
          <div className="panel-h"><h3>Booked value, last 7 days</h3><span className="h-hint">{first ? <Skeleton w={64} h={11} /> : rupee(weekTotal)}</span></div>
          <div className="hm-week" aria-busy={first || undefined}>
            {first && [46, 70, 38, 88, 60, 104, 52].map((h, i) => (
              <div className="col" key={i} aria-hidden="true">
                <Skeleton w="70%" h={10} />
                <Skeleton w="100%" h={h} r="6px 6px 2px 2px" style={{ maxWidth: 44 }} />
                <Skeleton w="60%" h={10} />
              </div>
            ))}
            {week.map((w) => (
              <div className="col" key={w.day} title={`${dayName(w.day)}: ${rupee(w.value)} · ${plural(w.orders, 'order')}`}>
                <span className="amt">{w.value >= 1000 ? `₹${(w.value / 1000).toFixed(1)}k` : rupee(w.value)}</span>
                <div className={`bar${w.day === todayYmd ? ' today' : ''}`} style={{ height: `${Math.max(2, Math.round((w.value / weekMax) * 120))}px` }} />
                <span className={`day${w.day === todayYmd ? ' today' : ''}`}>{dayName(w.day)}</span>
              </div>
            ))}
          </div>
        </section>

        {!brandId && (
          <section className="panel">
            <div className="panel-h"><h3>Today by brand</h3></div>
            {first ? (
              <div style={{ overflowX: 'auto' }} role="status" aria-busy="true">
                <span className="ds-sr-only">Loading brands…</span>
                <table className="hm-table" aria-hidden="true">
                  <thead><tr><th>Brand</th><th className="r">Orders</th><th className="r">Booked</th><th className="r">To confirm</th></tr></thead>
                  <tbody><SkeletonTableRows rows={3} cols={4} /></tbody>
                </table>
              </div>
            ) : (data?.brands || []).length === 0 ? <div className="h-hint">No orders yet today.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="hm-table">
                  <thead><tr><th>Brand</th><th className="r">Orders</th><th className="r">Booked</th><th className="r">To confirm</th></tr></thead>
                  <tbody>
                    {data.brands.map((b) => (
                      <tr key={b.brandId}><td style={{ fontWeight: 600 }}>{b.brand}</td><td className="r">{b.orders}</td><td className="r" style={{ fontWeight: 700 }}>{rupee(b.booked)}</td><td className="r">{b.toConfirm}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="panel">
          <div className="panel-h"><h3>Just happened</h3></div>
          {first ? <SkeletonList rows={5} label="Loading recent activity…" />
            : (data?.feed || []).length === 0 ? <div className="h-hint">Nothing in the last 3 days.</div> : (
            <ol className="hm-feed">
              {data.feed.map((e, i) => (
                <li key={i}>
                  <span className={`dot ${e.tone}`} aria-hidden="true" />
                  {e.conversationId ? (
                    <button type="button" className="txt" onClick={() => { try { sessionStorage.setItem('obz-wa-open', String(e.conversationId)); } catch { /* blocked */ } goToView('whatsapp-chat'); }}>{e.text}</button>
                  ) : <span className="txt">{e.text}</span>}
                  <span className="time">{timeAgo(e.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/* Admin / order managers get the today home; other roles get quick links. */
function CardGrid() {
  const { roles } = useAuth();
  const canSeeOrders = roles.includes('admin') || roles.includes('order_manager');
  return canSeeOrders ? <TodayHome /> : <RoleHome />;
}

export default CardGrid;
