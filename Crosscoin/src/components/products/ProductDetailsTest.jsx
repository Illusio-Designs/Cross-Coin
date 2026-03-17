import React, { useState, useEffect } from 'react';
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
  const [productData, setProductData] = useState(null);

  // Sample product data for testing
  const sampleProduct = {
    brand: 'Jockey',
    title: 'Tactel Microfiber Elastane Stretch Solid Trunk with Moisture Move Properties - Black',
    styleNo: 'IC28',
    price: 629.00,
    images: [
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_2.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_3.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_4.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_5.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_6.webp?v=1700008414&width=560',
    ],
    colors: [
      { name: 'Black', image: 'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=108' },
      { name: 'Blue Shadow', image: 'https://www.jockey.in/cdn/shop/files/IC28_BUSHD_0105_S123_JKY_1_e181c59d-dc4b-4a15-8d85-b738f6ee1c58.webp?v=1725619823&width=108' },
      { name: 'Brown', image: 'https://www.jockey.in/cdn/shop/files/IC28_BROWN_0105_S123_JKY_1.webp?v=1725619828&width=108' },
      { name: 'Ebony', image: 'https://www.jockey.in/cdn/shop/products/IC28_EBONY_0105_S123_JKY_1.webp?v=1700015373&width=108' },
    ],
    features: [
      { icon: 'feather', title: 'Feather Soft', subtitle: 'Comfort' },
      { icon: 'lightweight', title: 'Lightweight', subtitle: 'For All Day Comfort' },
      { icon: 'moisture', title: 'Moisture Move', subtitle: 'Wicks Sweat Away' },
    ],
    descCards: [
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_01_09Feb2024.webp?v=1707810913&width=400', title: 'Tactel Microfiber', subtitle: 'Elastane', desc: 'With Feather-Like Softness' },
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_03_09Feb2024.webp?v=1707810913&width=400', title: 'Moisture Move', subtitle: 'Treatment', desc: 'Wicks Sweat Away' },
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_04_09Feb2024.webp?v=1707810913&width=400', title: 'Ultrasoft', subtitle: 'Waistband', desc: 'For All Day Comfort' },
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_02_09Feb2024.webp?v=1707810913&width=400', title: 'Free From', subtitle: 'Ride-Ups', desc: 'Prevents Sagging & Roll-Ups' },
    ],
  };

  // Fetch product data on mount
  useEffect(() => {
    if (!router.isReady || !slug) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch product and coupons in parallel
        const [productResponse, couponsData] = await Promise.all([
          getPublicProductBySlug(slug),
          getPublicCoupons()
        ]);

        if (productResponse && productResponse.success && productResponse.data) {
          // Map API response to component data structure
          const apiProduct = productResponse.data;
          const variations = apiProduct.variations || [];
          const firstVariation = variations[0] || {};
          
          // Extract images - use variation images or product images
          const images = [];
          if (firstVariation.images && firstVariation.images.length > 0) {
            images.push(...firstVariation.images.map(img => img.large || img.image_url || img));
          } else if (apiProduct.images && apiProduct.images.length > 0) {
            images.push(...apiProduct.images.map(img => img.large || img.image_url || img));
          }

          // Extract colors from variations
          const colors = [];
          const colorSet = new Set();
          variations.forEach(v => {
            try {
              const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
              if (attrs?.color) {
                if (Array.isArray(attrs.color)) {
                  attrs.color.forEach(c => {
                    if (!colorSet.has(c)) {
                      colorSet.add(c);
                      colors.push({ name: c, image: firstVariation.images?.[0]?.thumbnail || '' });
                    }
                  });
                }
              }
            } catch (e) {
              // ignore
            }
          });

          const mappedProduct = {
            ...sampleProduct,
            brand: apiProduct.name?.split('–')[0]?.trim() || sampleProduct.brand,
            title: apiProduct.name || sampleProduct.title,
            styleNo: firstVariation.sku || sampleProduct.styleNo,
            price: parseFloat(firstVariation.price || apiProduct.price || sampleProduct.price),
            comparePrice: parseFloat(firstVariation.comparePrice || 0),
            images: images.length > 0 ? images : sampleProduct.images,
            colors: colors.length > 0 ? colors : sampleProduct.colors,
            description: apiProduct.description || '',
            reviews: apiProduct.reviews || [],
            reviewCount: apiProduct.review_count || 0,
            avgRating: apiProduct.avg_rating || 0,
          };

          setProductData(mappedProduct);
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

  if (!productData) {
    return (
      <div className="product-details-test">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Error Loading Product</h2>
          <p>Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-details-test">
      {/* Main Product Layout */}
      <div className="product-wrapper">
        {/* Gallery Section */}
        <div className="gallery-section">
          <div className="thumb-col">
            {productData.images.map((img, idx) => (
              <div
                key={idx}
                className={`thumb ${selectedImage === idx ? 'active' : ''}`}
                onClick={() => setSelectedImage(idx)}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} />
              </div>
            ))}
          </div>
          <div className="main-image-wrap">
            <img src={productData.images[selectedImage]} alt={productData.title} />
          </div>
        </div>

        {/* Product Info Section */}
        <div className="product-info">
          <div className="brand-tag">{productData.brand}</div>
          <h1 className="product-title">{productData.title}</h1>
          <div className="style-no">Style: #{productData.styleNo}</div>

          <div className="price-block">
            <div className="price-main">₹{productData.price.toFixed(2)}</div>
            {productData.comparePrice > 0 && (
              <div className="price-original" style={{textDecoration: 'line-through', color: '#999'}}>
                ₹{productData.comparePrice.toFixed(2)}
              </div>
            )}
            <div className="price-note">MRP (Incl. Of All Taxes)</div>
          </div>

          <hr className="divider" />

          {/* Color Selector */}
          <div className="selector-label">
            Color: <span>{productData.colors[selectedColor]?.name}</span>
          </div>
          <div className="color-list">
            {productData.colors.map((color, idx) => (
              <div
                key={idx}
                className={`color-item ${selectedColor === idx ? 'active' : ''}`}
                onClick={() => setSelectedColor(idx)}
              >
                <div className="color-img">
                  <img src={color.image} alt={color.name} />
                </div>
                <div className="color-name">{color.name}</div>
              </div>
            ))}
          </div>

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
        {/* Fit & Feel */}
        <div className="fit-feel-row">
          {productData.features.map((feature, idx) => (
            <div key={idx} className="fit-item">
              <div className="fit-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className="fit-text">
                <strong>{feature.title}</strong>
                <span>{feature.subtitle}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Product Description */}
        <h2 className="section-title">Product Description</h2>
        {productData.description ? (
          <div 
            className="desc-body-text"
            dangerouslySetInnerHTML={{__html: productData.description}}
            style={{marginBottom: '30px'}}
          />
        ) : (
          <div className="desc-cards">
            {productData.descCards.map((card, idx) => (
              <div key={idx} className="desc-card">
                <img src={card.image} alt={card.title} />
                <div className="desc-card-label">
                  <div className="desc-card-title">
                    {card.title}
                    <br />
                    <span>{card.subtitle}</span>
                  </div>
                  <div className="desc-card-sub">{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="desc-body-text">
          Tactel Microfiber Elastane Stretch Fabric | Fabric Composition : Tactel Nylon and Elastane | 
          Moisture Move Treatment to Wick Sweat Away From the Body | Engineered to Prevent Ride Up | 
          Ultrasoft and Durable Waistband | Label Free for All Day Comfort
        </p>

        {/* Ideal For */}
        <div className="ideal-row">
          <span className="ideal-label">Ideal For</span>
          <div className="ideal-chip">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
            <strong>Work</strong>
          </div>
          <div className="ideal-chip">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
            <strong>Travel</strong>
          </div>
          <div className="ideal-chip">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <strong>Everyday Wear</strong>
          </div>
        </div>

        {/* Washing Instructions */}
        <h2 className="section-title">Washing Instructions</h2>
        <div className="wash-box">
          <div className="wash-item">
            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            </svg>
            <span>Gentle wash<br />40°C</span>
          </div>
          <div className="wash-item">
            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            <span>Do not<br />bleach</span>
          </div>
          <div className="wash-item">
            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 2v20M17 7l-5-5-5 5" />
            </svg>
            <span>Do not wring</span>
          </div>
          <div className="wash-item">
            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8" />
            </svg>
            <span>Tumble dry<br />low</span>
          </div>
        </div>

        {/* Manufacturing Details */}
        <h2 className="section-title">Manufacturing Details</h2>
        <div className="mfg-row">
          <div className="mfg-address">
            Page Industries Ltd., Cessna Park, Umiya Bay, T-1, 7th Flr, ORR, Bengaluru - 560103,
            <br />
            Karnataka. CIN: L18101KA1994PLC016554
          </div>
          <div className="mfg-origin">
            <span className="origin-label">Country of Origin</span>
            <div className="origin-badge">
              <svg width="24" height="16" fill="none" viewBox="0 0 24 16">
                <rect width="24" height="16" fill="#FF9933" />
                <rect y="5.33" width="24" height="5.33" fill="#fff" />
                <rect y="10.67" width="24" height="5.33" fill="#138808" />
              </svg>
              <span>India</span>
            </div>
          </div>
        </div>

        {/* Customer Reviews */}
        {productData.reviews && productData.reviews.length > 0 && (
          <div className="reviews-section" style={{marginTop: '30px'}}>
            <h2 className="section-title">Customer Reviews ({productData.reviewCount})</h2>
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
          <img className="sticky-img" src={productData.images[0]} alt={productData.title} />
          <div>
            <div className="sticky-name">{productData.title}</div>
            <div className="sticky-price">₹{productData.price.toFixed(2)}</div>
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
