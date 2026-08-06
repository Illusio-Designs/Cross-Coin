/**
 * Bulk Product SEO editor.
 *
 * Table view of every product with editable meta title / meta description /
 * meta keywords inline. Admin can sweep through and fix gaps in one
 * session instead of opening each product modal. "Save all" sends every
 * dirty row through PUT /api/admin/seo/products/bulk in one request.
 *
 * Tips for staff using this page (also rendered as a banner at the top
 * of the page so it's discoverable):
 *   - Empty fields don't fall back to nothing — they fall back to the
 *     auto-fill defaults (title template, description from product body).
 *   - Setting a metaTitle here is the equivalent of typing it on each
 *     product's edit modal; the auto-fill helper still runs on save for
 *     anything left empty.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { seoAdminService } from '../../../services';
import { showSuccess, showError } from '../../../utils/toastNotification';
import SeoLengthMeter from '../../../components/common/SeoLengthMeter';
import { PageHeader, Panel, FilterBar } from '../../../components/Dashboard/primitives';

const PAGE_SIZE = 25;

export default function SeoBulkEditor({ brandId = 1 } = {}) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [items, setItems] = useState([]);
  const [edits, setEdits] = useState({});           // { [productId]: { metaTitle?, metaDescription?, metaKeywords? } }
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gapsOnly, setGapsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Debounce search keystrokes by 350 ms so we don't refetch on every char.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await seoAdminService.listProducts({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        gaps_only: gapsOnly || undefined,
        brand_id: brandId,
      });
      setItems(res.items || []);
      setPages(res.pages || 1);
    } catch (err) {
      showError('loadFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, gapsOnly, brandId]);

  useEffect(() => { load(); }, [load]);

  const editValue = (id, field, value) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const dirtyCount = useMemo(() => Object.values(edits).filter(v => v && Object.keys(v).length).length, [edits]);

  const saveAll = async () => {
    if (dirtyCount === 0) return;
    const dirtyItems = Object.entries(edits)
      .filter(([, patch]) => patch && Object.keys(patch).length)
      .map(([id, patch]) => ({ id: Number(id), ...patch }));
    setSaving(true);
    try {
      const res = await seoAdminService.bulkUpdate(dirtyItems);
      showSuccess('saved', `Saved ${res.updated_count} products. ${res.error_count} failed.`);
      setEdits({});
      load();
    } catch (err) {
      showError('saveFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="Bulk Product SEO"
        subtitle="Edit meta title, description and keywords for many products at once."
        actions={
          <button
            onClick={saveAll}
            disabled={saving || dirtyCount === 0}
            className="ds-btn ds-btn--primary"
          >
            {saving ? 'Saving…' : dirtyCount === 0 ? 'No changes' : `Save (${dirtyCount} rows)`}
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by name or slug…"
      >
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ds-color-text)' }}>
          <input
            type="checkbox"
            checked={gapsOnly}
            onChange={e => { setGapsOnly(e.target.checked); setPage(1); }}
          />
          Only show products with gaps
        </label>
      </FilterBar>

      <div style={{
        padding: 'var(--ds-space-3)',
        background: 'var(--ds-color-warn-bg)',
        border: '1px solid var(--ds-color-warn-bd)',
        borderRadius: 'var(--ds-radius-sm)',
        fontSize: 'var(--ds-text-sm)',
        color: 'var(--ds-color-warn)',
        marginBottom: 'var(--ds-space-3)',
      }}>
        Leave a field blank to fall back to the auto-fill default (the brand title template, the product description, etc.). Saving here only writes the fields you actually changed.
      </div>

      <Panel flush style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>No products match.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--ds-color-surface-soft)', borderBottom: '1px solid var(--ds-color-border)' }}>
                  <th style={th}>Product</th>
                  <th style={th}>Meta Title</th>
                  <th style={th}>Meta Description</th>
                  <th style={th}>Keywords</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => {
                  const edited = edits[p.id] || {};
                  const title       = edited.metaTitle       ?? p.seo.metaTitle;
                  const description = edited.metaDescription ?? p.seo.metaDescription;
                  const keywords    = edited.metaKeywords    ?? p.seo.metaKeywords;
                  const isDirty = Object.keys(edited).length > 0;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--ds-color-border-soft)', background: isDirty ? '#fffbeb' : 'var(--ds-color-surface)' }}>
                      <td style={{ ...td, verticalAlign: 'top', minWidth: 180 }}>
                        <div style={{ fontWeight: 600, color: 'var(--ds-color-text)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', fontFamily: 'ui-monospace, monospace' }}>{p.slug}</div>
                        {isDirty && <div style={{ marginTop: 4, fontSize: 11, color: '#d97706', fontWeight: 600 }}>● unsaved</div>}
                      </td>
                      <td style={{ ...td, verticalAlign: 'top', minWidth: 220 }}>
                        <input
                          value={title}
                          onChange={e => editValue(p.id, 'metaTitle', e.target.value)}
                          placeholder="Auto: from product name"
                          style={cellInput}
                        />
                        <SeoLengthMeter value={title || ''} type="title" />
                      </td>
                      <td style={{ ...td, verticalAlign: 'top', minWidth: 280 }}>
                        <textarea
                          value={description}
                          onChange={e => editValue(p.id, 'metaDescription', e.target.value)}
                          placeholder="Auto: from product description"
                          rows={2}
                          style={{ ...cellInput, resize: 'vertical', minHeight: 50 }}
                        />
                        <SeoLengthMeter value={description || ''} type="description" />
                      </td>
                      <td style={{ ...td, verticalAlign: 'top', minWidth: 180 }}>
                        <input
                          value={keywords}
                          onChange={e => editValue(p.id, 'metaKeywords', e.target.value)}
                          placeholder="Auto: name, brand, india"
                          style={cellInput}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 'var(--ds-space-4)' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="ds-btn ds-btn--sm">← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="ds-btn ds-btn--sm">Next →</button>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '10px 12px', color: 'var(--ds-color-text-muted)' };
const cellInput = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 5,
  fontSize: 13,
  background: 'var(--ds-color-surface)',
  outline: 'none',
};
const pageBtn = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  background: 'var(--ds-color-surface)',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  color: 'var(--ds-color-text-muted)',
};
