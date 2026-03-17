import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import SafeImage from '../components/common/SafeImage';
import { getAllPublicProducts } from '../services/publicApi';

const WishlistTest = () => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [recos, setRecos] = useState([]);

  const [selectedSizes, setSelectedSizes] = useState({});
  const [currentView, setCurrentView] = useState('grid');
  const [activeCat, setActiveCat] = useState('all');
  const [toast, setToast] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

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
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

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

  // Get color dots from product variations
  const getColorDots = (product) => {
    const colors = new Set();
    if (product.variations) {
      product.variations.forEach(v => {
        if (v.attributes?.color) {
          const colorArray = Array.isArray(v.attributes.color) ? v.attributes.color : [v.attributes.color];
          colorArray.forEach(c => colors.add(c));
        }
      });
    }
    return Array.from(colors).slice(0, 4);
  };

  // Get image URL
  const getImageUrl = (product) => {
    if (product.variationImages && product.variationImages.length > 0) {
      return product.variationImages[0];
    }
    if (Array.isArray(product.images) && product.images.length > 0) {
      const primary = product.images.find(img => img.is_primary);
      return primary ? primary.image_url : product.images[0].image_url;
    }
    return product.image || null;
  };

  const filtered = activeCat === 'all' 
    ? sortedWishlist 
    : sortedWishlist.filter(i => i.category?.name?.toLowerCase() === activeCat.toLowerCase());

  const removeItem = (id) => {
    removeFromWishlist(id);
    showToast('Removed from wishlist');
  };

  const selectSize = (id, size) => {
    setSelectedSizes({ ...selectedSizes, [id]: size });
  };

  const addToCartHandler = (product) => {
    if (!selectedSizes[product.id]) {
      showToast('Please select a size first');
      return;
    }
    const color = product.selectedVariation?.attributes?.color?.join(', ') || '';
    const size = selectedSizes[product.id];
    addToCart(product, color, size, 1, product.selectedVariation?.id);
    showToast('✓ Added to bag!');
  };

  const addAllToCart = () => {
    if (filtered.length === 0) {
      showToast('No items to add');
      return;
    }
    filtered.forEach(item => {
      if (selectedSizes[item.id]) {
        const color = item.selectedVariation?.attributes?.color?.join(', ') || '';
        addToCart(item, color, selectedSizes[item.id], 1, item.selectedVariation?.id);
      }
    });
    showToast('✓ All items added to bag!');
  };

  const shareWishlist = () => {
    showToast('🔗 Wishlist link copied!');
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
            <button className="ph-btn" onClick={shareWishlist}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share Wishlist
            </button>
            <button className="ph-btn primary" onClick={addAllToCart}>
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
        <div className="sort-bar">
          <div className="sb-left">
            <span className="sb-label">Sort by:</span>
            <select 
              className="sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">Recently Added</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          <div className="view-toggle">
            <button 
              className={`vt-btn ${currentView === 'grid' ? 'active' : ''}`} 
              onClick={() => setCurrentView('grid')}
            >
              <svg fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button 
              className={`vt-btn ${currentView === 'list' ? 'active' : ''}`} 
              onClick={() => setCurrentView('list')}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`wishlist-grid ${currentView === 'list' ? 'list-view' : ''}`}>
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
            filtered.map(item => {
              const dis = item.comparePrice > item.price ? Math.round((item.comparePrice - item.price) / item.comparePrice * 100) : 0;
              const imageUrl = getImageUrl(item);
              const colorDots = getColorDots(item);
              const sizes = item.variations?.[0]?.attributes?.size || ['S', 'M', 'L', 'XL'];
              
              return (
                <div key={item.id} className="wl-card" data-cat={item.category?.name}>
                  <div className="wl-card-img">
                    {item.badge && item.badge !== 'none' && (
                      <div className={`card-badge badge-${item.badge}`}>
                        {item.badge === 'new_arrival' ? 'NEW' : item.badge.toUpperCase()}
                      </div>
                    )}
                    <button 
                      className="remove-btn" 
                      onClick={() => removeItem(item.id)} 
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    {imageUrl && (
                      <SafeImage
                        imageData={{ image_url: imageUrl }}
                        alt={item.name}
                        width={400}
                        height={400}
                        quality={75}
                        style={{ objectFit: 'cover' }}
                        isProductCard={true}
                      />
                    )}
                  </div>
                  <div className="wl-card-body">
                    <div className="wc-brand">{item.brands?.[0]?.name || 'CrossCoin'}</div>
                    <div className="wc-name">{item.name}</div>
                    <div className="wc-colors">
                      {colorDots.map((color, idx) => (
                        <div key={idx} className="wc-dot" style={{ background: color }} />
                      ))}
                    </div>
                    <div className="wc-price-row">
                      <span className="wc-price">₹{item.price}</span>
                      {dis > 0 && (
                        <>
                          <span className="wc-mrp">₹{item.comparePrice}</span>
                          <span className="wc-off">{dis}% off</span>
                        </>
                      )}
                    </div>
                    <div className="wc-size-row">
                      {(Array.isArray(sizes) ? sizes : [sizes]).map(size => (
                        <button
                          key={size}
                          className={`wc-size ${selectedSizes[item.id] === size ? 'selected' : ''}`}
                          onClick={() => selectSize(item.id, size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <div className="wc-actions">
                      <button 
                        className="btn-atb" 
                        onClick={() => addToCartHandler(item)}
                      >
                        Add to Bag
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
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
          <div className="see-all">
            Browse All
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
        <div className="reco-grid">
          {recos.map((reco, idx) => {
            const imageUrl = getImageUrl(reco);
            return (
              <div key={idx} className="reco-card">
                <div className="reco-img">
                  {imageUrl && (
                    <SafeImage
                      imageData={{ image_url: imageUrl }}
                      alt={reco.name}
                      width={300}
                      height={300}
                      quality={75}
                      style={{ objectFit: 'cover' }}
                      isProductCard={true}
                    />
                  )}
                  <button className="reco-add" onClick={() => {
                    addToCart(reco, '', 'M', 1);
                    showToast('Added to bag!');
                  }}>
                    Add to Bag
                  </button>
                  <button className="reco-wl" onClick={() => showToast('❤️ Saved to wishlist')}>
                    <svg viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
                <div className="reco-name">{reco.name}</div>
                <div className="reco-price">₹{reco.price}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast ? 'show' : ''}`}>
        {toast}
      </div>
    </>
  );
};

export default WishlistTest;
