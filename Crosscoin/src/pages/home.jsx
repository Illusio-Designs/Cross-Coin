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
import { gtagAdsConversion } from '../utils/gtagAdsConversion';

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

const Home = ({ initialData = {} }) => {
  const router = useRouter();
  const { addToCart } = useCart();
  // Seed above-the-fold state from the server-rendered props so the hero,
  // categories, and latest products are painted from the initial HTML instead
  // of after a client-side fetch. Falls back to empty arrays (client fetch) if
  // the SSR fetch returned nothing.
  const [slides, setSlides] = useState(initialData.slides || []);
  const [loading, setLoading] = useState(!(initialData.categories?.length));
  const [categories, setCategories] = useState(initialData.categories || []);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentCategoryProducts, setCurrentCategoryProducts] = useState([]);
  const [latestProducts, setLatestProducts] = useState(initialData.latestProducts || []);
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

    // The hero slides, categories, and latest products are already seeded from
    // getServerSideProps, so only fetch the pieces the server didn't provide
    // (a rare fallback if an upstream call failed) plus the below-the-fold data
    // (exclusive products + reviews) that isn't part of the initial paint.
    const needSliders = !(slides && slides.length > 0);
    const needCategories = !(categories && categories.length > 0);
    const needLatest = !(latestProducts && latestProducts.length > 0);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

    const fetchAllData = async () => {
      try {
        if (needCategories) setLoading(true);
        if (needLatest) setLatestProductsLoading(true);

        // Only the above-the-fold pieces are fetched on mount — and only when
        // SSR didn't already provide them (the common case resolves instantly
        // from props). The below-the-fold Exclusive Offers strip and Reviews
        // are deferred to an IntersectionObserver (see the effect below) so
        // they don't add two API round-trips to every initial load.
        const [slidersData, categoriesData, latestData] = await Promise.all([
          // 1. Sliders (only if SSR didn't provide them)
          needSliders
            ? getPublicSliders().catch(() => [])
            : Promise.resolve(slides),

          // 2. Categories (only if SSR didn't provide them)
          needCategories
            ? getPublicCategories()
                .then((data) =>
                  Array.isArray(data) ? data : (data && Array.isArray(data.categories) ? data.categories : [])
                )
                .catch(() => [])
            : Promise.resolve(categories),

          // 3. Latest products (only if SSR didn't provide them)
          needLatest
            ? fetch(`${API_BASE}/api/products/catalog?limit=15&sort=newest`, {
                headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'crosscoin' },
              })
                .then((r) => r.json())
                .then((data) => (data.success && data.data.products ? data.data.products : []))
                .catch(() => [])
            : Promise.resolve(latestProducts),
        ]);

        if (needSliders) setSlides(slidersData);
        if (needCategories) setCategories(categoriesData);
        if (needLatest) setLatestProducts(latestData);

        setLoading(false);
        setLatestProductsLoading(false);
      } catch (error) {
        setLoading(false);
        setLatestProductsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // ── Defer below-the-fold data until its section nears the viewport ──────────
  // The Exclusive Offers strip and the Reviews slider are never part of the
  // first paint, so fetching them on mount just adds two round-trips that
  // compete with the critical render. Instead we load each the moment its
  // section is within 400px of the viewport (or immediately if it's already on
  // screen). A no-IntersectionObserver fallback loads both on first scroll.
  const exclusivesSectionRef = useRef(null);
  const reviewsSectionRef = useRef(null);
  const exclusivesLoadedRef = useRef(false);
  const reviewsLoadedRef = useRef(false);

  const loadExclusives = useCallback(async () => {
    if (exclusivesLoadedRef.current) return;
    exclusivesLoadedRef.current = true;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    setExclusiveProductsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/products/catalog?sort=featured&limit=24`, {
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'crosscoin' },
      });
      const data = await r.json();
      setExclusiveProducts(data.success && data.data.products ? data.data.products : []);
    } catch {
      setExclusiveProducts([]);
    } finally {
      setExclusiveProductsLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    if (reviewsLoadedRef.current) return;
    reviewsLoadedRef.current = true;
    try {
      const r = await getAllPublicReviews({ limit: 30, sort: 'highest' });
      setReviews(Array.isArray(r) ? r : (r?.reviews || r?.data || []));
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    const targets = [
      [exclusivesSectionRef.current, loadExclusives],
      [reviewsSectionRef.current, loadReviews],
    ].filter(([el]) => el);
    if (targets.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: load both once the user scrolls at all.
      const onScroll = () => {
        loadExclusives();
        loadReviews();
        window.removeEventListener('scroll', onScroll);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const match = targets.find(([el]) => el === entry.target);
          if (match) match[1]();
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '400px 0px' }
    );
    targets.forEach(([el]) => io.observe(el));
    return () => io.disconnect();
  }, [loadExclusives, loadReviews]);

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
      router.push(`/products/${product.slug}`);
    }
  };

  return (
    <main className="home-page" role="main">
        <h1 className="sr-only">CrossCoin — Premium Performance Socks for Every Adventure</h1>
        <section aria-label="Featured Promotions">
          <HeroSlider slides={slides} />
          <CouponStrip />
          <TrustBadges />
        </section>
        <section aria-label="Shop By Category">
          <SlidingCollection collections={categories} isLoading={loading} />
        </section>
        <section aria-label="Exclusive Offers" ref={exclusivesSectionRef}>
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
                      gtagAdsConversion('add_to_cart', { value: parseFloat(prod.price || 0), currency: 'INR' });
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
        <section className="home-reviews-section" aria-label="Customer Reviews" ref={reviewsSectionRef}>
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
