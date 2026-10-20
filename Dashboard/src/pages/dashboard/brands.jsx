// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService, brandSettingsService, facebookCapiService } from '../../services';
import { PageHeader, StatusPill, EmptyState, ErrorState, Skeleton, SkeletonForm, ConfirmBar, Select } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { queryKeys } from '../../lib/queryClient';

/* ──────────────────────────────────────────────────────────────
   Brands — each store's name, contact, tax, keys and links as plain
   labelled forms (instead of a KEY = VALUE list).

   Admin:  GET  /api/admin/brand-settings/overview  (list + health dot)
           GET  /api/admin/brand-settings/form       (fields, secrets masked)
           PUT  /api/admin/brand-settings/form       (validated, logged)
   Others with the Brands view (product managers): brand record only,
           via the existing /api/admin/brands endpoints.
   The field catalogue (labels, tabs, rules) lives on the server
   (services/brandSettingsAdminService.js); unknown keys show under
   "Other settings". Styles: opsSettings.css (.oss-*).
   ────────────────────────────────────────────────────────────── */

const TABS_FALLBACK = [{ key: 'store', title: 'Store', help: 'How the store appears to shoppers.' }];
const BRAND_FIELDS = [
  { key: 'display_name', label: 'Store name', rule: 'required', hint: 'Shown to shoppers and in messages.' },
  { key: 'name', label: 'Internal name', rule: 'required' },
  { key: 'domain', label: 'Website address', rule: 'host', hint: 'e.g. mystore.in — used for message links and feeds.' },
  { key: 'contact_email', label: 'Support email', rule: 'email' },
  { key: 'contact_phone', label: 'Support phone', rule: 'phone' },
  { key: 'logo_url', label: 'Logo link', rule: 'url' },
  { key: 'primary_color', label: 'Main colour', rule: 'color', type: 'color' },
  { key: 'secondary_color', label: 'Second colour', rule: 'color', type: 'color' },
];
const NEW_BRAND = { name: '', display_name: '', slug: '', domain: '' };

// Same rules the server applies (services/brandSettingsAdminService.js) — for
// instant feedback; the server re-checks everything.
const STATES = ['andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal pradesh',
  'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
  'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'andaman and nicobar islands',
  'chandigarh', 'dadra and nagar haveli and daman and diu', 'delhi', 'jammu and kashmir', 'ladakh', 'lakshadweep', 'puducherry', 'new delhi',
  'j&k', 'jammu & kashmir', 'a&n islands', 'dadra and nagar haveli', 'daman and diu', 'pondicherry'];
const RULES = {
  required: (v) => (v ? null : 'This can’t be empty.'),
  digits: (v) => (/^\d+$/.test(v) ? null : 'Numbers only.'),
  pincode: (v) => (/^[1-9]\d{5}$/.test(v) ? null : 'Enter a 6-digit PIN code.'),
  gstin: (v) => (/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.toUpperCase()) ? null : 'A GSTIN is 15 characters, like 24ABCDE1234F1Z5.'),
  state: (v) => (STATES.includes(v.toLowerCase()) ? null : 'Enter an Indian state name, e.g. Gujarat.'),
  list: (v) => (/^[a-z0-9 ,._-]*$/i.test(v) ? null : 'Use courier names separated by commas.'),
  razorpayKey: (v) => (/^rzp_(live|test)_[A-Za-z0-9]{6,}$/.test(v) ? null : 'Razorpay key IDs start with rzp_live_ or rzp_test_.'),
  ga: (v) => (/^G-[A-Z0-9]{4,}$/i.test(v) ? null : 'Google Analytics IDs look like G-XXXXXXX.'),
  gtm: (v) => (/^GTM-[A-Z0-9]{4,}$/i.test(v) ? null : 'Tag Manager IDs look like GTM-XXXXXX.'),
  aw: (v) => (/^AW-\d{6,}$/i.test(v) ? null : 'Google Ads IDs look like AW-123456789.'),
  code: (v) => (/^[A-Z0-9_-]{2,40}$/i.test(v) ? null : 'Letters and numbers only, no spaces.'),
  host: (v) => (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v) ? null : 'Enter a website address like mystore.in.'),
  url: (v) => (/^https?:\/\/\S+$/i.test(v) ? null : 'Enter a full link starting with https://'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'Enter a valid email address.'),
  phone: (v) => (/^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g, '')) ? null : 'Enter a 10-digit Indian mobile number.'),
  color: (v) => (/^#[0-9a-f]{6}$/i.test(v) ? null : 'Use a colour like #1A2B3C.'),
};
function check(f, raw) {
  const v = String(raw ?? '').trim();
  if (v === '') return f.rule === 'required' ? RULES.required(v) : null;
  if (f.type === 'number') {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Enter a number.';
    if (f.min != null && n < f.min) return `Must be ${f.min} or more.`;
    if (f.max != null && n > f.max) return `Must be ${f.max} or less.`;
    return null;
  }
  return f.rule && RULES[f.rule] ? RULES[f.rule](v) : null;
}

const cleanHost = (d) => String(d || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const brandLabel = (b) => b.display_name || b.name;

// ⓘ next to a field label: "where do I find this?" (text from the backend).
function GuideButton({ f, open, onToggle }) {
  if (!f.guide) return null;
  return (
    <button type="button" className={`oss-info${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={`bf-${f.key}-guide`}
      aria-label={`Where to find ${f.label}`} title="Where to find this" onClick={onToggle}>i</button>
  );
}
const GuideText = ({ f, open }) => (f.guide && open ? <p id={`bf-${f.key}-guide`} className="oss-guide">{f.guide}</p> : null);

// ── One input, by field type ───────────────────────────────────────────────
function FieldInput({ f, value, onChange, secretState, onSecret, error, disabled }) {
  const id = `bf-${f.key}`;
  const [guideOpen, setGuideOpen] = useState(false);
  const toggleGuide = () => setGuideOpen((v) => !v);
  if (f.type === 'toggle') {
    const on = String(value) === 'true';
    return (
      <div className="oss-field oss-field--toggle">
        <span id={`${id}-l`}>{f.label} <GuideButton f={f} open={guideOpen} onToggle={toggleGuide} /></span>
        <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-l`} className={`oss-switch${on ? ' is-on' : ''}`}
          disabled={disabled} onClick={() => onChange(on ? 'false' : 'true')}><span /></button>
        <GuideText f={f} open={guideOpen} />
        {f.hint && <small>{f.hint}</small>}
      </div>
    );
  }
  let control;
  if (f.secret && !f.readOnly) {
    control = secretState === 'replace' ? (
      <span className="oss-inline">
        <input id={id} type="password" autoComplete="new-password" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
          placeholder="Paste the new value" aria-invalid={!!error} disabled={disabled} />
        <button type="button" className="oss-btn oss-btn--sm oss-btn--quiet" onClick={() => onSecret(null)}>Cancel</button>
      </span>
    ) : (
      <span className="oss-inline">
        <input id={id} value={secretState === 'remove' ? 'Will be removed on save' : (f.isSet ? f.value : 'Not set')} readOnly className="oss-masked" />
        <button type="button" className="oss-btn oss-btn--sm" disabled={disabled} onClick={() => onSecret('replace')}>{f.isSet ? 'Replace' : 'Add'}</button>
        {f.isSet && f.source === 'brand' && (secretState === 'remove'
          ? <button type="button" className="oss-btn oss-btn--sm oss-btn--quiet" onClick={() => onSecret(null)}>Keep</button>
          : <button type="button" className="oss-btn oss-btn--sm oss-btn--quiet" disabled={disabled} onClick={() => onSecret('remove')}>Remove</button>)}
      </span>
    );
  } else if (f.readOnly) {
    control = <input id={id} readOnly value={f.isSet ? f.value : 'Not set'} className="oss-masked" />;
  } else if (f.type === 'select') {
    control = (
      <Select value={value ?? ''} onChange={(v) => onChange(v ?? '')} disabled={disabled} placeholder={f.default ? `Default (${f.default})` : 'Not set'} options={[
        ...(!f.options.some(([o]) => o === value) ? [{ value: '', label: f.default ? `Default (${f.default})` : 'Not set' }] : []),
        ...f.options.map(([o, l]) => ({ value: o, label: l })),
      ]} />
    );
  } else if (f.type === 'textarea') {
    control = <textarea id={id} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} disabled={disabled} />;
  } else if (f.type === 'color') {
    control = (
      <span className="oss-inline">
        <input type="color" aria-label={`${f.label} picker`} value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#000000'} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        <input id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="#1A2B3C" aria-invalid={!!error} disabled={disabled} />
      </span>
    );
  } else {
    control = (
      <input id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} disabled={disabled}
        inputMode={f.type === 'number' || f.rule === 'digits' || f.rule === 'pincode' ? 'decimal' : undefined}
        placeholder={f.source === 'server' ? f.value : f.default ? `Default: ${f.default}` : undefined} />
    );
  }
  const note = error
    || (f.source === 'server' && !f.secret ? `Using the shared server value${f.hint ? ` · ${f.hint}` : ''}` : null)
    || (f.secret && f.source === 'server' ? 'Using the shared server value (Cross Coin’s)' : null)
    || (f.readOnly ? 'Managed on WhatsApp → Settings' : null)
    || f.hint;
  return (
    <div className={`oss-field${error ? ' is-bad' : ''}${f.type === 'textarea' ? ' oss-field--wide' : ''}`}>
      <span className="oss-label-row"><label htmlFor={id}>{f.label}</label><GuideButton f={f} open={guideOpen} onToggle={toggleGuide} /></span>
      <GuideText f={f} open={guideOpen} />
      {control}
      {note && <small>{note}</small>}
    </div>
  );
}

// ── Test buttons (only where a backend check exists) ───────────────────────
function SectionTest({ tab, brand, form }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [phone, setPhone] = useState('');
  useEffect(() => { setResult(null); }, [tab, brand?.id]);

  const run = async (fn) => {
    setBusy(true); setResult(null);
    try { setResult(await fn()); } catch (e) { setResult({ ok: false, message: e?.message || 'The check failed.' }); }
    finally { setBusy(false); }
  };
  let button = null;
  if (tab === 'payments') {
    button = <button type="button" className="oss-btn" disabled={busy} onClick={() => run(() => brandSettingsService.testRazorpay(brand.id))}>{busy ? 'Checking…' : 'Test Razorpay keys'}</button>;
  } else if (tab === 'store') {
    const has = form?.fields?.some((f) => f.key === 'ITHINK_PICKUP_ADDRESS_ID' && f.isSet);
    if (has) button = (
      <button type="button" className="oss-btn" disabled={busy} onClick={() => run(async () => {
        const r = await brandSettingsService.listIThinkWarehouses(brand.id);
        return { ok: !!r?.success, message: r?.success ? `iThink found pickup warehouse ${r.warehouse_id} for these keys.` : (r?.message || 'iThink didn’t find the warehouse.') };
      })}>{busy ? 'Checking…' : 'Check pickup warehouse'}</button>
    );
  } else if (tab === 'whatsapp') {
    button = (
      <span className="oss-inline oss-inline--test">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your WhatsApp number" inputMode="tel" aria-label="Phone number for the test message" />
        <button type="button" className="oss-btn" disabled={busy || phone.replace(/\D/g, '').length < 10}
          onClick={() => run(async () => {
            const r = await brandSettingsService.sendWhatsAppTest(brand.id, phone);
            return { ok: !!r?.success, message: r?.success ? `Test sent to ${r.sent_to || phone}.` : (r?.message || 'WhatsApp didn’t accept the test.') };
          })}>{busy ? 'Sending…' : 'Send me a test'}</button>
      </span>
    );
  } else if (tab === 'tracking') {
    button = (
      <span className="oss-inline oss-inline--test">
        <button type="button" className="oss-btn" disabled={busy} onClick={() => run(async () => {
          const r = await facebookCapiService.runTest(brand.slug);
          const got = r?.result?.events_received;
          return { ok: !!got, message: got ? `Meta received the test event — the pixel and token work.` : (r?.error || r?.message || 'Meta didn’t confirm the test event — check the pixel ID and token.') };
        })}>{busy ? 'Checking…' : 'Check Meta pixel'}</button>
        <button type="button" className="oss-btn" disabled={busy} onClick={() => run(async () => {
          const r = await brandSettingsService.testMetaAds(brand.id);
          return { ok: !!r?.ok, message: r?.message || 'Meta didn’t answer — try again in a minute.' };
        })}>{busy ? 'Checking…' : 'Check ad account access'}</button>
      </span>
    );
  }
  if (!button) return null;
  return (
    <div className="oss-test">
      {button}
      {result && <span role="status" className={result.ok ? 'oss-ok' : 'oss-bad'}>{result.ok ? '✓ ' : ''}{result.message}</span>}
    </div>
  );
}

// ── "Other settings": stored keys with no form field ───────────────────────
function OtherSettings({ form, draft, setDraft, removed, setRemoved, errors }) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [confirmKey, setConfirmKey] = useState(null);
  const other = form?.other || [];
  const added = Object.keys(draft).filter((k) => k.startsWith('new:'));
  return (
    <details className="oss-card oss-other">
      <summary><b>Other settings</b> <span className="mut">· {other.length} saved · advanced</span></summary>
      <p className="mut oss-small">Settings this store has that aren’t in the forms above. SEO, the company GSTIN and the pickup schedule are edited on their own pages.</p>
      {other.length === 0 && added.length === 0 && <p className="mut oss-small">Nothing else is saved for this store.</p>}
      <div className="oss-grid">
        {other.map((o) => (
          <div key={o.key} className={`oss-field${errors[o.key] ? ' is-bad' : ''}`}>
            <label htmlFor={`of-${o.key}`}>{o.label || <span className="oss-mono">{o.key}</span>}</label>
            {o.secret ? (
              <input id={`of-${o.key}`} readOnly value={o.value} className="oss-masked" />
            ) : (
              <input id={`of-${o.key}`} value={draft[o.key] ?? o.value} onChange={(e) => setDraft((d) => ({ ...d, [o.key]: e.target.value }))} disabled={removed.has(o.key)} />
            )}
            <small>
              {errors[o.key] || (o.label ? <span className="oss-mono">{o.key}</span> : o.description) || ''}
              {' '}
              {removed.has(o.key)
                ? <button type="button" className="oss-link" onClick={() => setRemoved((s) => { const n = new Set(s); n.delete(o.key); return n; })}>Keep it</button>
                : <button type="button" className="oss-link" onClick={() => setConfirmKey(o.key)}>Remove</button>}
            </small>
            {confirmKey === o.key && (
              <ConfirmBar message={<>Remove <b>{o.key}</b> when you save? The backend falls back to its default.</>} confirmLabel="Remove" cancelLabel="Keep"
                onCancel={() => setConfirmKey(null)} onConfirm={() => { setRemoved((s) => new Set(s).add(o.key)); setConfirmKey(null); }} />
            )}
          </div>
        ))}
        {added.map((k) => (
          <div key={k} className="oss-field">
            <label><span className="oss-mono">{k.slice(4)}</span> <StatusPill tone="progress" size="sm">new</StatusPill></label>
            <input value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} />
            <small><button type="button" className="oss-link" onClick={() => setDraft((d) => { const n = { ...d }; delete n[k]; return n; })}>Don’t add</button></small>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="oss-inline oss-add">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} placeholder="KEY, e.g. GTM_ID" aria-label="New setting key" className="oss-mono" />
          <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="Value" aria-label="New setting value" />
          <button type="button" className="oss-btn oss-btn--sm" disabled={!newKey || other.some((o) => o.key === newKey) || (form?.fields || []).some((f) => f.key === newKey)}
            onClick={() => { setDraft((d) => ({ ...d, [`new:${newKey}`]: newVal })); setNewKey(''); setNewVal(''); setAdding(false); }}>Add</button>
          <button type="button" className="oss-btn oss-btn--sm oss-btn--quiet" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="oss-btn oss-btn--sm" onClick={() => setAdding(true)}>+ Add a setting</button>
      )}
    </details>
  );
}

// ── Recent changes ─────────────────────────────────────────────────────────
function RecentChanges({ brandId, initial }) {
  // page 0 = the latest 8 that came with the form; "Show older" pages through 20 at a time.
  const [rows, setRows] = useState(initial || []);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState((initial || []).length >= 8);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setRows(initial || []); setPage(0); setMore((initial || []).length >= 8); }, [initial]);
  const loadMore = async () => {
    setLoading(true);
    try {
      const next = page + 1;
      const list = (await brandSettingsService.getAudit(brandId, next))?.rows || [];
      setRows((prev) => (next === 1 ? list : [...prev, ...list]));
      setPage(next);
      setMore(list.length >= 20);
    } catch (e) { showError('auditFailed', e?.message || 'Couldn’t load older changes.'); }
    finally { setLoading(false); }
  };
  if (!rows.length) return <p className="mut oss-small">No changes recorded yet. Every save from now on is logged with who made it.</p>;
  return (
    <>
      <ul className="oss-audit">
        {rows.map((r) => (
          <li key={r.id}>
            <span className="mut oss-nowrap">{fmtWhen(r.created_at)}</span>
            <span><b>{r.user_name || 'Someone'}</b> {r.action === 'delete' ? 'removed' : r.action === 'create' ? 'set' : 'changed'} <span className="oss-mono">{r.setting_key}</span>
              {r.action !== 'delete' && r.new_value != null && <> to <q>{r.new_value}</q></>}
              {r.action === 'update' && r.old_value != null && <span className="mut"> (was <q>{r.old_value}</q>)</span>}
            </span>
          </li>
        ))}
      </ul>
      {more && <button type="button" className="oss-btn oss-btn--sm oss-btn--quiet" disabled={loading} onClick={loadMore}>{loading ? 'Loading…' : 'Show older changes'}</button>}
    </>
  );
}

export function BrandManager() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('store');
  const [draft, setDraft] = useState({});           // settings KEY -> value (and 'new:KEY' for added "other" keys)
  const [brandDraft, setBrandDraft] = useState({}); // brand record field -> value
  const [secrets, setSecrets] = useState({});       // KEY -> 'replace' | 'remove'
  const [removed, setRemoved] = useState(new Set()); // "other" keys to remove
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);     // 'delete' | 'discard:<id>'
  const [creating, setCreating] = useState(false);
  const [newBrand, setNewBrand] = useState(NEW_BRAND);
  const [newErrors, setNewErrors] = useState({});

  // Brand list: admins get health from the settings overview; others the plain list.
  const listQuery = useQuery({
    queryKey: isAdmin ? ['brandSettingsOverview'] : queryKeys.brandsAdmin,
    queryFn: async () => {
      if (isAdmin) return (await brandSettingsService.getOverview()).brands || [];
      const r = await brandService.getAllBrands(true);
      return r?.success ? r.data : [];
    },
    staleTime: 30 * 1000,
  });
  const brands = listQuery.data || [];
  const brand = brands.find((b) => b.id === selectedId) || brands[0] || null;
  useEffect(() => { if (!selectedId && brands[0]) setSelectedId(brands[0].id); }, [brands, selectedId]);

  const formQuery = useQuery({
    queryKey: ['brandSettingsForm', brand?.id],
    queryFn: () => brandSettingsService.getForm(brand.id),
    enabled: !!brand && isAdmin,
    staleTime: 30 * 1000,
  });
  const form = formQuery.data;
  const sections = isAdmin ? (form?.sections || TABS_FALLBACK) : TABS_FALLBACK;
  const warnings = isAdmin ? (form?.warnings || brand?.warnings || []) : [];
  const fieldsByTab = useMemo(() => {
    const m = {};
    for (const f of form?.fields || []) (m[f.tab] = m[f.tab] || []).push(f);
    return m;
  }, [form]);
  const brandRecord = form?.brand || brand || {};

  const resetDrafts = () => { setDraft({}); setBrandDraft({}); setSecrets({}); setRemoved(new Set()); setErrors({}); };
  const dirtyCount = Object.keys(draft).length + Object.keys(brandDraft).length
    + Object.values(secrets).filter((v) => v === 'remove').length + removed.size;

  const pickBrand = (id) => {
    if (id === brand?.id) return;
    if (dirtyCount) { setConfirm(`discard:${id}`); return; }
    resetDrafts(); setConfirm(null); setSelectedId(id);
  };

  const fieldValue = (f) => (f.key in draft ? draft[f.key] : (f.source === 'brand' ? f.value : ''));
  const setField = (key, v) => {
    setDraft((d) => ({ ...d, [key]: v }));
    setErrors((e) => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; });
  };
  const brandValue = (k) => (k in brandDraft ? brandDraft[k] : (brandRecord[k] ?? ''));
  const setBrandField = (k, v) => {
    setBrandDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => { if (!e[`brand.${k}`]) return e; const n = { ...e }; delete n[`brand.${k}`]; return n; });
  };

  const save = async () => {
    // Client-side checks first.
    const errs = {};
    const values = {};
    for (const [k, v] of Object.entries(draft)) {
      const key = k.startsWith('new:') ? k.slice(4) : k;
      const f = (form?.fields || []).find((x) => x.key === key);
      if (f?.secret && !String(v).trim()) continue; // "Replace" opened but left empty = keep
      const err = f ? check(f, v) : null;
      if (err) errs[key] = err; else values[key] = v;
    }
    const brandIn = {};
    for (const [k, v] of Object.entries(brandDraft)) {
      const f = BRAND_FIELDS.find((x) => x.key === k);
      const err = f ? check(f, v) : null;
      if (err) errs[`brand.${k}`] = err; else brandIn[k] = v;
    }
    setErrors(errs);
    if (Object.keys(errs).length) { showError('fixFields', 'Some fields need fixing — they’re marked in orange.'); return; }
    const remove = [...removed, ...Object.entries(secrets).filter(([, s]) => s === 'remove').map(([k]) => k)];

    setSaving(true);
    try {
      if (isAdmin) {
        const res = await brandSettingsService.saveForm(brand.id, { values, remove, brand: Object.keys(brandIn).length ? brandIn : undefined });
        queryClient.setQueryData(['brandSettingsForm', brand.id], res);
      } else {
        await brandService.updateBrand(brand.id, { ...brandIn, ...(brandIn.domain !== undefined ? { domain: cleanHost(brandIn.domain) } : {}), slug: brand.slug });
      }
      resetDrafts();
      showSuccess('brandSaved', `Saved ${brandLabel(brandRecord)}`);
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['brandSettingsOverview'] : queryKeys.brandsAdmin });
      if (isAdmin) queryClient.invalidateQueries({ queryKey: queryKeys.brandsAdmin });
    } catch (e) {
      if (e?.errors) setErrors(e.errors);
      showError('brandSaveFailed', e?.message || 'Couldn’t save — try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    try {
      await brandService.toggleBrandStatus(brand.id);
      showSuccess('brandStatusUpdated', brand.status === 'active' ? `${brandLabel(brand)} is now hidden from shoppers` : `${brandLabel(brand)} is live again`);
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['brandSettingsOverview'] : queryKeys.brandsAdmin });
      queryClient.invalidateQueries({ queryKey: ['brandSettingsForm', brand.id] });
    } catch (e) { showError('updateFailed', e?.message || 'Couldn’t change the status.'); }
  };
  const deleteBrand = async () => {
    setSaving(true);
    try {
      await brandService.deleteBrand(brand.id);
      showSuccess('brandDeleted', `${brandLabel(brand)} deleted`);
      setConfirm(null); resetDrafts(); setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['brandSettingsOverview'] : queryKeys.brandsAdmin });
    } catch (e) { showError('deleteFailed', e?.message || 'Couldn’t delete the brand.'); }
    finally { setSaving(false); }
  };
  const createBrand = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newBrand.name.trim()) errs.name = 'Give the brand a name.';
    if (newBrand.domain.trim() && RULES.host(newBrand.domain.trim())) errs.domain = RULES.host('');
    if (newBrand.slug && !/^[a-z0-9-]+$/.test(newBrand.slug)) errs.slug = 'Lowercase letters, numbers and dashes only.';
    setNewErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const r = await brandService.createBrand({ ...newBrand, display_name: newBrand.display_name || newBrand.name, domain: cleanHost(newBrand.domain) || undefined, slug: newBrand.slug || undefined, status: 'active' });
      showSuccess('brandCreated', `${newBrand.name} added`);
      setCreating(false); setNewBrand(NEW_BRAND);
      await queryClient.invalidateQueries({ queryKey: isAdmin ? ['brandSettingsOverview'] : queryKeys.brandsAdmin });
      if (r?.data?.id) { resetDrafts(); setSelectedId(r.data.id); setTab('store'); }
    } catch (err) { showError('saveFailed', err?.message || 'Couldn’t add the brand.'); }
  };

  const copy = (t) => { try { navigator.clipboard?.writeText(t); showSuccess('copied', 'Copied'); } catch { /* clipboard blocked */ } };
  const host = cleanHost(brandRecord.domain);
  const tabWarn = (k) => warnings.filter((w) => w.tab === k);
  const section = sections.find((s) => s.key === tab) || sections[0];
  const tabFields = fieldsByTab[section.key] || [];
  const groups = [];
  for (const f of tabFields) {
    const g = f.group || '';
    let entry = groups.find((x) => x.name === g);
    if (!entry) groups.push(entry = { name: g, fields: [] });
    entry.fields.push(f);
  }
  const warnFor = (key) => warnings.find((w) => w.field === key)?.text;

  return (
    <div className="dashboard-sections obz-rep oss">
      <PageHeader
        title="Brands"
        description="Each store’s name, contact, tax and keys — plain forms instead of key = value lists."
        actions={<button type="button" className="oss-btn oss-btn--main" onClick={() => setCreating((v) => !v)}>{creating ? 'Close' : '+ Add brand'}</button>}
      />

      {creating && (
        <form className="oss-card oss-create" onSubmit={createBrand}>
          <b className="oss-h2">New brand</b>
          <div className="oss-grid">
            {[['name', 'Brand name', 'e.g. Soxbae'], ['display_name', 'Store name shoppers see', 'Empty = brand name'], ['domain', 'Website address', 'e.g. soxbaesocks.com'], ['slug', 'Short code', 'Empty = made from the name. The storefront uses it to find its brand.']].map(([k, label, hint]) => (
              <div key={k} className={`oss-field${newErrors[k] ? ' is-bad' : ''}`}>
                <label htmlFor={`nb-${k}`}>{label}</label>
                <input id={`nb-${k}`} value={newBrand[k]} onChange={(e) => setNewBrand((b) => ({ ...b, [k]: e.target.value }))} />
                <small>{newErrors[k] || hint}</small>
              </div>
            ))}
          </div>
          <div className="oss-row-end">
            <button type="button" className="oss-btn oss-btn--quiet" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="oss-btn oss-btn--main">Add brand</button>
          </div>
        </form>
      )}

      {listQuery.isLoading ? (
        <div className="oss-split" role="status" aria-busy="true">
          <span className="ds-sr-only">Loading brands…</span>
          <nav className="oss-card oss-brandlist" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="oss-brand"><Skeleton w={['70%', '55%', '62%', '48%'][i]} h={12} /></span>
            ))}
          </nav>
          <div className="oss-main" aria-hidden="true">
            <div className="oss-brandhead">
              <div><Skeleton w={180} h={18} /><Skeleton w={240} h={11} style={{ marginTop: 6 }} /></div>
              <div className="oss-inline"><Skeleton w={52} h={24} r={12} /><Skeleton w={84} h={30} r={8} /><Skeleton w={60} h={30} r={8} /></div>
            </div>
            <div className="oss-tabs">{[64, 84, 72, 90].map((w, i) => <Skeleton key={i} w={w} h={36} r={18} />)}</div>
            <section className="oss-card oss-section">
              <div className="oss-section-head"><Skeleton w={90} h={14} /><Skeleton w={220} h={11} /></div>
              <SkeletonForm fields={6} className="oss-grid" />
            </section>
          </div>
        </div>
      ) : listQuery.error && !brands.length ? (
        <ErrorState message={`Couldn’t load brands — ${listQuery.error?.message || 'the server didn’t answer'}.`} onRetry={listQuery.refetch} retrying={listQuery.isFetching} />
      ) : !brand ? (
        <EmptyState title="No brands yet" description="Add your first brand to start selling under it." action={<button type="button" className="oss-btn oss-btn--main" onClick={() => setCreating(true)}>+ Add brand</button>} />
      ) : (
        <div className="oss-split">
          <nav aria-label="Brands" className="oss-card oss-brandlist">
            {brands.map((b) => {
              const n = b.warnings?.length || 0;
              return (
                <button key={b.id} type="button" aria-current={b.id === brand.id ? 'true' : undefined} className={`oss-brand${b.id === brand.id ? ' is-on' : ''}`} onClick={() => pickBrand(b.id)}>
                  <span className="oss-brand-name">{brandLabel(b)}{b.status !== 'active' && <span className="mut"> · hidden</span>}</span>
                  {isAdmin && <span className={`oss-dot ${n ? 'is-warn' : 'is-ok'}`} title={n ? `${n} thing${n === 1 ? '' : 's'} need attention` : 'All set'} aria-label={n ? `${n} warnings` : 'All set'} />}
                </button>
              );
            })}
          </nav>

          <div className="oss-main">
            {confirm?.startsWith('discard:') && (
              <ConfirmBar
                message={<>You have {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'} for <b>{brandLabel(brandRecord)}</b>. Switch brand and lose them?</>}
                confirmLabel="Discard changes" cancelLabel="Keep editing"
                onCancel={() => setConfirm(null)}
                onConfirm={() => { const id = Number(confirm.slice(8)); resetDrafts(); setConfirm(null); setSelectedId(id); }}
              />
            )}

            <div className="oss-brandhead">
              <div>
                <b className="oss-h1">{brandLabel(brandRecord)}</b>
                <span className="mut oss-small">{host || 'no website address'} · code <span className="oss-mono">{brandRecord.slug}</span></span>
              </div>
              <div className="oss-inline">
                <StatusPill tone={brand.status === 'active' ? 'done' : 'neutral'} dot>{brand.status === 'active' ? 'Live' : 'Hidden'}</StatusPill>
                <button type="button" className="oss-btn oss-btn--sm" onClick={toggleStatus}>{brand.status === 'active' ? 'Hide store' : 'Make live'}</button>
                <button type="button" className="oss-btn oss-btn--sm oss-btn--danger" onClick={() => setConfirm('delete')}>Delete</button>
              </div>
            </div>
            {confirm === 'delete' && (
              <ConfirmBar
                message={<>Delete <b>{brandLabel(brand)}</b>? Its settings and delivery fees are removed too. This can’t be undone — hiding the store is usually enough.</>}
                confirmLabel="Delete brand" cancelLabel="Keep" busy={saving}
                onCancel={() => setConfirm(null)} onConfirm={deleteBrand}
              />
            )}

            <div role="tablist" aria-label="Section" className="oss-tabs">
              {sections.map((s) => {
                const n = tabWarn(s.key).length;
                return (
                  <button key={s.key} type="button" role="tab" aria-selected={section.key === s.key} className={`oss-tab${section.key === s.key ? ' is-on' : ''}`} onClick={() => setTab(s.key)}>
                    {s.title}{n > 0 && <span className="oss-tabwarn" aria-label={`${n} warning${n === 1 ? '' : 's'}`}>!</span>}
                  </button>
                );
              })}
            </div>

            <section className="oss-card oss-section" aria-label={section.title}>
              <div className="oss-section-head">
                <b className="oss-h2">{section.title}</b>
                <span className="mut oss-small">{section.help}</span>
              </div>

              {isAdmin && formQuery.isLoading ? (
                <SkeletonForm fields={6} className="oss-grid" label="Loading settings…" />
              ) : isAdmin && formQuery.error && !form ? (
                <ErrorState message={`Couldn’t load this brand’s settings — ${formQuery.error?.message || 'the server didn’t answer'}.`} onRetry={formQuery.refetch} retrying={formQuery.isFetching} />
              ) : (
                <>
                  {tabWarn(section.key).length > 0 && (
                    <ul className="oss-warnings">
                      {tabWarn(section.key).map((w) => <li key={w.text}>{w.text}</li>)}
                    </ul>
                  )}

                  {section.key === 'store' && (
                    <>
                      <div className="oss-grid">
                        {BRAND_FIELDS.map((f) => (
                          <FieldInput key={f.key} f={{ ...f, hint: (f.key === 'domain' && warnFor('domain')) ? null : f.hint }}
                            value={brandValue(f.key)} onChange={(v) => setBrandField(f.key, v)} error={errors[`brand.${f.key}`]} />
                        ))}
                      </div>
                      {host && (
                        <div className="oss-feeds">
                          <span className="mut oss-small">Links for Google, Meta and Search Console:</span>
                          {[['Google feed', '/google-merchant.xml'], ['Facebook catalogue', '/facebook-catalog.xml'], ['Sitemap', '/sitemap.xml']].map(([l, p]) => (
                            <button key={p} type="button" className="oss-btn oss-btn--sm" onClick={() => copy(`https://${host}${p}`)} title={`https://${host}${p}`}>Copy {l} link</button>
                          ))}
                        </div>
                      )}
                      {!isAdmin && <p className="mut oss-small">Payment keys, tax, courier and tracking settings can only be changed by an admin.</p>}
                    </>
                  )}

                  {groups.map((g) => (
                    <div key={g.name || 'main'} className="oss-group">
                      {g.name && <span className="oss-label">{g.name}</span>}
                      <div className="oss-grid">
                        {g.fields.map((f) => (
                          <FieldInput key={f.key} f={f} value={fieldValue(f)} onChange={(v) => setField(f.key, v)}
                            secretState={secrets[f.key]} error={errors[f.key]}
                            onSecret={(st) => {
                              setSecrets((s) => { const n = { ...s }; if (st) n[f.key] = st; else delete n[f.key]; return n; });
                              if (st !== 'replace') setDraft((d) => { const n = { ...d }; delete n[f.key]; return n; });
                            }} />
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="oss-section-foot">
                    <SectionTest tab={section.key} brand={brandRecord.id ? brandRecord : brand} form={form} />
                    <span className="oss-inline">
                      {dirtyCount > 0 && <button type="button" className="oss-btn oss-btn--quiet" onClick={resetDrafts} disabled={saving}>Undo changes</button>}
                      <button type="button" className="oss-btn oss-btn--main" onClick={save} disabled={saving || !dirtyCount}>
                        {saving ? 'Saving…' : dirtyCount ? `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}` : 'Saved'}
                      </button>
                    </span>
                  </div>
                </>
              )}
            </section>

            {isAdmin && form && (
              <>
                <OtherSettings form={form} draft={draft} setDraft={setDraft} removed={removed} setRemoved={setRemoved} errors={errors} />
                <section className="oss-card">
                  <b className="oss-h2">Recent changes</b>
                  <RecentChanges brandId={brand.id} initial={form.audit} />
                </section>
              </>
            )}
            <span className="mut oss-small">Secret keys are never shown again after saving — only the last 4 characters. Changes are logged with who made them.</span>
          </div>
        </div>
      )}
    </div>
  );
}
