import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, Alert02Icon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { showError, showSuccess } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   Automatic messages — every message the stores send by themselves,
   whether its WhatsApp template is approved, what it achieved in the
   chosen period, and an on/off switch per message (admins only).

   GET  /api/whatsapp/automations?days=7|30[&brandId=]
        → { summary:{ sent, delivered, read, acted, sales },
            groups:[{ key, title, sub, rows:[{ key, name, desc, when, template,
              templateStatus, enabled, sent, read, result }] }] }
   PUT  /api/whatsapp/automations/:key { enabled }   (admin)
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp';
const PERIODS = [{ days: 7, label: '7 days' }, { days: 30, label: '30 days' }];

const toNum = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const num = (v) => (toNum(v) === null ? '—' : toNum(v).toLocaleString('en-IN'));
const inr = (v) => (toNum(v) === null ? '—' : `₹${Math.round(toNum(v)).toLocaleString('en-IN')}`);
const pctOf = (part, whole) => {
  const p = toNum(part); const w = toNum(whole);
  if (p === null || !w) return null;
  return Math.round((p / w) * 1000) / 10;
};
const fmtPct = (v) => (v === null || v === undefined ? '—' : `${v}%`);
const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const TPL_STATUS = {
  approved: { label: 'Approved', cls: 'ok' },
  pending: { label: 'Waiting for WhatsApp', cls: 'wait' },
  rejected: { label: 'Rejected by WhatsApp', cls: 'bad' },
  missing: { label: 'Not set up', cls: 'bad' },
};
const normStatus = (s) => {
  const k = String(s || '').toLowerCase();
  if (k === 'approved') return 'approved';
  if (k === 'pending' || k === 'in_appeal' || k === 'pending_deletion') return 'pending';
  if (k === 'rejected' || k === 'disabled' || k === 'paused') return 'rejected';
  return 'missing';
};
const blockedReason = (st) => (st === 'pending' ? 'is waiting for WhatsApp approval'
  : st === 'rejected' ? 'was rejected by WhatsApp' : "isn't set up");

// Read column: backend may send a count (preferred) or a ready string like "88%".
const readCell = (row) => {
  if (typeof row.read === 'string' && row.read.trim() && toNum(row.read) === null) return row.read;
  const sent = toNum(row.sent);
  const read = toNum(row.read);
  if (read === null) return '—';
  if (!sent) return num(read);
  const p = pctOf(read, sent);
  return p === null ? num(read) : `${Math.round(p)}%`;
};

function Switch({ on, disabled, busy, label, title, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on ? 'true' : 'false'}
      aria-label={label}
      title={title}
      disabled={disabled}
      className={`wpa-switch${busy ? ' wpa-switch--busy' : ''}`}
      onClick={onToggle}
    />
  );
}

function SkeletonTable() {
  return (
    <div className="wpa-card" aria-busy="true" aria-label="Loading automatic messages">
      <div className="wpa-skel-list">
        {[70, 92, 84, 60, 88].map((w, i) => <span key={i} className="wpa-skel" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  );
}

export default function AutomationsPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKeys, setBusyKeys] = useState(() => new Set());
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setLoading(true); setError('');
    try {
      const params = { days };
      if (brandId) params.brandId = brandId;
      const res = await adminApi.get(`${API}/automations`, { params });
      if (id !== reqRef.current) return;
      const body = res.data || {};
      if (body.success === false) throw new Error(body.message || 'Could not load automatic messages');
      setData({ summary: body.summary || {}, groups: Array.isArray(body.groups) ? body.groups : [] });
    } catch (e) {
      if (id !== reqRef.current) return;
      setError(errMsg(e, 'Could not load automatic messages'));
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, [days, brandId]);

  useEffect(() => { load(); }, [load]);

  const setRowEnabled = (key, enabled) => setData((prev) => (prev ? {
    ...prev,
    groups: prev.groups.map((g) => ({ ...g, rows: (g.rows || []).map((r) => (r.key === key ? { ...r, enabled } : r)) })),
  } : prev));

  const toggle = async (row) => {
    if (!isAdmin || busyKeys.has(row.key)) return;
    const next = !row.enabled;
    setRowEnabled(row.key, next); // optimistic
    setBusyKeys((s) => new Set(s).add(row.key));
    try {
      const res = await adminApi.put(`${API}/automations/${encodeURIComponent(row.key)}`, { enabled: next });
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'Could not save');
      showSuccess('saved', `“${row.name}” is now ${next ? 'on' : 'off'}.`);
    } catch (e) {
      setRowEnabled(row.key, !next); // roll back
      showError('saveFailed', `Couldn't switch “${row.name}” ${next ? 'on' : 'off'}: ${errMsg(e, 'please try again')}`);
    } finally {
      setBusyKeys((s) => { const n = new Set(s); n.delete(row.key); return n; });
    }
  };

  const blocked = useMemo(() => {
    if (!data) return [];
    const out = [];
    data.groups.forEach((g) => (g.rows || []).forEach((r) => {
      const st = normStatus(r.templateStatus);
      if (st !== 'approved') out.push({ name: r.name, st });
    }));
    return out;
  }, [data]);

  const s = data?.summary || {};
  const deliveredPct = pctOf(s.delivered, s.sent);
  const readPct = pctOf(s.read, s.sent);
  const periodLabel = `${days} days`;
  const brandName = brandId ? (brands.find((b) => String(b.id) === String(brandId))?.name || '') : '';

  const blockedText = () => {
    const shown = blocked.slice(0, 3).map((b) => `“${b.name}” ${blockedReason(b.st)}`);
    const more = blocked.length > 3 ? ` and ${blocked.length - 3} more` : '';
    return `${shown.join(', ')}${more}.`;
  };

  return (
    <div className="wpa-page">
      <header className="wpa-head">
        <div className="wpa-head-text">
          <h1 className="wpa-title">Automatic messages</h1>
          <p className="wpa-sub">
            Every message the stores send by themselves, whether WhatsApp has approved its template, and what it
            achieved in the last {periodLabel}{brandName ? ` for ${brandName}` : ''}.
          </p>
        </div>
        <div className="wpa-head-actions">
          <div className="wpa-tabs" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p.days} type="button" className="wpa-chip" aria-pressed={days === p.days ? 'true' : 'false'}
                onClick={() => setDays(p.days)}>
                Last {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="wpa-btn wpa-btn--sm" onClick={load} disabled={loading} aria-label="Refresh">
            <HugeiconsIcon icon={RefreshIcon} size={15} strokeWidth={2} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="rep-kpis wpa-kpis" aria-label={`Last ${periodLabel}`}>
        <div className="rep-kpi">
          <div className="rep-kl">Sent · {periodLabel}</div>
          <div className="rep-kv num">{loading && !data ? <span className="wpa-skel" style={{ width: 70 }} /> : num(s.sent)}</div>
          <div className="rep-kf">{deliveredPct === null ? 'Delivered: —' : `${deliveredPct}% delivered`}</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kl">Read</div>
          <div className="rep-kv num">{loading && !data ? <span className="wpa-skel" style={{ width: 60 }} /> : fmtPct(readPct === null ? null : Math.round(readPct))}</div>
          <div className="rep-kf">{num(s.read)} opened</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kl">Customers acted</div>
          <div className="rep-kv num">{loading && !data ? <span className="wpa-skel" style={{ width: 50 }} /> : num(s.acted)}</div>
          <div className="rep-kf">confirmed, chose an option or bought</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kl">Sales from WhatsApp</div>
          <div className="rep-kv num">{loading && !data ? <span className="wpa-skel" style={{ width: 90 }} /> : inr(s.sales)}</div>
          <div className="rep-kf">recovered carts, alerts, win-back</div>
        </div>
      </section>

      {blocked.length > 0 && (
        <section className="wpa-banner" role="status">
          <span className="wpa-banner-text">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            <b>{blocked.length} message{blocked.length === 1 ? " can't" : "s can't"} send yet:</b> {blockedText()}
          </span>
          {typeof goTo === 'function' && (
            <button type="button" className="wpa-btn wpa-btn--primary" onClick={() => goTo('templates')}>
              Set up missing templates
            </button>
          )}
        </section>
      )}

      {!isAdmin && data && (
        <p className="wpa-note">Only admins can switch automatic messages on or off.</p>
      )}

      {error && (
        <div className="wpa-card">
          <div className="wpa-state wpa-state--error" role="alert">
            <span>Couldn't load automatic messages. {error}</span>
            <button type="button" className="wpa-btn wpa-btn--sm" onClick={load}>Try again</button>
          </div>
        </div>
      )}

      {!error && loading && !data && <SkeletonTable />}

      {!error && data && data.groups.length === 0 && (
        <div className="wpa-card">
          <div className="wpa-state">
            <b>No automatic messages found.</b>
            <span>Once the store starts sending order updates on WhatsApp, they will show up here.</span>
          </div>
        </div>
      )}

      {!error && data && data.groups.map((g) => (
        <section key={g.key || g.title} className="wpa-card" aria-label={g.title}>
          <h2 className="wpa-card-title">{g.title}{g.sub ? <small> · {g.sub}</small> : null}</h2>
          <div className="wpa-scroll">
            <table className="wpa-tbl">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Message</th>
                  <th>Sent when</th>
                  <th>Template</th>
                  <th className="r">Sent</th>
                  <th className="r">Read</th>
                  <th>Result</th>
                  <th className="r">On</th>
                </tr>
              </thead>
              <tbody>
                {(g.rows || []).length === 0 && (
                  <tr><td colSpan={7} className="wpa-cell-soft">Nothing in this group yet.</td></tr>
                )}
                {(g.rows || []).map((r) => {
                  const st = normStatus(r.templateStatus);
                  const meta = TPL_STATUS[st];
                  const busy = busyKeys.has(r.key);
                  const on = !!r.enabled;
                  return (
                    <tr key={r.key}>
                      <td>
                        <span className="wpa-cell-name">{r.name}</span>
                        {r.desc && <div className="wpa-cell-sub">{r.desc}</div>}
                      </td>
                      <td className="wpa-cell-soft">{r.when || '—'}</td>
                      <td>
                        <span className={`wpa-pill wpa-pill--${meta.cls}`}>{meta.label}</span>
                        {r.template && <div className="wpa-cell-sub" style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 11 }}>{r.template}</div>}
                      </td>
                      <td className="r">{num(r.sent)}</td>
                      <td className="r">{readCell(r)}</td>
                      <td className="wpa-cell-soft">
                        {r.result || (st === 'approved' ? '—' : st === 'pending' ? 'Starts when WhatsApp approves it' : 'Template not ready yet')}
                      </td>
                      <td className="r">
                        <Switch
                          on={on}
                          busy={busy}
                          disabled={!isAdmin || busy}
                          label={`${r.name}: ${on ? 'on' : 'off'}`}
                          title={!isAdmin ? 'Only admins can change this' : (st !== 'approved' && !on ? "Won't send until the template is approved" : undefined)}
                          onToggle={() => toggle(r)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
