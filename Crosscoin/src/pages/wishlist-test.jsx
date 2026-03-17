import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getAllPublicProducts } from '../services/publicApi';
import ProductCard from '../components/ProductCard';
import { toast } from 'react-toastify';

const WishlistTest = () => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const router = useRouter();
  const [recos, setRecos] = useState([]);

  const [activeCat, setActiveCat] = useState('all');

  // Fetch recommendations on mount
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await getAllPublicProducts({ page: 1, limit: 5 });
        if (response?.data?.products) {
          setRecos(response.data.products.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
    };
    fetchRecommendations();
  }, []);

  const showToast = (msg) => {
    toast.info(msg, { position: 'top-right', autoClose: 2200 });
  };

  // Sort wishlist items
  const sortWishlist = (items) => {
    const sorted = [...items];
    return sorted.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
  };

  const sortedWishlist = sortWishlist(wishlist);

  const filtered = activeCat === 'all' 
    ? sortedWishlist 
    : sortedWishlist.filter(i => i.category?.name?.toLowerCase() === activeCat.toLowerCase());

  const removeItem = (id) => {
    removeFromWishlist(id);
    showToast('Removed from wishlist');
  };

  return (
    <>
      <Head>
        <title>My Wishlist | CrossCoin</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="page-header">
        <div className="ph-top">
          <div>
            <div className="ph-eyebrow">My Collection</div>
            <h1 className="ph-title">My Wishlist</h1>
            <div className="ph-count">{filtered.length} saved item{filtered.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="ph-actions">
            <button className="ph-btn" onClick={() => showToast('🔗 Wishlist link copied!')}>
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
                showToast('No items to add');
                return;
              }
              filtered.forEach(item => {
                addToCart(item, '', 'M', 1);
              });
              showToast('✓ All items added to bag!');
            }}>
              Add All to Bag
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
              <button className="empty-cta">Start Shopping</button>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <ProductCard
                key={item.id}
                product={item}
                index={idx}
                onProductClick={(product) => router.push(`/product/${product.id}`)}
                onAddToCart={(e, product, color, size, variationId) => {
                  e.stopPropagation();
                  addToCart(product, color || '', 'M', 1, variationId);
                  showToast('✓ Added to bag!');
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="reco-section">
        <div className="reco-header">
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '5px' }}>
              You May Also Like
            </div>
            <div className="reco-title">Recommended For You</div>
          </div>
          <div className="see-all" onClick={() => router.push('/products')}>
            Browse All
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
        <div className="reco-grid">
          {recos.map((reco, idx) => (
            <ProductCard
              key={reco.id}
              product={reco}
              index={idx}
              onProductClick={(product) => router.push(`/product/${product.id}`)}
              onAddToCart={(e, product, color, size, variationId) => {
                e.stopPropagation();
                addToCart(product, color || '', 'M', 1, variationId);
                showToast('✓ Added to bag!');
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default WishlistTest;
