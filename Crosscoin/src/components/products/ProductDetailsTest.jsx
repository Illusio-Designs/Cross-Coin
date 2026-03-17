import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { getPublicProductBySlug, getPublicCoupons, getPublicProductReviews } from '../../services/publicApi';
import Loader from '../Loader';

const ProductDetailsTest = ({ product }) => {
  const router = useRouter();
  const slug = router.query?.slug ? decodeURIComponent(router.query.slug) : null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productData, setProductData] = useState(null);

  // Sample product data for fallback
  const sampleProduct = {
    brand: 'Jockey',
    title: 'Tactel Microfiber Elastane Stretch Solid Trunk with Moisture Move Properties - Black',
    styleNo: 'IC28',
    price: 629.00,
    images: [
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=560',
    ],
  };

  // Fetch product data on mount
  useEffect(() => {
    if (!router.isReady || !slug) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch product and coupons in parallel
        const [productResponse, couponsData] = await Promise.all([
          getPublicProductBySlug(slug),
          getPublicCoupons()
        ]);

        if (productResponse && productResponse.success && productResponse.data) {
          setProductData(productResponse.data);
        } else {
          setProductData(sampleProduct);
        }

        setLoading(false);
      } catch (err) {
        setProductData(sampleProduct);
        setLoading(false);
      }
    };

    fetchData();
  }, [router.isReady, slug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddToBag = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handlePincodeCheck = () => {
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      alert(`📦 Delivery available to ${pincode}. Expected in 3–5 business days.`);
    } else {
      alert('Please enter a valid 6-digit pincode.');
    }
  };

  if (loading) {
    return (
      <div className="product-details-test">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Loader />
        </div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="product-details-test">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Error Loading Product</h2>
          <p>{error || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  // Safety checks for arrays - extract from API response
  const images = productData?.images || [];
  const variations = productData?.variations || [];
  const currentVariation = variations[0] || {};
  const currentVariationImages = currentVariation?.images || [];
  
  // Extract colors from first variation attributes
  const getColorsFromVariations = () => {
    const colors = new Set();
    variations.forEach(v => {
      try {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        if (attrs?.color) {
          if (Array.isArray(attrs.color)) {
            attrs.color.forEach(c => colors.add(c));
          } else {
            colors.add(attrs.color);
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    });
    return Array.from(colors);
  };

  const colorOptions = getColorsFromVariations();
  const displayImages = currentVariationImages.length > 0 ? currentVariationImages : images;

  return (
    <div className="product-details-test">
      {/* Main Product Layout */}
      <div className="product-wrapper">
        {/* Gallery Section */}
        <div className="gallery-section">
          <div className="thumb-col">
            {displayImages.map((img, idx) => (
              <div
                key={idx}
                className={`thumb ${selectedImage === idx ? 'active' : ''}`}
                onClick={() => setSelectedImage(idx)}
              >
                <img 
                  src={img.thumbnail || img.image_url || img} 
                  alt={`Thumbnail ${idx + 1}`} 
                />
              </div>
            ))}
          </div>
          <div className="main-image-wrap">
            {displayImages[selectedImage] && (
              <img 
                src={displayImages[selectedImage].large || displayImages[selectedImage].image_url || displayImages[selectedImage]} 
                alt={productData.name} 
              />
            )}
          </div>
        </div>

        {/* Product Info Section */}
        <div className="product-info">
          <div className="brand-tag">{productData.name?.split('–')[0]?.trim() || 'Brand'}</div>
          <h1 className="product-title">{productData.name || 'Product Title'}</h1>
          <div className="style-no">SKU: {currentVariation.sku || 'N/A'}</div>

          <div className="price-block">
            <div className="price-main">₹{parseFloat(currentVariation.price || productData.price || 0).toFixed(2)}</div>
            {currentVariation.comparePrice && (
              <div className="price-original" style={{textDecoration: 'line-through', color: '#999'}}>
                ₹{parseFloat(currentVariation.comparePrice).toFixed(2)}
              </div>
            )}
            <div className="price-note">MRP (Incl. Of All Taxes)</div>
          </div>

          <hr className="divider" />

          {/* Color Selector */}
          {colorOptions.length > 0 && (
            <>
              <div className="selector-label">
                Color: <span>{colorOptions[selectedColor] || 'N/A'}</span>
              </div>
              <div className="color-list">
                {colorOptions.map((color, idx) => (
                  <div
                    key={idx}
                    className={`color-item ${selectedColor === idx ? 'active' : ''}`}
                    onClick={() => setSelectedColor(idx)}
                  >
                    <div className="color-img" style={{backgroundColor: color.toLowerCase()}}>
                      {color}
                    </div>
                    <div className="color-name">{color}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Quantity + Add to Bag */}
          <div className="qty-row">
            <div className="qty-ctrl">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
              <div className="qty-val">{quantity}</div>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            <button className="btn-atb" onClick={handleAddToBag}>Add to Bag</button>
            <button className="btn-buy">Buy Now</button>
          </div>

          {/* Delivery Section */}
          <div className="delivery-section">
            <div className="pin-row">
              <svg width="18" height="18" fill="none" stroke="#777" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input
                className="pin-input"
                type="text"
                placeholder="Enter Pincode for Delivery Details"
                maxLength="6"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
              <button className="pin-check" onClick={handlePincodeCheck}>Check</button>
            </div>
            <div className="delivery-badges">
              <div className="del-badge">
                <div className="del-icon">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <rect x="1" y="3" width="15" height="13" rx="1" />
                    <path d="M16 8h4l3 4v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <strong>Fast Delivery</strong>
                Est. 3–5 Days
              </div>
              <div className="del-badge">
                <div className="del-icon">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <strong>Pay on Delivery</strong>
                Available
              </div>
              <div className="del-badge">
                <div className="del-icon">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <strong>Free Delivery</strong>
                On ₹599+
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="product-details">
        {/* Product Description */}
        <h2 className="section-title">Product Description</h2>
        {productData.description && (
          <div 
            className="desc-body-text"
            dangerouslySetInnerHTML={{__html: productData.description}}
            style={{marginBottom: '30px'}}
          />
        )}

        {/* Rating & Reviews */}
        {productData.reviews && productData.reviews.length > 0 && (
          <div className="reviews-section" style={{marginTop: '30px', marginBottom: '30px'}}>
            <h2 className="section-title">Customer Reviews ({productData.reviewCount || productData.reviews.length})</h2>
            <div style={{display: 'grid', gap: '15px'}}>
              {productData.reviews.slice(0, 5).map((review, idx) => (
                <div key={idx} style={{padding: '15px', border: '1px solid #eee', borderRadius: '8px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center'}}>
                    <strong>{review.reviewerName}</strong>
                    <span style={{color: '#FFB800'}}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span>
                  </div>
                  <p style={{margin: '0', color: '#666', fontSize: '14px'}}>{review.review}</p>
                  <small style={{color: '#999'}}>{new Date(review.createdAt).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bag Bar */}
      <div className={`sticky-bag ${showStickyBar ? 'visible' : ''}`}>
        <div className="sticky-product-info">
          <img 
            className="sticky-img" 
            src={displayImages[0]?.thumbnail || displayImages[0]?.image_url || displayImages[0]} 
            alt={productData.name} 
          />
          <div>
            <div className="sticky-name">{productData.name}</div>
            <div className="sticky-price">₹{parseFloat(currentVariation.price || productData.price || 0).toFixed(2)}</div>
          </div>
        </div>
        <div className="sticky-actions">
          <button className="btn-atb" onClick={handleAddToBag}>Add to Bag</button>
          <button className="btn-buy">Buy Now</button>
        </div>
      </div>

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>✓ Added to Bag!</div>
    </div>
  );
};

export default ProductDetailsTest;
