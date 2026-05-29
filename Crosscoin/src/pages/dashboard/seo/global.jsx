/**
 * Global SEO Settings — typed form on top of the existing brand-settings
 * key/value store. Every field here corresponds to a SEO_* key the
 * backend reads (in services/productSeoHelper.js for product schema,
 * and in the public /api/public/tracking-config endpoint for the
 * Organization JSON-LD on the storefront).
 *
 * Admins should only have to edit these once per brand. The dashboard
 * was already exposing them as raw key/value rows in Brand Settings —
 * this page just gives them a friendlier form with labels and hints.
 */

import { useEffect, useMemo, useState } from 'react';
import { brandSettingsService, brandService } from '../../../services';
import Dropdown from '../../../components/ui/Dropdown';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { PageHeader, Panel } from '../../../components/Dashboard/primitives';

// Every SEO-relevant key we want to expose. The category we store in
// brand_settings is 'seo' so the Brand Settings legacy UI also picks
// them up under that filter.
const FIELDS = [
  {
    section: 'Identity',
    keys: [
      { key: 'SEO_ORGANIZATION_NAME', label: 'Organisation name',
        placeholder: 'CrossCoin', hint: 'Used in schema.org/Organization and as the {brand} placeholder in the title template.' },
      { key: 'SEO_ORGANIZATION_LOGO', label: 'Organisation logo URL',
        placeholder: 'https://crosscoin.in/logo.png',
        hint: 'Used as the logo in Organization JSON-LD (must be a public URL).' },
      { key: 'SEO_PHONE', label: 'Public phone',
        placeholder: '+91-9876543210', hint: 'Used in Organization contactPoint.' },
    ],
  },
  {
    section: 'Title & description defaults',
    keys: [
      { key: 'SEO_DEFAULT_TITLE_TEMPLATE', label: 'Title template',
        placeholder: '{name} | CrossCoin',
        hint: 'Used for products that don\'t have an explicit meta title. Variables: {name}, {brand}.' },
      { key: 'SEO_DEFAULT_DESCRIPTION', label: 'Fallback description',
        placeholder: 'Shop premium crosscoin products with free shipping and easy returns.',
        hint: 'Used on pages that don\'t set their own meta description (max 160 chars).' },
      { key: 'SEO_DEFAULT_OG_IMAGE', label: 'Default OG image (1200×630)',
        placeholder: 'https://crosscoin.in/og-default.jpg',
        hint: 'Used as social-share preview on pages without their own ogImage.' },
    ],
  },
  {
    section: 'Trust signals (huge AI-shopping win)',
    keys: [
      { key: 'SEO_RETURN_POLICY_URL', label: 'Return policy URL',
        placeholder: 'https://crosscoin.in/policy?policy=return',
        hint: 'Powers hasMerchantReturnPolicy in every product\'s JSON-LD. AI shopping engines explicitly prefer products that declare this.' },
      { key: 'SEO_RETURN_WINDOW_DAYS', label: 'Return window (days)',
        placeholder: '7', type: 'number',
        hint: 'merchantReturnDays in product schema.' },
      { key: 'SEO_DEFAULT_SHIPPING_PROMISE_DAYS', label: 'Default shipping promise (days)',
        placeholder: '3', type: 'number',
        hint: 'transitTime maxValue in product shippingDetails schema.' },
    ],
  },
  {
    section: 'Social profiles (Organization sameAs)',
    keys: [
      { key: 'SEO_SOCIAL_FACEBOOK',  label: 'Facebook URL',  placeholder: 'https://facebook.com/crosscoin' },
      { key: 'SEO_SOCIAL_INSTAGRAM', label: 'Instagram URL', placeholder: 'https://instagram.com/crosscoin' },
      { key: 'SEO_SOCIAL_TWITTER',   label: 'Twitter / X URL or @handle', placeholder: '@crosscoin' },
      { key: 'SEO_SOCIAL_YOUTUBE',   label: 'YouTube URL',   placeholder: 'https://youtube.com/@crosscoin' },
    ],
  },
  {
    section: 'Address (powers LocalBusiness schema)',
    keys: [
      { key: 'SEO_ADDRESS_STREET',     label: 'Street',     placeholder: 'Plot 12, Industrial Area' },
      { key: 'SEO_ADDRESS_CITY',       label: 'City',       placeholder: 'Rajkot' },
      { key: 'SEO_ADDRESS_REGION',     label: 'State',      placeholder: 'Gujarat' },
      { key: 'SEO_ADDRESS_POSTAL',     label: 'Postal code', placeholder: '363641' },
      { key: 'SEO_ADDRESS_COUNTRY',    label: 'Country code', placeholder: 'IN', hint: 'Two-letter ISO code.' },
    ],
  },
];

export default function GlobalSeoSettings() {
  const [brandId, setBrandId] = useState(1);
  const [brands, setBrands] = useState([]);
  const [values, setValues] = useState({});
  const [originals, setOriginals] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    brandService.getAllBrands(true).then(r => {
      if (r?.success && Array.isArray(r.data)) setBrands(r.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!brandId) return;
    setLoading(true);
    brandSettingsService.getSettingsByCategory(brandId, 'seo')
      .then(r => {
        const list = r?.data || r || [];
        const map = {};
        for (const item of list) map[item.key] = item.value || '';
        setValues(map);
        setOriginals(map);
      })
      .catch(() => { setValues({}); setOriginals({}); })
      .finally(() => setLoading(false));
  }, [brandId]);

  const flatKeys = useMemo(() => FIELDS.flatMap(s => s.keys.map(k => k.key)), []);
  const dirtyKeys = useMemo(
    () => flatKeys.filter(k => (values[k] || '') !== (originals[k] || '')),
    [values, originals, flatKeys],
  );

  const save = async () => {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    let saved = 0;
    let failed = 0;
    for (const key of dirtyKeys) {
      const value = values[key] || '';
      try {
        // Upsert: create if absent, otherwise update. The brand-settings
        // API returns 409 on duplicate-create, so we try update first
        // when the key already existed.
        if (originals[key] !== undefined && originals[key] !== '') {
          await brandSettingsService.updateSetting(brandId, key, { value });
        } else {
          try {
            await brandSettingsService.createSetting({
              brand_id: brandId,
              key,
              value,
              category: 'seo',
              is_encrypted: false,
            });
          } catch (err) {
            // Already exists from a previous run with empty value — fall back to update.
            await brandSettingsService.updateSetting(brandId, key, { value });
          }
        }
        saved++;
      } catch (err) {
        failed++;
      }
    }
    setOriginals({ ...values });
    setSaving(false);
    if (failed === 0) showSuccess('saved', `Saved ${saved} SEO settings.`);
    else showError('partialSave', `Saved ${saved}, ${failed} failed.`);
  };

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="Global SEO Settings"
        subtitle="Defaults applied across every product, category and page on the storefront."
        actions={
          <>
            {brands.length > 1 && (
              <Dropdown
                value={brandId}
                onChange={(v) => setBrandId(Number(v))}
                options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
              />
            )}
            <button
              onClick={save}
              disabled={loading || saving || dirtyKeys.length === 0}
              className="ds-btn ds-btn--primary"
            >
              {saving ? 'Saving…' : dirtyKeys.length === 0 ? 'No changes' : `Save (${dirtyKeys.length})`}
            </button>
          </>
        }
      />

      {loading ? (
        <Panel><div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>Loading…</div></Panel>
      ) : (
        FIELDS.map(section => (
          <Panel key={section.section} title={section.section} style={{ marginBottom: 'var(--ds-space-4)' }}>
            {section.keys.map(field => (
              <Field
                key={field.key}
                field={field}
                value={values[field.key] || ''}
                onChange={(val) => setValues(prev => ({ ...prev, [field.key]: val }))}
                dirty={dirtyKeys.includes(field.key)}
              />
            ))}
          </Panel>
        ))
      )}
    </div>
  );
}

function Field({ field, value, onChange, dirty }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        <span>{field.label}</span>
        <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}>{field.key}</span>
        {dirty && <span style={{ fontSize: 10, color: '#d97706' }}>● unsaved</span>}
      </label>
      <input
        type={field.type || 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          fontSize: 14,
          background: '#fff',
        }}
      />
      {field.hint && (
        <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{field.hint}</div>
      )}
    </div>
  );
}
