import { useState, useEffect } from 'react';
import colorMap from './colorMap';

const ProductFilterDrawer = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  categories = [], 
  attributes = {},
  minPrice = 20,
  maxPrice = 250
}) => {
  const [filters, setFilters] = useState({
    categories: [],
    priceRange: { min: minPrice, max: maxPrice },
    badge: [],
    attributes: {}
  });

  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);

  // Initialize attributes filters
  useEffect(() => {
    const initialAttributes = {};
    Object.keys(attributes).forEach(key => {
      initialAttributes[key] = [];
    });
    setFilters(prev => ({
      ...prev,
      attributes: initialAttributes,
      priceRange: { min: minPrice, max: maxPrice }
    }));
    setPriceMin(minPrice);
    setPriceMax(maxPrice);
  }, [attributes, minPrice, maxPrice]);

  const handleCategoryToggle = (categoryId) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleBadgeToggle = (badge) => {
    setFilters(prev => ({
      ...prev,
      badge: prev.badge.includes(badge)
        ? prev.badge.filter(b => b !== badge)
        : [...prev.badge, badge]
    }));
  };

  const handleAttributeToggle = (attributeName, value) => {
    setFilters(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeName]: prev.attributes[attributeName]?.includes(value)
          ? prev.attributes[attributeName].filter(v => v !== value)
          : [...(prev.attributes[attributeName] || []), value]
      }
    }));
  };

  const handlePriceChange = () => {
    const min = Math.min(priceMin, priceMax - 1);
    const max = Math.max(priceMax, priceMin + 1);
    setPriceMin(min);
    setPriceMax(max);
    setFilters(prev => ({
      ...prev,
      priceRange: { min, max }
    }));
  };

  const handleClearAll = () => {
    setFilters({
      categories: [],
      priceRange: { min: minPrice, max: maxPrice },
      badge: [],
      attributes: {}
    });
    setPriceMin(minPrice);
    setPriceMax(maxPrice);
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const toggleFilterRow = (e) => {
    const row = e.currentTarget.closest('.filter-row');
    row?.classList.toggle('open');
  };

  useEffect(() => {
    console.log('ProductFilterDrawer - isOpen:', isOpen);
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`filter-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Filter Drawer */}
      <div className={`filter-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="filter-drawer-header">
          <h2 className="filter-drawer-title">Filters</h2>
          <button
            className="filter-close-btn"
            onClick={onClose}
            aria-label="Close filters"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        {/* Filter List */}
        <div className="filter-list">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="filter-row">
              <button className="filter-trigger" onClick={toggleFilterRow}>
                <span className="filter-name">Category</span>
                <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="filter-body">
                <div className="filter-options">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`filter-opt ${filters.categories.includes(cat.id) ? 'selected' : ''}`}
                      onClick={() => handleCategoryToggle(cat.id)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Price Range */}
          <div className="filter-row">
            <button className="filter-trigger" onClick={toggleFilterRow}>
              <span className="filter-name">Price</span>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="filter-body">
              <div className="price-range-wrap">
                <div className="price-labels">
                  <div>₹<span id="minVal">{priceMin}</span></div>
                  <div>₹<span id="maxVal">{priceMax}</span></div>
                </div>
                <div className="range-track">
                  <div
                    className="range-fill"
                    style={{
                      left: `${((priceMin - minPrice) / (maxPrice - minPrice)) * 100}%`,
                      right: `${100 - ((priceMax - minPrice) / (maxPrice - minPrice)) * 100}%`
                    }}
                  />
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    value={priceMin}
                    step="1"
                    onChange={(e) => {
                      setPriceMin(Number(e.target.value));
                      handlePriceChange();
                    }}
                  />
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    value={priceMax}
                    step="1"
                    onChange={(e) => {
                      setPriceMax(Number(e.target.value));
                      handlePriceChange();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="filter-row">
            <button className="filter-trigger" onClick={toggleFilterRow}>
              <span className="filter-name">Badge</span>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="filter-body">
              <div className="filter-options">
                {['none', 'new_arrival', 'hot_selling', 'low_stock'].map(badge => (
                  <button
                    key={badge}
                    className={`filter-opt ${filters.badge.includes(badge) ? 'selected' : ''}`}
                    onClick={() => handleBadgeToggle(badge)}
                  >
                    {badge === 'none' ? 'No Badge' : badge.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Attributes */}
          {Object.entries(attributes).map(([attrName, values]) => (
            values.length > 0 && (
              <div key={attrName} className="filter-row">
                <button className="filter-trigger" onClick={toggleFilterRow}>
                  <span className="filter-name">{attrName.charAt(0).toUpperCase() + attrName.slice(1)}</span>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="filter-body">
                  {attrName.toLowerCase() === 'color' ? (
                    <div className="color-options">
                      {values.map(value => (
                        <button
                          key={value}
                          className={`color-swatch ${
                            filters.attributes[attrName]?.includes(value) ? 'selected' : ''
                          }`}
                          style={{
                            backgroundColor: colorMap[value?.toLowerCase()] || value,
                            border: filters.attributes[attrName]?.includes(value) ? '3px solid #1a1a1a' : '2px solid #ddd'
                          }}
                          onClick={() => handleAttributeToggle(attrName, value)}
                          title={value}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="filter-options">
                      {values.map(value => (
                        <button
                          key={value}
                          className={`filter-opt ${
                            filters.attributes[attrName]?.includes(value) ? 'selected' : ''
                          }`}
                          onClick={() => handleAttributeToggle(attrName, value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Footer */}
        <div className="filter-drawer-footer">
          <button className="btn-clear" onClick={handleClearAll}>
            Clear All
          </button>
          <button className="btn-apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default ProductFilterDrawer;
