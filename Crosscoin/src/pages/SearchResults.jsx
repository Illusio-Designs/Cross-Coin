import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { searchProducts } from '../services/publicApi';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/products/ProductCard';
import Loader from '../components/common/Loader';
import { Pagination } from '../components/ui';
import SeoWrapper from '../console/SeoWrapper';
import { usePagination } from '../hooks/usePagination';

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'newest',     label: 'Newest' },
  { value: 'price:asc',  label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
];

const SearchResults = () => {
  const router = useRouter();
  const { addToCart } = useCart();
  const { query, sort } = router.query;

  const [searchQuery, setSearchQuery] = useState(query || '');
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [sortBy, setSortBy]           = useState(sort || 'featured');
  const [totalProducts, setTotalProducts] = useState(0);

  const itemsPerPage = 20;
  const { currentPage, totalPages, currentItems: paginatedProducts, goToPage } =
    usePagination(products, itemsPerPage);

  const debouncedRef = useRef(null);

  const performSearch = async (term, sortOpt) => {
    if (!term.trim()) { setProducts([]); setTotalProducts(0); return; }
    try {
      setLoading(true); setError(null);
      const res = await searchProducts(term, { page: 1, limit: 1000, sort: sortOpt });
      if (res.success) {
        setProducts(res.data?.products || res.products || []);
        setTotalProducts(res.data?.total || res.total || 0);
      } else {
        setProducts([]); setTotalProducts(0);
        setError(res.message || 'No products found');
      }
    } catch (e) {
      setError(e.message || 'Search failed'); setProducts([]); setTotalProducts(0);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    debouncedRef.current = debounce(performSearch, 300);
  }, []);

  // Initial load from URL
  useEffect(() => {
    if (query) { setSearchQuery(query); performSearch(query, sort || 'featured'); }
  }, [query, sort]);

  useEffect(() => { goToPage(1); }, [searchQuery, sortBy]);

  const sortProducts = (list) => {
    switch (sortBy) {
      case 'price:asc':  return [...list].sort((a,b) => (a.variations?.[0]?.price||0)-(b.variations?.[0]?.price||0));
      case 'price:desc': return [...list].sort((a,b) => (b.variations?.[0]?.price||0)-(a.variations?.[0]?.price||0));
      case 'newest':     return [...list].sort((a,b) => new Date(b.created_at||0)-new Date(a.created_at||0));
      default:           return list;
    }
  };

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearchQuery(v);
    router.push(`/SearchResults?query=${encodeURIComponent(v)}`, undefined, { shallow: true });
    debouncedRef.current?.(v, sortBy);
  };

  const handleSortChange = (v) => {
    setSortBy(v);
    debouncedRef.current?.(searchQuery, v);
  };

  const handleProductClick = (product) => {
    router.push(`/product-test?slug=${encodeURIComponent(product.slug)}`);
  };

  const handleAddToCart = (e, product, color, size, variationId) => {
    e.stopPropagation();
    addToCart(product, color, size, 1, variationId);
  };

  const sorted = sortProducts(products);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <SeoWrapper pageName="search">
      <div className="sr-page">
        {/* Header bar */}
        <div className="sr-topbar">
          <div className="sr-topbar-inner">
            <div className="sr-search-wrap">
              <svg className="sr-search-icon" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="sr-search-input"
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label="Search products"
              />
              {searchQuery && (
                <button className="sr-clear-btn" onClick={() => { setSearchQuery(''); setProducts([]); }} aria-label="Clear search">✕</button>
              )}
            </div>

            <div className="sr-sort-wrap">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`sr-sort-btn${sortBy === o.value ? ' active' : ''}`}
                  onClick={() => handleSortChange(o.value)}
                  type="button"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sr-body">
          {/* Result count */}
          {searchQuery && !loading && (
            <div className="sr-meta">
              {products.length > 0
                ? <><span className="sr-meta-count">{products.length}</span> results for <strong>"{searchQuery}"</strong></>
                : <>No results for <strong>"{searchQuery}"</strong></>
              }
            </div>
          )}

          {loading ? (
            <div className="sr-state"><Loader /><p>Searching…</p></div>
          ) : error && products.length === 0 ? (
            <div className="sr-state">
              <svg width="56" height="56" fill="none" stroke="#ddd" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3>No products found</h3>
              <p>Try different keywords or browse all products</p>
              <button className="sr-browse-btn" onClick={() => router.push('/Products')}>Browse All Products</button>
            </div>
          ) : !searchQuery ? (
            <div className="sr-state">
              <svg width="56" height="56" fill="none" stroke="#ddd" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3>Start searching</h3>
              <p>Type something above to find products</p>
            </div>
          ) : (
            <>
              <div className="sr-grid">
                {paginated.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onProductClick={handleProductClick}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              )}
            </>
          )}
        </div>
      </div>
    </SeoWrapper>
  );
};

export default SearchResults;
