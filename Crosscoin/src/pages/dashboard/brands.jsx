// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService } from '../../services';
import { Modal, Button } from '../../components/ui';
import Dropdown from '../../components/ui/Dropdown';
import Loader from '../../components/common/Loader';
import { ConfirmModal } from '../../components/common/AlertModal';
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from '../../components/Dashboard/primitives';
import { queryKeys } from '../../lib/queryClient';

const IC = {
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  toggle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>,
  toggleOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>,
  brand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};

const EMPTY_FORM = { name: '', slug: '', display_name: '', domain: '', logo_url: '', primary_color: '#4CAF50', secondary_color: '#2196F3', contact_email: '', contact_phone: '', status: 'active' };

export function BrandManager() {
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  // ── React Query: brands list ──────────────────────────────────────
  const { data: brands = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.brandsAdmin,
    queryFn: async () => {
      const response = await brandService.getAllBrands(true);
      return response.success ? response.data : [];
    },
    staleTime: 60 * 1000,
  });

  // Invalidate after mutations instead of manual re-fetch.
  const refetchBrands = () => queryClient.invalidateQueries({ queryKey: queryKeys.brandsAdmin });
  const fetchBrands = refetchBrands;  // legacy callers

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { showError('fieldRequired'); return; }
    try {
      if (editingBrand) { await brandService.updateBrand(editingBrand.id, formData); showSuccess('brandUpdated'); }
      else { await brandService.createBrand(formData); showSuccess('brandCreated'); }
      resetForm();
      fetchBrands();
    } catch (error) { showError('saveFailed', error.message); }
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name, slug: brand.slug, display_name: brand.display_name || brand.name, domain: brand.domain || '', logo_url: brand.logo_url || '', primary_color: brand.primary_color || '#4CAF50', secondary_color: brand.secondary_color || '#2196F3', contact_email: brand.contact_email || '', contact_phone: brand.contact_phone || '', status: brand.status || 'active' });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmState({ message: 'Delete this brand? This cannot be undone.', onConfirm: async () => {
      setConfirmState(null);
      try { await brandService.deleteBrand(id); showSuccess('brandDeleted'); fetchBrands(); }
      catch { showError('deleteFailed'); }
    }});
  };

  const handleToggleStatus = async (id) => {
    try { await brandService.toggleBrandStatus(id); showSuccess('brandStatusUpdated'); fetchBrands(); }
    catch { showError('updateFailed'); }
  };

  const resetForm = () => { setFormData(EMPTY_FORM); setEditingBrand(null); setShowForm(false); };

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
        title="Brands"
        subtitle={`${brands.length} brand${brands.length !== 1 ? 's' : ''} total`}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>+ Add Brand</Button>
        }
      />

      <StatGrid>
        <StatTile label="Total brands" value={brands.length} tone="info" />
        <StatTile label="Active" value={brands.filter(b => b.status === 'active').length} tone="good" />
        <StatTile label="Inactive" value={brands.filter(b => b.status !== 'active').length} tone="warn" />
      </StatGrid>

      <Panel style={{ marginBottom: 16 }}>
        <FilterBar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search brands by name, slug, or domain…"
        />
      </Panel>

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={resetForm} title={editingBrand ? 'Edit Brand' : 'Add New Brand'}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Brand Name <span className="dm-required">*</span></label>
                <input className="dm-input" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., CrossCoin" required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Display Name <span className="dm-required">*</span></label>
                <input className="dm-input" type="text" name="display_name" value={formData.display_name} onChange={handleInputChange} placeholder="e.g., CrossCoin Store" required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Slug</label>
                <input className="dm-input" type="text" name="slug" value={formData.slug} onChange={handleInputChange} placeholder="e.g., crosscoin" />
              </div>
              <div className="dm-field">
                <label className="dm-label">Domain</label>
                <input className="dm-input" type="text" name="domain" value={formData.domain} onChange={handleInputChange} placeholder="e.g., crosscoin.com" />
              </div>
              <div className="dm-field">
                <label className="dm-label">Contact Email</label>
                <input className="dm-input" type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} placeholder="contact@example.com" />
              </div>
              <div className="dm-field">
                <label className="dm-label">Contact Phone</label>
                <input className="dm-input" type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} placeholder="+1234567890" />
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Logo URL</label>
              <input className="dm-input" type="text" name="logo_url" value={formData.logo_url} onChange={handleInputChange} placeholder="https://example.com/logo.png" />
            </div>
            <div className="dm-field">
              <label className="dm-label">Status</label>
              <Dropdown
                value={formData.status}
                onChange={val => handleInputChange({ target: { name: 'status', value: val } })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
            <div className="dm-section-title">Brand Colors</div>
            <div className="dm-color-row">
              <div className="dm-field">
                <label className="dm-label">Primary Color</label>
                <div className="dm-color-input-wrap">
                  <input type="color" name="primary_color" value={formData.primary_color} onChange={handleInputChange} className="dm-color-picker" />
                  <input type="text" value={formData.primary_color} onChange={e => setFormData(prev => ({ ...prev, primary_color: e.target.value }))} className="dm-color-text" placeholder="#4CAF50" />
                </div>
              </div>
              <div className="dm-field">
                <label className="dm-label">Secondary Color</label>
                <div className="dm-color-input-wrap">
                  <input type="color" name="secondary_color" value={formData.secondary_color} onChange={handleInputChange} className="dm-color-picker" />
                  <input type="text" value={formData.secondary_color} onChange={e => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))} className="dm-color-text" placeholder="#2196F3" />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button type="submit" variant="primary">{editingBrand ? 'Update Brand' : 'Create Brand'}</Button>
          </div>
        </form>
      </Modal>

      {/* Brands Grid */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
      ) : filteredBrands.length === 0 ? (
        <EmptyState
          icon={IC.brand}
          title={searchQuery ? "No brands match your search" : "No brands yet"}
          message={searchQuery ? "Try a different search term." : "Add your first brand to start selling under it."}
          action={!searchQuery && <Button variant="primary" onClick={() => setShowForm(true)}>+ Add Brand</Button>}
        />
      ) : (
        <div className="brand-cards-grid">
          {filteredBrands.map(brand => (
            <div key={brand.id} className="brand-card-new">
              <div className="brand-card-top">
                <div className="brand-card-identity">
                  <div className="brand-color-dot" style={{ backgroundColor: brand.primary_color }} />
                  <div>
                    <h4 className="brand-card-name">{brand.display_name || brand.name}</h4>
                    <span className="brand-card-slug">{brand.slug}</span>
                  </div>
                </div>
                <div className="sl-actions">
                  <button className={`sl-btn-toggle ${brand.status === 'active' ? 'active' : ''}`} title={brand.status === 'active' ? 'Active' : 'Inactive'} onClick={() => handleToggleStatus(brand.id)}>
                    {brand.status === 'active' ? IC.toggle : IC.toggleOff}
                  </button>
                  <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(brand)}>{IC.edit}</button>
                  <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(brand.id)}>{IC.trash}</button>
                </div>
              </div>
              <div className="brand-card-body-new">
                {brand.domain && <div className="brand-detail-row"><span className="brand-detail-key">Domain</span><span className="brand-detail-val">{brand.domain}</span></div>}
                {brand.contact_email && <div className="brand-detail-row"><span className="brand-detail-key">Email</span><span className="brand-detail-val">{brand.contact_email}</span></div>}
                {brand.contact_phone && <div className="brand-detail-row"><span className="brand-detail-key">Phone</span><span className="brand-detail-val">{brand.contact_phone}</span></div>}
                <div className="brand-detail-row">
                  <span className="brand-detail-key">Colors</span>
                  <span className="brand-color-swatches">
                    <span className="brand-swatch" style={{ backgroundColor: brand.primary_color }} title={brand.primary_color} />
                    <span className="brand-swatch" style={{ backgroundColor: brand.secondary_color }} title={brand.secondary_color} />
                  </span>
                </div>
              </div>
              <div className="brand-card-footer-new">
                <span className={`sl-status-badge sl-status-${brand.status}`}>{brand.status}</span>
                <small className="brand-updated">Updated {new Date(brand.updated_at).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
