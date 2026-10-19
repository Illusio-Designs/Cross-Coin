import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { Switch } from '../ui';
import Dropdown from '../ui/Dropdown';
import { showSuccess, showError } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   WhatsApp settings (admins only).
   GET  /api/whatsapp/settings/health  → { phone, display_name, verified, quality,
        messaging_limit, used_today, last_webhook_at, token_expires_at, error? }
   GET  /api/whatsapp/settings         → { away:{ enabled, start, end, text },
        auto_order_status:{ enabled }, opt_out_words:[…] }
   PUT  /api/whatsapp/settings         (same shape; we always send the full object)
   GET  /api/whatsapp/settings/failed?hours=24
   GET  /api/whatsapp/settings/opted-out
   POST /api/whatsapp/settings/test    { phone, templateName, brandId? }
   GET  /api/whatsapp/templates        (approved ones go in the test picker)
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp/settings';
const IST = 'Asia/Kolkata';

const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
const dayKey = (d) => d.toLocaleDateString('en-CA', { timeZone: IST });
const clock = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST }).toLowerCase();

function ago(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
function when(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  if (dayKey(d) === dayKey(new Date())) return clock(d);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST })}, ${clock(d)}`;
}
function niceTime(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return hhmm || '';
  const h = Number(m[1]); const mm = Number(m[2]);
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mm ? `${h12}:${m[2]} ${ap}` : `${h12} ${ap}`;
}
function formatPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return p || '—';
}

const QUALITY = {
  GREEN: { label: 'High', tone: 'success' }, HIGH: { label: 'High', tone: 'success' },
  YELLOW: { label: 'Medium', tone: 'warn' }, MEDIUM: { label: 'Medium', tone: 'warn' },
  RED: { label: 'Low', tone: 'danger' }, LOW: { label: 'Low', tone: 'danger' },
};
const LIMITS = { TIER_50: 50, TIER_250: 250, TIER_1K: 1000, TIER_2K: 2000, TIER_10K: 10000, TIER_100K: 100000 };
function limitOf(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Number.isFinite(Number(v))) return Number(v);
  const key = String(v).toUpperCase();
  if (key.includes('UNLIMITED')) return Infinity;
  return LIMITS[key] ?? null;
}

function healthTiles(h) {
  if (!h) return [];
  const tiles = [];
  tiles.push({
    label: 'Number',
    value: h.phone ? formatPhone(h.phone) : 'Unknown',
    note: [h.display_name ? `Display name “${h.display_name}”` : null, h.verified === true ? 'verified' : h.verified === false ? 'not verified yet' : null].filter(Boolean).join(' · ') || 'Couldn’t read the number details',
    tone: h.phone ? (h.verified === false ? 'warn' : 'success') : 'muted',
  });
  const q = QUALITY[String(h.quality || '').toUpperCase()];
  tiles.push({
    label: 'Quality rating', value: q ? q.label : 'Unknown',
    note: q && q.tone !== 'success' ? 'Too many blocks or reports — send fewer sales messages' : 'Set by WhatsApp from blocks & reports',
    tone: q ? q.tone : 'muted',
  });
  const lim = limitOf(h.messaging_limit);
  const used = Number(h.used_today) || 0;
  tiles.push({
    label: 'Daily limit',
    value: lim === Infinity ? 'No limit' : lim ? `${num(lim)} chats` : 'Unknown',
    note: `Used today: ${num(used)}`,
    tone: lim && lim !== Infinity && used >= lim * 0.8 ? 'warn' : lim ? 'success' : 'muted',
  });
  const hook = h.last_webhook_at ? new Date(h.last_webhook_at) : null;
  const hookHrs = hook && !Number.isNaN(hook.getTime()) ? (Date.now() - hook.getTime()) / 3600000 : null;
  tiles.push({
    label: 'Messages coming in', value: hookHrs === null ? 'Never' : ago(h.last_webhook_at),
    note: hookHrs === null ? 'No update from WhatsApp yet — check the webhook' : hookHrs > 24 ? 'Nothing for a day — check the webhook in Meta' : 'Last update from WhatsApp',
    tone: hookHrs === null ? 'danger' : hookHrs > 24 ? 'warn' : 'success',
  });
  const exp = h.token_expires_at ? new Date(h.token_expires_at) : null;
  const expDays = exp && !Number.isNaN(exp.getTime()) ? Math.floor((exp.getTime() - Date.now()) / 86400000) : null;
  let tok;
  if (expDays === null) tok = h.error ? { value: 'Unknown', tone: 'muted', note: 'Couldn’t check right now' } : { value: 'Never expires', tone: 'success', note: 'Permanent access key' };
  else if (expDays < 0) tok = { value: 'Expired', tone: 'danger', note: 'Messages can’t send — renew in Meta Business settings' };
  else tok = { value: expDays === 0 ? 'Expires today' : `Expires in ${expDays} ${expDays === 1 ? 'day' : 'days'}`, tone: expDays < 14 ? 'warn' : 'success', note: 'Renew in Meta Business settings' };
  tiles.push({ label: 'Access key', ...tok });
  return tiles;
}

function Dot({ tone }) { return <span className={`wpb-dot t-${tone}`} aria-hidden="true" />; }

function State({ kind, title, text, onRetry }) {
  return (
    <div className={`wpb-state wpb-state--sm${kind === 'error' ? ' wpb-state--error' : ''}`} role={kind === 'error' ? 'alert' : undefined}>
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

const DEFAULT_SETTINGS = { away: { enabled: false, start: '10:00', end: '20:00', text: '' }, auto_order_status: { enabled: false }, opt_out_words: [] };
function normalizeSettings(s) {
  const src = s?.settings || s || {};
  return {
    away: { ...DEFAULT_SETTINGS.away, ...(src.away || {}) },
    auto_order_status: { ...DEFAULT_SETTINGS.auto_order_status, ...(src.auto_order_status || {}) },
    opt_out_words: Array.isArray(src.opt_out_words) ? src.opt_out_words : [],
  };
}

export default function SettingsPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  // ── Health ──
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthErr, setHealthErr] = useState('');

  // ── Settings ──
  const [saved, setSaved] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsErr, setSettingsErr] = useState('');
  const [awayDraft, setAwayDraft] = useState(null);
  const [savingKey, setSavingKey] = useState('');
  const [wordInput, setWordInput] = useState('');

  // ── Test message ──
  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplErr, setTplErr] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testTpl, setTestTpl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, text }

  // ── Failed sends ──
  const [hours, setHours] = useState(24);
  const [failed, setFailed] = useState([]);
  const [failLoading, setFailLoading] = useState(true);
  const [failErr, setFailErr] = useState('');

  // ── Opted out ──
  const [opted, setOpted] = useState({ rows: [], total: 0 });
  const [optLoading, setOptLoading] = useState(true);
  const [optErr, setOptErr] = useState('');
  const [showOpted, setShowOpted] = useState(false);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true); setHealthErr('');
    try {
      const { data } = await adminApi.get(`${API}/health`);
      setHealth(data?.health || data || {});
    } catch (e) { setHealthErr(errText(e, 'Could not check the WhatsApp number.')); }
    finally { setHealthLoading(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true); setSettingsErr('');
    try {
      const { data } = await adminApi.get(API);
      const s = normalizeSettings(data);
      setSaved(s);
      setAwayDraft({ start: s.away.start, end: s.away.end, text: s.away.text });
    } catch (e) { setSettingsErr(errText(e, 'Could not load settings.')); }
    finally { setSettingsLoading(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTplLoading(true); setTplErr('');
    try {
      const params = brandId ? { brandId } : {};
      const { data } = await adminApi.get('/api/whatsapp/templates', { params });
      const list = (Array.isArray(data) ? data : data?.templates || [])
        .filter((t) => String(t.status || '').toLowerCase() === 'approved' && t.name);
      const seen = new Set();
      const uniq = list.filter((t) => (seen.has(t.name) ? false : seen.add(t.name)));
      setTemplates(uniq);
      setTestTpl((cur) => (cur && uniq.some((t) => t.name === cur) ? cur : uniq[0]?.name || ''));
    } catch (e) { setTplErr(errText(e, 'Could not load templates.')); setTemplates([]); }
    finally { setTplLoading(false); }
  }, [brandId]);

  const loadFailed = useCallback(async () => {
    setFailLoading(true); setFailErr('');
    try {
      const { data } = await adminApi.get(`${API}/failed`, { params: { hours } });
      setFailed(Array.isArray(data) ? data : data?.failed || data?.rows || data?.messages || []);
    } catch (e) { setFailErr(errText(e, 'Could not load failed sends.')); setFailed([]); }
    finally { setFailLoading(false); }
  }, [hours]);

  const loadOpted = useCallback(async () => {
    setOptLoading(true); setOptErr('');
    try {
      const { data } = await adminApi.get(`${API}/opted-out`);
      const rows = Array.isArray(data) ? data : data?.rows || data?.customers || data?.conversations || data?.opted_out || [];
      setOpted({ rows, total: Number(data?.total ?? data?.count ?? rows.length) || 0 });
    } catch (e) { setOptErr(errText(e, 'Could not load the opt-out list.')); }
    finally { setOptLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadHealth(); loadSettings(); loadOpted();
  }, [isAdmin, loadHealth, loadSettings, loadOpted]);
  useEffect(() => { if (isAdmin) loadTemplates(); }, [isAdmin, loadTemplates]);
  useEffect(() => { if (isAdmin) loadFailed(); }, [isAdmin, loadFailed]);

  const tiles = useMemo(() => healthTiles(health), [health]);

  // Always PUT the full object built from what's SAVED + this one change, so an
  // unsaved edit in another section is never sent by accident.
  async function persist(key, patch, okMsg) {
    if (!saved) return false;
    const next = { ...saved, ...patch };
    setSavingKey(key);
    try {
      const { data } = await adminApi.put(API, next);
      if (data && data.success === false) throw new Error(data.message || 'Not saved');
      const fresh = data && (data.settings || data.away) ? normalizeSettings(data) : next;
      setSaved(fresh);
      if (okMsg) showSuccess('saved', okMsg);
      return true;
    } catch (e) {
      showError('saveFailed', errText(e, 'Could not save the setting.'));
      return false;
    } finally {
      setSavingKey('');
    }
  }

  const awayDirty = saved && awayDraft && (awayDraft.start !== saved.away.start || awayDraft.end !== saved.away.end || awayDraft.text !== saved.away.text);

  async function saveAway(e) {
    e.preventDefault();
    if (!awayDraft.start || !awayDraft.end) { showError('fieldRequired', 'Pick both times.'); return; }
    if (awayDraft.start === awayDraft.end) { showError('fieldRequired', 'Start and end time can’t be the same.'); return; }
    if (!awayDraft.text.trim()) { showError('fieldRequired', 'Write the away message.'); return; }
    await persist('away-text', { away: { ...saved.away, start: awayDraft.start, end: awayDraft.end, text: awayDraft.text.trim() } }, 'Away message saved');
  }

  function addWord(e) {
    e?.preventDefault();
    const w = wordInput.trim().replace(/\s+/g, ' ');
    if (!w || !saved) return;
    if (saved.opt_out_words.some((x) => String(x).toLowerCase() === w.toLowerCase())) { setWordInput(''); return; }
    if (w.length > 40) { showError('fieldRequired', 'Keep each word or phrase under 40 letters.'); return; }
    persist('words', { opt_out_words: [...saved.opt_out_words, w] }).then((ok) => { if (ok) setWordInput(''); });
  }
  function removeWord(w) {
    if (!saved) return;
    persist('words', { opt_out_words: saved.opt_out_words.filter((x) => x !== w) });
  }

  async function sendTest(e) {
    e.preventDefault();
    const digits = testPhone.replace(/\D/g, '');
    if (digits.length !== 10) { setTestResult({ ok: false, text: 'Enter a 10-digit mobile number.' }); return; }
    if (!testTpl) { setTestResult({ ok: false, text: 'Pick a template.' }); return; }
    setTesting(true); setTestResult(null);
    try {
      const body = { phone: digits, templateName: testTpl };
      if (brandId) body.brandId = brandId;
      const { data } = await adminApi.post(`${API}/test`, body);
      if (data && data.success === false) throw new Error(data.message || 'Not sent');
      setTestResult({ ok: true, text: `✓ Sent to +91 ${digits.slice(0, 5)} ${digits.slice(5)} at ${clock(new Date())}. Check that phone.` });
    } catch (err) {
      setTestResult({ ok: false, text: errText(err, 'Could not send the test message.') });
    } finally {
      setTesting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="wpb-page">
        <header className="wpb-head"><div className="wpb-head-text"><h1 className="wpb-title">WhatsApp settings</h1></div></header>
        <section className="wpb-card"><State title="Only admins can open settings" text="Ask an admin if something about the WhatsApp number needs changing." /></section>
      </div>
    );
  }

  const tplOptions = templates.map((t) => ({ value: t.name, label: t.title ? `${t.title} (${t.name})` : t.name }));

  return (
    <div className="wpb-page wpb-page--narrow">
      <header className="wpb-head">
        <div className="wpb-head-text">
          <h1 className="wpb-title">WhatsApp settings</h1>
          <p className="wpb-sub">Is the number healthy, are messages coming in, and a quick way to test. Admins only.</p>
        </div>
        <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={loadHealth} disabled={healthLoading}>
          <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} /> {healthLoading ? 'Checking…' : 'Check again'}
        </button>
      </header>

      {healthErr ? (
        <section className="wpb-card"><State kind="error" title="Couldn’t check the number" text={healthErr} onRetry={loadHealth} /></section>
      ) : (
        <>
          {health?.error && (
            <div className="wpb-banner t-warn" role="status">
              <span>WhatsApp didn’t answer just now, so some details are missing. ({String(health.error)})</span>
            </div>
          )}
          <section className="wpb-health" aria-label="Connection health" aria-busy={healthLoading}>
            {(healthLoading && !health ? [0, 1, 2, 3, 4] : tiles).map((t, i) => (
              <div key={t.label || i} className="wpb-kpi">
                {t.label ? (
                  <>
                    <span className="wpb-eyebrow">{t.label}</span>
                    <span className="wpb-health-v"><Dot tone={t.tone} />{t.value}</span>
                    <span className="wpb-kpi-note t-muted">{t.note}</span>
                  </>
                ) : (
                  <><span className="wpb-skel-inline wpb-skel-inline--sm" /><span className="wpb-skel-inline" /></>
                )}
              </div>
            ))}
          </section>
        </>
      )}

      <div className="wpb-two wpb-two--top">
        <div className="wpb-col wpb-stack">
          <form className="wpb-card wpb-form" onSubmit={sendTest}>
            <h2 className="wpb-h2">Send a test message</h2>
            <div className="wpb-form-row">
              <label className="wpb-field wpb-grow">To
                <span className="wpb-prefix-input">
                  <span aria-hidden="true">+91</span>
                  <input className="wpb-input wpb-mono" value={testPhone} inputMode="numeric" maxLength={11} placeholder="98765 43210"
                    aria-label="Phone number" onChange={(e) => { setTestPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setTestResult(null); }} />
                </span>
              </label>
              <div className="wpb-field wpb-grow">
                <span>Template</span>
                {tplLoading ? <div className="wpb-input wpb-input--fake">Loading templates…</div>
                  : tplErr ? <div className="wpb-input wpb-input--fake t-danger">{tplErr} <button type="button" className="wpb-link" onClick={loadTemplates}>Retry</button></div>
                  : tplOptions.length === 0 ? <div className="wpb-input wpb-input--fake">No approved templates yet</div>
                  : <Dropdown value={testTpl} onChange={(v) => { setTestTpl(v); setTestResult(null); }} options={tplOptions} placeholder="Pick a template" className="wpb-dd" />}
              </div>
            </div>
            <div className="wpb-actions">
              <button type="submit" className="wpb-btn wpb-btn--go" disabled={testing || testPhone.length !== 10 || !testTpl}>
                {testing ? 'Sending…' : 'Send test'}
              </button>
              <span className={`wpb-hint${testResult ? (testResult.ok ? ' t-success' : ' t-danger') : ''}`} role="status">
                {testResult ? testResult.text : 'Uses a real approved template — the normal WhatsApp fee applies.'}
              </span>
            </div>
          </form>

          <section className="wpb-card wpb-form">
            <h2 className="wpb-h2">Replies when nobody’s online</h2>
            {settingsLoading && !saved ? (
              <div className="wpb-skel-list">{[0, 1].map((i) => <div key={i} className="wpb-skel-row"><span /><span /></div>)}</div>
            ) : settingsErr && !saved ? (
              <State kind="error" title="Couldn’t load these settings" text={settingsErr} onRetry={loadSettings} />
            ) : (
              <>
                <div className="wpb-toggle-row">
                  <div className="wpb-toggle-text">
                    <b>Away message</b>
                    <span>Outside {niceTime(saved.away.start)} – {niceTime(saved.away.end)}, customers who message get this reply once.</span>
                  </div>
                  <Switch checked={!!saved.away.enabled} disabled={!!savingKey} aria-label="Away message"
                    onChange={(on) => persist('away', { away: { ...saved.away, enabled: on } }, on ? 'Away message turned on' : 'Away message turned off')} />
                </div>
                <form className="wpb-subform" onSubmit={saveAway}>
                  <div className="wpb-form-row">
                    <label className="wpb-field wpb-grow">Team online from
                      <input className="wpb-input" type="time" value={awayDraft.start} onChange={(e) => setAwayDraft((d) => ({ ...d, start: e.target.value }))} />
                    </label>
                    <label className="wpb-field wpb-grow">until
                      <input className="wpb-input" type="time" value={awayDraft.end} onChange={(e) => setAwayDraft((d) => ({ ...d, end: e.target.value }))} />
                    </label>
                  </div>
                  <label className="wpb-field">Away message
                    <textarea className="wpb-input wpb-textarea" rows={3} maxLength={1000} value={awayDraft.text}
                      placeholder="Thanks! We’re offline now and will reply by 10 am."
                      onChange={(e) => setAwayDraft((d) => ({ ...d, text: e.target.value }))} />
                  </label>
                  {awayDirty && (
                    <div className="wpb-actions">
                      <button type="submit" className="wpb-btn wpb-btn--sm" disabled={savingKey === 'away-text'}>{savingKey === 'away-text' ? 'Saving…' : 'Save away message'}</button>
                      <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => setAwayDraft({ start: saved.away.start, end: saved.away.end, text: saved.away.text })}>Undo</button>
                    </div>
                  )}
                </form>

                <div className="wpb-divider" />

                <div className="wpb-toggle-row">
                  <div className="wpb-toggle-text">
                    <b>Order status by itself</b>
                    <span>If a customer asks “where is my order”, reply with the latest tracking automatically.</span>
                  </div>
                  <Switch checked={!!saved.auto_order_status.enabled} disabled={!!savingKey} aria-label="Order status by itself"
                    onChange={(on) => persist('auto', { auto_order_status: { ...saved.auto_order_status, enabled: on } }, on ? 'Automatic order status turned on' : 'Automatic order status turned off')} />
                </div>
              </>
            )}
          </section>
        </div>

        <div className="wpb-col wpb-stack">
          <section className="wpb-card wpb-form">
            <div className="wpb-h2-row">
              <h2 className="wpb-h2">Failed sends <span>· last {hours === 24 ? '24 h' : '7 days'}</span></h2>
              <div className="wpb-chips" role="group" aria-label="Period">
                {[{ k: 24, l: '24 h' }, { k: 168, l: '7 days' }].map((p) => (
                  <button key={p.k} type="button" aria-pressed={hours === p.k} className={`wpb-chip wpb-chip--sm${hours === p.k ? ' is-on' : ''}`} onClick={() => setHours(p.k)}>{p.l}</button>
                ))}
              </div>
            </div>
            {failLoading ? (
              <div className="wpb-skel-list">{[0, 1, 2].map((i) => <div key={i} className="wpb-skel-row"><span /><span /></div>)}</div>
            ) : failErr ? (
              <State kind="error" title="Couldn’t load failed sends" text={failErr} onRetry={loadFailed} />
            ) : failed.length === 0 ? (
              <State title="Nothing failed" text={`Every message in the last ${hours === 24 ? '24 hours' : '7 days'} went out.`} />
            ) : (
              <ul className="wpb-list">
                {failed.map((r, i) => {
                  const who = r.customer_name || r.name || r.customer_phone_masked || r.phone_masked || r.customer_phone || r.phone;
                  const what = r.what || r.label || [r.template_title || r.template_name || r.template || r.kind || r.type, who].filter(Boolean).join(' · ') || 'Message';
                  const why = r.reason || r.why || r.error || 'WhatsApp didn’t say why';
                  const at = r.at || r.failed_at || r.sent_at || r.createdAt || r.created_at;
                  const convId = r.conversation_id;
                  return (
                    <li key={r.id ?? i} className="wpb-list-row">
                      <div className="wpb-list-main">
                        <b>{what}</b>
                        <span>{why}</span>
                      </div>
                      <div className="wpb-list-side">
                        <span className="wpb-faint">{when(at)}</span>
                        {convId && goTo && <button type="button" className="wpb-link" onClick={() => goTo('inbox', { conversationId: convId })}>Open chat</button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="wpb-card wpb-form">
            <h2 className="wpb-h2">Opt-out words</h2>
            <span className="wpb-hint">A customer who replies with one of these stops getting broadcasts and sales messages. Order updates still go out.</span>
            {settingsLoading && !saved ? (
              <div className="wpb-skel-row"><span /></div>
            ) : settingsErr && !saved ? (
              <State kind="error" title="Couldn’t load the words" text={settingsErr} onRetry={loadSettings} />
            ) : (
              <>
                <div className="wpb-words" aria-busy={savingKey === 'words'}>
                  {saved.opt_out_words.length === 0 && <span className="wpb-faint">No words yet — add STOP at least.</span>}
                  {saved.opt_out_words.map((w) => (
                    <span key={w} className="wpb-word">
                      {w}
                      <button type="button" aria-label={`Remove ${w}`} onClick={() => removeWord(w)} disabled={!!savingKey}>
                        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2.2} />
                      </button>
                    </span>
                  ))}
                </div>
                <form className="wpb-form-row wpb-form-row--tight" onSubmit={addWord}>
                  <input className="wpb-input wpb-grow" value={wordInput} onChange={(e) => setWordInput(e.target.value)} placeholder="Add a word, e.g. BAND KARO" aria-label="New opt-out word" maxLength={40} />
                  <button type="submit" className="wpb-btn wpb-btn--ghost" disabled={!wordInput.trim() || !!savingKey}>{savingKey === 'words' ? 'Saving…' : 'Add'}</button>
                </form>
              </>
            )}

            <div className="wpb-divider" />
            {optErr ? (
              <State kind="error" title="Couldn’t load opted-out customers" text={optErr} onRetry={loadOpted} />
            ) : (
              <span className="wpb-opted-line">
                {optLoading ? 'Counting opted-out customers…' : <><b>{num(opted.total)}</b> {opted.total === 1 ? 'customer' : 'customers'} opted out</>}
                {!optLoading && opted.total > 0 && (
                  <> · <button type="button" className="wpb-link" aria-expanded={showOpted} onClick={() => setShowOpted((s) => !s)}>{showOpted ? 'hide list' : 'see list'}</button></>
                )}
              </span>
            )}
            {showOpted && !optErr && (
              opted.rows.length === 0 ? <span className="wpb-faint">The list is empty.</span> : (
                <ul className="wpb-list wpb-list--scroll">
                  {opted.rows.map((r, i) => {
                    const name = r.customer_name || r.name || 'Customer';
                    const phone = r.phone_masked || r.customer_phone_masked || r.customer_phone || r.phone || '';
                    const at = r.opted_out_at || r.updatedAt || r.updated_at || r.at;
                    const convId = r.conversation_id ?? (r.customer_phone ? r.id : null);
                    return (
                      <li key={r.id ?? i} className="wpb-list-row">
                        <div className="wpb-list-main">
                          <b>{name}</b>
                          <span>{[phone, r.brand || r.brand_name].filter(Boolean).join(' · ')}</span>
                        </div>
                        <div className="wpb-list-side">
                          {at && <span className="wpb-faint">{when(at)}</span>}
                          {convId && goTo && <button type="button" className="wpb-link" onClick={() => goTo('inbox', { conversationId: convId })}>Open chat</button>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
