import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getAllPublicProducts } from '../services/publicApi';
import ProductCard from '../components/products/ProductCard';
import { showSuccess, showError } from '../utils/toastNotification';
import SeoWrapper from '../console/SeoWrapper';
import { ConfirmModal } from '../components/common/AlertModal';

const Wishlist = () => {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const router = useRouter();
  const [recos, setRecos] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [activeCat, setActiveCat] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Fetch recommendations on mount
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await getAllPublicProducts({ page: 1, limit: 4 });
        if (response?.data?.products) {
          setRecos(response.data.products.slice(0, 4));
        } else if (Array.isArray(response)) {
          setRecos(response.slice(0, 4));
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
    };
    fetchRecommendations();
  }, []);

  // Sort wishlist items
  const sortWishlist = (items) => {
    const sorted = [...items];
    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.addedAt || 0) - new Date(b.addedAt || 0));
      case 'price-high':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'price-low':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      default:
        return sorted;
    }
  };

  const sortedWishlist = sortWishlist(wishlist);

  const filtered = activeCat === 'all' 
    ? sortedWishlist 
    : sortedWishlist.filter(i => i.category?.name?.toLowerCase() === activeCat.toLowerCase());

  const removeItem = (id) => {
    removeFromWishlist(id);
    showSuccess('removedFromWishlist');
  };

  const handleClearWishlist = () => {
    setConfirmState({ message: 'Are you sure you want to clear your wishlist?', onConfirm: () => {
      setConfirmState(null);
      clearWishlist();
      showSuccess('wishlistCleared');
    }});
  };

  if (wishlist.length === 0) {
    return (
      <SeoWrapper pageName="wishlist">
        <div className="page-header">
          <div className="ph-top">
            <div>
              <div className="ph-eyebrow">My Collection</div>
              <h1 className="ph-title">My Wishlist</h1>
              <div className="ph-count">0 saved items</div>
            </div>
          </div>
        </div>
        <div className="wishlist-main">
          <div className="empty-wishlist">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div className="empty-title">Nothing here yet</div>
            <div className="empty-sub">
              No items in your wishlist.<br />
              Browse our collection and save what you love.
            </div>
            <button className="empty-cta" onClick={() => router.push('/Products')}>Start Shopping</button>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  return (
    <SeoWrapper pageName="wishlist">
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <Head>
        <title>My Wishlist | CrossCoin</title>
      </Head>

      <div className="page-header">
        <div className="ph-top">
          <div>
            <div className="ph-eyebrow">My Collection</div>
            <h1 className="ph-title">My Wishlist</h1>
            <div className="ph-count">{filtered.length} saved item{filtered.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="ph-actions">
            <div className="wishlist-sort">
              <label>Sort by:</label>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>
            </div>
            <button className="ph-btn" onClick={() => showSuccess('wishlistShared')}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share Wishlist
            </button>
            <button className="ph-btn primary" onClick={() => {
              if (filtered.length === 0) {
                showError('noItemsToAdd');
                return;
              }
              filtered.forEach(item => {
                addToCart(item, '', 'M', 1);
                removeFromWishlist(item.id);
              });
              showSuccess('allAddedToCart');
            }}>
              Add All to Bag
            </button>
            <button className="ph-btn" onClick={handleClearWishlist}>
              Clear Wishlist
            </button>
          </div>
        </div>
        <div className="filter-tabs">
          <div className={`ft ${activeCat === 'all' ? 'active' : ''}`} onClick={() => setActiveCat('all')}>
            All Items
          </div>
          {[...new Set(wishlist.map(i => i.category?.name).filter(Boolean))].map(cat => (
            <div 
              key={cat}
              className={`ft ${activeCat === cat ? 'active' : ''}`} 
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      <div className="wishlist-main">
        <div className="wishlist-grid">
          {filtered.length === 0 ? (
            <div className="empty-wishlist">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="empty-title">Nothing here yet</div>
              <div className="empty-sub">
                No items in this category.<br />
                Browse our collection and save what you love.
              </div>
              <button className="empty-cta" onClick={() => router.push('/Products')}>Start Shopping</button>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div key={item.id} style={{ position: 'relative' }}>
                <ProductCard
                  product={item}
                  index={idx}
                  onProductClick={(product) => {
                    if (product.slug) {
                      router.push(`/ProductDetails?slug=${product.slug}`);
                    } else {
                      router.push(`/product/${product.id}`);
                    }
                  }}
                  onAddToCart={(e, product, color, variationId) => {
                    e.stopPropagation();
                    addToCart(product, color || '', 'M', 1, variationId);
                    showSuccess('addedToCart');
                  }}
                />
                <button
                  className="wishlist-remove-btn"
                  onClick={() => removeItem(item.id)}
                  title="Remove from wishlist"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 11,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.9)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="reco-section">
        <div>
          <div className="reco-header">
            <div>
              <div className="reco-eyebrow">You May Also Like</div>
              <h2 className="reco-title">Recommended For You</h2>
            </div>
            <button className="reco-browse-all" onClick={() => router.push('/Products')}>
              Browse All
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <div className="reco-grid">
            {recos.map((reco, idx) => (
              <ProductCard
                key={reco.id}
                product={reco}
                index={idx}
                onProductClick={(product) => {
                  if (product.slug) {
                    router.push(`/ProductDetails?slug=${product.slug}`);
                  } else {
                    router.push(`/product/${product.id}`);
                  }
                }}
                onAddToCart={(e, product, color, variationId) => {
                  e.stopPropagation();
                  addToCart(product, color || '', 'M', 1, variationId);
                  showSuccess('addedToCart');
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default Wishlist;

