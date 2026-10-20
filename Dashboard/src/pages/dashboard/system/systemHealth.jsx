import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SkeletonKpis, SkeletonTableRows } from '../../../components/ui';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { systemHealthService } from '../../../services';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowRight01Icon, RefreshIcon, PlayIcon } from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   System health (Settings → System health, admins only).

   The jobs that run by themselves — did they run, and did they work?
   · Tiles: this server, the background job queue, webhooks, errors.
   · Scheduled jobs: last run + result, next run, "Run now" (confirmed
     in the row), click a job for its last 10 runs with errors.

   Data: GET /api/admin/system/health (every 60 s; every 4 s while a
   job is running), POST /api/admin/system/jobs/:key/run.
   Times are shown in India time.
   ────────────────────────────────────────────────────────────── */

const TZ = 'Asia/Kolkata';
const HOUR = 3600 * 1000;

// ── Formatting ──────────────────────────────────────────────────────
const istDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const clock = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
function when(d) {
  if (!d) return '—';
  const day = istDay(d);
  const today = istDay(Date.now());
  if (day === today) return `Today ${clock(d)}`;
  if (day === istDay(Date.now() + 24 * HOUR)) return `Tomorrow ${clock(d)}`;
  if (day === istDay(Date.now() - 24 * HOUR)) return `Yesterday ${clock(d)}`;
  return `${new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' })}, ${clock(d)}`;
}
function ago(d) {
  if (!d) return null;
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
function upFor(sec) {
  const m = Math.floor((Number(sec) || 0) / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} days`;
}
function took(ms) {
  if (ms == null) return '';
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}
const num = (v) => (Number(v) || 0).toLocaleString('en-IN');

const STATUS = {
  ok: { label: 'OK', tone: 'ok' },
  partial: { label: 'Partly', tone: 'warn' },
  failed: { label: 'Failed', tone: 'bad' },
  skipped: { label: 'Skipped', tone: 'muted' },
};

// ── Tiles ───────────────────────────────────────────────────────────
function tilesFrom(h) {
  const b = h.server?.build || {};
  const server = {
    label: 'Server', tone: 'ok', value: 'Running',
    note: `build ${b.sha || 'local'} · up ${upFor(h.server?.uptime)} · ${num(h.server?.memory?.rss_mb)} MB memory`,
  };

  let queue;
  if (!h.queue) {
    queue = { label: 'Job queue', tone: 'warn', value: 'Off', note: h.queue_note || 'Jobs run inside the web server.' };
  } else {
    const q = h.queue;
    queue = {
      label: 'Job queue',
      tone: q.failed_24h > 0 || q.waiting > 100 ? 'warn' : 'ok',
      value: `${num(q.waiting)} waiting`,
      note: [q.active ? `${num(q.active)} running` : null, `${num(q.failed_24h)} failed in 24 h`].filter(Boolean).join(' · '),
    };
  }

  const c = h.webhooks?.courier_last_at;
  const cAge = c ? Date.now() - new Date(c).getTime() : null;
  const wa = h.webhooks?.whatsapp_last_at;
  const hooks = {
    label: 'Courier webhooks',
    tone: cAge == null ? 'muted' : cAge < 24 * HOUR ? 'ok' : cAge < 72 * HOUR ? 'warn' : 'bad',
    value: c ? ago(c) : 'None yet',
    note: `${c ? 'last courier update received' : 'no courier update received yet'} · WhatsApp: ${wa ? `last message ${ago(wa)}` : 'none yet'}`,
  };

  const n = h.errors_24h;
  const errors = {
    label: 'Errors · 24 h',
    tone: n == null ? 'muted' : n === 0 ? 'ok' : n < 10 ? 'warn' : 'bad',
    value: n == null ? '—' : num(n),
    note: h.errors_source === 'process' ? 'this server since it started · also sent to Telegram' : 'also sent to Telegram',
  };
  return [server, queue, hooks, errors];
}

function Tile({ t }) {
  return (
    <div className="rep-kpi sh-tile">
      <div className="rep-kl">{t.label}</div>
      <div className="sh-tile-v"><span className={`sh-dot sh-dot--${t.tone}`} aria-hidden="true" />{t.value}</div>
      <div className="rep-kf">{t.note}</div>
    </div>
  );
}

function Pill({ tone, children }) {
  return <span className={`sh-pill sh-pill--${tone}`}>{children}</span>;
}

// ── Job row ─────────────────────────────────────────────────────────
function JobRow({ job, open, onToggle, onRan }) {
  const [phase, setPhase] = useState('idle'); // idle | confirm | running
  const [msg, setMsg] = useState(null); // { tone, text }
  const busy = phase === 'running' || job.running;
  const last = job.last;

  // A run started here that outlived the request finishes in the background;
  // the row flips back once the polled data says it's done.
  useEffect(() => { if (phase === 'running' && !job.running && msg?.waiting) { setPhase('idle'); setMsg(null); } }, [job.running, phase, msg]);

  const run = async () => {
    setPhase('running'); setMsg(null);
    try {
      const r = await systemHealthService.runJob(job.key);
      if (r.finished) {
        setPhase('idle');
        setMsg({ tone: STATUS[r.run?.status]?.tone || 'ok', text: `Done: ${r.run?.summary || 'finished'}` });
      } else {
        setMsg({ tone: 'muted', text: r.message || 'Still running…', waiting: true });
      }
    } catch (e) {
      setPhase('idle');
      setMsg({ tone: 'bad', text: e.message });
    }
    onRan();
  };

  let result;
  if (job.running) result = <><Pill tone="info">Running</Pill><span className="sh-sum">started {clock(job.running_since)}</span></>;
  else if (!last) result = <span className="sh-sum">No runs recorded yet</span>;
  else {
    const st = STATUS[last.status] || STATUS.ok;
    result = <><Pill tone={st.tone}>{st.label}</Pill><span className="sh-sum">{last.summary}</span></>;
  }

  return (
    <>
      <tr className={`sh-row${open ? ' is-open' : ''}`}>
        <td className="sh-job">
          <button type="button" className="sh-name" onClick={onToggle} aria-expanded={open} aria-controls={`sh-h-${job.key}`}>
            <HugeiconsIcon icon={open ? ArrowDown01Icon : ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
            <span>{job.name}</span>
          </button>
          {job.messages_customers && <div className="sh-tag">Messages customers</div>}
        </td>
        <td className="sh-when">
          {job.schedule}
          {job.clock_note && <div className="sh-small">{job.clock_note}</div>}
        </td>
        <td className="sh-when">
          {last ? when(last.started_at) : '—'}
          {last?.manual && <div className="sh-small">run by hand</div>}
        </td>
        <td className="sh-result">
          <div className="sh-result-in">{result}</div>
          {job.late && <div className="sh-late">Missed its last scheduled run</div>}
        </td>
        <td className="sh-when mut">{job.next_at ? when(job.next_at) : '—'}</td>
        <td className="sh-act">
          {phase === 'confirm' ? (
            <div className="sh-confirm" role="group" aria-label={`Run ${job.name} now?`}>
              <span className="sh-confirm-q">
                {job.messages_customers ? 'This sends WhatsApp messages to customers, like a normal run. Run now?' : 'Run it now?'}
              </span>
              <span className="sh-confirm-btns">
                <button type="button" className="sh-btn sh-btn--primary" onClick={run}>Yes, run</button>
                <button type="button" className="sh-btn" onClick={() => setPhase('idle')}>Cancel</button>
              </span>
            </div>
          ) : (
            <button type="button" className="sh-btn" disabled={busy} onClick={() => { setMsg(null); setPhase('confirm'); }}>
              {busy ? <><span className="sh-spin" aria-hidden="true" />Running…</> : <><HugeiconsIcon icon={PlayIcon} size={13} strokeWidth={2} aria-hidden="true" />Run now</>}
            </button>
          )}
          {msg && <div className={`sh-msg sh-msg--${msg.tone}`} role="status">{msg.text}</div>}
        </td>
      </tr>
      {open && (
        <tr className="sh-hist-row" id={`sh-h-${job.key}`}>
          <td colSpan={6}>
            <History job={job} />
          </td>
        </tr>
      )}
    </>
  );
}

function History({ job }) {
  if (!job.history?.length) return <div className="sh-hist-empty">No runs recorded yet. Runs are kept for 30 days.</div>;
  return (
    <div className="sh-hist">
      <div className="sh-hist-head">Last {job.history.length} runs</div>
      <ol className="sh-hist-list">
        {job.history.map((r) => {
          const st = STATUS[r.status] || STATUS.ok;
          return (
            <li key={r.id} className="sh-hist-item">
              <div className="sh-hist-line">
                <span className="sh-hist-time">{when(r.started_at)}</span>
                <Pill tone={st.tone}>{st.label}</Pill>
                <span className="sh-sum">{r.summary || '—'}</span>
                <span className="sh-small sh-hist-meta">{[took(r.duration_ms), r.manual ? 'run by hand' : null].filter(Boolean).join(' · ')}</span>
              </div>
              {r.error && <pre className="sh-err">{r.error}</pre>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────
export default function SystemHealth() {
  const qc = useQueryClient();
  const [openKey, setOpenKey] = useState(null);
  const { data, error, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['system-health'],
    queryFn: systemHealthService.getHealth,
    // Every minute; every 4 s while any job is running so its row updates.
    refetchInterval: (q) => (q.state.data?.jobs?.some((j) => j.running) ? 4000 : 60000),
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['system-health'] });

  return (
    <div className="dashboard-sections obz-rep sh">
      <PageHeader
        title="System health"
        subtitle="The jobs that run by themselves — did they run, and did they work? Admins only."
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

      {isLoading ? (
        <>
          <SkeletonKpis count={4} label="Loading system health…" className="sh-tiles" />
          <section className="rep-panel rep-panel--flush" aria-hidden="true">
            <div className="rep-ph">
              <h3>Scheduled jobs</h3>
              <span className="hint">India time · click a job for its last 10 runs</span>
            </div>
            <div className="rep-tbl-wrap">
              <table className="rep-table sh-table">
                <thead><tr><th>Job</th><th>Runs</th><th>Last run</th><th>Result</th><th>Next</th><th /></tr></thead>
                <tbody><SkeletonTableRows rows={8} cols={6} /></tbody>
              </table>
            </div>
          </section>
        </>
      ) : error && !data ? (
        <div className="rep-panel rep-state sh-error">
          Couldn't load system health: {error.response?.data?.message || error.message || 'try again'}
          <div><button type="button" className="sh-btn" onClick={() => refetch()}>Try again</button></div>
        </div>
      ) : (
        <>
          {error && <div className="sh-stale" role="status">Couldn't refresh just now — showing the last data. {error.message}</div>}
          <section className="sh-tiles" aria-label="Status">
            {tilesFrom(data).map((t) => <Tile key={t.label} t={t} />)}
          </section>

          <section className="rep-panel rep-panel--flush">
            <div className="rep-ph">
              <h3>Scheduled jobs</h3>
              <span className="hint">India time · click a job for its last 10 runs</span>
            </div>
            {data.jobs?.length ? (
              <div className="rep-tbl-wrap">
                <table className="rep-table sh-table">
                  <thead>
                    <tr><th>Job</th><th>Runs</th><th>Last run</th><th>Result</th><th>Next</th><th><span className="sh-sr">Actions</span></th></tr>
                  </thead>
                  <tbody>
                    {data.jobs.map((j) => (
                      <JobRow
                        key={j.key}
                        job={j}
                        open={openKey === j.key}
                        onToggle={() => setOpenKey((k) => (k === j.key ? null : j.key))}
                        onRan={refresh}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rep-state">No scheduled jobs are set up.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
