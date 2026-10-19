import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, Search01Icon, Alert02Icon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { showError, showSuccess } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   New broadcast — pick who gets it, an approved template, and when.

   GET  /api/whatsapp/broadcasts/audience?type=&brandId=  → { count, opted_out }
        types: all | buyers_90 | delivered_happy | cart_7d | lapsed_60
   GET  /api/whatsapp/templates[?brandId=]  → { templates:[…] } (approved only used)
   POST /api/whatsapp/broadcasts { name, template_name, audience:{ type, brandId },
        scheduled_at|null }  — camelCase twins are sent too for the old controller.
   Messages only go out 10:00–20:00 IST; opted-out customers are always skipped.
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp';
const AUDIENCES = [
  { type: 'all', title: 'Everyone who can get messages', desc: 'All customers who messaged or ordered and didn’t reply STOP' },
  { type: 'buyers_90', title: 'Bought in the last 90 days', desc: 'At least one order placed in the last 90 days' },
  { type: 'delivered_happy', title: 'Happy customers', desc: 'Have a delivered order and no return or RTO' },
  { type: 'cart_7d', title: 'Left a cart this week', desc: 'Added items but didn’t order in the last 7 days' },
  { type: 'lapsed_60', title: 'Haven’t ordered in 60+ days', desc: 'Bought before, quiet since' },
];

const toNum = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const num = (v) => (toNum(v) === null ? '—' : toNum(v).toLocaleString('en-IN'));
const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const humanize = (name) => String(name || '')
  .replace(/_v\d+$/i, '')
  .replace(/_/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^\w/, (c) => c.toUpperCase());

const normStatus = (s) => {
  const k = String(s || '').toLowerCase();
  if (k === 'approved') return 'approved';
  if (k === 'pending' || k === 'in_appeal' || k === 'pending_deletion') return 'pending';
  if (k === 'rejected' || k === 'disabled' || k === 'paused') return 'rejected';
  return 'missing';
};
const normTemplate = (t) => {
  const comps = Array.isArray(t.components) ? t.components : [];
  const comp = (type) => comps.find((c) => String(c.type).toUpperCase() === type) || null;
  const rawButtons = Array.isArray(t.buttons) ? t.buttons : (comp('BUTTONS')?.buttons || []);
  const header = t.header ?? comp('HEADER');
  return {
    name: t.name,
    title: t.title || humanize(t.name),
    category: String(t.category || '').toLowerCase(),
    status: normStatus(t.status),
    body: t.body ?? comp('BODY')?.text ?? '',
    header: typeof header === 'string' ? header : (header?.format && header.format !== 'TEXT' ? `[${String(header.format).toLowerCase()}]` : (header?.text || '')),
    footer: t.footer ?? comp('FOOTER')?.text ?? '',
    buttons: rawButtons.map((b) => (typeof b === 'string' ? b : b?.text)).filter(Boolean),
  };
};
const countVars = (text) => new Set((String(text || '').match(/\{\{\s*\d+\s*\}\}/g) || []).map((m) => m.replace(/\s/g, ''))).size;

// "{{1}}" → a highlighted token so staff see what fills in.
function Filled({ text }) {
  const parts = String(text || '').split(/(\{\{\s*\d+\s*\}\})/g);
  return parts.map((p, i) => {
    const m = p.match(/^\{\{\s*(\d+)\s*\}\}$/);
    if (!m) return <React.Fragment key={i}>{p}</React.Fragment>;
    return <span key={i} className="wpa-var">{m[1] === '1' ? 'customer name' : `blank ${m[1]}`}</span>;
  });
}

// ── IST time helpers ──
const IST_PARTS = (d) => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const g = (t) => f.find((x) => x.type === t)?.value;
  const hour = g('hour') === '24' ? '00' : g('hour');
  return { y: g('year'), m: g('month'), d: g('day'), h: hour, min: g('minute') };
};
const istInputValue = (d) => { const p = IST_PARTS(d); return `${p.y}-${p.m}-${p.d}T${p.h}:${p.min}`; };
const fromIstInput = (v) => { if (!v) return null; const d = new Date(`${v}:00+05:30`); return Number.isNaN(d.getTime()) ? null : d; };
const inWindow = (d) => { const p = IST_PARTS(d); const mins = Number(p.h) * 60 + Number(p.min); return mins >= 600 && mins <= 1200; };
const fmtIst = (d) => d.toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
});
const defaultSchedule = () => {
  // Tomorrow 11:00 IST.
  const p = IST_PARTS(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return `${p.y}-${p.m}-${p.d}T11:00`;
};

export default function NewBroadcastPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  const [brand, setBrand] = useState(brandId ? String(brandId) : 'all');
  const [audience, setAudience] = useState('buyers_90');
  const [counts, setCounts] = useState({}); // type → { loading, count, opted_out, error }
  const [templates, setTemplates] = useState(null);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState('');
  const [tplQuery, setTplQuery] = useState('');
  const [tplName, setTplName] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [mode, setMode] = useState('now');
  const [schedAt, setSchedAt] = useState(defaultSchedule);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const countReq = useRef(0);

  // ── Audience counts (all five, refreshed when the brand changes) ──
  const loadCounts = useCallback(async () => {
    const id = ++countReq.current;
    setCounts(Object.fromEntries(AUDIENCES.map((a) => [a.type, { loading: true }])));
    await Promise.all(AUDIENCES.map(async (a) => {
      try {
        const params = { type: a.type };
        if (brand !== 'all') params.brandId = brand;
        const res = await adminApi.get(`${API}/broadcasts/audience`, { params });
        if (id !== countReq.current) return;
        const body = res.data || {};
        if (body.success === false) throw new Error(body.message || 'Could not count');
        setCounts((prev) => ({ ...prev, [a.type]: { loading: false, count: toNum(body.count) ?? 0, opted_out: toNum(body.opted_out) ?? 0 } }));
      } catch (e) {
        if (id !== countReq.current) return;
        setCounts((prev) => ({ ...prev, [a.type]: { loading: false, error: errMsg(e, 'Could not count') } }));
      }
    }));
  }, [brand]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  // ── Approved templates ──
  const loadTemplates = useCallback(async () => {
    setTplLoading(true); setTplError('');
    try {
      const params = {};
      if (brandId) params.brandId = brandId;
      const res = await adminApi.get(`${API}/templates`, { params });
      const body = res.data || {};
      if (body.success === false) throw new Error(body.message || 'Could not load templates');
      const list = (Array.isArray(body.templates) ? body.templates : []).map(normTemplate).filter((t) => t.status === 'approved' && t.name);
      // Marketing templates first — they are what broadcasts are meant for.
      list.sort((a, b) => (a.category === 'marketing' ? 0 : 1) - (b.category === 'marketing' ? 0 : 1) || a.title.localeCompare(b.title));
      setTemplates(list);
    } catch (e) {
      setTplError(errMsg(e, 'Could not load templates'));
    } finally {
      setTplLoading(false);
    }
  }, [brandId]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const tpl = useMemo(() => (templates || []).find((t) => t.name === tplName) || null, [templates, tplName]);
  const shownTemplates = useMemo(() => {
    const q = tplQuery.trim().toLowerCase();
    if (!q) return templates || [];
    return (templates || []).filter((t) => t.title.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q));
  }, [templates, tplQuery]);

  // Auto-name the broadcast from the template until the user types their own.
  useEffect(() => {
    if (nameTouched || !tpl) return;
    const d = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
    setName(`${tpl.title} · ${d}`);
  }, [tpl, nameTouched]);

  // Anything that changes what will be sent drops the confirm step.
  useEffect(() => { setConfirming(false); setSubmitError(''); }, [brand, audience, tplName, mode, schedAt]);

  const picked = counts[audience] || {};
  const recipients = picked.count;
  const vars = tpl ? countVars(tpl.body) : 0;
  const brandLabel = brand === 'all' ? 'All brands' : (brands.find((b) => String(b.id) === brand)?.name || `Brand ${brand}`);
  const audienceTitle = AUDIENCES.find((a) => a.type === audience)?.title || '';

  const schedDate = mode === 'schedule' ? fromIstInput(schedAt) : null;
  let schedProblem = '';
  if (mode === 'schedule') {
    if (!schedDate) schedProblem = 'Pick a date and time.';
    else if (schedDate.getTime() <= Date.now() + 60 * 1000) schedProblem = 'Pick a time in the future.';
    else if (!inWindow(schedDate)) schedProblem = 'Pick a time between 10:00 am and 8:00 pm (India time).';
  }
  const nowOutside = mode === 'now' && !inWindow(new Date());

  const blocker = !tpl ? 'Pick a message first.'
    : picked.loading ? 'Counting customers…'
      : picked.error ? "Couldn't count customers for this audience."
        : !recipients ? 'Nobody in this audience can get messages right now.'
          : !name.trim() ? 'Give this broadcast a name.'
            : schedProblem || '';

  const submit = async () => {
    if (blocker || sending) return;
    setSending(true); setSubmitError('');
    const brandIdNum = brand === 'all' ? null : Number(brand);
    const scheduledIso = mode === 'schedule' && schedDate ? schedDate.toISOString() : null;
    const audienceObj = { type: audience, brandId: brandIdNum };
    const payload = {
      name: name.trim(),
      template_name: tpl.name,
      audience: audienceObj,
      scheduled_at: scheduledIso,
      // Same values under the names the current controller reads.
      templateName: tpl.name,
      audienceFilter: audienceObj,
      scheduledAt: scheduledIso,
    };
    if (brandIdNum !== null) payload.brandId = brandIdNum;
    try {
      const res = await adminApi.post(`${API}/broadcasts`, payload);
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'Could not create the broadcast');
      showSuccess('saved', mode === 'schedule'
        ? `Scheduled for ${fmtIst(schedDate)}.`
        : `Broadcast created for ${num(recipients)} customers.`);
      if (typeof goTo === 'function') goTo('broadcasts');
    } catch (e) {
      const msg = errMsg(e, 'Could not create the broadcast');
      setSubmitError(msg);
      showError('sendFailed', msg);
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const minInput = istInputValue(new Date());

  return (
    <div className="wpa-page">
      <header className="wpa-head">
        <div className="wpa-head-text">
          <h1 className="wpa-title">New broadcast</h1>
          <p className="wpa-sub">Pick who gets it, the approved template, and when. Customers who replied STOP are always left out.</p>
        </div>
        {typeof goTo === 'function' && (
          <button type="button" className="wpa-back" onClick={() => goTo('broadcasts')}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={2} /> Broadcasts
          </button>
        )}
      </header>

      <div className="wpa-split">
        <div className="wpa-main">
          {/* 1 · Who gets it */}
          <section className="wpa-card wpa-card--pad" aria-labelledby="wpa-nb-who">
            <h2 className="wpa-h2" id="wpa-nb-who">1 · Who gets it</h2>
            <div className="wpa-tabs" role="group" aria-label="Brand">
              <button type="button" className="wpa-chip" aria-pressed={brand === 'all' ? 'true' : 'false'} onClick={() => setBrand('all')}>All brands</button>
              {brands.map((b) => (
                <button key={b.id} type="button" className="wpa-chip" aria-pressed={brand === String(b.id) ? 'true' : 'false'}
                  onClick={() => setBrand(String(b.id))}>
                  {b.name}
                </button>
              ))}
            </div>
            <div className="wpa-aud" role="radiogroup" aria-label="Audience">
              {AUDIENCES.map((a) => {
                const c = counts[a.type] || {};
                const on = audience === a.type;
                return (
                  <button key={a.type} type="button" role="radio" aria-checked={on ? 'true' : 'false'} className="wpa-aud-card"
                    onClick={() => setAudience(a.type)}>
                    <span className="wpa-aud-top">
                      <span className="wpa-aud-title">{a.title}</span>
                      <span className="wpa-aud-count" aria-live="polite">
                        {c.loading ? <span className="wpa-skel" style={{ width: 36, height: 12 }} aria-label="Counting" />
                          : c.error ? <span className="wpa-faint" title={c.error}>—</span>
                            : num(c.count)}
                      </span>
                    </span>
                    <span className="wpa-aud-desc">{a.desc}</span>
                  </button>
                );
              })}
            </div>
            {Object.values(counts).some((c) => c && c.error) && (
              <div className="wpa-btn-row">
                <span className="wpa-note wpa-note--bad">Some counts couldn't load.</span>
                <button type="button" className="wpa-btn wpa-btn--sm" onClick={loadCounts}>Try again</button>
              </div>
            )}
          </section>

          {/* 2 · Message */}
          <section className="wpa-card wpa-card--pad" aria-labelledby="wpa-nb-msg">
            <div className="wpa-toolbar">
              <h2 className="wpa-h2" id="wpa-nb-msg">2 · Message</h2>
              {(templates || []).length > 8 && (
                <div className="wpa-search">
                  <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={2} />
                  <input type="search" className="wpa-input" placeholder="Search templates" aria-label="Search templates"
                    value={tplQuery} onChange={(e) => setTplQuery(e.target.value)} />
                </div>
              )}
            </div>
            {tplLoading && !templates ? (
              <div className="wpa-btn-row" aria-busy="true" aria-label="Loading templates">
                {[120, 150, 110].map((w, i) => <span key={i} className="wpa-skel" style={{ width: w, height: 40, borderRadius: 10 }} />)}
              </div>
            ) : tplError ? (
              <div className="wpa-btn-row" role="alert">
                <span className="wpa-note wpa-note--bad">Couldn't load templates. {tplError}</span>
                <button type="button" className="wpa-btn wpa-btn--sm" onClick={loadTemplates}>Try again</button>
              </div>
            ) : (templates || []).length === 0 ? (
              <div className="wpa-btn-row">
                <span className="wpa-note">No approved templates yet. Create one and wait for WhatsApp to approve it.</span>
                {typeof goTo === 'function' && (
                  <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => goTo('templates')}>Go to templates</button>
                )}
              </div>
            ) : (
              <div className="wpa-tpick" role="group" aria-label="Approved templates">
                {shownTemplates.length === 0 && <span className="wpa-note">No template matches “{tplQuery}”.</span>}
                {shownTemplates.map((t) => (
                  <button key={t.name} type="button" className="wpa-tchip" aria-pressed={tplName === t.name ? 'true' : 'false'}
                    onClick={() => setTplName(t.name)}>
                    {t.title}
                    <small>{t.name}</small>
                  </button>
                ))}
              </div>
            )}
            <p className="wpa-note">
              Only templates WhatsApp has approved can be broadcast. The customer’s name fills in automatically.
            </p>
            {tpl && vars > 1 && (
              <p className="wpa-note wpa-note--warn">
                <HugeiconsIcon icon={Alert02Icon} size={14} strokeWidth={2} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                This template has {vars} blanks, but only the customer’s name fills in by itself. WhatsApp may refuse it —
                a template with just the name blank works best for broadcasts.
              </p>
            )}
            <div className="wpa-field">
              <label htmlFor="wpa-nb-name">Broadcast name <span className="wpa-faint">(only your team sees this)</span></label>
              <input id="wpa-nb-name" className="wpa-input" value={name} maxLength={120}
                placeholder="e.g. Diwali sale — 30% off"
                onChange={(e) => { setName(e.target.value); setNameTouched(true); }} />
            </div>
          </section>

          {/* 3 · When */}
          <section className="wpa-card wpa-card--pad" aria-labelledby="wpa-nb-when">
            <h2 className="wpa-h2" id="wpa-nb-when">3 · When</h2>
            <div className="wpa-btn-row" role="group" aria-label="When to send">
              <button type="button" className="wpa-chip" aria-pressed={mode === 'now' ? 'true' : 'false'}
                onClick={() => setMode('now')}>Send now</button>
              <button type="button" className="wpa-chip" aria-pressed={mode === 'schedule' ? 'true' : 'false'}
                onClick={() => setMode('schedule')}>Schedule</button>
              <span className="wpa-note">Messages go out between 10 am and 8 pm (India time) only.</span>
            </div>
            {mode === 'schedule' && (
              <div className="wpa-field" style={{ maxWidth: 320 }}>
                <label htmlFor="wpa-nb-at">Date and time (India time)</label>
                <input id="wpa-nb-at" type="datetime-local" className="wpa-input" value={schedAt} min={minInput} step={300}
                  aria-invalid={schedProblem ? 'true' : 'false'}
                  onChange={(e) => setSchedAt(e.target.value)} />
                {schedProblem
                  ? <span className="wpa-error-text">{schedProblem}</span>
                  : schedDate && <span className="wpa-hint">Starts {fmtIst(schedDate)}.</span>}
              </div>
            )}
            {nowOutside && (
              <p className="wpa-note wpa-note--warn">It’s outside 10 am – 8 pm right now, so messages will start going out at 10 am.</p>
            )}
          </section>
        </div>

        <aside className="wpa-aside wpa-aside--sticky">
          <section className="wpa-card wpa-card--pad" aria-label="Preview">
            <span className="wpa-eyebrow">Preview</span>
            <div className="wpa-phone">
              {tpl ? (
                <>
                  <div className="wpa-bubble">
                    {tpl.header && <div className="wpa-bubble-head"><Filled text={tpl.header} /></div>}
                    <Filled text={tpl.body || '(no text)'} />
                    {tpl.footer && <div className="wpa-bubble-foot">{tpl.footer}</div>}
                  </div>
                  {tpl.buttons.map((b, i) => <span key={i} className="wpa-bubble-btn">{b}</span>)}
                </>
              ) : (
                <span className="wpa-note">Pick a message to see how it looks.</span>
              )}
            </div>
          </section>

          <section className="wpa-card wpa-card--pad" aria-label="Summary">
            <div className="wpa-kvs">
              <div className="wpa-kv"><span>Brand</span><b>{brandLabel}</b></div>
              <div className="wpa-kv"><span>Audience</span><b>{audienceTitle}</b></div>
              <div className="wpa-kv"><span>Recipients</span><b>{picked.loading ? '…' : num(recipients)}</b></div>
              <div className="wpa-kv"><span>Left out (replied STOP)</span><b>{picked.loading ? '…' : num(picked.opted_out)}</b></div>
              <div className="wpa-kv"><span>When</span><b>{mode === 'now' ? 'Now' : (schedDate && !schedProblem ? fmtIst(schedDate) : '—')}</b></div>
              <div className="wpa-kv"><span>WhatsApp fee</span><b>charged per message</b></div>
            </div>

            {confirming ? (
              <div className="wpa-confirm" role="alertdialog" aria-label="Confirm broadcast">
                <span>
                  {mode === 'now' ? 'Send' : 'Schedule'} <b>“{tpl?.title}”</b> to <b>{num(recipients)} customers</b>
                  {mode === 'schedule' && schedDate ? <> for <b>{fmtIst(schedDate)}</b></> : null}?
                  {mode === 'now' ? ' Once it starts it can’t be stopped.' : ' You can cancel it until it starts.'}
                </span>
                <div className="wpa-confirm-actions">
                  <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setConfirming(false)} disabled={sending}>Go back</button>
                  <button type="button" className="wpa-btn wpa-btn--sm wpa-btn--primary" onClick={submit} disabled={sending}>
                    {sending ? 'Working…' : mode === 'now' ? 'Yes, send it' : 'Yes, schedule it'}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--lg" disabled={!!blocker}
                onClick={() => setConfirming(true)}>
                {mode === 'now' ? 'Send' : 'Schedule'} to {picked.loading || recipients == null ? '…' : num(recipients)} customer{recipients === 1 ? '' : 's'}
              </button>
            )}
            {blocker && !confirming && <span className="wpa-hint">{blocker}</span>}
            {submitError && <span className="wpa-error-text" role="alert">{submitError}</span>}
            <span className="wpa-note">You’ll see sent, delivered, read and orders from this broadcast on the Broadcasts page.</span>
          </section>
        </aside>
      </div>
    </div>
  );
}
