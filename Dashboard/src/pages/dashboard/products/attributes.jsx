/*
 * Attributes — the choices shoppers pick on a product (colour, size, pack) and
 * the "Shop by …" filters in each store's menu.
 *
 *   List (drag to reorder) · editor panel: name, type, required, choices with
 *   product counts, hide/show/delete, and a preview of how it shows on the store.
 *
 * Product counts are per store (the picker); attributes themselves are shared
 * by every store. Renaming an attribute or a choice also rewrites the product
 * variations that use it (server side) so the menu filters keep working.
 * Backend: /api/admin/attributes (services/attributeAdminService.js).
 * Styles: styles/dashboard/attributes.css (.attr-*) on top of website.css (.web-*).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Cancel01Icon, DragDropVerticalIcon, ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { attributeAdminService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import { showSuccess, showError } from '../../../utils/toastNotification';
import Dropdown from '../../../components/ui/Dropdown';
import StatusPill from '../../../components/ui/StatusPill';
import ConfirmBar from '../../../components/ui/ConfirmBar';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import { SkeletonPage, SkeletonList } from '../../../components/ui/Skeleton';
import { WebPanel, WebField, Toggle } from '../../../components/website/webParts';
import { useLoad, useDebounced, errText, loadBrands, brandLabel } from '../../../components/website/webUtil';

const BRAND_KEY = 'obz-website-brand';
const n = (v) => Number(v || 0).toLocaleString('en-IN');
const plural = (c, one, many = `${one}s`) => `${n(c)} ${c === 1 ? one : many}`;
const readBrand = () => { try { return localStorage.getItem(BRAND_KEY) || ''; } catch { return ''; } };
const move = (arr, from, to) => { const a = arr.slice(); const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

export default function Attributes() {
  const { user, loading: authLoading, hasAnyRole } = useAuth();
  const allowed = !!user && hasAnyRole(['admin', 'product_manager']);
  const [brands, setBrands] = useState([]);
  const [brandSel, setBrandSel] = useState(readBrand);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim().toLowerCase(), 200);
  const [selId, setSelId] = useState(null); // number | 'new' | null
  const drag = useRef(null);
  const [dropOn, setDropOn] = useState(null);

  useEffect(() => {
    let off = false;
    loadBrands().then((b) => { if (!off) setBrands(b); }).catch(() => {});
    return () => { off = true; };
  }, []);
  const brand = brands.find((b) => String(b.id) === String(brandSel)) || brands[0] || null;
  const brandId = brand ? String(brand.id) : '';
  const pickBrand = (v) => { setBrandSel(String(v)); try { localStorage.setItem(BRAND_KEY, String(v)); } catch { /* storage blocked */ } };

  const load = useLoad(() => (allowed ? attributeAdminService.overview(brandId || undefined) : Promise.resolve(null)), [brandId, allowed]);
  const attrs = load.data?.attributes || [];
  const sum = load.data?.summary;
  const shown = useMemo(() => (q
    ? attrs.filter((a) => a.name.toLowerCase().includes(q) || a.values.some((v) => v.value.toLowerCase().includes(q)))
    : attrs), [attrs, q]);
  const sel = selId === 'new' ? null : attrs.find((a) => a.id === selId) || null;

  const reorderAttrs = async (from, to) => {
    if (from === to || to < 0 || to >= attrs.length) return;
    const next = move(attrs, from, to);
    load.setData((d) => ({ ...d, attributes: next }));
    try { await attributeAdminService.reorder({ attributeIds: next.map((a) => a.id) }); }
    catch (e) { showError('saveFailed', errText(e, 'Could not change the order.')); load.reload(true); }
  };

  if (authLoading) return <div className="dashboard-sections web attr"><SkeletonPage kpis={4} rows={6} cols={3} label="Loading attributes…" /></div>;
  if (!allowed) return <div className="dashboard-sections web attr"><EmptyState title="You don't have access to this" description="Ask an admin to give your account the Product manager or Admin role." /></div>;

  const storeName = brandLabel(brand) || 'this store';
  const kpis = sum ? [
    { label: 'Attributes', value: n(sum.attributes), note: `${plural(sum.lists, 'list')}, ${n(sum.text)} free text` },
    { label: 'Choices', value: n(sum.choices), note: sum.hidden ? `${n(sum.hidden)} hidden` : 'None hidden' },
    { label: 'Not used', value: n(sum.unused), note: sum.unused ? `${sum.unusedNames.join(', ')}${sum.unused > sum.unusedNames.length ? '…' : ''}: no products in ${storeName}` : `Every choice is on a product in ${storeName}`, warn: !!sum.unused },
    { label: 'Menu filters', value: n(sum.menuFilters), note: 'Shown in Shop by …' },
  ] : [];

  return (
    <div className="dashboard-sections web attr">
      <header className="web-head">
        <div className="web-head-text">
          <h1 className="web-title">Attributes</h1>
          <p className="web-sub">The choices shoppers pick on a product (colour, size, pack) and the filters in the store’s menu. Shared by every store; counts are for the store you pick.</p>
        </div>
        <div className="attr-head-actions">
          {brands.length > 0 && <div className="web-dd" aria-label="Store"><Dropdown value={brandId} onChange={pickBrand} options={brands.map((b) => ({ value: String(b.id), label: brandLabel(b) }))} /></div>}
          <button type="button" className="web-btn web-btn--primary" onClick={() => setSelId('new')}>+ New attribute</button>
        </div>
      </header>

      {load.error ? <ErrorState message={`Couldn't load attributes — ${load.error}`} onRetry={() => load.reload()} /> : (
        <section className="attr-kpis" aria-label="Summary">
          {(load.loading && !sum ? [0, 1, 2, 3].map((i) => ({ skel: i })) : kpis).map((k, i) => (
            k.skel !== undefined ? <span key={i} className="attr-kpi attr-kpi--skel" /> : (
              <div key={k.label} className="attr-kpi">
                <span className="attr-kpi-label">{k.label}</span>
                <b className="attr-kpi-value">{k.value}</b>
                <span className={`attr-kpi-note${k.warn ? ' is-warn' : ''}`}>{k.note}</span>
              </div>
            )
          ))}
        </section>
      )}

      <div className="web-body">
        <section className="web-main">
          <div className="attr-card">
            <div className="attr-card-bar">
              <span>{q ? `${plural(shown.length, 'match', 'matches')}` : 'Drag to change the order on product pages and in the menu.'}</span>
              <label className="web-search">
                <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search attributes or values" aria-label="Search" />
                {search && <button type="button" className="web-search-x" aria-label="Clear search" onClick={() => setSearch('')}><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} /></button>}
              </label>
            </div>
            {load.loading && !attrs.length ? <SkeletonList rows={6} label="Loading attributes…" />
              : !shown.length ? <EmptyState title={q ? 'Nothing matches' : 'No attributes yet'} description={q ? 'Try another search.' : 'Add Color and Size first — they become the choices on product pages and the menu filters.'} />
                : (
                  <ul className="attr-list">
                    {shown.map((a) => {
                      const i = attrs.findIndex((x) => x.id === a.id);
                      const on = sel?.id === a.id;
                      const canDrag = !q && attrs.length > 1;
                      return (
                        <li
                          key={a.id}
                          className={`attr-row${on ? ' is-on' : ''}${dropOn === a.id ? ' is-drop' : ''}`}
                          draggable={canDrag}
                          onDragStart={(e) => { drag.current = i; e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={(e) => { if (drag.current != null) { e.preventDefault(); setDropOn(a.id); } }}
                          onDragLeave={() => setDropOn((d) => (d === a.id ? null : d))}
                          onDrop={(e) => { e.preventDefault(); setDropOn(null); const f = drag.current; drag.current = null; if (f != null) reorderAttrs(f, i); }}
                          onDragEnd={() => { drag.current = null; setDropOn(null); }}
                        >
                          {canDrag && <span className="attr-grip" aria-hidden="true"><HugeiconsIcon icon={DragDropVerticalIcon} size={16} strokeWidth={2} /></span>}
                          <button type="button" className="attr-row-main" aria-pressed={on} onClick={() => setSelId(a.id)}>
                            <span className="attr-row-top">
                              <b>{a.name}</b>
                              <StatusPill tone="neutral" size="sm">{a.list ? 'List of choices' : 'Free text'}</StatusPill>
                              {a.isRequired ? <StatusPill tone="progress" size="sm">Required</StatusPill> : <span className="attr-optional">Optional</span>}
                              {!a.shared && <span className="attr-optional">This store only</span>}
                            </span>
                            <span className="attr-row-values">{a.list ? (a.values.filter((v) => !v.hidden).map((v) => v.value).join(' · ') || 'No choices yet') : 'Each product types its own value'}</span>
                          </button>
                          <span className="attr-row-count"><b>{n(a.products)}</b><span>products</span></span>
                          {canDrag && (
                            <span className="attr-move">
                              <button type="button" className="web-icon-btn" aria-label={`Move ${a.name} up`} disabled={i === 0} onClick={() => reorderAttrs(i, i - 1)}><HugeiconsIcon icon={ArrowUp01Icon} size={14} strokeWidth={2} /></button>
                              <button type="button" className="web-icon-btn" aria-label={`Move ${a.name} down`} disabled={i === attrs.length - 1} onClick={() => reorderAttrs(i, i + 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} /></button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
          </div>
        </section>

        <Editor
          key={selId === 'new' ? 'new' : sel?.id || 'none'}
          attr={sel}
          isNew={selId === 'new'}
          storeName={storeName}
          onClose={() => setSelId(null)}
          onSaved={(id) => { if (id) setSelId(id); load.reload(true); }}
          onDeleted={() => { setSelId(null); load.reload(true); }}
          setAttr={(fn) => load.setData((d) => ({ ...d, attributes: d.attributes.map((x) => (x.id === sel?.id ? fn(x) : x)) }))}
        />
      </div>
    </div>
  );
}

// ─── Editor panel ────────────────────────────────────────────────────────────
function Editor({ attr, isNew, storeName, onClose, onSaved, onDeleted, setAttr }) {
  const open = isNew || !!attr;
  const [name, setName] = useState(attr?.name || '');
  const [type, setType] = useState(attr ? (attr.list ? 'select' : 'text') : 'select');
  const [required, setRequired] = useState(attr ? attr.isRequired : false);
  const [newValues, setNewValues] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(null); // { kind: 'attr' } | { kind: 'value', v }
  const [editing, setEditing] = useState(null); // { id, value }
  const drag = useRef(null);
  const [dropOn, setDropOn] = useState(null);

  const values = attr?.values || [];
  const dirty = isNew || (attr && (name.trim() !== attr.name || (type === 'text') !== !attr.list || required !== attr.isRequired));
  const isList = type === 'select';

  const save = async () => {
    setErr('');
    if (!name.trim()) return setErr('Give the attribute a name, like Color or Size.');
    setBusy(true);
    try {
      if (isNew) {
        const vals = newValues.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
        const r = await attributeAdminService.create({ name: name.trim(), type, isRequired: required, values: isList ? vals : [] });
        showSuccess('saveSuccess', 'Attribute added');
        setNewValues('');
        onSaved(r.id);
      } else {
        const r = await attributeAdminService.update(attr.id, { name: name.trim(), type, isRequired: required });
        showSuccess('saveSuccess', r.renamedVariations ? `Saved — ${plural(r.renamedVariations, 'product variation')} updated to the new name` : 'Attribute saved');
        onSaved(attr.id);
      }
    } catch (e) { setErr(errText(e, 'Could not save.')); } finally { setBusy(false); }
  };

  const addChoices = async () => {
    const vals = newValues.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
    if (!vals.length || !attr) return;
    setBusy(true); setErr('');
    try {
      const r = await attributeAdminService.addValues(attr.id, vals);
      setNewValues('');
      if (!r.added?.length) setErr('Those choices are already in the list.');
      onSaved(attr.id);
    } catch (e) { setErr(errText(e, 'Could not add the choices.')); } finally { setBusy(false); }
  };

  const setHidden = async (v, hidden) => {
    setErr('');
    setAttr((a) => ({ ...a, values: a.values.map((x) => (x.id === v.id ? { ...x, hidden } : x)) }));
    try { await attributeAdminService.updateValue(attr.id, v.id, { hidden }); onSaved(attr.id); }
    catch (e) { setErr(errText(e, 'Could not change it.')); onSaved(attr.id); }
  };

  const renameValue = async () => {
    const v = values.find((x) => x.id === editing?.id);
    const next = String(editing?.value || '').trim();
    setEditing(null);
    if (!v || !next || next === v.value) return;
    setBusy(true); setErr('');
    try {
      const r = await attributeAdminService.updateValue(attr.id, v.id, { value: next });
      showSuccess('saveSuccess', r.renamedVariations ? `Renamed — ${plural(r.renamedVariations, 'product variation')} updated` : 'Choice renamed');
      onSaved(attr.id);
    } catch (e) { setErr(errText(e, 'Could not rename it.')); } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true); setErr('');
    try {
      if (confirm.kind === 'attr') { await attributeAdminService.remove(attr.id); showSuccess('deleteSuccess', 'Attribute deleted'); setConfirm(null); onDeleted(); }
      else { await attributeAdminService.removeValue(attr.id, confirm.v.id); setConfirm(null); onSaved(attr.id); }
    } catch (e) { setErr(errText(e, 'Could not delete.')); setConfirm(null); } finally { setBusy(false); }
  };

  const reorderValues = async (from, to) => {
    if (from === to || to < 0 || to >= values.length) return;
    const next = move(values, from, to);
    setAttr((a) => ({ ...a, values: next }));
    try { await attributeAdminService.reorder({ attributeId: attr.id, valueIds: next.map((v) => v.id) }); }
    catch (e) { setErr(errText(e, 'Could not change the order.')); onSaved(attr.id); }
  };

  const chips = isList ? values.filter((v) => !v.hidden).slice(0, 6).map((v) => v.value) : ['80% cotton, 20% spandex'];
  const menuLine = !isList
    ? 'Not in the menu: free-text attributes only show on the product page.'
    : values.filter((v) => !v.hidden && v.products).map((v) => `${v.value} (${n(v.products)})`).join(' · ') || `No choice is on a product in ${storeName} yet, so it isn’t in the menu.`;

  return (
    <WebPanel
      wide
      open={open}
      title={isNew ? 'New attribute' : attr?.name}
      pill={!isNew && attr ? { label: `Used on ${plural(attr.products, 'product')}`, tone: 'neutral' } : null}
      onClose={onClose}
      hint="Pick an attribute to edit its choices."
      actions={open && (confirm ? (
        <ConfirmBar
          message={confirm.kind === 'attr' ? <>Delete <b>{attr.name}</b>? It disappears from product pages and the menu.</> : <>Delete the choice <b>{confirm.v.value}</b>?</>}
          confirmLabel="Delete" cancelLabel="Keep" busy={busy} onConfirm={doDelete} onCancel={() => setConfirm(null)}
        />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : isNew ? 'Add attribute' : dirty ? 'Save' : 'Saved'}</button>
          {!isNew && attr && (attr.products
            ? <button type="button" className="web-btn" disabled title="Change those products first">Can’t delete while products use it</button>
            : <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirm({ kind: 'attr' })} disabled={busy}>Delete</button>)}
        </>
      ))}
    >
      {open && (
        <>
          <WebField label="Name" htmlFor="at-name" hint={!isNew && attr?.variations ? `Renaming also updates the ${plural(attr.variations, 'product variation')} that use it, so the menu filters keep working.` : null}>
            <input id="at-name" className="web-input" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Color" />
          </WebField>

          <div className="attr-type-row">
            <div className="web-seg" role="group" aria-label="Type">
              {[['select', 'List of choices'], ['text', 'Free text']].map(([v, l]) => (
                <button key={v} type="button" className={`web-seg-btn${type === v ? ' is-on' : ''}`} aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>
              ))}
            </div>
            <Toggle label="Shopper must pick one" checked={required} onChange={setRequired} />
          </div>

          {isList ? (
            <div className="attr-values">
              {!isNew && (
                <>
                  <span className="attr-values-head"><span>Choices · drag to reorder · double-click to rename</span><span>{plural(values.length, 'choice')}</span></span>
                  {values.length > 0 && (
                    <ul className="attr-vlist">
                      {values.map((v, i) => (
                        <li
                          key={v.id}
                          className={`attr-vrow${v.hidden ? ' is-hidden' : ''}${dropOn === v.id ? ' is-drop' : ''}`}
                          draggable={values.length > 1 && !editing}
                          onDragStart={(e) => { drag.current = i; e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={(e) => { if (drag.current != null) { e.preventDefault(); setDropOn(v.id); } }}
                          onDragLeave={() => setDropOn((d) => (d === v.id ? null : d))}
                          onDrop={(e) => { e.preventDefault(); setDropOn(null); const f = drag.current; drag.current = null; if (f != null) reorderValues(f, i); }}
                          onDragEnd={() => { drag.current = null; setDropOn(null); }}
                        >
                          {values.length > 1 && <span className="attr-grip" aria-hidden="true"><HugeiconsIcon icon={DragDropVerticalIcon} size={14} strokeWidth={2} /></span>}
                          {editing?.id === v.id ? (
                            <input
                              className="web-input attr-vinput" autoFocus value={editing.value} aria-label="Rename choice"
                              onChange={(e) => setEditing({ id: v.id, value: e.target.value })}
                              onBlur={renameValue}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(null); }}
                            />
                          ) : (
                            <button type="button" className="attr-vname" title="Double-click to rename" onDoubleClick={() => setEditing({ id: v.id, value: v.value })}>
                              {v.value}{v.hidden && <span className="attr-vhidden"> (hidden)</span>}
                            </button>
                          )}
                          <span className="attr-vused">{v.products ? plural(v.products, 'product') : 'not used'}</span>
                          {v.hidden
                            ? <button type="button" className="web-btn web-btn--sm" onClick={() => setHidden(v, false)} disabled={busy}>Show</button>
                            : v.products
                              ? <button type="button" className="web-btn web-btn--sm" onClick={() => setHidden(v, true)} disabled={busy}>Hide</button>
                              : <button type="button" className="web-btn web-btn--sm web-btn--danger" onClick={() => setConfirm({ kind: 'value', v })} disabled={busy}>Delete</button>}
                          {values.length > 1 && (
                            <span className="attr-move">
                              <button type="button" className="web-icon-btn" aria-label={`Move ${v.value} up`} disabled={i === 0} onClick={() => reorderValues(i, i - 1)}><HugeiconsIcon icon={ArrowUp01Icon} size={14} strokeWidth={2} /></button>
                              <button type="button" className="web-icon-btn" aria-label={`Move ${v.value} down`} disabled={i === values.length - 1} onClick={() => reorderValues(i, i + 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} /></button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <div className="attr-add">
                <input
                  className="web-input" value={newValues} onChange={(e) => setNewValues(e.target.value)}
                  placeholder={isNew ? 'Choices, separated by commas: Black, White, Navy' : 'Add a choice and press Enter (or paste a list)'}
                  aria-label="Add choices"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isNew) { e.preventDefault(); addChoices(); } }}
                />
                {!isNew && <button type="button" className="web-btn" onClick={addChoices} disabled={busy || !newValues.trim()}>Add</button>}
              </div>
              {values.some((v) => v.products && !v.hidden) && (
                <p className="attr-note">A choice that’s on products can be hidden, not deleted, until those products use another one. Hidden choices stay on existing products but can’t be picked for new ones.</p>
              )}
            </div>
          ) : (
            <p className="attr-note">Free text: each product types its own value (like “Fabric: 80% cotton”). Shown on the product page, not in the menu filters.</p>
          )}

          {!isNew && (
            <div className="attr-preview" aria-label="How it shows on the store">
              <span className="attr-preview-cap">How it shows on {storeName}</span>
              <span className="attr-preview-label">Product page</span>
              <span className="attr-chips">{chips.length ? chips.map((c, i) => <span key={c} className={`attr-chip${i === 0 ? ' is-on' : ''}`}>{c}</span>) : <span className="attr-preview-line">No visible choices</span>}</span>
              <span className="attr-preview-label">Menu: Shop by {name.trim() || attr?.name}</span>
              <span className="attr-preview-line">{menuLine}</span>
            </div>
          )}
          {err && <p className="web-form-err" role="alert">{err}</p>}
        </>
      )}
    </WebPanel>
  );
}
