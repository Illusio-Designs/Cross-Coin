import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   Quick replies — saved answers the team types often.
   GET/POST/PUT/DELETE /api/whatsapp/canned-responses
   Row: { id, shortcut ('/where'), title, body, category, uses }
   In a chat, typing "/" + shortcut inserts the body; placeholders
   ({name} {order} …) are filled from the customer's chat context.
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp/canned-responses';

const CATEGORIES = [
  { key: 'orders', label: 'Orders' },
  { key: 'returns', label: 'Returns' },
  { key: 'products', label: 'Products' },
  { key: 'other', label: 'Other' },
];
const TABS = [{ key: 'all', label: 'All' }, ...CATEGORIES];

const PLACEHOLDERS = ['{name}', '{order}', '{courier}', '{tracking_link}', '{brand}'];

const EMPTY = { shortcut: '', title: '', body: '', category: 'orders' };

const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const cleanKey = (s) => String(s || '').trim().replace(/^\/+/, '').toLowerCase().replace(/\s+/g, '-');
const catOf = (r) => (CATEGORIES.some((c) => c.key === r?.category) ? r.category : 'other');

function fillSample(text, brandName) {
  const sample = {
    '{name}': 'Riya',
    '{order}': 'CC-10482',
    '{courier}': 'Delhivery',
    '{tracking_link}': 'crosscoin.in/t/8F2K',
    '{brand}': brandName || 'Cross Coin',
  };
  let out = String(text || '');
  Object.keys(sample).forEach((k) => { out = out.split(k).join(sample[k]); });
  return out;
}

export default function QuickRepliesPage({ brandId = '', brands = [], isAdmin = false, goTo }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [selId, setSelId] = useState(null); // number | 'new' | null
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bodyRef = useRef(null);
  const editorRef = useRef(null);

  const brandName = useMemo(() => {
    const b = brands.find((x) => String(x.id) === String(brandId));
    return b?.name || brands[0]?.name || 'Cross Coin';
  }, [brands, brandId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = brandId ? { brandId } : {};
      const { data } = await adminApi.get(API, { params });
      const list = Array.isArray(data) ? data : (data?.cannedResponses || data?.rows || []);
      setRows(list);
      return list;
    } catch (e) {
      setError(errText(e, 'Could not load quick replies.'));
      setRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    load().then((list) => {
      if (list.length) pick(list[0]);
      else startNew();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    CATEGORIES.forEach((k) => { c[k.key] = 0; });
    rows.forEach((r) => { c[catOf(r)] += 1; });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const list = tab === 'all' ? rows : rows.filter((r) => catOf(r) === tab);
    return [...list].sort((a, b) => (Number(b.uses) || 0) - (Number(a.uses) || 0) || cleanKey(a.shortcut).localeCompare(cleanKey(b.shortcut)));
  }, [rows, tab]);

  const current = typeof selId === 'number' ? rows.find((r) => r.id === selId) : null;
  const dirty = selId === 'new'
    ? !!(form.shortcut || form.title || form.body)
    : !!current && (cleanKey(current.shortcut) !== cleanKey(form.shortcut) || (current.title || '') !== form.title
      || (current.body || '') !== form.body || catOf(current) !== form.category);

  function scrollToEditor() {
    if (typeof window !== 'undefined' && window.innerWidth < 900 && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function pick(r) {
    setSelId(r.id);
    setForm({ shortcut: cleanKey(r.shortcut), title: r.title || '', body: r.body || '', category: catOf(r) });
    setConfirmDel(false);
  }

  function startNew() {
    setSelId('new');
    setForm({ ...EMPTY, category: tab === 'all' ? 'orders' : tab });
    setConfirmDel(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function insertChip(token) {
    const el = bodyRef.current;
    setForm((f) => {
      const body = f.body || '';
      const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : body.length;
      const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        const pos = start + token.length;
        try { el.setSelectionRange(pos, pos); } catch { /* not focusable */ }
      });
      return { ...f, body: next };
    });
  }

  const key = cleanKey(form.shortcut);
  const keyTaken = !!key && rows.some((r) => cleanKey(r.shortcut) === key && r.id !== selId);
  const keyBad = !!key && !/^[a-z0-9_-]+$/.test(key);
  const canSave = !!key && !keyTaken && !keyBad && form.title.trim() && form.body.trim() && !saving;

  async function save(e) {
    e?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const payload = { shortcut: `/${key}`, title: form.title.trim(), body: form.body, category: form.category };
    try {
      if (selId === 'new') {
        const { data } = await adminApi.post(API, brandId ? { ...payload, brandId } : payload);
        showSuccess('saved', 'Quick reply added');
        const list = await load();
        const created = data?.cannedResponse || list.find((r) => cleanKey(r.shortcut) === key);
        if (created) pick(list.find((r) => r.id === created.id) || created);
      } else {
        await adminApi.put(`${API}/${selId}`, payload);
        showSuccess('updated', 'Quick reply saved');
        const list = await load();
        const again = list.find((r) => r.id === selId);
        if (again) pick(again);
      }
    } catch (err) {
      showError('saveFailed', errText(err, 'Could not save this quick reply.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (typeof selId !== 'number') return;
    setDeleting(true);
    try {
      await adminApi.delete(`${API}/${selId}`);
      showSuccess('deleted', 'Quick reply deleted');
      const list = await load();
      if (list.length) pick(list[0]); else startNew();
    } catch (err) {
      showError('deleteFailed', errText(err, 'Could not delete this quick reply.'));
    } finally {
      setDeleting(false);
      setConfirmDel(false);
    }
  }

  return (
    <div className="wpb-page">
      <header className="wpb-head">
        <div className="wpb-head-text">
          <h1 className="wpb-title">Quick replies</h1>
          <p className="wpb-sub">
            Answers you type often. In any chat, type <b className="wpb-mono">/</b> and the shortcut — the customer’s name and order fill in by themselves.
          </p>
        </div>
        <button type="button" className="wpb-btn" onClick={() => { startNew(); scrollToEditor(); }}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} /> New quick reply
        </button>
      </header>

      <div className="wpb-split">
        <div className="wpb-split-main">
          <div className="wpb-chips" role="tablist" aria-label="Topic">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                className={`wpb-chip${tab === t.key ? ' is-on' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}{!loading && <span className="wpb-chip-n">{counts[t.key] || 0}</span>}
              </button>
            ))}
          </div>

          <section className="wpb-card wpb-card--flush" aria-busy={loading}>
            {loading ? (
              <div className="wpb-skel-list" aria-label="Loading quick replies">
                {[0, 1, 2, 3, 4].map((i) => <div key={i} className="wpb-skel-row"><span /><span /></div>)}
              </div>
            ) : error ? (
              <div className="wpb-state wpb-state--error" role="alert">
                <b>Couldn’t load quick replies</b>
                <span>{error}</span>
                <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={load}>
                  <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} /> Try again
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="wpb-state">
                <b>{rows.length ? 'Nothing in this topic yet' : 'No quick replies yet'}</b>
                <span>{rows.length ? 'Pick another topic, or add one here.' : 'Add the answers your team types most — “Where is my order”, “How to return”…'}</span>
                <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => { startNew(); scrollToEditor(); }}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} /> New quick reply
                </button>
              </div>
            ) : (
              <ul className="wpb-qr-list">
                {visible.map((r) => (
                  <li key={r.id}>
                    <button type="button" className={`wpb-qr-row${selId === r.id ? ' is-sel' : ''}`}
                      aria-current={selId === r.id ? 'true' : undefined}
                      onClick={() => { pick(r); scrollToEditor(); }}>
                      <span className="wpb-qr-key">/{cleanKey(r.shortcut)}</span>
                      <span className="wpb-qr-mid">
                        <b>{r.title || 'Untitled'}</b>
                        <span className="wpb-qr-text">{r.body}</span>
                      </span>
                      <span className="wpb-qr-uses">{Number(r.uses) || 0} {Number(r.uses) === 1 ? 'use' : 'uses'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="wpb-split-side" ref={editorRef}>
          <form className="wpb-card wpb-form" onSubmit={save}>
            <span className="wpb-eyebrow">{selId === 'new' ? 'New quick reply' : 'Edit'}</span>

            <label className="wpb-field">Shortcut
              <span className="wpb-prefix-input">
                <span aria-hidden="true">/</span>
                <input className="wpb-input wpb-mono" value={form.shortcut} onChange={set('shortcut')}
                  placeholder="where" aria-label="Shortcut" autoComplete="off" maxLength={40} />
              </span>
              {keyTaken && <span className="wpb-field-err">Another quick reply already uses /{key}.</span>}
              {keyBad && <span className="wpb-field-err">Use only letters, numbers, - or _.</span>}
            </label>

            <label className="wpb-field">Title
              <input className="wpb-input" value={form.title} onChange={set('title')} placeholder="Where is my order" maxLength={100} />
            </label>

            <div className="wpb-field">
              <span>Topic</span>
              <div className="wpb-chips" role="radiogroup" aria-label="Topic">
                {CATEGORIES.map((c) => (
                  <button key={c.key} type="button" role="radio" aria-checked={form.category === c.key}
                    className={`wpb-chip wpb-chip--sm${form.category === c.key ? ' is-on' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, category: c.key }))}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="wpb-field">Message
              <textarea ref={bodyRef} className="wpb-input wpb-textarea" rows={6} value={form.body} onChange={set('body')}
                placeholder="Hi {name}, your order {order} is with {courier}. Track it here: {tracking_link}" />
            </label>

            <div className="wpb-insert">
              <span>Insert:</span>
              {PLACEHOLDERS.map((p) => (
                <button key={p} type="button" className="wpb-token" onClick={() => insertChip(p)}>{p}</button>
              ))}
            </div>

            <span className="wpb-eyebrow">Looks like this for Riya (example)</span>
            <div className="wpb-qr-preview">
              <div className="wpb-qr-bubble">{form.body.trim() ? fillSample(form.body, brandName) : <span className="wpb-faint">Your message will show here.</span>}</div>
            </div>

            {confirmDel ? (
              <div className="wpb-confirm" role="alertdialog" aria-label="Delete quick reply">
                <span>Delete <b className="wpb-mono">/{cleanKey(current?.shortcut)}</b>? The team won’t be able to use it any more.</span>
                <div className="wpb-actions">
                  <button type="button" className="wpb-btn wpb-btn--danger-solid" onClick={remove} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button type="button" className="wpb-btn wpb-btn--ghost" onClick={() => setConfirmDel(false)} disabled={deleting}>Keep it</button>
                </div>
              </div>
            ) : (
              <div className="wpb-actions">
                <button type="submit" className="wpb-btn" disabled={!canSave || (!dirty && selId !== 'new')}>
                  {saving ? 'Saving…' : selId === 'new' ? 'Add quick reply' : 'Save'}
                </button>
                {typeof selId === 'number' && (
                  <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--danger" onClick={() => setConfirmDel(true)}>Delete</button>
                )}
                {selId === 'new' && rows.length > 0 && (
                  <button type="button" className="wpb-btn wpb-btn--ghost" onClick={() => pick(visible[0] || rows[0])}>Cancel</button>
                )}
                {dirty && typeof selId === 'number' && <span className="wpb-hint">Unsaved changes</span>}
              </div>
            )}
          </form>

          <section className="wpb-card wpb-note">
            <b>Shared by all brands</b>
            <span>
              <span className="wpb-mono">{'{brand}'}</span> becomes {brands.length ? `${brands.slice(0, 2).map((b) => b.name).join(', ')} or whichever store` : 'the store'} the customer bought from, so one reply works everywhere.
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}
