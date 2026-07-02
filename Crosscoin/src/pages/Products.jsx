import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";
import ProductCard from "../components/products/ProductCard";
import Skeleton from "../components/common/Skeleton";
import ProductFilterDrawer from "../components/products/ProductFilterDrawer";
import Dropdown from "../components/ui/Dropdown";
import {
  FiFilter,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";
import { useBreadcrumb } from "../components/common/Breadcrumb";
import {
  getAllPublicProducts,
  getPublicCategories,
  getPublicCategoryByName,
} from "../services/publicApi";
import { getProductImageSrc } from "../utils/imageUtils";
import SeoWrapper from "../console/SeoWrapper";
import { fbqTrack } from "../utils/fbqTrack";
import { gtagTrack } from "../utils/gtagTrack";
import colorMap from "../components/products/colorMap";
import { Pagination } from "../components/ui";
import { showSuccess } from "../utils/toastNotification";
import { fetchPageSeo } from "../utils/fetchPageSeo";
import { fetchPageFaqs } from "../utils/fetchPageFaqs";
import ProductFaqSection from "../components/common/ProductFaqSection";

const PRODUCTS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

async function fetchProductsJson(url) {
  try {
    const r = await fetch(url, { headers: { 'X-Brand-Name': 'crosscoin' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function getServerSideProps(ctx) {
  // Server-render the default product listing + categories so the grid ships in
  // the initial HTML instead of after a client fetch waterfall. When a category
  // filter is in the URL we skip the product prefetch — that path needs the
  // category-name matching that runs client-side — and let the client fetch it.
  const hasCategory = !!ctx.query?.category;

  const [seoData, faqs, productsJson, categoriesJson] = await Promise.all([
    fetchPageSeo('products', ctx),
    fetchPageFaqs('products', ctx),
    hasCategory
      ? Promise.resolve(null)
      : fetchProductsJson(`${PRODUCTS_API_URL}/api/products/catalog?page=1&limit=100`),
    fetchProductsJson(`${PRODUCTS_API_URL}/api/categories/listing`),
  ]);

  const rawProducts = (productsJson?.success && productsJson?.data?.products)
    ? productsJson.data.products
    : [];
  const initialProducts = rawProducts.map((p) => ({
    ...p,
    price: p.price || p.variations?.[0]?.price || 0,
    comparePrice: p.comparePrice || p.variations?.[0]?.comparePrice || 0,
  }));
  const initialTotal = productsJson?.data?.total || productsJson?.data?.totalProducts || 0;
  const initialCategories = categoriesJson?.categories
    || (Array.isArray(categoriesJson) ? categoriesJson : [])
    || [];

  return {
    props: {
      seoData,
      pageFaqs: faqs.pageFaqs,
      globalFaqs: faqs.globalFaqs,
      initialProducts,
      initialTotal,
      initialCategories,
    },
  };
}

// Load page-specific CSS - moved to _app.jsx

const Products = ({
  seoData,
  pageFaqs = [],
  globalFaqs = [],
  initialProducts = [],
  initialTotal = 0,
  initialCategories = [],
}) => {
  const router = useRouter();
  const { addToCart } = useCart();
  const { setCustomBreadcrumbs } = useBreadcrumb();

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([20, 250]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState([]);

  // Data State - seeded from getServerSideProps so the grid renders from the
  // initial HTML (no client fetch waterfall on the default, no-category view).
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalProducts, setTotalProducts] = useState(initialTotal);
  
  // Safety guard: Ensure products is always an array.
  // Memoised so that downstream useMemos (filteredProducts, computeDynamicFilters)
  // get a stable identity when `products` hasn't changed — avoids a cascade
  // of re-computations on every Products.jsx render.
  const safeProducts = useMemo(
    () => (Array.isArray(products) ? products : []),
    [products],
  );

  // ── React Query: categories (1 hour stale) ──
  // Seed from the SSR-provided categories so there's no client fetch on first
  // load; React Query still revalidates in the background after staleTime.
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const data = await getPublicCategories();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 60 * 1000,
    initialData: initialCategories.length > 0 ? initialCategories : undefined,
  });

  // Dynamic Filter Options - Initialize with safe defaults
  const [filterOptionsDynamic, setFilterOptionsDynamic] = useState({
    categories: [],
    materials: [],
    colors: [],
    sizes: [],
    genders: [],
    price: [20, 250],
    counts: {
      categories: {},
      materials: {},
      colors: {},
      sizes: {},
      genders: {},
    },
  });

  // Refs to prevent multiple API calls and infinite loops
  const isLoadingRef = useRef(false);
  const initialLoadRef = useRef(true);
  const productsLoadedRef = useRef(false);
  // True when getServerSideProps already provided the default listing, so the
  // first no-category run of the load effect can skip the redundant client fetch.
  const ssrSeededRef = useRef(initialProducts.length > 0);

  // Main data fetching function - optimized to prevent multiple calls
  const fetchProductsData = useCallback(
    async (categoryName = null, isCategorySpecific = false) => {
      // Prevent multiple simultaneous API calls
      if (isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        let response;

        if (isCategorySpecific && categoryName) {
          // Fetch from API (React Query handles caching at the hook level for other consumers)
          response = await getPublicCategoryByName(categoryName);
          if (response && response.products) {
            const transformedProducts = (response.products || []).map((p) => ({
              ...p,
              category_id: response.id,
              category: { id: response.id, name: response.name },
            }));
            setProducts(transformedProducts);
            setTotalProducts(transformedProducts.length);
            setLoading(false);
            productsLoadedRef.current = false;
          } else {
            throw new Error(response?.message || "Failed to fetch category products");
          }
        } else {
          // Fetch all products
          const params = {
            page: 1,
            limit: 100,
          };
          response = await getAllPublicProducts(params);
          if (response?.success) {
            const transformedProducts = (response.data?.products || []).map(p => ({
              ...p,
              price: p.price || p.variations?.[0]?.price || 0,
              comparePrice: p.comparePrice || p.variations?.[0]?.comparePrice || 0,
            }));
            
            setProducts(transformedProducts);
            setTotalProducts(
              response.data?.total || response.data?.totalProducts || 0
            );
            setLoading(false);
            productsLoadedRef.current = true;
          } else if (response?.data?.products) {
            const transformedProducts = (response.data.products || []).map(p => ({
              ...p,
              price: p.price || p.variations?.[0]?.price || 0,
              comparePrice: p.comparePrice || p.variations?.[0]?.comparePrice || 0,
            }));
            
            setProducts(transformedProducts);
            setTotalProducts(
              response.data.total || response.data.totalProducts || 0
            );
            setLoading(false);
            productsLoadedRef.current = true;
          } else {
            throw new Error(response?.message || "Failed to fetch products");
          }
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "An error occurred while fetching products"
        );
        setProducts([]);
        setTotalProducts(0);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    []
  );

  // Handle category from URL query
  useEffect(() => {
    // Don't run until categories are loaded
    if (categories.length === 0) return;

    const categoryFromQuery = router.query.category;

    // Always reset so navigation triggers a fresh fetch
    isLoadingRef.current = false;
    initialLoadRef.current = false;

    const normalizeString = (str) =>
      str.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();

    if (categoryFromQuery) {
      const decodedName = decodeURIComponent(categoryFromQuery);

      let matched = categories.find(
        (cat) => cat.name.toLowerCase() === decodedName.toLowerCase()
      );
      if (!matched) {
        matched = categories.find(
          (cat) => normalizeString(cat.name) === normalizeString(decodedName)
        );
      }
      if (!matched) {
        matched = categories.find(
          (cat) =>
            decodedName.toLowerCase().includes(cat.name.toLowerCase()) ||
            cat.name.toLowerCase().includes(decodedName.toLowerCase())
        );
      }

      if (matched) {
        setSelectedCategory([String(matched.id)]);
        setCustomBreadcrumbs([
          { label: "Home", path: "/" },
          { label: "Products", path: "/Products" },
          { label: matched.name, path: router.asPath, isLast: true },
        ]);
        fetchProductsData(matched.name, true);
      } else {
        // category param present but no match — fetch all
        setSelectedCategory([]);
        setCustomBreadcrumbs(null);
        fetchProductsData();
      }
    } else {
      // No category param — fetch all products
      setSelectedCategory([]);
      setCustomBreadcrumbs(null);
      if (ssrSeededRef.current) {
        // Default listing already came from SSR; consume the flag so later
        // navigations still refetch, but skip the redundant first fetch.
        ssrSeededRef.current = false;
        productsLoadedRef.current = true;
      } else {
        fetchProductsData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.category, categories.length]);

  // Safety check: fetch all products if nothing loaded and no category param
  useEffect(() => {
    if (
      categories.length > 0 &&
      safeProducts.length === 0 &&
      !loading &&
      !isLoadingRef.current &&
      !router.query.category
    ) {
      fetchProductsData();
    }
  }, [categories.length, safeProducts.length, loading, fetchProductsData, router.query.category]);

  // After products and categories are loaded, compute dynamic filters
  useEffect(() => {
    if (Array.isArray(safeProducts) && safeProducts.length > 0 && 
        Array.isArray(categories) && categories.length > 0) {
      const newFilters = computeDynamicFilters(safeProducts, categories);
      setFilterOptionsDynamic(ensureValidFilterOptions(newFilters));
    }
  }, [safeProducts, categories]);

  // Fix hydration mismatch by checking window only on client side
  useEffect(() => {
    // Mark component as mounted
    setIsMounted(true);
    
    // Only run on client side after mount
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 500);
      };
      
      // Set initial value
      handleResize();
      
      // Add event listener
      window.addEventListener("resize", handleResize);
      
      // Cleanup
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Cleanup breadcrumbs on unmount
  useEffect(() => {
    return () => {
      setCustomBreadcrumbs(null);
    };
  }, [setCustomBreadcrumbs]);

  // Debounced filter change handler
  const debounceRef = useRef(null);
  const handleFilterChange = useCallback((filterType, value) => {
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Apply filter immediately for UI responsiveness
    switch (filterType) {
      case "price":
        setPriceRange(value);
        break;
      case "color":
        setSelectedColors((prev) =>
          prev.includes(value)
            ? prev.filter((c) => c !== value)
            : [...prev, value]
        );
        break;
      case "size":
        setSelectedSizes((prev) =>
          prev.includes(value)
            ? prev.filter((s) => s !== value)
            : [...prev, value]
        );
        break;
      case "gender":
        setSelectedGender((prev) =>
          prev.includes(value)
            ? prev.filter((g) => g !== value)
            : [...prev, value]
        );
        break;
      case "material":
        setSelectedMaterial((prev) =>
          prev.includes(value)
            ? prev.filter((m) => m !== value)
            : [...prev, value]
        );
        break;
      case "category":
        setSelectedCategory((prev) =>
          prev.includes(value)
            ? prev.filter((c) => c !== value)
            : [...prev, value]
        );
        break;
      default:
        break;
    }

    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, []);

  const handleProductClick = (product) => {
    router.push(`/products/${product.slug}`);
  };

  const handleAddToCart = (e, product, color, size, variationId) => {
    e.stopPropagation();
    addToCart(product, color, size, 1, variationId);
    showSuccess('addedToCart');
    fbqTrack("AddToCart", {
      content_ids: [variationId ? `${product.id}_${variationId}` : String(product.id)],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "INR",
      quantity: 1,
    });
    gtagTrack('add_to_cart', {
      currency: 'INR',
      value: parseFloat(product.price || 0),
      items: [{ item_id: String(product.id), item_name: product.name, price: parseFloat(product.price || 0), quantity: 1 }],
    });
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Safety function to ensure filterOptionsDynamic is always valid
  const ensureValidFilterOptions = (filters) => {
    return {
      categories: Array.isArray(filters?.categories) ? filters.categories : [],
      materials: Array.isArray(filters?.materials) ? filters.materials : [],
      colors: Array.isArray(filters?.colors) ? filters.colors : [],
      sizes: Array.isArray(filters?.sizes) ? filters.sizes : [],
      genders: Array.isArray(filters?.genders) ? filters.genders : [],
      price: Array.isArray(filters?.price) ? filters.price : [20, 250],
      counts: filters?.counts || {
        categories: {},
        materials: {},
        colors: {},
        sizes: {},
        genders: {},
      },
    };
  };

  const computeDynamicFilters = (products, categoriesList) => {
    // Safety checks
    if (!Array.isArray(products) || !Array.isArray(categoriesList)) {
      return {
        categories: [],
        materials: [],
        colors: [],
        sizes: [],
        genders: [],
        price: [20, 250],
        counts: {
          categories: {},
          materials: {},
          colors: {},
          sizes: {},
          genders: {},
        },
      };
    }
    
    const materialsSet = new Set();
    const colorsSet = new Set();
    const sizesSet = new Set();
    const gendersSet = new Set();
    let minPrice = 999999,
      maxPrice = 0;
    const counts = {
      categories: {},
      materials: {},
      colors: {},
      sizes: {},
      genders: {},
    };
    products.forEach((product) => {
      // Category count
      const catId =
        product.category_id || (product.category && product.category.id);
      if (catId) {
        counts.categories[catId] = (counts.categories[catId] || 0) + 1;
      }
      // Variations
      (product.variations || []).forEach((variation) => {
        // Price
        if (variation.price < minPrice) minPrice = variation.price;
        if (variation.price > maxPrice) maxPrice = variation.price;
        // Attributes
        let attrs = variation.attributes;
        if (typeof attrs === "string") {
          try {
            attrs = JSON.parse(attrs);
          } catch {
            attrs = {};
          }
        }
        if (attrs) {
          (attrs.material || []).forEach((m) => {
            materialsSet.add(m);
            counts.materials[m] = (counts.materials[m] || 0) + 1;
          });
          (attrs.color || []).forEach((c) => {
            colorsSet.add(c);
            counts.colors[c] = (counts.colors[c] || 0) + 1;
          });
          (attrs.size || []).forEach((s) => {
            sizesSet.add(s);
            counts.sizes[s] = (counts.sizes[s] || 0) + 1;
          });
          (attrs.gender || []).forEach((g) => {
            gendersSet.add(g);
            counts.genders[g] = (counts.genders[g] || 0) + 1;
          });
        }
      });
    });
    // Categories
    const categories = categoriesList
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        count: counts.categories[cat.id] || 0,
      }))
      .filter((cat) => cat.count > 0);
    return {
      categories,
      materials: Array.from(materialsSet),
      colors: Array.from(colorsSet),
      sizes: Array.from(sizesSet),
      genders: Array.from(gendersSet),
      price: [
        minPrice === 999999 ? 20 : minPrice,
        maxPrice === 0 ? 250 : maxPrice,
      ],
      counts,
    };
  };

  // Get category name by ID for display. useCallback so the function
  // identity is stable across renders and any memoised consumer
  // doesn't invalidate just because the parent re-rendered.
  const getCategoryNameById = useCallback((categoryId) => {
    const category = categories.find(
      (cat) => cat.id.toString() === categoryId.toString()
    );
    return category ? category.name : categoryId;
  }, [categories]);

  // Get category name from URL for display (fallback)
  const getCategoryNameFromUrl = () => {
    const categoryFromQuery = router.query.category;
    if (categoryFromQuery) {
      return decodeURIComponent(categoryFromQuery);
    }
    return null;
  };

  // Compute min and max price from all products for the slider
  const [minPrice, maxPrice] = useMemo(() => {
    if (!Array.isArray(safeProducts) || safeProducts.length === 0) {
      return [0, 1000];
    }
    let min = Infinity, max = 0;
    safeProducts.forEach((product) => {
      if (!product) return;
      // Check top-level price fields too
      const topPrice = parseFloat(product.price) || 0;
      if (topPrice > 0) {
        if (topPrice < min) min = topPrice;
        if (topPrice > max) max = topPrice;
      }
      (product.variations || []).forEach((variation) => {
        if (!variation) return;
        const price = parseFloat(variation.price) || 0;
        if (price > 0) {
          if (price < min) min = price;
          if (price > max) max = price;
        }
      });
    });
    if (min === Infinity) min = 0;
    return [Math.floor(min), Math.ceil(max) || 1000];
  }, [safeProducts]);

  // On products load, set priceRange to [minPrice, maxPrice]
  useEffect(() => {
    if (safeProducts.length > 0) {
      setPriceRange([minPrice, maxPrice]);
    }
    // eslint-disable-next-line
  }, [safeProducts.length]);

  // Get filtered products - memoized for performance
  const filteredProducts = useMemo(() => {
    // Safety check: return empty array if products is not initialized
    if (!safeProducts || !Array.isArray(safeProducts)) {
      return [];
    }
    
    return safeProducts.filter((product) => {
      // Safety check for product object
      if (!product) return false;
      
      // Category filter - skip if we're viewing a specific category (all products are already from that category)
      if (Array.isArray(selectedCategory) && selectedCategory.length > 0) {
        const catId =
          product.category_id || (product.category && product.category.id);
        // If catId is missing, don't filter out (category-specific fetch already scoped)
        if (catId && !selectedCategory.includes(String(catId))) return false;
      }
      
      // Material filter
      if (Array.isArray(selectedMaterial) && selectedMaterial.length > 0) {
        const hasMaterial = (product.variations || []).some((variation) => {
          if (!variation) return false;
          let attrs = variation.attributes;
          if (typeof attrs === "string") {
            try {
              attrs = JSON.parse(attrs);
            } catch {
              attrs = {};
            }
          }
          return (
            attrs &&
            selectedMaterial.some((m) => (attrs.material || []).includes(m))
          );
        });
        if (!hasMaterial) return false;
      }
      
      // Color filter
      if (Array.isArray(selectedColors) && selectedColors.length > 0) {
        const hasColor = (product.variations || []).some((variation) => {
          if (!variation) return false;
          let attrs = variation.attributes;
          if (typeof attrs === "string") {
            try {
              attrs = JSON.parse(attrs);
            } catch {
              attrs = {};
            }
          }
          return (
            attrs && selectedColors.some((c) => (attrs.color || []).includes(c))
          );
        });
        if (!hasColor) return false;
      }
      
      // Size filter
      if (Array.isArray(selectedSizes) && selectedSizes.length > 0) {
        const hasSize = (product.variations || []).some((variation) => {
          if (!variation) return false;
          let attrs = variation.attributes;
          if (typeof attrs === "string") {
            try {
              attrs = JSON.parse(attrs);
            } catch {
              attrs = {};
            }
          }
          return (
            attrs && selectedSizes.some((s) => (attrs.size || []).includes(s))
          );
        });
        if (!hasSize) return false;
      }
      
      // Gender filter
      if (Array.isArray(selectedGender) && selectedGender.length > 0) {
        const hasGender = (product.variations || []).some((variation) => {
          if (!variation) return false;
          let attrs = variation.attributes;
          if (typeof attrs === "string") {
            try {
              attrs = JSON.parse(attrs);
            } catch {
              attrs = {};
            }
          }
          return (
            attrs &&
            selectedGender.some((g) => (attrs.gender || []).includes(g))
          );
        });
        if (!hasGender) return false;
      }
      
      // Price filter (only if user changed slider)
      if (Array.isArray(priceRange) && priceRange.length === 2 &&
          (priceRange[0] !== minPrice || priceRange[1] !== maxPrice)) {
        const prices = [];
        // Check top-level price
        const topPrice = parseFloat(product.price) || 0;
        if (topPrice > 0) prices.push(topPrice);
        // Check variation prices
        (product.variations || []).forEach((variation) => {
          if (!variation) return;
          const p = parseFloat(variation.price) || 0;
          if (p > 0) prices.push(p);
        });
        const inRange = prices.some(p => p >= priceRange[0] && p <= priceRange[1]);
        if (!inRange) return false;
      }

      // Badge filter
      if (Array.isArray(selectedBadge) && selectedBadge.length > 0) {
        const productBadge = product.badge || 'none';
        if (!selectedBadge.includes(productBadge)) return false;
      }

      return true;
    });
  }, [safeProducts, selectedCategory, selectedMaterial, selectedColors, selectedSizes, selectedGender, priceRange, minPrice, maxPrice, selectedBadge]);

  // Sort products - memoized for performance
  const sortedProducts = useMemo(() => {
    // Safety check: return empty array if filteredProducts is not valid
    if (!filteredProducts || !Array.isArray(filteredProducts)) {
      return [];
    }
    
    switch (sortBy) {
      case "price-low":
        return [...filteredProducts].sort((a, b) => {
          const priceA = parseFloat(a.variations?.[0]?.price || a.price) || 0;
          const priceB = parseFloat(b.variations?.[0]?.price || b.price) || 0;
          return priceA - priceB;
        });
      case "price-high":
        return [...filteredProducts].sort((a, b) => {
          const priceA = parseFloat(a.variations?.[0]?.price || a.price) || 0;
          const priceB = parseFloat(b.variations?.[0]?.price || b.price) || 0;
          return priceB - priceA;
        });
      case "rating":
        return [...filteredProducts].sort((a, b) => {
          const ratingA = parseFloat(a.avgRating) || parseFloat(a.rating) || 0;
          const ratingB = parseFloat(b.avgRating) || parseFloat(b.rating) || 0;
          return ratingB - ratingA;
        });
      case "featured":
      default:
        return filteredProducts; // Default order or implement your own featured logic
    }
  }, [filteredProducts, sortBy]);

  // Paginate sorted products - memoized for performance
  const paginatedProducts = useMemo(() => {
    if (!Array.isArray(sortedProducts)) {
      return [];
    }
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage]);
  
  const debugInfo = {
    safeProducts: Array.isArray(safeProducts) ? safeProducts.length : 0,
    filteredProducts: Array.isArray(filteredProducts) ? filteredProducts.length : 0,
    sortedProducts: Array.isArray(sortedProducts) ? sortedProducts.length : 0,
    paginatedProducts: Array.isArray(paginatedProducts) ? paginatedProducts.length : 0,
    selectedCategory,
    selectedColors,
    selectedSizes,
    selectedGender,
    selectedMaterial,
    priceRange,
  };

  // Compute total pages based on filtered products
  const totalPages = useMemo(() => {
    if (!Array.isArray(filteredProducts)) return 1;
    return Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  }, [filteredProducts, itemsPerPage]);

  // Reset to page 1 when filters change (but don't trigger API calls)
  useEffect(() => {
    if (!initialLoadRef.current) {
      setCurrentPage(1);
    }
  }, [
    selectedCategory,
    selectedColors,
    selectedSizes,
    selectedGender,
    selectedMaterial,
    priceRange,
    // sortBy removed - sorting is client-side only
  ]);

  // Reset to page 1 when sorting changes (client-side only)
  useEffect(() => {
    if (!initialLoadRef.current) {
      setCurrentPage(1);
    }
  }, [sortBy]);

  // Safety check: ensure loading is false when products are available or after timeout
  useEffect(() => {
    if (safeProducts.length > 0 && loading) {
      setLoading(false);
    }
    
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        if (safeProducts.length === 0) {
          setError("");
        }
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [safeProducts, loading]);

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedGender([]);
    setSelectedMaterial([]);
    setPriceRange([minPrice, maxPrice]);
    router.push("/Products");
  };

  // Check if any filters are active - with safety checks
  const hasActiveFilters =
    (Array.isArray(selectedCategory) && selectedCategory.length > 0) ||
    (Array.isArray(selectedColors) && selectedColors.length > 0) ||
    (Array.isArray(selectedSizes) && selectedSizes.length > 0) ||
    (Array.isArray(selectedGender) && selectedGender.length > 0) ||
    (Array.isArray(selectedMaterial) && selectedMaterial.length > 0) ||
    (Array.isArray(priceRange) && priceRange.length === 2 && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice));

  // Pre-mount skeleton — only when there's no data to show yet. When products
  // were seeded by SSR we render the real grid on the server AND on the first
  // client paint (both with isMobile=false and the same seeded products), so
  // hydration stays consistent; isMobile-dependent bits adjust after mount.
  if (!isMounted && (!Array.isArray(products) || products.length === 0)) {
    return (
      <SeoWrapper pageName="products" seoData={seoData}>
        <div className="products-page">
          <div className="products-header">
            <div className="section-header-inline">
              <h1 className="section-title">Our <strong>Products</strong></h1>
              <p className="section-subtitle">Browse our full collection</p>
            </div>
          </div>
          <div className="products-container">
            <div className="product-listing">
              <div className="products-grid">
                {Array(12).fill(0).map((_, idx) => (
                  <Skeleton key={`skeleton-${idx}`} type="product" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  return (
    <SeoWrapper pageName="products" seoData={seoData}>
      <div className="products-page">
        <div className="products-header">
          <div className="section-header-inline">
            <h1 className="section-title">
              {Array.isArray(selectedCategory) && selectedCategory.length > 0
                ? <>Products - <strong>{getCategoryNameById(selectedCategory[0])}</strong></>
                : getCategoryNameFromUrl()
                ? <>Products - <strong>{getCategoryNameFromUrl()}</strong></>
                : <>Our <strong>Products</strong></>}
            </h1>
            <p className="section-subtitle">Browse our full collection</p>
          </div>
          <div className="products-controls">
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Clear Filters
              </button>
            )}
            <button
              className="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '10px 16px',
                background: '#CE1E36',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                color: '#fff'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#a0182b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#CE1E36'; }}
            >
              <FiFilter size={18} /> Filters
            </button>
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'featured', label: 'Featured' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
                { value: 'rating', label: 'Top Rated' }
              ]}
              placeholder="Sort by"
            />
          </div>
        </div>

        {/* Mobile fixed bottom bar */}
        {isMobile && (
          <div className="mobile-bottom-bar">
            <button
              className="filter-toggle mobile-fixed"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter size={18} /> Filters
            </button>
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              className="mobile-sort-dropdown"
              options={[
                { value: 'featured', label: 'Featured' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
                { value: 'rating', label: 'Top Rated' }
              ]}
              placeholder="Sort by"
            />
          </div>
        )}

        <div className="products-container">
          {/* Desktop Sidebar */}
          {!isMobile && showFilters && filterOptionsDynamic && (
            <div className="filters-sidebar">
              <div className="filter-section">
                <h3
                  onClick={() => setShowMaterial(!showMaterial)}
                  className={`clickable-heading ${showMaterial ? "open" : ""}`}
                >
                  Material{" "}
                  <FiChevronDown
                    className={`arrow-icon ${showMaterial ? "open" : ""}`}
                  />
                </h3>
                {showMaterial && (
                  <div className="material-list">
                    {["Cotton"].map((material) => (
                      <label key={material} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={Array.isArray(selectedMaterial) && selectedMaterial.includes(material)}
                            onChange={() =>
                              handleFilterChange("material", material)
                            }
                          />
                          <p>{material}</p>
                        </div>
                        {/* No count needed for single material */}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3
                  onClick={() => setShowPrice(!showPrice)}
                  className={`clickable-heading ${showPrice ? "open" : ""}`}
                >
                  By Price{" "}
                  <FiChevronDown
                    className={`arrow-icon ${showPrice ? "open" : ""}`}
                  />
                </h3>
                {showPrice && (
                  <div className="price-range custom-price-range enhanced-price-range">
                    <div className="price-slider-labels">
                      <span>Min: ₹{minPrice || 20}</span>
                      <span>Max: ₹{maxPrice || 250}</span>
                    </div>
                    <div className="slider-wrapper">
                      <input
                        type="range"
                        min={minPrice || 20}
                        max={maxPrice || 250}
                        value={priceRange?.[0] || minPrice || 20}
                        onChange={(e) =>
                          handleFilterChange("price", [
                            Number(e.target.value),
                            priceRange?.[1] || maxPrice || 250,
                          ])
                        }
                        className="price-slider min-slider"
                        style={{
                          zIndex: (priceRange?.[0] || 0) === (priceRange?.[1] || 0) ? 5 : 3,
                        }}
                      />
                      <input
                        type="range"
                        min={minPrice || 20}
                        max={maxPrice || 250}
                        value={priceRange?.[1] || maxPrice || 250}
                        onChange={(e) =>
                          handleFilterChange("price", [
                            priceRange?.[0] || minPrice || 20,
                            Number(e.target.value),
                          ])
                        }
                        className="price-slider max-slider"
                        style={{
                          zIndex: (priceRange?.[0] || 0) === (priceRange?.[1] || 0) ? 4 : 2,
                          "--hide-max-thumb":
                            (priceRange?.[0] || 0) === (priceRange?.[1] || 0) ? 0 : 1,
                        }}
                      />
                      <div
                        className="slider-track-highlight"
                        style={{
                          left:
                            (((priceRange?.[0] || minPrice || 20) - (minPrice || 20)) /
                              ((maxPrice || 250) - (minPrice || 20))) *
                              100 +
                            "%",
                          right:
                            100 -
                            (((priceRange?.[1] || maxPrice || 250) - (minPrice || 20)) /
                              ((maxPrice || 250) - (minPrice || 20))) *
                              100 +
                            "%",
                        }}
                      />
                    </div>
                    <div className="price-inputs">
                      <span>₹{priceRange?.[0] || minPrice || 20}</span> -{" "}
                      <span>₹{priceRange?.[1] || maxPrice || 250}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3
                  onClick={() => setShowColors(!showColors)}
                  className={`clickable-heading ${showColors ? "open" : ""}`}
                >
                  Colors{" "}
                  <FiChevronDown
                    className={`arrow-icon ${showColors ? "open" : ""}`}
                  />
                </h3>
                {showColors && (
                  <div className="color-options">
                    {(filterOptionsDynamic?.colors || []).map((color) => (
                      <button
                        key={color}
                        className={`color-btn ${
                          Array.isArray(selectedColors) && selectedColors.includes(color) ? "active" : ""
                        }`}
                        aria-label={`Filter by color: ${color}`}
                        style={{
                          backgroundColor:
                            colorMap[color?.toLowerCase()] || color,
                          border: "1px solid #888",
                        }}
                        onClick={(e) => handleFilterChange("color", color)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3
                  onClick={() => setShowSizes(!showSizes)}
                  className={`clickable-heading ${showSizes ? "open" : ""}`}
                >
                  Size{" "}
                  <FiChevronDown
                    className={`arrow-icon ${showSizes ? "open" : ""}`}
                  />
                </h3>
                {showSizes && (
                  <div className="size-options">
                    {(filterOptionsDynamic?.sizes || []).map((size) => (
                      <label key={size} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={Array.isArray(selectedSizes) && selectedSizes.includes(size)}
                            onChange={() => handleFilterChange("size", size)}
                          />
                          <p>{size} </p>
                        </div>
                        <span>
                          [{filterOptionsDynamic?.counts?.sizes?.[size] || 0}]
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3
                  onClick={() => setShowGender(!showGender)}
                  className={`clickable-heading ${showGender ? "open" : ""}`}
                >
                  Gender{" "}
                  <FiChevronDown
                    className={`arrow-icon ${showGender ? "open" : ""}`}
                  />
                </h3>
                {showGender && (
                  <div className="gender-options">
                    {(filterOptionsDynamic?.genders || []).map((gender) => (
                      <label key={gender} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={Array.isArray(selectedGender) && selectedGender.includes(gender)}
                            onChange={() =>
                              handleFilterChange("gender", gender)
                            }
                          />
                          <p>{gender} </p>
                        </div>
                        <span>
                          [{filterOptionsDynamic?.counts?.genders?.[gender] || 0}]
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Mobile Modal */}
          {isMobile && showFilters && filterOptionsDynamic && (
            <div className="mobile-filter-modal-overlay">
              <div className="mobile-filter-modal">
                <div className="mobile-filter-modal-header">
                  <span className="modal-title">F I L T E R S</span>
                  <button
                    className="modal-close"
                    onClick={() => setShowFilters(false)}
                    aria-label="Close filters"
                  >
                    &times;
                  </button>
                  <button className="modal-clear" onClick={clearAllFilters}>
                    Clear All
                  </button>
                </div>
                <div className="mobile-filter-modal-body">
                  {/* Material */}
                  <div className="modal-filter-section">
                    <div
                      className="modal-filter-label"
                      onClick={() => setShowMaterial(!showMaterial)}
                    >
                      Material{" "}
                      <FiChevronDown
                        className={`arrow-icon ${showMaterial ? "open" : ""}`}
                      />
                    </div>
                    {showMaterial && (
                      <div className="material-list">
                        {["Cotton"].map((material) => (
                          <label key={material} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={Array.isArray(selectedMaterial) && selectedMaterial.includes(material)}
                                onChange={() =>
                                  handleFilterChange("material", material)
                                }
                              />
                              <p>{material}</p>
                            </div>
                            {/* No count needed for single material */}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* By Price */}
                  <div className="modal-filter-section">
                    <div
                      className="modal-filter-label"
                      onClick={() => setShowPrice(!showPrice)}
                    >
                      By Price{" "}
                      <FiChevronDown
                        className={`arrow-icon ${showPrice ? "open" : ""}`}
                      />
                    </div>
                    {showPrice && (
                      <div className="price-range custom-price-range enhanced-price-range">
                        <div className="price-slider-labels">
                          <span>Min: ₹{minPrice || 20}</span>
                          <span>Max: ₹{maxPrice || 250}</span>
                        </div>
                        <div className="slider-wrapper">
                          <input
                            type="range"
                            min={minPrice || 20}
                            max={maxPrice || 250}
                            value={priceRange?.[0] || minPrice || 20}
                            onChange={(e) =>
                              handleFilterChange("price", [
                                Number(e.target.value),
                                priceRange?.[1] || maxPrice || 250,
                              ])
                            }
                            className="price-slider min-slider"
                            style={{
                              zIndex: (priceRange?.[0] || 0) === (priceRange?.[1] || 0) ? 5 : 3,
                            }}
                          />
                          <input
                            type="range"
                            min={minPrice || 20}
                            max={maxPrice || 250}
                            value={priceRange?.[1] || maxPrice || 250}
                            onChange={(e) =>
                              handleFilterChange("price", [
                                priceRange?.[0] || minPrice || 20,
                                Number(e.target.value),
                              ])
                            }
                            className="price-slider max-slider"
                            style={{
                              zIndex: (priceRange?.[0] || 0) === (priceRange?.[1] || 0) ? 4 : 2,
                              "--hide-max-thumb":
                                (priceRange?.[0] || 0) === (priceRange?.[1] || 0) ? 0 : 1,
                            }}
                          />
                          {/* Colored track between thumbs */}
                          <div
                            className="slider-track-highlight"
                            style={{
                              left:
                                (((priceRange?.[0] || minPrice || 20) - (minPrice || 20)) /
                                  ((maxPrice || 250) - (minPrice || 20))) *
                                  100 +
                                "%",
                              right:
                                100 -
                                (((priceRange?.[1] || maxPrice || 250) - (minPrice || 20)) /
                                  ((maxPrice || 250) - (minPrice || 20))) *
                                  100 +
                                "%",
                            }}
                          />
                        </div>
                        <div className="price-inputs">
                          <span>₹{priceRange?.[0] || minPrice || 20}</span> -{" "}
                          <span>₹{priceRange?.[1] || maxPrice || 250}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Colors */}
                  <div className="modal-filter-section">
                    <div
                      className="modal-filter-label"
                      onClick={() => setShowColors(!showColors)}
                    >
                      Colors{" "}
                      <FiChevronDown
                        className={`arrow-icon ${showColors ? "open" : ""}`}
                      />
                    </div>
                    {showColors && (
                      <div className="color-options">
                        {(filterOptionsDynamic?.colors || []).map((color) => (
                          <button
                            key={color}
                            className={`color-btn ${
                              Array.isArray(selectedColors) && selectedColors.includes(color) ? "active" : ""
                            }`}
                            aria-label={`Filter by color: ${color}`}
                            style={{
                              backgroundColor:
                                colorMap[color?.toLowerCase()] || color,
                              border: "1px solid #888",
                            }}
                            onClick={() => handleFilterChange("color", color)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Size */}
                  <div className="modal-filter-section">
                    <div
                      className="modal-filter-label"
                      onClick={() => setShowSizes(!showSizes)}
                    >
                      Size{" "}
                      <FiChevronDown
                        className={`arrow-icon ${showSizes ? "open" : ""}`}
                      />
                    </div>
                    {showSizes && (
                      <div className="size-options">
                        {(filterOptionsDynamic?.sizes || []).map((size) => (
                          <label key={size} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={Array.isArray(selectedSizes) && selectedSizes.includes(size)}
                                onChange={() =>
                                  handleFilterChange("size", size)
                                }
                              />
                              <p>{size} </p>
                            </div>
                            <span>
                              [{filterOptionsDynamic?.counts?.sizes?.[size] || 0}]
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Gender */}
                  <div className="modal-filter-section">
                    <div
                      className="modal-filter-label"
                      onClick={() => setShowGender(!showGender)}
                    >
                      Gender{" "}
                      <FiChevronDown
                        className={`arrow-icon ${showGender ? "open" : ""}`}
                      />
                    </div>
                    {showGender && (
                      <div className="gender-options">
                        {(filterOptionsDynamic?.genders || []).map((gender) => (
                          <label key={gender} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={Array.isArray(selectedGender) && selectedGender.includes(gender)}
                                onChange={() =>
                                  handleFilterChange("gender", gender)
                                }
                              />
                              <p>{gender} </p>
                            </div>
                            <span>
                              [
                              {filterOptionsDynamic?.counts?.genders?.[gender] || 0}
                              ]
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="product-listing">
            <div className="products-grid">
              {loading ? (
                <>
                  {Array(12).fill(0).map((_, idx) => (
                    <Skeleton key={`products-skeleton-${idx}`} type="product" />
                  ))}
                </>
              ) : error ? (
                <div className="error">{error}</div>
              ) : (!filteredProducts || !Array.isArray(filteredProducts) || filteredProducts.length === 0) ? (
                <div className="no-products">
                  {Array.isArray(selectedCategory) && selectedCategory.length > 0
                    ? `No products available in "${getCategoryNameById(
                        selectedCategory[0]
                      )}" category. Try selecting a different category or clearing filters.`
                    : getCategoryNameFromUrl()
                    ? `No products available in "${getCategoryNameFromUrl()}" category. Try selecting a different category or clearing filters.`
                    : "No products found matching your criteria. Try adjusting your filters."}
                </div>
              ) : (
                // Render paginated products
                paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onProductClick={handleProductClick}
                    onAddToCart={handleAddToCart}
                  />
                ))
              )}
            </div>

            {/* Pagination controls */}
            {filteredProducts && Array.isArray(filteredProducts) && filteredProducts.length > itemsPerPage && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Product Filter Drawer */}
      <ProductFilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={(filters) => {
          // Always set — even empty arrays reset the filter
          setSelectedMaterial(filters.attributes?.material || []);
          setSelectedColors(filters.attributes?.color || []);
          setSelectedSizes(filters.attributes?.size || []);
          setSelectedGender(filters.attributes?.gender || []);
          setSelectedBadge(filters.badge || []);
          if (filters.priceRange) {
            setPriceRange([filters.priceRange.min, filters.priceRange.max]);
          }
          // Only override category if user picked one in drawer
          if (filters.categories && filters.categories.length > 0) {
            setSelectedCategory(filters.categories.map(String));
          }
          setShowFilters(false);
        }}
        categories={categories}
        attributes={{
          material: filterOptionsDynamic?.materials || [],
          color: filterOptionsDynamic?.colors || [],
          size: filterOptionsDynamic?.sizes || [],
          gender: filterOptionsDynamic?.genders || [],
        }}
        minPrice={minPrice}
        maxPrice={maxPrice}
      />
      {(pageFaqs.length > 0 || globalFaqs.length > 0) && (
        <section style={{ padding: '0 16px 32px', maxWidth: 1200, margin: '0 auto' }}>
          <ProductFaqSection productFaqs={pageFaqs} globalFaqs={globalFaqs} />
        </section>
      )}
    </SeoWrapper>
  );
};

export default Products;


