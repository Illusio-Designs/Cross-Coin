import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, SkeletonTableRows } from '../../../components/ui';
import { API_BASE_URL } from '../../../services/api/config';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, CallIcon, WhatsappIcon, UserMultiple02Icon } from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   Customer profile — everything about one shopper on one page,
   for staff about to call a COD customer or handle a complaint.

   Opened with:
     sessionStorage['obz-customer'] = JSON.stringify({ kind: 'user'|'guest', id })
                                   or JSON.stringify({ kind: 'phone', phone })
     then navigate to /dashboard/customer.
   The key is read and cleared on open; the selection is kept on the
   history entry so a reload / Back still shows the same customer.

   Data: GET /api/customers/profile (one call; orders, returns, refunds,
   WhatsApp, addresses and the "Before you call" summary).
   ────────────────────────────────────────────────────────────── */

const SS_KEY = 'obz-customer';
const HS_KEY = 'obzCustomer';

const IC = {
  back: <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />,
  call: <HugeiconsIcon icon={CallIcon} size={16} strokeWidth={2} />,
  wa: <HugeiconsIcon icon={WhatsappIcon} size={16} strokeWidth={2} />,
  users: <HugeiconsIcon icon={UserMultiple02Icon} size={22} strokeWidth={2} />,
};

function goToView(view) {
  const url = view === 'main' ? '/dashboard' : `/dashboard/${view}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Read (and clear) the opener's hand-off; fall back to this history entry.
function readSelection() {
  let sel = null;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) { sessionStorage.removeItem(SS_KEY); sel = JSON.parse(raw); }
  } catch { /* storage blocked / bad JSON */ }
  if (sel && (sel.kind === 'phone' ? sel.phone : sel.id)) {
    try { window.history.replaceState({ ...(window.history.state || {}), [HS_KEY]: sel }, '', window.location.href); } catch { /* ignore */ }
    return sel;
  }
  return window.history.state?.[HS_KEY] || null;
}

async function fetchProfile(sel) {
  const params = sel.kind === 'phone' ? { kind: 'phone', phone: sel.phone } : { kind: sel.kind, id: sel.id };
  let token = null;
  try { token = localStorage.getItem('token'); } catch { /* blocked */ }
  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/customers/profile`, {
      params, timeout: 20000, headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return data;
  } catch (err) {
    if (err.response?.status === 401) {
      try { localStorage.removeItem('token'); } catch { /* blocked */ }
      window.location.href = '/login';
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to load customer');
  }
}

// ── Formatting ──────────────────────────────────────────────────────
const inr = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const monthYear = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '');
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const fmtPhone = (p) => { const d = last10(p); return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : (p || ''); };
const timeAgo = (d) => {
  if (!d) return '—';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 31) return days === 1 ? 'yesterday' : `${days} days ago`;
  const months = Math.floor(days / 30.4);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const Pill = ({ tone = 'muted', children, title }) => <span className={`cp-pill cp-pill--${tone}`} title={title}>{children}</span>;

const RETURN_TONE = {
  requested: 'warn', under_review: 'warn', approved: 'info', pickup_scheduled: 'info', picked_up: 'info',
  received: 'violet', refunded: 'ok', rejected: 'muted',
};
const RISK_TONE = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'bad' };

export default function CustomerProfile() {
  const [sel, setSel] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    setSel(readSelection());
    setReady(true);
    // Another opener (e.g. global search) can hand over a new customer while
    // this page is already showing — re-read on navigation.
    const onPop = () => {
      if (!window.location.pathname.startsWith('/dashboard/customer')) return;
      const next = readSelection();
      if (next) { setSel(next); setTab('orders'); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['customer-profile', sel?.kind, sel?.id ?? null, sel?.phone ?? null],
    queryFn: () => fetchProfile(sel),
    enabled: !!sel,
    staleTime: 30 * 1000,
    retry: (n, err) => n < 1 && !/not found/i.test(err?.message || ''),
  });

  const openOrder = (orderNumber) => {
    try { sessionStorage.setItem('obz-orders-search', orderNumber); } catch { /* blocked */ }
    goToView('orders');
  };
  const openChat = (conversationId) => {
    try { sessionStorage.setItem('obz-wa-open', String(conversationId)); } catch { /* blocked */ }
    goToView('whatsapp-chat');
  };

  const back = (
    <button type="button" className="cp-back" onClick={() => goToView('consumers')}>{IC.back}<span>Consumers</span></button>
  );

  let body;
  if (!ready) {
    body = null;
  } else if (!sel) {
    body = (
      <div className="rep-panel cp-empty">
        <span className="cp-empty-ic">{IC.users}</span>
        <h3>Pick a customer from Consumers or search</h3>
        <p className="mut">Open any customer from the Consumers list, an order, or the search bar to see their orders, returns, chats and addresses here.</p>
        <button type="button" className="cp-btn cp-btn--primary" onClick={() => goToView('consumers')}>Go to Consumers</button>
      </div>
    );
  } else if (isLoading) {
    body = <ProfileSkeleton />;
  } else if (error || !data?.success) {
    body = (
      <div className="rep-panel cp-empty">
        <h3>Couldn't load this customer</h3>
        <p className="mut">{error?.message || data?.message || 'Something went wrong.'}</p>
        <button type="button" className="cp-btn" onClick={() => refetch()}>Try again</button>
      </div>
    );
  } else {
    body = <Profile data={data} tab={tab} setTab={setTab} openOrder={openOrder} openChat={openChat} refreshing={isFetching} />;
  }

  return (
    <div className="dashboard-sections obz-rep cp">
      <div>{back}</div>
      {body}
      <style jsx global>{CP_CSS}</style>
    </div>
  );
}

function Profile({ data, tab, setTab, openOrder, openChat, refreshing }) {
  const { customer: c, stats: s, orders = [], returns = [], refunds = [], chat, addresses = [], summary = [], notes = [] } = data;
  const p10 = last10(c.phone);
  const meta1 = [c.phone ? fmtPhone(c.phone) : null, c.email].filter(Boolean).join(' · ');
  const meta2 = [
    c.since ? `Customer since ${monthYear(c.since)}` : null,
    c.brands?.length ? `shops at ${c.brands.join(', ')}` : null,
    c.registered ? 'registered account' : 'guest',
  ].filter(Boolean).join(' · ');

  const tabs = [
    { id: 'orders', label: 'Orders', count: s.orders },
    { id: 'returns', label: 'Returns & refunds', count: returns.length + refunds.length },
    { id: 'whatsapp', label: 'WhatsApp', count: chat ? chat.unread || null : null },
    { id: 'addresses', label: 'Addresses', count: addresses.length },
  ];

  return (
    <>
      {/* ── Header ── */}
      <div className="rep-panel cp-head">
        <div className="cp-avatar" aria-hidden="true">{initials(c.name)}</div>
        <div className="cp-who">
          <div className="cp-name-row">
            <h2 className="cp-name">{c.name}</h2>
            {c.rtoRisk?.level && (
              <Pill tone={RISK_TONE[c.rtoRisk.level] || 'muted'} title={`RTO risk score ${c.rtoRisk.score}`}>{titleCase(c.rtoRisk.level.toLowerCase())} RTO risk</Pill>
            )}
            {c.repeatBuyer && <Pill tone="violet">Repeat buyer</Pill>}
            {refreshing && <span className="cp-sync mut">Updating…</span>}
          </div>
          {meta1 && <div className="cp-meta cp-meta--strong">{meta1}</div>}
          <div className="cp-meta">{meta2}</div>
        </div>
        <div className="cp-actions">
          {p10.length === 10 && (
            <a className="cp-btn cp-btn--primary" href={`tel:+91${p10}`}>{IC.call}<span>Call</span></a>
          )}
          {chat?.conversationId && (
            <button type="button" className="cp-btn" onClick={() => openChat(chat.conversationId)}>{IC.wa}<span>Open WhatsApp chat</span></button>
          )}
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div className="rep-kpis cp-kpis">
        <Kpi label="Orders" value={s.orders} sub={`${s.delivered} delivered · ${s.waiting} waiting`} />
        <Kpi label="Spent" value={inr(s.spent)} sub={s.refunded > 0 ? `after ${inr(s.refunded)} refunds` : 'on delivered orders'} />
        <Kpi label="Avg order" value={s.delivered ? inr(Math.round(s.avgOrder)) : '—'} sub="per delivered order" />
        <Kpi label="RTO / failed deliveries" value={`${s.rto} / ${s.failedDeliveries}`}
          sub={s.rto || s.failedDeliveries ? `${s.ordersWithFailedDelivery} order${s.ordersWithFailedDelivery === 1 ? '' : 's'} with a failed attempt` : 'none so far'}
          tone={s.rto || s.failedDeliveries ? 'bad' : 'good'} />
        <Kpi label="Returns" value={s.returns} sub={s.refundDue > 0 ? `${inr(s.refundDue)} refund due` : 'no refund due'} tone={s.refundDue > 0 ? 'warn' : undefined} />
        <Kpi label="Last order" value={s.lastOrderAt ? timeAgo(s.lastOrderAt) : '—'} sub={s.lastOrderNumber || 'no orders yet'} />
      </div>

      <div className="cp-grid">
        {/* ── Tabs ── */}
        <div className="rep-panel rep-panel--flush cp-main">
          <div className="cp-tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                className={`cp-tab${tab === t.id ? ' is-on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}{t.count ? <span className="cp-tab-n">{t.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="cp-tab-body">
            {tab === 'orders' && <OrdersTab orders={orders} total={s.orders} openOrder={openOrder} />}
            {tab === 'returns' && <ReturnsTab returns={returns} refunds={refunds} />}
            {tab === 'whatsapp' && <ChatTab chat={chat} openChat={openChat} />}
            {tab === 'addresses' && <AddressesTab addresses={addresses} />}
          </div>
        </div>

        {/* ── Side column ── */}
        <div className="cp-side">
          <div className="rep-panel">
            <div className="rep-ph"><h3>Before you call</h3></div>
            {summary.length ? (
              <ul className="cp-bullets">{summary.map((t, i) => <li key={i}>{t}</li>)}</ul>
            ) : <p className="mut cp-small">Nothing pending.</p>}
          </div>
          <div className="rep-panel">
            <div className="rep-ph"><h3>Loyalty points</h3></div>
            {c.registered ? (
              <div className="cp-loyalty"><b className="num">{(c.loyaltyPoints || 0).toLocaleString('en-IN')}</b><span className="mut">points</span></div>
            ) : <p className="mut cp-small">Guest checkout — no loyalty account.</p>}
          </div>
          {notes.length > 0 && (
            <div className="rep-panel">
              <div className="rep-ph"><h3>Order notes</h3></div>
              <ul className="cp-notes">
                {notes.map((n) => (
                  <li key={n.orderNumber}>
                    <div className="cp-note-top"><b>{n.orderNumber}</b><span className="mut">{fmtDate(n.at)}</span></div>
                    <p>{n.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* First load of a profile: header card, six tiles, the Orders tab and the
   side cards — same boxes as the real page, so nothing jumps when it lands. */
function ProfileSkeleton() {
  return (
    <>
      <span className="ds-sr-only" role="status">Loading customer profile…</span>
      <div className="rep-panel cp-head" aria-hidden="true">
        <Skeleton circle h={56} />
        <div className="cp-who">
          <Skeleton w={200} h={22} />
          <Skeleton w="min(320px, 80%)" h={13} style={{ marginTop: 8 }} />
          <Skeleton w="min(420px, 90%)" h={12} style={{ marginTop: 6 }} />
        </div>
        <div className="cp-actions"><Skeleton w={84} h={36} r={10} /><Skeleton w={150} h={36} r={10} /></div>
      </div>
      <div className="rep-kpis cp-kpis" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rep-kpi"><Skeleton w="50%" h={10} /><Skeleton w="45%" h={21} style={{ margin: '9px 0 6px' }} /><Skeleton w="75%" h={10} /></div>
        ))}
      </div>
      <div className="cp-grid" aria-hidden="true">
        <div className="rep-panel rep-panel--flush cp-main">
          <div className="cp-tabs">
            {['Orders', 'Returns & refunds', 'WhatsApp', 'Addresses'].map((t, i) => (
              <span key={t} className={`cp-tab${i === 0 ? ' is-on' : ''}`}>{t}</span>
            ))}
          </div>
          <div className="cp-tab-body">
            <div className="rep-tbl-wrap cp-tbl">
              <table className="rep-table">
                <thead><tr><th>Order</th><th>Date</th><th>Payment</th><th>Stage</th><th className="r">Total</th></tr></thead>
                <tbody><SkeletonTableRows rows={5} cols={5} /></tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="cp-side">
          <div className="rep-panel"><div className="rep-ph"><h3>Before you call</h3></div><div className="sk-text">{['92%', '78%', '60%'].map((w) => <Skeleton key={w} w={w} h={12} />)}</div></div>
          <div className="rep-panel"><div className="rep-ph"><h3>Loyalty points</h3></div><Skeleton w={90} h={24} /></div>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className="rep-kpi">
      <div className="rep-kl">{label}</div>
      <div className="rep-kv num">{value}</div>
      <div className={`rep-kf${tone ? ` cp-kf--${tone}` : ''}`}>{sub}</div>
    </div>
  );
}

function OrdersTab({ orders, total, openOrder }) {
  if (!orders.length) return <p className="cp-none mut">No orders yet.</p>;
  return (
    <>
      <div className="rep-tbl-wrap cp-tbl">
        <table className="rep-table">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Payment</th><th>Stage</th><th className="r">Total</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="cp-row" tabIndex={0} title="Open in Orders"
                onClick={() => openOrder(o.orderNumber)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openOrder(o.orderNumber); } }}>
                <td>
                  <div className="strong">{o.orderNumber}</div>
                  {o.brand && <div className="cp-sub">{o.brand}</div>}
                </td>
                <td>{fmtDate(o.at)}</td>
                <td>
                  <div>{o.paymentType}</div>
                  <div className="cp-sub">{titleCase(o.paymentStatus)}</div>
                </td>
                <td>
                  <Pill tone={o.tone}>{o.stageLabel}</Pill>
                  {o.failedDeliveries > 0 && <div className="cp-sub cp-bad">{o.failedDeliveries} failed attempt{o.failedDeliveries === 1 ? '' : 's'}</div>}
                </td>
                <td className="r">
                  <div className="strong num">{inr(o.total)}</div>
                  {o.refunded > 0 && <div className="cp-sub">−{inr(o.refunded)} refunded</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > orders.length && <p className="cp-foot mut">Showing the latest {orders.length} of {total} orders.</p>}
    </>
  );
}

function ReturnsTab({ returns, refunds }) {
  if (!returns.length && !refunds.length) return <p className="cp-none mut">No returns or refunds.</p>;
  return (
    <>
      {returns.length > 0 && (
        <div className="rep-tbl-wrap cp-tbl">
          <table className="rep-table">
            <thead>
              <tr><th>Return</th><th>Requested</th><th>Status</th><th>Refund to</th><th className="r">Amount</th></tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="strong">{r.returnNumber}</div>
                    <div className="cp-sub">{[r.orderNumber, r.reason ? titleCase(r.reason) : null].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{fmtDate(r.at)}</td>
                  <td>
                    <Pill tone={RETURN_TONE[r.status] || 'muted'}>{r.status === 'received' ? 'Received · refund due' : titleCase(r.status)}</Pill>
                    {r.refundedAt && <div className="cp-sub">{fmtDate(r.refundedAt)}</div>}
                  </td>
                  <td>
                    {r.isCod ? (
                      <><div>{r.upiId ? `UPI ${r.upiId}` : 'UPI (not given)'}</div><div className="cp-sub">COD order</div></>
                    ) : (
                      <><div>{r.resolution === 'exchange' ? 'Exchange' : 'Original payment'}</div><div className="cp-sub">Prepaid</div></>
                    )}
                  </td>
                  <td className="r">
                    <div className="strong num">{inr(r.refundAmount ?? r.requestedAmount)}</div>
                    {r.refundAmount != null && r.refundAmount !== r.requestedAmount && <div className="cp-sub">asked {inr(r.requestedAmount)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {refunds.length > 0 && (
        <>
          <div className="cp-subhead">Gateway refunds</div>
          <div className="rep-tbl-wrap cp-tbl">
            <table className="rep-table">
              <thead>
                <tr><th>Order</th><th>Date</th><th>Status</th><th>Reference</th><th className="r">Amount</th></tr>
              </thead>
              <tbody>
                {refunds.map((p) => (
                  <tr key={p.id}>
                    <td className="strong">{p.orderNumber || '—'}</td>
                    <td>{fmtDate(p.at)}</td>
                    <td><Pill tone={p.status === 'failed' ? 'bad' : ['refunded', 'successful', 'completed'].includes(p.status) ? 'ok' : 'warn'}>{titleCase(p.status)}</Pill></td>
                    <td className="cp-mono">{p.reference || '—'}</td>
                    <td className="r strong num">{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function ChatTab({ chat, openChat }) {
  if (!chat) return <p className="cp-none mut">No WhatsApp conversation with this number yet.</p>;
  return (
    <div className="cp-chat">
      <div className="cp-chat-top">
        <span className="mut">Last {chat.messages.length} message{chat.messages.length === 1 ? '' : 's'}{chat.unread ? ` · ${chat.unread} unread` : ''}</span>
        <button type="button" className="cp-btn" onClick={() => openChat(chat.conversationId)}>{IC.wa}<span>Open full chat</span></button>
      </div>
      {chat.messages.length === 0 ? <p className="mut cp-small">No messages yet.</p> : (
        <div className="cp-msgs">
          {chat.messages.map((m, i) => (
            <div key={i} className={`cp-msg ${m.direction === 'inbound' ? 'is-in' : 'is-out'}`}>
              <div className="cp-bubble">{m.text}</div>
              <div className="cp-msg-at">{m.direction === 'inbound' ? 'Customer' : 'Sent'} · {fmtDateTime(m.at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressesTab({ addresses }) {
  if (!addresses.length) return <p className="cp-none mut">No saved or used addresses.</p>;
  return (
    <ul className="cp-addrs">
      {addresses.map((a, i) => (
        <li key={i} className="cp-addr">
          <div className="cp-addr-main">
            <div className="strong">{a.name}</div>
            <div>{a.line}</div>
            <div className="mut">{[a.city, a.state, a.pincode].filter(Boolean).join(', ')}</div>
          </div>
          <div className="cp-addr-stats">
            <span>{a.orders} order{a.orders === 1 ? '' : 's'}</span>
            {a.failedDeliveries > 0
              ? <span className="cp-bad">{a.failedDeliveries} failed deliver{a.failedDeliveries === 1 ? 'y' : 'ies'}</span>
              : a.orders > 0 ? <span className="mut">no failed deliveries</span> : <span className="mut">saved, not used yet</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Page-local styles (tokens only, so light + dark both work). The shared
   .rep-* card / KPI / table classes come from reports.css. */
const CP_CSS = `
.cp .cp-back {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 2px;
  background: none; border: 0; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
  color: var(--ds-color-text-muted);
}
.cp .cp-back:hover { color: var(--ds-color-text); }
.cp .cp-small { font-size: 13px; margin: 0; }
.cp .cp-bad { color: var(--ds-color-danger); }
.cp .cp-mono { font-family: var(--ds-font-mono); font-size: 12px; }

.cp .cp-empty { text-align: center; padding: 48px 18px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.cp .cp-empty h3 { margin: 0; font-size: 16px; color: var(--ds-color-text); }
.cp .cp-empty p { margin: 0 0 6px; max-width: 52ch; font-size: 13px; }
.cp .cp-empty-ic {
  width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
  background: var(--ds-color-surface-soft); border: 1px solid var(--ds-color-border); color: var(--ds-color-text-muted);
}

.cp .cp-btn {
  display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px;
  border-radius: 8px; border: 1px solid var(--ds-color-border); background: var(--ds-color-surface);
  color: var(--ds-color-text); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  text-decoration: none; white-space: nowrap;
}
.cp .cp-btn:hover { border-color: var(--ds-color-text-faint); }
.cp .cp-btn--primary { background: var(--ds-color-brand); border-color: var(--ds-color-brand); color: var(--ds-color-surface); }
.cp .cp-btn--primary:hover { background: var(--ds-color-brand-strong); }

.cp .cp-pill {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap;
  background: var(--ds-color-surface-soft); color: var(--ds-color-text-muted); border: 1px solid var(--ds-color-border-soft);
}
.cp .cp-pill--ok { background: var(--ds-color-success-bg); color: var(--ds-color-success); border-color: transparent; }
.cp .cp-pill--info { background: var(--ds-color-info-bg); color: var(--ds-color-info); border-color: transparent; }
.cp .cp-pill--warn { background: var(--ds-color-warn-bg); color: var(--ds-color-warn); border-color: transparent; }
.cp .cp-pill--bad { background: var(--ds-color-danger-bg); color: var(--ds-color-danger); border-color: transparent; }
.cp .cp-pill--violet { background: var(--ds-color-accent2-bg); color: var(--ds-color-accent2); border-color: transparent; }

/* Header card */
.cp .cp-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cp .cp-avatar {
  width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  background: var(--ds-color-brand); color: var(--ds-color-surface); font-weight: 700; font-size: 19px; letter-spacing: .02em;
}
.cp .cp-who { flex: 1 1 260px; min-width: 0; }
.cp .cp-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cp .cp-name { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: var(--ds-color-text); overflow-wrap: anywhere; }
.cp .cp-sync { font-size: 11.5px; }
.cp .cp-meta { margin-top: 4px; font-size: 13px; color: var(--ds-color-text-muted); overflow-wrap: anywhere; }
.cp .cp-meta--strong { color: var(--ds-color-text); font-variant-numeric: tabular-nums; }
.cp .cp-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* KPI strip: 6 tiles */
.cp .cp-kpis { grid-template-columns: repeat(6, 1fr); }
@media (max-width: 1180px) { .cp .cp-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .cp .cp-kpis { grid-template-columns: 1fr 1fr; } }
.cp .cp-kpis .rep-kv { font-size: 21px; }
.cp .cp-kf--bad { color: var(--ds-color-danger); }
.cp .cp-kf--warn { color: var(--ds-color-warn); }
.cp .cp-kf--good { color: var(--ds-color-success); }

/* Main + side */
.cp .cp-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
@media (max-width: 980px) { .cp .cp-grid { grid-template-columns: minmax(0, 1fr); } }
.cp .cp-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.cp .cp-main { padding: 0; }
.cp .cp-tabs {
  display: flex; gap: 2px; padding: 0 10px; border-bottom: 1px solid var(--ds-color-border);
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.cp .cp-tab {
  display: inline-flex; align-items: center; gap: 6px; padding: 13px 10px 11px; margin-bottom: -1px;
  background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap;
  font: inherit; font-size: 13px; font-weight: 600; color: var(--ds-color-text-muted);
}
.cp .cp-tab:hover { color: var(--ds-color-text); }
.cp .cp-tab.is-on { color: var(--ds-color-text); border-bottom-color: var(--ds-color-text); }
.cp .cp-tab-n {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; display: inline-grid; place-items: center;
  background: var(--ds-color-surface-soft); border: 1px solid var(--ds-color-border); font-size: 10.5px; font-weight: 700;
}
.cp .cp-tab-body { padding: 0 18px; }
.cp .cp-tbl { margin: 0 -18px; }
.cp .cp-tbl .rep-table td { vertical-align: top; }
.cp .cp-row { cursor: pointer; }
.cp .cp-row:focus-visible td { outline: none; background: var(--ds-color-surface-soft); }
.cp .cp-sub { font-size: 11.5px; color: var(--ds-color-text-muted); margin-top: 3px; white-space: nowrap; }
.cp .cp-none { padding: 28px 0; margin: 0; text-align: center; font-size: 13px; }
.cp .cp-foot { font-size: 12px; margin: 0; padding: 10px 0 14px; }
.cp .cp-subhead {
  margin: 0 -18px; padding: 16px 18px 6px; border-top: 1px solid var(--ds-color-border);
  font-size: 12px; font-weight: 650; color: var(--ds-color-text);
}

/* WhatsApp */
.cp .cp-chat { padding: 14px 0 18px; }
.cp .cp-chat-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; font-size: 12.5px; }
.cp .cp-msgs { display: flex; flex-direction: column; gap: 10px; }
.cp .cp-msg { display: flex; flex-direction: column; max-width: 78%; }
.cp .cp-msg.is-in { align-self: flex-start; align-items: flex-start; }
.cp .cp-msg.is-out { align-self: flex-end; align-items: flex-end; }
.cp .cp-bubble {
  padding: 8px 11px; border-radius: 12px; font-size: 13px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere;
  background: var(--ds-color-surface-soft); border: 1px solid var(--ds-color-border); color: var(--ds-color-text);
}
.cp .cp-msg.is-in .cp-bubble { border-bottom-left-radius: 4px; }
.cp .cp-msg.is-out .cp-bubble { border-bottom-right-radius: 4px; background: var(--ds-color-success-bg); border-color: transparent; }
.cp .cp-msg-at { font-size: 11px; color: var(--ds-color-text-muted); margin-top: 3px; }

/* Addresses */
.cp .cp-addrs { list-style: none; margin: 0; padding: 6px 0; }
.cp .cp-addr { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--ds-color-border-soft); font-size: 13px; color: var(--ds-color-text); flex-wrap: wrap; }
.cp .cp-addr:last-child { border-bottom: 0; }
.cp .cp-addr-main { min-width: 0; flex: 1 1 240px; overflow-wrap: anywhere; display: grid; gap: 2px; }
.cp .cp-addr-main .strong { font-weight: 600; }
.cp .cp-addr-stats { display: grid; gap: 2px; justify-items: end; font-size: 12.5px; white-space: nowrap; }
@media (max-width: 520px) { .cp .cp-addr-stats { justify-items: start; } }

/* Side panels */
.cp .cp-bullets { margin: 0; padding-left: 18px; display: grid; gap: 8px; font-size: 13px; line-height: 1.45; color: var(--ds-color-text); }
.cp .cp-loyalty { display: flex; align-items: baseline; gap: 6px; }
.cp .cp-loyalty b { font-size: 24px; font-weight: 700; color: var(--ds-color-text); letter-spacing: -0.02em; }
.cp .cp-notes { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.cp .cp-note-top { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--ds-color-text); }
.cp .cp-notes p { margin: 4px 0 0; font-size: 13px; line-height: 1.45; color: var(--ds-color-text-muted); white-space: pre-wrap; overflow-wrap: anywhere; }
`;
