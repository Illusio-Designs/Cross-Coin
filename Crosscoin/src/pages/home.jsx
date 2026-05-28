import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from 'next/dynamic';
import HeroSlider from "../components/products/HeroSlider";
import ProductCard from "../components/products/ProductCard";
import Skeleton from "../components/common/Skeleton";
import SlidingCollection from "../components/products/SlidingCollection";
import UnlockedExclusives from "../components/common/UnlockedExclusives";
import InfiniteReviewsSlider from "../components/common/InfiniteReviewsSlider";
import LookbookShowcase from "../components/common/LookbookShowcase";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useCart } from '../context/CartContext';
import { getPublicSliders, getPublicCategories, getPublicCategoryByName, getAllPublicReviews } from '../services/publicApi';
import { fbqTrack } from '../utils/fbqTrack';
import { gtagTrack } from '../utils/gtagTrack';

// Lazy load CouponStrip to prevent module-level side effects
const CouponStrip = dynamic(() => import("../components/common/CouponStrip"), {
  loading: () => null,
  ssr: false
});

import TrustBadges from "../components/common/TrustBadges";

import { useRouter } from 'next/router';

// Lazy load below-the-fold components for better performance
const BlogSection = dynamic(() => import("../components/blog/BlogSection"), {
  loading: () => <div style={{ minHeight: '400px', background: '#fff' }} />,
  ssr: false
});

const Home = () => {
  const router = useRouter();
  const { addToCart } = useCart();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentCategoryProducts, setCurrentCategoryProducts] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [latestProductsLoading, setLatestProductsLoading] = useState(false);
  const [exclusiveProducts, setExclusiveProducts] = useState([]);
  const [exclusiveProductsLoading, setExclusiveProductsLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  
  const categorySliderRef = useRef(null);
  const latestSliderRef = useRef(null);

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
        const [slidersData, categoriesData, latestData, exclusiveData, reviewsData] = await Promise.all([
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
                `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/products/catalog?limit=15&sort=newest`,
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
                `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/products/catalog?sort=featured&limit=100`,
                {
                  cache: 'no-store',
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

          // 5. Fetch reviews
          (async () => {
            try {
              return await getAllPublicReviews({ limit: 30, sort: 'highest' });
            } catch (error) {
              return [];
            }
          })()
        ]);

        // Set all data at once
        setSlides(slidersData);
        setCategories(categoriesData);
        setLatestProducts(latestData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : (reviewsData?.reviews || reviewsData?.data || []));

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
      const data = await getPublicCategoryByName(categoryName);
      setCurrentCategoryProducts(data.products || []);
    } catch (error) {
      setCurrentCategoryProducts([]);
    }
  }, []);

  // Handle category change when currentCategoryIndex changes
  useEffect(() => {
    if (categories.length > 0 && categories[currentCategoryIndex]) {
      fetchCategoryProducts(categories[currentCategoryIndex].name);
    }
  }, [currentCategoryIndex, categories, fetchCategoryProducts]);

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

  const handleProductClick = (product) => {
    if (product && product.slug) {
      router.push(`/ProductDetails?slug=${product.slug}`);
    }
  };

  return (
    <main className="home-page" role="main">
        <section aria-label="Featured Promotions">
          <HeroSlider slides={slides} />
          <CouponStrip />
          <TrustBadges />
        </section>
        <section aria-label="Shop By Category">
          <SlidingCollection collections={categories} isLoading={loading} />
        </section>
        <section aria-label="Exclusive Offers">
          <UnlockedExclusives products={exclusiveProducts} loading={exclusiveProductsLoading} />
        </section>
        <section className="shop-by-category" aria-label="Latest Products">
          <div className="latest-title">
            <div className="section-header-inline">
              <h2 className="section-header-h2">Latest <strong>Products</strong></h2>
              <p className="section-header-sub">Fresh drops, just in</p>
            </div>
            <button
              className="hero-btn"
              onClick={() => window.location.href = '/Products'}
              aria-label="View all products catalog"
            >
              View All Products
            </button>
          </div>
          <div className="category-products">
            {latestProductsLoading ? (
              <div className="products-slider" ref={latestSliderRef} role="status" aria-label="Loading latest products">
                {Array(8).fill(0).map((_, idx) => (
                  <Skeleton key={`latest-skeleton-${idx}`} type="product" />
                ))}
              </div>
            ) : (
              <>
                <div
                  className="products-slider latest-products-scroll"
                  ref={latestSliderRef}
                  role="region"
                  aria-label="Latest products carousel"
                  aria-live="polite"
                >
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
                    onAddToCart={(e, prod, color, size, variationId) => {
                      addToCart(prod, color, size, 1, variationId, prod.images?.map(i => i.image_url || i) || []);
                      fbqTrack('AddToCart', {
                        content_ids: [variationId ? `${prod.id}_${variationId}` : String(prod.id)],
                        content_name: prod.name,
                        content_type: 'product',
                        value: parseFloat(prod.price || 0),
                        currency: 'INR',
                      });
                      gtagTrack('add_to_cart', {
                        currency: 'INR',
                        value: parseFloat(prod.price || 0),
                        items: [{ item_id: String(prod.id), item_name: prod.name, price: parseFloat(prod.price || 0), quantity: 1 }],
                      });
                    }}
                  />
                );
                  })}
                </div>
                {showLatestArrows && (
                  <div className="slider-controls" role="group" aria-label="Latest products navigation">
                    <button
                      onClick={() => scrollLatestSlider('left')}
                      aria-label="Scroll latest products left"
                      className="slider-arrow slider-arrow-left"
                    >
                      <IoIosArrowBack />
                    </button>
                    <button
                      onClick={() => scrollLatestSlider('right')}
                      aria-label="Scroll latest products right"
                      className="slider-arrow slider-arrow-right"
                    >
                      <IoIosArrowForward />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        <section className="home-lookbook-section" aria-label="Lookbook Gallery">
          <div className="home-reviews-header">
            <h2 className="section-header-h2">Shop the <strong>Look</strong></h2>
            <p className="section-header-sub">Tap the hotspots to shop directly from the look</p>
          </div>
          <LookbookShowcase />
        </section>
        <section className="home-reviews-section" aria-label="Customer Reviews">
          <div className="home-reviews-header">
            <h2 className="section-header-h2">Customer <strong>Reviews</strong></h2>
            <p className="section-header-sub">What our customers are saying</p>
          </div>
          <InfiniteReviewsSlider reviews={reviews} />
        </section>
        <section aria-label="Blog Articles">
          <BlogSection />
        </section>
      </main>
    );
};

export default Home;
