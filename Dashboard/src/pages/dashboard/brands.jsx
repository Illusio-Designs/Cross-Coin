// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService, brandSettingsService, facebookCapiService } from '../../services';
import { Modal, Button, Input } from '../../components/ui';
import Dropdown from '../../components/ui/Dropdown';
import Loader from '../../components/common/Loader';
import { ConfirmModal } from '../../components/common/AlertModal';
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from '../../components/Dashboard/primitives';
import { queryKeys } from '../../lib/queryClient';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, PencilEdit02Icon, Delete02Icon, ToggleOnIcon, ToggleOffIcon, Building01Icon, Copy01Icon, ArrowRight01Icon, FloppyDiskIcon,
  CreditCardIcon, DeliveryTruck01Icon, Analytics01Icon, Mail01Icon, Message01Icon, Share08Icon, SquareLock02Icon, Key01Icon, Settings01Icon, MetaIcon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  toggle: <HugeiconsIcon icon={ToggleOnIcon} size={20} strokeWidth={2} />,
  toggleOff: <HugeiconsIcon icon={ToggleOffIcon} size={20} strokeWidth={2} />,
  brand: <HugeiconsIcon icon={Building01Icon} size={20} strokeWidth={2} />,
  copy: <HugeiconsIcon icon={Copy01Icon} size={16} strokeWidth={2} />,
  chevron: <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />,
  save: <HugeiconsIcon icon={FloppyDiskIcon} size={16} strokeWidth={2} />,
};

// Category cards for the per-brand settings drill-down. Each category opens on
// click and shows only its own fields. 'meta' is a virtual category for the
// Meta Conversions API test. Hugeicons, matching the rest of the dashboard.
const CAT_META = {
  payment:      { label: 'Payment',   icon: CreditCardIcon },
  shipping:     { label: 'Shipping',  icon: DeliveryTruck01Icon },
  analytics:    { label: 'Analytics', icon: Analytics01Icon },
  email:        { label: 'Email',     icon: Mail01Icon },
  sms:          { label: 'SMS',       icon: Message01Icon },
  social:       { label: 'Social',    icon: Share08Icon },
  social_media: { label: 'Social',    icon: Share08Icon },
  security:     { label: 'Security',  icon: SquareLock02Icon },
  api:          { label: 'API Keys',  icon: Key01Icon },
  general:      { label: 'General',   icon: Settings01Icon },
};
const catIcon = (cat, size = 20) => <HugeiconsIcon icon={(CAT_META[cat] || CAT_META.general).icon} size={size} strokeWidth={1.9} />;
const catLabel = (cat) => (CAT_META[cat] || { label: cat }).label;

const CATEGORY_LABEL = { general: 'General', payment: 'Payment', shipping: 'Shipping', email: 'Email', sms: 'SMS', social: 'Social', social_media: 'Social', analytics: 'Analytics', security: 'Security', api: 'API Keys' };
const EMPTY_FORM = { name: '', slug: '', display_name: '', domain: '', logo_url: '', primary_color: '#4CAF50', secondary_color: '#2196F3', contact_email: '', contact_phone: '', status: 'active' };
const IGNORED_KEY = /fship/i; // deprecated Fship shipping keys — not part of the canonical set
// Settings that must NOT appear in the Brand Settings key/value UI:
//  • SEO_* (category 'seo')      → owned by the dedicated SEO Settings page.
//  • company_gstin / 'legal'     → owned by the Policies page's "Company GSTIN".
//  • internal one-time markers   → cleanup/seed/migration flags the backend
//    writes to record that a boot task ran (e.g. dpdp_policy_cleanup_done,
//    *_cleanup_done, seo-init-*, schema_version). Not user-editable config.
const INTERNAL_MARKER = /cleanup_done|^dpdp_|_seed(_|$)|schema[_-]?version|_migrated|seo-init/i;
const SEO_SETTING = (s) => {
  const key = s.key || '';
  const cat = s.category || '';
  return cat === 'seo' || /^SEO_/i.test(key)        // SEO Settings page owns these
      || cat === 'legal' || key === 'company_gstin' // Policies page owns the GSTIN
      || /^WHATSAPP_/i.test(key)                    // WhatsApp config — set once on Crosscoin, used globally
      || key === 'PICKUP_SCHEDULE'                  // shared pickup schedule — managed from Orders → Pickup Schedule (all brands together)
      || INTERNAL_MARKER.test(key);                 // internal boot/migration flags
};

const safeDate = (d) => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? t.toLocaleDateString() : '—'; };
const cell = { padding: '13px 16px', borderBottom: '1px solid var(--ds-color-border-soft)', fontSize: 13, verticalAlign: 'middle' };
const th = { padding: '11px 16px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ds-color-text-muted)', fontWeight: 600, background: 'var(--ds-color-surface-soft)', fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', borderBottom: '1px solid var(--ds-color-border)' };
const brandMono = (b) => (b.display_name || b.name || '?').trim().slice(0, 2).toUpperCase();

// Normalise a brand's domain into a bare host for favicon lookup.
const brandHost = (d) => (d || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
const faviconUrl = (b) => {
  if (b.logo_url) return b.logo_url;
  const host = brandHost(b.domain);
  return host ? `https://${host}/favicon.ico` : null;
};

// Brand mark: shows the brand's favicon (its own logo_url, else the site's
// /favicon.ico), falling back to the monogram initials if the image can't load.
function BrandFavicon({ brand }) {
  const [broken, setBroken] = useState(false);
  const src = faviconUrl(brand);
  const showImg = src && !broken;
  const dot = { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--ds-color-surface)', background: brand.primary_color || 'var(--ds-color-text-faint)' };
  return (
    <span style={{ position: 'relative', width: 38, height: 38, borderRadius: 9, overflow: 'hidden', background: showImg ? 'var(--ds-color-surface)' : 'var(--ds-color-brand)', color: 'var(--ds-color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0, border: showImg ? '1px solid var(--ds-color-border)' : 'none' }}>
      {showImg
        ? <img src={src} alt="" width={24} height={24} loading="lazy" onError={() => setBroken(true)} style={{ width: 24, height: 24, objectFit: 'contain', display: 'block' }} />
        : brandMono(brand)}
      <span style={dot} title={brand.primary_color || ''} />
    </span>
  );
}
const feedChip = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--ds-color-text-muted)', background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 7, padding: '4px 9px', cursor: 'pointer' };

export function BrandManager() {
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);   // brand id whose settings are open
  const [openCat, setOpenCat] = useState(null);     // "<brandId>:<category>" of the open category card
  const [draft, setDraft] = useState({});           // `${brandId}:${key}` -> value being edited
  const [savingKey, setSavingKey] = useState(null);
  const [addRowFor, setAddRowFor] = useState(null); // brand id showing the add-setting row
  const [capi, setCapi] = useState({});             // brandId -> { loading, testing, status, result, error }

  const brandSlug = (brand) => (brand.slug || brand.name || '').toLowerCase();

  const loadCapiStatus = async (brand) => {
    setCapi(p => ({ ...p, [brand.id]: { ...(p[brand.id] || {}), loading: true, error: null } }));
    try {
      const status = await facebookCapiService.getStatus(brandSlug(brand));
      setCapi(p => ({ ...p, [brand.id]: { ...(p[brand.id] || {}), loading: false, status } }));
    } catch (e) {
      setCapi(p => ({ ...p, [brand.id]: { ...(p[brand.id] || {}), loading: false, error: e?.response?.data?.message || e.message } }));
    }
  };

  const runCapiTest = async (brand) => {
    setCapi(p => ({ ...p, [brand.id]: { ...(p[brand.id] || {}), testing: true, result: null, error: null } }));
    try {
      const result = await facebookCapiService.runTest(brandSlug(brand));
      setCapi(p => ({ ...p, [brand.id]: { ...(p[brand.id] || {}), testing: false, result } }));
      const got = result?.result?.events_received;
      if (got) showSuccess(`Meta received ${got} event — Conversions API works.`);
      else showError('Meta did not confirm the event — see the report below.');
    } catch (e) {
      setCapi(p => ({ ...p, [brand.id]: { ...(p[brand.id] || {}), testing: false, error: e?.response?.data?.error || e?.response?.data?.message || e.message } }));
      showError('Test failed — see the report below.');
    }
  };
  const [newSetting, setNewSetting] = useState({ key: '', value: '', category: 'analytics' });

  const { data: brands = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.brandsAdmin,
    queryFn: async () => { const r = await brandService.getAllBrands(true); return r.success ? r.data : []; },
    staleTime: 60 * 1000,
  });

  const refetchBrands = () => queryClient.invalidateQueries({ queryKey: queryKeys.brandsAdmin });
  const fetchBrands = refetchBrands;

  const referenceBrand = brands.find(b => b.slug?.toLowerCase() === 'crosscoin' || b.name?.toLowerCase() === 'crosscoin');

  // Settings load ON DEMAND — the initial page load fetches ONLY the brand
  // list. We then fetch the reference brand's settings (for the canonical key
  // list) and the currently-expanded brand's settings — never every brand's.
  const fetchSettings = (id) => brandSettingsService.getAllSettings(id).then(r => r?.success ? (r.data || []) : (Array.isArray(r) ? r : []));
  const { data: refSettings = [] } = useQuery({
    queryKey: ['brandSettings', referenceBrand?.id ?? 'none'],
    enabled: !!referenceBrand?.id && expanded != null,
    staleTime: 30 * 1000,
    queryFn: () => fetchSettings(referenceBrand.id),
  });
  const { data: expandedSettings = [] } = useQuery({
    queryKey: ['brandSettings', expanded ?? 'none'],
    enabled: expanded != null,
    staleTime: 30 * 1000,
    queryFn: () => fetchSettings(expanded),
  });
  const settingsByBrand = {};
  if (referenceBrand?.id) settingsByBrand[referenceBrand.id] = refSettings;
  if (expanded != null) settingsByBrand[expanded] = expandedSettings;

  // Canonical, predefined key list = Crosscoin's settings (minus deprecated
  // Fship keys). Every brand is filled against this same set of names.
  const predefinedKeys = referenceBrand
    ? (settingsByBrand[referenceBrand.id] || [])
        .filter(s => !IGNORED_KEY.test(s.key) && !SEO_SETTING(s))
        .map(s => ({ key: s.key, category: s.category || 'general', description: s.description || '' }))
        .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.key.localeCompare(b.key))
    : [];

  const valueMap = (brandId) => new Map((settingsByBrand[brandId] || []).map(s => [s.key, s]));
  const pendingFor = (brand) => {
    if (!referenceBrand || predefinedKeys.length === 0 || brand.id === referenceBrand.id) return null;
    if (!settingsByBrand[brand.id]) return null; // this brand's settings aren't loaded yet (loads on expand)
    const have = valueMap(brand.id);
    return predefinedKeys.filter(k => { const s = have.get(k.key); return !s || s.value === '' || s.value == null; }).length;
  };

  const cleanDomain = (dom) => (dom || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const brandUrl = (brand, path) => { const d = cleanDomain(brand.domain); return d ? `https://${d}${path}` : null; };
  const feedUrl = (brand) => brandUrl(brand, '/google-merchant.xml');
  // Meta accepts the same product feed, served under a Facebook-friendly URL.
  const fbFeedUrl = (brand) => brandUrl(brand, '/facebook-catalog.xml');
  const sitemapUrlOf = (brand) => brandUrl(brand, '/sitemap.xml');
  const copyText = (t) => { if (!t) return; try { navigator.clipboard?.writeText(t); showSuccess('Copied to clipboard'); } catch { /* ignore */ } };

  // ── Brand CRUD ────────────────────────────────────────────────────
  const handleInputChange = (e) => { const { name, value, type, checked } = e.target; setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value })); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { showError('fieldRequired'); return; }
    try {
      if (editingBrand) { await brandService.updateBrand(editingBrand.id, formData); showSuccess('brandUpdated'); }
      else { await brandService.createBrand(formData); showSuccess('brandCreated'); }
      resetForm(); fetchBrands();
    } catch (error) { showError('saveFailed', error.message); }
  };
  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name, slug: brand.slug, display_name: brand.display_name || brand.name, domain: brand.domain || '', logo_url: brand.logo_url || '', primary_color: brand.primary_color || '#4CAF50', secondary_color: brand.secondary_color || '#2196F3', contact_email: brand.contact_email || '', contact_phone: brand.contact_phone || '', status: brand.status || 'active' });
    setShowForm(true);
  };
  const handleDelete = (id) => setConfirmState({ message: 'Delete this brand? This cannot be undone.', onConfirm: async () => {
    setConfirmState(null);
    try { await brandService.deleteBrand(id); showSuccess('brandDeleted'); fetchBrands(); } catch { showError('deleteFailed'); }
  }});
  const handleToggleStatus = async (id) => { try { await brandService.toggleBrandStatus(id); showSuccess('brandStatusUpdated'); fetchBrands(); } catch { showError('updateFailed'); } };
  const resetForm = () => { setFormData(EMPTY_FORM); setEditingBrand(null); setShowForm(false); };

  // ── Settings inline save ──────────────────────────────────────────
  const saveSetting = async (brand, keyObj) => {
    const dk = `${brand.id}:${keyObj.key}`;
    const existing = valueMap(brand.id).get(keyObj.key);
    const value = draft[dk] ?? existing?.value ?? '';
    setSavingKey(dk);
    try {
      if (existing) await brandSettingsService.updateSetting(brand.id, keyObj.key, { value, is_encrypted: existing.is_encrypted });
      else await brandSettingsService.createSetting({ brand_id: brand.id, key: keyObj.key, value, category: keyObj.category, description: keyObj.description || null, is_encrypted: false });
      showSuccess('Setting saved');
      setDraft(p => { const n = { ...p }; delete n[dk]; return n; });
      queryClient.invalidateQueries({ queryKey: ['brandSettings'] });
    } catch { showError('Failed to save setting'); }
    finally { setSavingKey(null); }
  };

  // Add a brand-new custom setting (a key not in the predefined set — e.g.
  // GTM_ID, GOOGLE_ADS_LABEL_PURCHASE, a new pixel token, etc.).
  const addCustomSetting = async (brand) => {
    const key = newSetting.key.trim();
    if (!key) { showError('Enter a setting key'); return; }
    setSavingKey(`add:${brand.id}`);
    try {
      await brandSettingsService.createSetting({
        brand_id: brand.id, key, value: newSetting.value.trim(),
        category: newSetting.category, description: null, is_encrypted: false,
      });
      showSuccess('Setting added');
      setNewSetting({ key: '', value: '', category: 'analytics' });
      setAddRowFor(null);
      queryClient.invalidateQueries({ queryKey: ['brandSettings'] });
    } catch { showError('Failed to add setting'); }
    finally { setSavingKey(null); }
  };

  // ── Settings inline delete ────────────────────────────────────────
  // Lets an admin remove a stored setting entirely (e.g. the GA4 service
  // account keys they no longer want kept). Only offered when a value
  // actually exists for the key.
  const deleteSetting = (brand, keyObj) => {
    const existing = valueMap(brand.id).get(keyObj.key);
    if (!existing) return;
    setConfirmState({
      message: `Delete the setting "${keyObj.key}" for ${brand.display_name || brand.name}? Its stored value will be removed.`,
      onConfirm: async () => {
        setConfirmState(null);
        const dk = `${brand.id}:${keyObj.key}`;
        setSavingKey(dk);
        try {
          await brandSettingsService.deleteSetting(brand.id, keyObj.key);
          showSuccess('Setting deleted');
          setDraft(p => { const n = { ...p }; delete n[dk]; return n; });
          queryClient.invalidateQueries({ queryKey: ['brandSettings'] });
        } catch { showError('Failed to delete setting'); }
        finally { setSavingKey(null); }
      },
    });
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.domain && b.domain.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
    <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
    <div className="dashboard-page">
      <PageHeader
        title="Brands & Settings"
        subtitle={`${brands.length} brand${brands.length !== 1 ? 's' : ''} · ${predefinedKeys.length} predefined settings`}
        actions={<Button variant="primary" onClick={() => setShowForm(true)}>+ Add Brand</Button>}
      />

      <StatGrid>
        <StatTile label="Total brands" value={brands.length} />
        <StatTile label="Active" value={brands.filter(b => b.status === 'active').length} />
        <StatTile label="Inactive" value={brands.filter(b => b.status !== 'active').length} />
      </StatGrid>

      <Panel style={{ marginBottom: 16 }}>
        <FilterBar search={searchQuery} onSearchChange={setSearchQuery} placeholder="Search brands by name, slug, or domain…" />
      </Panel>

      {/* Add/Edit Brand Modal */}
      <Modal isOpen={showForm} onClose={resetForm} title={editingBrand ? 'Edit Brand' : 'Add New Brand'}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-2col">
              <Input label="Brand Name" required type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., CrossCoin" />
              <Input label="Display Name" required type="text" name="display_name" value={formData.display_name} onChange={handleInputChange} placeholder="e.g., CrossCoin Store" />
              <Input label="Slug" type="text" name="slug" value={formData.slug} onChange={handleInputChange} placeholder="e.g., crosscoin" />
              <Input label="Domain" type="text" name="domain" value={formData.domain} onChange={handleInputChange} placeholder="e.g., crosscoin.in" />
              <Input label="Contact Email" type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} placeholder="contact@example.com" />
              <Input label="Contact Phone" type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} placeholder="+1234567890" />
            </div>
            {formData.domain?.trim() && (
              <div className="dm-field">
                <label className="dm-label">Sitemap URL <span style={{ fontWeight: 400, color: 'var(--ds-color-text-muted)' }}>— submit this in Google Search Console</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="dm-input" readOnly value={`https://${cleanDomain(formData.domain)}/sitemap.xml`} style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
                  <Button type="button" variant="secondary" onClick={() => copyText(`https://${cleanDomain(formData.domain)}/sitemap.xml`)}>Copy</Button>
                </div>
              </div>
            )}
            <Input label="Logo URL" type="text" name="logo_url" value={formData.logo_url} onChange={handleInputChange} placeholder="https://example.com/logo.png" />
            <div className="dm-field"><label className="dm-label">Status</label>
              <Dropdown value={formData.status} onChange={val => handleInputChange({ target: { name: 'status', value: val } })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            </div>
            <div className="dm-section-title">Brand Colors</div>
            <div className="dm-color-row">
              <div className="dm-field"><label className="dm-label">Primary Color</label><div className="dm-color-input-wrap"><input type="color" name="primary_color" value={formData.primary_color} onChange={handleInputChange} className="dm-color-picker" /><input type="text" value={formData.primary_color} onChange={e => setFormData(p => ({ ...p, primary_color: e.target.value }))} className="dm-color-text" placeholder="#4CAF50" /></div></div>
              <div className="dm-field"><label className="dm-label">Secondary Color</label><div className="dm-color-input-wrap"><input type="color" name="secondary_color" value={formData.secondary_color} onChange={handleInputChange} className="dm-color-picker" /><input type="text" value={formData.secondary_color} onChange={e => setFormData(p => ({ ...p, secondary_color: e.target.value }))} className="dm-color-text" placeholder="#2196F3" /></div></div>
            </div>
          </div>
          <div className="modal-footer"><Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button><Button type="submit" variant="primary">{editingBrand ? 'Update Brand' : 'Create Brand'}</Button></div>
        </form>
      </Modal>

      {/* Combined Brands + Settings table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
      ) : filteredBrands.length === 0 ? (
        <EmptyState icon={IC.brand} title={searchQuery ? 'No brands match your search' : 'No brands yet'} message={searchQuery ? 'Try a different search term.' : 'Add your first brand to start selling under it.'} action={!searchQuery && <Button variant="primary" onClick={() => setShowForm(true)}>+ Add Brand</Button>} />
      ) : (
        <Panel style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 32 }} />
                  <th style={th}>Brand</th>
                  <th style={th}>Domain</th>
                  <th style={th}>Status</th>
                  <th style={th}>Settings</th>
                  <th style={th}>Feeds</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.map(brand => {
                  const pending = pendingFor(brand);
                  const isOpen = expanded === brand.id;
                  const url = feedUrl(brand);
                  // Settings this brand has that aren't in the predefined set (custom-added keys).
                  const extraSettings = (settingsByBrand[brand.id] || [])
                    .filter(s => !IGNORED_KEY.test(s.key) && !SEO_SETTING(s) && !predefinedKeys.some(k => k.key === s.key))
                    .sort((a, b) => a.key.localeCompare(b.key));
                  // Drill-down: group this brand's settings by category into cards;
                  // one category opens at a time (openName). 'meta' is a virtual
                  // card for the Conversions API test.
                  const vmap = valueMap(brand.id);
                  const isSet = (key) => { const s = vmap.get(key); return !!(s && s.value !== '' && s.value != null); };
                  const settingRows = [
                    ...predefinedKeys.map(k => ({ key: k.key, category: k.category || 'general', description: k.description || '', custom: false })),
                    ...extraSettings.map(s => ({ key: s.key, category: s.category || 'general', description: s.description || '', custom: true })),
                  ];
                  const byCat = {};
                  for (const r of settingRows) (byCat[r.category] = byCat[r.category] || []).push(r);
                  const cats = Object.keys(byCat).sort((a, b) => catLabel(a).localeCompare(catLabel(b)));
                  const openName = (openCat && openCat.startsWith(brand.id + ':')) ? openCat.slice(String(brand.id).length + 1) : null;
                  const toggleCat = (cat) => setOpenCat(openName === cat ? null : `${brand.id}:${cat}`);
                  return (
                    <React.Fragment key={brand.id}>
                      <tr style={{ cursor: 'pointer', background: isOpen ? 'var(--ds-color-surface-soft)' : 'var(--ds-color-surface)' }} onClick={() => { setExpanded(isOpen ? null : brand.id); setOpenCat(null); }}>
                        <td style={{ ...cell, textAlign: 'center' }}><span style={{ display: 'inline-flex', width: 16, height: 16, color: 'var(--ds-color-text-faint)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>{IC.chevron}</span></td>
                        <td style={cell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <BrandFavicon brand={brand} />
                            <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{brand.display_name || brand.name}</div><div style={{ fontSize: 11, color: 'var(--ds-color-text-faint)', fontFamily: 'var(--ds-font-mono, monospace)' }}>{brand.slug}</div></div>
                          </div>
                        </td>
                        <td style={{ ...cell, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono, monospace)', fontSize: 12 }}>{brand.domain || '—'}</td>
                        <td style={cell}><span className={`sl-status-badge sl-status-${brand.status}`}>{brand.status}</span></td>
                        <td style={cell}>
                          {pending === null ? (
                            <span style={{ fontSize: 12, color: 'var(--ds-color-text-faint)' }}>{isOpen ? 'Loading…' : '—'}</span>
                          ) : (
                            <div style={{ minWidth: 128 }}>
                              <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', fontWeight: 600, marginBottom: 5, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span>{pending === 0 ? 'All set' : 'Filled'}</span>
                                <b style={{ color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' }}>{predefinedKeys.length - pending}/{predefinedKeys.length}</b>
                              </div>
                              <div style={{ height: 5, borderRadius: 99, background: 'var(--ds-color-border)', overflow: 'hidden' }}>
                                <span style={{ display: 'block', height: '100%', width: `${predefinedKeys.length ? Math.round((predefinedKeys.length - pending) / predefinedKeys.length * 100) : 0}%`, background: 'var(--ds-color-brand)', borderRadius: 99 }} />
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={cell} onClick={(e) => e.stopPropagation()}>
                          {url ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              <button type="button" onClick={() => copyText(url)} title="Copy Google product feed URL" style={feedChip}><span style={{ width: 12, height: 12 }}>{IC.copy}</span> Google</button>
                              <button type="button" onClick={() => copyText(fbFeedUrl(brand))} title="Copy Facebook/Meta catalog feed URL (same product data, Meta-friendly URL)" style={feedChip}><span style={{ width: 12, height: 12 }}>{IC.copy}</span> Facebook</button>
                              <button type="button" onClick={() => copyText(sitemapUrlOf(brand))} title="Copy sitemap URL (for Search Console)" style={feedChip}><span style={{ width: 12, height: 12 }}>{IC.copy}</span> Sitemap</button>
                            </div>
                          ) : <span style={{ color: 'var(--ds-color-text-faint)', fontStyle: 'italic', fontSize: 12 }}>add domain</span>}
                        </td>
                        <td style={{ ...cell, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div className="sl-actions" style={{ justifyContent: 'flex-end' }}>
                            <button className={`sl-btn-toggle ${brand.status === 'active' ? 'active' : ''}`} title={brand.status === 'active' ? 'Active' : 'Inactive'} onClick={() => handleToggleStatus(brand.id)}>{brand.status === 'active' ? IC.toggle : IC.toggleOff}</button>
                            <button className="sl-btn-edit" title="Edit brand" onClick={() => handleEdit(brand)}>{IC.edit}</button>
                            <button className="sl-btn-delete" title="Delete brand" onClick={() => handleDelete(brand.id)}>{IC.trash}</button>
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, background: 'var(--ds-color-surface-soft)', borderBottom: '2px solid var(--ds-color-border)' }}>
                            <div style={{ padding: '10px 16px 16px' }}>
                              <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', margin: '4px 2px 8px', fontWeight: 600 }}>
                                {`Settings for ${brand.display_name || brand.name}. Keys are fixed; only values are added.`}
                              </div>
                              {settingRows.length === 0 ? (
                                <div style={{ color: 'var(--ds-color-text-muted)', fontSize: 13, padding: 8 }}>No predefined keys yet — add settings to Crosscoin first.</div>
                              ) : (
                                <>
                                  {/* Category cards — click one to edit only its fields */}
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                                    {cats.map(cat => {
                                      const total = byCat[cat].length;
                                      const setN = byCat[cat].filter(r => isSet(r.key)).length;
                                      const on = openName === cat;
                                      return (
                                        <button key={cat} type="button" onClick={() => toggleCat(cat)}
                                          style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 13, borderRadius: 10,
                                            background: on ? 'var(--ds-color-brand-soft)' : 'var(--ds-color-surface)',
                                            border: `1px solid ${on ? 'var(--ds-color-brand)' : 'var(--ds-color-border)'}` }}>
                                          <span style={{ display: 'inline-flex', color: 'var(--ds-color-text)' }}>{catIcon(cat)}</span>
                                          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 7 }}>{catLabel(cat)}</div>
                                          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 5, color: setN === total ? 'var(--ds-color-success, #16a34a)' : 'var(--ds-color-text-muted)' }}>{setN} / {total} set</div>
                                        </button>
                                      );
                                    })}
                                    {/* Meta Conversions API — virtual category card */}
                                    <button type="button" onClick={() => toggleCat('meta')}
                                      style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 13, borderRadius: 10,
                                        background: openName === 'meta' ? 'var(--ds-color-brand-soft)' : 'var(--ds-color-surface)',
                                        border: `1px solid ${openName === 'meta' ? 'var(--ds-color-brand)' : 'var(--ds-color-border)'}` }}>
                                      <span style={{ display: 'inline-flex', color: 'var(--ds-color-text)' }}><HugeiconsIcon icon={MetaIcon} size={20} strokeWidth={1.9} /></span>
                                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 7 }}>Meta CAPI</div>
                                      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: 'var(--ds-color-text-muted)' }}>Conversions API test</div>
                                    </button>
                                  </div>

                                  {/* Open category → only its fields */}
                                  {openName && openName !== 'meta' && byCat[openName] && (
                                    <div style={{ marginTop: 12, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 10, padding: 16 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>{catIcon(openName, 16)} {catLabel(openName)}</div>
                                      {byCat[openName].map(r => {
                                        const s = vmap.get(r.key);
                                        const dk = `${brand.id}:${r.key}`;
                                        const val = draft[dk] ?? s?.value ?? '';
                                        const keyObj = { key: r.key, category: r.category, description: r.description };
                                        return (
                                          <div key={r.key} style={{ marginBottom: 14 }}>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                                              <span style={{ fontFamily: 'monospace' }}>{r.key}</span>
                                              {r.custom && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, background: 'var(--ds-color-surface-soft)', borderRadius: 4, padding: '1px 5px' }}>custom</span>}
                                              {!isSet(r.key) && <span style={{ marginLeft: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--ds-color-text-faint)', display: 'inline-block', verticalAlign: 'middle' }} title="Not set" />}
                                            </label>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                              <input className="dm-input" style={{ flex: 1, fontSize: 13 }} value={val} placeholder={r.description || 'Enter value…'} onChange={e => setDraft(p => ({ ...p, [dk]: e.target.value }))} />
                                              <button className="sl-btn-edit" title="Save value" disabled={savingKey === dk} onClick={() => saveSetting(brand, keyObj)}><span style={{ width: 16, height: 16, display: 'inline-block' }}>{IC.save}</span></button>
                                              {s && <button className="sl-btn-delete" title="Delete setting" disabled={savingKey === dk} onClick={() => deleteSetting(brand, keyObj)}><span style={{ width: 16, height: 16, display: 'inline-block' }}>{IC.trash}</span></button>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Add a custom setting (a key beyond the predefined set) */}
                              <div style={{ marginTop: 12 }}>
                                {addRowFor === brand.id ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 8, padding: 10 }}>
                                    <input className="dm-input" style={{ flex: '1 1 200px', fontSize: 13, fontFamily: 'monospace' }} placeholder="KEY — e.g. GTM_ID" value={newSetting.key} onChange={e => setNewSetting(p => ({ ...p, key: e.target.value }))} />
                                    <div style={{ flex: '0 0 150px' }}>
                                      <Dropdown value={newSetting.category} onChange={val => setNewSetting(p => ({ ...p, category: val }))} options={[{ value: 'analytics', label: 'Analytics' }, { value: 'general', label: 'General' }, { value: 'payment', label: 'Payment' }, { value: 'shipping', label: 'Shipping' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }, { value: 'social', label: 'Social' }, { value: 'security', label: 'Security' }, { value: 'api', label: 'API Keys' }]} />
                                    </div>
                                    <input className="dm-input" style={{ flex: '2 1 220px', fontSize: 13 }} placeholder="Value" value={newSetting.value} onChange={e => setNewSetting(p => ({ ...p, value: e.target.value }))} />
                                    <Button type="button" variant="primary" disabled={savingKey === `add:${brand.id}`} onClick={() => addCustomSetting(brand)}>Save</Button>
                                    <Button type="button" variant="secondary" onClick={() => { setAddRowFor(null); setNewSetting({ key: '', value: '', category: 'analytics' }); }}>Cancel</Button>
                                  </div>
                                ) : (
                                  <Button type="button" variant="secondary" onClick={() => { setAddRowFor(brand.id); setNewSetting({ key: '', value: '', category: 'analytics' }); }}>+ Add setting</Button>
                                )}
                              </div>

                              {/* Conversions API (Meta) — opens only from the Meta card above */}
                              {openName === 'meta' && (
                              <div style={{ marginTop: 12, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 10, padding: 16 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700 }}>Conversions API (Meta)</span>
                                  <Button type="button" variant="secondary" disabled={capi[brand.id]?.loading} onClick={() => loadCapiStatus(brand)}>
                                    {capi[brand.id]?.loading ? 'Checking…' : 'Check status'}
                                  </Button>
                                  <Button type="button" variant="primary" disabled={capi[brand.id]?.testing} onClick={() => runCapiTest(brand)}>
                                    {capi[brand.id]?.testing ? 'Sending…' : 'Send test event'}
                                  </Button>
                                </div>

                                {capi[brand.id]?.status && (
                                  <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', marginTop: 8 }}>
                                    Pixel: <b>{capi[brand.id].status.pixel_id || '—'}</b> · Token:{' '}
                                    <b style={{ color: capi[brand.id].status.access_token_set ? '#16a34a' : '#dc2626' }}>
                                      {capi[brand.id].status.access_token_set ? 'set ✓' : 'NOT set ✗'}
                                    </b>
                                    {capi[brand.id].status.test_event_code ? <> · Test code: <b>{capi[brand.id].status.test_event_code}</b></> : null}
                                  </div>
                                )}

                                {capi[brand.id]?.result && (
                                  <div style={{ marginTop: 8, fontSize: 12, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 8, padding: 10 }}>
                                    {capi[brand.id].result?.result?.events_received ? (
                                      <div style={{ color: '#16a34a', fontWeight: 700 }}>✓ Meta received {capi[brand.id].result.result.events_received} event — Conversions API is working.</div>
                                    ) : (
                                      <div style={{ color: '#dc2626', fontWeight: 700 }}>✗ Meta did not confirm the event — check the token / details below.</div>
                                    )}
                                    <pre style={{ marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: 11, color: 'var(--ds-color-text-muted)', maxHeight: 180, overflow: 'auto', margin: '6px 0 0' }}>
                                      {JSON.stringify(capi[brand.id].result.result || capi[brand.id].result, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {capi[brand.id]?.error && (
                                  <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{String(capi[brand.id].error)}</div>
                                )}

                                <div style={{ fontSize: 11, color: 'var(--ds-color-text-faint, #9ca3af)', marginTop: 6 }}>
                                  Set <b>FB_ACCESS_TOKEN</b> (and <b>FB_PIXEL_ID</b>) in the Analytics card, then “Send test event”. Add <b>FB_TEST_EVENT_CODE</b> to also see it live in Meta → Events Manager → Test Events.
                                </div>
                              </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
    </>
  );
}
