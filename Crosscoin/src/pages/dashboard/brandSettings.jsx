import { useState, useEffect } from 'react';
import { showSuccess, showError } from '@/utils/toastNotification';
import { FiSave, FiEdit2, FiTrash2, FiX, FiLock, FiUnlock, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { brandSettingsService, brandService } from '@/services';
import { Modal, Button, Input } from '@/components/ui';
import Loader from '@/components/Loader';

export default function BrandSettingsManager() {
    const [brands, setBrands] = useState([]);
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

    const categories = {
        all: 'All Settings',
        general: 'General',
        payment: 'Payment',
        shipping: 'Shipping',
        email: 'Email',
        sms: 'SMS',
        social: 'Social Media',
        analytics: 'Analytics',
        security: 'Security',
        api: 'API Keys'
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    useEffect(() => {
        if (selectedBrandId) {
            fetchSettings();
        }
    }, [selectedBrandId]);

    const fetchBrands = async () => {
        try {
            const response = await brandService.getAllBrands(true);
            if (response.success && response.data.length > 0) {
                setBrands(response.data);
                setSelectedBrandId(response.data[0].id); // Select first brand by default
            }
        } catch (error) {
            showError('loadingFailed');
        }
    };

    const fetchSettings = async () => {
        if (!selectedBrandId) return;
        
        setLoading(true);
        try {
            const response = await brandSettingsService.getAllSettings(selectedBrandId);
            
            if (response.success) {
                setSettings(response.data || []);
            }
        } catch (error) {
            showError('loadingFailed');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (settingId, key) => {
        setSaving(prev => ({ ...prev, [settingId]: true }));
        try {
            const setting = settings.find(s => s.id === settingId);
            
            await brandSettingsService.updateSetting(selectedBrandId, key, {
                value: setting.value,
                is_encrypted: setting.is_encrypted
            });
            
            showSuccess('settingUpdated');
            setEditMode(prev => ({ ...prev, [settingId]: false }));
            fetchSettings();
        } catch (error) {
            showError('updateFailed', error.message);
        } finally {
            setSaving(prev => ({ ...prev, [settingId]: false }));
        }
    };

    const handleDelete = async (key) => {
        if (!window.confirm(`Are you sure you want to delete "${key}"?`)) {
            return;
        }

        try {
            await brandSettingsService.deleteSetting(selectedBrandId, key);
            showSuccess('settingDeleted');
            fetchSettings();
        } catch (error) {
            showError('deleteFailed');
        }
    };

    const handleAdd = async () => {
        if (!newKey.trim() || !newValue.trim()) {
            showError('fieldRequired');
            return;
        }

        try {
            await brandSettingsService.createSetting({
                brand_id: selectedBrandId,
                key: newKey.trim(),
                value: newValue.trim(),
                category: newCategory,
                description: newDescription.trim() || null,
                is_encrypted: false
            });
            
            showSuccess('settingAdded');
            setNewKey('');
            setNewValue('');
            setNewCategory('general');
            setNewDescription('');
            setShowAddForm(false);
            fetchSettings();
        } catch (error) {
            showError('saveFailed', error.message);
        }
    };

    const handleValueChange = (settingId, value) => {
        setSettings(prev => prev.map(setting =>
            setting.id === settingId ? { ...setting, value } : setting
        ));
    };

    const toggleEncryption = (settingId) => {
        setSettings(prev => prev.map(setting =>
            setting.id === settingId ? { ...setting, is_encrypted: !setting.is_encrypted } : setting
        ));
    };

    const toggleEditMode = (settingId) => {
        setEditMode(prev => ({ ...prev, [settingId]: !prev[settingId] }));
    };

    const filteredSettings = settings.filter(setting => {
        if (category === 'all') return true;
        return setting.category === category;
    });

    const renderSettingValue = (setting) => {
        if (editMode[setting.id]) {
            return (
                <div className="edit-container">
                    <textarea
                        className="setting-input"
                        value={setting.value || ''}
                        onChange={(e) => handleValueChange(setting.id, e.target.value)}
                        rows={3}
                        placeholder="Enter value..."
                    />
                    <div className="edit-actions">
                        <button
                            className="btn-icon btn-save"
                            onClick={() => handleUpdate(setting.id, setting.key)}
                            disabled={saving[setting.id]}
                            title="Save"
                        >
                            {saving[setting.id] ? <FiRefreshCw className="spin" /> : <FiSave />}
                        </button>
                        <button
                            className="btn-icon btn-cancel"
                            onClick={() => toggleEditMode(setting.id)}
                            title="Cancel"
                        >
                            <FiX />
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="value-display">
                <span className={setting.is_encrypted ? 'encrypted-value' : ''}>
                    {setting.is_encrypted ? '••••••••••••' : setting.value}
                </span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div style={{ position: 'relative', minHeight: '400px' }}>
                    <Loader />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="seo-header-container">
                <h1 className="seo-title">Brand Settings</h1>
                <div className="header-actions">
                    <select
                        className="brand-selector"
                        value={selectedBrandId || ''}
                        onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                    >
                        {brands.map(brand => (
                            <option key={brand.id} value={brand.id}>
                                {brand.display_name || brand.name}
                            </option>
                        ))}
                    </select>
                    <Button
                        onClick={() => setShowAddForm(true)}
                        variant="primary"
                        disabled={!selectedBrandId}
                    >
                        Add New Setting
                    </Button>
                </div>
            </div>

            <Modal
                isOpen={showAddForm}
                onClose={() => {
                    setShowAddForm(false);
                    setNewKey('');
                    setNewValue('');
                    setNewCategory('general');
                    setNewDescription('');
                }}
                title="Add New Setting"
            >
                <div className="form-grid">
                    <div className="form-group">
                        <label>Setting Key</label>
                        <Input
                            type="text"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            placeholder="e.g., RAZORPAY_KEY_ID"
                        />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="form-select"
                        >
                            {Object.entries(categories)
                                .filter(([key]) => key !== 'all')
                                .map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                        </select>
                    </div>
                    <div className="form-group full-width">
                        <label>Description</label>
                        <Input
                            type="text"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Description of this setting"
                        />
                    </div>
                    <div className="form-group full-width">
                        <label>Setting Value</label>
                        <textarea
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="Enter value..."
                            rows={3}
                            className="form-textarea"
                        />
                    </div>
                </div>
                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Button
                        onClick={() => {
                            setShowAddForm(false);
                            setNewKey('');
                            setNewValue('');
                            setNewCategory('general');
                            setNewDescription('');
                        }}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleAdd} variant="primary">
                        Add Setting
                    </Button>
                </div>
            </Modal>

            <div className="category-filter">
                        {Object.entries(categories).map(([key, label]) => (
                            <button
                                key={key}
                                className={`category-btn ${category === key ? 'active' : ''}`}
                                onClick={() => setCategory(key)}
                            >
                                {label}
                                {key !== 'all' && (
                                    <span className="count">
                                        {settings.filter(s => s.category === key).length}
                                    </span>
                                )}
                            </button>
                        ))}
            </div>

            <div className="settings-grid">
                {filteredSettings.length === 0 ? (
                    <div className="empty-state">
                        <p>No settings found in this category</p>
                        <button
                            className="btn-primary"
                            onClick={() => setShowAddForm(true)}
                        >
                            <FiPlus /> Add First Setting
                        </button>
                    </div>
                ) : (
                    filteredSettings.map(setting => (
                        <div key={setting.id} className="setting-card">
                            <div className="setting-header">
                                <div className="setting-info">
                                    <h4>{setting.key}</h4>
                                    <span className={`category-badge ${setting.category}`}>
                                        {categories[setting.category] || setting.category}
                                    </span>
                                </div>
                                <div className="setting-actions">
                                    {!editMode[setting.id] && (
                                        <>
                                            <button
                                                className="btn-icon"
                                                onClick={() => toggleEncryption(setting.id)}
                                                title={setting.is_encrypted ? 'Encrypted' : 'Not Encrypted'}
                                            >
                                                {setting.is_encrypted ? <FiLock /> : <FiUnlock />}
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => toggleEditMode(setting.id)}
                                                title="Edit"
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                className="btn-icon btn-danger"
                                                onClick={() => handleDelete(setting.key)}
                                                title="Delete"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="setting-body">
                                {renderSettingValue(setting)}
                            </div>
                            {setting.description && (
                                <div className="setting-description">
                                    {setting.description}
                                </div>
                            )}
                            <div className="setting-footer">
                                <small>
                                    Updated: {new Date(setting.updated_at).toLocaleString()}
                                </small>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}


