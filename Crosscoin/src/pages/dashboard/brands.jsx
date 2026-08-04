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

const IC = {
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  toggle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>,
  toggleOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>,
  brand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
};

const CATEGORY_LABEL = { general: 'General', payment: 'Payment', shipping: 'Shipping', email: 'Email', sms: 'SMS', social: 'Social', social_media: 'Social', analytics: 'Analytics', security: 'Security', api: 'API Keys' };
const EMPTY_FORM = { name: '', slug: '', display_name: '', domain: '', logo_url: '', primary_color: '#4CAF50', secondary_color: '#2196F3', contact_email: '', contact_phone: '', status: 'active' };
const IGNORED_KEY = /fship/i; // deprecated Fship shipping keys — not part of the canonical set

const safeDate = (d) => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? t.toLocaleDateString() : '—'; };
const cell = { padding: '10px 14px', borderBottom: '1px solid #eef0f4', fontSize: 13, verticalAlign: 'middle' };
const th = { ...cell, textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: '#8a90a2', fontWeight: 700, background: '#f7f8fb' };

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

  // Full settings (with values) for every brand — used for the completeness
  // count and the inline settings editor.
  const { data: settingsByBrand = {} } = useQuery({
    queryKey: ['brandSettingsFull', brands.map(b => b.id).sort().join(',')],
    enabled: brands.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const entries = await Promise.all(brands.map(async (b) => {
        try { const r = await brandSettingsService.getAllSettings(b.id); return [b.id, r?.success ? (r.data || []) : (Array.isArray(r) ? r : [])]; }
        catch { return [b.id, []]; }
      }));
      return Object.fromEntries(entries);
    },
  });

  const referenceBrand = brands.find(b => b.slug?.toLowerCase() === 'crosscoin' || b.name?.toLowerCase() === 'crosscoin');

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
    const have = valueMap(brand.id);
    return predefinedKeys.filter(k => { const s = have.get(k.key); return !s || s.value === '' || s.value == null; }).length;
  };
  const totalPending = brands.reduce((sum, b) => sum + (pendingFor(b) || 0), 0);

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
      queryClient.invalidateQueries({ queryKey: ['brandSettingsFull'] });
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
      queryClient.invalidateQueries({ queryKey: ['brandSettingsFull'] });
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
          queryClient.invalidateQueries({ queryKey: ['brandSettingsFull'] });
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
        <StatTile label="Total brands" value={brands.length} tone="info" />
        <StatTile label="Active" value={brands.filter(b => b.status === 'active').length} tone="good" />
        <StatTile label="Inactive" value={brands.filter(b => b.status !== 'active').length} tone="warn" />
        <StatTile label="Settings pending" value={totalPending} tone={totalPending > 0 ? 'warn' : 'good'} />
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
                <label className="dm-label">Sitemap URL <span style={{ fontWeight: 400, color: '#8a90a2' }}>— submit this in Google Search Console</span></label>
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
                      <tr style={{ cursor: 'pointer', background: isOpen ? '#f7f8fb' : '#fff' }} onClick={() => setExpanded(isOpen ? null : brand.id)}>
                        <td style={{ ...cell, textAlign: 'center' }}><span style={{ display: 'inline-flex', width: 16, height: 16, color: '#8a90a2', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>{IC.chevron}</span></td>
                        <td style={cell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: brand.primary_color || '#ccc', flexShrink: 0 }} />
                            <div><div style={{ fontWeight: 700 }}>{brand.display_name || brand.name}</div><div style={{ fontSize: 11, color: '#8a90a2' }}>{brand.slug}</div></div>
                          </div>
                        </td>
                        <td style={{ ...cell, color: '#5a6072' }}>{brand.domain || '—'}</td>
                        <td style={cell}><span className={`sl-status-badge sl-status-${brand.status}`}>{brand.status}</span></td>
                        <td style={cell}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            {isRef ? <span style={{ color: '#2563eb', fontWeight: 600 }}>Reference brand</span>
                              : pending === null ? <span style={{ color: '#8a90a2' }}>—</span>
                              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: pending === 0 ? '#16a34a' : '#d97706' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: pending === 0 ? '#16a34a' : '#d97706' }} />{pending === 0 ? 'All set' : `${pending} of ${predefinedKeys.length} pending`}</span>}
                            <button type="button" onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : brand.id); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                              {isOpen ? '▴ Hide settings' : '▾ View settings'}
                            </button>
                          </div>
                        </td>
                        <td style={cell} onClick={(e) => e.stopPropagation()}>
                          {url ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
                              <button type="button" onClick={() => copyText(url)} title="Copy Google product feed URL" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}><span style={{ width: 13, height: 13 }}>{IC.copy}</span> Google</button>
                              <button type="button" onClick={() => copyText(fbFeedUrl(brand))} title="Copy Facebook/Meta catalog feed URL (same product data, Meta-friendly URL)" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}><span style={{ width: 13, height: 13 }}>{IC.copy}</span> Facebook</button>
                              <button type="button" onClick={() => copyText(sitemapUrlOf(brand))} title="Copy sitemap URL (for Search Console)" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}><span style={{ width: 13, height: 13 }}>{IC.copy}</span> Sitemap</button>
                            </div>
                          ) : <span style={{ color: '#b3b8c4', fontStyle: 'italic', fontSize: 12 }}>add domain</span>}
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
                          <td colSpan={7} style={{ padding: 0, background: '#fbfcfe', borderBottom: '2px solid #e6e9f0' }}>
                            <div style={{ padding: '10px 16px 16px' }}>
                              <div style={{ fontSize: 12, color: '#8a90a2', margin: '4px 2px 8px', fontWeight: 600 }}>
                                {isRef ? 'Reference brand — these are the canonical settings.' : `Fill the predefined settings for ${brand.display_name || brand.name}. Keys are fixed; only values are added.`}
                              </div>
                              {predefinedKeys.length === 0 ? (
                                <div style={{ color: '#8a90a2', fontSize: 13, padding: 8 }}>No predefined keys yet — add settings to the Crosscoin reference brand first.</div>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #eef0f4', borderRadius: 8 }}>
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
                                          <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{k.key}{missing && <span style={{ marginLeft: 6, width: 7, height: 7, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} title="Not set" />}</td>
                                          <td style={{ ...cell, color: '#8a90a2', fontSize: 12 }}>{CATEGORY_LABEL[k.category] || k.category}</td>
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
                                          <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{s.key} <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600, background: '#eff4ff', borderRadius: 4, padding: '1px 5px' }}>custom</span></td>
                                          <td style={{ ...cell, color: '#8a90a2', fontSize: 12 }}>{CATEGORY_LABEL[s.category] || s.category || '—'}</td>
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
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: '#fff', border: '1px solid #eef0f4', borderRadius: 8, padding: 10 }}>
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
