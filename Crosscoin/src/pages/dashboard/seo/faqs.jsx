import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { faqService } from '../../../services';
import { showSuccess, showError } from '../../../utils/toastNotification';

// Lazy-load the rich-text editor — Quill ships a lot of JS we don't want
// in the admin shell's initial bundle.
const ReactQuill = dynamic(() => import('../../../components/common/QuillEditor'), {
  ssr: false,
  loading: () => <div style={{ height: 180, border: '1px solid #e5e7eb', borderRadius: 6 }} />,
});

const ATTACH_TYPES = [
  { value: 'global',   label: 'Global (whole site)' },
  { value: 'product',  label: 'Specific product' },
  { value: 'category', label: 'Specific category' },
  { value: 'page',     label: 'Specific page' },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [3, 4, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

const emptyForm = {
  id: null,
  attached_to_type: 'global',
  attached_to_id: '',
  attached_to_slug: '',
  question: '',
  answer: '',
  display_order: 0,
  is_active: true,
};

export default function FaqsManager() {
  const [items, setItems] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const params = filterType === 'all' ? {} : { type: filterType };
      const res = await faqService.list(params);
      setItems(res.faqs || []);
    } catch (err) {
      showError('loadFailed', typeof err === 'string' ? err : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [filterType]);

  const groups = useMemo(() => {
    const buckets = {};
    for (const f of items) {
      const key = `${f.attached_to_type}:${f.attached_to_id || f.attached_to_slug || 'all'}`;
      if (!buckets[key]) buckets[key] = { type: f.attached_to_type, ref: f.attached_to_id || f.attached_to_slug || null, rows: [] };
      buckets[key].rows.push(f);
    }
    return Object.values(buckets);
  }, [items]);

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
    setSaving(true);
    try {
      const payload = {
        attached_to_type: form.attached_to_type,
        attached_to_id: form.attached_to_id || null,
        attached_to_slug: form.attached_to_slug || null,
        question: form.question.trim(),
        answer: form.answer,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: !!form.is_active,
      };
      if (form.id) {
        await faqService.update(form.id, payload);
        showSuccess('saved', 'FAQ updated');
      } else {
        await faqService.create(payload);
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
      <div className="dc-topbar">
        <div className="dc-greeting">
          <span className="dc-greeting-text">FAQs</span>
          <span className="dc-greeting-sub">Manage site-wide and per-product FAQs. Answers emit FAQPage schema on the product page.</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
          >
            <option value="all">All scopes</option>
            {ATTACH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={openCreate} className="cd-btn-primary" style={{ padding: '8px 14px' }}>+ New FAQ</button>
        </div>
      </div>

      <FaqForm
        form={form}
        setForm={setForm}
        save={save}
        cancel={() => { setEditing(null); setForm(emptyForm); }}
        saving={saving}
        editing={!!editing}
      />

      <div className="dashboard-section">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No FAQs yet. Use the form above to add your first one.
          </div>
        ) : groups.map(g => (
          <div key={`${g.type}:${g.ref}`} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#180D3E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {g.type === 'global'   && 'Global site FAQs'}
              {g.type === 'product'  && `Product #${g.ref}`}
              {g.type === 'category' && `Category #${g.ref}`}
              {g.type === 'page'     && `Page: ${g.ref}`}
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {g.rows
                .sort((a, b) => a.display_order - b.display_order)
                .map((f, idx, arr) => (
                  <div key={f.id} style={{
                    borderTop: idx === 0 ? 'none' : '1px solid #f3f4f6',
                    padding: 12,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    background: f.is_active ? '#fff' : '#fafafa',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button title="Up"   disabled={idx === 0}            onClick={() => move(f, -1)} style={btnSmall}>↑</button>
                      <button title="Down" disabled={idx === arr.length-1} onClick={() => move(f,  1)} style={btnSmall}>↓</button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#180D3E', marginBottom: 4 }}>{f.question}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }} dangerouslySetInnerHTML={{ __html: f.answer }} />
                      {!f.is_active && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#9ca3af' }}>Inactive — not shown on site</div>
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
      </div>
    </div>
  );
}

function FaqForm({ form, setForm, save, cancel, saving, editing }) {
  const showId = form.attached_to_type === 'product' || form.attached_to_type === 'category';
  const showSlug = form.attached_to_type === 'page';
  return (
    <form onSubmit={save} className="dashboard-section" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#180D3E', marginBottom: 12 }}>
        {editing ? 'Edit FAQ' : 'New FAQ'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10, marginBottom: 10 }}>
        <Field label="Scope">
          <select
            value={form.attached_to_type}
            onChange={e => setForm({ ...form, attached_to_type: e.target.value, attached_to_id: '', attached_to_slug: '' })}
            style={inputStyle}
          >
            {ATTACH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {showId && (
          <Field label={`${form.attached_to_type === 'product' ? 'Product' : 'Category'} ID`}>
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
          <Field label="Page slug">
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
        {!showId && !showSlug && <div />}
        <Field label="Order">
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
          <div style={{ background: '#fff' }}>
            <ReactQuill
              theme="snow"
              value={form.answer}
              onChange={(html) => setForm({ ...form, answer: html })}
              modules={QUILL_MODULES}
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

const Field = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  background: '#fff',
};

const btnSmall = {
  padding: '2px 6px',
  border: '1px solid #d1d5db',
  background: '#fff',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  lineHeight: 1,
};

const btnSecondary = {
  padding: '6px 10px',
  border: '1px solid #d1d5db',
  background: '#fff',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  color: '#374151',
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
