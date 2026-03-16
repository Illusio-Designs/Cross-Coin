

/**
 * BrandTags Component
 * Displays brand tags for products/categories in dashboard tables
 * Shows multiple brands as colored badges
 */
const BrandTags = ({ brands = [] }) => {
    if (!brands || brands.length === 0) {
        return (
            <span className="brand-tags-empty">
                No brands
            </span>
        );
    }

    return (
        <div className="brand-tags-container">
            {brands.map((brand, index) => (
                <span
                    key={brand.id || index}
                    className="brand-tag"
                    style={{
                        backgroundColor: brand.primary_color || '#4CAF50',
                        borderColor: brand.primary_color || '#4CAF50'
                    }}
                    title={`${brand.display_name || brand.name} (${brand.slug})`}
                >
                    {brand.display_name || brand.name}
                </span>
            ))}
        </div>
    );
};

export default BrandTags;
