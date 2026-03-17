import React, { useState } from 'react';
import Head from 'next/head';
import '../styles/pages/wishlist-test.css';

const WishlistTest = () => {
  const [items, setItems] = useState([
    {
      id: 1,
      brand: 'Jockey',
      name: 'Tactel Microfiber Elastane Stretch Solid Trunk - Black',
      price: 629,
      mrp: 729,
      colors: ['#111', '#1e3a6e', '#2e7d7d'],
      sizes: ['S', 'M', 'L', 'XL'],
      cat: 'innerwear',
      badge: '',
      img: 'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=420',
    },
    {
      id: 2,
      brand: 'Jockey',
      name: 'Microfiber Thermal Socks StayWarm Technology - Black',
      price: 229,
      mrp: 299,
      colors: ['#111', '#555'],
      sizes: ['Free Size'],
      cat: 'socks',
      badge: 'sale',
      img: 'https://www.jockey.in/cdn/shop/files/7150_BLACK_0110_S126_Jky_0.webp?v=1764578239&width=420',
    },
    {
      id: 3,
      brand: 'Jockey',
      name: 'Cotton Stretch Solid Brief with Natural StayFresh Properties - Red',
      price: 349,
      mrp: 399,
      colors: ['#c0392b', '#1e3a6e', '#111'],
      sizes: ['S', 'M', 'L', 'XL'],
      cat: 'innerwear',
      badge: 'new',
      img: 'https://www.jockey.in/cdn/shop/products/IC08_TRED_0104_S123_JKY_1.webp?v=1700008547&width=420',
    },
    {
      id: 4,
      brand: 'Jockey',
      name: '100% Cotton Solid Brief - Pack of 2 with StayFresh Properties',
      price: 449,
      mrp: 598,
      colors: ['#111', '#888'],
      sizes: ['M', 'L', 'XL'],
      cat: 'innerwear',
      badge: 'sale',
      img: 'https://www.jockey.in/cdn/shop/products/8001_ASSORTED_0104_S123_JKY_1.webp?v=1700038400&width=420',
    },
    {
      id: 5,
      brand: 'Jockey',
      name: 'Modal Stretch Solid Brief with Natural Crosshatch Texture - Olive',
      price: 479,
      mrp: 499,
      colors: ['#6b7c3a', '#111', '#5c3a1a'],
      sizes: ['S', 'M', 'L'],
      cat: 'innerwear',
      badge: 'new',
      img: 'https://www.jockey.in/cdn/shop/products/IC18_OLIVE_0104_S123_JKY_1.webp?v=1700009463&width=420',
    },
    {
      id: 6,
      brand: 'Jockey',
      name: 'Tactel Nylon Elastane Printed Brief with Moisture Move Properties - Teal',
      price: 629,
      mrp: 729,
      colors: ['#2e7d7d', '#1a5cba'],
      sizes: ['S', 'M', 'L', 'XL'],
      cat: 'men',
      badge: '',
      img: 'https://www.jockey.in/cdn/shop/products/IC31_TEAL_0105_S123_JKY_1.webp?v=1700015907&width=420',
    },
  ]);

  const recos = [
    {
      name: 'Tactel Microfiber Brief - Ebony',
      price: 579,
      img: 'https://www.jockey.in/cdn/shop/products/IC29_EGEPR_0105_S123_JKY_5.webp?v=1700015337&width=420',
    },
    {
      name: 'Cotton Solid Brief - Navy',
      price: 279,
      img: 'https://www.jockey.in/cdn/shop/products/IC23_WHITE_0104_S123_JKY_1.webp?v=1700010516&width=420',
    },
    {
      name: 'Trunk Pack of 2 - Black',
      price: 1199,
      img: 'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_2.webp?v=1700008414&width=420',
    },
    {
      name: 'Cotton Brief - Royal Blue',
      price: 329,
      img: 'https://www.jockey.in/cdn/shop/products/IC14_NBPR_0104_S123_JKY_1.webp?v=1700009803&width=420',
    },
    {
      name: 'Microfiber Trunk - Forest Night',
      price: 629,
      img: 'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_4.webp?v=1700008414&width=420',
    },
  ];

  const [selectedSizes, setSelectedSizes] = useState({});
  const [currentView, setCurrentView] = useState('grid');
  const [activeCat, setActiveCat] = useState('all');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const filtered = activeCat === 'all' 
    ? items 
    : activeCat === 'sale' 
    ? items.filter(i => i.badge === 'sale') 
    : items.filter(i => i.cat === activeCat);

  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
    showToast('Removed from wishlist');
  };

  const selectSize = (id, size) => {
    setSelectedSizes({ ...selectedSizes, [id]: size });
  };

  const addToCart = (id) => {
    if (!selectedSizes[id]) {
      showToast('Please select a size first');
      return;
    }
    showToast('✓ Added to bag!');
  };

  const addAllToCart = () => {
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
          <div className={`ft ${activeCat === 'men' ? 'active' : ''}`} onClick={() => setActiveCat('men')}>
            Men
          </div>
          <div className={`ft ${activeCat === 'innerwear' ? 'active' : ''}`} onClick={() => setActiveCat('innerwear')}>
            Innerwear
          </div>
          <div className={`ft ${activeCat === 'socks' ? 'active' : ''}`} onClick={() => setActiveCat('socks')}>
            Socks
          </div>
          <div className={`ft ${activeCat === 'sale' ? 'active' : ''}`} onClick={() => setActiveCat('sale')}>
            On Sale
          </div>
        </div>
      </div>

      <div className="wishlist-main">
        <div className="sort-bar">
          <div className="sb-left">
            <span className="sb-label">Sort by:</span>
            <select className="sort-select">
              <option>Recently Added</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
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
              const dis = item.mrp > item.price ? Math.round((item.mrp - item.price) / item.mrp * 100) : 0;
              return (
                <div key={item.id} className="wl-card" data-cat={item.cat}>
                  <div className="wl-card-img">
                    {item.badge === 'sale' && <div className="card-badge badge-sale">SALE</div>}
                    {item.badge === 'new' && <div className="card-badge badge-new">NEW</div>}
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
                    <img src={item.img} alt={item.name} loading="lazy" />
                  </div>
                  <div className="wl-card-body">
                    <div className="wc-brand">{item.brand}</div>
                    <div className="wc-name">{item.name}</div>
                    <div className="wc-colors">
                      {item.colors.slice(0, 4).map((color, idx) => (
                        <div key={idx} className="wc-dot" style={{ background: color }} />
                      ))}
                    </div>
                    <div className="wc-price-row">
                      <span className="wc-price">₹{item.price}</span>
                      {dis > 0 && (
                        <>
                          <span className="wc-mrp">₹{item.mrp}</span>
                          <span className="wc-off">{dis}% off</span>
                        </>
                      )}
                    </div>
                    <div className="wc-size-row">
                      {item.sizes.map(size => (
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
                        onClick={() => addToCart(item.id)}
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
          {recos.map((reco, idx) => (
            <div key={idx} className="reco-card">
              <div className="reco-img">
                <img src={reco.img} alt={reco.name} loading="lazy" />
                <button className="reco-add" onClick={() => showToast('Added to bag!')}>
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
          ))}
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
