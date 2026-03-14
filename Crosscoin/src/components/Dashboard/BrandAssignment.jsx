import { useState, useEffect } from 'react';
import '@/styles/dashboard/brandAssignment.css';

/**
 * BrandAssignment Component
 * Shows checkboxes for assigning products/categories to multiple brands
 */
const BrandAssignment = ({ selectedBrands = [], onChange, disabled = false }) => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const activeBrands = data.data?.filter(b => b.status === 'active') || [];
                setBrands(activeBrands);
            } else {
                setError('Failed to load brands');
            }
        } catch (err) {
            setError('Error loading brands');
        } finally {
            setLoading(false);
        }
    };

    const handleBrandToggle = (brandId) => {
        if (disabled) return;

        const newSelectedBrands = selectedBrands.includes(brandId)
            ? selectedBrands.filter(id => id !== brandId)
            : [...selectedBrands, brandId];

        onChange(newSelectedBrands);
    };

    const handleSelectAll = () => {
        if (disabled) return;
        onChange(brands.map(b => b.id));
    };

    const handleDeselectAll = () => {
        if (disabled) return;
        onChange([]);
    };

    if (loading) {
        return (
            <div className="brand-assignment-loading">
                <div className="spinner"></div>
                <span>Loading brands...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="brand-assignment-error">
                <span>{error}</span>
            </div>
        );
    }

    if (brands.length === 0) {
        return (
            <div className="brand-assignment-empty">
                <span>No brands available</span>
            </div>
        );
    }

    return (
        <div className="brand-assignment">
            <div className="brand-assignment-header">
                <label className="brand-assignment-label">
                    Assign to Brands <span className="required">*</span>
                </label>
                <div className="brand-assignment-actions">
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        disabled={disabled}
                        className="brand-action-btn"
                    >
                        Select All
                    </button>
                    <button
                        type="button"
                        onClick={handleDeselectAll}
                        disabled={disabled}
                        className="brand-action-btn"
                    >
                        Deselect All
                    </button>
                </div>
            </div>

            <div className="brand-assignment-grid">
                {brands.map(brand => (
                    <label
                        key={brand.id}
                        className={`brand-checkbox-item ${
                            selectedBrands.includes(brand.id) ? 'selected' : ''
                        } ${disabled ? 'disabled' : ''}`}
                    >
                        <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand.id)}
                            onChange={() => handleBrandToggle(brand.id)}
                            disabled={disabled}
                        />
                        <div
                            className="brand-color-indicator"
                            style={{ backgroundColor: brand.primary_color || '#4CAF50' }}
                        />
                        <div className="brand-info">
                            <span className="brand-name">{brand.display_name || brand.name}</span>
                            <span className="brand-slug">{brand.slug}</span>
                        </div>
                        {selectedBrands.includes(brand.id) && (
                            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        )}
                    </label>
                ))}
            </div>

            <div className="brand-assignment-summary">
                <span>
                    {selectedBrands.length} of {brands.length} brands selected
                </span>
            </div>
        </div>
    );
};

export default BrandAssignment;

