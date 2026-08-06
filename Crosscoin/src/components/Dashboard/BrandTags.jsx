/**
 * BrandTags Component
 * Displays brand tags for products/categories in dashboard tables
 */
const BrandTags = ({ brands = [] }) => {
    if (!brands || brands.length === 0) {
        return <span className="sl-na">—</span>;
    }

    return (
        <div className="brand-tags-container">
            {brands.map((brand, index) => (
                <span
                    key={brand.id || index}
                    className="brand-tag"
                    title={brand.display_name || brand.name}
                >
                    <span
                        className="brand-tag-dot"
                        style={{ backgroundColor: brand.primary_color || 'var(--ds-color-text)' }}
                    />
                    {brand.display_name || brand.name}
                </span>
            ))}
        </div>
    );
};

export default BrandTags;
