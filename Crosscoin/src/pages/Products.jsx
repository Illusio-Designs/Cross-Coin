import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Header from "../components/Header";
import ProductCard, { filterOptions } from "../components/ProductCard";
import ProductSkeleton from "../components/common/ProductSkeleton";
import {
  FiFilter,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";
import { getCachedData, setCachedData } from '../utils/apiCache';
import {
  getAllPublicProducts,
  getPublicCategories,
  getPublicCategoryByName,
} from "../services/publicApi";
import { getProductImageSrc } from "../utils/imageUtils";
import SeoWrapper from "../console/SeoWrapper";
import { fbqTrack } from "../components/common/Analytics";
import colorMap from "../components/products/colorMap";
import { Pagination } from "../components/ui";
import cacheManager from "../services/cacheManager";
import "../styles/common/TableControls.css";

// Load page-specific CSS
import "../styles/pages/products.css";
import "../styles/components/Header.css";
import "../styles/components/Footer.css";

// Lazy load Footer
const Footer = dynamic(() => import("../components/Footer"), {
  loading: () => <div style={{ minHeight: '200px', background: '#f9fafb' }} />
});

const Products = () => {
  const router = useRouter();
  const { addToCart } = useCart();

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

  // Data State - CRITICAL: Initialize with empty array to prevent undefined errors
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalProducts, setTotalProducts] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);
  
  // Safety guard: Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];

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
  const categoriesLoadedRef = useRef(false);
  const productsLoadedRef = useRef(false);

  // Fetch categories on mount (only once)
  useEffect(() => {
    const fetchCategories = async () => {
      if (categoriesLoadedRef.current) return; // Prevent multiple calls

      // Check cache first using new cache manager (1 hour TTL)
      const cachedCategories = cacheManager.getByType('categories');
      if (cachedCategories) {
        setCategories(cachedCategories);
        categoriesLoadedRef.current = true;
        console.log("✅ Categories loaded from cache:", cachedCategories.length);
        return;
      }

      // Fallback to old cache system if new cache misses
      const cacheKey = 'public_categories';
      const cached = getCachedData(cacheKey, 10 * 60 * 1000); // 10 minutes cache
      if (cached) {
        setCategories(cached);
        categoriesLoadedRef.current = true;
        console.log("Categories loaded from legacy cache:", cached.length);
        return;
      }

      try {
        const data = await getPublicCategories();
        console.log("Categories API response:", data);
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          setCategories(data);
          // Cache using new cache manager (1 hour TTL)
          cacheManager.setByType('categories', data);
          setCachedData(cacheKey, data); // Also cache in legacy system
          categoriesLoadedRef.current = true;
          console.log("✅ Categories loaded and cached:", data.length);
        } else {
          console.warn("Categories response is not an array:", data);
          setCategories([]);
          categoriesLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        console.error("Categories error details:", error.response?.data || error.message);
        
        // Don't show error for categories - just set empty array and continue
        // Categories are optional for browsing products
        setCategories([]);
        categoriesLoadedRef.current = true;
        console.log("Categories failed to load, continuing without categories");
      }
    };
    fetchCategories();
  }, []); // Empty dependency array - only run once on mount

  // Main data fetching function - optimized to prevent multiple calls
  const fetchProductsData = useCallback(
    async (categoryName = null, isCategorySpecific = false) => {
      console.log('fetchProductsData called:', { categoryName, isCategorySpecific, isLoading: isLoadingRef.current });
      
      // Prevent multiple simultaneous API calls
      if (isLoadingRef.current) {
        console.log("API call already in progress, skipping...");
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);
        setCacheHit(false);

        let response;
        let cacheKey = null;

        if (isCategorySpecific && categoryName) {
          // Check cache for category-specific products (30 minute TTL)
          cacheKey = `products_category_${categoryName}`;
          const cachedProducts = cacheManager.get(cacheKey);
          if (cachedProducts) {
            console.log(`✅ Products for category "${categoryName}" loaded from cache`);
            setProducts(cachedProducts.products);
            setTotalProducts(cachedProducts.total);
            setCacheHit(true);
            setLoading(false);
            if (isCategorySpecific) {
              productsLoadedRef.current = false;
            }
            return;
          }

          // Cache miss - fetch from API
          console.log(`⚠️ Cache miss for category "${categoryName}" - fetching from API`);
          response = await getPublicCategoryByName(categoryName);
          console.log("Category API Response:", response);

          // The backend response structure is different - it doesn't have a 'success' field
          if (response && response.products) {
            // Transform category-specific products to match standard format
            const transformedProducts = (response.products || []).map((p) => {
              let imageUrl = null;
              if (p.image) {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
                if (p.image.startsWith("http")) {
                  imageUrl = p.image;
                } else if (p.image.startsWith("/uploads/")) {
                  imageUrl = `${baseUrl}${p.image}`;
                } else {
                  imageUrl = `${baseUrl}/uploads/products/${p.image}`;
                }
              }
              return {
                ...p,
                category_id: response.id, // Set the category ID from the response
                category: {
                  id: response.id,
                  name: response.name,
                },
                images: imageUrl ? [{ image_url: imageUrl }] : [], // Keep empty array for no images
                variations: [
                  {
                    price: parseFloat(p.variations?.[0]?.price || p.price || 0) || 0,
                    comparePrice: parseFloat(p.variations?.[0]?.comparePrice || p.comparePrice || 0) || 0,
                    stock: parseInt(p.variations?.[0]?.stock || p.stock || 0) || 0,
                  },
                ],
              };
            });
            console.log("Transformed products:", transformedProducts);
            setProducts(transformedProducts);
            setTotalProducts(transformedProducts.length);
            
            // Cache the category products (30 minute TTL)
            cacheManager.set(cacheKey, { products: transformedProducts, total: transformedProducts.length }, 30 * 60 * 1000);
            console.log(`✅ Category products cached for 30 minutes`);
            
            setLoading(false); // Ensure loading is set to false
            if (isCategorySpecific) {
              productsLoadedRef.current = false; // Reset for category-specific loads
            }
          } else {
            throw new Error(
              response?.message || "Failed to fetch category products"
            );
          }
        } else {
          // Check cache for all products (30 minute TTL)
          cacheKey = 'products_all';
          const cachedProducts = cacheManager.getByType('products');
          if (cachedProducts) {
            console.log('✅ All products loaded from cache');
            setProducts(cachedProducts.products);
            setTotalProducts(cachedProducts.total);
            setCacheHit(true);
            setLoading(false);
            productsLoadedRef.current = true;
            return;
          }

          // Cache miss - fetch from API
          console.log('⚠️ Products cache miss - fetching from API');
          const params = {
            page: 1,
            limit: 100, // Reduced from 1000 to 100 for better performance
          };
          response = await getAllPublicProducts(params);
          console.log("All products API Response:", response);

          if (response?.success) {
            // Transform products to ensure price fields are populated
            const transformedProducts = (response.data?.products || []).map(p => ({
              ...p,
              price: p.price || p.variations?.[0]?.price || 0,
              comparePrice: p.comparePrice || p.variations?.[0]?.comparePrice || 0,
            }));
            
            setProducts(transformedProducts);
            setTotalProducts(
              response.data?.total || response.data?.totalProducts || 0
            );
            
            // Cache the products (30 minute TTL)
            cacheManager.setByType('products', {
              products: transformedProducts,
              total: response.data?.total || response.data?.totalProducts || 0
            });
            console.log('✅ All products cached for 30 minutes');
            
            setLoading(false); // Ensure loading is set to false
            productsLoadedRef.current = true; // Mark as loaded
          } else if (response?.data?.products) {
            // Handle case where response structure is different
            const transformedProducts = (response.data.products || []).map(p => ({
              ...p,
              price: p.price || p.variations?.[0]?.price || 0,
              comparePrice: p.comparePrice || p.variations?.[0]?.comparePrice || 0,
            }));
            
            setProducts(transformedProducts);
            setTotalProducts(
              response.data.total || response.data.totalProducts || 0
            );
            
            // Cache the products
            cacheManager.setByType('products', {
              products: transformedProducts,
              total: response.data.total || response.data.totalProducts || 0
            });
            
            setLoading(false); // Ensure loading is set to false
            productsLoadedRef.current = true; // Mark as loaded
          } else {
            throw new Error(response?.message || "Failed to fetch products");
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
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
    [] // No dependencies to prevent recreation
  );

  // Handle category from URL query - run when categories are loaded OR after timeout
  useEffect(() => {
    const categoryFromQuery = router.query.category;

    // Wait for categories to load, but don't wait forever
    const shouldProceed = (categories.length > 0 || categoriesLoadedRef.current) && 
                          initialLoadRef.current && 
                          !isLoadingRef.current;

    if (shouldProceed) {
      initialLoadRef.current = false;

      if (categoryFromQuery && categories.length > 0) {
        // Decode and set category filter
        const decodedCategoryName = decodeURIComponent(categoryFromQuery);
        console.log("Loading category from URL:", decodedCategoryName);
        console.log("Available categories:", categories);

        // Find category ID for filter state - try multiple matching strategies
        let matchedCategory = categories.find(
          (cat) => cat.name.toLowerCase() === decodedCategoryName.toLowerCase()
        );

        // If exact match fails, try removing special characters and matching
        if (!matchedCategory) {
          const normalizeString = (str) =>
            str
              .toLowerCase()
              .replace(/[^\w\s]/g, "")
              .replace(/\s+/g, " ")
              .trim();
          const normalizedUrlCategory = normalizeString(decodedCategoryName);

          matchedCategory = categories.find((cat) => {
            const normalizedCatName = normalizeString(cat.name);
            return normalizedCatName === normalizedUrlCategory;
          });
        }

        // If still no match, try partial matching
        if (!matchedCategory) {
          matchedCategory = categories.find(
            (cat) =>
              decodedCategoryName
                .toLowerCase()
                .includes(cat.name.toLowerCase()) ||
              cat.name.toLowerCase().includes(decodedCategoryName.toLowerCase())
          );
        }

        console.log("Matched category:", matchedCategory);

        if (matchedCategory) {
          setSelectedCategory([String(matchedCategory.id)]);
          // Use the actual category name from database for API call
          fetchProductsData(matchedCategory.name, true);
        } else {
          console.error("No matching category found for:", decodedCategoryName);
          // Still load all products even if category not found
          console.log("Loading all products instead...");
          fetchProductsData();
        }
      } else {
        // No category in URL, fetch all products
        console.log("No category in URL, fetching all products...");
        fetchProductsData();
      }
    }
  }, [categories, router.query.category, fetchProductsData, categoriesLoadedRef.current]);
  
  // Safety check: If categories loaded but products didn't load
  useEffect(() => {
    // Only run if categories exist, no products, not currently loading, and initial load is done
    if (Array.isArray(categories) && categories.length > 0 && 
        Array.isArray(safeProducts) && safeProducts.length === 0 && 
        !loading && !isLoadingRef.current && !initialLoadRef.current) {
      console.log("Safety check: Categories loaded but no products, fetching immediately...");
      fetchProductsData();
    }
  }, [categories.length, safeProducts.length, loading, fetchProductsData]);

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
    console.log("Product Click:", product);
    router.push(`/ProductDetails?slug=${product.slug}`);
  };

  const handleAddToCart = (e, product, color, size, variationId) => {
    e.stopPropagation();
    addToCart(product, color, size, 1, variationId);
    fbqTrack("AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "INR",
      quantity: 1,
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

  // Get category name by ID for display
  const getCategoryNameById = (categoryId) => {
    const category = categories.find(
      (cat) => cat.id.toString() === categoryId.toString()
    );
    return category ? category.name : categoryId;
  };

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
    // Safety check
    if (!Array.isArray(safeProducts) || safeProducts.length === 0) {
      return [20, 250];
    }
    
    let min = Infinity,
      max = 0;
    safeProducts.forEach((product) => {
      if (!product || !Array.isArray(product.variations)) return;
      (product.variations || []).forEach((variation) => {
        if (!variation || typeof variation.price !== 'number') return;
        if (variation.price < min) min = variation.price;
        if (variation.price > max) max = variation.price;
      });
    });
    if (min === Infinity) min = 20;
    if (max === 0) max = 250;
    return [Math.floor(min), Math.ceil(max)];
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
        if (!selectedCategory.includes(String(catId))) return false;
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
        const inPriceRange = (product.variations || []).some((variation) => {
          if (!variation || typeof variation.price !== 'number') return false;
          return (
            variation.price >= priceRange[0] && variation.price <= priceRange[1]
          );
        });
        if (!inPriceRange) return false;
      }
      
      return true;
    });
  }, [safeProducts, selectedCategory, selectedMaterial, selectedColors, selectedSizes, selectedGender, priceRange, minPrice, maxPrice]);

  // Sort products - memoized for performance
  const sortedProducts = useMemo(() => {
    // Safety check: return empty array if filteredProducts is not valid
    if (!filteredProducts || !Array.isArray(filteredProducts)) {
      return [];
    }
    
    switch (sortBy) {
      case "price-low":
        return [...filteredProducts].sort(
          (a, b) =>
            (a.variations?.[0]?.price || 0) - (b.variations?.[0]?.price || 0)
        );
      case "price-high":
        return [...filteredProducts].sort(
          (a, b) =>
            (b.variations?.[0]?.price || 0) - (a.variations?.[0]?.price || 0)
        );
      case "rating":
        return [...filteredProducts].sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
  
  console.log("Filtering results:", {
    totalProducts: Array.isArray(safeProducts) ? safeProducts.length : 0,
    filteredProducts: Array.isArray(filteredProducts) ? filteredProducts.length : 0,
    sortedProducts: Array.isArray(sortedProducts) ? sortedProducts.length : 0,
    paginatedProducts: Array.isArray(paginatedProducts) ? paginatedProducts.length : 0,
    selectedCategory,
    selectedColors,
    selectedSizes,
    selectedGender,
    selectedMaterial,
    priceRange,
  });

  // Compute total pages based on filtered products
  const totalPages = useMemo(() => {
    if (!Array.isArray(filteredProducts)) return 1;
    return Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  }, [filteredProducts, itemsPerPage]);

  // Debug logs (moved after totalPages is defined)
  console.log("Products Component State:", {
    selectedCategory,
    sortBy,
    priceRange,
    currentPage,
    totalPages,
    totalProducts: Array.isArray(safeProducts) ? safeProducts.length : 0,
    filteredProducts: Array.isArray(filteredProducts) ? filteredProducts.length : 0,
    sortedProducts: Array.isArray(sortedProducts) ? sortedProducts.length : 0,
    paginatedProducts: Array.isArray(paginatedProducts) ? paginatedProducts.length : 0,
    itemsPerPage,
    loading,
    error,
  });

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
      console.log(
        "Safety check: Setting loading to false because products are available"
      );
      setLoading(false);
    }
    
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log("Loading timeout reached, setting loading to false");
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

  // Don't render until component is mounted (prevents hydration mismatch)
  if (!isMounted) {
    return (
      <SeoWrapper pageName="products">
        <Header />
        <div className="products-page">
          <div className="products-header">
            <h1>Our Products</h1>
          </div>
          <div className="products-container">
            <div className="product-listing">
              <div className="products-grid">
                {Array(12).fill(0).map((_, idx) => (
                  <ProductSkeleton key={`skeleton-${idx}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </SeoWrapper>
    );
  }

  return (
    <SeoWrapper pageName="products">
      <Header />
      <div className="products-page">
        <div className="products-header">
          <h1>
            {Array.isArray(selectedCategory) && selectedCategory.length > 0
              ? `Products - ${getCategoryNameById(selectedCategory[0])}`
              : getCategoryNameFromUrl()
              ? `Products - ${getCategoryNameFromUrl()}`
              : "Our Products"}
          </h1>
          <div className="products-controls">
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Clear Filters
              </button>
            )}
            <button
              className={`filter-toggle${isMobile ? " mobile-fixed" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter /> Filters
            </button>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

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
                    <ProductSkeleton key={`products-skeleton-${idx}`} />
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
      <Footer />
    </SeoWrapper>
  );
};

export default Products;
