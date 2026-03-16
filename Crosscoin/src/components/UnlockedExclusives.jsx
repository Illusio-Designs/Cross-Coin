import React, { useState } from 'react';
import SafeImage from './common/SafeImage';

const UnlockedExclusives = ({ products = [] }) => {
  const [currentProduct, setCurrentProduct] = useState(0);
  const [qty, setQty] = useState(1);
  const [showDetail, setShowDetail] = useState(false);
  const [stripOffset, setStripOffset] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const VISIBLE_CARDS = 3;
  const CARD_WIDTH = 142;
  const GAP = 12;
  const CARD_TOTAL_WIDTH = CARD_WIDTH + GAP;

  if (!products || products.length === 0) {
    return null;
  }

  const product = products[currentProduct];
  const firstVariation = product.variations?.[0];
  const productPrice = firstVariation?.price || product.price || 0;
  const productComparePrice = firstVariation?.comparePrice || product.comparePrice || 0;

  const handleSelectProduct = (index) => {
    setCurrentProduct(index);
    setQty(1);
  };

  const handleChangeQty = (delta) => {
    setQty(Math.max(1, qty + delta));
  };

  const scrollStrip = (direction) => {
    const maxOffset = Math.max(0, (products.length - VISIBLE_CARDS) * CARD_TOTAL_WIDTH);
    const newOffset = Math.max(0, Math.min(stripOffset + direction * CARD_TOTAL_WIDTH, maxOffset));
    setStripOffset(newOffset);
    // Don't change the main product when scrolling the strip
  };

  const openGallery = (index) => {
    setGalleryImageIndex(index);
    setGalleryOpen(true);
  };

  const closeGallery = () => {
    setGalleryOpen(false);
  };

  const nextGalleryImage = () => {
    if (product.images && galleryImageIndex < product.images.length - 1) {
      setGalleryImageIndex(galleryImageIndex + 1);
    }
  };

  const prevGalleryImage = () => {
    if (galleryImageIndex > 0) {
      setGalleryImageIndex(galleryImageIndex - 1);
    }
  };

  return (
    <div className="unlocked-exclusives-section">
      <div className="section">
        <div className="top-bar">
          <h2 className="section-title"><strong>Unlocked</strong> <span>Exclusives</span></h2>
        </div>

        <div className="main-layout">
          {/* Left: thumbnail grid */}
          <div className="thumb-col">
            <p className="thumb-label">Other Images</p>
            <div className="thumb-grid">
              {product.images?.slice(0, 4).map((img, idx) => (
                <div 
                  key={idx} 
                  className={`thumb ${idx === 0 ? 'active' : ''}`}
                  onClick={() => openGallery(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <SafeImage
                    imageData={{ image_url: img.image_url }}
                    alt={`${product.name} ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Center: hero image */}
          <div className="hero-col">
            <div className="hero-img-wrap">
              <SafeImage
                imageData={{ image_url: product.images?.[0]?.image_url }}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Right: strip + info */}
          <div className="right-col">
            {/* Product strip */}
            <div className="strip-wrap">
              <div className="strip-viewport">
                <div 
                  className="strip" 
                  id="productStrip"
                  style={{
                    transform: `translateX(-${stripOffset}px)`,
                    transition: 'transform 0.3s ease'
                  }}
                >
                  {products.map((prod, idx) => (
                    <div
                      key={idx}
                      className={`strip-card ${idx === currentProduct ? 'active' : ''}`}
                      onClick={() => handleSelectProduct(idx)}
                      style={{ cursor: 'pointer' }}
                    >
                      <SafeImage
                        imageData={{ image_url: prod.images?.[0]?.image_url }}
                        alt={prod.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="strip-nav">
                <button className="strip-btn" onClick={() => scrollStrip(-1)}>
                  <svg viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button className="strip-btn" onClick={() => scrollStrip(1)}>
                  <svg viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Info Card */}
            {!showDetail ? (
              <div className="info-card">
                <div className="info-card-header">
                  <div>
                    <p className="product-sku">{product.id}</p>
                    <p className="product-name">{product.name}</p>
                  </div>
                </div>
                <div className="info-card-body">
                  <div className="price-row">
                    <div>
                      <span className="price">₹{productPrice}</span>
                      {productComparePrice && (
                        <span className="price-old">₹{productComparePrice}</span>
                      )}
                    </div>
                    <div className="btn-row">
                      <button className="btn-explore" onClick={() => setShowDetail(true)}>
                        Explore
                      </button>
                      <button className="btn-cart">
                        <svg viewBox="0 0 24 24">
                          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="divider"></div>
                  <div className="features">
                    <div className="feature">
                      <div className="feature-icon">
                        <svg viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="#555" strokeWidth="1.5" />
                          <path d="M9 12l2 2 4-4" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="feature-text">
                        <p className="feature-name">Premium</p>
                        <p className="feature-sub">Quality</p>
                      </div>
                    </div>
                    <div className="feature">
                      <div className="feature-icon">
                        <svg viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#555" strokeWidth="1.5" />
                          <path d="M7 8h10M7 12h6M7 16h8" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="feature-text">
                        <p className="feature-name">Exclusive</p>
                        <p className="feature-sub">Collection</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="detail-panel visible">
                <div className="tab-btns">
                  <button className="tab-btn active">Details</button>
                  <button className="tab-btn">Description</button>
                </div>

                <div className="tab-panel active">
                  <p className="detail-title">{product.name}</p>
                  <div className="detail-price-row">
                    <span className="detail-price">₹{productPrice}</span>
                    {productComparePrice && (
                      <span className="detail-mrp">₹{productComparePrice}</span>
                    )}
                    <span className="stars">★★★★★</span>
                    <span className="review-count">(12 reviews)</span>
                  </div>
                  <div className="detail-divider"></div>

                  <div className="detail-grid">
                    <div className="detail-row">
                      <strong>Product:</strong> {product.name}
                    </div>
                    <div className="detail-row">
                      <strong>SKU:</strong> {product.id}
                    </div>
                  </div>

                  <div className="detail-divider"></div>

                  <p className="qty-label">Quantity:</p>
                  <div className="qty-row">
                    <button className="qty-btn" onClick={() => handleChangeQty(-1)}>
                      −
                    </button>
                    <input className="qty-val" type="text" value={qty} readOnly />
                    <button className="qty-btn" onClick={() => handleChangeQty(1)}>
                      +
                    </button>
                  </div>

                  <div className="action-row">
                    <button className="btn-add-cart">Add to Cart</button>
                    <button className="btn-buy-now">Buy It Now</button>
                  </div>

                  <button
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '12px',
                      color: '#888',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textAlign: 'left',
                    }}
                    onClick={() => setShowDetail(false)}
                  >
                    ← Back to overview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {galleryOpen && product.images && (
        <div className="gallery-modal" onClick={closeGallery}>
          <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className="gallery-close" onClick={closeGallery}>
              ✕
            </button>

            {/* Main image */}
            <div className="gallery-main">
              <SafeImage
                imageData={{ image_url: product.images[galleryImageIndex]?.image_url }}
                alt={`${product.name} ${galleryImageIndex + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Navigation arrows */}
            <button 
              className="gallery-arrow gallery-arrow-left" 
              onClick={prevGalleryImage}
              disabled={galleryImageIndex === 0}
            >
              ‹
            </button>
            <button 
              className="gallery-arrow gallery-arrow-right" 
              onClick={nextGalleryImage}
              disabled={galleryImageIndex === product.images.length - 1}
            >
              ›
            </button>

            {/* Thumbnail strip */}
            <div className="gallery-thumbnails">
              {product.images.map((img, idx) => (
                <div
                  key={idx}
                  className={`gallery-thumb ${idx === galleryImageIndex ? 'active' : ''}`}
                  onClick={() => setGalleryImageIndex(idx)}
                >
                  <SafeImage
                    imageData={{ image_url: img.image_url }}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>

            {/* Image counter */}
            <div className="gallery-counter">
              {galleryImageIndex + 1} / {product.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnlockedExclusives;
