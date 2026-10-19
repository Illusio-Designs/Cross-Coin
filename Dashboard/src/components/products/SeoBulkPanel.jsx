import { useState, useEffect, useMemo, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { seoAdminService } from '../../services';
import { ConfirmModal } from '../common/AlertModal';
import { showSuccess } from '../../utils/toastNotification';

/*
 * "Fix SEO in bulk" — products missing a meta title, meta description or
 * photo text (alt text), editable in one table and saved together through
 * GET /api/admin/seo/products + PUT /api/admin/seo/products/bulk.
 */

const PAGE_SIZE = 25;
const TITLE_MAX = 60;
const DESC_MAX = 160;
const FIELDS = ['metaTitle', 'metaDescription', 'imageAlt'];

function Counter({ value, max }) {
  const n = String(value || '').length;
  return <span className={`pst-count${n > max ? ' is-over' : ''}`}>{n}/{max}</span>;
}

export default function SeoBulkPanel({ brands = [], initialBrandId = '', onClose }) {
  const [brandId, setBrandId] = useState(initialBrandId || '');
  const [gapsOnly, setGapsOnly] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edits, setEdits] = useState({}); // id → { metaTitle?, metaDescription?, imageAlt? }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reqId = useRef(0);

  useEffect(() => { const t = setTimeout(() => setSearch(searchText.trim()), 300); return () => clearTimeout(t); }, [searchText]);
  useEffect(() => { setPage(1); }, [brandId, gapsOnly, search]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    seoAdminService.listProducts({ page, limit: PAGE_SIZE, gaps_only: gapsOnly ? 'true' : undefined, search: search || undefined, brand_id: brandId || undefined })
      .then((res) => { if (id === reqId.current) setData(res); })
      .catch((e) => { if (id === reqId.current) setError(e?.message || 'Couldn’t load the list.'); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [page, gapsOnly, search, brandId, reloadKey]);

  const items = useMemo(() => data?.items || [], [data]);
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  // Only rows whose values really differ from what's stored count as changes.
  const original = (it, f) => (f === 'imageAlt' ? '' : (it.seo?.[f] || ''));
  const valueOf = (it, f) => (edits[it.id]?.[f] !== undefined ? edits[it.id][f] : original(it, f));
  const changed = useMemo(() => Object.entries(edits).map(([id, patch]) => {
    const it = byId.get(Number(id));
    if (!it) return null;
    const out = { id: Number(id) };
    FIELDS.forEach((f) => {
      if (patch[f] === undefined) return;
      const v = String(patch[f]).trim();
      if (f === 'imageAlt') { if (v) out.imageAlt = v; return; }
      if (v !== original(it, f).trim() && v) out[f] = v;
    });
    return Object.keys(out).length > 1 ? out : null;
  }).filter(Boolean), [edits, byId]);

  const setField = (id, f, v) => setEdits((e) => ({ ...e, [id]: { ...(e[id] || {}), [f]: v } }));

  const guard = (fn) => {
    if (!changed.length) { fn(); return; }
    setConfirm({ message: `You have ${changed.length} unsaved ${changed.length === 1 ? 'product' : 'products'}. Leave them and continue?`, onConfirm: () => { setConfirm(null); setEdits({}); fn(); } });
  };

  const saveAll = async () => {
    if (!changed.length || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await seoAdminService.bulkUpdate(changed);
      const failed = res?.errors || [];
      if (failed.length) {
        const keep = {};
        failed.forEach((f) => { if (edits[f.id]) keep[f.id] = edits[f.id]; });
        setEdits(keep);
        setSaveError(`${failed.length} couldn’t be saved: ${failed.map((f) => byId.get(Number(f.id))?.name || f.id).join(', ')}.`);
      } else {
        setEdits({});
      }
      if (res?.updated_count) showSuccess('seoSaved', `Saved ${res.updated_count} ${res.updated_count === 1 ? 'product' : 'products'}`);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setSaveError(e?.message || 'Couldn’t save. Nothing was changed — try again.');
    } finally {
      setSaving(false);
    }
  };

  const total = data?.total || 0;
  const pages = Math.max(1, data?.pages || 1);

  return (
    <div className="dashboard-page pst">
      <ConfirmModal title="Unsaved changes" confirmLabel="Leave them" tone="danger" message={confirm?.message || null} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
      <button type="button" className="pst-back" onClick={() => guard(onClose)}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} /> All products</button>
      <header className="pst-head">
        <div>
          <h1 className="pst-title">Fix SEO in bulk</h1>
          <p className="pst-sub">
            {data ? `${(data.gapsTotal ?? 0).toLocaleString('en-IN')} products are missing a meta title, description or photo text. ` : ''}
            Fill them in here and save them all at once. Photo text is added only to photos that have none.
          </p>
        </div>
      </header>

      <div className="pst-bar">
        <label className="pst-search">
          <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
          <input type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search product name" aria-label="Search products" />
        </label>
        <label className="pst-check">
          <input type="checkbox" checked={gapsOnly} onChange={(e) => guard(() => setGapsOnly(e.target.checked))} />
          Only products with gaps
        </label>
      </div>
      {brands.length > 1 && (
        <div className="pst-chips" role="group" aria-label="Brand">
          <button type="button" className={`pst-chip${brandId === '' ? ' is-on' : ''}`} onClick={() => guard(() => setBrandId(''))}>All brands</button>
          {brands.map((b) => (
            <button key={b.id} type="button" className={`pst-chip${String(brandId) === String(b.id) ? ' is-on' : ''}`} onClick={() => guard(() => setBrandId(String(b.id)))}>{b.display_name || b.name}</button>
          ))}
        </div>
      )}

      <section className="pst-panel">
        {error ? (
          <div className="pst-state"><p>{error}</p><button type="button" className="pst-btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button></div>
        ) : loading && !data ? (
          <div className="pst-state">Loading…</div>
        ) : !items.length ? (
          <div className="pst-state">{gapsOnly ? 'No gaps left — every product has its meta title, description and photo text.' : 'No products match.'}</div>
        ) : (
          <div className={`pst-scroll${loading ? ' is-busy' : ''}`}>
            <table className="pst-table pst-seo-table">
              <thead>
                <tr><th>Product</th><th>Meta title</th><th>Meta description</th><th>Photo text</th></tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const gaps = new Set(it.gaps || []);
                  return (
                    <tr key={it.id} className={edits[it.id] ? 'is-edited' : ''}>
                      <td className="pst-seo-name"><b>{it.name}</b><div className="pst-meta">{it.slug}</div></td>
                      <td>
                        <input className={`pst-in${gaps.has('metaTitle') ? ' is-gap' : ''}`} value={valueOf(it, 'metaTitle')} onChange={(e) => setField(it.id, 'metaTitle', e.target.value)} placeholder={`${it.name} | Shop name`} aria-label={`Meta title for ${it.name}`} />
                        <Counter value={valueOf(it, 'metaTitle')} max={TITLE_MAX} />
                      </td>
                      <td>
                        <textarea className={`pst-in${gaps.has('metaDescription') ? ' is-gap' : ''}`} rows={2} value={valueOf(it, 'metaDescription')} onChange={(e) => setField(it.id, 'metaDescription', e.target.value)} placeholder="One or two sentences shoppers see in Google" aria-label={`Meta description for ${it.name}`} />
                        <Counter value={valueOf(it, 'metaDescription')} max={DESC_MAX} />
                      </td>
                      <td>
                        {it.imageCount === 0 ? <span className="pst-meta">No photos yet</span> : it.imagesMissingAlt > 0 ? (
                          <>
                            <input className="pst-in is-gap" value={valueOf(it, 'imageAlt')} onChange={(e) => setField(it.id, 'imageAlt', e.target.value)} placeholder={it.imageAlt || `e.g. ${it.name} in black`} aria-label={`Photo text for ${it.name}`} />
                            <span className="pst-meta">{it.imagesMissingAlt} of {it.imageCount} photos have no text</span>
                          </>
                        ) : <span className="pst-meta">All {it.imageCount} photos have text</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="pst-foot">
          <span>{total ? `Page ${page} of ${pages} · ${total.toLocaleString('en-IN')} products` : ''}</span>
          {pages > 1 && (
            <span className="pst-pager">
              <button type="button" className="pst-icon-btn" disabled={page <= 1 || loading} onClick={() => guard(() => setPage((x) => x - 1))} aria-label="Previous page"><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} /></button>
              <button type="button" className="pst-icon-btn" disabled={page >= pages || loading} onClick={() => guard(() => setPage((x) => x + 1))} aria-label="Next page"><HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} /></button>
            </span>
          )}
        </div>
      </section>

      <div className="pst-savebar">
        {saveError && <span className="pst-err" role="alert">{saveError}</span>}
        <span className="pst-savebar-sp" />
        {changed.length > 0 && <button type="button" className="pst-btn" onClick={() => { setEdits({}); setSaveError(''); }} disabled={saving}>Undo changes</button>}
        <button type="button" className="pst-btn pst-btn--primary" onClick={saveAll} disabled={!changed.length || saving}>
          {saving ? 'Saving…' : `Save all${changed.length ? ` (${changed.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}
