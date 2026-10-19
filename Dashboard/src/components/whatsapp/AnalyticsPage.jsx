import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';

/* ──────────────────────────────────────────────────────────────
   WhatsApp analytics — replaces the old Dashboard + Analytics tabs.
   GET /api/whatsapp/analytics?days=1|7|30&brandId=
     → { kpis:{ chats, chats_prev, first_reply_median_min, first_reply_target_min,
                within_target_pct, waiting_now, waiting_over_4h, sales },
         funnel:{ sent, delivered, read, replied, failed },
         heatmap:[{ day:0-6 (Mon=0), hour_bucket:0-11 (2h from 08:00 IST), chats }],
         by_brand:[{ brand_id, name, chats, first_reply_median_min, unanswered, read_rate, sales }],
         by_agent:[{ user_id, name, closed, first_reply_median_min }] }
   CSS-only charts (no chart library).
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp/analytics';
const PERIODS = [{ key: 1, label: 'Today' }, { key: 7, label: '7 days' }, { key: 30, label: '30 days' }];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p', '12a', '2a', '4a', '6a'];
const SLOT_NAMES = ['8–10 am', '10 am–12 pm', '12–2 pm', '2–4 pm', '4–6 pm', '6–8 pm', '8–10 pm', '10 pm–12 am', '12–2 am', '2–4 am', '4–6 am', '6–8 am'];

const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
const inr = (n) => `₹${num(n)}`;
const pctOf = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : 0);

function mins(m) {
  if (m === null || m === undefined || m === '' || !Number.isFinite(Number(m))) return '—';
  const v = Math.round(Number(m));
  if (v < 60) return `${v} min`;
  const h = Math.floor(v / 60);
  const r = v % 60;
  if (h >= 48) return `${Math.round(h / 24)} days`;
  return r ? `${h} h ${String(r).padStart(2, '0')} m` : `${h} h`;
}
// read_rate may be a 0–100 percentage or a 0–1 fraction.
function rate(v) {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  return `${Math.round(n > 0 && n < 1 ? n * 100 : n)}%`;
}

function State({ kind, title, text, onRetry }) {
  return (
    <div className={`wpb-state${kind === 'error' ? ' wpb-state--error' : ''}`} role={kind === 'error' ? 'alert' : undefined}>
      <b>{title}</b>
      {text && <span>{text}</span>}
      {onRetry && (
        <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={onRetry}>
          <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} /> Try again
        </button>
      )}
    </div>
  );
}

export default function AnalyticsPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  const [brand, setBrand] = useState(brandId ? String(brandId) : '');
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Follow the studio's brand picker; the chips below are a local override.
  useEffect(() => { setBrand(brandId ? String(brandId) : ''); }, [brandId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { days };
      if (brand) params.brandId = brand;
      const { data: res } = await adminApi.get(API, { params });
      setData(res || {});
    } catch (e) {
      setError(errText(e, 'Could not load WhatsApp analytics.'));
    } finally {
      setLoading(false);
    }
  }, [days, brand]);

  useEffect(() => { load(); }, [load]);

  const k = data?.kpis || {};
  const f = data?.funnel || {};
  const byBrand = Array.isArray(data?.by_brand) ? data.by_brand : [];
  const byAgent = Array.isArray(data?.by_agent) ? data.by_agent : [];

  const heat = useMemo(() => {
    const grid = DAYS.map(() => HOURS.map(() => 0));
    (Array.isArray(data?.heatmap) ? data.heatmap : []).forEach((c) => {
      const d = Number(c.day);
      const h = Number(c.hour_bucket);
      if (d >= 0 && d < 7 && h >= 0 && h < 12) grid[d][h] += Number(c.chats) || 0;
    });
    let max = 0; let top = null; let total = 0;
    grid.forEach((row, d) => row.forEach((v, h) => { total += v; if (v > max) { max = v; top = { d, h, v }; } }));
    return { grid, max, top, total };
  }, [data]);

  const chats = Number(k.chats) || 0;
  const prev = Number(k.chats_prev) || 0;
  let chatsNote = { text: 'No chats in the previous period', tone: 'muted' };
  if (prev > 0) {
    const d = Math.round(((chats - prev) / prev) * 100);
    chatsNote = d === 0
      ? { text: 'Same as previous period', tone: 'muted' }
      : { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}% vs previous period`, tone: d > 0 ? 'success' : 'danger' };
  }
  const target = Number(k.first_reply_target_min) || 30;
  const hasReply = k.first_reply_median_min !== null && k.first_reply_median_min !== undefined;
  const over4 = Number(k.waiting_over_4h) || 0;
  const kpis = [
    { label: 'Customer chats', value: num(chats), note: chatsNote.text, tone: chatsNote.tone },
    {
      label: 'First reply · median', value: mins(k.first_reply_median_min),
      note: hasReply ? `target under ${target} min · ${num(k.within_target_pct)}% hit it` : 'No replies in this period',
      tone: hasReply && Number(k.first_reply_median_min) > target ? 'warn' : 'muted',
    },
    {
      label: 'Waiting for us now', value: num(k.waiting_now),
      note: over4 > 0 ? `${num(over4)} waiting over 4 hours` : 'Nobody waiting over 4 hours',
      tone: over4 > 0 ? 'warn' : 'muted',
    },
    { label: 'Sales from WhatsApp', value: inr(k.sales), note: 'orders after a WhatsApp message', tone: 'muted' },
  ];

  const sent = Number(f.sent) || 0;
  const funnel = [
    { label: 'Sent', v: sent, tone: 'neutral' },
    { label: 'Delivered', v: Number(f.delivered) || 0, tone: 'info' },
    { label: 'Read', v: Number(f.read) || 0, tone: 'accent' },
    { label: 'Customer replied or tapped', v: Number(f.replied) || 0, tone: 'success' },
  ];
  const failed = Number(f.failed) || 0;

  const first = loading && !data;

  return (
    <div className="wpb-page">
      <header className="wpb-head">
        <div className="wpb-head-text">
          <h1 className="wpb-title">WhatsApp analytics</h1>
          <p className="wpb-sub">How fast the team answers, whether messages get read, and what WhatsApp earns.</p>
        </div>
        <div className="wpb-head-tools">
          {brands.length > 1 && (
            <div className="wpb-chips wpb-chips--scroll" role="group" aria-label="Brand">
              <button type="button" aria-pressed={!brand} className={`wpb-chip${!brand ? ' is-on' : ''}`} onClick={() => setBrand('')}>All brands</button>
              {brands.map((b) => (
                <button key={b.id} type="button" aria-pressed={brand === String(b.id)}
                  className={`wpb-chip${brand === String(b.id) ? ' is-on' : ''}`} onClick={() => setBrand(String(b.id))}>{b.name}</button>
              ))}
            </div>
          )}
          <div className="wpb-chips" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p.key} type="button" aria-pressed={days === p.key}
                className={`wpb-chip${days === p.key ? ' is-on' : ''}`} onClick={() => setDays(p.key)}>{p.label}</button>
            ))}
          </div>
        </div>
      </header>

      {error && !data ? (
        <section className="wpb-card"><State kind="error" title="Couldn’t load analytics" text={error} onRetry={load} /></section>
      ) : (
        <>
          {error && (
            <div className="wpb-banner t-danger" role="alert">
              <span>Couldn’t refresh: {error}</span>
              <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={load}>Try again</button>
            </div>
          )}

          <section className={`wpb-kpis${loading && data ? ' is-stale' : ''}`} aria-label="Customer service" aria-busy={loading}>
            {kpis.map((t) => (
              <div key={t.label} className="wpb-kpi">
                <span className="wpb-eyebrow">{t.label}</span>
                <span className="wpb-kpi-v">{first ? <span className="wpb-skel-inline" /> : t.value}</span>
                <span className={`wpb-kpi-note t-${t.tone}`}>{first ? ' ' : t.note}</span>
              </div>
            ))}
          </section>

          <div className={`wpb-two${loading && data ? ' is-stale' : ''}`}>
            <section className="wpb-card wpb-col">
              <h2 className="wpb-h2">Messages we sent <span>· what happened to them</span></h2>
              {first ? (
                <div className="wpb-skel-list">{[0, 1, 2, 3].map((i) => <div key={i} className="wpb-skel-row"><span /></div>)}</div>
              ) : sent === 0 && failed === 0 ? (
                <State title="No messages sent in this period" text="Order updates, broadcasts and replies will show here." />
              ) : (
                <>
                  <div className="wpb-funnel">
                    {funnel.map((s, i) => (
                      <div key={s.label} className="wpb-funnel-row">
                        <div className="wpb-funnel-top">
                          <span>{s.label}</span>
                          <span><b>{num(s.v)}</b>{i > 0 && <span className="wpb-faint"> {pctOf(s.v, sent)}%</span>}</span>
                        </div>
                        <div className="wpb-track wpb-track--lg"><div className={`wpb-fill t-${s.tone}`} style={{ width: `${Math.min(100, pctOf(s.v, sent))}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  {failed > 0 ? (
                    <span className="wpb-fail-note">
                      {num(failed)} not delivered.{' '}
                      {isAdmin && goTo
                        ? <button type="button" className="wpb-link" onClick={() => goTo('settings')}>See them in Settings → Failed sends</button>
                        : 'An admin can see why in Settings → Failed sends.'}
                    </span>
                  ) : (
                    <span className="wpb-hint">Every message was delivered.</span>
                  )}
                </>
              )}
            </section>

            <section className="wpb-card wpb-col">
              <h2 className="wpb-h2">When customers message <span>· plan who’s online</span></h2>
              {first ? (
                <div className="wpb-skel-block" />
              ) : (
                <>
                  <div className="wpb-hm-wrap">
                    <div className="wpb-hm" role="table" aria-label="Customer chats by day and time (India time)">
                      <span role="presentation" />
                      {HOURS.map((h) => <span key={h} className="wpb-hm-h" role="columnheader">{h}</span>)}
                      {DAYS.map((d, di) => (
                        <React.Fragment key={d}>
                          <span className="wpb-hm-d" role="rowheader">{d}</span>
                          {heat.grid[di].map((v, hi) => (
                            <span key={hi} role="cell" className="wpb-hm-cell"
                              style={{ '--a': heat.max ? (v ? 0.12 + 0.88 * (v / heat.max) : 0) : 0 }}
                              title={`${d} ${SLOT_NAMES[hi]}: ${num(v)} ${v === 1 ? 'chat' : 'chats'}`}
                              aria-label={`${d} ${SLOT_NAMES[hi]}: ${num(v)} chats`} />
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="wpb-hm-foot">
                    <span className="wpb-hint">
                      {heat.top
                        ? <>Busiest: <b>{DAYS[heat.top.d]} {SLOT_NAMES[heat.top.h]}</b> ({num(heat.top.v)} chats). India time.</>
                        : 'No customer messages in this period.'}
                    </span>
                    <span className="wpb-hm-legend" aria-hidden="true">Fewer <i style={{ '--a': 0.15 }} /><i style={{ '--a': 0.5 }} /><i style={{ '--a': 1 }} /> More</span>
                  </div>
                </>
              )}
            </section>
          </div>

          <div className={`wpb-two wpb-two--top${loading && data ? ' is-stale' : ''}`}>
            <section className="wpb-card wpb-card--flush wpb-col-wide">
              <h2 className="wpb-h2 wpb-h2--pad">By brand</h2>
              {first ? (
                <div className="wpb-skel-list">{[0, 1, 2].map((i) => <div key={i} className="wpb-skel-row"><span /></div>)}</div>
              ) : byBrand.length === 0 ? (
                <State title="No brand data yet" text="Chats in this period will be split by store here." />
              ) : (
                <div className="wpb-tbl-wrap">
                  <table className="wpb-tbl" style={{ minWidth: 640 }}>
                    <thead><tr><th>Brand</th><th className="r">Chats</th><th className="r">First reply</th><th className="r">Unanswered</th><th className="r">Read rate</th><th className="r">Sales from WhatsApp</th></tr></thead>
                    <tbody>
                      {byBrand.map((b) => (
                        <tr key={b.brand_id ?? b.name}>
                          <td><b className="wpb-strong">{b.name || `Brand ${b.brand_id}`}</b></td>
                          <td className="r">{num(b.chats)}</td>
                          <td className="r">{mins(b.first_reply_median_min)}</td>
                          <td className="r"><span className={Number(b.unanswered) > 3 ? 'wpb-warn-text' : ''}>{num(b.unanswered)}</span></td>
                          <td className="r">{rate(b.read_rate)}</td>
                          <td className="r">{inr(b.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="wpb-card wpb-card--flush wpb-col">
              <h2 className="wpb-h2 wpb-h2--pad">By team member</h2>
              {first ? (
                <div className="wpb-skel-list">{[0, 1, 2].map((i) => <div key={i} className="wpb-skel-row"><span /></div>)}</div>
              ) : byAgent.length === 0 ? (
                <State title="No replies from the team yet" text="Once someone replies from the inbox, they’ll show here." />
              ) : (
                <div className="wpb-tbl-wrap">
                  <table className="wpb-tbl" style={{ minWidth: 360 }}>
                    <thead><tr><th>Name</th><th className="r">Chats closed</th><th className="r">First reply</th></tr></thead>
                    <tbody>
                      {byAgent.map((a) => (
                        <tr key={a.user_id ?? a.name}>
                          <td><b className="wpb-strong">{a.name || 'Team member'}</b></td>
                          <td className="r">{num(a.closed)}</td>
                          <td className="r">{mins(a.first_reply_median_min)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
