import React, { useState, useEffect } from 'react';
import SafeImage from './common/SafeImage';
import { getPublicProductReviews } from '../services/publicApi';

const UnlockedExclusives = ({ products = [] }) => {
  const [currentProduct, setCurrentProduct] = useState(0);
  const [qty, setQty] = useState(1);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [stripOffset, setStripOffset] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState(null);

  const VISIBLE_CARDS = 3;
  const CARD_WIDTH = 142;
  const GAP = 12;
  const CARD_TOTAL_WIDTH = CARD_WIDTH + GAP;

  useEffect(() => {
    if (!products || products.length === 0) return;
    const prod = products[currentProduct];
    if (!prod?.id) return;
    setReviewCount(0);
    setAvgRating(null);
    getPublicProductReviews(prod.id, { limit: 100 })
      .then(data => {
        // Handle all possible response shapes
        const reviews = data?.data?.reviews || data?.reviews || (Array.isArray(data) ? data : []);
        const count = reviews.length;
        const avg = count > 0
          ? parseFloat((reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count).toFixed(1))
          : null;
        setReviewCount(count);
        setAvgRating(avg);
      })
      .catch(() => {});
  }, [currentProduct, products]);

  if (!products || products.length === 0) return null;

  const product = products[currentProduct];
  const firstVariation = product.variations?.[0];
  const productPrice = firstVariation?.price || product.price || 0;
  const productComparePrice = firstVariation?.comparePrice || product.comparePrice || 0;
  const productSku = firstVariation?.sku || product.sku || '—';

  const handleSelectProduct = (index) => {
    setCurrentProduct(index);
    setQty(1);
    setShowDetail(false);
    setActiveTab('details');
  };

  const handleChangeQty = (delta) => setQty(Math.max(1, qty + delta));

  const scrollStrip = (direction) => {
    const maxOffset = Math.max(0, (products.length - VISIBLE_CARDS) * CARD_TOTAL_WIDTH);
    setStripOffset(Math.max(0, Math.min(stripOffset + direction * CARD_TOTAL_WIDTH, maxOffset)));
  };

  const openGallery = (index) => { setGalleryImageIndex(index); setGalleryOpen(true); };
  const closeGallery = () => setGalleryOpen(false);
  const nextGalleryImage = () => { if (product.images && galleryImageIndex < product.images.length - 1) setGalleryImageIndex(galleryImageIndex + 1); };
  const prevGalleryImage = () => { if (galleryImageIndex > 0) setGalleryImageIndex(galleryImageIndex - 1); };

  return (
    <div className="unlocked-exclusives-section">
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Unlocked <strong>Exclusives</strong></h2>
          <p className="section-subtitle">Our most coveted pieces, now available</p>
        </div>

        <div className="main-layout">
          {/* Left: thumbnail grid */}
          <div className="thumb-col">
            <p className="thumb-label">Other Images</p>
            <div className="thumb-grid">
              {product.images?.slice(0, 4).map((img, idx) => (
                <div key={idx} className={`thumb ${idx === 0 ? 'active' : ''}`} onClick={() => openGallery(idx)} style={{ cursor: 'pointer' }}>
                  <SafeImage imageData={{ image_url: img.image_url }} alt={`${product.name} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Center: hero image */}
          <div className="hero-col">
            <div className="hero-img-wrap">
              <SafeImage imageData={{ image_url: product.images?.[0]?.image_url }} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {/* Right: strip + info */}
          <div className="right-col">
            {/* Product strip */}
            <div className="strip-wrap">
              <div className="strip-viewport">
                <div className="strip" style={{ transform: `translateX(-${stripOffset}px)`, transition: 'transform 0.3s ease' }}>
                  {products.map((prod, idx) => (
                    <div key={idx} className={`strip-card ${idx === currentProduct ? 'active' : ''}`} onClick={() => handleSelectProduct(idx)} style={{ cursor: 'pointer' }}>
                      <SafeImage imageData={{ image_url: prod.images?.[0]?.image_url }} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="strip-nav">
                <button className="strip-btn" onClick={() => scrollStrip(-1)}>
                  <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button className="strip-btn" onClick={() => scrollStrip(1)}>
                  <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>

            {/* Info Card (overview) */}
            {!showDetail ? (
              <div className="info-card">
                <div className="info-card-header">
                  <p className="product-name">{product.name}</p>
                </div>
                <div className="info-card-body">
                  <div className="price-row">
                    <div>
                      <span className="price">₹{productPrice}</span>
                      {productComparePrice > 0 && <span className="price-old">₹{productComparePrice}</span>}
                    </div>
                    <div className="btn-row">
                      <button className="btn-explore" onClick={() => setShowDetail(true)}>Explore</button>
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
              /* Detail Panel */
              <div className="detail-panel visible">
                <div className="tab-btns">
                  <button className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Details</button>
                  <button className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
                </div>

                {activeTab === 'details' && (
                  <div className="tab-panel active">
                    <p className="detail-title">{product.name}</p>
                    <div className="detail-price-row">
                      <span className="detail-price">₹{productPrice}</span>
                      {productComparePrice > 0 && <span className="detail-mrp">₹{productComparePrice}</span>}
                      {avgRating && (
                        <div className="detail-rating-pill">
                          <span className="rating-pill__star">★</span>
                          <span className="rating-pill__score">{avgRating}/5</span>
                          <span className="rating-pill__count">{reviewCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="detail-divider"></div>

                    <div className="detail-sku-row">
                      <strong>SKU:</strong> <span>{productSku}</span>
                    </div>

                    <div className="detail-divider"></div>

                    <p className="qty-label">Quantity:</p>
                    <div className="qty-row">
                      <button className="qty-btn" onClick={() => handleChangeQty(-1)}>−</button>
                      <input className="qty-val" type="text" value={qty} readOnly />
                      <button className="qty-btn" onClick={() => handleChangeQty(1)}>+</button>
                    </div>

                    <div className="action-row">
                      <button className="btn-add-cart">Add to Cart</button>
                      <button className="btn-buy-now">Buy It Now</button>
                    </div>

                    <button className="back-btn" onClick={() => setShowDetail(false)}>← Back to overview</button>
                  </div>
                )}

                {activeTab === 'description' && (
                  <div className="tab-panel active">
                    <div
                      className="detail-description"
                      dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }}
                    />
                    <button className="back-btn" onClick={() => setShowDetail(false)}>← Back to overview</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {galleryOpen && product.images && (
        <div className="gallery-modal" onClick={closeGallery}>
          <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-close" onClick={closeGallery}>✕</button>
            <div className="gallery-main">
              <SafeImage imageData={{ image_url: product.images[galleryImageIndex]?.image_url }} alt={`${product.name} ${galleryImageIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <button className="gallery-arrow gallery-arrow-left" onClick={prevGalleryImage} disabled={galleryImageIndex === 0}>‹</button>
            <button className="gallery-arrow gallery-arrow-right" onClick={nextGalleryImage} disabled={galleryImageIndex === product.images.length - 1}>›</button>
            <div className="gallery-thumbnails">
              {product.images.map((img, idx) => (
                <div key={idx} className={`gallery-thumb ${idx === galleryImageIndex ? 'active' : ''}`} onClick={() => setGalleryImageIndex(idx)}>
                  <SafeImage imageData={{ image_url: img.image_url }} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
            <div className="gallery-counter">{galleryImageIndex + 1} / {product.images.length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnlockedExclusives;
