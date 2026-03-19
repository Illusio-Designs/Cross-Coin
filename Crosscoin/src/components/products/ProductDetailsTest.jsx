import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getPublicProductBySlug, getPublicCoupons } from '../../services/publicApi';
import Loader from '../Loader';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useWishlist } from '../../context/WishlistContext';
import { FiHeart } from 'react-icons/fi';

// Sample product data — defined outside component to avoid hoisting issues
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
      { name: 'Black', image: 'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=108', mainImage: 'https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=560' },
      { name: 'Blue Shadow', image: 'https://www.jockey.in/cdn/shop/files/IC28_BUSHD_0105_S123_JKY_1_e181c59d-dc4b-4a15-8d85-b738f6ee1c58.webp?v=1725619823&width=108', mainImage: 'https://www.jockey.in/cdn/shop/files/IC28_BUSHD_0105_S123_JKY_1_e181c59d-dc4b-4a15-8d85-b738f6ee1c58.webp?v=1725619823&width=560' },
      { name: 'Brown', image: 'https://www.jockey.in/cdn/shop/files/IC28_BROWN_0105_S123_JKY_1.webp?v=1725619828&width=108', mainImage: 'https://www.jockey.in/cdn/shop/files/IC28_BROWN_0105_S123_JKY_1.webp?v=1725619828&width=560' },
      { name: 'Ebony', image: 'https://www.jockey.in/cdn/shop/products/IC28_EBONY_0105_S123_JKY_1.webp?v=1700015373&width=108', mainImage: 'https://www.jockey.in/cdn/shop/products/IC28_EBONY_0105_S123_JKY_1.webp?v=1700015373&width=560' },
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

const ProductDetailsTest = () => {
  const router = useRouter();
  const slug = router.query?.slug ? decodeURIComponent(router.query.slug) : null;
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState(null);
  const reviewSliderRef = useRef(null);
  const featureStripRef = useRef(null);

  // Fetch product data on mount
  useEffect(() => {
    // No slug — use sample product directly
    if (!slug) {
      setProductData(sampleProduct);
      setLoading(false);
      return;
    }

    if (!router.isReady) return;

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
          <div className="gallery-main-col">
            <div className="main-image-wrap">
              <img
                src={typeof selectedImage === 'string' ? selectedImage : productData.images[selectedImage]}
                alt={productData.title}
              />
            </div>
            {/* Horizontal thumb strip */}
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
            {/* Feature strip below thumbs */}
            <div className="feature-strip-wrap">
              <button className="feat-arrow" onClick={() => featureStripRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}>
                <IoIosArrowBack />
              </button>
              <div className="feature-strip" ref={featureStripRef}>
                {productData.features.map((f, idx) => (
                  <div key={idx} className="feature-item">
                    <div className="feature-circle">
                      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </div>
                    <div className="feature-text">
                      <strong>{f.title}</strong>
                      <span>{f.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="feat-arrow" onClick={() => featureStripRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}>
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </div>

        {/* Product Info Section */}
        <div className="product-info">
          {/* Wishlist icon */}
          <div className="product-actions-top">
            <div className="brand-name">{productData.brand}</div>
            <button
              className={`icon-btn wishlist-icon-btn ${productData.id && isInWishlist(productData.id) ? 'active' : ''}`}
              aria-label="Add to wishlist"
              onClick={() => {
                if (!productData.id) return;
                if (isInWishlist(productData.id)) {
                  removeFromWishlist(productData.id);
                } else {
                  addToWishlist({ ...productData, variationImages: [] });
                }
              }}
            >
              <FiHeart />
            </button>
          </div>
          <h1 className="product-title">{productData.title}</h1>

          {/* SKU + Rating row */}
          <div className="meta-row">
            <span className="sku-text">SKU: {productData.styleNo}</span>
            {productData.avgRating > 0 && (
              <span className="pd-rating-pill">
                <span className="rating-pill__star">★</span>
                <span className="rating-pill__score">{parseFloat(productData.avgRating).toFixed(1)}/5</span>
                {productData.reviewCount > 0 && (
                  <span className="rating-pill__count">{productData.reviewCount}</span>
                )}
              </span>
            )}
          </div>

          <div className="price-block">
            <div className="price-row">
              <div className="price-main">₹{productData.price.toFixed(2)}</div>
              {productData.comparePrice > 0 && (
                <div className="price-original">₹{productData.comparePrice.toFixed(2)}</div>
              )}
              <div className="price-note">MRP (Incl. Of All Taxes)</div>
            </div>
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
                onClick={() => {
                  setSelectedColor(idx);
                  if (color.mainImage) {
                    setSelectedImage(color.mainImage);
                  } else if (color.image) {
                    setSelectedImage(color.image.replace('width=108', 'width=560'));
                  }
                }}
              >
                <div className="color-img">
                  <img src={color.image} alt={color.name} />
                </div>
                <div className="color-name">{color.name}</div>
              </div>
            ))}
          </div>

          {/* Free Size button */}
          <div className="size-row">
            <button className="btn-freesize">FREE SIZE</button>
          </div>

          {/* Quantity + Add to Bag */}
          <div className="qty-row">
            <div className="qty-ctrl">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
              <div className="qty-val">{quantity}</div>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            <button className="btn-atb" onClick={handleAddToBag}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add to Bag
            </button>
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

      {/* Product Detail Tabs */}
      <div className="product-sections">
          {/* Product Description */}
          <div className="psec">
            <h2 className="psec-title">Product Description</h2>
            {productData.description ? (
              <div className="psec-desc-text" dangerouslySetInnerHTML={{ __html: productData.description }} />
            ) : (
              <ul className="psec-desc-list">
                <li>Tactel Microfiber Elastane Stretch Fabric</li>
                <li>Moisture Move Treatment to Wick Sweat Away</li>
                <li>Engineered to Prevent Ride Up</li>
                <li>Ultrasoft and Durable Waistband</li>
                <li>Label Free for All Day Comfort</li>
              </ul>
            )}
            <div className="ideal-row">
              <span className="ideal-label">Ideal For</span>
              <div className="ideal-chip"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><strong>Everyday Wear</strong></div>
              <div className="ideal-chip"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg><strong>Casual Wear</strong></div>
              <div className="ideal-chip"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg><strong>Work</strong></div>
            </div>
          </div>

          <div className="psec-divider" />

          {/* Washing Instructions */}
          <div className="psec">
            <h2 className="psec-title">Washing Instructions</h2>
            <div className="wash-box">
              {[
                { label: 'Gentle wash\n40°C' },
                { label: 'Do not\nbleach' },
                { label: 'Do not wring' },
                { label: 'Low dry in\nelastic' },
                { label: 'Low iron' },
                { label: 'Do not dry\nclean' },
                { label: 'Wash inside\nout with like\ncolours' },
                { label: 'Do not iron\non label' },
              ].map((item, idx) => (
                <div key={idx} className="wash-item">
                  <svg width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span style={{ whiteSpace: 'pre-line' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="psec-divider" />

          {/* Manufacturing Details */}
          <div className="psec">
            <h2 className="psec-title">Manufacturing Details</h2>
            <div className="mfg-row">
              <div className="mfg-address">
                Page Industries Ltd., Cessna Park, Umiya Bay, T-1, 7th Flr, ORR, Bengaluru - 560103,<br />
                Karnataka. CIN: L18101KA1994PLC016554
              </div>
              <div className="mfg-origin">
                <span className="origin-label">Country of Origin</span>
                <div className="origin-badge">
                  <svg width="24" height="16" fill="none" viewBox="0 0 24 16">
                    <rect width="24" height="16" fill="#FF9933"/>
                    <rect y="5.33" width="24" height="5.33" fill="#fff"/>
                    <rect y="10.67" width="24" height="5.33" fill="#138808"/>
                  </svg>
                  <span>India</span>
                </div>
              </div>
            </div>
          </div>

          {productData.reviews?.length > 0 && (
            <>
              <div className="psec-divider" />
              <div className="psec">
                <h2 className="psec-title">Customer Reviews</h2>
                <div className="pd-reviews-container">
                  {productData.reviews.length > 2 && (
                    <button className="slider-arrow slider-arrow-left" onClick={() => reviewSliderRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}>
                      <IoIosArrowBack />
                    </button>
                  )}
                  <div className="pd-reviews-slider" ref={reviewSliderRef}>
                    {productData.reviews.map((review, idx) => (
                      <div key={idx} className="testimonial-card">
                        <div className="reviewer-name">{review.reviewerName}</div>
                        <div className="testimonial-rating">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <span key={i} className="testimonial-star">★</span>
                          ))}
                        </div>
                        <p className="testimonial-text">{review.review}</p>
                      </div>
                    ))}
                  </div>
                  {productData.reviews.length > 2 && (
                    <button className="slider-arrow slider-arrow-right" onClick={() => reviewSliderRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}>
                      <IoIosArrowForward />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
      </div>

      {/* Sticky Bag Bar */}
      <div className={`sticky-bag ${showStickyBar ? 'visible' : ''}`}>
        <div className="sticky-product-info">
          <img
            className="sticky-img"
            src={typeof selectedImage === 'string' ? selectedImage : productData.images[0]}
            alt={productData.title}
          />
          <div>
            <div className="sticky-name">{productData.title}</div>
            <div className="sticky-color">{productData.colors[selectedColor]?.name}</div>
            <div className="sticky-price">₹{productData.price.toFixed(2)}</div>
          </div>
        </div>
        <div className="sticky-actions">
          <button className="btn-atb" onClick={handleAddToBag}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
              <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add to Bag
          </button>
          <button className="btn-buy">Buy Now</button>
        </div>
      </div>

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>✓ Added to Bag!</div>
    </div>
  );
};

export default ProductDetailsTest;
