// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService, brandSettingsService } from '../../services';
import { Modal, Button } from '../../components/ui';
import Dropdown from '../../components/ui/Dropdown';
import Loader from '../../components/common/Loader';
import { ConfirmModal } from '../../components/common/AlertModal';
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from '../../components/Dashboard/primitives';
import { queryKeys } from '../../lib/queryClient';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, PencilEdit02Icon, Delete02Icon, ToggleOnIcon, ToggleOffIcon, Building01Icon, Copy01Icon, ArrowRight01Icon, FloppyDiskIcon } from '@hugeicons/core-free-icons';

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

const CATEGORY_LABEL = { general: 'General', payment: 'Payment', shipping: 'Shipping', email: 'Email', sms: 'SMS', social: 'Social', social_media: 'Social', analytics: 'Analytics', security: 'Security', api: 'API Keys' };
const EMPTY_FORM = { name: '', slug: '', display_name: '', domain: '', logo_url: '', primary_color: '#4CAF50', secondary_color: '#2196F3', contact_email: '', contact_phone: '', status: 'active' };
const IGNORED_KEY = /fship/i; // deprecated Fship shipping keys — not part of the canonical set

const safeDate = (d) => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? t.toLocaleDateString() : '—'; };
const cell = { padding: '13px 16px', borderBottom: '1px solid var(--ds-color-border-soft)', fontSize: 13, verticalAlign: 'middle' };
const th = { padding: '11px 16px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ds-color-text-muted)', fontWeight: 600, background: 'var(--ds-color-surface-soft)', fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', borderBottom: '1px solid var(--ds-color-border)' };
const brandMono = (b) => (b.display_name || b.name || '?').trim().slice(0, 2).toUpperCase();
const feedChip = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--ds-color-text-muted)', background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 7, padding: '4px 9px', cursor: 'pointer' };

export function BrandManager() {
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);   // brand id whose settings are open
  const [draft, setDraft] = useState({});           // `${brandId}:${key}` -> value being edited
  const [savingKey, setSavingKey] = useState(null);
  const [addRowFor, setAddRowFor] = useState(null); // brand id showing the add-setting row
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
        .filter(s => !IGNORED_KEY.test(s.key))
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
              <div className="dm-field"><label className="dm-label">Brand Name <span className="dm-required">*</span></label><input className="dm-input" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., CrossCoin" required /></div>
              <div className="dm-field"><label className="dm-label">Display Name <span className="dm-required">*</span></label><input className="dm-input" type="text" name="display_name" value={formData.display_name} onChange={handleInputChange} placeholder="e.g., CrossCoin Store" required /></div>
              <div className="dm-field"><label className="dm-label">Slug</label><input className="dm-input" type="text" name="slug" value={formData.slug} onChange={handleInputChange} placeholder="e.g., crosscoin" /></div>
              <div className="dm-field"><label className="dm-label">Domain</label><input className="dm-input" type="text" name="domain" value={formData.domain} onChange={handleInputChange} placeholder="e.g., crosscoin.in" /></div>
              <div className="dm-field"><label className="dm-label">Contact Email</label><input className="dm-input" type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} placeholder="contact@example.com" /></div>
              <div className="dm-field"><label className="dm-label">Contact Phone</label><input className="dm-input" type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} placeholder="+1234567890" /></div>
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
            <div className="dm-field"><label className="dm-label">Logo URL</label><input className="dm-input" type="text" name="logo_url" value={formData.logo_url} onChange={handleInputChange} placeholder="https://example.com/logo.png" /></div>
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
                  const isRef = brand.id === referenceBrand?.id;
                  const pending = pendingFor(brand);
                  const isOpen = expanded === brand.id;
                  const url = feedUrl(brand);
                  // Settings this brand has that aren't in the predefined set (custom-added keys).
                  const extraSettings = (settingsByBrand[brand.id] || [])
                    .filter(s => !IGNORED_KEY.test(s.key) && !predefinedKeys.some(k => k.key === s.key))
                    .sort((a, b) => a.key.localeCompare(b.key));
                  return (
                    <React.Fragment key={brand.id}>
                      <tr style={{ cursor: 'pointer', background: isOpen ? 'var(--ds-color-surface-soft)' : 'var(--ds-color-surface)' }} onClick={() => setExpanded(isOpen ? null : brand.id)}>
                        <td style={{ ...cell, textAlign: 'center' }}><span style={{ display: 'inline-flex', width: 16, height: 16, color: 'var(--ds-color-text-faint)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>{IC.chevron}</span></td>
                        <td style={cell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <span style={{ position: 'relative', width: 38, height: 38, borderRadius: 9, background: 'var(--ds-color-brand)', color: 'var(--ds-color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                              {brandMono(brand)}
                              <span style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--ds-color-surface)', background: 'var(--ds-color-text-faint)' }} title={brand.primary_color || ''} />
                            </span>
                            <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{brand.display_name || brand.name}</div><div style={{ fontSize: 11, color: 'var(--ds-color-text-faint)', fontFamily: 'var(--ds-font-mono, monospace)' }}>{brand.slug}</div></div>
                          </div>
                        </td>
                        <td style={{ ...cell, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono, monospace)', fontSize: 12 }}>{brand.domain || '—'}</td>
                        <td style={cell}><span className={`sl-status-badge sl-status-${brand.status}`}>{brand.status}</span></td>
                        <td style={cell}>
                          {isRef ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-color-text-muted)', border: '1px solid var(--ds-color-border)', borderRadius: 20, padding: '2px 9px', background: 'var(--ds-color-surface-soft)' }}>Reference</span>
                          ) : pending === null ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-color-text-muted)' }}>{isOpen ? 'Loading…' : 'View settings →'}</span>
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
                                {isRef ? 'Reference brand — these are the canonical settings.' : `Fill the predefined settings for ${brand.display_name || brand.name}. Keys are fixed; only values are added.`}
                              </div>
                              {predefinedKeys.length === 0 ? (
                                <div style={{ color: 'var(--ds-color-text-muted)', fontSize: 13, padding: 8 }}>No predefined keys yet — add settings to the Crosscoin reference brand first.</div>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 8, overflow: 'hidden' }}>
                                  <thead>
                                    <tr><th style={th}>Key</th><th style={th}>Category</th><th style={th}>Value</th><th style={{ ...th, width: 110, textAlign: 'right' }}>Actions</th></tr>
                                  </thead>
                                  <tbody>
                                    {predefinedKeys.map(k => {
                                      const s = valueMap(brand.id).get(k.key);
                                      const dk = `${brand.id}:${k.key}`;
                                      const val = draft[dk] ?? s?.value ?? '';
                                      const missing = !s || s.value === '' || s.value == null;
                                      return (
                                        <tr key={k.key}>
                                          <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{k.key}{missing && <span style={{ marginLeft: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--ds-color-text-faint)', display: 'inline-block' }} title="Not set" />}</td>
                                          <td style={{ ...cell, color: 'var(--ds-color-text-muted)', fontSize: 12 }}>{CATEGORY_LABEL[k.category] || k.category}</td>
                                          <td style={cell}><input className="dm-input" style={{ width: '100%', fontSize: 13 }} value={val} placeholder={k.description || 'Enter value…'} onChange={e => setDraft(p => ({ ...p, [dk]: e.target.value }))} /></td>
                                          <td style={{ ...cell, textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                              <button className="sl-btn-edit" title="Save value" disabled={savingKey === dk} onClick={() => saveSetting(brand, k)}><span style={{ width: 16, height: 16, display: 'inline-block' }}>{IC.save}</span></button>
                                              {s && <button className="sl-btn-delete" title="Delete setting" disabled={savingKey === dk} onClick={() => deleteSetting(brand, k)}><span style={{ width: 16, height: 16, display: 'inline-block' }}>{IC.trash}</span></button>}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {extraSettings.map(s => {
                                      const dk = `${brand.id}:${s.key}`;
                                      const val = draft[dk] ?? s.value ?? '';
                                      const keyObj = { key: s.key, category: s.category || 'general', description: s.description || '' };
                                      return (
                                        <tr key={s.key}>
                                          <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{s.key} <span style={{ fontSize: 10, color: 'var(--ds-color-text)', fontWeight: 600, background: 'var(--ds-color-surface-soft)', borderRadius: 4, padding: '1px 5px' }}>custom</span></td>
                                          <td style={{ ...cell, color: 'var(--ds-color-text-muted)', fontSize: 12 }}>{CATEGORY_LABEL[s.category] || s.category || '—'}</td>
                                          <td style={cell}><input className="dm-input" style={{ width: '100%', fontSize: 13 }} value={val} onChange={e => setDraft(p => ({ ...p, [dk]: e.target.value }))} /></td>
                                          <td style={{ ...cell, textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                              <button className="sl-btn-edit" title="Save value" disabled={savingKey === dk} onClick={() => saveSetting(brand, keyObj)}><span style={{ width: 16, height: 16, display: 'inline-block' }}>{IC.save}</span></button>
                                              <button className="sl-btn-delete" title="Delete setting" disabled={savingKey === dk} onClick={() => deleteSetting(brand, keyObj)}><span style={{ width: 16, height: 16, display: 'inline-block' }}>{IC.trash}</span></button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
