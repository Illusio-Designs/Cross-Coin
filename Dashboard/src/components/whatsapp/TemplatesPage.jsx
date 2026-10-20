import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, Add01Icon, Search01Icon, Alert02Icon, Delete02Icon, Copy01Icon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { showError, showSuccess } from '../../utils/toastNotification';
import { Skeleton, SkeletonList, SkeletonText } from '../ui';

/* ──────────────────────────────────────────────────────────────
   Templates — the pre-approved messages WhatsApp lets a store use to
   start a chat or write after 24 hours of silence.

   GET    /api/whatsapp/templates[?brandId=][&force=1]
          → { templates:[{ name, title, category, language, status:
              approved|pending|rejected|missing, components | body/buttons,
              rejected_reason, used_by, read_rate }] }
          force=1 asks WhatsApp again instead of the 60-second cache
          ("Check status with WhatsApp" — read-only, never re-submits).
   POST   /api/whatsapp/templates            { brandId, name, category, language, components }
   POST   /api/whatsapp/templates/submit-missing   (admin) — all missing defaults
   POST   /api/whatsapp/templates/seed { names:[name] } (admin) — one missing default
   DELETE /api/whatsapp/templates/:name
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp';

const STATUS = {
  approved: { label: 'Approved', cls: 'ok' },
  pending: { label: 'Waiting for WhatsApp', cls: 'wait' },
  rejected: { label: 'Rejected', cls: 'bad' },
  missing: { label: 'Not submitted', cls: 'none' },
};
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Waiting' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'missing', label: 'Not submitted' },
];
const CATEGORY_LABEL = { utility: 'Utility', marketing: 'Marketing', authentication: 'Login code' };
const LANG_LABEL = { en: 'English', en_us: 'English (US)', en_gb: 'English (UK)', hi: 'Hindi' };
const REJECT_REASON = {
  ABUSIVE_CONTENT: 'the wording looked spammy or aggressive',
  INVALID_FORMAT: 'the format is invalid — check the blanks like {{1}}',
  SCAM: 'it looked like a possible scam',
  PROMOTIONAL: 'it is too promotional for its category',
  TAG_CONTENT_MISMATCH: 'the wording doesn’t match the chosen category',
  INCORRECT_CATEGORY: 'it was put in the wrong category',
};

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
const rejectText = (r) => {
  if (!r || r === 'NONE') return '';
  return REJECT_REASON[r] || String(r).replace(/_/g, ' ').toLowerCase();
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
    language: t.language || 'en',
    status: normStatus(t.status),
    body: t.body ?? comp('BODY')?.text ?? '',
    header: typeof header === 'string' ? header : (header?.format && header.format !== 'TEXT' ? `[${String(header.format).toLowerCase()}]` : (header?.text || '')),
    footer: t.footer ?? comp('FOOTER')?.text ?? '',
    buttons: rawButtons.map((b) => (typeof b === 'string' ? b : b?.text)).filter(Boolean),
    usedBy: t.used_by || '',
    readRate: t.read_rate,
    rejectedReason: rejectText(t.rejected_reason),
  };
};
const varNumbers = (text) => [...new Set((String(text || '').match(/\{\{\s*\d+\s*\}\}/g) || []).map((m) => Number(m.replace(/[^\d]/g, ''))))].sort((a, b) => a - b);
const fmtRate = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' && !Number.isFinite(Number(v))) return v;
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n <= 1 && n > 0 ? n * 100 : n)}%`;
};

function Filled({ text }) {
  const parts = String(text || '').split(/(\{\{\s*\d+\s*\}\})/g);
  return parts.map((p, i) => (/^\{\{\s*\d+\s*\}\}$/.test(p)
    ? <span key={i} className="wpa-var">{p.replace(/\s/g, '')}</span>
    : <React.Fragment key={i}>{p}</React.Fragment>));
}

function Preview({ header, body, footer, buttons }) {
  return (
    <div className="wpa-phone">
      <div className="wpa-bubble">
        {header && <div className="wpa-bubble-head"><Filled text={header} /></div>}
        {body ? <Filled text={body} /> : <span className="wpa-faint">Your message appears here.</span>}
        {footer && <div className="wpa-bubble-foot">{footer}</div>}
      </div>
      {(buttons || []).filter(Boolean).map((b, i) => <span key={i} className="wpa-bubble-btn">{b}</span>)}
    </div>
  );
}

// ── New template form ──────────────────────────────────────────
const EMPTY_BUTTON = { type: 'QUICK_REPLY', text: '', value: '' };
const emptyForm = () => ({ name: '', category: 'MARKETING', language: 'en', body: '', footer: '', examples: {}, buttons: [] });
const slug = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 512);

function validateForm(f) {
  const errs = {};
  if (!f.name) errs.name = 'Give it a name.';
  else if (!/^[a-z0-9_]+$/.test(f.name)) errs.name = 'Use lowercase letters, numbers and _ only.';
  const body = f.body.trim();
  if (!body) errs.body = 'Write the message.';
  else if (body.length > 1024) errs.body = 'Keep it under 1,024 characters.';
  else {
    const nums = varNumbers(body);
    if (nums.some((n, i) => n !== i + 1)) errs.body = 'Number the blanks in order: {{1}}, {{2}}, {{3}}…';
    else if (/^\{\{\s*\d+\s*\}\}/.test(body) || /\{\{\s*\d+\s*\}\}\s*$/.test(body)) errs.body = 'WhatsApp doesn’t allow a blank at the very start or end of the message.';
    else if (nums.some((n) => !String(f.examples[n] || '').trim())) errs.examples = 'Give an example for every blank — WhatsApp checks these.';
  }
  if (f.footer.length > 60) errs.footer = 'Keep the footer under 60 characters.';
  f.buttons.forEach((b, i) => {
    if (!b.text.trim()) errs[`btn${i}`] = 'Button text is needed.';
    else if (b.text.length > 25) errs[`btn${i}`] = 'Button text must be 25 characters or less.';
    else if (b.type === 'URL' && !/^https?:\/\/\S+\.\S+/.test(b.value.trim())) errs[`btn${i}`] = 'Enter a full link starting with https://';
    else if (b.type === 'PHONE_NUMBER' && b.value.replace(/\D/g, '').length < 10) errs[`btn${i}`] = 'Enter a phone number with at least 10 digits.';
  });
  return errs;
}

function buildComponents(f) {
  const body = f.body.trim();
  const nums = varNumbers(body);
  const bodyComp = { type: 'BODY', text: body };
  if (nums.length) bodyComp.example = { body_text: [nums.map((n) => String(f.examples[n]).trim())] };
  const comps = [bodyComp];
  if (f.footer.trim()) comps.push({ type: 'FOOTER', text: f.footer.trim() });
  if (f.buttons.length) {
    comps.push({
      type: 'BUTTONS',
      buttons: f.buttons.map((b) => {
        if (b.type === 'URL') return { type: 'URL', text: b.text.trim(), url: b.value.trim() };
        if (b.type === 'PHONE_NUMBER') {
          const digits = b.value.replace(/\D/g, '');
          return { type: 'PHONE_NUMBER', text: b.text.trim(), phone_number: `+${digits.length === 10 ? `91${digits}` : digits}` };
        }
        return { type: 'QUICK_REPLY', text: b.text.trim() };
      }),
    });
  }
  return comps;
}

function NewTemplateForm({ initial, brandId, onCancel, onCreated }) {
  const [f, setF] = useState(initial || emptyForm());
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const bodyRef = useRef(null);
  const errs = validateForm(f);
  const show = (k) => touched && errs[k];
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const nums = varNumbers(f.body);

  const addBlank = () => {
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const el = bodyRef.current;
    const token = `{{${next}}}`;
    if (el && typeof el.selectionStart === 'number') {
      const s = el.selectionStart; const e = el.selectionEnd;
      const v = f.body.slice(0, s) + token + f.body.slice(e);
      set('body', v);
      requestAnimationFrame(() => { try { el.focus(); el.setSelectionRange(s + token.length, s + token.length); } catch { /* ignore */ } });
    } else {
      set('body', `${f.body}${token}`);
    }
  };
  const setBtn = (i, k, v) => setF((p) => ({ ...p, buttons: p.buttons.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true); setServerError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = { name: f.name, category: f.category, language: f.language, components: buildComponents(f) };
      if (brandId) payload.brandId = brandId;
      const res = await adminApi.post(`${API}/templates`, payload);
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'WhatsApp did not accept it');
      showSuccess('saved', 'Sent to WhatsApp for approval. It usually takes a few minutes to a few hours.');
      onCreated(f.name);
    } catch (err) {
      setServerError(errMsg(err, 'WhatsApp did not accept it'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wpa-split">
      <form className="wpa-main wpa-card wpa-card--pad wpa-form" onSubmit={submit} noValidate aria-labelledby="wpa-nt-title">
        <h2 className="wpa-h2" id="wpa-nt-title">New template</h2>
        <p className="wpa-note">WhatsApp reviews every template before it can be used. Plain, helpful wording gets approved fastest.</p>
        <div className="wpa-row">
          <div className="wpa-field">
            <label htmlFor="wpa-nt-name">Name</label>
            <input id="wpa-nt-name" className="wpa-input" value={f.name} placeholder="e.g. festive_sale_offer"
              aria-invalid={show('name') ? 'true' : 'false'}
              onChange={(e) => set('name', slug(e.target.value))} />
            {show('name') ? <span className="wpa-error-text">{errs.name}</span> : <span className="wpa-hint">Lowercase letters, numbers and _ only. Customers never see it.</span>}
          </div>
          <div className="wpa-field">
            <label htmlFor="wpa-nt-cat">Type</label>
            <select id="wpa-nt-cat" className="wpa-select" value={f.category} onChange={(e) => set('category', e.target.value)}>
              <option value="MARKETING">Marketing — offers, sales, news</option>
              <option value="UTILITY">Utility — order and account updates</option>
            </select>
          </div>
          <div className="wpa-field" style={{ flex: '0 1 160px' }}>
            <label htmlFor="wpa-nt-lang">Language</label>
            <select id="wpa-nt-lang" className="wpa-select" value={f.language} onChange={(e) => set('language', e.target.value)}>
              <option value="en">English</option>
              <option value="en_US">English (US)</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
        </div>

        <div className="wpa-field">
          <div className="wpa-toolbar">
            <label htmlFor="wpa-nt-body">Message</label>
            <button type="button" className="wpa-btn wpa-btn--sm" onClick={addBlank}>+ Add a blank</button>
          </div>
          <textarea id="wpa-nt-body" ref={bodyRef} className="wpa-textarea" rows={6} value={f.body} maxLength={1100}
            placeholder={'Hi {{1}}, our sale is live — up to 30% off till Sunday.'}
            aria-invalid={show('body') ? 'true' : 'false'}
            onChange={(e) => set('body', e.target.value)} />
          {show('body') ? <span className="wpa-error-text">{errs.body}</span>
            : <span className="wpa-hint">Blanks like {'{{1}}'} are filled in when the message is sent — {'{{1}}'} is usually the customer’s name. {f.body.length}/1024</span>}
        </div>

        {nums.length > 0 && (
          <fieldset className="wpa-fieldset">
            <legend>Example for each blank</legend>
            <div className="wpa-row">
              {nums.map((n) => (
                <div className="wpa-field" key={n}>
                  <label htmlFor={`wpa-nt-ex${n}`}>{`{{${n}}}`}</label>
                  <input id={`wpa-nt-ex${n}`} className="wpa-input" value={f.examples[n] || ''}
                    placeholder={n === 1 ? 'Riya' : 'example'}
                    onChange={(e) => setF((p) => ({ ...p, examples: { ...p.examples, [n]: e.target.value } }))} />
                </div>
              ))}
            </div>
            {show('examples') && <span className="wpa-error-text">{errs.examples}</span>}
          </fieldset>
        )}

        <div className="wpa-field">
          <label htmlFor="wpa-nt-foot">Small print at the bottom <span className="wpa-faint">(optional)</span></label>
          <input id="wpa-nt-foot" className="wpa-input" value={f.footer} maxLength={80}
            placeholder="Reply STOP to stop these messages"
            aria-invalid={show('footer') ? 'true' : 'false'}
            onChange={(e) => set('footer', e.target.value)} />
          {show('footer') && <span className="wpa-error-text">{errs.footer}</span>}
        </div>

        <fieldset className="wpa-fieldset">
          <legend>Buttons <span className="wpa-faint">(up to 3, optional)</span></legend>
          {f.buttons.length === 0 && <span className="wpa-hint">No buttons. Customers can still reply by typing.</span>}
          {f.buttons.map((b, i) => (
            <div key={i}>
              <div className="wpa-btn-def">
                <select className="wpa-select" aria-label={`Button ${i + 1} type`} value={b.type} onChange={(e) => setBtn(i, 'type', e.target.value)}>
                  <option value="QUICK_REPLY">Quick reply</option>
                  <option value="URL">Open a link</option>
                  <option value="PHONE_NUMBER">Call a number</option>
                </select>
                <input className="wpa-input" aria-label={`Button ${i + 1} text`} placeholder="Button text" maxLength={25}
                  value={b.text} onChange={(e) => setBtn(i, 'text', e.target.value)} />
                {b.type === 'QUICK_REPLY' ? <span className="wpa-hint">Sends this text back as the reply.</span> : (
                  <input className="wpa-input" aria-label={`Button ${i + 1} ${b.type === 'URL' ? 'link' : 'phone number'}`}
                    placeholder={b.type === 'URL' ? 'https://…' : '10-digit number'}
                    inputMode={b.type === 'URL' ? 'url' : 'tel'}
                    value={b.value} onChange={(e) => setBtn(i, 'value', e.target.value)} />
                )}
                <button type="button" className="wpa-btn wpa-btn--sm wpa-btn--ghost" aria-label={`Remove button ${i + 1}`}
                  onClick={() => setF((p) => ({ ...p, buttons: p.buttons.filter((_, j) => j !== i) }))}>Remove</button>
              </div>
              {show(`btn${i}`) && <span className="wpa-error-text">{errs[`btn${i}`]}</span>}
            </div>
          ))}
          {f.buttons.length < 3 && (
            <div>
              <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setF((p) => ({ ...p, buttons: [...p.buttons, { ...EMPTY_BUTTON }] }))}>
                + Add a button
              </button>
            </div>
          )}
        </fieldset>

        {serverError && <div className="wpa-banner wpa-banner--danger" role="alert"><span className="wpa-banner-text">WhatsApp said: {serverError}</span></div>}

        <div className="wpa-btn-row">
          <button type="submit" className="wpa-btn wpa-btn--primary" disabled={saving}>{saving ? 'Sending…' : 'Send to WhatsApp for approval'}</button>
          <button type="button" className="wpa-btn" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>

      <aside className="wpa-aside wpa-aside--sticky">
        <section className="wpa-card wpa-card--pad" aria-label="Preview">
          <span className="wpa-eyebrow">Preview</span>
          <Preview body={f.body} footer={f.footer} buttons={f.buttons.map((b) => b.text)} />
        </section>
      </aside>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function TemplatesPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState('view'); // view | new
  const [draft, setDraft] = useState(null);
  const [checking, setChecking] = useState(false);
  const [submittingMissing, setSubmittingMissing] = useState(false);
  const [confirmMissing, setConfirmMissing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const reqRef = useRef(0);
  const detailRef = useRef(null);

  const load = useCallback(async ({ force = false } = {}) => {
    const id = ++reqRef.current;
    setLoading(true); setError('');
    try {
      const params = {};
      if (brandId) params.brandId = brandId;
      if (force) params.force = 1;
      const res = await adminApi.get(`${API}/templates`, { params, timeout: 30000 });
      if (id !== reqRef.current) return false;
      const body = res.data || {};
      if (body.success === false) throw new Error(body.message || 'Could not load templates');
      setList((Array.isArray(body.templates) ? body.templates : []).map(normTemplate).filter((t) => t.name));
      return true;
    } catch (e) {
      if (id !== reqRef.current) return false;
      setError(errMsg(e, 'Could not load templates'));
      return false;
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: 0, approved: 0, pending: 0, rejected: 0, missing: 0 };
    (list || []).forEach((t) => { c.all += 1; c[t.status] += 1; });
    return c;
  }, [list]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (list || []).filter((t) => (tab === 'all' || t.status === tab)
      && (!term || t.title.toLowerCase().includes(term) || t.name.toLowerCase().includes(term) || t.body.toLowerCase().includes(term)));
  }, [list, tab, q]);

  // Keep a valid selection: the picked one if still visible, else the first row.
  useEffect(() => {
    if (!visible.length) return;
    if (!visible.some((t) => t.name === selected)) setSelected(visible[0].name);
  }, [visible, selected]);
  useEffect(() => { setConfirmDelete(false); }, [selected]);

  const sel = (list || []).find((t) => t.name === selected) || null;
  const missing = (list || []).filter((t) => t.status === 'missing');

  const pick = (name) => {
    setSelected(name);
    if (typeof window !== 'undefined' && window.innerWidth <= 920 && detailRef.current) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const checkStatus = async () => {
    setChecking(true);
    const ok = await load({ force: true });
    setChecking(false);
    if (ok) showSuccess('updated', 'Statuses are up to date with WhatsApp.');
  };

  const summarize = (data, fallback) => {
    const s = data?.summary || {};
    const created = s.created ?? s.submitted;
    if (created !== undefined) {
      const failed = s.failed || 0;
      const errs = (data.results || []).filter((r) => r.status === 'error').map((r) => `${r.name}: ${r.error}`);
      return { ok: failed === 0, text: `Sent ${created} for approval${failed ? ` · ${failed} failed — ${errs.join(' | ')}` : ''}.` };
    }
    return { ok: true, text: data?.message || fallback };
  };

  const submitMissing = async () => {
    setSubmittingMissing(true);
    try {
      const res = await adminApi.post(`${API}/templates/submit-missing`, brandId ? { brandId } : {}, { timeout: 60000 });
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'Could not submit');
      const r = summarize(res.data, 'Sent to WhatsApp for approval.');
      (r.ok ? showSuccess : showError)(r.ok ? 'saved' : 'saveFailed', r.text);
      setConfirmMissing(false);
      load({ force: true });
    } catch (e) {
      showError('saveFailed', `Couldn't submit: ${errMsg(e, 'please try again')}`);
    } finally {
      setSubmittingMissing(false);
    }
  };

  const submitOne = async (t) => {
    setBusy(true);
    try {
      const body = { names: [t.name] };
      if (brandId) body.brandId = brandId;
      const res = await adminApi.post(`${API}/templates/seed`, body, { timeout: 60000 });
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'Could not submit');
      const r = summarize(res.data, 'Sent to WhatsApp for approval.');
      (r.ok ? showSuccess : showError)(r.ok ? 'saved' : 'saveFailed', r.text);
      load({ force: true });
    } catch (e) {
      showError('saveFailed', `Couldn't submit “${t.title}”: ${errMsg(e, 'please try again')}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (t) => {
    setBusy(true);
    try {
      const res = await adminApi.delete(`${API}/templates/${encodeURIComponent(t.name)}`, { params: brandId ? { brandId } : {} });
      if (res.data && res.data.success === false) throw new Error(res.data.message || 'Could not delete');
      showSuccess('deleted', `“${t.title}” was deleted.`);
      setConfirmDelete(false);
      setList((prev) => (prev || []).filter((x) => x.name !== t.name));
      load({ force: true });
    } catch (e) {
      showError('deleteFailed', `Couldn't delete: ${errMsg(e, 'please try again')}`);
    } finally {
      setBusy(false);
    }
  };

  const makeCopy = (t) => {
    const nums = varNumbers(t.body);
    setDraft({
      ...emptyForm(),
      name: slug(`${t.name.replace(/_v\d+$/i, '')}_copy`),
      category: t.category === 'utility' ? 'UTILITY' : 'MARKETING',
      language: t.language === 'en_US' || t.language === 'hi' ? t.language : 'en',
      body: t.body,
      footer: t.footer,
      examples: Object.fromEntries(nums.map((n) => [n, n === 1 ? 'Riya' : ''])),
      buttons: t.buttons.slice(0, 3).map((text) => ({ type: 'QUICK_REPLY', text: String(text).slice(0, 25), value: '' })),
    });
    setMode('new');
  };

  if (mode === 'new') {
    return (
      <div className="wpa-page">
        <header className="wpa-head">
          <div className="wpa-head-text">
            <h1 className="wpa-title">Templates</h1>
            <p className="wpa-sub">Write the message, then send it to WhatsApp for approval.</p>
          </div>
          <button type="button" className="wpa-back" onClick={() => { setMode('view'); setDraft(null); }}>← All templates</button>
        </header>
        <NewTemplateForm
          initial={draft}
          brandId={brandId}
          onCancel={() => { setMode('view'); setDraft(null); }}
          onCreated={(name) => { setMode('view'); setDraft(null); setTab('all'); setQ(''); setSelected(name); load({ force: true }); }}
        />
      </div>
    );
  }

  const note = (t) => {
    if (t.status === 'approved') return { cls: '', text: 'Approved templates can’t be edited — make a copy to change the wording.' };
    if (t.status === 'pending') return { cls: 'wpa-note--warn', text: 'Usually approved within a few hours. Press “Check status with WhatsApp” to see the latest.' };
    if (t.status === 'rejected') {
      return {
        cls: 'wpa-note--bad',
        text: `${t.rejectedReason ? `WhatsApp said ${t.rejectedReason}.` : 'WhatsApp didn’t give a reason.'} ${t.usedBy ? 'Make a copy with new wording, then delete this one.' : 'Not in use — safe to delete.'}`,
      };
    }
    return { cls: '', text: 'Ready-made wording. Submit it and the automatic message starts once WhatsApp approves it.' };
  };

  const first = loading && !list;

  return (
    <div className="wpa-page">
      <header className="wpa-head">
        <div className="wpa-head-text">
          <h1 className="wpa-title">Templates</h1>
          <p className="wpa-sub">Pre-approved messages. WhatsApp only lets you start a chat, or write after 24 hours of silence, with one of these.</p>
        </div>
        <div className="wpa-head-actions">
          <button type="button" className="wpa-btn" onClick={checkStatus} disabled={checking || loading}>
            <HugeiconsIcon icon={RefreshIcon} size={15} strokeWidth={2} />
            {checking ? 'Checking…' : 'Check status with WhatsApp'}
          </button>
          <button type="button" className="wpa-btn wpa-btn--primary" onClick={() => { setDraft(null); setMode('new'); }}>
            <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
            New template
          </button>
        </div>
      </header>

      {missing.length > 0 && (
        <section className="wpa-banner" role="status">
          <span className="wpa-banner-text">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            <b>{missing.length} ready-made template{missing.length === 1 ? ' isn’t' : 's aren’t'} set up yet</b>
            {': '}{missing.slice(0, 4).map((t) => t.title).join(', ')}{missing.length > 4 ? ` and ${missing.length - 4} more` : ''}.
            {' '}The automatic messages that use them stay off until WhatsApp approves them.
            {!isAdmin && ' Ask an admin to submit them.'}
          </span>
          {isAdmin && (confirmMissing ? (
            <span className="wpa-confirm-actions">
              <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setConfirmMissing(false)} disabled={submittingMissing}>Not now</button>
              <button type="button" className="wpa-btn wpa-btn--sm wpa-btn--primary" onClick={submitMissing} disabled={submittingMissing}>
                {submittingMissing ? 'Submitting…' : `Yes, submit ${missing.length}`}
              </button>
            </span>
          ) : (
            <button type="button" className="wpa-btn wpa-btn--primary" onClick={() => setConfirmMissing(true)}>
              Submit the {missing.length} missing
            </button>
          ))}
        </section>
      )}

      <div className="wpa-split">
        <div className="wpa-main">
          <div className="wpa-toolbar">
            <div className="wpa-tabs" role="tablist" aria-label="Status">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" className="wpa-tab" aria-selected={tab === t.key ? 'true' : 'false'}
                  onClick={() => setTab(t.key)}>
                  {t.label} <span className="wpa-tab-n">{list ? counts[t.key] : ''}</span>
                </button>
              ))}
            </div>
            <div className="wpa-search">
              <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={2} />
              <input type="search" className="wpa-input" placeholder="Search templates" aria-label="Search templates"
                value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <section className={`wpa-card${loading && list ? ' is-stale' : ''}`} aria-label="Templates" aria-busy={loading || undefined}>
            {error ? (
              <div className="wpa-state wpa-state--error" role="alert">
                <span>Couldn't load templates. {error}</span>
                <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => load()}>Try again</button>
              </div>
            ) : first ? (
              <SkeletonList rows={7} label="Loading templates…" />
            ) : visible.length === 0 ? (
              <div className="wpa-state">
                {(list || []).length === 0
                  ? <><b>No templates yet.</b><span>Create one, or submit the ready-made ones, and WhatsApp will review them.</span></>
                  : <span>No templates match{q ? ` “${q}”` : ' this tab'}.</span>}
              </div>
            ) : (
              <div className="wpa-tlist">
                {visible.map((t) => {
                  const meta = STATUS[t.status];
                  return (
                    <button key={t.name} type="button" className="wpa-trow" aria-current={selected === t.name ? 'true' : undefined}
                      onClick={() => pick(t.name)}>
                      <span className="wpa-trow-main">
                        <span className="wpa-trow-title">{t.title}</span>
                        <span className="wpa-trow-meta">
                          {t.name} · {CATEGORY_LABEL[t.category] || t.category || '—'} · {LANG_LABEL[String(t.language).toLowerCase()] || t.language}
                        </span>
                      </span>
                      <span className="wpa-trow-used">{t.usedBy || (t.status === 'missing' ? 'Not in use until approved' : 'Not used by an automatic message')}</span>
                      <span className={`wpa-pill wpa-pill--${meta.cls}`}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="wpa-aside wpa-aside--sticky" ref={detailRef}>
          {sel ? (
            <section className="wpa-card wpa-card--pad" aria-label={`Template ${sel.title}`}>
              <div className="wpa-detail-head">
                <b>{sel.title}</b>
                <span className={`wpa-pill wpa-pill--${STATUS[sel.status].cls}`}>{STATUS[sel.status].label}</span>
              </div>
              <Preview header={sel.header} body={sel.body} footer={sel.footer} buttons={sel.buttons} />
              <div className="wpa-kvs">
                <div className="wpa-kv"><span>Name</span><span style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>{sel.name}</span></div>
                <div className="wpa-kv"><span>Type</span><span>{CATEGORY_LABEL[sel.category] || sel.category || '—'}</span></div>
                <div className="wpa-kv">
                  <span>Fills in</span>
                  <span>{(() => { const n = varNumbers(sel.body).length; return n ? `${n} blank${n === 1 ? '' : 's'}` : 'Nothing — same for everyone'; })()}</span>
                </div>
                <div className="wpa-kv"><span>Used by</span><span>{sel.usedBy || '—'}</span></div>
                <div className="wpa-kv"><span>Read rate · 30 days</span><span>{fmtRate(sel.readRate)}</span></div>
              </div>
              {(() => { const n = note(sel); return <p className={`wpa-note ${n.cls}`}>{n.text}</p>; })()}

              {confirmDelete ? (
                <div className="wpa-confirm" role="alertdialog" aria-label="Confirm delete">
                  <span>Delete <b>{sel.title}</b> from WhatsApp? WhatsApp blocks this exact name for about 4 weeks afterwards.</span>
                  <div className="wpa-confirm-actions">
                    <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep it</button>
                    <button type="button" className="wpa-btn wpa-btn--sm wpa-btn--danger-solid" onClick={() => deleteOne(sel)} disabled={busy}>
                      {busy ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wpa-btn-row">
                  {sel.status === 'missing' && (isAdmin ? (
                    <button type="button" className="wpa-btn wpa-btn--sm wpa-btn--primary" onClick={() => submitOne(sel)} disabled={busy}>
                      {busy ? 'Submitting…' : 'Submit for approval'}
                    </button>
                  ) : <span className="wpa-hint">An admin can submit this for approval.</span>)}
                  {(sel.status === 'approved' || sel.status === 'rejected') && (
                    <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => makeCopy(sel)}>
                      <HugeiconsIcon icon={Copy01Icon} size={14} strokeWidth={2} /> Make a copy
                    </button>
                  )}
                  {sel.status === 'rejected' && (
                    <button type="button" className="wpa-btn wpa-btn--sm wpa-btn--danger" onClick={() => setConfirmDelete(true)}>
                      <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} /> Delete
                    </button>
                  )}
                </div>
              )}
            </section>
          ) : first ? (
            <section className="wpa-card wpa-card--pad">
              <div className="wpa-detail-head" aria-hidden="true">
                <Skeleton w="55%" h={14} />
                <Skeleton w={72} h={20} r={999} />
              </div>
              <Skeleton h={150} r={12} />
              <SkeletonText lines={5} label="Loading template…" />
            </section>
          ) : (
            <section className="wpa-card">
              <div className="wpa-state">Pick a template to see it here.</div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
