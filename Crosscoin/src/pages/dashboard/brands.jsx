import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiToggleLeft, FiToggleRight, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { brandService } from '@/services';
import '@/styles/dashboard/brands.css';

export default function BrandManager() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        domain: '',
        description: '',
        theme_color: '#4CAF50',
        contact_email: '',
        contact_phone: '',
        is_active: true
    });

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const response = await brandService.getAllBrands(true);
            
            if (response.success) {
                setBrands(response.data);
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
            toast.error('Failed to load brands');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            toast.error('Brand name is required');
            return;
        }

        try {
            if (editingBrand) {
                // Update existing brand
                await brandService.updateBrand(editingBrand.id, formData);
                toast.success('Brand updated successfully');
            } else {
                // Create new brand
                await brandService.createBrand(formData);
                toast.success('Brand created successfully');
            }
            
            resetForm();
            fetchBrands();
        } catch (error) {
            console.error('Error saving brand:', error);
            toast.error(error.message || 'Failed to save brand');
        }
    };

    const handleEdit = (brand) => {
        setEditingBrand(brand);
        setFormData({
            name: brand.name,
            slug: brand.slug,
            domain: brand.domain || '',
            description: brand.description || '',
            theme_color: brand.theme_color || '#4CAF50',
            contact_email: brand.contact_email || '',
            contact_phone: brand.contact_phone || '',
            is_active: brand.is_active
        });
        setShowAddForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
            return;
        }

        try {
            await brandService.deleteBrand(id);
            toast.success('Brand deleted successfully');
            fetchBrands();
        } catch (error) {
            console.error('Error deleting brand:', error);
            toast.error('Failed to delete brand');
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await brandService.toggleBrandStatus(id);
            toast.success('Brand status updated');
            fetchBrands();
        } catch (error) {
            console.error('Error toggling brand status:', error);
            toast.error('Failed to update brand status');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            slug: '',
            domain: '',
            description: '',
            theme_color: '#4CAF50',
            contact_email: '',
            contact_phone: '',
            is_active: true
        });
        setEditingBrand(null);
        setShowAddForm(false);
    };

    const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (brand.domain && brand.domain.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="brand-manager">
                <div className="loading-container">
                    <FiRefreshCw className="spin" size={32} />
                    <p>Loading brands...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="brand-manager">
            <div className="brand-header">
                <h2>Brand Management</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    <FiPlus /> Add New Brand
                </button>
            </div>

            {showAddForm && (
                <div className="brand-form-card">
                    <div className="form-header">
                        <h3>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</h3>
                        <button className="btn-icon" onClick={resetForm}>
                            <FiX />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Brand Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., CrossCoin"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Slug</label>
                                <input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    placeholder="e.g., crosscoin (auto-generated if empty)"
                                />
                            </div>

                            <div className="form-group">
                                <label>Domain</label>
                                <input
                                    type="text"
                                    name="domain"
                                    value={formData.domain}
                                    onChange={handleInputChange}
                                    placeholder="e.g., crosscoin.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Theme Color</label>
                                <div className="color-input-group">
                                    <input
                                        type="color"
                                        name="theme_color"
                                        value={formData.theme_color}
                                        onChange={handleInputChange}
                                    />
                                    <input
                                        type="text"
                                        value={formData.theme_color}
                                        onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                                        placeholder="#4CAF50"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Contact Email</label>
                                <input
                                    type="email"
                                    name="contact_email"
                                    value={formData.contact_email}
                                    onChange={handleInputChange}
                                    placeholder="contact@example.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Contact Phone</label>
                                <input
                                    type="tel"
                                    name="contact_phone"
                                    value={formData.contact_phone}
                                    onChange={handleInputChange}
                                    placeholder="+1234567890"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Brand description..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleInputChange}
                                    />
                                    <span>Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                <FiSave /> {editingBrand ? 'Update Brand' : 'Create Brand'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                <FiX /> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="search-bar">
                <FiSearch />
                <input
                    type="text"
                    placeholder="Search brands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="brands-grid">
                {filteredBrands.length === 0 ? (
                    <div className="empty-state">
                        <p>No brands found</p>
                        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                            <FiPlus /> Add First Brand
                        </button>
                    </div>
                ) : (
                    filteredBrands.map(brand => (
                        <div key={brand.id} className="brand-card">
                            <div className="brand-card-header">
                                <div className="brand-info">
                                    <div
                                        className="brand-color"
                                        style={{ backgroundColor: brand.theme_color }}
                                    />
                                    <div>
                                        <h4>{brand.name}</h4>
                                        <span className="brand-slug">{brand.slug}</span>
                                    </div>
                                </div>
                                <div className="brand-actions">
                                    <button
                                        className={`btn-icon ${brand.is_active ? 'active' : 'inactive'}`}
                                        onClick={() => handleToggleStatus(brand.id)}
                                        title={brand.is_active ? 'Active' : 'Inactive'}
                                    >
                                        {brand.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleEdit(brand)}
                                        title="Edit"
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        className="btn-icon btn-danger"
                                        onClick={() => handleDelete(brand.id)}
                                        title="Delete"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>

                            <div className="brand-card-body">
                                {brand.domain && (
                                    <div className="brand-detail">
                                        <strong>Domain:</strong> {brand.domain}
                                    </div>
                                )}
                                {brand.contact_email && (
                                    <div className="brand-detail">
                                        <strong>Email:</strong> {brand.contact_email}
                                    </div>
                                )}
                                {brand.contact_phone && (
                                    <div className="brand-detail">
                                        <strong>Phone:</strong> {brand.contact_phone}
                                    </div>
                                )}
                                {brand.description && (
                                    <div className="brand-description">
                                        {brand.description}
                                    </div>
                                )}
                            </div>

                            <div className="brand-card-footer">
                                <span className={`status-badge ${brand.is_active ? 'active' : 'inactive'}`}>
                                    {brand.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <small>Updated: {new Date(brand.updated_at).toLocaleDateString()}</small>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
