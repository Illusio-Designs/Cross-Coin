import React, { useState } from 'react';
import { Button, Input } from '../ui';
import { productService } from '../../services';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// Pull the uploaded image URL out of the /api/products/upload-images response
// (the SAME endpoint/response the rich-text Editor uses). `uploadedImages[0].url`
// is the full ImageKit CDN URL; we fall back to other shapes and resolve bare
// paths against the API base, mirroring the Editor's resolver so behavior is
// identical to the existing uploader — no new upload mechanism is introduced.
function extractUploadedUrl(result) {
  const cand = result?.uploadedImages || result?.images || result?.data || result?.urls
    || result?.results || result?.uploaded || result?.files;
  const first = Array.isArray(cand) ? cand[0] : cand;
  if (!first) return null;
  const raw = typeof first === 'string'
    ? first
    : (first.url || first.image_url || first.path || first.src || first.location || null);
  if (!raw) return null;
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
  if (raw.startsWith('/uploads/')) return `${API_URL}${raw}`;
  return `${API_URL}/uploads/products/${raw.replace(/^\/+/, '')}`;
}

/**
 * Product-level attributes editor (replaces the old standalone "Fragrance notes"
 * card). Each attribute is a named GROUP (e.g. "notes", "accords") holding a list
 * of VALUES, and every value may optionally carry an uploaded image.
 *
 * Controlled component:
 *   value    = [{ key: string, values: [{ name: string, image: string }] }]
 *   onChange(nextValue)
 *
 * Serialization to the backend (done by the parent on save) collapses this into
 * { <key>: [{name,image}] }, keeping `attributes.notes` exactly as the storefront
 * already reads it.
 */
const ProductAttributesEditor = ({ value = [], onChange }) => {
  const groups = Array.isArray(value) ? value : [];
  // Tracks which value cell is mid-upload, keyed "groupIndex:valueIndex".
  const [uploading, setUploading] = useState({});

  const emit = (next) => onChange && onChange(next);

  const updateGroup = (gi, patch) => {
    const next = groups.map((g, i) => (i === gi ? { ...g, ...patch } : g));
    emit(next);
  };

  const updateValue = (gi, vi, patch) => {
    const next = groups.map((g, i) => {
      if (i !== gi) return g;
      const values = (g.values || []).map((v, j) => (j === vi ? { ...v, ...patch } : v));
      return { ...g, values };
    });
    emit(next);
  };

  const addGroup = () => emit([...groups, { key: '', values: [{ name: '', image: '' }] }]);
  const removeGroup = (gi) => emit(groups.filter((_, i) => i !== gi));

  const addValue = (gi) => updateGroup(gi, { values: [...(groups[gi].values || []), { name: '', image: '' }] });
  const removeValue = (gi, vi) => updateGroup(gi, { values: (groups[gi].values || []).filter((_, j) => j !== vi) });

  const handleUpload = async (gi, vi, file) => {
    if (!file) return;
    const cellKey = `${gi}:${vi}`;
    try {
      setUploading((u) => ({ ...u, [cellKey]: true }));
      const res = await productService.uploadImages([file]);
      const url = extractUploadedUrl(res);
      if (url) {
        updateValue(gi, vi, { image: url });
      } else {
        window.alert('Upload succeeded but no image URL was returned. You can paste the image URL instead.');
      }
    } catch (err) {
      window.alert('Image upload failed: ' + (err?.message || 'Unknown error') + '. You can paste an image URL instead.');
    } finally {
      setUploading((u) => {
        const n = { ...u };
        delete n[cellKey];
        return n;
      });
    }
  };

  return (
    <div className="product-attributes-editor">
      {groups.map((group, gi) => (
        <div key={gi} className="attr-group" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--ds-color-border)' }}>
          <div className="attr-group-head" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Attribute name"
                type="text"
                value={group.key || ''}
                onChange={(e) => updateGroup(gi, { key: e.target.value })}
                placeholder="e.g. notes, accords"
              />
            </div>
            <button
              type="button"
              className="variation-remove-btn"
              onClick={() => removeGroup(gi)}
            >
              Remove
            </button>
          </div>

          {(group.values || []).map((val, vi) => {
            const cellKey = `${gi}:${vi}`;
            return (
              <div key={vi} className="attr-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={val.name || ''}
                    onChange={(e) => updateValue(gi, vi, { name: e.target.value })}
                    placeholder="Value (e.g. Cinnamon)"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={val.image || ''}
                    onChange={(e) => updateValue(gi, vi, { image: e.target.value })}
                    placeholder="Image URL (optional)"
                  />
                </div>
                <label className="prd-select-btn" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {uploading[cellKey] ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={!!uploading[cellKey]}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      handleUpload(gi, vi, file);
                    }}
                  />
                </label>
                {val.image ? (
                  <img
                    src={val.image}
                    alt={val.name || 'Value'}
                    className="attr-note-thumb"
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--ds-color-border)' }}
                  />
                ) : null}
                <button
                  type="button"
                  className="variation-remove-btn"
                  onClick={() => removeValue(gi, vi)}
                >
                  Remove
                </button>
              </div>
            );
          })}

          <div style={{ marginTop: 8 }}>
            <Button variant="secondary" size="small" onClick={() => addValue(gi)}>
              + Add value
            </Button>
          </div>
        </div>
      ))}

      <Button variant="secondary" size="small" onClick={addGroup}>
        + Add attribute
      </Button>
    </div>
  );
};

export default ProductAttributesEditor;
