"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiFilter, FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from '../context/CartContext';
import ProductCard, { filterOptions } from "../components/ProductCard";
import { getAllPublicProducts, getPublicCategories } from "../services/publicindex";
import SeoWrapper from '../console/SeoWrapper';
import { fbqTrack } from '../components/common/Analytics';

const Products = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([20, 250]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState([]);
  const [showCategory, setShowCategory] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // Debug logs
  console.log('Products Component State:', {
    selectedCategory,
    sortBy,
    priceRange,
    currentPage,
    totalPages,
    loading,
    error
  });

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getPublicCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // On mount, check for category in query params
  useEffect(() => {
    const categoryFromQuery = searchParams.get('category');
    if (categoryFromQuery) {
      setSelectedCategory([categoryFromQuery]);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, sortBy, selectedCategory]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 500);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching products with params:', {
        page: currentPage,
        limit: 20,
        sort: sortBy,
        category: selectedCategory.length > 0 ? selectedCategory.join(',') : undefined
      });

      const params = {
        page: currentPage,
        limit: 20,
        sort: sortBy,
        category: selectedCategory.length > 0 ? selectedCategory.join(',') : undefined
      };

      const response = await getAllPublicProducts(params);
      console.log('API Response:', response);

      if (response?.success) {
        setProducts(response.data?.products || []);
        setTotalPages(response.data?.totalPages || 1);
        setTotalProducts(response.data?.totalProducts || 0);
      } else {
        console.error('API Error Response:', response);
        setError(response?.message || 'Failed to fetch products');
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err?.response?.data?.message || err?.message || 'An error occurred while fetching products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    console.log('Filter Change:', { filterType, value });
    switch (filterType) {
      case 'price':
        setPriceRange(value);
        break;
      case 'color':
        setSelectedColors(prev => prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]);
        break;
      case 'size':
        setSelectedSizes(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]);
        break;
      case 'gender':
        setSelectedGender(prev => prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]);
        break;
      case 'material':
        setSelectedMaterial(prev => prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]);
        break;
      case 'category':
        setSelectedCategory(prev => prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]);
        break;
      default:
        break;
    }
  };

  const handleProductClick = (product) => {
    console.log('Product Click:', product);
    router.push(`/ProductDetails?slug=${product.slug}`);
  };

  const handleAddToCart = (e, product, color, size, variationId) => {
    e.stopPropagation();
    addToCart(product, color, size, 1, variationId);
    fbqTrack('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
      quantity: 1,
    });
  };

  // Get category name by ID for display
  const getCategoryNameById = (categoryId) => {
    const category = categories.find(cat => cat.id.toString() === categoryId.toString());
    return category ? category.name : categoryId;
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedGender([]);
    setSelectedMaterial([]);
    setPriceRange([20, 250]);
    setCurrentPage(1);
    // Clear URL parameters
    router.push('/Products');
  };

  // Check if any filters are active
  const hasActiveFilters = selectedCategory.length > 0 || 
                          selectedColors.length > 0 || 
                          selectedSizes.length > 0 || 
                          selectedGender.length > 0 || 
                          selectedMaterial.length > 0 ||
                          priceRange[0] !== 20 || 
                          priceRange[1] !== 250;

  return (
    <SeoWrapper pageName="products">
      <Header />
      <div className="products-page">
        <div className="products-header">
          <h1>
            {selectedCategory.length > 0 
              ? `Products - ${getCategoryNameById(selectedCategory[0])}`
              : 'Our Products'
            }
          </h1>
          <div className="products-controls">
            {hasActiveFilters && (
              <button 
                className="clear-filters-btn"
                onClick={clearAllFilters}
              >
                Clear Filters
              </button>
            )}
            <button 
              className={`filter-toggle${isMobile ? ' mobile-fixed' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter /> Filters
            </button>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        <div className="products-container">
          {/* Desktop Sidebar */}
          {!isMobile && showFilters && (
            <div className="filters-sidebar">
              <div className="filter-section">
                <h3 onClick={() => setShowCategory(!showCategory)} className={`clickable-heading ${showCategory ? 'open' : ''}`}>
                  Product Category <FiChevronDown className={`arrow-icon ${showCategory ? 'open' : ''}`} />
                </h3>
                {showCategory && (
                  <div className="category-list">
                    {categories.map((category) => (
                      <label key={category.id} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={selectedCategory.includes(category.id.toString())}
                            onChange={() => handleFilterChange('category', category.id.toString())}
                          />
                          <p>{category.name}</p> 
                        </div>
                        <span>[{category.productCount || 0}]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowMaterial(!showMaterial)} className={`clickable-heading ${showMaterial ? 'open' : ''}`}>
                  Material <FiChevronDown className={`arrow-icon ${showMaterial ? 'open' : ''}`} />
                </h3>
                {showMaterial && (
                  <div className="material-list">
                    {filterOptions.materials.map((material) => (
                      <label key={material} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={selectedMaterial.includes(material)}
                            onChange={() => handleFilterChange('material', material)}
                          />
                          <p>{material}</p> 
                        </div>
                        <span>[20]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowPrice(!showPrice)} className={`clickable-heading ${showPrice ? 'open' : ''}`}>
                  By Price <FiChevronDown className={`arrow-icon ${showPrice ? 'open' : ''}`} />
                </h3>
                {showPrice && (
                  <div className="price-range">
                    <input
                      type="range"
                      min="20"
                      max="250"
                      value={priceRange[0]}
                      onChange={(e) => handleFilterChange('price', [e.target.value, priceRange[1]])}
                    />
                    <input
                      type="range"
                      min="20"
                      max="250"
                      value={priceRange[1]}
                      onChange={(e) => handleFilterChange('price', [priceRange[0], e.target.value])}
                    />
                    <div className="price-inputs">
                      <span>${priceRange[0]}</span> - <span>${priceRange[1]}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowColors(!showColors)} className={`clickable-heading ${showColors ? 'open' : ''}`}>
                  Colors <FiChevronDown className={`arrow-icon ${showColors ? 'open' : ''}`} />
                </h3>
                {showColors && (
                  <div className="color-options">
                    {filterOptions.colors.map(color => (
                      <button
                        key={color}
                        className={`color-btn ${selectedColors.includes(color) ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={(e) => handleFilterChange('color', color)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowSizes(!showSizes)} className={`clickable-heading ${showSizes ? 'open' : ''}`}>
                  Size <FiChevronDown className={`arrow-icon ${showSizes ? 'open' : ''}`} />
                </h3>
                {showSizes && (
                  <div className="size-options">
                    {filterOptions.sizes.map(size => (
                      <label key={size} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={selectedSizes.includes(size)}
                            onChange={() => handleFilterChange('size', size)}
                          />
                          <p>{size} </p>
                        </div>
                        <span>[20]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowGender(!showGender)} className={`clickable-heading ${showGender ? 'open' : ''}`}>
                  Gender <FiChevronDown className={`arrow-icon ${showGender ? 'open' : ''}`} />
                </h3>
                {showGender && (
                  <div className="gender-options">
                    {filterOptions.genders.map(gender => (
                      <label key={gender} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={selectedGender.includes(gender)}
                            onChange={() => handleFilterChange('gender', gender)}
                          />
                          <p>{gender} </p>
                        </div>
                        <span>[20]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Mobile Modal */}
          {isMobile && showFilters && (
            <div className="mobile-filter-modal-overlay">
              <div className="mobile-filter-modal">
                <div className="mobile-filter-modal-header">
                  <span className="modal-title">F I L T E R S</span>
                  <button className="modal-close" onClick={() => setShowFilters(false)}>&times;</button>
                  <button className="modal-clear" onClick={clearAllFilters}>Clear All</button>
                </div>
                <div className="mobile-filter-modal-body">
                  {/* Product Category */}
                  <div className="modal-filter-section">
                    <div className="modal-filter-label" onClick={() => setShowCategory(!showCategory)}>
                      Product Category <FiChevronDown className={`arrow-icon ${showCategory ? 'open' : ''}`} />
                    </div>
                    {showCategory && (
                      <div className="category-list">
                        {categories.map((category) => (
                          <label key={category.id} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={selectedCategory.includes(category.id.toString())}
                                onChange={() => handleFilterChange('category', category.id.toString())}
                              />
                              <p>{category.name}</p> 
                            </div>
                            <span>[{category.productCount || 0}]</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Material */}
                  <div className="modal-filter-section">
                    <div className="modal-filter-label" onClick={() => setShowMaterial(!showMaterial)}>
                      Material <FiChevronDown className={`arrow-icon ${showMaterial ? 'open' : ''}`} />
                    </div>
                    {showMaterial && (
                      <div className="material-list">
                        {filterOptions.materials.map((material) => (
                          <label key={material} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={selectedMaterial.includes(material)}
                                onChange={() => handleFilterChange('material', material)}
                              />
                              <p>{material}</p> 
                            </div>
                            <span>[20]</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* By Price */}
                  <div className="modal-filter-section">
                    <div className="modal-filter-label" onClick={() => setShowPrice(!showPrice)}>
                      By Price <FiChevronDown className={`arrow-icon ${showPrice ? 'open' : ''}`} />
                    </div>
                    {showPrice && (
                      <div className="price-range">
                        <input
                          type="range"
                          min="20"
                          max="250"
                          value={priceRange[0]}
                          onChange={(e) => handleFilterChange('price', [e.target.value, priceRange[1]])}
                        />
                        <input
                          type="range"
                          min="20"
                          max="250"
                          value={priceRange[1]}
                          onChange={(e) => handleFilterChange('price', [priceRange[0], e.target.value])}
                        />
                        <div className="price-inputs">
                          <span>${priceRange[0]}</span> - <span>${priceRange[1]}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Colors */}
                  <div className="modal-filter-section">
                    <div className="modal-filter-label" onClick={() => setShowColors(!showColors)}>
                      Colors <FiChevronDown className={`arrow-icon ${showColors ? 'open' : ''}`} />
                    </div>
                    {showColors && (
                      <div className="color-options">
                        {filterOptions.colors.map(color => (
                          <button
                            key={color}
                            className={`color-btn ${selectedColors.includes(color) ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleFilterChange('color', color)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Size */}
                  <div className="modal-filter-section">
                    <div className="modal-filter-label" onClick={() => setShowSizes(!showSizes)}>
                      Size <FiChevronDown className={`arrow-icon ${showSizes ? 'open' : ''}`} />
                    </div>
                    {showSizes && (
                      <div className="size-options">
                        {filterOptions.sizes.map(size => (
                          <label key={size} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={selectedSizes.includes(size)}
                                onChange={() => handleFilterChange('size', size)}
                              />
                              <p>{size} </p>
                            </div>
                            <span>[20]</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Gender */}
                  <div className="modal-filter-section">
                    <div className="modal-filter-label" onClick={() => setShowGender(!showGender)}>
                      Gender <FiChevronDown className={`arrow-icon ${showGender ? 'open' : ''}`} />
                    </div>
                    {showGender && (
                      <div className="gender-options">
                        {filterOptions.genders.map(gender => (
                          <label key={gender} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={selectedGender.includes(gender)}
                                onChange={() => handleFilterChange('gender', gender)}
                              />
                              <p>{gender} </p>
                            </div>
                            <span>[20]</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="product-listing">
            <div className="products-grid">
              {loading ? (
                <div className="loading">Loading products...</div>
              ) : error ? (
                <div className="error">{error}</div>
              ) : products.length === 0 ? (
                <div className="no-products">
                  {selectedCategory.length > 0 
                    ? `No products available in "${getCategoryNameById(selectedCategory[0])}" category. Try selecting a different category or clearing filters.`
                    : 'No products found matching your criteria. Try adjusting your filters.'
                  }
                </div>
              ) : (
                products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onProductClick={handleProductClick}
                    onAddToCart={handleAddToCart}
                  />
                ))
              )}
            </div>

            {totalProducts > 20 && totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft />
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </SeoWrapper>
  );
};

export default Products; 