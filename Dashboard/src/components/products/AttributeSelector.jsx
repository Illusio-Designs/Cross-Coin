import React, { useState } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { productService } from '../../services';
import { showError } from '../../utils/toastNotification';
import { Skeleton } from '../ui/Skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// Pull the uploaded image URL out of the /api/products/upload-images response —
// the SAME endpoint/response the rich-text Editor and ProductAttributesEditor
// use, so behaviour is identical and no new upload mechanism is introduced.
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

// Reserved key inside the per-variation `attributes` object that holds a
// value → image URL map, keyed by the (lowercased) attribute name:
//   attributes._images = { "<attrKeyLower>": { "<value>": "<imageUrl>" } }
// It is stored alongside — never instead of — the existing string-array values,
// so storefront parsing of those arrays is unaffected and products with no
// images keep working unchanged.
const IMAGES_KEY = '_images';

// Explicit react-select styling driven by the admin theme tokens, so the
// control, menu and options follow light/dark mode instead of react-select's
// hard-coded white menu (which left light theme text invisible in dark mode). Portalling the menu to <body> also keeps it
// above the modal so long option lists aren't clipped.
const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 100000 }),
  menu: (base) => ({ ...base, zIndex: 100000, backgroundColor: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', overflow: 'hidden' }),
  menuList: (base) => ({ ...base, backgroundColor: 'var(--ds-color-surface)' }),
  option: (base, state) => ({
    ...base,
    color: state.isSelected ? 'var(--ds-color-accent2)' : 'var(--ds-color-text)',
    backgroundColor: state.isSelected ? 'var(--ds-color-accent2-bg)' : state.isFocused ? 'var(--ds-color-surface-soft)' : 'var(--ds-color-surface)',
    cursor: 'pointer',
  }),
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--ds-color-surface)',
    borderColor: state.isFocused ? 'var(--ds-color-text)' : 'var(--ds-color-border)',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--ds-color-text-faint)' },
  }),
  singleValue: (base) => ({ ...base, color: 'var(--ds-color-text)' }),
  input: (base) => ({ ...base, color: 'var(--ds-color-text)' }),
  placeholder: (base) => ({ ...base, color: 'var(--ds-color-text-faint)' }),
  multiValue: (base) => ({ ...base, backgroundColor: 'var(--ds-color-accent2-bg)' }),
  multiValueLabel: (base) => ({ ...base, color: 'var(--ds-color-text)' }),
  multiValueRemove: (base) => ({ ...base, color: 'var(--ds-color-text-muted)', ':hover': { backgroundColor: 'var(--ds-color-danger-bg)', color: 'var(--ds-color-danger)' } }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--ds-color-border)' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--ds-color-text-faint)' }),
  clearIndicator: (base) => ({ ...base, color: 'var(--ds-color-text-faint)' }),
  noOptionsMessage: (base) => ({ ...base, color: 'var(--ds-color-text-muted)' }),
};

const AttributeSelector = ({
  variationIndex,
  attributes, // All attribute types (e.g., Size, Color) with their values
  selectedAttributes = {}, // default to empty object
  onChange, // Callback to update parent form data
  loading = false, // attribute list still loading in the parent
}) => {
  // Tracks which value cell is mid-upload, keyed "attrKeyLower::value".
  const [uploading, setUploading] = useState({});

  const emit = (next) => onChange(variationIndex, next);

  const handleAttributeChange = (attributeName, selectedOptions) => {
    const keyLower = attributeName.toLowerCase();
    const values = (selectedOptions || []).map(option => option.value);
    const newAttributes = { ...selectedAttributes };
    newAttributes[keyLower] = values;

    // Prune any image entries for values that are no longer selected, so the
    // `_images` map never carries orphaned URLs. The map (and the whole object)
    // is propagated back to the parent intact.
    const prevImages = newAttributes[IMAGES_KEY] || {};
    const groupImages = prevImages[keyLower];
    if (groupImages) {
      const kept = {};
      values.forEach((v) => { if (groupImages[v]) kept[v] = groupImages[v]; });
      const nextImages = { ...prevImages };
      if (Object.keys(kept).length) nextImages[keyLower] = kept;
      else delete nextImages[keyLower];
      if (Object.keys(nextImages).length) newAttributes[IMAGES_KEY] = nextImages;
      else delete newAttributes[IMAGES_KEY];
    }

    emit(newAttributes);
  };

  const setValueImage = (keyLower, value, url) => {
    const nextImages = { ...(selectedAttributes[IMAGES_KEY] || {}) };
    const group = { ...(nextImages[keyLower] || {}) };
    if (url) group[value] = url;
    else delete group[value];
    if (Object.keys(group).length) nextImages[keyLower] = group;
    else delete nextImages[keyLower];

    const newAttributes = { ...selectedAttributes };
    if (Object.keys(nextImages).length) newAttributes[IMAGES_KEY] = nextImages;
    else delete newAttributes[IMAGES_KEY];
    emit(newAttributes);
  };

  const handleUpload = async (keyLower, value, file) => {
    if (!file) return;
    const cellKey = `${keyLower}::${value}`;
    try {
      setUploading((u) => ({ ...u, [cellKey]: true }));
      const res = await productService.uploadImages([file]);
      const url = extractUploadedUrl(res);
      if (url) {
        setValueImage(keyLower, value, url);
      } else {
        showError('uploadFailed', 'Upload succeeded but no image URL was returned.');
      }
    } catch (err) {
      showError('uploadFailed', 'Image upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading((u) => {
        const n = { ...u };
        delete n[cellKey];
        return n;
      });
    }
  };

  // Attribute types not loaded yet: label + select shaped placeholders where
  // the pickers will appear (instead of an empty gap that then jumps).
  if (loading && Object.keys(attributes || {}).length === 0) {
    return (
      <div className="attribute-selector" role="status" aria-busy="true">
        <span className="ds-sr-only">Loading attributes…</span>
        {[0, 1].map((i) => (
          <div key={i} className="attribute-group" aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w={i ? 60 : 44} h={10} />
            <Skeleton w="100%" h={38} r={8} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="attribute-selector">
      {Object.entries(attributes).map(([attributeName, values]) => {
        // Normalize attributeName to lowercase for consistent access with selectedAttributes
        const normalizedAttributeName = attributeName.toLowerCase();
        const selectedValues = selectedAttributes[normalizedAttributeName] || [];
        const groupImages = selectedAttributes[IMAGES_KEY]?.[normalizedAttributeName] || {};

        return (
          <div key={attributeName} className="attribute-group">
            <label>{attributeName}</label>
            <CreatableSelect
              isMulti
              styles={selectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
              options={values.map(value => ({ value, label: value }))}
              value={selectedValues.map(value => ({ value, label: value }))}
              onChange={(selected) => handleAttributeChange(attributeName, selected)}
              placeholder={`Select or create ${attributeName}`}
            />

            {/* Per-value optional image. Lets each selected attribute value
                carry a thumbnail (e.g. a fragrance note picture) stored under
                attributes._images[key][value]; absent images change nothing. */}
            {selectedValues.length > 0 && (
              <div className="attribute-value-images" style={{ marginTop: 8 }}>
                {selectedValues.map((value) => {
                  const cellKey = `${normalizedAttributeName}::${value}`;
                  const img = groupImages[value] || '';
                  return (
                    <div
                      key={value}
                      className="attr-value-row"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}
                    >
                      <span style={{ flex: 1, fontSize: 13 }}>{value}</span>
                      {img ? (
                        <img
                          src={img}
                          alt={value}
                          className="attr-note-thumb"
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--ds-color-border)' }}
                        />
                      ) : null}
                      <label className="prd-select-btn" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        {uploading[cellKey] ? 'Uploading…' : (img ? 'Replace' : 'Upload image')}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={!!uploading[cellKey]}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            handleUpload(normalizedAttributeName, value, file);
                          }}
                        />
                      </label>
                      {img ? (
                        <button
                          type="button"
                          className="variation-remove-btn"
                          onClick={() => setValueImage(normalizedAttributeName, value, '')}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AttributeSelector;
