import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  FiFilter,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";
import ProductCard, { filterOptions } from "../components/ProductCard";
import {
  getAllPublicProducts,
  getPublicCategories,
  getPublicCategoryByName,
} from "../services/publicindex";
import { getProductImageSrc } from "../utils/imageUtils";
import SeoWrapper from "../console/SeoWrapper";
import { fbqTrack } from "../components/common/Analytics";
import colorMap from "../components/products/colorMap";
import Pagination from "../components/common/Pagination";
import "../styles/common/TableControls.css";

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

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([20, 250]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState([]);

  // Data State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalProducts, setTotalProducts] = useState(0);

  // Dynamic Filter Options
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

      try {
        console.log("Fetching categories...");
        console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
        const data = await getPublicCategories();
        console.log("Categories API response:", data);
        setCategories(data);
        categoriesLoadedRef.current = true;
        console.log("Categories loaded:", data.length);
      } catch (error) {
        console.error("Error fetching categories:", error);
        console.error("Categories error details:", error.response?.data || error.message);
        setError("Failed to load categories. Please refresh the page.");
        setLoading(false);
      }
    };
    fetchCategories();
  }, []); // Empty dependency array - only run once on mount

  // Main data fetching function - optimized to prevent multiple calls
  const fetchProductsData = useCallback(
    async (categoryName = null, isCategorySpecific = false) => {
      // Prevent multiple simultaneous API calls
      if (isLoadingRef.current) {
        console.log("API call already in progress, skipping...");
        return;
      }

      // Prevent loading products if already loaded for general products
      if (!isCategorySpecific && productsLoadedRef.current) {
        console.log("Products already loaded, skipping...");
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        let response;

        if (isCategorySpecific && categoryName) {
          // Fetch products by category name
          console.log("Fetching products for category:", categoryName);
          console.log("API URL for category:", process.env.NEXT_PUBLIC_API_URL);
          response = await getPublicCategoryByName(categoryName);
          console.log("Category API Response:", response);

          // The backend response structure is different - it doesn't have a 'success' field
          if (response && response.products) {
            // Transform category-specific products to match standard format
            const transformedProducts = (response.products || []).map((p) => {
              let imageUrl = null;
              if (p.image) {
                if (p.image.startsWith("http")) {
                  imageUrl = p.image;
                } else if (p.image.startsWith("/uploads/")) {
                  const baseUrl =
                    process.env.NEXT_PUBLIC_IMAGE_URL || "https://crosscoin.in";
                  imageUrl = `${baseUrl}${p.image}`;
                } else {
                  const baseUrl =
                    process.env.NEXT_PUBLIC_IMAGE_URL || "https://crosscoin.in";
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
                images: imageUrl ? [{ image_url: imageUrl }] : [],
                variations: [
                  {
                    price: parseFloat(p.price) || 0,
                    comparePrice: parseFloat(p.comparePrice) || 0,
                    stock: parseInt(p.stock) || 0,
                  },
                ],
              };
            });
            console.log("Transformed products:", transformedProducts);
            setProducts(transformedProducts);
            setTotalProducts(transformedProducts.length);
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
          // Fetch all products
          console.log("Fetching all products");
          console.log("API URL for all products:", process.env.NEXT_PUBLIC_API_URL);
          const params = {
            page: 1,
            limit: 1000, // Fetch all for client-side filtering
          };
          response = await getAllPublicProducts(params);
          console.log("All products API Response:", response);

          if (response?.success) {
            setProducts(response.data?.products || []);
            setTotalProducts(
              response.data?.total || response.data?.totalProducts || 0
            );
            setLoading(false); // Ensure loading is set to false
            productsLoadedRef.current = true; // Mark as loaded
          } else if (response?.data?.products) {
            // Handle case where response structure is different
            setProducts(response.data.products || []);
            setTotalProducts(
              response.data.total || response.data.totalProducts || 0
            );
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

  // Handle category from URL query - only run once when categories are loaded
  useEffect(() => {
    const categoryFromQuery = router.query.category;

    // Only proceed if we have categories loaded and this is the initial load
    if (categories.length > 0 && initialLoadRef.current && !isLoadingRef.current) {
      initialLoadRef.current = false;

      if (categoryFromQuery) {
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
          setError(
            `Category "${decodedCategoryName}" not found. Please try a different category.`
          );
          setLoading(false);
        }
      } else {
        // No category in URL, fetch all products
        fetchProductsData();
      }
    }
  }, [categories, router.query.category]); // Use specific query parameter to prevent infinite loops

  // After products and categories are loaded, compute dynamic filters
  useEffect(() => {
    if (products.length > 0 && categories.length > 0) {
      setFilterOptionsDynamic(computeDynamicFilters(products, categories));
    }
  }, [products, categories]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 500);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  const computeDynamicFilters = (products, categoriesList) => {
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
  const getMinMaxPrice = () => {
    let min = Infinity,
      max = 0;
    products.forEach((product) => {
      (product.variations || []).forEach((variation) => {
        if (variation.price < min) min = variation.price;
        if (variation.price > max) max = variation.price;
      });
    });
    if (min === Infinity) min = 20;
    if (max === 0) max = 250;
    return [Math.floor(min), Math.ceil(max)];
  };
  const [minPrice, maxPrice] = getMinMaxPrice();

  // On products load, set priceRange to [minPrice, maxPrice]
  useEffect(() => {
    if (products.length > 0) {
      setPriceRange([minPrice, maxPrice]);
    }
    // eslint-disable-next-line
  }, [products.length]);

  // Add a function to filter products according to all selected filters
  const getFilteredProducts = () => {
    return products.filter((product) => {
      // Category filter - skip if we're viewing a specific category (all products are already from that category)
      if (selectedCategory.length > 0) {
        const catId =
          product.category_id || (product.category && product.category.id);
        console.log("Category filter check:", {
          productId: product.id,
          catId,
          selectedCategory,
        });
        if (!selectedCategory.includes(String(catId))) return false;
      }
      // Material filter
      if (selectedMaterial.length > 0) {
        const hasMaterial = (product.variations || []).some((variation) => {
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
      if (selectedColors.length > 0) {
        const hasColor = (product.variations || []).some((variation) => {
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
      if (selectedSizes.length > 0) {
        const hasSize = (product.variations || []).some((variation) => {
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
      if (selectedGender.length > 0) {
        const hasGender = (product.variations || []).some((variation) => {
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
      if (priceRange[0] !== minPrice || priceRange[1] !== maxPrice) {
        const inPriceRange = (product.variations || []).some((variation) => {
          return (
            variation.price >= priceRange[0] && variation.price <= priceRange[1]
          );
        });
        if (!inPriceRange) return false;
      }
      return true;
    });
  };

  // Add this function inside the Products component
  const sortProducts = (products) => {
    switch (sortBy) {
      case "price-low":
        return [...products].sort(
          (a, b) =>
            (a.variations?.[0]?.price || 0) - (b.variations?.[0]?.price || 0)
        );
      case "price-high":
        return [...products].sort(
          (a, b) =>
            (b.variations?.[0]?.price || 0) - (a.variations?.[0]?.price || 0)
        );
      case "rating":
        return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "featured":
      default:
        return products; // Default order or implement your own featured logic
    }
  };

  // Get filtered products
  const filteredProducts = getFilteredProducts();
  console.log("Filtering results:", {
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    selectedCategory,
    selectedColors,
    selectedSizes,
    selectedGender,
    selectedMaterial,
    priceRange,
  });

  // Paginate filtered and sorted products
  const getPaginatedProducts = () => {
    const filtered = sortProducts(filteredProducts);
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIdx, startIdx + itemsPerPage);
  };

  // Compute total pages based on filtered products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  // Debug logs (moved after totalPages is defined)
  console.log("Products Component State:", {
    selectedCategory,
    sortBy,
    priceRange,
    currentPage,
    totalPages,
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    paginatedProducts: getPaginatedProducts().length,
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
    if (products.length > 0 && loading) {
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
        if (products.length === 0) {
          setError("Loading timeout - please refresh the page");
        }
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [products, loading]);

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

  // Check if any filters are active
  const hasActiveFilters =
    selectedCategory.length > 0 ||
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    selectedGender.length > 0 ||
    selectedMaterial.length > 0 ||
    priceRange[0] !== minPrice ||
    priceRange[1] !== maxPrice;

  return (
    <SeoWrapper pageName="products">
      <Header />
      <div className="products-page">
        <div className="products-header">
          <h1>
            {selectedCategory.length > 0
              ? `Products - ${getCategoryNameById(selectedCategory[0])}`
              : getCategoryNameFromUrl()
              ? `Products - ${getCategoryNameFromUrl()}`
              : "Our Products"}
          </h1>
          <div className="products-controls">
            <button
              className={`clear-filters-btn${hasActiveFilters ? "" : " clear-filters-btn--placeholder"}`}
              onClick={hasActiveFilters ? clearAllFilters : undefined}
              disabled={!hasActiveFilters}
              aria-hidden={!hasActiveFilters}
              tabIndex={hasActiveFilters ? 0 : -1}
              type="button"
            >
              Clear Filters
            </button>
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
          {!isMobile && showFilters && (
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
                            checked={selectedMaterial.includes(material)}
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
                      <span>Min: ₹{minPrice}</span>
                      <span>Max: ₹{maxPrice}</span>
                    </div>
                    <div className="slider-wrapper">
                      <input
                        type="range"
                        min={minPrice}
                        max={maxPrice}
                        value={priceRange[0]}
                        onChange={(e) =>
                          handleFilterChange("price", [
                            Number(e.target.value),
                            priceRange[1],
                          ])
                        }
                        className="price-slider min-slider"
                        style={{
                          zIndex: priceRange[0] === priceRange[1] ? 5 : 3,
                        }}
                      />
                      <input
                        type="range"
                        min={minPrice}
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) =>
                          handleFilterChange("price", [
                            priceRange[0],
                            Number(e.target.value),
                          ])
                        }
                        className="price-slider max-slider"
                        style={{
                          zIndex: priceRange[0] === priceRange[1] ? 4 : 2,
                          "--hide-max-thumb":
                            priceRange[0] === priceRange[1] ? 0 : 1,
                        }}
                      />
                      <div
                        className="slider-track-highlight"
                        style={{
                          left:
                            ((priceRange[0] - minPrice) /
                              (maxPrice - minPrice)) *
                              100 +
                            "%",
                          right:
                            100 -
                            ((priceRange[1] - minPrice) /
                              (maxPrice - minPrice)) *
                              100 +
                            "%",
                        }}
                      />
                    </div>
                    <div className="price-inputs">
                      <span>₹{priceRange[0]}</span> -{" "}
                      <span>₹{priceRange[1]}</span>
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
                    {filterOptionsDynamic.colors.map((color) => (
                      <button
                        key={color}
                        className={`color-btn ${
                          selectedColors.includes(color) ? "active" : ""
                        }`}
                        style={{
                          backgroundColor:
                            colorMap[color.toLowerCase()] || color,
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
                    {filterOptionsDynamic.sizes.map((size) => (
                      <label key={size} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={selectedSizes.includes(size)}
                            onChange={() => handleFilterChange("size", size)}
                          />
                          <p>{size} </p>
                        </div>
                        <span>
                          [{filterOptionsDynamic.counts.sizes[size] || 0}]
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
                    {filterOptionsDynamic.genders.map((gender) => (
                      <label key={gender} className="checkbox-label">
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            checked={selectedGender.includes(gender)}
                            onChange={() =>
                              handleFilterChange("gender", gender)
                            }
                          />
                          <p>{gender} </p>
                        </div>
                        <span>
                          [{filterOptionsDynamic.counts.genders[gender] || 0}]
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Mobile Modal */}
          {isMobile && showFilters && (
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
                                checked={selectedMaterial.includes(material)}
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
                          <span>Min: ₹{minPrice}</span>
                          <span>Max: ₹{maxPrice}</span>
                        </div>
                        <div className="slider-wrapper">
                          <input
                            type="range"
                            min={minPrice}
                            max={maxPrice}
                            value={priceRange[0]}
                            onChange={(e) =>
                              handleFilterChange("price", [
                                Number(e.target.value),
                                priceRange[1],
                              ])
                            }
                            className="price-slider min-slider"
                            style={{
                              zIndex: priceRange[0] === priceRange[1] ? 5 : 3,
                            }}
                          />
                          <input
                            type="range"
                            min={minPrice}
                            max={maxPrice}
                            value={priceRange[1]}
                            onChange={(e) =>
                              handleFilterChange("price", [
                                priceRange[0],
                                Number(e.target.value),
                              ])
                            }
                            className="price-slider max-slider"
                            style={{
                              zIndex: priceRange[0] === priceRange[1] ? 4 : 2,
                              "--hide-max-thumb":
                                priceRange[0] === priceRange[1] ? 0 : 1,
                            }}
                          />
                          {/* Colored track between thumbs */}
                          <div
                            className="slider-track-highlight"
                            style={{
                              left:
                                ((priceRange[0] - minPrice) /
                                  (maxPrice - minPrice)) *
                                  100 +
                                "%",
                              right:
                                100 -
                                ((priceRange[1] - minPrice) /
                                  (maxPrice - minPrice)) *
                                  100 +
                                "%",
                            }}
                          />
                        </div>
                        <div className="price-inputs">
                          <span>₹{priceRange[0]}</span> -{" "}
                          <span>₹{priceRange[1]}</span>
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
                        {filterOptionsDynamic.colors.map((color) => (
                          <button
                            key={color}
                            className={`color-btn ${
                              selectedColors.includes(color) ? "active" : ""
                            }`}
                            style={{
                              backgroundColor:
                                colorMap[color.toLowerCase()] || color,
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
                        {filterOptionsDynamic.sizes.map((size) => (
                          <label key={size} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={selectedSizes.includes(size)}
                                onChange={() =>
                                  handleFilterChange("size", size)
                                }
                              />
                              <p>{size} </p>
                            </div>
                            <span>
                              [{filterOptionsDynamic.counts.sizes[size] || 0}]
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
                        {filterOptionsDynamic.genders.map((gender) => (
                          <label key={gender} className="checkbox-label">
                            <div className="checkbox-group">
                              <input
                                type="checkbox"
                                checked={selectedGender.includes(gender)}
                                onChange={() =>
                                  handleFilterChange("gender", gender)
                                }
                              />
                              <p>{gender} </p>
                            </div>
                            <span>
                              [
                              {filterOptionsDynamic.counts.genders[gender] || 0}
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
                <div className="loading">Loading products...</div>
              ) : error ? (
                <div className="error">{error}</div>
              ) : filteredProducts.length === 0 ? (
                <div className="no-products">
                  {selectedCategory.length > 0
                    ? `No products available in "${getCategoryNameById(
                        selectedCategory[0]
                      )}" category. Try selecting a different category or clearing filters.`
                    : getCategoryNameFromUrl()
                    ? `No products available in "${getCategoryNameFromUrl()}" category. Try selecting a different category or clearing filters.`
                    : "No products found matching your criteria. Try adjusting your filters."}
                </div>
              ) : (
                // Apply sorting to filtered products before rendering, then paginate
                getPaginatedProducts().map((product) => (
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
            {filteredProducts.length > itemsPerPage && totalPages > 1 && (
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
