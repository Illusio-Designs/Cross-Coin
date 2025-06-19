"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiFilter, FiChevronDown } from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from '../context/CartContext';
import ProductCard, { filterOptions } from "../components/ProductCard";
import { getAllPublicProducts } from "../services/publicindex";
import SeoWrapper from '../console/SeoWrapper';

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

  // On mount, check for category in query params
  useEffect(() => {
    const categoryFromQuery = searchParams.get('category');
    if (categoryFromQuery) {
      setSelectedCategory([categoryFromQuery]);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, sortBy, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching products with params:', {
        page: currentPage,
        limit: 12,
        sort: sortBy,
        category: selectedCategory.length > 0 ? selectedCategory.join(',') : undefined
      });

      const params = {
        page: currentPage,
        limit: 12,
        sort: sortBy,
        category: selectedCategory.length > 0 ? selectedCategory.join(',') : undefined
      };

      const response = await getAllPublicProducts(params);
      console.log('API Response:', response);

      if (response?.success) {
        setProducts(response.data?.products || []);
        setTotalPages(response.data?.totalPages || 1);
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

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    console.log('Add to Cart:', product);
    const variation = product.variations?.[0];
    if (variation) {
      addToCart(product, variation.id, 1);
    }
  };

  return (
    <SeoWrapper pageName="products">
      <Header />
      <div className="products-page">
        <div className="products-header">
          <h1>Our Products</h1>
          <div className="products-controls">
            <button 
              className="filter-toggle"
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
          {showFilters && (
            <div className="filters-sidebar">
              <div className="filter-section">
                <h3 onClick={() => setShowCategory(!showCategory)} className={`clickable-heading ${showCategory ? 'open' : ''}`}>
                  Product Category <FiChevronDown className={`arrow-icon ${showCategory ? 'open' : ''}`} />
                </h3>
                {showCategory && (
                  <div className="category-list">
                    {filterOptions.categories.map((category) => (
                      <label key={category} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={selectedCategory.includes(category)}
                            onChange={() => handleFilterChange('category', category)}
                          />
                          <p>{category}</p> 
                        </div>
                        <span>[20]</span>
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

          <div className="products-grid">
            {loading ? (
              <div className="loading">Loading products...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : products.length === 0 ? (
              <div className="no-products">{selectedCategory.length > 0 ? 'No products available in this category.' : 'No products found'}</div>
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

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </SeoWrapper>
  );
};

export default Products; 