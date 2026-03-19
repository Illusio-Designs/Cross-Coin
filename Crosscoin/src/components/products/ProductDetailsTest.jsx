import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPublicProductBySlug, getPublicCoupons, getPublicProductReviews, checkPincodeServiceability } from '../../services/publicApi';
import { useCart } from '../../context/CartContext';
import Loader from '../common/Loader';
import InfiniteReviewsSlider from '../common/InfiniteReviewsSlider';
import colorMap from './colorMap';

const ProductDetailsTest = () => {
  const router = useRouter();
  const slug = router.query?.slug ? decodeURIComponent(router.query.slug) : null;
  const { addToCart, buyNow, setIsDrawerOpen } = useCart();

  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [pincode, setPincode] = useState('');
  const [serviceability, setServiceability] = useState(null); // null | { serviceable, cod_available, estimated_delivery_days } | 'error'
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState(null);
  const [rawProduct, setRawProduct] = useState(null);
  const [allReviews, setAllReviews] = useState([]);

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

          // Build colors list, each entry keeps a ref to its variation
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
                    colors.push({ name: c, variation: v });
                  }
                });
              }
            } catch (e) { /* ignore */ }
          });

          // Images from first variation
          const images = getVariationImages(firstVar, api);

          setRawProduct(api);
          setSelectedVariation(firstVar);
          // Init selected size from first variation
          const firstAttrs = typeof firstVar.attributes === 'string' ? JSON.parse(firstVar.attributes) : (firstVar.attributes || {});
          const firstSizes = Array.isArray(firstAttrs.size) ? firstAttrs.size : (firstAttrs.size ? [firstAttrs.size] : []);
          setSelectedSize(firstSizes[0] || '');
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
            rawApi: api,
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

  // Build color options per-variation (same as main ProductDetails page)
  // Each entry = one variation, which may have 1 or multiple colors (pack)
  const colorOptions = (() => {
    if (!productData?.variations) return [];
    return productData.variations.reduce((acc, v) => {
      try {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        const colors = Array.isArray(attrs?.color) ? attrs.color : (attrs?.color ? [attrs.color] : []);
        if (colors.length > 0) acc.push({ variation: v, colors });
      } catch (e) { /* ignore */ }
      return acc;
    }, []);
  })();

  // Helper: extract image URLs from a variation + api fallback
  const getVariationImages = (variation, api) => {
    if (variation?.images?.length > 0) {
      return variation.images.map(img => img.large || img.image_url || img);
    }
    if (api?.images?.length > 0) {
      const filtered = api.images.filter(img => img?.product_variation_id === variation?.id);
      if (filtered.length > 0) return filtered.map(img => img.large || img.image_url || img);
      return api.images.map(img => img.large || img.image_url || img);
    }
    return [];
  };

  // Gallery images — driven by selectedVariation
  const galleryImages = (() => {
    if (!selectedVariation || !productData) return productData?.images || [];
    const api = productData.rawApi;
    if (!api) return productData.images;
    const imgs = getVariationImages(selectedVariation, api);
    return imgs.length > 0 ? imgs : productData.images;
  })();

  // Handle color selection — switch variation + reset image index
  const handleColorSelect = (idx) => {
    setSelectedColor(idx);
    setSelectedImage(0);
    const opt = colorOptions?.[idx];
    if (opt?.variation) {
      setSelectedVariation(opt.variation);
      // Reset size to first available size of new variation
      const attrs = typeof opt.variation.attributes === 'string' ? JSON.parse(opt.variation.attributes) : (opt.variation.attributes || {});
      const sizes = Array.isArray(attrs.size) ? attrs.size : (attrs.size ? [attrs.size] : []);
      setSelectedSize(sizes[0] || '');
    }
  };

  useEffect(() => {
    const handleScroll = () => setShowStickyBar(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch real reviews once product id is known
  useEffect(() => {
    if (!rawProduct?.id) return;
    getPublicProductReviews(rawProduct.id, { limit: 50 })
      .then(data => {
        const reviews = data?.reviews || data?.data?.reviews || (Array.isArray(data) ? data : []);
        setAllReviews(reviews);
      })
      .catch(() => {});
  }, [rawProduct?.id]);

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
      colorOptions[selectedColor]?.colors.join(', ') || null,
      selectedSize || null,
      quantity,
      selectedVariation?.id || null,
      galleryImages
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
      colorOptions[selectedColor]?.colors.join(', ') || null,
      selectedSize || null,
      quantity,
      selectedVariation?.id || null,
      galleryImages
    );
    setIsDrawerOpen(true);
  };

  const handlePincodeCheck = async () => {
    if (!/^\d{6}$/.test(pincode)) {
      setServiceability({ error: 'Please enter a valid 6-digit pincode.' });
      return;
    }
    setServiceabilityLoading(true);
    setServiceability(null);
    try {
      const result = await checkPincodeServiceability(pincode);
      setServiceability(result);
    } catch {
      setServiceability({ error: 'Unable to check. Please try again.' });
    } finally {
      setServiceabilityLoading(false);
    }
  };

  // Compute estimated delivery date (today + 5 days)
  const estimatedDelivery = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const day = d.getDate();
    const month = d.toLocaleString('en-IN', { month: 'long' });
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd' : 'th';
    return { day, suffix, month };
  })();

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

        {/* Gallery + Fit row — left column */}
        <div className="pdt-gallery-col">
        {/* Gallery */}
        <div className="pdt-gallery">
          <div className="pdt-thumbs">
            {galleryImages.map((img, idx) => (
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
          <div className="pdt-main-img-wrap">
            <button
              className="pdt-main-img"
              onClick={() => { setLightboxIndex(selectedImage); setShowLightbox(true); }}
              aria-label="View full image"
              type="button"
            >
              <img src={galleryImages[selectedImage] || galleryImages[0]} alt={productData.title} />
              {/* Style badge */}
              {productData.styleNo && (
                <span className="pdt-style-badge">Style: #{productData.styleNo}</span>
              )}
              {/* Zoom hint icon */}
              <span className="pdt-zoom-hint" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Fit & Feel — below gallery, inside wrapper */}
        {productData.features?.length > 0 && (
          <div className="pdt-fit-row">
            {productData.features.map((f, idx) => {
              const icon = (() => {
                const t = f.title?.toLowerCase() || '';
                if (t.includes('fresh') || t.includes('microbial') || t.includes('feather') || t.includes('soft'))
                  return (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2 C12 2 13.2 7.5 17 9 C13.2 10.5 12 16 12 16 C12 16 10.8 10.5 7 9 C10.8 7.5 12 2 12 2Z" fill="#CE1E36"/>
                      <path d="M5.5 2.5 C5.5 2.5 6.1 5 7.5 5.8 C6.1 6.6 5.5 9 5.5 9 C5.5 9 4.9 6.6 3.5 5.8 C4.9 5 5.5 2.5 5.5 2.5Z" fill="#CE1E36" opacity="0.75"/>
                      <path d="M19 14 C19 14 19.5 16 20.8 16.7 C19.5 17.4 19 19.5 19 19.5 C19 19.5 18.5 17.4 17.2 16.7 C18.5 16 19 14 19 14Z" fill="#CE1E36" opacity="0.55"/>
                    </svg>
                  );
                if (t.includes('stretch') || t.includes('body') || t.includes('flex'))
                  return (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="7" y="7" width="10" height="10" rx="0.5" stroke="#180D3E" strokeWidth="1.4" fill="none"/>
                      <path d="M7 7 L3 3M17 7 L21 3M7 17 L3 21M17 17 L21 21" stroke="#CE1E36" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  );
                if (t.includes('moisture') || t.includes('wick') || t.includes('sweat'))
                  return (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3 C12 3 5 12 5 16 a7 7 0 0 0 14 0 C19 12 12 3 12 3Z" stroke="#CE1E36" strokeWidth="1.4" fill="none"/>
                      <path d="M9.5 18 C9.5 18 10.5 20.5 12 20.5" stroke="#CE1E36" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  );
                if (t.includes('light') || t.includes('weight'))
                  return (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2 C12 2 13.2 7.5 17 9 C13.2 10.5 12 16 12 16 C12 16 10.8 10.5 7 9 C10.8 7.5 12 2 12 2Z" fill="#CE1E36"/>
                    </svg>
                  );
                return (
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2 C12 2 13.2 7.5 17 9 C13.2 10.5 12 16 12 16 C12 16 10.8 10.5 7 9 C10.8 7.5 12 2 12 2Z" fill="#CE1E36"/>
                  </svg>
                );
              })();
              return (
                <div key={idx} className="pdt-fit-item">
                  {icon}
                  <div className="pdt-fit-text">
                    <strong>{f.title}</strong>
                    <span>{f.subtitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>{/* end pdt-gallery-col */}

        {/* Lightbox */}
        {showLightbox && (
          <div
            className="pdt-lightbox-overlay"
            onClick={() => setShowLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Image gallery"
          >
            <button
              className="pdt-lightbox-close"
              onClick={() => setShowLightbox(false)}
              aria-label="Close"
              type="button"
            >✕</button>
            <button
              className="pdt-lightbox-arrow pdt-lightbox-prev"
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + galleryImages.length) % galleryImages.length); }}
              aria-label="Previous image"
              type="button"
            >‹</button>
            <div className="pdt-lightbox-img-wrap" onClick={e => e.stopPropagation()}>
              <img src={galleryImages[lightboxIndex]} alt={`${productData.title} ${lightboxIndex + 1}`} />
            </div>
            <button
              className="pdt-lightbox-arrow pdt-lightbox-next"
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % galleryImages.length); }}
              aria-label="Next image"
              type="button"
            >›</button>
          </div>
        )}

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
          {colorOptions.length > 0 && (
            <div className="pdt-color-section">
              <div className="pdt-selector-label">
                Color: <span>
                  {colorOptions[selectedColor]?.colors.length > 1
                    ? `Pack of ${colorOptions[selectedColor].colors.length}`
                    : colorOptions[selectedColor]?.colors[0]}
                </span>
              </div>
              <div className="pdt-color-list">
                {colorOptions.map((opt, idx) => (
                  <button
                    key={opt.variation.sku || idx}
                    className={`pdt-color-card${selectedColor === idx ? ' active' : ''}`}
                    onClick={() => handleColorSelect(idx)}
                    aria-label={opt.colors.length > 1 ? `Pack of ${opt.colors.length}: ${opt.colors.join(', ')}` : opt.colors[0]}
                    type="button"
                  >
                    <div className="pdt-color-card-swatch-wrap">
                      {opt.colors.length > 1 ? (
                        // Multi-color pack — show swatches side by side
                        <div className="pdt-color-pack-row">
                          {opt.colors.map((c, cidx) => (
                            <span
                              key={c + cidx}
                              className="pdt-color-card-circle pdt-color-pack-circle"
                              style={{ backgroundColor: colorMap[c.toLowerCase()] || '#ccc' }}
                              title={c}
                            />
                          ))}
                        </div>
                      ) : (
                        <span
                          className="pdt-color-card-circle"
                          style={{ backgroundColor: colorMap[opt.colors[0]?.toLowerCase()] || '#ccc' }}
                          title={opt.colors[0]}
                        />
                      )}
                      {selectedColor === idx && (
                        <span className="pdt-color-card-check" aria-hidden="true">✓</span>
                      )}
                    </div>
                    <span className="pdt-color-card-name">
                      {opt.colors.length > 1 ? `Pack of ${opt.colors.length}` : opt.colors[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {(() => {
            const attrs = typeof selectedVariation?.attributes === 'string'
              ? JSON.parse(selectedVariation.attributes)
              : (selectedVariation?.attributes || {});
            const sizes = (Array.isArray(attrs.size) ? attrs.size : (attrs.size ? [attrs.size] : []))
              .filter(s => !!s && typeof s === 'string');
            const isFreeSize = sizes.length === 1 && sizes[0].toLowerCase().includes('free');
            if (sizes.length === 0) return null;
            return (
              <div className="pdt-size-section">
                {isFreeSize ? (
                  <button className="pdt-size-free" type="button" disabled>{sizes[0].toUpperCase()}</button>
                ) : (
                  <>
                    <div className="pdt-selector-label">Size: <span>{selectedSize}</span></div>
                    <div className="pdt-size-list">
                      {sizes.map(s => (
                        <button
                          key={s}
                          className={`pdt-size-btn${selectedSize === s ? ' active' : ''}`}
                          onClick={() => setSelectedSize(s)}
                          type="button"
                          aria-label={`Select size ${s}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="pdt-size-guide-row">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7h18M3 12h18M3 17h18M7 3v4M12 3v4M17 3v4"/>
                  </svg>
                  Not sure about your size?
                  <button className="pdt-size-chart-btn" type="button">Size Chart</button>
                </div>
              </div>
            );
          })()}

          {/* Qty + Actions */}
          <div className="pdt-non-returnable-line">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Non-Returnable &nbsp;·&nbsp; Check size guide before ordering
          </div>
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
            <div className="pdt-delivery-title">Delivery Details</div>
            <div className="pdt-pin-row">
              <input
                className="pdt-pin-input"
                type="text"
                placeholder="Enter Pincode"
                maxLength="6"
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                aria-label="Pincode"
              />
              <button className="pdt-pin-check" onClick={handlePincodeCheck} disabled={serviceabilityLoading}>
                {serviceabilityLoading ? '...' : 'CHECK'}
              </button>
            </div>
            {/* Serviceability result */}
            {serviceability && (
              <div className={`pdt-serviceability-result${serviceability.serviceable ? ' ok' : ' fail'}`}>
                {serviceability.error ? (
                  <span>{serviceability.error}</span>
                ) : serviceability.serviceable ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="#2e7d32" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    Delivery available to <strong>{pincode}</strong>
                    {serviceability.cod_available && <span className="pdt-cod-tag">COD available</span>}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="#c62828" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Delivery not available to <strong>{pincode}</strong>
                  </>
                )}
              </div>
            )}
            <div className="pdt-del-info-row">
              <div className="pdt-del-info-card">
                {/* Clock overlaid on truck — matches screenshot */}
                <svg width="30" height="26" viewBox="0 0 38 28" fill="none" aria-hidden="true">
                  {/* truck body */}
                  <rect x="1" y="8" width="22" height="14" rx="1.5" stroke="#180D3E" strokeWidth="1.5" fill="none"/>
                  {/* truck cab */}
                  <path d="M23 13h5l4 5v4h-9V13z" stroke="#180D3E" strokeWidth="1.5" fill="none"/>
                  {/* wheels */}
                  <circle cx="7" cy="24" r="3" stroke="#180D3E" strokeWidth="1.5" fill="white"/>
                  <circle cx="29" cy="24" r="3" stroke="#180D3E" strokeWidth="1.5" fill="white"/>
                  {/* clock face overlaid on truck body */}
                  <circle cx="13" cy="15" r="5" stroke="#CE1E36" strokeWidth="1.3" fill="white"/>
                  <path d="M13 12.5v3l1.8 1.1" stroke="#CE1E36" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Estimated Delivery by <strong>{estimatedDelivery.day}<sup>{estimatedDelivery.suffix}</sup> {estimatedDelivery.month}</strong></span>
              </div>
              <div className="pdt-del-info-card">
                {/* Truck with speed lines — matches screenshot */}
                <svg width="30" height="26" viewBox="0 0 38 28" fill="none" aria-hidden="true">
                  {/* truck body */}
                  <rect x="5" y="8" width="20" height="14" rx="1.5" stroke="#180D3E" strokeWidth="1.5" fill="none"/>
                  {/* truck cab */}
                  <path d="M25 13h5l4 5v4h-9V13z" stroke="#180D3E" strokeWidth="1.5" fill="none"/>
                  {/* wheels */}
                  <circle cx="11" cy="24" r="3" stroke="#180D3E" strokeWidth="1.5" fill="white"/>
                  <circle cx="31" cy="24" r="3" stroke="#180D3E" strokeWidth="1.5" fill="white"/>
                  {/* speed lines */}
                  <path d="M1 12h6M1 16h4M1 20h5" stroke="#CE1E36" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span>Eligible For <strong>Free Delivery</strong></span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Details Section ── */}
      <div className="pdt-details">

        {/* Product Description */}
        <h2 className="pdt-section-title">Product Description</h2>

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
            {
              label: 'Gentle wash\n40°C',
              icon: (
                // Wash tub with 40 inside
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 10 Q4 8 6 8 H30 Q32 8 32 10 L30 28 Q30 30 28 30 H8 Q6 30 6 28 Z"/>
                  <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" stroke="none" fill="currentColor" fontFamily="inherit">40</text>
                  <path d="M8 16 Q11 13 14 16 Q17 19 20 16 Q23 13 26 16 Q29 19 32 16" strokeWidth="1.2"/>
                </svg>
              )
            },
            {
              label: 'Do not\nbleach',
              icon: (
                // Triangle with X
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 5 L33 30 H3 Z"/>
                  <line x1="12" y1="14" x2="24" y2="26"/>
                  <line x1="24" y1="14" x2="12" y2="26"/>
                </svg>
              )
            },
            {
              label: 'Do not\nwring',
              icon: (
                // Two twisted spirals with X
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 14 C4 14 8 10 12 14 C16 18 20 10 24 14 C28 18 32 14 32 14"/>
                  <path d="M4 22 C4 22 8 18 12 22 C16 26 20 18 24 22 C28 26 32 22 32 22"/>
                  <line x1="13" y1="11" x2="23" y2="25"/>
                  <line x1="23" y1="11" x2="13" y2="25"/>
                </svg>
              )
            },
            {
              label: 'Flat dry in\nshade',
              icon: (
                // Rectangle with horizontal line inside
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="10" width="28" height="16" rx="1"/>
                  <line x1="8" y1="18" x2="28" y2="18"/>
                </svg>
              )
            },
            {
              label: 'Do not\niron',
              icon: (
                // Iron shape with X
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 24 H28 Q34 24 34 18 Q34 14 28 14 H12 L8 10 H4 Z"/>
                  <line x1="13" y1="15" x2="23" y2="23"/>
                  <line x1="23" y1="15" x2="13" y2="23"/>
                </svg>
              )
            },
            {
              label: 'Do not dry\nclean',
              icon: (
                // Circle with X
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="18" r="13"/>
                  <line x1="11" y1="11" x2="25" y2="25"/>
                  <line x1="25" y1="11" x2="11" y2="25"/>
                </svg>
              )
            },
          ].map((item, idx) => (
            <div key={idx} className="pdt-wash-item">
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Manufacturing Details */}
        <h2 className="pdt-section-title">Manufacturing Details</h2>
        <div className="pdt-mfg-row">
          <div className="pdt-mfg-address">
            Obzus India Private Limited, Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi - 363641, Gujarat (India)
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
        {allReviews.length > 0 && (
          <div className="pdt-reviews">
            <h2 className="pdt-section-title">Customer Reviews</h2>
            <InfiniteReviewsSlider reviews={allReviews} />
          </div>
        )}
      </div>

      {/* ── Sticky Bar ── */}
      <div className={`pdt-sticky${showStickyBar ? ' visible' : ''}`}>
        <div className="pdt-sticky-info">
          <img src={galleryImages[0] || productData.images[0]} alt={productData.title} className="pdt-sticky-img" />
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
