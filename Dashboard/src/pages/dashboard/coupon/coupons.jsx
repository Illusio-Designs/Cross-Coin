import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Button, Pagination, PageHeader, StatusPill, KpiTile, KpiGrid, FilterChips, SidePanel,
  ConfirmBar, EmptyState, ErrorState, SkeletonRows,
} from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { couponService, brandService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, Cancel01Icon, Delete02Icon, Alert02Icon } from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   Coupons — what each code costs and what it brings in.
   Data (all server-side):
     GET  /api/coupons?tab&search&brandId&page&days   list + counts + per-code stats
     GET  /api/coupons/admin/summary                   orders with a coupon, discount, sales, live codes
     GET  /api/coupons/admin/dependencies              automations whose code would fail
     POST /api/coupons/:id/switch-on                   one-click fix (admin)
   Stats count orders that weren't cancelled. "Used by" = the WhatsApp
   automations / pop-ups that hand the code out automatically.
   ────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;
const ic = (icon, size = 16) => <HugeiconsIcon icon={icon} size={size} strokeWidth={2} aria-hidden="true" />;
const TABS = [
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'off', label: 'Switched off' },
  { value: 'ended', label: 'Ended' },
  { value: 'all', label: 'All' },
];
const EMPTY_TEXT = {
  live: ['No live coupons', 'Codes that are switched on and in date show here.'],
  scheduled: ['Nothing scheduled', 'Coupons with a start date in the future show here.'],
  off: ['Nothing switched off', 'Coupons you switch off are kept here.'],
  ended: ['No ended coupons', 'Coupons past their end date or use limit show here.'],
  all: ['No coupons yet', 'Make one for a sale or a WhatsApp offer.'],
};
const TYPE_OPTIONS = [
  { value: 'percentage', label: '% off' },
  { value: 'fixed', label: '₹ off' },
  { value: 'tiered', label: 'Spend more, save more (₹ steps)' },
  { value: 'quantity_based', label: 'Buy more, save more (item steps)' },
];
const PAY_OPTIONS = [
  { value: 'all', label: 'Any payment' },
  { value: 'prepaid', label: 'Prepaid orders only' },
  { value: 'cod', label: 'Cash on delivery only' },
];
const FAR_YEAR = 2090;
const NO_END = '2099-12-31';

// ── Formatting ───────────────────────────────────────────────────────
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const inr = (n) => `₹${num(Math.round(Number(n) || 0))}`;
const plural = (n, w) => `${num(n)} ${w}${Number(n) === 1 ? '' : 's'}`;
const istDay = (d = new Date()) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isNever = (d) => d && new Date(d).getFullYear() >= FAR_YEAR;
const dayText = (d) => {
  const x = new Date(d);
  const sameYear = istDay(x).slice(0, 4) === istDay().slice(0, 4);
  return x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'Asia/Kolkata' });
};
const ymdText = (ymd) => dayText(`${ymd}T12:00:00+05:30`);
const listText = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);
const shortList = (arr, max = 2) => (arr.length <= max ? arr.join(', ') : `${arr.slice(0, max).join(', ')} +${arr.length - max}`);
const jsonArr = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

// What the code gives, in a few words.
function givesText(c) {
  if (c.type === 'percentage') return `${Number(c.value)}% off`;
  if (c.type === 'fixed') return `${inr(c.value)} off`;
  if (c.type === 'tiered') {
    const t = jsonArr(c.tieredDiscounts);
    return t.map((x, i) => `${inr(x.discount)}${i === 0 ? ' off' : ''} over ${inr(x.minAmount)}`).join(', ') || 'Spend more, save more';
  }
  const t = jsonArr(c.quantityBasedDiscounts);
  return t.map((x, i) => `${inr(x.discount)}${i === 0 ? ' off' : ''} for ${x.minQuantity}+ items`).join(', ') || 'Buy more, save more';
}

function ruleText(c) {
  const parts = [];
  if (c.minPurchase) parts.push(`over ${inr(c.minPurchase)}`);
  else if (c.type === 'percentage' || c.type === 'fixed') parts.push('no minimum');
  if (c.type === 'percentage' && c.maxDiscount) parts.push(`up to ${inr(c.maxDiscount)}`);
  if (c.paymentModeRestriction === 'prepaid') parts.push('prepaid only');
  if (c.paymentModeRestriction === 'cod') parts.push('COD only');
  if (c.firstOrderOnly) parts.push('first order');
  const items = [...(c.categories || []), ...(c.products || [])].map((x) => x.name);
  if (items.length) parts.push(`on ${shortList(items)}`);
  parts.push(!c.perUserLimit || c.perUserLimit === 1 ? 'once per customer' : `${c.perUserLimit}× per customer`);
  if (c.usageLimit) parts.push(`${num(c.usageCount)} of ${num(c.usageLimit)} used`);
  return parts.join(' · ');
}

function statePill(c) {
  if (c.state === 'live') return <StatusPill tone="done" size="sm">Live</StatusPill>;
  if (c.state === 'scheduled') return <StatusPill tone="progress" size="sm">Starts {dayText(c.startDate)}</StatusPill>;
  if (c.state === 'off') return <StatusPill tone="neutral" size="sm">Off</StatusPill>;
  const usedUp = c.usageLimit && c.usageCount >= c.usageLimit;
  return <StatusPill tone="neutral" size="sm" className="cpn-pill-ended">{usedUp ? 'Used up' : 'Ended'}</StatusPill>;
}

function endsText(c) {
  if (isNever(c.endDate)) return 'Never';
  if (c.state === 'ended' && new Date(c.endDate) < new Date()) return `Ended ${dayText(c.endDate)}`;
  return dayText(c.endDate);
}

// ── Form ─────────────────────────────────────────────────────────────
function emptyForm(prefill = {}) {
  const today = istDay();
  return {
    id: null, code: '', type: 'percentage', value: '', maxDiscount: '', minPurchase: '',
    tiers: [{ min: '', discount: '' }], worksOn: 'all', categories: [], products: [],
    brandIds: [], perUserLimit: '1', usageLimit: '', startDate: today, endDate: addDays(today, 30), noEnd: false,
    paymentModeRestriction: 'all', firstOrderOnly: false, description: '', active: true,
    usedBy: [], usageCount: 0, original: null,
    ...prefill,
  };
}

function formFromCoupon(c, names = {}) {
  const tiered = c.type === 'tiered' ? jsonArr(c.tieredDiscounts).map((t) => ({ min: String(t.minAmount), discount: String(t.discount) }))
    : c.type === 'quantity_based' ? jsonArr(c.quantityBasedDiscounts).map((t) => ({ min: String(t.minQuantity), discount: String(t.discount) })) : [];
  const categories = c.categories || jsonArr(c.applicableCategories).map((id) => ({ id: Number(id), name: names.categories?.get(Number(id)) || `Category ${id}` }));
  const products = c.products || jsonArr(c.applicableProducts).map((id) => ({ id: Number(id), name: names.products?.get(Number(id)) || `Product ${id}` }));
  const str = (v) => (v == null ? '' : String(Number(v)));
  return emptyForm({
    id: c.id, code: c.code, type: c.type,
    value: c.type === 'percentage' || c.type === 'fixed' ? str(c.value) : '',
    maxDiscount: str(c.maxDiscount), minPurchase: str(c.minPurchase),
    tiers: tiered.length ? tiered : [{ min: '', discount: '' }],
    worksOn: categories.length && products.length ? 'both' : categories.length ? 'categories' : products.length ? 'products' : 'all',
    categories, products,
    brandIds: (c.brands ? c.brands.map((b) => b.id) : c.brandIds || []).map(Number),
    perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '1',
    usageLimit: c.usageLimit ? String(c.usageLimit) : '',
    startDate: istDay(c.startDate), endDate: isNever(c.endDate) ? addDays(istDay(), 30) : istDay(c.endDate), noEnd: isNever(c.endDate),
    paymentModeRestriction: c.paymentModeRestriction || 'all', firstOrderOnly: !!c.firstOrderOnly,
    description: c.description || '', active: c.status !== 'inactive',
    usedBy: c.usedBy || [], usageCount: Number(c.usageCount || 0), original: c,
  });
}

function validate(f) {
  const e = {};
  if (!/^[A-Z0-9_-]{3,32}$/.test(f.code)) e.code = 'Use 3–32 capital letters, numbers, - or _ (no spaces).';
  if (f.type === 'percentage' || f.type === 'fixed') {
    const v = Number(f.value);
    if (!f.value || !(v > 0)) e.value = 'Enter the discount.';
    else if (f.type === 'percentage' && v > 100) e.value = 'Must be between 1 and 100.';
  } else {
    const rows = f.tiers.filter((t) => t.min !== '' || t.discount !== '');
    if (!rows.length) e.tiers = 'Add at least one step.';
    else if (rows.some((t) => !(Number(t.min) > 0) || !(Number(t.discount) > 0))) e.tiers = 'Fill in both numbers on every step.';
    else if (f.type === 'quantity_based' && rows.some((t) => !Number.isInteger(Number(t.min)))) e.tiers = 'Item counts must be whole numbers.';
    else if (f.type === 'tiered' && rows.some((t) => Number(t.discount) >= Number(t.min))) e.tiers = 'Each discount must be less than its cart amount.';
    else if (new Set(rows.map((t) => Number(t.min))).size !== rows.length) e.tiers = 'Two steps start at the same number.';
  }
  if (f.minPurchase !== '' && !(Number(f.minPurchase) >= 0)) e.minPurchase = 'Enter an amount or leave empty.';
  if (f.maxDiscount !== '' && !(Number(f.maxDiscount) > 0)) e.maxDiscount = 'Enter an amount or leave empty.';
  if ((f.worksOn === 'categories' || f.worksOn === 'both') && !f.categories.length) e.categories = 'Pick at least one category.';
  if ((f.worksOn === 'products' || f.worksOn === 'both') && !f.products.length) e.products = 'Pick at least one product.';
  for (const k of ['perUserLimit', 'usageLimit']) {
    if (f[k] !== '' && !(Number.isInteger(Number(f[k])) && Number(f[k]) >= 1)) e[k] = 'A whole number, 1 or more (empty = no limit).';
  }
  if (!f.startDate) e.startDate = 'Pick a start date.';
  if (!f.noEnd && (!f.endDate || f.endDate < f.startDate)) e.endDate = 'The end date must be on or after the start date.';
  return e;
}

function toPayload(f) {
  const tiers = f.tiers.filter((t) => t.min !== '' && t.discount !== '').map((t) => ({ min: Number(t.min), discount: Number(t.discount) }));
  const withCats = f.worksOn === 'categories' || f.worksOn === 'both';
  const withProds = f.worksOn === 'products' || f.worksOn === 'both';
  return {
    code: f.code,
    type: f.type,
    ...(f.type === 'percentage' || f.type === 'fixed' ? { value: Number(f.value) } : {}),
    maxDiscount: f.type === 'percentage' && f.maxDiscount !== '' ? Number(f.maxDiscount) : null,
    minPurchase: f.minPurchase !== '' ? Number(f.minPurchase) : null,
    tieredDiscounts: f.type === 'tiered' ? tiers.map((t) => ({ minAmount: t.min, discount: t.discount })) : null,
    quantityBasedDiscounts: f.type === 'quantity_based' ? tiers.map((t) => ({ minQuantity: t.min, discount: t.discount })) : null,
    applicableCategories: withCats ? f.categories.map((c) => c.id) : [],
    applicableProducts: withProds ? f.products.map((p) => p.id) : [],
    brandIds: f.brandIds,
    perUserLimit: f.perUserLimit !== '' ? Number(f.perUserLimit) : null,
    usageLimit: f.usageLimit !== '' ? Number(f.usageLimit) : null,
    startDate: `${f.startDate}T00:00:00+05:30`,
    endDate: `${f.noEnd ? NO_END : f.endDate}T23:59:59+05:30`,
    paymentModeRestriction: f.paymentModeRestriction,
    firstOrderOnly: !!f.firstOrderOnly,
    description: f.description.trim() || null,
    status: f.active ? 'active' : 'inactive',
  };
}

// The sentence a shopper would read, e.g.
// "30% off orders over ₹799 on Cross Coin and Soxbae, till Sun, 26 Oct. Once per customer."
function customerSees(f, brands) {
  const items = [];
  if (f.worksOn === 'categories' || f.worksOn === 'both') items.push(...f.categories.map((c) => c.name));
  if (f.worksOn === 'products' || f.worksOn === 'both') items.push(...f.products.map((p) => p.name));
  const itemText = items.length > 3 ? `${items.length} chosen items` : listText(items);
  let s;
  if (f.type === 'percentage' || f.type === 'fixed') {
    s = f.type === 'percentage' ? `${Number(f.value) || '…'}% off` : `${f.value ? inr(f.value) : '₹…'} off`;
    if (itemText) s += ` ${itemText}`;
    if (f.minPurchase && Number(f.minPurchase) > 0) s += `${itemText ? ' on' : ''} orders over ${inr(f.minPurchase)}`;
    if (f.type === 'percentage' && f.maxDiscount) s += ` (up to ${inr(f.maxDiscount)})`;
  } else {
    const rows = f.tiers.filter((t) => t.min !== '' && t.discount !== '').sort((a, b) => Number(a.min) - Number(b.min));
    s = rows.length
      ? rows.map((t, i) => `${inr(t.discount)} off when you ${f.type === 'tiered' ? `spend ${inr(t.min)}` : `buy ${t.min}${i === rows.length - 1 && rows.length > 1 ? ' or more' : ''}`}`).join(', ')
      : 'A discount (add the steps)';
    if (itemText) s += ` ${f.type === 'tiered' ? 'on' : 'of'} ${itemText}`;
    if (f.minPurchase && Number(f.minPurchase) > 0) s += ` (orders over ${inr(f.minPurchase)})`;
  }
  const names = f.brandIds.map((id) => { const b = brands.find((x) => String(x.id) === String(id)); return b ? b.display_name || b.name : null; }).filter(Boolean);
  s += names.length ? ` on ${listText(names)}` : ' on every store';
  const today = istDay();
  let when = f.noEnd ? '' : `till ${ymdText(f.endDate)}`;
  if (f.startDate > today) when = `from ${ymdText(f.startDate)}${when ? ` ${when}` : ''}`;
  s += `${when ? `, ${when}` : ''}.`;
  const extra = [];
  if (f.paymentModeRestriction === 'prepaid') extra.push('Prepaid orders only.');
  if (f.paymentModeRestriction === 'cod') extra.push('Cash on delivery only.');
  if (f.firstOrderOnly) extra.push('First order only.');
  const per = Number(f.perUserLimit);
  extra.push(f.perUserLimit === '' ? 'No limit per customer.' : per === 1 ? 'Once per customer.' : `Up to ${per} times per customer.`);
  if (f.usageLimit) extra.push(`First ${num(f.usageLimit)} orders only.`);
  s = `${s.charAt(0).toUpperCase()}${s.slice(1)} ${extra.join(' ')}`;
  return f.active ? s : `${s} (Switched off — nobody can use it yet.)`;
}

// ── Searchable picker (categories / products) ────────────────────────
function Picker({ kind, label, value, onChange, error }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const { data = [], isFetching, error: loadError } = useQuery({
    queryKey: ['coupons', 'picker', kind, debounced],
    queryFn: () => couponService.picker({ kind, search: debounced }),
    enabled: open,
    staleTime: 60 * 1000,
  });
  const chosen = new Set(value.map((v) => v.id));
  const id = `cpn-pick-${kind}`;
  return (
    <div className="cpn-field cpn-span" ref={boxRef}>
      <label htmlFor={id}>{label}</label>
      {value.length > 0 && (
        <div className="cpn-chips">
          {value.map((v) => (
            <span key={v.id} className="cpn-chip">
              {v.name}
              <button type="button" aria-label={`Remove ${v.name}`} onClick={() => onChange(value.filter((x) => x.id !== v.id))}>{ic(Cancel01Icon, 12)}</button>
            </span>
          ))}
        </div>
      )}
      <div className="cpn-pick">
        <input id={id} type="search" value={q} autoComplete="off" placeholder={kind === 'category' ? 'Search categories…' : 'Search products…'}
          aria-invalid={!!error || undefined} aria-expanded={open} aria-controls={`${id}-list`}
          onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); } }} />
        {open && (
          <ul id={`${id}-list`} className="cpn-pick-list" role="listbox" aria-label={label}>
            {loadError ? <li className="cpn-pick-msg">Couldn’t search — {loadError.message}</li>
              : isFetching && !data.length ? <li className="cpn-pick-msg">Searching…</li>
                : !data.length ? <li className="cpn-pick-msg">Nothing found{debounced ? ` for “${debounced}”` : ''}.</li>
                  : data.map((it) => {
                    const on = chosen.has(Number(it.id));
                    return (
                      <li key={it.id} role="option" aria-selected={on}>
                        <button type="button" className={on ? 'on' : ''} onClick={() => onChange(on ? value.filter((x) => x.id !== Number(it.id)) : [...value, { id: Number(it.id), name: it.name }])}>
                          <span className="cpn-check" aria-hidden="true">{on ? '✓' : ''}</span>
                          <span className="cpn-pick-name">{it.name}</span>
                          <span className="cpn-faint">{[it.parent, it.brand, it.status !== 'active' ? it.status : null].filter(Boolean).join(' · ')}</span>
                        </button>
                      </li>
                    );
                  })}
          </ul>
        )}
      </div>
      {error && <span className="cpn-err">{error}</span>}
    </div>
  );
}

// ── Steps editor (tiered / quantity) ─────────────────────────────────
function StepsEditor({ type, tiers, onChange, error }) {
  const isQty = type === 'quantity_based';
  const set = (i, k, v) => onChange(tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  return (
    <fieldset className="cpn-field cpn-span cpn-steps">
      <legend>{isQty ? 'Steps — items in the cart → ₹ off' : 'Steps — cart amount → ₹ off'}</legend>
      {tiers.map((t, i) => (
        <div key={i} className="cpn-step">
          <label>
            <span>{isQty ? 'Buy' : 'Spend ₹'}</span>
            <input type="number" inputMode="numeric" min="1" value={t.min} onChange={(e) => set(i, 'min', e.target.value)} aria-label={`Step ${i + 1}: ${isQty ? 'items' : 'cart amount'}`} />
            {isQty && <span>items or more</span>}
          </label>
          <label>
            <span>get ₹</span>
            <input type="number" inputMode="numeric" min="1" value={t.discount} onChange={(e) => set(i, 'discount', e.target.value)} aria-label={`Step ${i + 1}: rupees off`} />
            <span>off</span>
          </label>
          {tiers.length > 1 && (
            <button type="button" className="cpn-icon-btn" aria-label={`Remove step ${i + 1}`} onClick={() => onChange(tiers.filter((_, j) => j !== i))}>{ic(Delete02Icon, 15)}</button>
          )}
        </div>
      ))}
      <button type="button" className="cpn-link" onClick={() => onChange([...tiers, { min: '', discount: '' }])}>+ Add a step</button>
      <span className="cpn-hint">The biggest step the cart reaches applies.{isQty ? ' Items count only those the coupon works on.' : ''}</span>
      {error && <span className="cpn-err">{error}</span>}
    </fieldset>
  );
}

// ── Create / edit panel ──────────────────────────────────────────────
function CouponPanel({ open, initial, brands, onClose, onSaved }) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverErr, setServerErr] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'off' | 'delete'
  useEffect(() => { setF(initial); setErrors({}); setServerErr(null); setConfirm(null); }, [initial]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isEdit = !!f.id;
  // Automations that would break (the exit pop-up just picks another code).
  const automations = (f.usedBy || []).filter((u) => u.enabled && !u.soft);
  const usesText = automations.length ? listText(automations.map((u) => u.text)) : '';
  const sends = automations.length > 1 ? 'send' : 'sends';
  const brandOpts = brands.map((b) => ({ id: Number(b.id), name: b.display_name || b.name }));

  const save = async (skipConfirm = false) => {
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) { setServerErr('Check the fields marked in red.'); return; }
    if (!skipConfirm && isEdit && !f.active && f.original?.status !== 'inactive' && automations.length) { setConfirm('off'); return; }
    setSaving(true); setServerErr(null); setConfirm(null);
    try {
      const payload = toPayload(f);
      if (isEdit) await couponService.update(f.id, payload);
      else await couponService.create(payload);
      onSaved(isEdit ? `${f.code} saved` : `${f.code} created`);
    } catch (err) {
      setServerErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true); setServerErr(null);
    try {
      await couponService.remove(f.id);
      onSaved(`${f.code} deleted`);
    } catch (err) {
      setServerErr(err.message); setConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  const fieldErr = (k) => (errors[k] ? <span className="cpn-err">{errors[k]}</span> : null);
  const footer = confirm === 'off' ? (
    <ConfirmBar
      message={<>{usesText} {sends} <b>{f.code}</b>. Switched off, those messages hand out a code that fails (win-back skips the store). Switch it off anyway?</>}
      confirmLabel="Switch off" cancelLabel="Keep it on" busy={saving}
      onConfirm={() => save(true)} onCancel={() => setConfirm(null)} />
  ) : confirm === 'delete' ? (
    <ConfirmBar
      message={<>Delete coupon <b>{f.code}</b>?{usesText ? ` ${usesText} ${sends} it — that would hand out a code that doesn’t exist.` : ' It was never used.'}</>}
      confirmLabel="Delete" cancelLabel="Keep" busy={saving}
      onConfirm={remove} onCancel={() => setConfirm(null)} />
  ) : (
    <div className="cpn-foot">
      {isEdit && (f.usageCount > 0
        ? <span className="cpn-faint cpn-foot-note">Used on {plural(f.usageCount, 'order')} — switch it off instead of deleting.</span>
        : <Button variant="danger" onClick={() => setConfirm('delete')} disabled={saving}>Delete</Button>)}
      <span className="cpn-foot-gap" />
      <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button onClick={() => save(false)} loading={saving} loadingText="Saving…">{isEdit ? 'Save' : 'Create coupon'}</Button>
    </div>
  );

  return (
    <SidePanel open={open} onClose={() => { if (!saving) onClose(); }} width={640}
      title={isEdit ? `Edit ${f.original?.code || f.code}` : 'New coupon'}
      description={isEdit && usesText ? `Sent automatically by ${usesText}.` : 'Fill in the offer — the sentence at the bottom shows what shoppers see.'}
      footer={footer}>
      <form className="cpn-form" onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate>
        {serverErr && <div className="cpn-alert" role="alert">{serverErr}</div>}
        <div className="cpn-grid">
          <div className="cpn-field">
            <label htmlFor="cpn-code">Code</label>
            <input id="cpn-code" className="cpn-mono" value={f.code} maxLength={32} aria-invalid={!!errors.code || undefined}
              onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="DIWALI30" />
            {fieldErr('code')}
          </div>
          <div className="cpn-field">
            <span className="cpn-label">Discount</span>
            <Dropdown value={f.type} onChange={(v) => set('type', v)} options={TYPE_OPTIONS} />
          </div>

          {(f.type === 'percentage' || f.type === 'fixed') && (
            <div className="cpn-field">
              <label htmlFor="cpn-value">{f.type === 'percentage' ? 'Percent off' : 'Rupees off'}</label>
              <input id="cpn-value" type="number" inputMode="decimal" min="1" max={f.type === 'percentage' ? 100 : undefined}
                value={f.value} onChange={(e) => set('value', e.target.value)} aria-invalid={!!errors.value || undefined} />
              {fieldErr('value')}
            </div>
          )}
          {f.type === 'percentage' && (
            <div className="cpn-field">
              <label htmlFor="cpn-max">Most it can take off (₹)</label>
              <input id="cpn-max" type="number" inputMode="numeric" min="1" value={f.maxDiscount} placeholder="No cap"
                onChange={(e) => set('maxDiscount', e.target.value)} aria-invalid={!!errors.maxDiscount || undefined} />
              {fieldErr('maxDiscount')}
            </div>
          )}
          {(f.type === 'tiered' || f.type === 'quantity_based') && (
            <StepsEditor type={f.type} tiers={f.tiers} onChange={(v) => set('tiers', v)} error={errors.tiers} />
          )}

          <div className="cpn-field">
            <label htmlFor="cpn-min">Minimum order (₹)</label>
            <input id="cpn-min" type="number" inputMode="numeric" min="0" value={f.minPurchase} placeholder="No minimum"
              onChange={(e) => set('minPurchase', e.target.value)} aria-invalid={!!errors.minPurchase || undefined} />
            {fieldErr('minPurchase')}
          </div>
          <div className="cpn-field">
            <span className="cpn-label">Works on</span>
            <Dropdown value={f.worksOn} onChange={(v) => set('worksOn', v)} options={[
              { value: 'all', label: 'Everything' },
              { value: 'categories', label: 'Some categories…' },
              { value: 'products', label: 'Some products…' },
              { value: 'both', label: 'Some categories and products…' },
            ]} />
          </div>
          {(f.worksOn === 'categories' || f.worksOn === 'both') && (
            <Picker kind="category" label="Categories (sub-categories count too)" value={f.categories} onChange={(v) => set('categories', v)} error={errors.categories} />
          )}
          {(f.worksOn === 'products' || f.worksOn === 'both') && (
            <Picker kind="product" label="Products" value={f.products} onChange={(v) => set('products', v)} error={errors.products} />
          )}
          {f.worksOn !== 'all' && (
            <p className="cpn-hint cpn-span">The cart needs at least one of these. The discount is worked out on those items only{f.type === 'fixed' || f.type === 'tiered' ? ' (and is never more than they cost)' : ''}; the minimum order counts the whole cart.</p>
          )}

          <fieldset className="cpn-field cpn-span">
            <legend>Stores</legend>
            <div className="cpn-toggles">
              <button type="button" className={`cpn-toggle${f.brandIds.length === 0 ? ' on' : ''}`} aria-pressed={f.brandIds.length === 0} onClick={() => set('brandIds', [])}>Every store</button>
              {brandOpts.map((b) => {
                const on = f.brandIds.includes(b.id);
                return (
                  <button key={b.id} type="button" className={`cpn-toggle${on ? ' on' : ''}`} aria-pressed={on}
                    onClick={() => set('brandIds', on ? f.brandIds.filter((x) => x !== b.id) : [...f.brandIds, b.id])}>{b.name}</button>
                );
              })}
            </div>
            <span className="cpn-hint">A store’s win-back message only uses a code made for that store (pick just that store).</span>
          </fieldset>

          <div className="cpn-field">
            <label htmlFor="cpn-per">Uses per customer</label>
            <input id="cpn-per" type="number" inputMode="numeric" min="1" value={f.perUserLimit} placeholder="No limit"
              onChange={(e) => set('perUserLimit', e.target.value)} aria-invalid={!!errors.perUserLimit || undefined} />
            {fieldErr('perUserLimit')}
          </div>
          <div className="cpn-field">
            <label htmlFor="cpn-total">Total uses</label>
            <input id="cpn-total" type="number" inputMode="numeric" min="1" value={f.usageLimit} placeholder="No limit"
              onChange={(e) => set('usageLimit', e.target.value)} aria-invalid={!!errors.usageLimit || undefined} />
            {fieldErr('usageLimit')}
            {isEdit && f.usageCount > 0 && <span className="cpn-hint">Used {plural(f.usageCount, 'time')} so far.</span>}
          </div>

          <div className="cpn-field">
            <label htmlFor="cpn-start">Starts</label>
            <input id="cpn-start" type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} aria-invalid={!!errors.startDate || undefined} />
            {fieldErr('startDate')}
          </div>
          <div className="cpn-field">
            <label htmlFor="cpn-end">Ends</label>
            <input id="cpn-end" type="date" value={f.noEnd ? '' : f.endDate} disabled={f.noEnd} min={f.startDate}
              onChange={(e) => set('endDate', e.target.value)} aria-invalid={!!errors.endDate || undefined} />
            <label className="cpn-check-row"><input type="checkbox" checked={f.noEnd} onChange={(e) => set('noEnd', e.target.checked)} /> No end date</label>
            {fieldErr('endDate')}
          </div>

          <div className="cpn-field">
            <span className="cpn-label">Payment</span>
            <Dropdown value={f.paymentModeRestriction} onChange={(v) => set('paymentModeRestriction', v)} options={PAY_OPTIONS} />
          </div>
          <div className="cpn-field cpn-field-checks">
            <label className="cpn-check-row"><input type="checkbox" checked={f.firstOrderOnly} onChange={(e) => set('firstOrderOnly', e.target.checked)} /> First order only</label>
            <label className="cpn-check-row"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Switched on</label>
          </div>

          <div className="cpn-field cpn-span">
            <label htmlFor="cpn-desc">Offer text in the store’s offers list (optional)</label>
            <input id="cpn-desc" value={f.description} maxLength={500} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Diwali sale — 30% off prepaid orders" />
          </div>
        </div>
        <div className="cpn-sees" aria-live="polite">Customer sees: <b>{customerSees(f, brands)}</b></div>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </SidePanel>
  );
}

// ── Warnings banner ──────────────────────────────────────────────────
function Warnings({ warnings, isAdmin, busyKey, onFix }) {
  if (!warnings.length) return null;
  return (
    <section className="cpn-warns" aria-label="Automations with a coupon problem">
      {warnings.map((w) => (
        <div key={w.key} className={`cpn-warn${w.problem === 'not_started' ? ' soft' : ''}`}>
          <span className="cpn-warn-ic">{ic(Alert02Icon, 18)}</span>
          <span className="cpn-warn-msg">{w.message}</span>
          {w.fix && (
            <Button size="sm" variant={w.fix.action === 'switch_on' ? 'primary' : 'secondary'}
              disabled={w.fix.action === 'switch_on' && !isAdmin} loading={busyKey === w.key} loadingText="Fixing…"
              title={w.fix.action === 'switch_on' && !isAdmin ? 'Only an admin can do this' : undefined}
              onClick={() => onFix(w)}>
              {w.fix.label}
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function Coupons() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth() || {};
  const [tab, setTab] = useState('live');
  const [brandId, setBrandId] = useState('');
  const [days, setDays] = useState(30);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null); // form initial state
  const [opening, setOpening] = useState(null);
  const [fixing, setFixing] = useState(null);

  useEffect(() => {
    let off = false;
    brandService.getAllBrands().then((res) => {
      if (!off) setBrands(res?.data || res?.brands || (Array.isArray(res) ? res : []));
    }).catch(() => {});
    return () => { off = true; };
  }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [tab, brandId, debounced, days]);

  const list = useQuery({
    queryKey: ['coupons', 'list', tab, brandId, debounced, page, days],
    queryFn: () => couponService.list({ tab, brandId, search: debounced, page, limit: PAGE_SIZE, days }),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
  const summary = useQuery({
    queryKey: ['coupons', 'summary', brandId, days],
    queryFn: () => couponService.summary({ brandId, days }),
    staleTime: 60 * 1000,
  });
  const deps = useQuery({
    queryKey: ['coupons', 'deps'],
    queryFn: couponService.dependencies,
    staleTime: 60 * 1000,
  });

  const coupons = list.data?.coupons || [];
  const counts = list.data?.counts || {};
  const totalPages = list.data?.pagination?.totalPages || 1;
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const refresh = () => qc.invalidateQueries({ queryKey: ['coupons'] });

  const openNew = (prefill = {}) => setPanel(emptyForm(prefill));
  const openEdit = async (id, row) => {
    if (row) { setPanel(formFromCoupon(row)); return; }
    setOpening(id);
    try {
      const c = await couponService.get(id);
      const catIds = jsonArr(c.applicableCategories);
      const prodIds = jsonArr(c.applicableProducts);
      const [cats, prods] = await Promise.all([
        catIds.length ? couponService.picker({ kind: 'category', ids: catIds }) : [],
        prodIds.length ? couponService.picker({ kind: 'product', ids: prodIds }) : [],
      ]);
      const usedBy = (deps.data || []).filter((w) => w.couponId === c.id).map((w) => ({ text: w.automationLabel + (w.brandName ? ` · ${w.brandName}` : ''), enabled: true }));
      setPanel(formFromCoupon({ ...c, usedBy }, {
        categories: new Map(cats.map((x) => [Number(x.id), x.name])),
        products: new Map(prods.map((x) => [Number(x.id), x.name])),
      }));
    } catch (e) {
      showError(null, `Couldn’t open the coupon — ${e.message}`);
    } finally {
      setOpening(null);
    }
  };

  const fix = async (w) => {
    const f = w.fix;
    if (f.action === 'create') { openNew({ code: f.code, brandIds: f.brandIds || [] }); return; }
    if (f.action === 'edit') { openEdit(f.couponId); return; }
    if (f.action === 'settings') {
      window.history.pushState({}, '', '/dashboard/brand-settings');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    setFixing(w.key);
    try {
      await couponService.switchOn(f.couponId, { brandId: f.brandId || undefined, owner: !!f.owner, allBrands: !!f.allBrands });
      showSuccess(null, `${w.code} is on — ${w.automationLabel} can use it again.`);
      refresh();
    } catch (e) {
      showError(null, e.message);
    } finally {
      setFixing(null);
    }
  };

  const s = summary.data;
  const brandOpts = [{ value: '', label: 'All stores' }, ...brands.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))];
  const empty = EMPTY_TEXT[tab];
  const panelBrands = useMemo(() => brands.filter((b) => b.status !== 'inactive'), [brands]);

  return (
    <div className="dashboard-sections cpn-page">
      <PageHeader
        title="Coupons"
        description={`What each code costs you and what it brings in — last ${days} days.`}
        actions={(
          <div className="cpn-head-tools">
            <Dropdown value={brandId} onChange={(v) => setBrandId(String(v))} options={brandOpts} className="cpn-dd" />
            <Dropdown value={days} onChange={(v) => setDays(Number(v))} className="cpn-dd"
              options={[{ value: 7, label: 'Last 7 days' }, { value: 30, label: 'Last 30 days' }, { value: 90, label: 'Last 90 days' }]} />
            <Button icon={ic(Add01Icon)} onClick={() => openNew()}>New coupon</Button>
          </div>
        )}
      />

      {summary.error && !s ? (
        <ErrorState message={`Couldn’t load the coupon numbers — ${summary.error.message}`} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
      ) : (
        <KpiGrid className="cpn-kpis">
          <KpiTile label="Orders with a coupon" value={s ? num(s.couponOrders) : '–'}
            sub={s ? (s.orders ? `${s.couponShare}% of ${plural(s.orders, 'order')}` : 'no orders yet') : 'loading…'} />
          <KpiTile label="Discount given" value={s ? inr(s.discount) : '–'} sub="what coupons cost you" />
          <KpiTile label="Sales with coupons" value={s ? inr(s.sales) : '–'}
            sub={s ? (s.salesPerRupee ? `₹${s.salesPerRupee} of sales per ₹1 of discount` : 'no coupon orders yet') : ''} />
          <KpiTile label="Live codes" value={s ? num(s.liveCodes) : '–'}
            sub={s ? (s.startingSoon ? `${s.startingSoon} start${s.startingSoon === 1 ? 's' : ''} this week` : 'switched on and in date') : ''} />
        </KpiGrid>
      )}

      {deps.error ? (
        <ErrorState message={`Couldn’t check which automations use a coupon — ${deps.error.message}`} onRetry={() => deps.refetch()} retrying={deps.isFetching} />
      ) : (
        <Warnings warnings={deps.data || []} isAdmin={!!isAdmin} busyKey={fixing} onFix={fix} />
      )}

      <div className="cpn-toolbar">
        <FilterChips ariaLabel="Coupon status" controls="cpn-table" value={tab} onChange={setTab}
          items={TABS.map((t) => ({ ...t, count: list.data ? counts[t.value] || 0 : undefined }))} />
        <label className="cpn-search">
          <span className="ds-sr-only">Search code</span>
          {ic(Search01Icon)}
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or offer text" />
        </label>
      </div>

      <section className="cpn-card" id="cpn-table" aria-busy={list.isFetching || undefined}>
        {list.isLoading ? (
          <SkeletonRows rows={6} label="Loading coupons…" />
        ) : list.error && !list.data ? (
          <ErrorState message={`Couldn’t load coupons — ${list.error.message}`} onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : coupons.length === 0 ? (
          <EmptyState compact
            title={debounced ? 'No coupons match' : empty[0]}
            description={debounced ? `Nothing in ${TABS.find((t) => t.value === tab).label} for “${debounced}”.` : empty[1]}
            action={!debounced && (tab === 'all' || tab === 'live') ? <Button onClick={() => openNew()}>+ New coupon</Button> : null} />
        ) : (
          <div className="cpn-scroll">
            <table className="cpn-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Gives</th>
                  <th scope="col">Where</th>
                  <th scope="col">Used by</th>
                  <th scope="col" className="r">Used · {days} d</th>
                  <th scope="col" className="r">Discount given</th>
                  <th scope="col" className="r">Sales with it</th>
                  <th scope="col">Ends</th>
                  <th scope="col"><span className="ds-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td><b className="cpn-mono">{c.code}</b><div className="cpn-sub">{statePill(c)}</div></td>
                    <td className="cpn-gives">{givesText(c)}<div className="cpn-sub cpn-faint">{ruleText(c)}</div></td>
                    <td>{c.brands.length ? shortList(c.brands.map((b) => b.name)) : 'All stores'}</td>
                    <td>{c.usedBy.length
                      ? c.usedBy.map((u) => <div key={u.key + u.text} className={u.enabled ? '' : 'cpn-faint'}>{u.text}</div>)
                      : <span className="cpn-faint">—</span>}</td>
                    <td className="r">{num(c.stats.used)}{c.usageCount > c.stats.used && <div className="cpn-sub cpn-faint">{num(c.usageCount)} all time</div>}</td>
                    <td className="r">{c.stats.used ? inr(c.stats.discount) : <span className="cpn-faint">—</span>}</td>
                    <td className="r"><b>{c.stats.used ? inr(c.stats.sales) : <span className="cpn-faint">—</span>}</b></td>
                    <td className="cpn-faint cpn-nowrap">{endsText(c)}</td>
                    <td className="r">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(c.id, c)} loading={opening === c.id} aria-label={`Edit ${c.code}`}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="cpn-pager">
            <span className="cpn-faint">{num((page - 1) * PAGE_SIZE + 1)}–{num(Math.min(page * PAGE_SIZE, list.data?.pagination?.total || 0))} of {num(list.data?.pagination?.total || 0)}</span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </section>

      <p className="cpn-foot-note">
        Numbers count orders placed in the period that weren’t cancelled. A coupon’s rules are checked again when the order is placed,
        so a code that’s off, ended or used up never gives a discount.
      </p>

      {panel && (
        <CouponPanel open={!!panel} initial={panel} brands={panelBrands} onClose={() => setPanel(null)}
          onSaved={(msg) => { showSuccess(null, msg); setPanel(null); refresh(); }} />
      )}
    </div>
  );
}
