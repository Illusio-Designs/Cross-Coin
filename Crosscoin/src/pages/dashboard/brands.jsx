import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiToggleLeft, FiToggleRight, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { brandService } from '@/services';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui';
import InputField from '@/components/common/InputField';
import Loader from '@/components/Loader';
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
        display_name: '',
        domain: '',
        logo_url: '',
        primary_color: '#4CAF50',
        secondary_color: '#2196F3',
        contact_email: '',
        contact_phone: '',
        status: 'active'
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
            display_name: brand.display_name || brand.name,
            domain: brand.domain || '',
            logo_url: brand.logo_url || '',
            primary_color: brand.primary_color || '#4CAF50',
            secondary_color: brand.secondary_color || '#2196F3',
            contact_email: brand.contact_email || '',
            contact_phone: brand.contact_phone || '',
            status: brand.status || 'active'
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
            display_name: '',
            domain: '',
            logo_url: '',
            primary_color: '#4CAF50',
            secondary_color: '#2196F3',
            contact_email: '',
            contact_phone: '',
            status: 'active'
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
                <h1 className="seo-title">Brand Management</h1>
                <Button
                    onClick={() => setShowAddForm(true)}
                    variant="primary"
                >
                    Add New Brand
                </Button>
            </div>

            {showAddForm && (
                <Modal
                    isOpen={showAddForm}
                    onClose={resetForm}
                    title={editingBrand ? 'Edit Brand' : 'Add New Brand'}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Brand Name *</label>
                                <InputField
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., CrossCoin"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Display Name *</label>
                                <InputField
                                    type="text"
                                    name="display_name"
                                    value={formData.display_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., CrossCoin Store"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Slug</label>
                                <InputField
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    placeholder="e.g., crosscoin (auto-generated if empty)"
                                />
                            </div>

                            <div className="form-group">
                                <label>Domain</label>
                                <InputField
                                    type="text"
                                    name="domain"
                                    value={formData.domain}
                                    onChange={handleInputChange}
                                    placeholder="e.g., crosscoin.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Logo URL</label>
                                <InputField
                                    type="text"
                                    name="logo_url"
                                    value={formData.logo_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>

                            <div className="form-group">
                                <label>Primary Color</label>
                                <div className="color-input-group">
                                    <input
                                        type="color"
                                        name="primary_color"
                                        value={formData.primary_color}
                                        onChange={handleInputChange}
                                    />
                                    <InputField
                                        type="text"
                                        value={formData.primary_color}
                                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                                        placeholder="#4CAF50"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Secondary Color</label>
                                <div className="color-input-group">
                                    <input
                                        type="color"
                                        name="secondary_color"
                                        value={formData.secondary_color}
                                        onChange={handleInputChange}
                                    />
                                    <InputField
                                        type="text"
                                        value={formData.secondary_color}
                                        onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                                        placeholder="#2196F3"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Contact Email</label>
                                <InputField
                                    type="email"
                                    name="contact_email"
                                    value={formData.contact_email}
                                    onChange={handleInputChange}
                                    placeholder="contact@example.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Contact Phone</label>
                                <InputField
                                    type="tel"
                                    name="contact_phone"
                                    value={formData.contact_phone}
                                    onChange={handleInputChange}
                                    placeholder="+1234567890"
                                />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <Button type="button" variant="secondary" onClick={resetForm}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                {editingBrand ? 'Update Brand' : 'Create Brand'}
                            </Button>
                        </div>
                    </form>
                </Modal>
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
                                        style={{ backgroundColor: brand.primary_color }}
                                    />
                                    <div>
                                        <h4>{brand.display_name || brand.name}</h4>
                                        <span className="brand-slug">{brand.slug}</span>
                                    </div>
                                </div>
                                <div className="brand-actions">
                                    <button
                                        className={`btn-icon ${brand.status === 'active' ? 'active' : 'inactive'}`}
                                        onClick={() => handleToggleStatus(brand.id)}
                                        title={brand.status === 'active' ? 'Active' : 'Inactive'}
                                    >
                                        {brand.status === 'active' ? <FiToggleRight /> : <FiToggleLeft />}
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
                                {brand.logo_url && (
                                    <div className="brand-detail">
                                        <strong>Logo:</strong> <img src={brand.logo_url} alt={brand.name} style={{maxHeight: '30px'}} />
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
                                {brand.primary_color && brand.secondary_color && (
                                    <div className="brand-detail">
                                        <strong>Colors:</strong> 
                                        <span style={{display: 'inline-flex', gap: '5px', marginLeft: '5px'}}>
                                            <span style={{width: '20px', height: '20px', backgroundColor: brand.primary_color, border: '1px solid #ccc'}}></span>
                                            <span style={{width: '20px', height: '20px', backgroundColor: brand.secondary_color, border: '1px solid #ccc'}}></span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="brand-card-footer">
                                <span className={`status-badge ${brand.status === 'active' ? 'active' : 'inactive'}`}>
                                    {brand.status === 'active' ? 'Active' : 'Inactive'}
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
