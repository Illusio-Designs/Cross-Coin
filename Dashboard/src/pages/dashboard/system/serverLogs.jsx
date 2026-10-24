import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SkeletonKpis, SkeletonTableRows, Switch } from '../../../components/ui';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { serverLogsService } from '../../../services';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, SentIcon } from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   Server logs (Settings → Server logs, admins only). Server Watch.

   What the live server is doing, and what went wrong:
   · Open alerts: problems the watchdog found (checked every 10 min;
     also sent by email + WhatsApp, reminded hourly, "Resolved" after).
   · Tiles: requests, server errors, blocked requests, checkout,
     orders, response time, memory.
   · By store: each storefront's page loads, checkout, errors, orders
     (stores send X-Brand-Name). The store filter narrows everything.
   · Hour by hour: requests per group, errors, blocked, orders.
   · Logged problems: errors and blocked requests, grouped.
   · Settings tab: recipients, alert hours, alert levels, test alert.

   Data: GET /api/admin/system/server-logs (every 60 s),
   PUT …/server-logs/settings, POST …/server-logs/test.
   Times are shown in India time.
   ────────────────────────────────────────────────────────────── */

const TZ = 'Asia/Kolkata';
const HOUR = 3600 * 1000;
const RANGES = [{ h: 6, label: '6 h' }, { h: 24, label: '24 h' }, { h: 48, label: '2 days' }, { h: 168, label: '7 days' }];

// ── Formatting ──────────────────────────────────────────────────────
const istDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const clock = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
function when(d) {
  if (!d) return '—';
  const day = istDay(d);
  if (day === istDay(Date.now())) return `Today ${clock(d)}`;
  if (day === istDay(Date.now() - 24 * HOUR)) return `Yesterday ${clock(d)}`;
  return `${new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' })}, ${clock(d)}`;
}
function ago(d) {
  if (!d) return '—';
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
const num = (v) => (Number(v) || 0).toLocaleString('en-IN');
const secs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
// "2026-10-24 10:00:00" (an India-time hour, from the server) → epoch ms
const istHour = (s) => new Date(`${String(s).replace(' ', 'T')}+05:30`).getTime();
const IST_MS = 330 * 60 * 1000;

const SEVERITY = { high: { label: 'Urgent', tone: 'bad' }, medium: { label: 'Warning', tone: 'warn' }, low: { label: 'Check', tone: 'info' } };
const LEVEL = { error: { label: 'Error', tone: 'bad' }, warn: { label: 'Blocked', tone: 'warn' }, info: { label: 'Info', tone: 'muted' } };
const GROUPS = [
  { key: 'visit', label: 'Page loads' },
  { key: 'store', label: 'Store API' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'login', label: 'Login' },
  { key: 'admin', label: 'Admin' },
  { key: 'webhook', label: 'Webhooks' },
];

function Pill({ tone, children }) {
  return <span className={`sh-pill sh-pill--${tone}`}>{children}</span>;
}

function Tile({ label, value, tone, note }) {
  return (
    <div className="rep-kpi sh-tile">
      <div className="rep-kl">{label}</div>
      <div className="sh-tile-v"><span className={`sh-dot sh-dot--${tone}`} aria-hidden="true" />{value}</div>
      <div className="rep-kf">{note}</div>
    </div>
  );
}

function tilesFrom(d) {
  const k = d.kpis;
  const r = d.settings.rules;
  const avgTone = k.avg_ms_1h >= r.slowMs ? 'bad' : k.avg_ms_1h >= r.slowMs / 2 ? 'warn' : 'ok';
  const lastOrderAge = k.last_order_at ? Date.now() - new Date(k.last_order_at).getTime() : null;
  return [
    { label: 'Requests', value: num(k.requests_15m), tone: k.requests_15m ? 'ok' : 'muted', note: `last 15 min · ${num(k.requests_1h)} in the last hour` },
    { label: 'Server errors', value: `${k.error_pct_15m}%`, tone: k.error_pct_15m > r.errorPct ? 'bad' : k.error_pct_15m > 0 ? 'warn' : 'ok', note: 'of requests, last 15 min' },
    { label: 'Blocked', value: num(k.blocked_15m), tone: k.blocked_15m >= r.blockedCount ? 'bad' : k.blocked_15m > 0 ? 'warn' : 'ok', note: 'rate-limited or CORS, last 15 min' },
    { label: 'Checkout', value: k.checkout_1h ? `${k.checkout_fail_pct_1h}% failed` : 'No tries', tone: !k.checkout_1h ? 'muted' : k.checkout_fail_pct_1h > r.checkoutFailPct ? 'bad' : k.checkout_fail_pct_1h > 0 ? 'warn' : 'ok', note: `${num(k.checkout_1h)} checkout requests, last hour` },
    { label: 'Orders', value: num(k.orders_1h), tone: lastOrderAge == null ? 'muted' : lastOrderAge > r.ordersStoppedHours * HOUR ? 'warn' : 'ok', note: `last hour · last order ${ago(k.last_order_at)}` },
    { label: 'Response time', value: k.requests_1h ? secs(k.avg_ms_1h) : '—', tone: k.requests_1h ? avgTone : 'muted', note: 'average, last hour' },
    { label: 'Memory', value: `${num(k.memory_mb)} MB`, tone: k.memory_mb >= r.memoryMb ? 'bad' : k.memory_mb >= r.memoryMb * 0.8 ? 'warn' : 'ok', note: `this server process · alert at ${num(r.memoryMb)} MB` },
  ];
}

// ── Overview pieces ─────────────────────────────────────────────────
function OpenAlerts({ alerts }) {
  const open = alerts.filter((a) => !a.resolved_at);
  if (!open.length) {
    return (
      <div className="sl-clear" role="status">
        <span className="sh-dot sh-dot--ok" aria-hidden="true" />
        <strong>All clear.</strong>
        <span>No open problems. The watchdog checks every 10 minutes.</span>
      </div>
    );
  }
  return (
    <section className="sl-alerts" aria-label="Open alerts">
      {open.map((a) => {
        const sv = SEVERITY[a.severity] || SEVERITY.medium;
        return (
          <div key={a.id} className={`sl-alert sl-alert--${sv.tone}`}>
            <div className="sl-alert-top">
              <Pill tone={sv.tone}>{sv.label}</Pill>
              <strong>{a.title}</strong>
              <span className="sh-small">since {when(a.opened_at)} · {a.notified_count ? `alert sent ${a.notified_count}×, last ${ago(a.last_notified_at)}` : 'not sent yet (outside alert hours)'}</span>
            </div>
            <div className="sl-alert-d">{a.detail}</div>
          </div>
        );
      })}
    </section>
  );
}

function HourTable({ data, hours }) {
  const rows = useMemo(() => {
    const byHour = new Map();
    const at = (t) => {
      if (!byHour.has(t)) byHour.set(t, { t, total: 0, fail5xx: 0, blocked: 0, dur: 0, orders: 0, g: {} });
      return byHour.get(t);
    };
    for (const s of data.series) {
      const r = at(istHour(s.hour));
      r.total += s.requests; r.fail5xx += s.fail5xx; r.blocked += s.blocked; r.dur += s.dur_sum;
      r.g[s.grp] = (r.g[s.grp] || 0) + s.requests;
    }
    for (const o of data.orders_by_hour) at(istHour(o.hour)).orders += o.n;
    // Every hour in the range, newest first, so quiet hours show as zero.
    const now = Date.now();
    const top = now - ((now + IST_MS) % HOUR); // start of this India-time hour
    const out = [];
    for (let t = top; t > now - hours * HOUR; t -= HOUR) out.push(byHour.get(t) || { t, total: 0, fail5xx: 0, blocked: 0, dur: 0, orders: 0, g: {} });
    return out;
  }, [data, hours]);
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className="rep-tbl-wrap sl-hours-wrap">
      <table className="rep-table sl-hours">
        <thead>
          <tr>
            <th>Hour</th><th>Requests</th>
            {GROUPS.map((g) => <th key={g.key} className="num">{g.label}</th>)}
            <th className="num">Orders</th><th className="num">Errors</th><th className="num">Blocked</th><th className="num">Avg time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.t}>
              <td className="sl-hour">{when(r.t)}</td>
              <td className="sl-barcell">
                <span className="sl-bar" aria-hidden="true"><span style={{ width: `${(r.total / max) * 100}%` }} /></span>
                <span className="sl-barnum">{num(r.total)}</span>
              </td>
              {GROUPS.map((g) => <td key={g.key} className="num mut">{r.g[g.key] ? num(r.g[g.key]) : '·'}</td>)}
              <td className="num">{r.orders ? <strong>{num(r.orders)}</strong> : <span className="mut">0</span>}</td>
              <td className={`num${r.fail5xx ? ' sl-bad' : ' mut'}`}>{num(r.fail5xx)}</td>
              <td className={`num${r.blocked ? ' sl-warn' : ' mut'}`}>{num(r.blocked)}</td>
              <td className="num mut">{r.total ? secs(r.dur / r.total) : '·'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StoresTable({ stores, onPick }) {
  if (!stores.length) return <div className="rep-state">No store traffic in this time range.</div>;
  return (
    <div className="rep-tbl-wrap">
      <table className="rep-table sl-events">
        <thead>
          <tr><th>Store</th><th className="num">Page loads</th><th className="num">Checkout tries</th><th className="num">Checkout failed</th><th className="num">Orders</th><th>Last order</th><th className="num">Server errors</th><th className="num">Blocked</th></tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.brand || '-'}>
              <td>
                {s.brand && s.brand !== 'other'
                  ? <button type="button" className="sl-link" onClick={() => onPick(s.brand)}>{s.name}</button>
                  : <span className="mut">{s.name}</span>}
              </td>
              <td className="num">{num(s.visits)}</td>
              <td className="num">{num(s.checkout)}</td>
              <td className={`num${s.checkout_failed ? ' sl-bad' : ' mut'}`}>{num(s.checkout_failed)}</td>
              <td className="num">{s.orders ? <strong>{num(s.orders)}</strong> : <span className={s.visits >= 30 ? 'sl-warn' : 'mut'}>0</span>}</td>
              <td className="sl-hour mut">{s.last_order_at ? ago(s.last_order_at) : '—'}</td>
              <td className={`num${s.fail5xx ? ' sl-bad' : ' mut'}`}>{num(s.fail5xx)}</td>
              <td className={`num${s.blocked ? ' sl-warn' : ' mut'}`}>{num(s.blocked)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsTable({ events }) {
  if (!events.length) return <div className="rep-state">Nothing logged in this time range.</div>;
  return (
    <div className="rep-tbl-wrap">
      <table className="rep-table sl-events">
        <thead><tr><th>Last seen</th><th>Type</th><th>What happened</th><th className="num">Times</th><th>First seen</th></tr></thead>
        <tbody>
          {events.map((e) => {
            const lv = LEVEL[e.level] || LEVEL.info;
            return (
              <tr key={e.sig}>
                <td className="sl-hour">{when(e.last_at)}</td>
                <td><Pill tone={lv.tone}>{e.kind === 'restart' ? 'Restart' : e.kind === 'cors' ? 'CORS' : e.kind === 'ratelimit' ? 'Rate limit' : lv.label}</Pill></td>
                <td className="sl-what">
                  <div>{e.message}</div>
                  {(e.path || e.brand) && <div className="sh-small">{[e.brand_name, e.method && e.path ? `${e.method} ${e.path}` : e.path].filter(Boolean).join(' · ')}</div>}
                </td>
                <td className="num"><strong>{num(e.count)}</strong></td>
                <td className="sl-hour mut">{when(e.first_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PastAlerts({ alerts }) {
  const past = alerts.filter((a) => a.resolved_at);
  if (!past.length) return <div className="rep-state">No alerts in the last 7 days.</div>;
  return (
    <div className="rep-tbl-wrap">
      <table className="rep-table sl-events">
        <thead><tr><th>Started</th><th>Alert</th><th>Resolved</th><th className="num">Sent</th></tr></thead>
        <tbody>
          {past.map((a) => {
            const sv = SEVERITY[a.severity] || SEVERITY.medium;
            return (
              <tr key={a.id}>
                <td className="sl-hour">{when(a.opened_at)}</td>
                <td className="sl-what"><div><Pill tone={sv.tone}>{sv.label}</Pill> <strong>{a.title}</strong></div><div className="sh-small">{a.detail}</div></td>
                <td className="sl-hour">{when(a.resolved_at)}</td>
                <td className="num">{a.notified_count}×</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Settings tab ────────────────────────────────────────────────────
const RULES = [
  { key: 'ordersStoppedHours', label: 'No orders for (hours)', help: 'Alert when no order comes in for this long…' },
  { key: 'ordersStoppedMinVisits', label: '…while page loads are at least', help: 'so quiet nights don’t alert. 0 hours turns this off.' },
  { key: 'checkoutFailPct', label: 'Checkout failures above (%)', help: 'in 30 minutes' },
  { key: 'checkoutMinRequests', label: 'Only after this many checkout tries', help: 'in those 30 minutes' },
  { key: 'errorPct', label: 'Server errors above (%)', help: 'of all requests in 15 minutes' },
  { key: 'errorMinRequests', label: 'Only after this many requests', help: 'in those 15 minutes' },
  { key: 'blockedCount', label: 'Blocked requests at least', help: 'rate-limited or CORS in 15 minutes. 0 turns this off.' },
  { key: 'slowMs', label: 'Slow: average above (ms)', help: '15 minutes. 0 turns this off.' },
  { key: 'memoryMb', label: 'Memory above (MB)', help: 'per server process. 0 turns this off.' },
  { key: 'courierQuietHours', label: 'No courier update for (hours)', help: '0 turns this off.' },
];
const hourLabel = (h) => (h === 0 ? '12 am' : h === 12 ? '12 pm' : h === 24 ? '12 am (next day)' : h < 12 ? `${h} am` : `${h - 12} pm`);

function SettingsTab({ data, onSaved }) {
  const [f, setF] = useState(() => ({ ...data.settings, emails: data.settings.emails.join(', '), whatsapp: data.settings.whatsapp.join(', '), rules: { ...data.settings.rules } }));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [test, setTest] = useState(null);
  const allDay = (f.hoursFrom === 0 && f.hoursTo === 24) || f.hoursFrom === f.hoursTo;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setRule = (k, v) => setF((s) => ({ ...s, rules: { ...s.rules, [k]: v } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const saved = await serverLogsService.saveSettings({ ...f, rules: Object.fromEntries(Object.entries(f.rules).map(([k, v]) => [k, Number(v)])) });
      setF({ ...saved, emails: saved.emails.join(', '), whatsapp: saved.whatsapp.join(', '), rules: { ...saved.rules } });
      setMsg({ tone: 'ok', text: 'Saved.' });
      onSaved();
    } catch (err) {
      setMsg({ tone: 'bad', text: err.message });
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    setTesting(true); setTest(null);
    try { setTest(await serverLogsService.sendTest()); } catch (err) { setTest({ error: err.message }); } finally { setTesting(false); }
  };

  return (
    <form className="sl-settings" onSubmit={save}>
      <section className="rep-panel">
        <div className="rep-ph"><h3>Who gets alerts</h3><span className="hint">Separate with commas. Save before sending a test.</span></div>
        <div className="sl-form">
          <Switch checked={!!f.enabled} onChange={(v) => set('enabled', v)} label="Server Watch alerts on" description="Off: problems are still logged here, nothing is sent." />
          <label className="sl-field">
            <span className="sl-lbl">Email</span>
            <input className="sl-input" value={f.emails} onChange={(e) => set('emails', e.target.value)} placeholder="info@yourcompany.com" />
            {!data.email_ready && <span className="sl-help sl-bad">Email isn’t set up on the server yet (EMAIL_USER and EMAIL_APP_PASSWORD), so only WhatsApp will be sent.</span>}
          </label>
          <label className="sl-field">
            <span className="sl-lbl">WhatsApp numbers</span>
            <input className="sl-input" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="98765 43210" />
            <span className="sl-help">Sent with the <code>server_alert</code> template. Create and get it approved under WhatsApp → Templates. Until then a plain message is tried, which only arrives if that number messaged the business number in the last 24 hours.</span>
          </label>
          <div className="sl-row">
            <label className="sl-field">
              <span className="sl-lbl">Send alerts from</span>
              <select className="sl-input" value={f.hoursFrom} onChange={(e) => set('hoursFrom', Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </label>
            <label className="sl-field">
              <span className="sl-lbl">until</span>
              <select className="sl-input" value={f.hoursTo} onChange={(e) => set('hoursTo', Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </label>
            <label className="sl-field">
              <span className="sl-lbl">Remind every (minutes)</span>
              <input className="sl-input" type="number" min="10" value={f.remindMinutes} onChange={(e) => set('remindMinutes', e.target.value)} />
            </label>
          </div>
          <span className="sl-help">{allDay ? 'All day, every day (India time).' : `Only ${hourLabel(f.hoursFrom)} to ${hourLabel(f.hoursTo)} India time. Problems outside these hours are sent when the hours start, if still open.`}</span>
          <Switch checked={!!f.dailySummary} onChange={(v) => set('dailySummary', v)} label="Daily summary at 9 am" description="Yesterday’s orders, page loads, errors and alerts." />
        </div>
      </section>

      <section className="rep-panel">
        <div className="rep-ph"><h3>When to alert</h3><span className="hint">Checked every 10 minutes</span></div>
        <div className="sl-rules">
          {RULES.map((r) => (
            <label key={r.key} className="sl-field">
              <span className="sl-lbl">{r.label}</span>
              <input className="sl-input" type="number" min="0" value={f.rules[r.key]} onChange={(e) => setRule(r.key, e.target.value)} />
              <span className="sl-help">{r.help}</span>
            </label>
          ))}
        </div>
        <p className="sl-help sl-note">Also always alerted: a scheduled job whose last run failed, and the database not answering (by email).</p>
      </section>

      <div className="sl-actions">
        <button type="submit" className="sh-btn sh-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        <button type="button" className="sh-btn" onClick={sendTest} disabled={testing}>
          <HugeiconsIcon icon={SentIcon} size={13} strokeWidth={2} aria-hidden="true" />{testing ? 'Sending…' : 'Send test alert'}
        </button>
        {msg && <span className={`sh-msg sh-msg--${msg.tone}`} role="status">{msg.text}</span>}
      </div>
      {test && (
        <div className="sl-test" role="status">
          {test.error ? <div className="sl-bad">{test.error}</div> : (
            <>
              <div>Email: {test.email?.ok ? <Pill tone="ok">Sent</Pill> : <><Pill tone="bad">Not sent</Pill> <span className="sh-small">{test.email?.error}</span></>}</div>
              {(test.whatsapp || []).map((w, i) => (
                <div key={i}>WhatsApp {w.phone}: {w.ok ? <Pill tone="ok">{w.via === 'text' ? 'Sent as plain message' : 'Sent'}</Pill> : <><Pill tone="bad">Not sent</Pill> <span className="sh-small">{w.error}</span></>}</div>
              ))}
            </>
          )}
        </div>
      )}
    </form>
  );
}

// ── Page ────────────────────────────────────────────────────────────
export default function ServerLogs() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [hours, setHours] = useState(24);
  const [brand, setBrand] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 350); return () => clearTimeout(t); }, [search]);

  const { data, error, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['server-logs', hours, brand, level, q],
    queryFn: () => serverLogsService.get({ hours, brand, level, q }),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const openCount = data?.alerts?.filter((a) => !a.resolved_at).length || 0;

  return (
    <div className="dashboard-sections obz-rep sh sl">
      <PageHeader
        title="Server logs"
        subtitle="What the live server is doing and what went wrong. Problems are sent to you by email and WhatsApp."
        actions={(
          <div className="sh-head-act">
            {dataUpdatedAt ? <span className="sh-small">Updated {clock(dataUpdatedAt)}</span> : null}
            <button type="button" className="rep-chip" onClick={() => refetch()} disabled={isFetching}>
              <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} aria-hidden="true" />
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        )}
      />

      <div className="sl-tabs" role="tablist" aria-label="Server logs">
        <button type="button" role="tab" aria-selected={tab === 'overview'} className={`sl-tab${tab === 'overview' ? ' is-on' : ''}`} onClick={() => setTab('overview')}>
          Overview{openCount ? <span className="sl-count">{openCount}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'settings'} className={`sl-tab${tab === 'settings' ? ' is-on' : ''}`} onClick={() => setTab('settings')}>Alert settings</button>
      </div>

      {isLoading ? (
        <>
          <SkeletonKpis count={4} label="Loading server logs…" className="sh-tiles" />
          <section className="rep-panel rep-panel--flush" aria-hidden="true">
            <div className="rep-ph"><h3>Hour by hour</h3></div>
            <div className="rep-tbl-wrap"><table className="rep-table"><tbody><SkeletonTableRows rows={8} cols={6} /></tbody></table></div>
          </section>
        </>
      ) : error && !data ? (
        <div className="rep-panel rep-state sh-error">
          Couldn't load server logs: {error.message || 'try again'}
          <div><button type="button" className="sh-btn" onClick={() => refetch()}>Try again</button></div>
        </div>
      ) : tab === 'settings' ? (
        <SettingsTab data={data} onSaved={() => qc.invalidateQueries({ queryKey: ['server-logs'] })} />
      ) : (
        <>
          {error && <div className="sh-stale" role="status">Couldn't refresh just now. Showing the last data. {error.message}</div>}
          <OpenAlerts alerts={data.alerts} />
          {!data.settings.enabled && <div className="sh-stale">Alerts are turned off. Problems are still logged. Turn them on under Alert settings.</div>}

          <div className="sl-range" role="group" aria-label="Store">
            <span className="sl-lbl">Store</span>
            {[{ slug: '', name: 'All stores' }, ...data.brands, { slug: '-', name: 'No store (admin, webhooks)' }].map((b) => (
              <button key={b.slug || 'all'} type="button" className={`rep-chip${brand === b.slug ? ' is-active' : ''}`} aria-pressed={brand === b.slug} onClick={() => setBrand(b.slug)}>{b.name}</button>
            ))}
          </div>

          <section className="sh-tiles" aria-label="Right now">
            {tilesFrom(data).map((t) => <Tile key={t.label} {...t} />)}
          </section>

          <div className="sl-range" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.h} type="button" className={`rep-chip${hours === r.h ? ' is-active' : ''}`} aria-pressed={hours === r.h} onClick={() => setHours(r.h)}>{r.label}</button>
            ))}
            <span className="sh-small">
              {num(data.kpis.window.requests)} requests · {num(data.kpis.window.fail5xx)} server errors · {num(data.kpis.window.rl429 + data.kpis.window.cors)} blocked
              {data.last_watch ? ` · watchdog last ran ${ago(data.last_watch.started_at)}` : ' · watchdog hasn’t run yet'}
            </span>
          </div>

          {!brand && (
            <section className="rep-panel rep-panel--flush">
              <div className="rep-ph"><h3>By store</h3><span className="hint">Over the time range · click a store to see only its numbers</span></div>
              <StoresTable stores={data.stores} onPick={setBrand} />
            </section>
          )}

          <section className="rep-panel rep-panel--flush">
            <div className="rep-ph"><h3>Hour by hour</h3><span className="hint">India time{brand ? ` · ${data.brands.find((b) => b.slug === brand)?.name || 'no store'} only` : ' · all stores'}</span></div>
            <HourTable data={data} hours={hours} />
          </section>

          <section className="rep-panel rep-panel--flush">
            <div className="rep-ph sl-ph">
              <h3>Logged problems</h3>
              <div className="sl-filters">
                {[['', 'All'], ['error', 'Errors'], ['warn', 'Blocked'], ['info', 'Restarts']].map(([v, l]) => (
                  <button key={v || 'all'} type="button" className={`rep-chip${level === v ? ' is-active' : ''}`} aria-pressed={level === v} onClick={() => setLevel(v)}>{l}</button>
                ))}
                <input className="sl-input sl-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search message, path, brand" aria-label="Search logged problems" />
              </div>
            </div>
            <EventsTable events={data.events} />
          </section>

          <section className="rep-panel rep-panel--flush">
            <div className="rep-ph"><h3>Past alerts</h3><span className="hint">Last 7 days</span></div>
            <PastAlerts alerts={data.alerts} />
          </section>
        </>
      )}
    </div>
  );
}
