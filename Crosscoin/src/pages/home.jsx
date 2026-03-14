"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from 'next/dynamic';
import Header from "../components/Header";
import HeroSlider from "../components/HeroSlider";
import ProductCard from "../components/ProductCard";
import SafeImage from "../components/common/SafeImage";
import ProductSkeleton from "../components/common/ProductSkeleton";
import FeaturedProductSkeleton from "../components/common/FeaturedProductSkeleton";
import SlidingCollection from "../components/SlidingCollection";
import UnlockedExclusives from "../components/UnlockedExclusives";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getPublicSliders, getPublicCategories, getPublicCategoryByName, getPublicProductReviews } from '../services/publicApi';
import SeoWrapper from '../console/SeoWrapper';

// Lazy load CouponStrip to prevent module-level side effects
const CouponStrip = dynamic(() => import("../components/CouponStrip"), {
  loading: () => null,
  ssr: true
});

// Import TrustBadges component
import TrustBadges from "../components/TrustBadges";

import { useRouter } from 'next/router';
import { fbqTrack } from '../components/common/Analytics';
import { showValidationErrorToast } from '../utils/toast';
import DOMPurify from 'dompurify';
import colorMap from '../components/products/colorMap';
import { seoService } from '../services/index';

// Load page-specific CSS
import '../styles/components/Footer.css';
import '../styles/components/Header.css';
import '../styles/components/Testimonials.css';
import '../styles/components/TrustBadges.css';
import '../styles/pages/Home.css';

// Lazy load below-the-fold components for better performance
const Footer = dynamic(() => import("../components/Footer"), {
  loading: () => <div style={{ minHeight: '200px', background: '#f9fafb' }} />
});

const Testimonials = dynamic(() => import("../components/Testimonials"), {
  loading: () => <div style={{ minHeight: '300px', background: '#fff' }} />
});

// Helper functions moved inside component for Fast Refresh compatibility
const Home = () => {
  // Helper functions
  const formatTwoDigits = (num) => num.toString().padStart(2, '0');

  const forceEnvImageBase = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    
    if (url.startsWith('http')) {
      if (url.includes('localhost:5000') || url.includes('localhost')) {
        const path = url.replace(/^https?:\/\/[^/]+/, '');
        return `${baseUrl}${path}`;
      }
      return url;
    }
    
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    return `${baseUrl}/${url}`;
  };
  const router = useRouter();
  const [slides, setSlides] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
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
  const [exclusiveProductsLoading, setExclusiveProductsLoading] = useState(true);
  const [categoryImageLoaded, setCategoryImageLoaded] = useState(false);
  const [latestProductsImageLoaded, setLatestProductsImageLoaded] = useState(false);
  const [seoData, setSeoData] = useState(null);
  
  const categorySliderRef = useRef(null);
  const latestSliderRef = useRef(null);
  const categoryImageRef = useRef(null);

  const [showCategoryArrows, setShowCategoryArrows] = useState(false);
  const [showLatestArrows, setShowLatestArrows] = useState(false);

  const apiCalledRef = useRef(false); // Add a ref to guard API calls

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
  // Removed this useEffect as it causes infinite re-renders
  // The thumbnail reset is now handled directly in the SKU change handler

  useEffect(() => {
    if (apiCalledRef.current) return; // Prevent multiple calls
    apiCalledRef.current = true;
    
    // ✅ PARALLELIZED: All 4 API calls run simultaneously
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setLatestProductsLoading(true);
        setExclusiveProductsLoading(true);

        // Execute all 4 API calls in parallel using Promise.all()
        const [slidersData, categoriesData, latestData, exclusiveData] = await Promise.all([
          // 1. Fetch sliders
          (async () => {
            try {
              return await getPublicSliders();
            } catch (error) {
              return [];
            }
          })(),

          // 2. Fetch categories
          (async () => {
            try {
              const data = await getPublicCategories();
              if (Array.isArray(data)) {
                return data;
              } else if (data && Array.isArray(data.categories)) {
                return data.categories;
              }
              return [];
            } catch (error) {
              return [];
            }
          })(),

          // 3. Fetch latest products
          (async () => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/products/public?limit=15&sort=newest`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Brand-Name': 'crosscoin'
                  }
                }
              );
              const data = await response.json();
              return (data.success && data.data.products) ? data.data.products : [];
            } catch (error) {
              return [];
            }
          })(),

          // 4. Fetch exclusive/featured products
          (async () => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/products/public?sort=featured&limit=3`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Brand-Name': 'crosscoin'
                  }
                }
              );
              const data = await response.json();
              return (data.success && data.data.products) ? data.data.products : [];
            } catch (error) {
              return [];
            }
          })()
        ]);

        // Set all data at once
        setSlides(slidersData);
        setCategories(categoriesData);
        setLatestProducts(latestData);

        // Process exclusive products
        if (exclusiveData && exclusiveData.length > 0) {
          setExclusiveProducts(exclusiveData);
        } else {
          setExclusiveProducts([]);
        }

        setLoading(false);
        setLatestProductsLoading(false);
        setExclusiveProductsLoading(false);
      } catch (error) {
        setLoading(false);
        setLatestProductsLoading(false);
        setExclusiveProductsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const fetchCategoryProducts = useCallback(async (categoryName) => {
    try {
      setCategoryLoading(true);
      const data = await getPublicCategoryByName(categoryName);
      setCurrentCategoryProducts(data.products || []);
    } catch (error) {
      setCurrentCategoryProducts([]);
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  // Handle category change when currentCategoryIndex changes
  useEffect(() => {
    if (categories.length > 0 && categories[currentCategoryIndex]) {
      fetchCategoryProducts(categories[currentCategoryIndex].name);
    }
  }, [currentCategoryIndex, categories, fetchCategoryProducts]);

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
    if (product && product.slug) {
      router.push(`/ProductDetails?slug=${product.slug}`);
    }
  };

  const currentCategory = categories[currentCategoryIndex] || {
    id: null,
    name: 'Loading...',
    image: null // No fallback image
  };

  // Get the image source with fallback - simple version
  const getCategoryImageSrc = () => {
    if (!currentCategory || !currentCategory.image) {
      return null; // No fallback image
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    const imageUrl = currentCategory.image;
    
    // If it's already a fallback asset, return it directly
    if (imageUrl.startsWith('/assets/')) {
      return imageUrl;
    }
    
    // If already a full URL, use it
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it starts with /uploads/, prepend base URL
    if (imageUrl.startsWith('/uploads/')) {
      return `${baseUrl}${imageUrl}`;
    }
    
    // Otherwise assume it's just a filename
    return `${baseUrl}/uploads/categories/${imageUrl}`;
  };

  return (
    <>
      <Header />
      <div className="home-page">
        <HeroSlider slides={slides} />
        <CouponStrip />
        <TrustBadges />
        <SlidingCollection collections={categories} />
        <UnlockedExclusives products={exclusiveProducts} />
        <div className="shop-by-category">
          <div className="latest-title">
            <h2 className="section-title">Latest Products</h2>
            <button className="hero-btn" onClick={() => window.location.href = '/Products'}>
              View All Products
            </button>
          </div>
          <div className="category-products">
            {latestProductsLoading ? (
              <div className="products-slider" ref={latestSliderRef}>
                {Array(8).fill(0).map((_, idx) => (
                  <ProductSkeleton key={`latest-skeleton-${idx}`} />
                ))}
              </div>
            ) : (
              <>
                {showLatestArrows && (
                  <button className="slider-arrow slider-arrow-left" aria-label="Previous latest product" onClick={() => scrollLatestSlider('left')}>
                    <IoIosArrowBack />
                  </button>
                )}
                <div className="products-slider" ref={latestSliderRef}>
                  {latestProducts.slice(0, 15).map((product) => {
                // Use centralized image selection
                const imageData = product.images?.[0] || product.image || null;
                
                // Get price from ProductVariations (API response structure)
                const firstVariation = product.ProductVariations?.[0] || product.variations?.[0];
                const productPrice = firstVariation?.price || product.price || 0;
                const productComparePrice = firstVariation?.comparePrice || product.comparePrice || 0;

                const formattedProduct = {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  description: product.description,
                  badge: product.badge || null,
                  images: imageData ? [imageData] : [],
                  price: productPrice,
                  comparePrice: productComparePrice,
                  variations: (product.ProductVariations || product.variations || []).length > 0 ? (product.ProductVariations || product.variations).map(variation => ({
                    id: variation.id,
                    sku: variation.sku,
                    price: variation.price || 0,
                    comparePrice: variation.comparePrice || 0,
                    stock: variation.stock || 0,
                    attributes: variation.attributes,
                    images: variation.images || []
                  })) : [{
                    id: null,
                    sku: null,
                    price: productPrice,
                    comparePrice: productComparePrice,
                    stock: 0,
                    attributes: {},
                    images: []
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
                  />
                );
              })}
                </div>
                {showLatestArrows && (
                  <button className="slider-arrow slider-arrow-right" aria-label="Next latest product" onClick={() => scrollLatestSlider('right')}>
                    <IoIosArrowForward />
                  </button>
                )}
              </>
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
