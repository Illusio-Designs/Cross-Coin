import '@/styles/dashboard/brandTags.css';

/**
 * BrandTags Component
 * Displays brand tags/badges for products/categories in lists
 */
const BrandTags = ({ brands = [], maxVisible = 3 }) => {
    if (!brands || brands.length === 0) {
        return (
            <div className="brand-tags">
                <span className="brand-tag no-brands">No brands assigned</span>
            </div>
        );
    }

    const visibleBrands = brands.slice(0, maxVisible);
    const remainingCount = brands.length - maxVisible;

    return (
        <div className="brand-tags">
            {visibleBrands.map(brand => (
                <span
                    key={brand.id}
                    className="brand-tag"
                    style={{
                        borderLeftColor: brand.primary_color || '#4CAF50',
                        backgroundColor: `${brand.primary_color || '#4CAF50'}15`
                    }}
                    title={brand.display_name || brand.name}
                >
                    <span
                        className="brand-tag-dot"
                        style={{ backgroundColor: brand.primary_color || '#4CAF50' }}
                    />
                    {brand.display_name || brand.name}
                </span>
            ))}
            {remainingCount > 0 && (
                <span className="brand-tag more-brands" title={`${remainingCount} more brands`}>
                    +{remainingCount}
                </span>
            )}
        </div>
    );
};

export default BrandTags;
