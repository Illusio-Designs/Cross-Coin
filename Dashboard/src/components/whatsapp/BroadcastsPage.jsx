import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, Add01Icon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { showError, showSuccess } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   Broadcasts — one template message to many customers.

   GET  /api/whatsapp/broadcasts[?brandId=]
        → { broadcasts:[{ id, brand_id, name, template_name, audience_filter,
              audience_label, status, total_recipients, sent_count, failed_count,
              delivered, read, orders, sales, scheduled_at, started_at,
              completed_at, createdAt }] }
   PUT  /api/whatsapp/broadcasts/:id/cancel        (scheduled ones)
   POST /api/whatsapp/broadcasts/:id/run           (admin, old drafts only)
   The 30-day tiles are computed here from the rows.
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp';
const DAY = 24 * 60 * 60 * 1000;

const toNum = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const num = (v) => (toNum(v) === null ? '—' : toNum(v).toLocaleString('en-IN'));
const inr = (v) => `₹${Math.round(toNum(v) || 0).toLocaleString('en-IN')}`;
const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const parseDate = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
const fmtWhen = (v) => {
  const d = parseDate(v);
  if (!d) return '';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

// Every backend status folds into one of the page's buckets.
const STATUS = {
  scheduled: { label: 'Scheduled', cls: 'info' },
  sending: { label: 'Sending', cls: 'ok' },
  sent: { label: 'Sent', cls: 'none' },
  stopped: { label: 'Stopped', cls: 'bad' },
  cancelled: { label: 'Cancelled', cls: 'none' },
  draft: { label: 'Not started', cls: 'wait' },
};
const bucketOf = (b) => {
  const s = String(b.status || '').toLowerCase();
  if (s === 'running' || s === 'sending' || s === 'in_progress') return 'sending';
  if (s === 'done' || s === 'completed' || s === 'sent' || s === 'finished') return 'sent';
  if (s === 'failed' || s === 'error' || s === 'paused' || s === 'stopped') return 'stopped';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'scheduled') return 'scheduled';
  // Old rows: a draft with a future time is effectively scheduled.
  if (s === 'draft' || s === 'pending' || !s) {
    const at = parseDate(b.scheduled_at);
    return at ? 'scheduled' : 'draft';
  }
  return 'draft';
};
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'sending', label: 'Sending' },
  { key: 'sent', label: 'Sent' },
  { key: 'stopped', label: 'Stopped' },
];
const inTab = (tab, bucket) => tab === 'all' || bucket === tab || (tab === 'stopped' && bucket === 'cancelled') || (tab === 'scheduled' && bucket === 'draft');

const audienceText = (b) => {
  if (b.audience_label) return b.audience_label;
  try {
    const f = typeof b.audience_filter === 'string' ? JSON.parse(b.audience_filter) : b.audience_filter;
    const t = f?.type || f?.audience?.type;
    const MAP = {
      all: 'Everyone who can get messages', buyers_90: 'Bought in the last 90 days', delivered_happy: 'Happy customers',
      cart_7d: 'Left a cart this week', lapsed_60: 'Haven’t ordered in 60+ days',
    };
    if (t && MAP[t]) return MAP[t];
  } catch { /* not JSON */ }
  return 'Everyone who can get messages';
};

function whenText(b, bucket) {
  if (bucket === 'scheduled') return b.scheduled_at ? fmtWhen(b.scheduled_at) : '';
  if (bucket === 'sending') {
    const total = toNum(b.total_recipients);
    const done = (toNum(b.sent_count) || 0) + (toNum(b.failed_count) || 0);
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : null;
    return `Started ${fmtWhen(b.started_at) || ''}${pct !== null ? ` · ${pct}% done` : ''}`.trim();
  }
  if (bucket === 'sent') return fmtWhen(b.completed_at || b.started_at);
  if (bucket === 'stopped') {
    const f = toNum(b.failed_count);
    return `${fmtWhen(b.started_at || b.createdAt || b.created_at)}${f ? ` · ${num(f)} failed` : ''}`;
  }
  if (bucket === 'cancelled') return fmtWhen(b.updatedAt || b.scheduled_at);
  return `Created ${fmtWhen(b.createdAt || b.created_at)}`;
}

export default function BroadcastsPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [confirm, setConfirm] = useState(null); // { id, kind: 'cancel' | 'run' }
  const [busyId, setBusyId] = useState(null);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setLoading(true); setError('');
    try {
      const params = {};
      if (brandId) params.brandId = brandId;
      const res = await adminApi.get(`${API}/broadcasts`, { params });
      if (id !== reqRef.current) return;
      const body = res.data || {};
      if (body.success === false) throw new Error(body.message || 'Could not load broadcasts');
      setRows(Array.isArray(body.broadcasts) ? body.broadcasts : []);
    } catch (e) {
      if (id !== reqRef.current) return;
      setError(errMsg(e, 'Could not load broadcasts'));
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const brandName = useCallback((bid) => {
    if (bid === null || bid === undefined || bid === '') return 'All brands';
    return brands.find((b) => String(b.id) === String(bid))?.name || `Brand ${bid}`;
  }, [brands]);

  const enriched = useMemo(() => (rows || []).map((b) => ({ ...b, _bucket: bucketOf(b) })), [rows]);

  const counts = useMemo(() => {
    const c = {};
    TABS.forEach((t) => { c[t.key] = enriched.filter((b) => inTab(t.key, b._bucket)).length; });
    return c;
  }, [enriched]);

  const summary = useMemo(() => {
    const since = Date.now() - 30 * DAY;
    const recent = enriched.filter((b) => {
      if (b._bucket === 'scheduled' || b._bucket === 'cancelled' || b._bucket === 'draft') return false;
      const d = parseDate(b.started_at || b.completed_at || b.createdAt || b.created_at);
      return d && d.getTime() >= since;
    });
    const sum = (k) => recent.reduce((a, b) => a + (toNum(b[k]) || 0), 0);
    const hasField = (k) => recent.some((b) => toNum(b[k]) !== null);
    return {
      count: recent.length,
      sent: sum('sent_count'),
      failed: sum('failed_count'),
      delivered: hasField('delivered') ? sum('delivered') : null,
      read: hasField('read') ? sum('read') : null,
      orders: hasField('orders') ? sum('orders') : null,
      sales: hasField('sales') ? sum('sales') : null,
    };
  }, [enriched]);

  const visible = enriched.filter((b) => inTab(tab, b._bucket));

  const doCancel = async (b) => {
    setBusyId(b.id);
    try {
      const res = await adminApi.put(`${API}/broadcasts/${b.id}/cancel`);
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'Could not cancel');
      showSuccess('saved', `“${b.name}” was cancelled. Nobody will get it.`);
      setConfirm(null);
      setRows((prev) => (prev || []).map((x) => (x.id === b.id ? { ...x, status: 'cancelled' } : x)));
      load();
    } catch (e) {
      showError('saveFailed', `Couldn't cancel: ${errMsg(e, 'please try again')}`);
    } finally {
      setBusyId(null);
    }
  };

  const doRun = async (b) => {
    setBusyId(b.id);
    try {
      const res = await adminApi.post(`${API}/broadcasts/${b.id}/run`);
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'Could not start');
      showSuccess('saved', `“${b.name}” has started sending.`);
      setConfirm(null);
      load();
    } catch (e) {
      showError('sendFailed', `Couldn't start: ${errMsg(e, 'please try again')}`);
    } finally {
      setBusyId(null);
    }
  };

  const readPct = summary.read !== null && summary.delivered ? Math.round((summary.read / summary.delivered) * 100) : null;
  const failPct = summary.sent + summary.failed > 0 ? Math.round((summary.failed / (summary.sent + summary.failed)) * 1000) / 10 : null;
  const first = loading && !rows;

  const actionCell = (b) => {
    const bucket = b._bucket;
    const busy = busyId === b.id;
    if (confirm && confirm.id === b.id) {
      const isCancel = confirm.kind === 'cancel';
      return (
        <div className="wpa-confirm wpa-confirm--inline" role="alertdialog" aria-label={isCancel ? 'Confirm cancel' : 'Confirm start'}>
          <span>
            {isCancel
              ? 'Cancel this broadcast? Nobody will get it.'
              : `Send “${b.template_name}” to every customer in this audience now?`}
          </span>
          <div className="wpa-confirm-actions">
            <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setConfirm(null)} disabled={busy}>
              {isCancel ? 'Keep it' : 'Go back'}
            </button>
            <button type="button" className={`wpa-btn wpa-btn--sm ${isCancel ? 'wpa-btn--danger-solid' : 'wpa-btn--primary'}`}
              onClick={() => (isCancel ? doCancel(b) : doRun(b))} disabled={busy}>
              {busy ? 'Working…' : isCancel ? 'Yes, cancel' : 'Yes, send now'}
            </button>
          </div>
        </div>
      );
    }
    if (bucket === 'scheduled') {
      return (
        <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setConfirm({ id: b.id, kind: 'cancel' })}>
          Cancel
        </button>
      );
    }
    if (bucket === 'draft' && isAdmin) {
      return (
        <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setConfirm({ id: b.id, kind: 'run' })}>
          Start sending
        </button>
      );
    }
    return null;
  };

  return (
    <div className="wpa-page">
      <header className="wpa-head">
        <div className="wpa-head-text">
          <h1 className="wpa-title">Broadcasts</h1>
          <p className="wpa-sub">One message to many customers. Each row shows who got it, who read it and what it sold.</p>
        </div>
        <div className="wpa-head-actions">
          <button type="button" className="wpa-btn" onClick={load} disabled={loading} aria-label="Refresh">
            <HugeiconsIcon icon={RefreshIcon} size={15} strokeWidth={2} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {typeof goTo === 'function' && (
            <button type="button" className="wpa-btn wpa-btn--primary" onClick={() => goTo('broadcast-new')}>
              <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
              New broadcast
            </button>
          )}
        </div>
      </header>

      <section className="rep-kpis wpa-kpis" aria-label="Last 30 days">
        <div className="rep-kpi">
          <div className="rep-kl">Sent · 30 days</div>
          <div className="rep-kv num">{first ? <span className="wpa-skel" style={{ width: 70 }} /> : num(summary.sent)}</div>
          <div className="rep-kf">{summary.count} broadcast{summary.count === 1 ? '' : 's'}</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kl">Read</div>
          <div className="rep-kv num">{first ? <span className="wpa-skel" style={{ width: 50 }} /> : (readPct === null ? '—' : `${readPct}%`)}</div>
          <div className="rep-kf">{summary.delivered === null ? 'of delivered' : `of ${num(summary.delivered)} delivered`}</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kl">Orders within 3 days</div>
          <div className="rep-kv num">{first ? <span className="wpa-skel" style={{ width: 40 }} /> : num(summary.orders)}</div>
          <div className="rep-kf">{summary.sales === null ? 'sales —' : `${inr(summary.sales)} sales`}</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kl">Couldn't send</div>
          <div className="rep-kv num">{first ? <span className="wpa-skel" style={{ width: 40 }} /> : num(summary.failed)}</div>
          <div className="rep-kf">{failPct === null ? 'no messages yet' : `${failPct}% of messages`}</div>
        </div>
      </section>

      <div className="wpa-tabs" role="tablist" aria-label="Status">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" className="wpa-tab" aria-selected={tab === t.key ? 'true' : 'false'}
            onClick={() => { setTab(t.key); setConfirm(null); }}>
            {t.label} <span className="wpa-tab-n">{rows ? counts[t.key] : ''}</span>
          </button>
        ))}
      </div>

      <section className="wpa-card" aria-label="Broadcasts">
        {error ? (
          <div className="wpa-state wpa-state--error" role="alert">
            <span>Couldn't load broadcasts. {error}</span>
            <button type="button" className="wpa-btn wpa-btn--sm" onClick={load}>Try again</button>
          </div>
        ) : first ? (
          <div className="wpa-skel-list" aria-busy="true" aria-label="Loading broadcasts">
            {[80, 64, 90, 72].map((w, i) => <span key={i} className="wpa-skel" style={{ width: `${w}%` }} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="wpa-state">
            {enriched.length === 0 ? (
              <>
                <b>No broadcasts yet.</b>
                <span>Send one approved message to many customers at once — for a sale, a new drop or to win back quiet customers.</span>
                {typeof goTo === 'function' && (
                  <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--sm" onClick={() => goTo('broadcast-new')}>New broadcast</button>
                )}
              </>
            ) : (
              <span>No broadcasts in this tab.</span>
            )}
          </div>
        ) : (
          <div className="wpa-scroll">
            <table className="wpa-tbl wpa-tbl--mid" style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Broadcast</th>
                  <th>Who got it</th>
                  <th>Status</th>
                  <th className="r">Sent</th>
                  <th className="r">Delivered</th>
                  <th className="r">Read</th>
                  <th className="r">Orders · sales</th>
                  <th><span className="wpa-sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => {
                  const meta = STATUS[b._bucket];
                  const notYet = b._bucket === 'scheduled' || b._bucket === 'draft' || b._bucket === 'cancelled';
                  const total = toNum(b.total_recipients);
                  const orders = toNum(b.orders);
                  return (
                    <tr key={b.id}>
                      <td>
                        <span className="wpa-cell-name">{b.name}</span>
                        <div className="wpa-cell-sub">{b.template_name} · {brandName(b.brand_id)}</div>
                      </td>
                      <td className="wpa-cell-soft">
                        {audienceText(b)}{total ? ` · ${num(total)}` : ''}
                      </td>
                      <td>
                        <span className={`wpa-pill wpa-pill--${meta.cls}`}>{meta.label}</span>
                        <div className="wpa-cell-sub">{whenText(b, b._bucket)}</div>
                      </td>
                      <td className="r">{notYet ? '—' : num(b.sent_count)}</td>
                      <td className="r">{notYet ? '—' : num(b.delivered)}</td>
                      <td className="r">{notYet ? '—' : num(b.read)}</td>
                      <td className="r">
                        <b>{notYet || orders === null ? '—' : `${num(orders)} · ${inr(b.sales)}`}</b>
                      </td>
                      <td className="r">{actionCell(b)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="wpa-note">
        “Orders” counts orders placed by a recipient within 3 days of the message. A scheduled broadcast can be cancelled until it starts.
      </p>
    </div>
  );
}
