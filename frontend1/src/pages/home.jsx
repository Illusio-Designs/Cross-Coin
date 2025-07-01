"use client";
import React, { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Testimonials from "../components/Testimonials";
import ProductCard from "../components/ProductCard";
import Image from "next/image";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useCart } from '../context/CartContext';
import { getPublicSliders, getPublicCategories, getPublicCategoryByName } from '../services/publicindex';
import SeoWrapper from '../console/SeoWrapper';
import { useRouter } from 'next/navigation';
import { fbqTrack } from '../components/common/Analytics';

const formatTwoDigits = (num) => num.toString().padStart(2, '0');

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
  
  const categorySliderRef = useRef(null);
  const latestSliderRef = useRef(null);
  const categoryImageRef = useRef(null);

  useEffect(() => {
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
          setExclusiveProducts(data.data.products);
        } else {
          setExclusiveProducts([]);
        }
      } catch (error) {
        setExclusiveProducts([]);
      }
    };

    fetchSliders();
    fetchCategories();
    fetchLatestProducts();
    fetchExclusiveProducts();
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

  const handleBuyNow = () => {
    if (!selectedColor || !selectedSize) {
      alert('Please select both color and size');
      return;
    }
    addToCart(product, selectedColor, selectedSize, quantity);
    router.push('/checkout');
    fbqTrack('InitiateCheckout', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
      quantity,
    });
  };

  const currentCategory = categories[currentCategoryIndex] || {
    id: null,
    name: 'Loading...',
    image: '/assets/card1-left.webp'
  };

  // Get the image source with fallback
  const getCategoryImageSrc = () => {
    if (currentCategory.image && currentCategory.image !== '/assets/card1-left.webp') {
      // If it's a full URL, use it as is
      if (currentCategory.image.startsWith('http')) {
        return currentCategory.image;
      }
      // If it's a relative path, construct the full URL
      if (currentCategory.image.startsWith('/uploads/')) {
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${currentCategory.image}`;
      }
      // If it's just a filename, construct the path
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/uploads/categories/${currentCategory.image}`;
    }
    return '/assets/card1-left.webp';
  };

  return (
    <SeoWrapper pageName="home">
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
          <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', marginBottom: '3rem' , gap: '17rem' }}>
            <h2 className="section-title">Curate Your Collection</h2>
            <button className="hero-btn" onClick={() => {
              if (currentCategory.id) {
                window.location.href = `/Products?category=${currentCategory.id}`;
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
                <Image 
                  src={getCategoryImageSrc()} 
                  alt={currentCategory.name} 
                  width={300}
                  height={300}
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
                <h3>{currentCategory.name}</h3>
                <button className="slider-arrow slider-arrow-right" aria-label="Next category" onClick={() => scrollCategoryImage('right')}>
                <IoIosArrowForward />
              </button>
              </div>
            </div>
            <div className="category-products">
              {currentCategoryProducts.length > 0 && (
                <>
                  {currentCategoryProducts.length > 2 && (
                    <button className="slider-arrow slider-arrow-left" aria-label="Previous slider" onClick={() => scrollSlider('left')}>
                      <IoIosArrowBack />
                    </button>
                  )}
                  <div className="products-slider" ref={categorySliderRef}>
                    {currentCategoryProducts.map((product) => {
                      // Format product data to match ProductCard expectations
                      const formattedProduct = {
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        description: product.description,
                        badge: product.badge || null,
                        images: product.image ? [{
                          image_url: product.image,
                          is_primary: true
                        }] : [],
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
                  {currentCategoryProducts.length > 2 && (
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
        <div className="featured-products-section">
          <h2 className="section-title">Unlocked Exclusives</h2>
          <div className="featured-products-container">
            {exclusiveProducts.length > 0 ? (
              exclusiveProducts.map((product) => (
                <div key={product.id} className="featured-product-card">
                  <div className="product-images">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        className="main-image"
                        src={product.images[0].image_url}
                        alt={product.name}
                        width={400}
                        height={400}
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    ) : (
                      <div style={{ width: 400, height: 400, background: '#f3f3f3' }} />
                    )}
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <div className="product-rating-row">
                      <span className="stars">★ ★ ★ ★ ☆</span>
                      <span className="rating-value">{product.rating || ''}</span>
                      <span className="review-count">({product.reviews || 0} reviews)</span>
                    </div>
                    <div className="product-price-row">
                      <span className="current-price">₹{product.price || (product.variations && product.variations[0]?.price) || ''}</span>
                      <span className="original-price">{product.comparePrice || (product.variations && product.variations[0]?.comparePrice) ? `₹${product.comparePrice || product.variations[0]?.comparePrice}` : ''}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div>No exclusive products available.</div>
            )}
          </div>
        </div>
        <div className="shop-by-category">
          <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', marginBottom: '3rem', gap: '20rem' }}>
            <h2 className="section-title">Latest Products</h2>
            <button className="hero-btn" onClick={() => window.location.href = '/Products'}>
              View All Products
            </button>
          </div>
          <div className="category-products">
            {latestProducts.length > 2 && (
              <button className="slider-arrow slider-arrow-left" aria-label="Previous latest product" onClick={() => scrollLatestSlider('left')}>
                <IoIosArrowBack />
              </button>
            )}
            <div className="products-slider" ref={latestSliderRef}>
              {latestProducts.slice(0, 15).map((product) => {
                // Format product data to match ProductCard expectations
                const formattedProduct = {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  description: product.description,
                  badge: product.badge || null,
                  images: product.images && product.images.length > 0 ? product.images.map(img => ({
                    image_url: img.image_url,
                    is_primary: img.is_primary
                  })) : [],
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
            {latestProducts.length > 2 && (
              <button className="slider-arrow slider-arrow-right" aria-label="Next latest product" onClick={() => scrollLatestSlider('right')}>
                <IoIosArrowForward />
              </button>
            )}
          </div>
        </div>
        <Testimonials />
        <div className="summer-collections-section">
        <div className="summer-collections-content">
          <h2><span className="summer-highlight">SUMMER</span> COLLECTIONS</h2>
          <button className="summer-shop-btn">SHOP NOW &rarr;</button>
        </div>
        <div className="summer-countdown">
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(days)}</div>
              <div className="summer-countdown-label">Days</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(hours)}</div>
              <div className="summer-countdown-label">Hours</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(minutes)}</div>
              <div className="summer-countdown-label">Minutes</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(seconds)}</div>
              <div className="summer-countdown-label">Seconds</div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </SeoWrapper>
  );
};

export default Home;
