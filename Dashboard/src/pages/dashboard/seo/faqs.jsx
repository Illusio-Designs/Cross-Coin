import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { faqService, productService } from '../../../services';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { PageHeader, Panel } from '../../../components/Dashboard/primitives';
import { Select } from '../../../components/ui';
import { richHtml } from '../../../utils/sanitizeHtml';

// Lazy-load the rich-text editor — Quill ships a lot of JS we don't want
// in the admin shell's initial bundle.
const Editor = dynamic(() => import('../../../components/common/Editor'), {
  ssr: false,
  loading: () => <div style={{ height: 180, border: '1px solid var(--ds-color-border)', borderRadius: 6 }} />,
});

const ATTACH_TYPES = [
  { value: 'global',   label: 'Global (whole site)' },
  { value: 'product',  label: 'Specific product' },
  { value: 'category', label: 'Specific category' },
  { value: 'page',     label: 'Specific page' },
];

// Sentinel value for the "All products (brand-wide)" choice in the product
// picker — saved as a FAQ with attached_to_id = null that the storefront shows
// on every product page of the brand.
const ALL_PRODUCTS = '__all_products__';

const emptyForm = {
  id: null,
  attached_to_type: 'global',
  attached_to_id: '',
  attached_to_slug: '',
  product_ids: [],   // product scope: array of product ids, or [ALL_PRODUCTS]
  question: '',
  answer: '',
  display_order: 0,
  is_active: true,
};

export default function FaqsManager({ brandId = 1, brandSlug = 'crosscoin' }) {
  const [items, setItems] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);

  // Brand-scoped product list for the "Specific product" picker. Lean list
  // mode keeps the payload small; one generous page covers a sock catalogue.
  useEffect(() => {
    let off = false;
    productService.getAllProducts(1, 500, '', null, false, brandSlug, true)
      .then((res) => { if (!off) setProducts(res.products || res.data || []); })
      .catch(() => { if (!off) setProducts([]); });
    return () => { off = true; };
  }, [brandSlug]);

  const productName = (id) => {
    const p = products.find((x) => String(x.id) === String(id));
    return p ? (p.name || p.title || `#${id}`) : `#${id}`;
  };

  const reload = async () => {
    setLoading(true);
    try {
      const params = { brand_id: brandId };
      if (filterType !== 'all') params.type = filterType;
      const res = await faqService.list(params);
      setItems(res.faqs || []);
    } catch (err) {
      showError('loadFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setLoading(false);
    }
  };

  // Brand comes from the SEO hub's single shared selector (via the brandId
  // prop) — re-scope FAQs whenever it or the scope filter changes.
  useEffect(() => { reload(); }, [filterType, brandId]);

  const groups = useMemo(() => {
    const buckets = {};
    for (const f of items) {
      const key = `${f.attached_to_type}:${f.attached_to_id || f.attached_to_slug || 'all'}`;
      if (!buckets[key]) buckets[key] = { type: f.attached_to_type, ref: f.attached_to_id || f.attached_to_slug || null, rows: [] };
      buckets[key].rows.push(f);
    }
    return Object.values(buckets);
  }, [items]);

  // FAQ SEO status — moved here from the SEO Health page so the score shows
  // where FAQs are actually managed. Counts respect the current scope filter.
  const faqActive = useMemo(() => items.filter(f => f.is_active).length, [items]);
  const faqTotal = items.length;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (faq) => {
    setEditing(faq);
    setForm({
      id: faq.id,
      attached_to_type: faq.attached_to_type,
      attached_to_id: faq.attached_to_id || '',
      attached_to_slug: faq.attached_to_slug || '',
      // Seed the product picker: a specific id, or the brand-wide marker when
      // the row has no id (attached_to_type product + null id = all products).
      product_ids: faq.attached_to_type === 'product'
        ? (faq.attached_to_id ? [faq.attached_to_id] : [ALL_PRODUCTS])
        : [],
      question: faq.question,
      answer: faq.answer,
      display_order: faq.display_order,
      is_active: faq.is_active,
    });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      showError('validation', 'Question and answer are required');
      return;
    }
    const isProduct = form.attached_to_type === 'product';
    if (isProduct && (!form.product_ids || form.product_ids.length === 0)) {
      showError('validation', 'Pick at least one product (or choose “All products”)');
      return;
    }
    setSaving(true);
    try {
      const base = {
        brand_id: brandId,
        attached_to_type: form.attached_to_type,
        attached_to_slug: form.attached_to_type === 'page' ? (form.attached_to_slug || null) : null,
        question: form.question.trim(),
        answer: form.answer,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: !!form.is_active,
      };

      if (form.id) {
        // Editing an existing row updates that one row. For a product FAQ the
        // row targets a single product (or brand-wide when "All products").
        const attached_to_id = isProduct
          ? (form.product_ids.includes(ALL_PRODUCTS) ? null : (form.product_ids[0] || null))
          : (form.attached_to_id || null);
        await faqService.update(form.id, { ...base, attached_to_id });
        showSuccess('saved', 'FAQ updated');
      } else if (isProduct) {
        // Create: "All products" → one brand-wide row (null id); otherwise one
        // row per selected product so the same Q&A attaches to each.
        if (form.product_ids.includes(ALL_PRODUCTS)) {
          await faqService.create({ ...base, attached_to_id: null });
        } else {
          for (const pid of form.product_ids) {
            await faqService.create({ ...base, attached_to_id: pid });
          }
        }
        showSuccess('saved', form.product_ids.includes(ALL_PRODUCTS)
          ? 'Brand-wide product FAQ created'
          : `FAQ added to ${form.product_ids.length} product${form.product_ids.length === 1 ? '' : 's'}`);
      } else {
        await faqService.create({ ...base, attached_to_id: form.attached_to_id || null });
        showSuccess('saved', 'FAQ created');
      }
      setForm(emptyForm);
      setEditing(null);
      reload();
    } catch (err) {
      showError('saveFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await faqService.remove(id);
      showSuccess('deleted', 'FAQ deleted');
      reload();
    } catch (err) {
      showError('deleteFailed', typeof err === 'string' ? err : err.message);
    }
  };

  const move = async (faq, dir) => {
    const peers = items
      .filter(f => f.attached_to_type === faq.attached_to_type
        && f.attached_to_id === faq.attached_to_id
        && f.attached_to_slug === faq.attached_to_slug)
      .sort((a, b) => a.display_order - b.display_order);
    const i = peers.findIndex(p => p.id === faq.id);
    const j = i + dir;
    if (j < 0 || j >= peers.length) return;
    const swap = peers[j];
    try {
      await faqService.reorder([
        { id: faq.id,  display_order: swap.display_order },
        { id: swap.id, display_order: faq.display_order },
      ]);
      reload();
    } catch (err) {
      showError('reorderFailed', typeof err === 'string' ? err : err.message);
    }
  };

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="FAQs"
        subtitle="Manage site-wide and per-product FAQs. Global FAQs now show on the storefront home (before the blog) and at the bottom of every product page; answers also emit FAQPage schema for SEO."
        actions={
          <>
            <div style={{ minWidth: 180 }}>
              <Select
                value={filterType}
                onChange={(v) => setFilterType(v)}
                options={[{ value: 'all', label: 'All scopes' }, ...ATTACH_TYPES]}
              />
            </div>
            <button onClick={openCreate} className="ds-btn ds-btn--primary">+ New FAQ</button>
          </>
        }
      />

      {/* FAQ SEO status — relocated from the SEO Health page. */}
      <Panel
        title="FAQ status"
        subtitle={`${faqActive} active / ${faqTotal} total${filterType !== 'all' ? ' in this scope' : ''}`}
        style={{ marginBottom: 'var(--ds-space-4)' }}
      >
        {!loading && faqTotal === 0 ? (
          <div style={{
            padding: 16,
            background: 'var(--ds-color-warn-bg)',
            border: '1px solid var(--ds-color-warn-bd)',
            borderRadius: 'var(--ds-radius-sm)',
            color: 'var(--ds-color-warn)',
            fontSize: 13,
          }}>
            No FAQs configured. Adding 3–5 site-wide FAQs (return policy, shipping time, warranty) wins entire rich-result slots on Google mobile and AI shopping — use the form below to add your first.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
            {faqActive === faqTotal
              ? 'Every FAQ in this scope is active and emits FAQPage schema on the storefront.'
              : `${faqTotal - faqActive} inactive FAQ${faqTotal - faqActive === 1 ? '' : 's'} won't show on the site or emit schema.`}
          </div>
        )}
      </Panel>

      <FaqForm
        form={form}
        setForm={setForm}
        save={save}
        cancel={() => { setEditing(null); setForm(emptyForm); }}
        saving={saving}
        editing={!!editing}
        products={products}
      />

      <Panel>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>
            No FAQs yet. Use the form above to add your first one.
          </div>
        ) : groups.map(g => (
          <div key={`${g.type}:${g.ref}`} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-color-text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {g.type === 'global'   && 'Global site FAQs'}
              {g.type === 'product'  && (g.ref ? productName(g.ref) : 'All products (brand-wide)')}
              {g.type === 'category' && `Category #${g.ref}`}
              {g.type === 'page'     && `Page: ${g.ref}`}
            </div>
            <div style={{ border: '1px solid var(--ds-color-border)', borderRadius: 8, overflow: 'hidden' }}>
              {g.rows
                .sort((a, b) => a.display_order - b.display_order)
                .map((f, idx, arr) => (
                  <div key={f.id} style={{
                    borderTop: idx === 0 ? 'none' : '1px solid var(--ds-color-border-soft)',
                    padding: 12,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    background: f.is_active ? 'var(--ds-color-surface)' : 'var(--ds-color-surface-soft)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button title="Up"   disabled={idx === 0}            onClick={() => move(f, -1)} style={btnSmall}>↑</button>
                      <button title="Down" disabled={idx === arr.length-1} onClick={() => move(f,  1)} style={btnSmall}>↓</button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--ds-color-text)', marginBottom: 4 }}>{f.question}</div>
                      <div style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }} {...richHtml(f.answer)} />
                      {!f.is_active && (
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ds-color-text-faint)' }}>Inactive — not shown on site</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(f)} style={btnSecondary}>Edit</button>
                      <button onClick={() => remove(f.id)} style={btnDanger}>Delete</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function FaqForm({ form, setForm, save, cancel, saving, editing, products = [] }) {
  const isProduct = form.attached_to_type === 'product';
  const showCatId = form.attached_to_type === 'category';
  const showSlug = form.attached_to_type === 'page';
  const productOptions = [
    { value: ALL_PRODUCTS, label: '★ All products (brand-wide)' },
    ...products.map((p) => ({ value: p.id, label: p.name || p.title || `#${p.id}` })),
  ];
  return (
    <form onSubmit={save} className="ds-card" style={{ padding: 'var(--ds-space-4)', marginBottom: 'var(--ds-space-4)', maxWidth: 880 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-brand)', marginBottom: 12 }}>
        {editing ? 'Edit FAQ' : 'New FAQ'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 220px' }}>
          <Select
            label="Scope"
            value={form.attached_to_type}
            onChange={v => setForm({ ...form, attached_to_type: v, attached_to_id: '', attached_to_slug: '', product_ids: [] })}
            options={ATTACH_TYPES}
          />
        </div>
        {isProduct && (
          <div style={{ flex: '1 1 320px' }}>
            <Select
              label={editing ? 'Product' : 'Products (choose one or more)'}
              multiple={!editing}
              searchable
              value={editing ? (form.product_ids[0] ?? null) : form.product_ids}
              onChange={(v) => setForm({
                ...form,
                // When "All products" is picked, make it exclusive so it
                // doesn't mix with specific products.
                product_ids: editing
                  ? [v]
                  : (Array.isArray(v) && v.includes(ALL_PRODUCTS) ? [ALL_PRODUCTS] : (Array.isArray(v) ? v : [v])),
              })}
              options={productOptions}
              placeholder={products.length ? 'Select product(s)…' : 'Loading products…'}
            />
          </div>
        )}
        {showCatId && (
          <Field label="Category ID" style={{ flex: '1 1 180px' }}>
            <input
              type="number"
              value={form.attached_to_id}
              onChange={e => setForm({ ...form, attached_to_id: e.target.value })}
              placeholder="e.g. 42"
              style={inputStyle}
              required
            />
          </Field>
        )}
        {showSlug && (
          <Field label="Page slug" style={{ flex: '1 1 180px' }}>
            <input
              type="text"
              value={form.attached_to_slug}
              onChange={e => setForm({ ...form, attached_to_slug: e.target.value })}
              placeholder="e.g. about"
              style={inputStyle}
              required
            />
          </Field>
        )}
        <Field label="Order" style={{ flex: '0 0 120px' }}>
          <input
            type="number"
            value={form.display_order}
            onChange={e => setForm({ ...form, display_order: e.target.value })}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Question">
        <input
          type="text"
          value={form.question}
          onChange={e => setForm({ ...form, question: e.target.value })}
          maxLength={500}
          required
          placeholder="What's your return policy?"
          style={inputStyle}
        />
      </Field>

      <div style={{ marginTop: 10 }}>
        <Field label="Answer">
          <div style={{ background: 'var(--ds-color-surface)' }}>
            <Editor
              allowImages={false}
              value={form.answer}
              onChange={(html) => setForm({ ...form, answer: html })}
              placeholder="Type your answer. You can use lists, links and formatting…"
            />
          </div>
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={!!form.is_active}
            onChange={e => setForm({ ...form, is_active: e.target.checked })}
          /> Active
        </label>
        <div style={{ flex: 1 }} />
        {editing && (
          <button type="button" onClick={cancel} className="cd-btn-ghost" style={{ padding: '8px 14px' }}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving} className="cd-btn-primary" style={{ padding: '8px 16px' }}>
          {saving ? 'Saving…' : (editing ? 'Update FAQ' : 'Create FAQ')}
        </button>
      </div>
    </form>
  );
}

const Field = ({ label, children, style }) => (
  <label style={{ display: 'block', ...style }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-color-text-muted)', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--ds-color-border)',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  background: 'var(--ds-color-surface)',
};

const btnSmall = {
  padding: '2px 6px',
  border: '1px solid var(--ds-color-border)',
  background: 'var(--ds-color-surface)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  lineHeight: 1,
};

const btnSecondary = {
  padding: '6px 10px',
  border: '1px solid var(--ds-color-border)',
  background: 'var(--ds-color-surface)',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--ds-color-text-muted)',
};

const btnDanger = {
  padding: '6px 10px',
  border: '1px solid #fecaca',
  background: '#fef2f2',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  color: '#991b1b',
};
