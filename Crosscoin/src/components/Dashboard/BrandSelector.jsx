import { useState, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import '@/styles/dashboard/brandSelector.css';

/**
 * Universal Brand Selector for Admin Dashboard
 * Allows admins to switch between brands to manage their data
 */
export default function BrandSelector({ onBrandChange, currentBrand }) {
    const [brands, setBrands] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState(currentBrand || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const activeBrands = data.data?.filter(b => b.status === 'active') || [];
                setBrands(activeBrands);
                
                // Set first brand as default if none selected
                if (!selectedBrand && activeBrands.length > 0) {
                    const defaultBrand = activeBrands[0];
                    setSelectedBrand(defaultBrand);
                    if (onBrandChange) {
                        onBrandChange(defaultBrand);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBrandSelect = (brand) => {
        setSelectedBrand(brand);
        setIsOpen(false);
        if (onBrandChange) {
            onBrandChange(brand);
        }
    };

    if (loading) {
        return (
            <div className="brand-selector-loading">
                <div className="spinner"></div>
                <span>Loading brands...</span>
            </div>
        );
    }

    if (brands.length === 0) {
        return (
            <div className="brand-selector-empty">
                <span>No brands available</span>
            </div>
        );
    }

    return (
        <div className="brand-selector-container">
            <label className="brand-selector-label">Managing Brand:</label>
            <div className="brand-selector">
                <button
                    className="brand-selector-trigger"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ borderLeftColor: selectedBrand?.primary_color || '#4CAF50' }}
                >
                    <div className="brand-selector-current">
                        <div
                            className="brand-color-indicator"
                            style={{ backgroundColor: selectedBrand?.primary_color || '#4CAF50' }}
                        />
                        <div className="brand-info">
                            <span className="brand-name">{selectedBrand?.display_name || selectedBrand?.name}</span>
                            <span className="brand-slug">{selectedBrand?.slug}</span>
                        </div>
                    </div>
                    <FiChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div className="brand-selector-overlay" onClick={() => setIsOpen(false)} />
                        <div className="brand-selector-dropdown">
                            {brands.map((brand) => (
                                <button
                                    key={brand.id}
                                    className={`brand-option ${selectedBrand?.id === brand.id ? 'selected' : ''}`}
                                    onClick={() => handleBrandSelect(brand)}
                                >
                                    <div
                                        className="brand-color-indicator"
                                        style={{ backgroundColor: brand.primary_color || '#4CAF50' }}
                                    />
                                    <div className="brand-option-info">
                                        <span className="brand-option-name">{brand.display_name || brand.name}</span>
                                        <span className="brand-option-slug">{brand.slug}</span>
                                        {brand.domain && (
                                            <span className="brand-option-domain">{brand.domain}</span>
                                        )}
                                    </div>
                                    {selectedBrand?.id === brand.id && (
                                        <FiCheck className="check-icon" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
