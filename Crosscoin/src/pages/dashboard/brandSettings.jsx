import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiSave, FiEdit2, FiTrash2, FiX, FiLock, FiUnlock, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { brandSettingsService } from '@/services';
import '@/styles/dashboard/brandSettings.css';

export default function BrandSettingsManager() {
    const [settings, setSettings] = useState({});
    const [category, setCategory] = useState('all');
    const [editMode, setEditMode] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState({});
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newCategory, setNewCategory] = useState('general');
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
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await brandSettingsService.getAllSettings();
            
            if (response.success) {
                const settingsMap = {};
                response.data.forEach(setting => {
                    settingsMap[setting.setting_key] = setting;
                });
                setSettings(settingsMap);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key) => {
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            const setting = settings[key];
            
            await brandSettingsService.updateSetting(key, {
                setting_value: setting.setting_value,
                is_encrypted: setting.is_encrypted
            });
            
            toast.success('Setting updated successfully');
            setEditMode(prev => ({ ...prev, [key]: false }));
            fetchSettings(); // Refresh to get updated data
        } catch (error) {
            console.error('Error updating setting:', error);
            toast.error(error.message || 'Failed to update setting');
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleDelete = async (key) => {
        if (!window.confirm(`Are you sure you want to delete "${key}"?`)) {
            return;
        }

        try {
            await brandSettingsService.deleteSetting(key);
            toast.success('Setting deleted successfully');
            fetchSettings();
        } catch (error) {
            console.error('Error deleting setting:', error);
            toast.error('Failed to delete setting');
        }
    };

    const handleAdd = async () => {
        if (!newKey.trim() || !newValue.trim()) {
            toast.error('Key and value are required');
            return;
        }

        try {
            await brandSettingsService.createSetting({
                setting_key: newKey.trim(),
                setting_value: newValue.trim(),
                category: newCategory,
                is_encrypted: false
            });
            
            toast.success('Setting added successfully');
            setNewKey('');
            setNewValue('');
            setNewCategory('general');
            setShowAddForm(false);
            fetchSettings();
        } catch (error) {
            console.error('Error adding setting:', error);
            toast.error(error.message || 'Failed to add setting');
        }
    };

    const handleValueChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                setting_value: value
            }
        }));
    };

    const toggleEncryption = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                is_encrypted: !prev[key].is_encrypted
            }
        }));
    };

    const toggleEditMode = (key) => {
        setEditMode(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const filteredSettings = Object.entries(settings).filter(([key, setting]) => {
        if (category === 'all') return true;
        return setting.category === category;
    });

    const renderSettingValue = (key, setting) => {
        if (editMode[key]) {
            return (
                <div className="edit-container">
                    <textarea
                        className="setting-input"
                        value={setting.setting_value || ''}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        rows={3}
                        placeholder="Enter value..."
                    />
                    <div className="edit-actions">
                        <button
                            className="btn-icon btn-save"
                            onClick={() => handleUpdate(key)}
                            disabled={saving[key]}
                            title="Save"
                        >
                            {saving[key] ? <FiRefreshCw className="spin" /> : <FiSave />}
                        </button>
                        <button
                            className="btn-icon btn-cancel"
                            onClick={() => toggleEditMode(key)}
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
                    {setting.is_encrypted ? '••••••••••••' : setting.setting_value}
                </span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="brand-settings-manager">
                <div className="loading-container">
                    <FiRefreshCw className="spin" size={32} />
                    <p>Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="brand-settings-manager">
            <div className="settings-header">
                <h2>Brand Settings Manager</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    <FiPlus /> Add New Setting
                </button>
            </div>

            {showAddForm && (
                <div className="add-form-card">
                    <h3>Add New Setting</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Setting Key</label>
                            <input
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
                            >
                                {Object.entries(categories)
                                    .filter(([key]) => key !== 'all')
                                    .map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label>Setting Value</label>
                            <textarea
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="Enter value..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button className="btn-primary" onClick={handleAdd}>
                            <FiSave /> Add Setting
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setShowAddForm(false);
                                setNewKey('');
                                setNewValue('');
                                setNewCategory('general');
                            }}
                        >
                            <FiX /> Cancel
                        </button>
                    </div>
                </div>
            )}

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
                                {Object.values(settings).filter(s => s.category === key).length}
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
                    filteredSettings.map(([key, setting]) => (
                        <div key={key} className="setting-card">
                            <div className="setting-header">
                                <div className="setting-info">
                                    <h4>{key}</h4>
                                    <span className={`category-badge ${setting.category}`}>
                                        {categories[setting.category] || setting.category}
                                    </span>
                                </div>
                                <div className="setting-actions">
                                    {!editMode[key] && (
                                        <>
                                            <button
                                                className="btn-icon"
                                                onClick={() => toggleEncryption(key)}
                                                title={setting.is_encrypted ? 'Encrypted' : 'Not Encrypted'}
                                            >
                                                {setting.is_encrypted ? <FiLock /> : <FiUnlock />}
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => toggleEditMode(key)}
                                                title="Edit"
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                className="btn-icon btn-danger"
                                                onClick={() => handleDelete(key)}
                                                title="Delete"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="setting-body">
                                {renderSettingValue(key, setting)}
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
