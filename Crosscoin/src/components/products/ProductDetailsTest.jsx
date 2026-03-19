import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPublicProductBySlug, getPublicCoupons } from '../../services/publicApi';
import { useCart } from '../../context/CartContext';
import Loader from '../common/Loader';

const ProductDetailsTest = () => {
  const router = useRouter();
  const slug = router.query?.slug ? decodeURIComponent(router.query.slug) : null;
  const { addToCart, buyNow, setIsDrawerOpen } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState(null);
  const [rawProduct, setRawProduct] = useState(null);

  const sampleProduct = {
    brand: 'Cross Coin',
    title: 'Tactel Microfiber Elastane Stretch Solid Trunk with Moisture Move Properties',
    styleNo: 'CC001',
    price: 629.00,
    comparePrice: 0,
    images: [
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_2.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_3.webp?v=1700008414&width=560',
      'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_4.webp?v=1700008414&width=560',
    ],
    colors: [
      { name: 'Black', image: 'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=108' },
      { name: 'Blue Shadow', image: 'https://www.jockey.in/cdn/shop/files/IC28_BUSHD_0105_S123_JKY_1_e181c59d-dc4b-4a15-8d85-b738f6ee1c58.webp?v=1725619823&width=108' },
    ],
    features: [
      { title: 'Feather Soft', subtitle: 'Comfort' },
      { title: 'Lightweight', subtitle: 'For All Day Comfort' },
      { title: 'Moisture Move', subtitle: 'Wicks Sweat Away' },
    ],
    descCards: [
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_01_09Feb2024.webp?v=1707810913&width=400', title: 'Tactel Microfiber', subtitle: 'Elastane', desc: 'With Feather-Like Softness' },
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_03_09Feb2024.webp?v=1707810913&width=400', title: 'Moisture Move', subtitle: 'Treatment', desc: 'Wicks Sweat Away' },
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_04_09Feb2024.webp?v=1707810913&width=400', title: 'Ultrasoft', subtitle: 'Waistband', desc: 'For All Day Comfort' },
      { image: 'https://www.jockey.in/cdn/shop/files/IC28_02_09Feb2024.webp?v=1707810913&width=400', title: 'Free From', subtitle: 'Ride-Ups', desc: 'Prevents Sagging & Roll-Ups' },
    ],
    description: 'Tactel Microfiber Elastane Stretch Fabric | Moisture Move Treatment to Wick Sweat Away From the Body | Engineered to Prevent Ride Up | Ultrasoft and Durable Waistband | Label Free for All Day Comfort',
    reviews: [],
  };

  useEffect(() => {
    if (!router.isReady || !slug) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productResponse] = await Promise.all([
          getPublicProductBySlug(slug),
          getPublicCoupons().catch(() => null),
        ]);

        if (productResponse?.success && productResponse?.data) {
          const api = productResponse.data;
          const variations = api.variations || [];
          const firstVar = variations[0] || {};

          const images = [];
          if (firstVar.images?.length > 0) {
            images.push(...firstVar.images.map(img => img.large || img.image_url || img));
          } else if (api.images?.length > 0) {
            images.push(...api.images.map(img => img.large || img.image_url || img));
          }

          const colors = [];
          const colorSet = new Set();
          variations.forEach(v => {
            try {
              const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
              if (attrs?.color) {
                const colorArr = Array.isArray(attrs.color) ? attrs.color : [attrs.color];
                colorArr.forEach(c => {
                  if (!colorSet.has(c)) {
                    colorSet.add(c);
                    colors.push({ name: c, image: v.images?.[0]?.thumbnail || firstVar.images?.[0]?.thumbnail || '' });
                  }
                });
              }
            } catch (e) { /* ignore */ }
          });

          setRawProduct(api);
          setSelectedVariation(firstVar);
          setProductData({
            ...sampleProduct,
            id: api.id,
            brand: api.brand?.name || sampleProduct.brand,
            title: api.name || sampleProduct.title,
            styleNo: firstVar.sku || sampleProduct.styleNo,
            price: parseFloat(firstVar.price || api.price || sampleProduct.price),
            comparePrice: parseFloat(firstVar.comparePrice || 0),
            images: images.length > 0 ? images : sampleProduct.images,
            colors: colors.length > 0 ? colors : sampleProduct.colors,
            description: api.description || sampleProduct.description,
            reviews: api.reviews || [],
            reviewCount: api.review_count || 0,
            avgRating: api.avg_rating || 0,
            variations,
          });
        } else {
          setProductData(sampleProduct);
        }
      } catch {
        setProductData(sampleProduct);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router.isReady, slug]);

  useEffect(() => {
    const handleScroll = () => setShowStickyBar(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddToBag = async () => {
    if (!productData) return;
    const product = rawProduct || {
      id: productData.id,
      name: productData.title,
      price: productData.price,
      images: productData.images,
      variations: productData.variations || [],
    };
    await addToCart(
      product,
      productData.colors[selectedColor]?.name || null,
      null,
      quantity,
      selectedVariation?.id || null,
      productData.images
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleBuyNow = async () => {
    if (!productData) return;
    const product = rawProduct || {
      id: productData.id,
      name: productData.title,
      price: productData.price,
      images: productData.images,
      variations: productData.variations || [],
    };
    await buyNow(
      product,
      productData.colors[selectedColor]?.name || null,
      null,
      quantity,
      selectedVariation?.id || null,
      productData.images
    );
    setIsDrawerOpen(true);
  };

  const handlePincodeCheck = () => {
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      alert(`Delivery available to ${pincode}. Expected in 3-5 business days.`);
    } else {
      alert('Please enter a valid 6-digit pincode.');
    }
  };

  const discount = productData?.comparePrice > 0
    ? Math.round(((productData.comparePrice - productData.price) / productData.comparePrice) * 100)
    : 0;

  if (loading) {
    return (
      <div className="pdt-page">
        <div className="pdt-loader">
          <Loader />
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="pdt-page">
        <div className="pdt-loader">
          <h2>Product not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="pdt-page">
      {/* ── Top Section: Gallery + Info ── */}
      <div className="pdt-wrapper">

        {/* Gallery */}
        <div className="pdt-gallery">
          <div className="pdt-thumbs">
            {productData.images.map((img, idx) => (
              <button
                key={idx}
                className={`pdt-thumb${selectedImage === idx ? ' active' : ''}`}
                onClick={() => setSelectedImage(idx)}
                aria-label={`View image ${idx + 1}`}
              >
                <img src={img} alt={`View ${idx + 1}`} />
              </button>
            ))}
          </div>
          <div className="pdt-main-img">
            <img src={productData.images[selectedImage]} alt={productData.title} />
          </div>
        </div>

        {/* Info */}
        <div className="pdt-info">
          <div className="pdt-brand-tag">{productData.brand}</div>
          <h1 className="pdt-title">{productData.title}</h1>
          <div className="pdt-style">Style No: {productData.styleNo}</div>

          <div className="pdt-price-block">
            <span className="pdt-price">₹{productData.price.toFixed(2)}</span>
            {productData.comparePrice > 0 && (
              <span className="pdt-compare">₹{productData.comparePrice.toFixed(2)}</span>
            )}
            {discount > 0 && (
              <span className="pdt-discount">{discount}% OFF</span>
            )}
            <div className="pdt-price-note">MRP (Incl. of all taxes)</div>
          </div>

          <hr className="pdt-divider" />

          {/* Color Selector */}
          {productData.colors.length > 0 && (
            <div className="pdt-color-section">
              <div className="pdt-selector-label">
                Color: <span>{productData.colors[selectedColor]?.name}</span>
              </div>
              <div className="pdt-color-list">
                {productData.colors.map((color, idx) => (
                  <button
                    key={idx}
                    className={`pdt-color-item${selectedColor === idx ? ' active' : ''}`}
                    onClick={() => setSelectedColor(idx)}
                    aria-label={color.name}
                  >
                    {color.image ? (
                      <img src={color.image} alt={color.name} />
                    ) : (
                      <span className="pdt-color-dot" />
                    )}
                    <span className="pdt-color-name">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + Actions */}
          <div className="pdt-qty-row">
            <div className="pdt-qty-ctrl">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span className="pdt-qty-val">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button className="pdt-btn-atb" onClick={handleAddToBag}>Add to Bag</button>
            <button className="pdt-btn-buy" onClick={handleBuyNow}>Buy Now</button>
          </div>

          {/* Delivery */}
          <div className="pdt-delivery">
            <div className="pdt-pin-row">
              <svg width="16" height="16" fill="none" stroke="#777" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input
                className="pdt-pin-input"
                type="text"
                placeholder="Enter Pincode for Delivery Details"
                maxLength="6"
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                aria-label="Pincode"
              />
              <button className="pdt-pin-check" onClick={handlePincodeCheck}>Check</button>
            </div>
            <div className="pdt-del-badges">
              <div className="pdt-del-badge">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="1" y="3" width="15" height="13" rx="1" />
                  <path d="M16 8h4l3 4v5h-7V8z" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <strong>Fast Delivery</strong>
                <span>Est. 3–5 Days</span>
              </div>
              <div className="pdt-del-badge">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                <strong>Pay on Delivery</strong>
                <span>Available</span>
              </div>
              <div className="pdt-del-badge">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <strong>Free Delivery</strong>
                <span>On ₹599+</span>
              </div>
            </div>
          </div>

          {/* Non-returnable note */}
          <div className="pdt-return-note">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This product is non-returnable. Please check size guide before ordering.
          </div>
        </div>
      </div>

      {/* ── Details Section ── */}
      <div className="pdt-details">

        {/* Fit & Feel */}
        {productData.features?.length > 0 && (
          <div className="pdt-fit-row">
            {productData.features.map((f, idx) => (
              <div key={idx} className="pdt-fit-item">
                <svg width="28" height="28" fill="none" stroke="#CE1E36" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div className="pdt-fit-text">
                  <strong>{f.title}</strong>
                  <span>{f.subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Description */}
        <h2 className="pdt-section-title">Product Description</h2>

        {/* Desc Cards */}
        {productData.descCards?.length > 0 && (
          <div className="pdt-desc-cards">
            {productData.descCards.map((card, idx) => (
              <div key={idx} className="pdt-desc-card">
                <img src={card.image} alt={card.title} />
                <div className="pdt-desc-card-overlay">
                  <div className="pdt-desc-card-title">
                    {card.title}<br /><span>{card.subtitle}</span>
                  </div>
                  <div className="pdt-desc-card-sub">{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Description body */}
        {productData.description && (
          <div
            className="pdt-desc-body"
            dangerouslySetInnerHTML={{ __html: productData.description }}
          />
        )}

        {/* Ideal For */}
        <div className="pdt-ideal-row">
          <span className="pdt-ideal-label">Ideal For</span>
          <div className="pdt-ideal-chip">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Everyday Wear
          </div>
          <div className="pdt-ideal-chip">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" />
            </svg>
            Work
          </div>
          <div className="pdt-ideal-chip">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
            Travel
          </div>
        </div>

        {/* Washing Instructions */}
        <h2 className="pdt-section-title">Washing Instructions</h2>
        <div className="pdt-wash-box">
          {[
            { label: 'Gentle wash 40°C', icon: <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></> },
            { label: 'Do not bleach', icon: <><path d="M18 6L6 18M6 6l12 12" /></> },
            { label: 'Do not wring', icon: <><path d="M12 2v20M17 7l-5-5-5 5" /></> },
            { label: 'Tumble dry low', icon: <><circle cx="12" cy="12" r="10" /><path d="M12 8v8" /></> },
            { label: 'Do not iron', icon: <><path d="M12 2v20M12 8h8M12 16h8" /></> },
            { label: 'Do not dry clean', icon: <><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></> },
          ].map((item, idx) => (
            <div key={idx} className="pdt-wash-item">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Manufacturing Details */}
        <h2 className="pdt-section-title">Manufacturing Details</h2>
        <div className="pdt-mfg-row">
          <div className="pdt-mfg-address">
            Cross Coin Pvt. Ltd., India
          </div>
          <div className="pdt-origin">
            <span className="pdt-origin-label">Country of Origin</span>
            <div className="pdt-origin-badge">
              <svg width="24" height="16" fill="none" viewBox="0 0 24 16" aria-hidden="true">
                <rect width="24" height="16" fill="#FF9933" />
                <rect y="5.33" width="24" height="5.33" fill="#fff" />
                <rect y="10.67" width="24" height="5.33" fill="#138808" />
              </svg>
              India
            </div>
          </div>
        </div>

        {/* Reviews */}
        {productData.reviews?.length > 0 && (
          <div className="pdt-reviews">
            <h2 className="pdt-section-title">Customer Reviews</h2>
            <div className="pdt-reviews-list">
              {productData.reviews.slice(0, 5).map((review, idx) => (
                <div key={idx} className="pdt-review-card">
                  <div className="pdt-review-header">
                    <strong>{review.reviewerName}</strong>
                    <div className="pdt-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < review.rating ? '#FFB800' : 'none'} stroke="#FFB800" strokeWidth="1.5" aria-hidden="true">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="pdt-review-text">{review.review}</p>
                  <span className="pdt-review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Bar ── */}
      <div className={`pdt-sticky${showStickyBar ? ' visible' : ''}`}>
        <div className="pdt-sticky-info">
          <img src={productData.images[0]} alt={productData.title} className="pdt-sticky-img" />
          <div>
            <div className="pdt-sticky-name">{productData.title}</div>
            <div className="pdt-sticky-price">₹{productData.price.toFixed(2)}</div>
          </div>
        </div>
        <div className="pdt-sticky-actions">
          <button className="pdt-btn-atb" onClick={handleAddToBag}>Add to Bag</button>
          <button className="pdt-btn-buy" onClick={handleBuyNow}>Buy Now</button>
        </div>
      </div>

      {/* ── Toast ── */}
      <div className={`pdt-toast${showToast ? ' show' : ''}`} role="status" aria-live="polite">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Added to Bag
      </div>
    </div>
  );
};

export default ProductDetailsTest;
