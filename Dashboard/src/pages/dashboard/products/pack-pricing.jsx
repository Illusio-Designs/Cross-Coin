import { useEffect, useMemo, useRef, useState } from 'react';
import { bundleService, brandService, productService } from '../../../services';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { PageHeader, Panel, FilterBar, ResponsiveTable } from '../../../components/Dashboard/primitives';
import { Badge, Select, Input, Switch } from '../../../components/ui';

const emptyForm = { id: null, pairs: 2, price: '', label: '', badge: '', display_order: 0, is_active: true, image_url: '' };

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
  const [imageUploading, setImageUploading] = useState(false);

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
        // Only offer ACTIVE products for pack pricing — hide inactive ones
        // (inactive globally, or disabled for the selected brand).
        const active = (Array.isArray(list) ? list : []).filter((p) => {
          if (String(p.status ?? 'active').toLowerCase() === 'inactive') return false;
          const b = Array.isArray(p.brands) ? p.brands.find((x) => String(x.slug) === String(brandSlug)) : null;
          if (b && String(b.status ?? 'active').toLowerCase() === 'inactive') return false;
          return true;
        });
        if (alive) setProducts(active);
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
    setForm({ id: t.id, pairs: t.pairs, price: t.price != null ? String(Number(t.price)) : '', label: t.label || '', badge: t.badge || '', display_order: t.display_order, is_active: t.is_active, image_url: t.image_url || '' });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (imageUploading) return;
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
        is_active: !!form.is_active, image_url: form.image_url || null,
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

      {/* Build Your Pack — store-wide mix tiers */}
      <BuildYourPackPanel key={brandId} brandId={brandId} />

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-color-text)', margin: '8px 0 10px' }}>Per-product packs</div>

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
            <TierImageInput key={`${brandId}:${productId}:${form.id || 'new'}`} value={form.image_url} onChange={image_url => setForm(prev => ({ ...prev, image_url }))} onBusyChange={setImageUploading} />
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
              <button type="submit" disabled={saving || imageUploading} className="cd-btn-primary" style={{ padding: '8px 16px' }}>{saving ? 'Saving…' : (editing ? 'Update pack' : 'Create pack')}</button>
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

// ── Build Your Pack: store-wide mix tiers (product_id = null + discount_percent) ──
const emptyMix = { id: null, pairs: 2, discount_percent: '', label: '', badge: '', display_order: 0, is_active: true, image_url: '' };
function BuildYourPackPanel({ brandId }) {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyMix);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await bundleService.list({ brand_id: brandId });
      // store-wide tiers only (no product attached)
      setTiers((res.tiers || []).filter((t) => t.product_id == null));
    } catch (err) {
      showError('loadFailed', typeof err === 'string' ? err : err.message);
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (t) => { setEditing(t); setForm({ id: t.id, pairs: t.pairs, discount_percent: t.discount_percent != null ? String(Number(t.discount_percent)) : '', label: t.label || '', badge: t.badge || '', display_order: t.display_order, is_active: t.is_active, image_url: t.image_url || '' }); };

  const save = async (e) => {
    e?.preventDefault();
    if (imageUploading) return;
    const pairs = parseInt(form.pairs, 10);
    const pct = parseFloat(form.discount_percent);
    if (!Number.isFinite(pairs) || pairs < 2) { showError('validation', 'Min items must be at least 2'); return; }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 90) { showError('validation', 'Discount % must be between 1 and 90'); return; }
    setSaving(true);
    try {
      const payload = {
        brand_id: brandId, scope: 'store', product_id: null,
        pairs, discount_percent: pct,
        label: form.label || `Any ${pairs}`, badge: form.badge || null,
        display_order: parseInt(form.display_order, 10) || 0, is_active: !!form.is_active, image_url: form.image_url || null,
      };
      if (form.id) { await bundleService.update(form.id, payload); showSuccess('saved', 'Pack tier updated'); }
      else { await bundleService.create(payload); showSuccess('saved', 'Pack tier created'); }
      setForm(emptyMix); setEditing(null); reload();
    } catch (err) {
      showError('saveFailed', typeof err === 'string' ? err : err.message);
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this pack tier?')) return;
    try { await bundleService.remove(id); showSuccess('deleted', 'Pack tier deleted'); reload(); }
    catch (err) { showError('deleteFailed', typeof err === 'string' ? err : err.message); }
  };

  const dim = (t) => ({ opacity: t.is_active ? 1 : 0.5 });
  const sorted = tiers.slice().sort((a, b) => a.pairs - b.pairs || a.display_order - b.display_order);
  const columns = [
    { key: 'image', label: 'Image', render: t => t.image_url ? <img src={t.image_url} alt="Bundle banner" style={{ width: 80, height: 52, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>No image</span> },
    { key: 'label', label: 'Tier', render: (t) => <span style={dim(t)}>{t.label || `Any ${t.pairs}`}</span> },
    { key: 'pairs', label: 'Min items', render: (t) => <b style={dim(t)}>{t.pairs}+</b> },
    { key: 'pct', label: 'Discount', render: (t) => <span style={{ ...dim(t), color: 'var(--ds-color-success, #15803d)', fontWeight: 700 }}>{Number(t.discount_percent)}% off</span> },
    { key: 'badge', label: 'Badge', render: (t) => <span style={dim(t)}>{t.badge || '—'}</span> },
    { key: 'active', label: 'Active', render: (t) => <Badge variant={t.is_active ? 'success' : 'default'}>{t.is_active ? 'Yes' : 'No'}</Badge> },
    { key: 'actions', label: '', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right', whiteSpace: 'nowrap' },
      render: (t) => (<span style={dim(t)}><button onClick={() => openEdit(t)} style={btnSecondary}>Edit</button>{' '}<button onClick={() => remove(t.id)} style={btnDanger}>Delete</button></span>) },
  ];

  return (
    <div style={{ marginBottom: 'var(--ds-space-5)' }}>
      <form onSubmit={save} className="ds-card" style={{ padding: 'var(--ds-space-4)', marginBottom: 'var(--ds-space-3)', maxWidth: 880 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-brand)', marginBottom: 4 }}>Build Your Pack — store-wide tiers</div>
        <div style={{ fontSize: 12.5, color: 'var(--ds-color-text-muted)', marginBottom: 12 }}>Mix-and-match ANY products: the whole pack gets a % off once it reaches the item count. Highest matching tier wins (5 items uses your 4-item tier). Leave empty to disable the feature.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
          <Field label="Min items" style={{ flex: '0 0 100px' }}>
            <Input type="number" min="2" value={form.pairs} onChange={(e) => setForm({ ...form, pairs: e.target.value })} required />
          </Field>
          <Field label="Discount %" style={{ flex: '0 0 110px' }}>
            <Input type="number" min="1" max="90" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} placeholder="10" required />
          </Field>
          <Field label="Label" style={{ flex: '1 1 150px' }}>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={`Any ${form.pairs || 2}`} />
          </Field>
          <Field label="Badge (optional)" style={{ flex: '1 1 150px' }}>
            <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Best value" />
          </Field>
          <Field label="Order" style={{ flex: '0 0 80px' }}>
            <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
          </Field>
        </div>
        <TierImageInput key={`${brandId}:${form.id || 'new'}`} value={form.image_url} onChange={image_url => setForm(prev => ({ ...prev, image_url }))} onBusyChange={setImageUploading} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Switch checked={!!form.is_active} onChange={(checked) => setForm({ ...form, is_active: checked })} label="Active" />
          <div style={{ flex: 1 }} />
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyMix); }} className="cd-btn-ghost" style={{ padding: '8px 14px' }}>Cancel</button>}
          <button type="submit" disabled={saving || imageUploading} className="cd-btn-primary" style={{ padding: '8px 16px' }}>{saving ? 'Saving…' : (editing ? 'Update tier' : 'Add tier')}</button>
        </div>
      </form>
      <Panel>
        <ResponsiveTable columns={columns} data={loading ? [] : sorted} rowKey="id"
          emptyMessage={loading ? 'Loading…' : 'No pack tiers yet. Add e.g. 2 items → 10%, 3 → 15%, 4 → 20%.'} />
      </Panel>
    </div>
  );
}

function TierImageInput({ value, onChange, onBusyChange }) {
  const [uploading, setUploading] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; onBusyChange(false); };
  }, [onBusyChange]);
  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showError('validation', 'Choose a JPG, PNG or WebP image'); return; }
    if (file.size > 5 * 1024 * 1024) { showError('validation', 'Choose an image smaller than 5 MB'); return; }
    setUploading(true); onBusyChange(true);
    try {
      const result = await productService.uploadImages([file]);
      const image = result.uploadedImages?.[0]?.url;
      if (!result.success || !image) throw new Error(result.message || 'Image upload failed');
      if (active.current) onChange(image);
    } catch (error) {
      if (active.current) showError('uploadFailed', error.message || 'Image upload failed');
    } finally {
      if (active.current) { setUploading(false); onBusyChange(false); }
    }
  };
  return (
    <div style={{ margin: '16px 0', padding: 14, border: '1px solid var(--ds-color-border)', borderRadius: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Bundle banner image</div>
      <p style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', marginBottom: 10 }}>Upload the image for this pack. On Velmique, active store-wide tiers use it on the test homepage. Save the tier to apply changes.</p>
      {value && <img src={value} alt="Bundle banner preview" style={{ display: 'block', width: '100%', maxWidth: 300, aspectRatio: '3 / 2', objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
        {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload} aria-label="Upload bundle banner image" />
      </label>
      {value && <button type="button" onClick={() => onChange('')} disabled={uploading} style={{ ...btnSecondary, marginLeft: 10 }}>Remove image</button>}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ds-color-text-muted)' }}>Landscape 3:2 · JPG, PNG or WebP · up to 5 MB</div>
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
