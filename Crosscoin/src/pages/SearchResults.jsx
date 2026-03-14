import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { searchProducts } from '../services/publicApi';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import { Pagination } from '../components/ui';
import SeoWrapper from '../console/SeoWrapper';
import { usePagination } from '../hooks/usePagination';
import '../styles/pages/SearchResults.css';
import '../styles/common/TableControls.css';

// ✅ Debounce function moved outside component to prevent recreation
function createDebouncedSearch(func, wait) {
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

const SearchResults = () => {
  const router = useRouter();
  const { query, category, sort } = router.query;
  const [searchQuery, setSearchQuery] = useState(query || '');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState(sort || 'featured');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 20;

  // Use pagination hook instead of manual state management
  const { 
    currentPage, 
    totalPages, 
    currentItems: paginatedProducts, 
    goToPage 
  } = usePagination(products, itemsPerPage);

  // ✅ Use ref to store debounced function (created once)
  const debouncedSearchRef = useRef(null);

  // Create debounced search function once on mount
  useEffect(() => {
    const performSearch = async (searchTerm, categoryFilter, sortOption) => {
      if (!searchTerm.trim()) {
        setProducts([]);
        setTotalProducts(0);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const params = {
          page: 1,
          limit: 1000,
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
        setError(err.message || 'Failed to search products');
        setProducts([]);
        setTotalProducts(0);
      } finally {
        setLoading(false);
      }
    };

    // Create debounced version once
    debouncedSearchRef.current = createDebouncedSearch(performSearch, 300);
  }, []);

  // Update URL when search parameters change
  const updateURL = (newQuery, newCategory, newSort) => {
    const params = new URLSearchParams();
    if (newQuery) params.set('query', newQuery);
    if (newCategory) params.set('category', newCategory);
    if (newSort && newSort !== 'featured') params.set('sort', newSort);
    
    const newURL = `/SearchResults?${params.toString()}`;
    router.push(newURL, undefined, { shallow: true });
  };

  // Sort products function
  const sortProducts = (products) => {
    switch (sortBy) {
      case "price:asc":
        return [...products].sort((a, b) => (a.variations?.[0]?.price || 0) - (b.variations?.[0]?.price || 0));
      case "price:desc":
        return [...products].sort((a, b) => (b.variations?.[0]?.price || 0) - (a.variations?.[0]?.price || 0));
      case "newest":
        return [...products].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      case "featured":
      default:
        return products; // Default order
    }
  };

  // Get sorted products
  const sortedProducts = sortProducts(products);

  // Reset to page 1 when search parameters change
  useEffect(() => {
    goToPage(1);
  }, [searchQuery, selectedCategory, sortBy, goToPage]);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    updateURL(value, selectedCategory, sortBy);
    // ✅ Use debounced function from ref
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current(value, selectedCategory, sortBy);
    }
  };

  // Handle sort change
  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortBy(value);
    updateURL(searchQuery, selectedCategory, value);
    // ✅ Use debounced function from ref
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current(searchQuery, selectedCategory, value);
    }
  };

  // Handle category filter
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setSelectedCategory(value);
    updateURL(searchQuery, value, sortBy);
    // ✅ Use debounced function from ref
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current(searchQuery, value, sortBy);
    }
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
    if (query) {
      setSearchQuery(query);
      // Trigger search immediately on mount
      const searchTerm = query;
      const categoryFilter = category || '';
      const sortOption = sort || 'featured';
      
      if (searchTerm.trim()) {
        setLoading(true);
        setError(null);
        
        // Fetch all products for client-side pagination
        const params = {
          page: 1,
          limit: 1000, // Fetch all products for client-side filtering
          sort: sortOption,
          category: categoryFilter
        };

        searchProducts(searchTerm, params)
          .then(response => {
            if (response.success) {
              setProducts(response.data?.products || response.products || []);
              setTotalProducts(response.data?.total || response.total || 0);
            } else {
              setProducts([]);
              setTotalProducts(0);
              setError(response.message || 'No products found');
            }
          })
          .catch(err => {
            setError(err.message || 'Failed to search products');
            setProducts([]);
            setTotalProducts(0);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [query, category, sort]);

  return (
    <SeoWrapper pageName="search">
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
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {products.length > itemsPerPage && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        )}
      </div>

        <Footer />
      </div>
    </SeoWrapper>
  );
};

export default SearchResults;
