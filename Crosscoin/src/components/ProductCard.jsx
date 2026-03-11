import React, { useState, useEffect, useRef } from "react";
import SafeImage from "./common/SafeImage";
import { FiHeart, FiShoppingCart } from "react-icons/fi";
import { HiOutlineEye } from "react-icons/hi2";
import { useRouter } from "next/router";
import { useWishlist } from "../context/WishlistContext";
import imagePreloader from "../utils/imagePreloader";

// Filter options data - This should come from API in real implementation
export const filterOptions = {
  categories: ["Ankle", "Long", "Short"],
  materials: [
    "Winter Wear",
    "Summer Wear",
    "Cotton",
    "Wools",
    "Silk",
    "Net",
    "Rubber",
  ],
  colors: ["red", "blue", "green", "yellow", "black", "gray"],
  sizes: ["S", "M", "L", "XL"],
  genders: ["Men", "Women", "Kids"],
};

const ProductCard = ({ product, onProductClick, onAddToCart, index = 0 }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [hoverImagePreloaded, setHoverImagePreloaded] = useState(false);
  const hoverImageRef = useRef(null);
  const isAboveFold = index < 6; // Above-the-fold cards

  const variation = product?.variations?.[0];

  // Get hover image (second image if available)
  let hoverImageData = null;
  if (variation?.images && Array.isArray(variation.images) && variation.images.length > 1) {
    hoverImageData = variation.images[1];
  } else if (Array.isArray(product?.images) && product.images.length > 1) {
    hoverImageData = product.images[1];
  } else if (Array.isArray(product?.ProductImages) && product.ProductImages.length > 1) {
    hoverImageData = product.ProductImages[1];
  }

  // Get hover image URL for prefetch
  const getHoverImageUrl = () => {
    if (!hoverImageData) return null;
    
    let rawUrl = null;
    if (typeof hoverImageData === 'string') {
      rawUrl = hoverImageData;
    } else if (hoverImageData.image_url) {
      rawUrl = hoverImageData.image_url;
    } else if (hoverImageData.url) {
      rawUrl = hoverImageData.url;
    }
    
    if (!rawUrl || rawUrl.trim() === '') return null;
    
    let url = null;
    if (rawUrl.startsWith("http")) {
      url = rawUrl;
    } else if (rawUrl.startsWith("/assets/")) {
      url = rawUrl;
    } else if (rawUrl.startsWith("/uploads/")) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      url = `${apiUrl}${rawUrl}`;
    } else {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      url = `${apiUrl}/uploads/products/${rawUrl}`;
    }
    
    // Note: Query parameters for responsive sizing and format optimization
    // are now handled by SafeImage component for consistency
    
    return url;
  };

  // Monitor preload queue size to prevent memory issues
  useEffect(() => {
    // Log queue size for monitoring (can be used for performance metrics)
    const queueSize = imagePreloader.getQueueSize();
    if (queueSize > 10) {
      // Queue is getting large, but this is handled by the preloader's maxConcurrent limit
      console.debug(`Preload queue size: ${queueSize}`);
    }
  }, [hoverImagePreloaded]);

  // Preload hover images on component mount for above-the-fold cards
  // Use requestIdleCallback for above-the-fold to preload during idle time
  useEffect(() => {
    if (isAboveFold && hoverImageData) {
      const hoverImageUrl = getHoverImageUrl();
      if (hoverImageUrl) {
        // Use requestIdleCallback for above-the-fold cards to preload during idle time
        imagePreloader.preloadImage(hoverImageUrl, true).then(() => {
          setHoverImagePreloaded(true);
        }).catch(() => {
          // Silently fail - hover image preload is not critical
        });
      }
    }
  }, [isAboveFold, hoverImageData]);

  // Handle hover - preload for below-the-fold cards on first hover
  const handleMouseEnter = () => {
    setIsHovered(true);
    
    // Preload hover image on first hover for below-the-fold cards
    if (!isAboveFold && !hoverImagePreloaded && hoverImageData) {
      const hoverImageUrl = getHoverImageUrl();
      if (hoverImageUrl) {
        // Don't use requestIdleCallback for hover - preload immediately
        imagePreloader.preloadImage(hoverImageUrl, false).then(() => {
          setHoverImagePreloaded(true);
        }).catch(() => {
          // Silently fail
        });
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation(); // Prevent triggering product click
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      const productToSend = {
        ...product,
        variationImages:
          variation?.images?.map((img) => img.image_url || img.url || img) ||
          [],
      };
      addToWishlist(productToSend);
    }
  };

  // Get the primary image or first image from the images array
  let imageData = null;
  
  // Priority 1: Check variation images
  if (variation?.images && Array.isArray(variation.images) && variation.images.length > 0) {
    imageData = variation.images[0];
  } 
  // Priority 2: Check product images array
  else if (Array.isArray(product?.images) && product.images.length > 0) {
    imageData = product.images.find((img) => img.is_primary) || product.images[0];
  } 
  // Priority 3: Check if product has a single image property
  else if (product?.image) {
    if (typeof product.image === 'string') {
      imageData = { image_url: product.image };
    } else {
      imageData = product.image;
    }
  }
  // Priority 4: Check ProductImages (from backend)
  else if (Array.isArray(product?.ProductImages) && product.ProductImages.length > 0) {
    imageData = product.ProductImages.find((img) => img.is_primary) || product.ProductImages[0];
  }

  // Get the first variation for price
  const price = variation?.price || 0;
  const comparePrice = variation?.comparePrice || 0;

  // Get category name
  const categoryName = product?.category?.name || "";

  // Get default color and size from the first variation
  let defaultColor = "";
  let defaultSize = "";
  let variationId = variation?.id || null;
  if (variation && variation.attributes) {
    const attrs =
      typeof variation.attributes === "string"
        ? JSON.parse(variation.attributes)
        : variation.attributes;
    defaultColor = attrs.color?.[0] || "";
    defaultSize = attrs.size?.[0] || "";
  }

  // Format badge text safely
  const formatBadge = (badge) => {
    if (!badge) return "";
    return badge.toString().replace(/_/g, " ").toUpperCase();
  };

  return (
    <div
      className="product-card"
      onClick={() => onProductClick(product)}
      style={{ cursor: "pointer" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="product-image" style={{ position: "relative" }}>
        {product?.badge && product.badge !== 'none' && (
          <span className="product-badge">{formatBadge(product.badge)}</span>
        )}
        
        {/* Main image container with hover image overlay */}
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* Main image */}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <SafeImage
              imageData={imageData}
              alt={product?.name || "Product Image"}
              priority={index < 6}
              fetchPriority={index < 6 ? "high" : "low"}
              quality={75}
              style={{ 
                background: "#ffffff",
                opacity: isHovered && hoverImagePreloaded ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out'
              }}
              isProductCard={true}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
          
          {/* Hover image overlay - only render if hover image exists */}
          {hoverImageData && (
            <div 
              ref={hoverImageRef}
              style={{ 
                position: "absolute", 
                top: 0, 
                left: 0, 
                width: "100%", 
                height: "100%",
                opacity: isHovered && hoverImagePreloaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                pointerEvents: 'none'
              }}
            >
              <SafeImage
                imageData={hoverImageData}
                alt={`${product?.name || "Product Image"} - Hover`}
                priority={false}
                fetchPriority="low"
                quality={75}
                style={{ 
                  background: "#ffffff",
                  width: "100%",
                  height: "100%"
                }}
                isProductCard={true}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          )}
        </div>
        
        <button
          className={`wishlist-btn ${
            isInWishlist(product?.id) ? "active" : ""
          }`}
          onClick={handleWishlistClick}
          aria-label="Add to wishlist"
        >
          <FiHeart />
        </button>
      </div>
      <div className="product-info">
        <div className="product-main-info">
          <h3>{product?.name}</h3>
        </div>
        <div className="product-meta">
          <span className="product-price">
            ₹{price}
            {comparePrice > 0 && (
              <span className="original-price">₹{comparePrice}</span>
            )}
          </span>
          <button
            className="view-details"
            onClick={(e) => {
              e.stopPropagation();
              if (product.slug) {
                router.push(`/ProductDetails?slug=${product.slug}`);
              } else {
                router.push(`/ProductDetails/${product.id}`);
              }
            }}
            aria-label="View product details"
          >
            <HiOutlineEye />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
