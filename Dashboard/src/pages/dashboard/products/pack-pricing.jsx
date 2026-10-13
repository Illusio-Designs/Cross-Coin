import { useEffect, useMemo, useState } from 'react';
import { bundleService, brandService, productService } from '../../../services';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { PageHeader, Panel } from '../../../components/Dashboard/primitives';

const emptyForm = { id: null, pairs: 2, price: '', label: '', badge: '', display_order: 0, is_active: true };

export default function PackPricingManager() {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(1);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    brandService.getAllBrands(true)
      .then((r) => { if (r?.success && Array.isArray(r.data)) setBrands(r.data); })
      .catch(() => {});
  }, []);

  const brandSlug = useMemo(() => (brands.find((b) => b.id === brandId)?.slug) || '', [brands, brandId]);

  // Products for the selected brand (lean list).
  useEffect(() => {
    let alive = true;
    setProductId(''); setItems([]); setForm(emptyForm); setEditing(null);
    if (!brandSlug) { setProducts([]); return; }
    productService.getAllProducts(1, 1000, '', null, false, brandSlug, true)
      .then((res) => {
        const list = res?.products || res?.data?.products || res?.data || (Array.isArray(res) ? res : []);
        if (alive) setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => { if (alive) setProducts([]); });
    return () => { alive = false; };
  }, [brandSlug]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)) || null,
    [products, productId],
  );
  const basePrice = selectedProduct
    ? Number(selectedProduct.price ?? selectedProduct.sellingPrice ?? selectedProduct.minPrice ?? selectedProduct.min_price ?? 0)
    : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => String(p.name || '').toLowerCase().includes(q));
  }, [products, search]);

  const reload = async () => {
    if (!productId) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await bundleService.list({ brand_id: brandId, product_id: productId });
      setItems(res.tiers || []);
    } catch (err) {
      showError('loadFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [productId, brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ id: t.id, pairs: t.pairs, price: t.price != null ? String(Number(t.price)) : '', label: t.label || '', badge: t.badge || '', display_order: t.display_order, is_active: t.is_active });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!productId) { showError('validation', 'Select a product first'); return; }
    const pairs = parseInt(form.pairs, 10);
    const price = parseFloat(form.price);
    if (!Number.isFinite(pairs) || pairs < 1) { showError('validation', 'Pairs must be at least 1'); return; }
    if (!Number.isFinite(price) || price <= 0) { showError('validation', 'Enter the pack price'); return; }
    setSaving(true);
    try {
      const payload = {
        brand_id: brandId,
        product_id: Number(productId),
        pairs,
        price,
        label: form.label || `${pairs} Pair${pairs > 1 ? 's' : ''}`,
        badge: form.badge || null,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: !!form.is_active,
      };
      if (form.id) { await bundleService.update(form.id, payload); showSuccess('saved', 'Pack updated'); }
      else { await bundleService.create(payload); showSuccess('saved', 'Pack created'); }
      setForm(emptyForm); setEditing(null); reload();
    } catch (err) {
      showError('saveFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this pack?')) return;
    try { await bundleService.remove(id); showSuccess('deleted', 'Pack deleted'); reload(); }
    catch (err) { showError('deleteFailed', typeof err === 'string' ? err : err.message); }
  };

  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const perPair = (price, pairs) => (pairs > 0 ? Number(price) / pairs : 0);
  const saving100 = (price, pairs) => (basePrice > 0 && pairs > 0 ? Math.round((1 - Number(price) / (basePrice * pairs)) * 100) : 0);

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="Pack pricing"
        subtitle="Set buy-more-save-more packs for each product. 1 pair stays the product's own price; you set the exact total price for 2-pair, 3-pair packs, etc. A product shows the pack picker on the storefront only when it has an active pack."
        actions={
          <select value={brandId} onChange={(e) => setBrandId(Number(e.target.value))} title="Brand" style={sel}>
            {brands.length === 0 && <option value={brandId}>Brand #{brandId}</option>}
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name || b.slug || `Brand #${b.id}`}</option>)}
          </select>
        }
      />

      {/* Product picker */}
      <div className="ds-card" style={{ padding: 'var(--ds-space-4)', marginBottom: 'var(--ds-space-4)', maxWidth: 880 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Find a product" style={{ flex: '1 1 220px' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" style={input} />
          </Field>
          <Field label="Product" style={{ flex: '2 1 320px' }}>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} style={input}>
              <option value="">{products.length ? 'Select a product…' : 'No products for this brand'}</option>
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{(p.price ?? p.sellingPrice) ? ` — ₹${Number(p.price ?? p.sellingPrice)}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {selectedProduct && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
            <b style={{ color: 'var(--ds-color-text)' }}>{selectedProduct.name}</b> · 1 pair = <b style={{ color: 'var(--ds-color-text)' }}>{basePrice > 0 ? money(basePrice) : 'its own price'}</b> (sold as single pair)
          </div>
        )}
      </div>

      {!productId ? (
        <Panel><div style={pad}>Pick a product above to set its packs.</div></Panel>
      ) : (
        <>
          {/* Pack form */}
          <form onSubmit={save} className="ds-card" style={{ padding: 'var(--ds-space-4)', marginBottom: 'var(--ds-space-4)', maxWidth: 880 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-brand)', marginBottom: 12 }}>{editing ? 'Edit pack' : 'New pack'}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
              <Field label="Pairs" style={{ flex: '0 0 90px' }}>
                <input type="number" min="1" value={form.pairs} onChange={(e) => setForm({ ...form, pairs: e.target.value })} style={input} required />
              </Field>
              <Field label="Pack price ₹" style={{ flex: '0 0 130px' }}>
                <input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={basePrice ? String(basePrice * (parseInt(form.pairs, 10) || 1)) : '499'} style={input} required />
              </Field>
              <Field label="Label" style={{ flex: '1 1 150px' }}>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={`${form.pairs || 1} Pairs`} style={input} />
              </Field>
              <Field label="Badge (optional)" style={{ flex: '1 1 150px' }}>
                <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Most Popular" style={input} />
              </Field>
              <Field label="Order" style={{ flex: '0 0 80px' }}>
                <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} style={input} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: 'var(--ds-color-text-muted)', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
              </label>
              {form.price && form.pairs ? (
                <>
                  <span>·</span>
                  <span>{form.pairs} pairs = <b style={{ color: 'var(--ds-color-text)' }}>{money(form.price)}</b> ({money(perPair(form.price, form.pairs))}/pair{basePrice > 0 ? `, ${saving100(form.price, form.pairs)}% off` : ''})</span>
                </>
              ) : null}
              <div style={{ flex: 1 }} />
              {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="cd-btn-ghost" style={{ padding: '8px 14px' }}>Cancel</button>}
              <button type="submit" disabled={saving} className="cd-btn-primary" style={{ padding: '8px 16px' }}>{saving ? 'Saving…' : (editing ? 'Update pack' : 'Create pack')}</button>
            </div>
          </form>

          {/* Packs table */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-color-text)' }}>Packs for this product</div>
              {items.length > 0 && <button onClick={openCreate} className="ds-btn ds-btn--primary" style={{ padding: '6px 12px' }}>+ New pack</button>}
            </div>
            {loading ? (
              <div style={pad}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={pad}>No packs for this product yet. Add one above — e.g. 2 pairs for ₹499, 3 pairs for ₹699.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr>{['Pack', 'Pack price', 'Per pair', basePrice > 0 ? 'Saving' : '', 'Badge', 'Active', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {items.slice().sort((a, b) => a.display_order - b.display_order || a.pairs - b.pairs).map((t) => (
                      <tr key={t.id} style={{ borderTop: '1px solid var(--ds-color-border-soft)', opacity: t.is_active ? 1 : 0.5 }}>
                        <td style={td}>{t.label || `${t.pairs} Pairs`}</td>
                        <td style={td}><b>{money(t.price)}</b></td>
                        <td style={td}>{money(perPair(t.price, t.pairs))}</td>
                        {basePrice > 0 && <td style={{ ...td, color: 'var(--ds-color-success, #15803d)', fontWeight: 700 }}>{saving100(t.price, t.pairs)}%</td>}
                        {basePrice <= 0 && <td style={td}></td>}
                        <td style={td}>{t.badge || '—'}</td>
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
        </>
      )}
    </div>
  );
}

const Field = ({ label, children, style }) => (
  <label style={{ display: 'block', ...style }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-color-text-muted)', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);
const input = { width: '100%', padding: '8px 10px', border: '1px solid var(--ds-color-border)', borderRadius: 6, fontSize: 14, outline: 'none', background: 'var(--ds-color-surface)' };
const sel = { padding: '8px 10px', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-radius-sm)', fontSize: 14, background: 'var(--ds-color-surface)', fontWeight: 600 };
const pad = { padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' };
const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--ds-color-border)' };
const td = { padding: '10px 12px', color: 'var(--ds-color-text)' };
const btnSecondary = { padding: '6px 10px', border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ds-color-text-muted)' };
const btnDanger = { padding: '6px 10px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#991b1b' };
