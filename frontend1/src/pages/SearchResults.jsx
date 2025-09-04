import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { searchProducts } from '../services/publicindex';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import '../styles/pages/SearchResults.css';

const SearchResults = () => {
  const router = useRouter();
  const { query, category, sort } = router.query;
  const [searchQuery, setSearchQuery] = useState(query || '');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState(sort || 'featured');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 20;

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchTerm, categoryFilter, sortOption) => {
      if (!searchTerm.trim()) {
        setProducts([]);
        setTotalProducts(0);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          sort: sortOption,
          category: categoryFilter
        };

        const response = await searchProducts(searchTerm, params);
        
        if (response.success) {
          setProducts(response.data?.products || response.products || []);
          setTotalProducts(response.data?.total || response.total || 0);
        } else {
          setProducts([]);
          setTotalProducts(0);
          setError(response.message || 'No products found');
        }
      } catch (err) {
        console.error('Search error:', err);
        setError(err.message || 'Failed to search products');
        setProducts([]);
        setTotalProducts(0);
      } finally {
        setLoading(false);
      }
    }, 500),
    [currentPage]
  );

  // Update URL when search parameters change
  const updateURL = (newQuery, newCategory, newSort) => {
    const params = new URLSearchParams();
    if (newQuery) params.set('query', newQuery);
    if (newCategory) params.set('category', newCategory);
    if (newSort && newSort !== 'featured') params.set('sort', newSort);
    
    const newURL = `/SearchResults?${params.toString()}`;
    router.push(newURL, undefined, { shallow: true });
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1);
    updateURL(value, selectedCategory, sortBy);
    debouncedSearch(value, selectedCategory, sortBy);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortBy(value);
    setCurrentPage(1);
    updateURL(searchQuery, selectedCategory, value);
    debouncedSearch(searchQuery, selectedCategory, value);
  };

  // Handle category filter
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setSelectedCategory(value);
    setCurrentPage(1);
    updateURL(searchQuery, value, sortBy);
    debouncedSearch(searchQuery, value, sortBy);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setProducts([]);
    setTotalProducts(0);
    setError(null);
    router.push('/Products');
  };

  // Initial search when component mounts or query changes
  useEffect(() => {
    if (query && query !== searchQuery) {
      setSearchQuery(query);
      debouncedSearch(query, category, sort);
    }
  }, [query, category, sort]);

  // Simple debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <div className="search-results-page">
      <Header />
      
      <div className="search-results-container">
        <div className="search-results-header">
          <h1>Search Results</h1>
          {searchQuery && (
            <p className="search-query">
              Showing results for: <strong>"{searchQuery}"</strong>
              {totalProducts > 0 && (
                <span className="results-count"> ({totalProducts} products found)</span>
              )}
            </p>
          )}
        </div>

        <div className="search-controls">
          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={clearSearch}>
                Clear
              </button>
            )}
          </div>

          <div className="search-filters">
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="filter-select"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price:asc">Price: Low to High</option>
              <option value="price:desc">Price: High to Low</option>
            </select>

            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="filter-select"
            >
              <option value="">All Categories</option>
              <option value="1">Ankle Socks</option>
              <option value="2">Crew Socks</option>
              <option value="3">No-Show Socks</option>
              <option value="4">Athletic Socks</option>
            </select>
          </div>
        </div>

        <div className="search-results-content">
          {loading ? (
            <div className="loading-container">
              <Loader />
              <p>Searching products...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <h3>No products found</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={() => debouncedSearch(searchQuery, selectedCategory, sortBy)}>
                Try Again
              </button>
            </div>
          ) : products.length === 0 && searchQuery ? (
            <div className="no-results">
              <h3>No products found for "{searchQuery}"</h3>
              <p>Try adjusting your search terms or filters</p>
              <button className="retry-btn" onClick={clearSearch}>
                Browse All Products
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {totalProducts > itemsPerPage && (
          <div className="pagination-container">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => prev - 1);
                debouncedSearch(searchQuery, selectedCategory, sortBy);
              }}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {Math.ceil(totalProducts / itemsPerPage)}
            </span>
            <button
              className="pagination-btn"
              disabled={currentPage >= Math.ceil(totalProducts / itemsPerPage)}
              onClick={() => {
                setCurrentPage(prev => prev + 1);
                debouncedSearch(searchQuery, selectedCategory, sortBy);
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default SearchResults;
