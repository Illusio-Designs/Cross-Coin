import { useEffect, useMemo, useState } from 'react';
import { bundleService, brandService, productService } from '../../../services';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { PageHeader, Panel, FilterBar, ResponsiveTable } from '../../../components/Dashboard/primitives';
import { Badge, Select, Input, Switch } from '../../../components/ui';

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

  const dim = (t) => ({ opacity: t.is_active ? 1 : 0.5 });
  const sortedItems = items.slice().sort((a, b) => a.display_order - b.display_order || a.pairs - b.pairs);
  const packColumns = [
    { key: 'pack', label: 'Pack', render: (t) => <span style={dim(t)}>{t.label || `${t.pairs} Pairs`}</span> },
    { key: 'price', label: 'Pack price', render: (t) => <b style={dim(t)}>{money(t.price)}</b> },
    { key: 'perPair', label: 'Per pair', render: (t) => <span style={dim(t)}>{money(perPair(t.price, t.pairs))}</span> },
    ...(basePrice > 0
      ? [{ key: 'saving', label: 'Saving', render: (t) => <span style={{ ...dim(t), color: 'var(--ds-color-success, #15803d)', fontWeight: 700 }}>{saving100(t.price, t.pairs)}%</span> }]
      : []),
    { key: 'badge', label: 'Badge', render: (t) => <span style={dim(t)}>{t.badge || '—'}</span> },
    { key: 'active', label: 'Active', render: (t) => <Badge variant={t.is_active ? 'success' : 'default'}>{t.is_active ? 'Yes' : 'No'}</Badge> },
    {
      key: 'actions',
      label: '',
      headerStyle: { textAlign: 'right' },
      cellStyle: { textAlign: 'right', whiteSpace: 'nowrap' },
      render: (t) => (
        <span style={dim(t)}>
          <button onClick={() => openEdit(t)} style={btnSecondary}>Edit</button>{' '}
          <button onClick={() => remove(t.id)} style={btnDanger}>Delete</button>
        </span>
      ),
    },
  ];

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="Pack pricing"
        subtitle="Set buy-more-save-more packs for each product. 1 pair stays the product's own price; you set the exact total price for 2-pair, 3-pair packs, etc. A product shows the pack picker on the storefront only when it has an active pack."
        actions={
          <Select
            value={brandId}
            onChange={(v) => setBrandId(Number(v))}
            options={brands.length === 0
              ? [{ value: brandId, label: `Brand #${brandId}` }]
              : brands.map((b) => ({ value: b.id, label: b.name || b.slug || `Brand #${b.id}` }))}
            placeholder="Brand"
          />
        }
      />

      {/* Product picker */}
      <div className="ds-card" style={{ padding: 'var(--ds-space-4)', marginBottom: 'var(--ds-space-4)', maxWidth: 880 }}>
        <FilterBar search={search} onSearchChange={setSearch} placeholder="Search products by name…">
          <div style={{ flex: '1 1 320px', minWidth: 240 }}>
            <Select
              value={productId}
              onChange={(v) => setProductId(v)}
              options={filtered.map((p) => ({
                value: String(p.id),
                label: `${p.name}${(p.price ?? p.sellingPrice) ? ` — ₹${Number(p.price ?? p.sellingPrice)}` : ''}`,
              }))}
              placeholder={products.length ? 'Select a product…' : 'No products for this brand'}
            />
          </div>
        </FilterBar>
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
                <Input type="number" min="1" value={form.pairs} onChange={(e) => setForm({ ...form, pairs: e.target.value })} required />
              </Field>
              <Field label="Pack price ₹" style={{ flex: '0 0 130px' }}>
                <Input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={basePrice ? String(basePrice * (parseInt(form.pairs, 10) || 1)) : '499'} required />
              </Field>
              <Field label="Label" style={{ flex: '1 1 150px' }}>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={`${form.pairs || 1} Pairs`} />
              </Field>
              <Field label="Badge (optional)" style={{ flex: '1 1 150px' }}>
                <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Most Popular" />
              </Field>
              <Field label="Order" style={{ flex: '0 0 80px' }}>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: 'var(--ds-color-text-muted)', flexWrap: 'wrap' }}>
              <Switch checked={!!form.is_active} onChange={(checked) => setForm({ ...form, is_active: checked })} label="Active" />
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
            <ResponsiveTable
              columns={packColumns}
              data={loading ? [] : sortedItems}
              rowKey="id"
              emptyMessage={loading ? 'Loading…' : 'No packs for this product yet. Add one above — e.g. 2 pairs for ₹499, 3 pairs for ₹699.'}
            />
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
const pad = { padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' };
const btnSecondary = { padding: '6px 10px', border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ds-color-text-muted)' };
const btnDanger = { padding: '6px 10px', border: '1px solid var(--ds-color-danger-border, #fecaca)', background: 'var(--ds-color-danger-bg, #fef2f2)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ds-color-danger, #991b1b)' };
