// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useState, useEffect } from 'react';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandSettingsService, brandService } from '../../services';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, PencilEdit02Icon, Delete02Icon, FloppyDiskIcon, Cancel01Icon, SquareLock02Icon, SquareUnlock02Icon, Settings01Icon } from '@hugeicons/core-free-icons';
import { Modal, Button } from '../../components/ui';
import Dropdown from '../../components/ui/Dropdown';
import Loader from '../../components/common/Loader';
import { ConfirmModal } from '../../components/common/AlertModal';
import { PageHeader, EmptyState } from '../../components/Dashboard/primitives';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  save: <HugeiconsIcon icon={FloppyDiskIcon} size={16} strokeWidth={2} />,
  cancel: <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />,
  lock: <HugeiconsIcon icon={SquareLock02Icon} size={16} strokeWidth={2} />,
  unlock: <HugeiconsIcon icon={SquareUnlock02Icon} size={16} strokeWidth={2} />,
  settings: <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={2} />,
};

const CATEGORIES = { all: 'All', general: 'General', payment: 'Payment', shipping: 'Shipping', email: 'Email', sms: 'SMS', social: 'Social', analytics: 'Analytics', security: 'Security', api: 'API Keys' };

export function BrandSettingsManager() {
  const [brands, setBrands] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [settings, setSettings] = useState([]);
  const [category, setCategory] = useState('all');
  const [editMode, setEditMode] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newDescription, setNewDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (selectedBrandId) fetchSettings(); }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      const response = await brandService.getAllBrands(true);
      if (response.success && response.data.length > 0) {
        setBrands(response.data);
        // Preselect the brand handed over from the Brands page ("Manage
        // settings"), otherwise default to the first brand.
        let preselect = response.data[0].id;
        try {
          const stored = sessionStorage.getItem('dash_settings_brand');
          if (stored && response.data.some(b => String(b.id) === stored)) preselect = Number(stored);
          sessionStorage.removeItem('dash_settings_brand');
        } catch { /* ignore */ }
        setSelectedBrandId(preselect);
      }
    } catch { showError('loadingFailed'); }
  };

  const fetchSettings = async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const response = await brandSettingsService.getAllSettings(selectedBrandId);
      if (response.success) setSettings(response.data || []);
    } catch { showError('loadingFailed'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (settingId, key) => {
    setSaving(prev => ({ ...prev, [settingId]: true }));
    try {
      const setting = settings.find(s => s.id === settingId);
      await brandSettingsService.updateSetting(selectedBrandId, key, { value: setting.value, is_encrypted: setting.is_encrypted });
      showSuccess('settingUpdated');
      setEditMode(prev => ({ ...prev, [settingId]: false }));
      fetchSettings();
    } catch (error) { showError('updateFailed', error.message); }
    finally { setSaving(prev => ({ ...prev, [settingId]: false })); }
  };

  const handleDelete = (key) => {
    setConfirmState({ message: `Delete "${key}"?`, onConfirm: async () => {
      setConfirmState(null);
      try { await brandSettingsService.deleteSetting(selectedBrandId, key); showSuccess('settingDeleted'); fetchSettings(); }
      catch { showError('deleteFailed'); }
    }});
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) { showError('fieldRequired'); return; }
    try {
      await brandSettingsService.createSetting({ brand_id: selectedBrandId, key: newKey.trim(), value: newValue.trim(), category: newCategory, description: newDescription.trim() || null, is_encrypted: false });
      showSuccess('settingAdded');
      setNewKey(''); setNewValue(''); setNewCategory('general'); setNewDescription(''); setShowAddForm(false);
      fetchSettings();
    } catch (error) { showError('saveFailed', error.message); }
  };

  const handleValueChange = (settingId, value) => setSettings(prev => prev.map(s => s.id === settingId ? { ...s, value } : s));
  const toggleEncryption = (settingId) => setSettings(prev => prev.map(s => s.id === settingId ? { ...s, is_encrypted: !s.is_encrypted } : s));
  const toggleEditMode = (settingId) => setEditMode(prev => ({ ...prev, [settingId]: !prev[settingId] }));

  const filteredSettings = settings.filter(s => category === 'all' || s.category === category);

  return (
    <>
    <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
    <div className="dashboard-page">
      <PageHeader
        title="Brand Settings"
        subtitle={`${filteredSettings.length} setting${filteredSettings.length !== 1 ? 's' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Dropdown
              value={selectedBrandId || ''}
              onChange={val => setSelectedBrandId(Number(val))}
              options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
              className="bset-brand-select"
            />
            <Button variant="primary" onClick={() => setShowAddForm(true)} disabled={!selectedBrandId}>+ Add Setting</Button>
          </div>
        }
      />

      {/* Add Setting Modal */}
      <Modal isOpen={showAddForm} onClose={() => { setShowAddForm(false); setNewKey(''); setNewValue(''); setNewCategory('general'); setNewDescription(''); }} title="Add New Setting">
        <div className="seo-form">
          <div className="modal-body">
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Setting Key <span className="dm-required">*</span></label>
                <input className="dm-input" type="text" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g., RAZORPAY_KEY_ID" />
              </div>
              <div className="dm-field">
                <label className="dm-label">Category</label>
                <Dropdown
                  value={newCategory}
                  onChange={val => setNewCategory(val)}
                  options={Object.entries(CATEGORIES).filter(([k]) => k !== 'all').map(([k, l]) => ({ value: k, label: l }))}
                />
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Description</label>
              <input className="dm-input" type="text" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description of this setting" />
            </div>
            <div className="dm-field">
              <label className="dm-label">Value <span className="dm-required">*</span></label>
              <textarea className="dm-input dm-textarea" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Enter value..." rows={3} />
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue(''); }}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd}>Add Setting</Button>
          </div>
        </div>
      </Modal>

      {/* Category Filter Tabs */}
      <div className="bset-category-tabs">
        {Object.entries(CATEGORIES).map(([key, label]) => (
          <button key={key} className={`bset-cat-tab ${category === key ? 'active' : ''}`} onClick={() => setCategory(key)}>
            {label}
            {key !== 'all' && <span className="bset-cat-count">{settings.filter(s => s.category === key).length}</span>}
          </button>
        ))}
      </div>

      {/* Settings Grid */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
      ) : filteredSettings.length === 0 ? (
        <EmptyState
          icon={IC.settings}
          title="No settings in this category"
          message="Add your first setting to override defaults for this brand."
          action={<Button variant="primary" onClick={() => setShowAddForm(true)} disabled={!selectedBrandId}>+ Add Setting</Button>}
        />
      ) : (
        <div className="bset-settings-grid">
          {filteredSettings.map(setting => (
            <div key={setting.id} className="bset-setting-card">
              <div className="bset-setting-header">
                <div className="bset-setting-info">
                  <h4 className="bset-setting-key">{setting.key}</h4>
                  <span className="sl-cat-badge">{CATEGORIES[setting.category] || setting.category}</span>
                </div>
                <div className="sl-actions">
                  {!editMode[setting.id] && (
                    <>
                      <button className="sl-btn-edit" title={setting.is_encrypted ? 'Encrypted' : 'Not Encrypted'} onClick={() => toggleEncryption(setting.id)}>
                        {setting.is_encrypted ? IC.lock : IC.unlock}
                      </button>
                      <button className="sl-btn-edit" title="Edit" onClick={() => toggleEditMode(setting.id)}>{IC.edit}</button>
                      <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(setting.key)}>{IC.trash}</button>
                    </>
                  )}
                </div>
              </div>
              <div className="bset-setting-body">
                {editMode[setting.id] ? (
                  <div className="bset-edit-wrap">
                    <textarea className="bset-textarea" value={setting.value || ''} onChange={e => handleValueChange(setting.id, e.target.value)} rows={3} placeholder="Enter value..." />
                    <div className="sl-actions" style={{ marginTop: '8px' }}>
                      <button className="sl-btn-edit" title="Save" onClick={() => handleUpdate(setting.id, setting.key)} disabled={saving[setting.id]}>{IC.save}</button>
                      <button className="sl-btn-delete" title="Cancel" onClick={() => toggleEditMode(setting.id)}>{IC.cancel}</button>
                    </div>
                  </div>
                ) : (
                  <div className="bset-value-display">
                    <span className={setting.is_encrypted ? 'bset-encrypted' : ''}>{setting.is_encrypted ? '••••••••••••' : setting.value}</span>
                  </div>
                )}
              </div>
              {setting.description && <div className="bset-setting-desc">{setting.description}</div>}
              <div className="bset-setting-footer">
                <small>Updated {new Date(setting.updated_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
