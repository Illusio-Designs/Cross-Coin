import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';
import { Skeleton, SkeletonTableRows } from '../ui';

/* ──────────────────────────────────────────────────────────────
   Abandoned carts — shoppers who added items and left, and what the
   WhatsApp recovery message did.
   GET  /api/whatsapp/carts?days=&status=&brandId=
        → { flow:{ left, messaged, no_number, opened, ordered, sales },
            rows:[{ id, name, phone_masked, brand, items_label, value, left_at,
                    wa, wa_send_at, result, conversation_id, order_number }],
            rules:{ waitHours, quietStart, quietEnd, coupon, minValue },
            counts?:{ all, wait, sent, won, none } }
   POST /api/whatsapp/carts/:id/send-now   (admin)
   PUT  /api/whatsapp/carts/rules          (admin)
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp/carts';

const PERIODS = [{ key: 1, label: 'Today' }, { key: 7, label: '7 days' }, { key: 30, label: '30 days' }];
const TABS = [
  { key: 'all', label: 'All', wa: null },
  { key: 'wait', label: 'Waiting to send', wa: ['wait'] },
  { key: 'sent', label: 'Messaged', wa: ['sent', 'clicked'] },
  { key: 'won', label: 'Recovered', wa: ['won'] },
  { key: 'none', label: 'Can’t message', wa: ['none', 'stop'] },
];
const WA = {
  wait: { label: 'Waiting', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'info' },
  clicked: { label: 'Opened cart', tone: 'accent' },
  won: { label: 'Ordered', tone: 'success' },
  none: { label: 'No number', tone: 'muted' },
  stop: { label: 'Opted out', tone: 'danger' },
};

const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
const inr = (n) => `₹${num(n)}`;
const pctOf = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : 0);

const IST = 'Asia/Kolkata';
const dayKey = (d) => d.toLocaleDateString('en-CA', { timeZone: IST });
const clock = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST }).toLowerCase();

function ago(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 12 || dayKey(d) === dayKey(new Date())) return `${hrs} h ago`;
  // Whole calendar days between the two IST dates.
  const days = Math.round((Date.parse(dayKey(new Date())) - Date.parse(dayKey(d))) / 86400000);
  if (days <= 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST });
}

function sendsAt(v) {
  if (!v) return 'Waiting';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'Waiting';
  if (d.getTime() <= Date.now()) return 'Sending soon';
  if (dayKey(d) === dayKey(new Date())) return `Sends at ${clock(d)}`;
  return `Sends ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST })}, ${clock(d)}`;
}

/* quietStart / quietEnd may arrive as an hour number (21) or "HH:MM". Keep the
   shape we received so a save sends the same kind back. */
function toHHMM(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number' || /^\d{1,2}$/.test(String(v))) return `${String(Number(v) % 24).padStart(2, '0')}:00`;
  const m = String(v).match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}
function fromHHMM(hhmm, original) {
  if (!hhmm) return original ?? null;
  if (typeof original === 'number') return Number(hhmm.split(':')[0]);
  return hhmm;
}
function niceClock(v) {
  const hhmm = toHHMM(v);
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}
function waitLabel(h) {
  const n = Number(h);
  if (!Number.isFinite(n) || n <= 0) return 'right away';
  if (n < 1) return `${Math.round(n * 60)} minutes`;
  return n === 1 ? '1 hour' : `${n} hours`;
}

function openOrder(orderNumber) {
  try { sessionStorage.setItem('obz-orders-search', String(orderNumber)); } catch { /* storage blocked */ }
  window.history.pushState({}, '', '/dashboard/orders');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const TABLE_HEAD = (
  <thead>
    <tr><th>Shopper</th><th>Cart</th><th className="r">Value</th><th>Left</th><th>WhatsApp</th><th>Result</th><th className="r"><span className="wpb-sr">Action</span></th></tr>
  </thead>
);

export default function CartsPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [editRules, setEditRules] = useState(false);
  const [draft, setDraft] = useState(null);
  const [savingRules, setSavingRules] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { days, status: tab };
      if (brandId) params.brandId = brandId;
      const { data: res } = await adminApi.get(API, { params });
      setData(res || {});
    } catch (e) {
      setError(errText(e, 'Could not load abandoned carts.'));
    } finally {
      setLoading(false);
    }
  }, [days, tab, brandId]);

  useEffect(() => { load(); }, [load]);

  const flow = data?.flow || {};
  const rules = data?.rules || null;
  const allRows = Array.isArray(data?.rows) ? data.rows : [];
  // Server filters by status; filter again here in case it returned everything.
  const rows = useMemo(() => {
    const g = TABS.find((t) => t.key === tab)?.wa;
    return g ? allRows.filter((r) => g.includes(r.wa)) : allRows;
  }, [allRows, tab]);
  const counts = data?.counts || null;

  const left = Number(flow.left) || 0;
  const messaged = Number(flow.messaged) || 0;
  const flowItems = [
    { label: 'Carts left', value: num(left), note: 'with items, no order', w: left ? 100 : 0, tone: 'neutral' },
    { label: 'Messaged', value: num(messaged), note: `${num(flow.no_number)} had no number`, w: pctOf(messaged, left), tone: 'info' },
    { label: 'Opened the link', value: num(flow.opened), note: `${pctOf(flow.opened, messaged)}% of messaged`, w: pctOf(flow.opened, left), tone: 'accent' },
    { label: 'Ordered', value: num(flow.ordered), note: `${pctOf(flow.ordered, messaged)}% of messaged`, w: pctOf(flow.ordered, left), tone: 'success' },
    { label: 'Sales recovered', value: inr(flow.sales), note: rules?.coupon ? `after ${rules.coupon} discount` : 'from recovered carts', w: Number(flow.sales) > 0 ? 100 : 0, tone: 'success' },
  ];

  async function sendNow(row) {
    setSendingId(row.id);
    try {
      const { data: res } = await adminApi.post(`${API}/${row.id}/send-now`);
      if (res && res.success === false) throw new Error(res.message || 'Not sent');
      showSuccess('messageSent', `Reminder sent to ${row.name || 'the shopper'}`);
      load();
    } catch (e) {
      showError('sendFailed', errText(e, 'Could not send the reminder.'));
    } finally {
      setSendingId(null);
    }
  }

  function startEdit() {
    setDraft({
      waitHours: rules?.waitHours ?? 1,
      quietStart: toHHMM(rules?.quietStart) || '21:00',
      quietEnd: toHHMM(rules?.quietEnd) || '09:00',
      coupon: rules?.coupon || '',
      minValue: rules?.minValue ?? 0,
      winbackCoupon: rules?.winbackCoupon || 'CART10',
    });
    setEditRules(true);
  }

  async function saveRules(e) {
    e.preventDefault();
    const wait = Number(draft.waitHours);
    const min = Number(draft.minValue);
    if (!Number.isFinite(wait) || wait < 0 || wait > 72) { showError('fieldRequired', 'Wait time must be between 0 and 72 hours.'); return; }
    if (!Number.isFinite(min) || min < 0) { showError('fieldRequired', 'Minimum cart value can’t be negative.'); return; }
    const body = {
      waitHours: wait,
      quietStart: fromHHMM(draft.quietStart, rules?.quietStart),
      quietEnd: fromHHMM(draft.quietEnd, rules?.quietEnd),
      coupon: String(draft.coupon || '').trim().toUpperCase(),
      minValue: min,
      winbackCoupon: String(draft.winbackCoupon || '').trim().toUpperCase() || 'CART10',
    };
    setSavingRules(true);
    try {
      const { data: res } = await adminApi.put(`${API}/rules`, body);
      if (res && res.success === false) throw new Error(res.message || 'Not saved');
      setData((d) => ({ ...(d || {}), rules: res?.rules || body }));
      setEditRules(false);
      showSuccess('saved', 'Cart rules saved');
    } catch (err) {
      showError('saveFailed', errText(err, 'Could not save the rules.'));
    } finally {
      setSavingRules(false);
    }
  }

  function action(r) {
    if (r.wa === 'wait') {
      if (!isAdmin) return <span className="wpb-faint">—</span>;
      return (
        <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" disabled={sendingId === r.id} onClick={() => sendNow(r)}>
          {sendingId === r.id ? 'Sending…' : 'Send now'}
        </button>
      );
    }
    if (r.wa === 'won' && r.order_number) {
      return <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => openOrder(r.order_number)}>Open order</button>;
    }
    if ((r.wa === 'sent' || r.wa === 'clicked' || r.wa === 'won') && r.conversation_id && goTo) {
      return <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => goTo('inbox', { conversationId: r.conversation_id })}>Open chat</button>;
    }
    return <span className="wpb-faint">—</span>;
  }

  return (
    <div className="wpb-page">
      <header className="wpb-head">
        <div className="wpb-head-text">
          <h1 className="wpb-title">Abandoned carts</h1>
          <p className="wpb-sub">
            Shoppers who added items and left. They get one WhatsApp {rules ? `${waitLabel(rules.waitHours)} later` : 'a little later'} with a link that reopens the same cart.
          </p>
        </div>
        <div className="wpb-chips" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" aria-pressed={days === p.key}
              className={`wpb-chip${days === p.key ? ' is-on' : ''}`} onClick={() => setDays(p.key)}>{p.label}</button>
          ))}
        </div>
      </header>

      <section className={`wpb-card wpb-flow${loading && data ? ' is-stale' : ''}`} aria-label="Recovery flow" aria-busy={loading}>
        {flowItems.map((f) => (
          <div key={f.label} className="wpb-flow-item">
            <span className="wpb-eyebrow">{f.label}</span>
            <span className="wpb-flow-v">{loading && !data ? <span className="wpb-skel-inline" /> : f.value}</span>
            <div className="wpb-track"><div className={`wpb-fill t-${f.tone}`} style={{ width: `${loading && !data ? 0 : f.w}%` }} /></div>
            <span className="wpb-flow-note">{loading && !data ? ' ' : f.note}</span>
          </div>
        ))}
      </section>

      <div className="wpb-bar-row">
        <div className="wpb-chips" role="tablist" aria-label="Status">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`wpb-chip${tab === t.key ? ' is-on' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}{counts && counts[t.key] !== undefined && <span className="wpb-chip-n">{num(counts[t.key])}</span>}
            </button>
          ))}
        </div>
        <span className="wpb-hint">No phone number = can’t message. Those show as “No number”.</span>
      </div>

      <section className="wpb-card wpb-card--flush" aria-busy={loading}>
        {error ? (
          <div className="wpb-state wpb-state--error" role="alert">
            <b>Couldn’t load abandoned carts</b>
            <span>{error}</span>
            <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={load}>
              <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} /> Try again
            </button>
          </div>
        ) : loading && rows.length === 0 ? (
          // First load, or a tab with nothing cached yet: header + placeholder rows.
          <div className="wpb-tbl-wrap" role="status">
            <span className="wpb-sr">Loading carts…</span>
            <table className="wpb-tbl wpb-tbl--carts" aria-hidden="true">
              {TABLE_HEAD}
              <tbody><SkeletonTableRows rows={6} cols={7} /></tbody>
            </table>
          </div>
        ) : rows.length === 0 ? (
          <div className="wpb-state">
            <b>No carts here</b>
            <span>{tab === 'all' ? 'No one left a cart in this period.' : 'Nothing matches this filter for the period. Try “All” or a longer period.'}</span>
          </div>
        ) : (
          <div className={`wpb-tbl-wrap${loading ? ' is-stale' : ''}`}>
            <table className="wpb-tbl wpb-tbl--carts">
              {TABLE_HEAD}
              <tbody>
                {rows.map((r) => {
                  const wa = WA[r.wa] || { label: r.wa || '—', tone: 'muted' };
                  return (
                    <tr key={r.id}>
                      <td>
                        <b className="wpb-strong">{r.name || 'Guest shopper'}</b>
                        <div className="wpb-cell-sub">{[r.phone_masked || '—', r.brand].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="wpb-wrap">{r.items_label || '—'}</td>
                      <td className="r"><b className="wpb-strong">{inr(r.value)}</b></td>
                      <td className="wpb-nowrap">{ago(r.left_at)}</td>
                      <td><span className={`wpb-badge t-${wa.tone}`}>{r.wa === 'wait' ? sendsAt(r.wa_send_at) : wa.label}</span></td>
                      <td className="wpb-wrap">{r.result || '—'}</td>
                      <td className="r">{action(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="wpb-card wpb-rules">
        {!editRules ? (
          <>
            <div className="wpb-rules-text">
              <b>Rules</b>
              {rules ? (
                <span>
                  Wait <b>{waitLabel(rules.waitHours)}</b> · one message per cart
                  {toHHMM(rules.quietStart) && toHHMM(rules.quietEnd) && <> · not between <b>{niceClock(rules.quietStart)}</b> and <b>{niceClock(rules.quietEnd)}</b></>}
                  {rules.coupon ? <> · code <b>{rules.coupon}</b></> : <> · no discount code</>}
                  {Number(rules.minValue) > 0 && <> · skip carts under <b>{inr(rules.minValue)}</b></>}
                  {' '}· win-back code <b>{rules.winbackCoupon || 'CART10'}</b> (all stores)
                </span>
              ) : (
                loading ? <Skeleton w="min(420px, 70%)" h={12} /> : <span>Rules not available.</span>
              )}
            </div>
            {isAdmin && (
              <button type="button" className="wpb-btn wpb-btn--ghost" onClick={startEdit} disabled={!data}>Change rules</button>
            )}
          </>
        ) : (
          <form className="wpb-rules-form" onSubmit={saveRules}>
            <b>Change rules</b>
            <div className="wpb-form-grid">
              <label className="wpb-field">Wait before messaging (hours)
                <input className="wpb-input" type="number" min="0" max="72" step="0.25" inputMode="decimal"
                  value={draft.waitHours} onChange={(e) => setDraft((d) => ({ ...d, waitHours: e.target.value }))} />
              </label>
              <label className="wpb-field">Don’t send from
                <input className="wpb-input" type="time" value={draft.quietStart} onChange={(e) => setDraft((d) => ({ ...d, quietStart: e.target.value }))} />
              </label>
              <label className="wpb-field">…until
                <input className="wpb-input" type="time" value={draft.quietEnd} onChange={(e) => setDraft((d) => ({ ...d, quietEnd: e.target.value }))} />
              </label>
              <label className="wpb-field">Discount code (optional)
                <input className="wpb-input wpb-mono" value={draft.coupon} maxLength={30} placeholder="CART10"
                  onChange={(e) => setDraft((d) => ({ ...d, coupon: e.target.value.toUpperCase() }))} />
              </label>
              <label className="wpb-field">Win-back code — all stores
                <input className="wpb-input wpb-mono" value={draft.winbackCoupon} maxLength={30} placeholder="CART10"
                  onChange={(e) => setDraft((d) => ({ ...d, winbackCoupon: e.target.value.toUpperCase() }))} />
              </label>
              <label className="wpb-field">Skip carts under (₹)
                <input className="wpb-input" type="number" min="0" step="1" inputMode="numeric"
                  value={draft.minValue} onChange={(e) => setDraft((d) => ({ ...d, minValue: e.target.value }))} />
              </label>
            </div>
            <span className="wpb-hint">Each cart gets one message only. Times are India time. The win-back code is sent 30 days after a customer’s last order; each store needs an active coupon with that code (Growth → Coupons).</span>
            <div className="wpb-actions">
              <button type="submit" className="wpb-btn" disabled={savingRules}>{savingRules ? 'Saving…' : 'Save rules'}</button>
              <button type="button" className="wpb-btn wpb-btn--ghost" onClick={() => setEditRules(false)} disabled={savingRules}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
