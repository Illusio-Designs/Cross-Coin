import { useEffect, useState } from 'react';
import { bundleService, brandService } from '../../../services';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { PageHeader, Panel } from '../../../components/Dashboard/primitives';

const emptyForm = { id: null, pairs: 2, discount_percent: 15, label: '', badge: '', display_order: 0, is_active: true };

export default function PackPricingManager() {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(299); // sample single-pair price

  const reload = async () => {
    setLoading(true);
    try {
      const res = await bundleService.list({ brand_id: brandId });
      setItems(res.tiers || []);
    } catch (err) {
      showError('loadFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    brandService.getAllBrands(true)
      .then((r) => { if (r?.success && Array.isArray(r.data)) setBrands(r.data); })
      .catch(() => {});
  }, []);
  useEffect(() => { reload(); }, [brandId]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ id: t.id, pairs: t.pairs, discount_percent: Number(t.discount_percent), label: t.label || '', badge: t.badge || '', display_order: t.display_order, is_active: t.is_active });
  };

  const save = async (e) => {
    e?.preventDefault();
    const pairs = parseInt(form.pairs, 10);
    if (!Number.isFinite(pairs) || pairs < 1) { showError('validation', 'Pairs must be at least 1'); return; }
    setSaving(true);
    try {
      const payload = {
        brand_id: brandId,
        pairs,
        discount_percent: Number(form.discount_percent) || 0,
        label: form.label || `${pairs} Pair${pairs > 1 ? 's' : ''}`,
        badge: form.badge || null,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: !!form.is_active,
      };
      if (form.id) { await bundleService.update(form.id, payload); showSuccess('saved', 'Tier updated'); }
      else { await bundleService.create(payload); showSuccess('saved', 'Tier created'); }
      setForm(emptyForm); setEditing(null); reload();
    } catch (err) {
      showError('saveFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this pack tier?')) return;
    try { await bundleService.remove(id); showSuccess('deleted', 'Tier deleted'); reload(); }
    catch (err) { showError('deleteFailed', typeof err === 'string' ? err : err.message); }
  };

  const price = (pairs, disc) => Math.round(preview * pairs * (1 - (Number(disc) || 0) / 100));

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="Pack pricing"
        subtitle="Buy-more-save-more tiers, per brand. A pack's price = pairs × the product's single-pair price × (1 − discount), so the same tiers apply to every product automatically. Packs appear on the storefront only once at least one active tier exists."
        actions={
          <>
            <select value={brandId} onChange={(e) => setBrandId(Number(e.target.value))} title="Manage packs for this brand" style={selStyle}>
              {brands.length === 0 && <option value={brandId}>Brand #{brandId}</option>}
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name || b.slug || `Brand #${b.id}`}</option>)}
            </select>
            <button onClick={openCreate} className="ds-btn ds-btn--primary">+ New tier</button>
          </>
        }
      />

      <form onSubmit={save} className="ds-card" style={{ padding: 'var(--ds-space-4)', marginBottom: 'var(--ds-space-4)', maxWidth: 880 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-brand)', marginBottom: 12 }}>{editing ? 'Edit tier' : 'New tier'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
          <Field label="Pairs" style={{ flex: '0 0 100px' }}>
            <input type="number" min="1" value={form.pairs} onChange={(e) => setForm({ ...form, pairs: e.target.value })} style={inputStyle} required />
          </Field>
          <Field label="Discount %" style={{ flex: '0 0 120px' }}>
            <input type="number" min="0" max="90" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Label" style={{ flex: '1 1 160px' }}>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={`${form.pairs || 1} Pairs`} style={inputStyle} />
          </Field>
          <Field label="Badge (optional)" style={{ flex: '1 1 160px' }}>
            <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Most Popular" style={inputStyle} />
          </Field>
          <Field label="Order" style={{ flex: '0 0 90px' }}>
            <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} style={inputStyle} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: 'var(--ds-color-text-muted)', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
          <span>·</span>
          <span>Preview at ₹
            <input type="number" value={preview} onChange={(e) => setPreview(Number(e.target.value) || 0)} style={{ width: 70, ...inputStyle, display: 'inline-block', padding: '4px 8px', margin: '0 4px' }} />
            /pair → <b style={{ color: 'var(--ds-color-text)' }}>{form.pairs || 1} pairs = ₹{price(form.pairs || 1, form.discount_percent)}</b>
          </span>
          <div style={{ flex: 1 }} />
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="cd-btn-ghost" style={{ padding: '8px 14px' }}>Cancel</button>}
          <button type="submit" disabled={saving} className="cd-btn-primary" style={{ padding: '8px 16px' }}>{saving ? 'Saving…' : (editing ? 'Update tier' : 'Create tier')}</button>
        </div>
      </form>

      <Panel>
        {loading ? (
          <div style={pad}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={pad}>No pack tiers yet. Add one above — a common set is 1 pair (0%), 2 pairs (15% off), 3 pairs (25% off).</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>{['Pairs', 'Discount', 'Label', 'Badge', `Example (₹${preview}/pair)`, 'Active', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.slice().sort((a, b) => a.display_order - b.display_order || a.pairs - b.pairs).map((t) => (
                  <tr key={t.id} style={{ borderTop: '1px solid var(--ds-color-border-soft)', opacity: t.is_active ? 1 : 0.5 }}>
                    <td style={td}>{t.pairs}</td>
                    <td style={td}>{Number(t.discount_percent)}%</td>
                    <td style={td}>{t.label || '—'}</td>
                    <td style={td}>{t.badge || '—'}</td>
                    <td style={td}>₹{price(t.pairs, t.discount_percent)}</td>
                    <td style={td}>{t.is_active ? 'Yes' : 'No'}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEdit(t)} style={btnSecondary}>Edit</button>{' '}
                      <button onClick={() => remove(t.id)} style={btnDanger}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

const Field = ({ label, children, style }) => (
  <label style={{ display: 'block', ...style }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-color-text-muted)', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--ds-color-border)', borderRadius: 6, fontSize: 14, outline: 'none', background: 'var(--ds-color-surface)' };
const selStyle = { padding: '8px 10px', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-radius-sm)', fontSize: 14, background: 'var(--ds-color-surface)', fontWeight: 600 };
const pad = { padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' };
const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--ds-color-border)' };
const td = { padding: '10px 12px', color: 'var(--ds-color-text)' };
const btnSecondary = { padding: '6px 10px', border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ds-color-text-muted)' };
const btnDanger = { padding: '6px 10px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#991b1b' };
