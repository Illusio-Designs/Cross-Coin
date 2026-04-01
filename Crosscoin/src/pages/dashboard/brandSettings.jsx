// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useState, useEffect } from 'react';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandSettingsService, brandService } from '../../services';
import { Modal, Button } from '../../components/ui';
import Dropdown from '../../components/ui/Dropdown';
import Loader from '../../components/common/Loader';
import { ConfirmModal } from '../../components/common/AlertModal';

const IC = {
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  cancel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  unlock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l-1.41-1.41M6.34 17.66l1.41-1.41"/></svg>,
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
        setSelectedBrandId(response.data[0].id);
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
      {/* Page Header */}
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">{IC.settings}</div>
          <div>
            <h1 className="sl-page-title">Brand Settings</h1>
            <p className="sl-page-sub">{filteredSettings.length} setting{filteredSettings.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="sl-header-right">
          <Dropdown
            value={selectedBrandId || ''}
            onChange={val => setSelectedBrandId(Number(val))}
            options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
            className="bset-brand-select"
          />
          <button className="sl-add-btn" onClick={() => setShowAddForm(true)} disabled={!selectedBrandId}>
            <span className="sl-add-btn-icon">{IC.add}</span>Add Setting
          </button>
        </div>
      </div>

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
        <div className="sl-loader-wrap"><Loader /></div>
      ) : filteredSettings.length === 0 ? (
        <div className="sl-empty">
          <div className="sl-empty-icon">{IC.settings}</div>
          <p>No settings in this category</p>
        </div>
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
