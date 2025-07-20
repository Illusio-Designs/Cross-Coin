"use client";
import React, { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Testimonials from "../components/Testimonials";
import ProductCard from "../components/ProductCard";
import Image from "next/image";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useCart } from '../context/CartContext';
import { getPublicSliders, getPublicCategories, getPublicCategoryByName, getPublicProductReviews } from '../services/publicindex';
import SeoWrapper from '../console/SeoWrapper';
import { useRouter } from 'next/navigation';
import { fbqTrack } from '../components/common/Analytics';
import DOMPurify from 'dompurify';
import colorMap from '../components/products/colorMap';
import { seoService } from '../services/index';

const formatTwoDigits = (num) => num.toString().padStart(2, '0');

function forceEnvImageBase(url) {
  if (!url || typeof url !== 'string') return '/assets/card1-left.webp';
  if (url.startsWith('http')) {
    if (url.includes('localhost:5000')) {
      const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      return `${baseUrl}${path}`;
    }
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
  return `${baseUrl}${url}`;
}

const Home = () => {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { addToCart } = useCart();
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentCategoryProducts, setCurrentCategoryProducts] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [latestProducts, setLatestProducts] = useState([]);
  const [latestProductsLoading, setLatestProductsLoading] = useState(false);
  const [exclusiveProducts, setExclusiveProducts] = useState([]);
  const [exclusiveStates, setExclusiveStates] = useState([]);
  const [exclusiveReviewCounts, setExclusiveReviewCounts] = useState([]);
  const [exclusiveAvgRatings, setExclusiveAvgRatings] = useState([]);
  const [exclusiveSelectedSkus, setExclusiveSelectedSkus] = useState([]);
  const [categoryImageLoaded, setCategoryImageLoaded] = useState(false);
  const [seoData, setSeoData] = useState(null);
  
  const categorySliderRef = useRef(null);
  const latestSliderRef = useRef(null);
  const categoryImageRef = useRef(null);
  const exclusiveSliderRef = useRef(null);

  const [showCategoryArrows, setShowCategoryArrows] = useState(false);
  const [showLatestArrows, setShowLatestArrows] = useState(false);

  const apiCalledRef = useRef(false); // Add a ref to guard API calls
  const seoApiCalledRef = useRef(false);

  // Helper to check if slider is scrollable (even if partially hidden)
  const checkSliderScrollable = (ref, setShow) => {
    if (ref.current) {
      setShow(ref.current.scrollWidth > ref.current.clientWidth + 1);
    }
  };

  // Check on mount, when products change, and on resize
  useEffect(() => {
    const handleResize = () => {
      checkSliderScrollable(categorySliderRef, setShowCategoryArrows);
      checkSliderScrollable(latestSliderRef, setShowLatestArrows);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentCategoryProducts, latestProducts]);

  // Reset thumbnail when selected SKU changes for exclusive products
  useEffect(() => {
    setExclusiveStates(prev => prev.map((state, index) => ({
      ...state,
      selectedThumbnail: 0
    })));
  }, [exclusiveSelectedSkus]);

  useEffect(() => {
    if (apiCalledRef.current) return; // Prevent multiple calls
    apiCalledRef.current = true;
    console.log('API BEING CALLED: home page data fetch');
    const fetchSliders = async () => {
      try {
        const data = await getPublicSliders();
        setSlides(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching sliders:', error);
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const data = await getPublicCategories();
        // Handle both array and object response
        if (Array.isArray(data)) {
        setCategories(data);
        } else if (data && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    };

    const fetchLatestProducts = async () => {
      try {
        setLatestProductsLoading(true);
        // Fetch latest products from all categories
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/public?limit=15&sort=newest`);
        const data = await response.json();
        if (data.success && data.data.products) {
          setLatestProducts(data.data.products);
        } else {
          setLatestProducts([]);
        }
      } catch (error) {
        console.error('Error fetching latest products:', error);
        setLatestProducts([]);
      } finally {
        setLatestProductsLoading(false);
      }
    };

    const fetchExclusiveProducts = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/public?sort=featured&limit=3`
        );
        const data = await response.json();
        if (data.success && data.data.products) {
          // Fetch full details for each product using getPublicProductBySlug
          const detailedProducts = await Promise.all(
            data.data.products.map(async (product) => {
              try {
                // Import here to avoid circular import issues
                const { getPublicProductBySlug } = await import('../services/publicindex');
                const detailResp = await getPublicProductBySlug(product.slug);
                if (detailResp && detailResp.success && detailResp.data) {
                  return detailResp.data;
                }
                return product; // fallback to original if failed
              } catch {
                return product;
              }
            })
          );
          setExclusiveProducts(detailedProducts);
          setExclusiveStates(detailedProducts.map(() => ({ selectedThumbnail: 0, selectedColor: '', selectedSize: '', quantity: 1 })));
          setExclusiveSelectedSkus(detailedProducts.map(product => 
            product.variations && product.variations.length > 0 ? product.variations[0].sku : ''
          ));
          // Fetch review counts and average ratings for each product
          const reviewStats = await Promise.all(
            detailedProducts.map(async (product) => {
              try {
                const reviewData = await getPublicProductReviews(product.id, { limit: 10 });
                const count = reviewData.total || (reviewData.reviews ? reviewData.reviews.length : 0);
                let avg = 0;
                if (reviewData.reviews && reviewData.reviews.length > 0) {
                  avg = reviewData.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewData.reviews.length;
                }
                return { count, avg };
              } catch {
                return { count: 0, avg: 0 };
              }
            })
          );
          setExclusiveReviewCounts(reviewStats.map(s => s.count));
          setExclusiveAvgRatings(reviewStats.map(s => s.avg));
        } else {
          setExclusiveProducts([]);
          setExclusiveStates([]);
          setExclusiveReviewCounts([]);
          setExclusiveAvgRatings([]);
          setExclusiveSelectedSkus([]);
        }
      } catch (error) {
        setExclusiveProducts([]);
        setExclusiveStates([]);
        setExclusiveReviewCounts([]);
        setExclusiveAvgRatings([]);
      }
    };

    fetchSliders();
    fetchCategories();
    fetchLatestProducts();
    fetchExclusiveProducts();
    // Fetch SEO data only once
    if (!seoApiCalledRef.current) {
      seoApiCalledRef.current = true;
      seoService.getSEOData('home').then(res => {
        setSeoData(res.data || res);
      });
    }
  }, []);

  const fetchCategoryProducts = async (categoryName) => {
    try {
      setCategoryLoading(true);
      const data = await getPublicCategoryByName(categoryName);
      setCurrentCategoryProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching category products:', error);
      setCurrentCategoryProducts([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    if (slides.length > 0) {
      const interval = setInterval(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [slides]);

  // Handle category change when currentCategoryIndex changes
  useEffect(() => {
    if (categories.length > 0 && categories[currentCategoryIndex]) {
      fetchCategoryProducts(categories[currentCategoryIndex].name);
    }
    // Only run when categories are loaded and currentCategoryIndex changes
  }, [currentCategoryIndex, categories.length]);

  useEffect(() => {
    // Set your target date here (e.g., 7 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate - now;
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    document.title = 'Cross Coin';
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/crosscoin icon.png';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const { days, hours, minutes, seconds } = timeLeft;

  const scrollSlider = (direction) => {
    const scrollAmount = 300;
    if (categorySliderRef.current) {
      if (direction === 'left') {
        categorySliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        categorySliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const scrollLatestSlider = (direction) => {
    const scrollAmount = 300;
    if (latestSliderRef.current) {
      if (direction === 'left') {
        latestSliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        latestSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const scrollFeaturedSlider = (direction) => {
    const slider = document.querySelector('.featured-products-slider');
    const scrollAmount = 1167; // Adjusted for featured product card width
    if (slider) {
      if (direction === 'left') {
        slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const scrollCategoryImage = (direction) => {
    if (direction === 'left') {
      setCurrentCategoryIndex(prev => prev > 0 ? prev - 1 : categories.length - 1);
    } else {
      setCurrentCategoryIndex(prev => prev < categories.length - 1 ? prev + 1 : 0);
    }
  };

  const handleCategoryChange = async (categoryName) => {
    await fetchCategoryProducts(categoryName);
  };

  const handleProductClick = (product) => {
    console.log('Product clicked:', product);
    if (product && product.slug) {
      router.push(`/ProductDetails?slug=${product.slug}`);
    } else {
      console.error('Product slug not found:', product);
    }
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    console.log('Add to cart:', product);
    // Get default color and size from the first variation
    const variation = product.variations?.[0];
    let defaultColor = '';
    let defaultSize = '';
    
    if (variation && variation.attributes) {
      const attrs = typeof variation.attributes === 'string' ? JSON.parse(variation.attributes) : variation.attributes;
      defaultColor = attrs.color?.[0] || '';
      defaultSize = attrs.size?.[0] || '';
    }
    
    addToCart(product, defaultColor, defaultSize, 1);
    fbqTrack('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
      quantity: 1,
    });
  };

  const handleBuyNow = (product, state) => {
    if (!state.selectedColor || !state.selectedSize) {
      alert('Please select both color and size');
      return;
    }
    addToCart(product, state.selectedColor, state.selectedSize, state.quantity);
    router.push('/checkout');
    fbqTrack('InitiateCheckout', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
      quantity: state.quantity,
    });
  };

  const currentCategory = categories[currentCategoryIndex] || {
    id: null,
    name: 'Loading...',
    image: '/assets/card1-left.webp'
  };

  // Get the image source with fallback
  const getCategoryImageSrc = () => {
    if (currentCategory && currentCategory.image) {
      const img = currentCategory.image;
      if (img.startsWith('http')) {
        return img;
      }
      // Remove any duplicate '/uploads/categories/' in the middle of the path
      const cleanedPath = img.replace(/(\/uploads\/categories\/)+/g, '/uploads/categories/');
      // Ensure only one slash between base URL and path
      let baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
      if (cleanedPath.startsWith('/')) {
        return `${baseUrl}${cleanedPath}`;
      }
      return `${baseUrl}/${cleanedPath}`;
    }
    return '/assets/card1-left.webp';
  };

  const scrollExclusiveSlider = (direction) => {
    const scrollAmount = 1167;
    if (exclusiveSliderRef.current) {
      if (direction === 'left') {
        exclusiveSliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        exclusiveSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Add renderStars function from ProductDetails.jsx
  const renderStars = (rating) => {
    const totalStars = 5;
    const roundedRating = Math.round(rating || 0);
    const stars = [];
    for (let i = 0; i < totalStars; i++) {
      stars.push(i < roundedRating ? '★' : '☆');
    }
    return stars.join(' ');
  };

  return (
    <>
      <Header />
      <div className="home-page">
        <div className="hero-slider">
          {slides.length > 0 ? (
            <div className="hero-slide" key={current}>
              <div className="hero-slide__image">
                <Image 
                  src={slides[current].image} 
                  alt={slides[current].title} 
                  fill
                  priority
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="hero-slide__content">
                <div className="hero-slide__content-text">
                  <h1>{slides[current].title} <span className="highlight">{slides[current].highlight}</span></h1>
                  <p>{slides[current].description}</p>
                  <button className="hero-btn">{slides[current].buttonText}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-slides">No slides available</div>
          )}
          <div className="hero-slider__nav">
            {slides.map((_, idx) => (
              <span key={idx} className={`dot${idx === current ? ' active' : ''}`} onClick={() => setCurrent(idx)}></span>
            ))}
          </div>
        </div>
        <div className="trust-badges">
          <div className="trust-badges__container">
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#CE1E36' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Premium Quality</h3>
              <p>Handcrafted with finest materials</p>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#180D3E' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Secure Shopping</h3>
              <p>100% safe & encrypted checkout</p>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#CE1E36' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Fast Delivery</h3>
              <p>Worldwide shipping available</p>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#180D3E' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM13 16h-2v2h2v-2zm0-6h-2v4h2v-4z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Authentic Products</h3>
              <p>Genuine Cross Coin merchandise</p>
            </div>
          </div>
        </div>
        <div className="shop-by-category">
          <div className="shop-by-category__container">
            <div className="category-title">
            <h2 className="section-title">Curate Your Collection</h2>
            <button className="hero-btn" onClick={() => {
              if (currentCategory.name) {
                window.location.href = `/Products?category=${encodeURIComponent(currentCategory.name)}`;
              } else {
                window.location.href = '/Products';
              }
            }}>
              View All Products
            </button>
          </div>
          <div className="category-section">
            <div className="category-sidebar">
              <div className="category-item" ref={categoryImageRef}>
                <button className="slider-arrow slider-arrow-left" aria-label="Previous category" onClick={() => scrollCategoryImage('left')}>
                  <IoIosArrowBack />
                </button>
                <div style={{ position: 'relative', width: 350 }}>
                  {getCategoryImageSrc() ? (
                    <>
                      <img
                        src={getCategoryImageSrc()}
                        alt={currentCategory.name || 'Category'}
                        width={350}
                        height={400}
                        style={{
                          background: '#eee',
                          display: 'block',
                          filter: categoryImageLoaded ? 'none' : 'grayscale(1)'
                        }}
                        onLoad={() => setCategoryImageLoaded(true)}
                        onError={() => setCategoryImageLoaded(true)}
                      />
                      {!categoryImageLoaded && (
                        <div className="shimmer-placeholder" style={{ width: 350, height: 400, position: 'absolute', top: 0, left: 0 }}></div>
                      )}
                    </>
                  ) : (
                    <div style={{ width: 300, height: 300, background: '#eee', borderRadius: 8 }}></div>
                  )}
                </div>
                <h3>{currentCategory.name}</h3>
                <button className="slider-arrow slider-arrow-right" aria-label="Next category" onClick={() => scrollCategoryImage('right')}>
                  <IoIosArrowForward />
                </button>
              </div>
            </div>
            <div className="category-products">
              {currentCategoryProducts.length > 0 && (
                <>
                    {showCategoryArrows && (
                    <button className="slider-arrow slider-arrow-left" aria-label="Previous slider" onClick={() => scrollSlider('left')}>
                      <IoIosArrowBack />
                    </button>
                  )}
                  <div className="products-slider" ref={categorySliderRef}>
                    {currentCategoryProducts.map((product) => {
                      let imagesArr = [];
                      if (Array.isArray(product.images) && product.images.length > 0) {
                        imagesArr = product.images.map(img => {
                          let imageUrl = img.image_url || img.url || img;
                          if (!imageUrl) {
                            imageUrl = 'null';
                          } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                            imageUrl = `/uploads/products/${imageUrl}`;
                          }
                          return {
                            image_url: imageUrl,
                            is_primary: img.is_primary
                          };
                        });
                      } else if (product.image) {
                        let imageUrl = product.image;
                        if (!imageUrl) {
                          imageUrl = 'null';
                        } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                          imageUrl = `/uploads/products/${imageUrl}`;
                        }
                        imagesArr = [{ image_url: imageUrl }];
                      } else {
                        imagesArr = [{ image_url: 'null' }];
                      }
                      const formattedProduct = {
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        description: product.description,
                        badge: product.badge || null,
                        images: imagesArr,
                        variations: [{
                          price: product.price || 0,
                          comparePrice: product.comparePrice || 0,
                          stock: product.stock || 0
                        }],
                        category: {
                          name: currentCategory.name
                        }
                      };
                      
                      return (
                        <ProductCard
                          key={product.id}
                          product={formattedProduct}
                          onProductClick={handleProductClick}
                          onAddToCart={handleAddToCart}
                        />
                      );
                    })}
                  </div>
                    {showCategoryArrows && (
                    <button className="slider-arrow slider-arrow-right" aria-label="Next slider" onClick={() => scrollSlider('right')}>
                      <IoIosArrowForward />
                    </button>
                  )}
                </>
              )}
              {!categoryLoading && currentCategoryProducts.length === 0 && (
                <div className="no-products-center">
                  <p style={{ color: '#CE1E36', fontSize: '1.2rem', fontWeight: '500' }}>
                    No products available in this category
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
        <div className="featured-products-section">
          <h2 className="section-title">Unlocked Exclusives</h2>
          <div className="featured-products-container">
            {exclusiveProducts.length > 0 && (
              <button className="slider-arrow slider-arrow-left" aria-label="Previous exclusive product" onClick={() => scrollExclusiveSlider('left')}>
                <IoIosArrowBack />
              </button>
            )}
            <div className="featured-products-slider" ref={exclusiveSliderRef}>
              {exclusiveProducts.map((product, index) => {
                const state = exclusiveStates[index] || { selectedThumbnail: 0, selectedColor: '', selectedSize: '', quantity: 1 };
                const selectedSku = exclusiveSelectedSkus[index] || '';
                const selectedVariation = product.variations?.find(v => v.sku === selectedSku) || product.variations?.[0];
                const variationImages = selectedVariation?.images && selectedVariation.images.length > 0
                  ? selectedVariation.images.map(img => img.image_url)
                  : (product.images && product.images.length > 0 ? product.images.map(img => img.image_url) : ['/assets/card1-left.webp']);
                const attrs = selectedVariation && typeof selectedVariation.attributes === 'string'
                  ? JSON.parse(selectedVariation.attributes)
                  : selectedVariation?.attributes || {};
                const reviewCount = exclusiveReviewCounts[index] !== undefined ? exclusiveReviewCounts[index] : 0;
                const avgRating = exclusiveAvgRatings[index] !== undefined ? exclusiveAvgRatings[index] : 0;
                // Collect all unique attribute keys from all variations
                const allAttributeKeys = product.variations
                  ? Array.from(new Set(product.variations.flatMap(v => {
                      const a = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
                      return a ? Object.keys(a) : [];
                    }))).sort()
                  : [];
                // For included colors (for color dots)
                const includedColors = Array.isArray(attrs.color) ? attrs.color : [];
                // For pack selection
                const hasPacks = product.variations && product.variations.length > 1;
                // Size selection logic
                const selectedSizeForPack = state.selectedSize || (Array.isArray(attrs.size) ? attrs.size[0] : '');
                // Color selection logic
                const colorOptions = product.variations
                  ? Array.from(new Set(product.variations.flatMap(v => {
                      const a = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
                      return a && a.color ? a.color : [];
                    })))
                  : [];
                // Size options for current variation
                const sizeOptions = Array.isArray(attrs.size) ? attrs.size : [];
                return (
                  <div key={product.id} className="featured-product-card">
                    <div className="product-images">
                      <Image
                        className="main-image"
                        src={forceEnvImageBase(variationImages[state.selectedThumbnail])}
                        alt={product.name}
                        width={400}
                        height={400}
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                      <div className="thumbnail-images">
                        {variationImages.map((src, idx) => (
                          <Image
                            key={idx}
                            src={forceEnvImageBase(src)}
                            alt={`${product.name} thumbnail ${idx + 1}`}
                            className={state.selectedThumbnail === idx ? 'active' : ''}
                            onClick={() => {
                              setExclusiveStates(prev => prev.map((s, i) => i === index ? { ...s, selectedThumbnail: idx } : s));
                            }}
                            width={60}
                            height={60}
                            style={{ objectFit: 'cover' }}
                            unoptimized
                          />
                        ))}
                      </div>
                    </div>
                    <div className="product-info">
                      {/* Title, price, review */}
                      <div className="product-title-row">
                        <div>
                          <h1 className="product-title">{product.name}</h1>
                          <div className="product-price-row">
                            <span className="current-price">₹{selectedVariation.price}</span>
                            {selectedVariation.comparePrice && (
                              <span className="original-price">₹{selectedVariation.comparePrice}</span>
                            )}
                            <span className="review-summary">
                              <span className="stars">{renderStars(avgRating)}</span>
                              <span className="rating-value">{parseFloat(avgRating || 0).toFixed(1)}</span>
                              <span className="review-count">({reviewCount} reviews)</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Details section */}
                      <div className="product-details-section">
                        <div className="details-heading">Details</div>
                        <div className="details-table">
                          <div className="details-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', alignItems: 'start' }}>
                            {allAttributeKeys.map((key) => (
                              <div key={key} style={{ minWidth: 120 }}>
                                <span className="details-label" style={{ textTransform: 'capitalize' }}>{key}:</span>
                                <span className="details-value">{key === 'size' ? selectedSizeForPack : (Array.isArray(attrs[key]) ? attrs[key].join(', ') : (attrs[key] ?? '-'))}</span>
                              </div>
                            ))}
                            <div>
                              <span className="details-label">SKU:</span>
                              <span className="details-value">{selectedSku || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Color selection */}
                      {product.variations && product.variations.length > 1 && colorOptions.length > 0 && (
                        <div className="select-color-section">
                          <strong>Select Color:</strong>
                          <div className="select-color-options">
                            {product.variations.map((variation) => {
                              const attrs = typeof variation.attributes === 'string' ? JSON.parse(variation.attributes) : variation.attributes;
                              const colors = Array.isArray(attrs?.color) ? attrs.color : [];
                              return (
                                <button
                                  key={variation.sku}
                                  className={`color-swatch-btn color-pack-btn${selectedSku === variation.sku ? ' selected' : ''}`}
                                  onClick={() => {
                                    setExclusiveSelectedSkus(prev => prev.map((sku, i) => i === index ? variation.sku : sku));
                                    setExclusiveStates(prev => prev.map((s, i) => i === index ? { ...s, selectedThumbnail: 0 } : s));
                                  }}
                                  aria-label={`Select pack with colors: ${colors.join(', ')}`}
                                  type="button"
                                >
                                  <div className="color-pack-swatch-row">
                                    {colors.map((color, cidx) => (
                                      <span
                                        key={color + cidx}
                                        className="color-swatch"
                                        style={{ backgroundColor: colorMap[color.toLowerCase()] || '#ccc' }}
                                        title={color}
                                      />
                                    ))}
                                  </div>
                                  <span className="color-pack-count">{colors.length > 1 ? `Pack of ${colors.length}` : colors[0]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Size selection */}
                      {sizeOptions.length > 1 && (
                        <div className="select-size-section">
                          <strong>Select Size:</strong>
                          <div className="select-size-options">
                            {sizeOptions.map((size) => (
                              <button
                                key={size}
                                className={`size-swatch-btn${selectedSizeForPack === size ? ' selected' : ''}`}
                                onClick={() => setExclusiveStates(prev => prev.map((s, i) => i === index ? { ...s, selectedSize: size } : s))}
                                type="button"
                                aria-label={`Select size ${size}`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Quantity and Action Buttons Section */}
                      <div className="quantity-section">
                        <div className="details-heading">Quantity:</div>
                        <div className="quantity-box">
                          <button className="quantity-btn" onClick={() => setExclusiveStates(prev => prev.map((s, i) => i === index ? { ...s, quantity: Math.max(1, s.quantity - 1) } : s))}>-</button>
                          <span className="quantity-value">{state.quantity}</span>
                          <button className="quantity-btn" onClick={() => setExclusiveStates(prev => prev.map((s, i) => i === index ? { ...s, quantity: s.quantity + 1 } : s))}>+</button>
                        </div>
                      </div>
                      <div className="action-buttons-row">
                        <button className="add-to-cart-btn" onClick={e => handleAddToCart(e, product)}>
                          ADD TO CART
                        </button>
                        <button className="buy-now-btn" onClick={() => handleBuyNow(product, state)}>
                          BUY IT NOW
                        </button>
                      </div>
                      {/* Full Description */}
                      <div className="details-row">
                        <div>
                          <div className="details-heading">Description:</div>
                          <span className="details-value" dangerouslySetInnerHTML={{
                            __html: product.description ? DOMPurify.sanitize(product.description) : '-'
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {exclusiveProducts.length > 0 && (
              <button className="slider-arrow slider-arrow-right" aria-label="Next exclusive product" onClick={() => scrollExclusiveSlider('right')}>
                <IoIosArrowForward />
              </button>
            )}
            {exclusiveProducts.length === 0 && <div>No exclusive products available.</div>}
          </div>
        </div>
        <div className="shop-by-category">
          <div className="latest-title">
            <h2 className="section-title">Latest Products</h2>
            <button className="hero-btn" onClick={() => window.location.href = '/Products'}>
              View All Products
            </button>
          </div>
          <div className="category-products">
            {showLatestArrows && (
              <button className="slider-arrow slider-arrow-left" aria-label="Previous latest product" onClick={() => scrollLatestSlider('left')}>
                <IoIosArrowBack />
              </button>
            )}
            <div className="products-slider" ref={latestSliderRef}>
              {latestProducts.slice(0, 15).map((product) => {
                let imagesArr = [];
                if (Array.isArray(product.images) && product.images.length > 0) {
                  imagesArr = product.images.map(img => {
                    let imageUrl = img.image_url || img.url || img;
                    if (!imageUrl) {
                      imageUrl = '/assets/card1-left.webp';
                    } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                      imageUrl = `/uploads/products/${imageUrl}`;
                    }
                    return {
                      image_url: imageUrl,
                      is_primary: img.is_primary
                    };
                  });
                } else if (product.image) {
                  let imageUrl = product.image;
                  if (!imageUrl) {
                    imageUrl = '/assets/card1-left.webp';
                  } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                    imageUrl = `/uploads/products/${imageUrl}`;
                  }
                  imagesArr = [{ image_url: imageUrl }];
                } else {
                  imagesArr = [{ image_url: '/assets/card1-left.webp' }];
                }
                const formattedProduct = {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  description: product.description,
                  badge: product.badge || null,
                  images: imagesArr,
                  variations: product.variations && product.variations.length > 0 ? product.variations.map(variation => ({
                    price: variation.price || 0,
                    comparePrice: variation.comparePrice || 0,
                    stock: variation.stock || 0
                  })) : [{
                    price: 0,
                    comparePrice: 0,
                    stock: 0
                  }],
                  category: {
                    name: product.category?.name || 'Uncategorized'
                  }
                };
                
                return (
                  <ProductCard
                    key={product.id}
                    product={formattedProduct}
                    onProductClick={handleProductClick}
                    onAddToCart={handleAddToCart}
                  />
                );
              })}
            </div>
            {showLatestArrows && (
              <button className="slider-arrow slider-arrow-right" aria-label="Next latest product" onClick={() => scrollLatestSlider('right')}>
                <IoIosArrowForward />
              </button>
            )}
          </div>
        </div>
        <Testimonials />
      </div>
      <Footer collections={categories} />
    </>
  );
};

export default Home;
