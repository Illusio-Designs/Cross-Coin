import React, { useState, useEffect, useRef } from "react";
import SafeImage from "./common/SafeImage";
import { Button } from "../components/ui";
import { FiHeart, FiShoppingCart } from "react-icons/fi";
import { HiOutlineEye } from "react-icons/hi2";
import { useRouter } from "next/router";
import { useWishlist } from "../context/WishlistContext";
import imagePreloader from "../utils/imagePreloader";
import { BADGE_CONFIG, getBadgeDisplay, formatBadge } from "../config/badgeConfig";
import { selectProductImage, selectProductImages } from "../utils/productImageSelector";
import { getImageUrl } from "../utils/imageHandler";

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

  // Debug logging for badge and wishlist
  useEffect(() => {
    console.log('ProductCard Loaded:', {
      productId: product?.id,
      productName: product?.name,
      badge: product?.badge,
      badgeIsNull: product?.badge === null,
      badgeIsUndefined: product?.badge === undefined,
      badgeValue: product?.badge || 'NOT SET',
      wishlistStatus: isInWishlist(product?.id),
      allProductData: product
    });
  }, [product?.id, product?.badge]);

  const variation = product?.variations?.[0];

  // Safety check: if no variation and no product price, log warning
  if (!variation && !product?.price) {
    console.warn('ProductCard: No variation or product price found for product:', product?.id);
  }

  // Get hover image using centralized utility
  const allImages = selectProductImages(product, variation);
  const hoverImageData = allImages.length > 1 ? allImages[1] : null;

  // Get hover image URL for prefetch
  const getHoverImageUrl = () => {
    if (!hoverImageData) return null;
    return getImageUrl(hoverImageData);
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
  // DISABLED: Aggressive preloading causes performance issues
  // Hover images will be loaded on-demand when user hovers
  useEffect(() => {
    // Preloading disabled to improve initial page load performance
    // Hover images will load on first hover instead
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

  // Get the primary image or first image from the images array using centralized utility
  const imageData = selectProductImage(product, variation);

  // Get the first variation for price - with fallback to product price if no variation
  const price = variation?.price || product?.price || 0;
  const comparePrice = variation?.comparePrice || product?.comparePrice || 0;

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

  return (
    <div
      className="product-card"
      onClick={() => onProductClick(product)}
      style={{ cursor: "pointer" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="product-image" style={{ position: "relative" }}>
        {/* Main image container with hover image overlay */}
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
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

        {/* Badge - positioned absolutely, outside overflow container */}
        {product?.badge && product.badge !== 'none' && (
          <>
            {console.log('Badge Rendering:', { badge: product.badge, display: getBadgeDisplay(product.badge) })}
            <span 
              className="product-badge" 
              style={{ 
                background: getBadgeDisplay(product.badge).color,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                zIndex: 10
              }}
              aria-label={getBadgeDisplay(product.badge).label}
              title={getBadgeDisplay(product.badge).description}
            >
              <span>{getBadgeDisplay(product.badge).icon}</span>
              <span>{formatBadge(product.badge)}</span>
            </span>
          </>
        )}
        {!product?.badge && console.log('Badge is NULL or UNDEFINED for product:', product?.id)}
        {product?.badge === 'none' && console.log('Badge is "none" for product:', product?.id)}
        
        {/* Wishlist Button - positioned absolutely, outside overflow container */}
        <button
          className={`wishlist-btn ${
            isInWishlist(product?.id) ? "active" : ""
          }`}
          onClick={(e) => {
            console.log('Wishlist Button Clicked:', {
              productId: product?.id,
              isCurrentlyInWishlist: isInWishlist(product?.id),
              action: isInWishlist(product?.id) ? 'REMOVE' : 'ADD'
            });
            handleWishlistClick(e);
          }}
          aria-label="Add to wishlist"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 10,
            pointerEvents: 'auto'
          }}
        >
          {console.log('Wishlist Button Rendered:', { 
            productId: product?.id, 
            isInWishlist: isInWishlist(product?.id),
            buttonElement: 'SHOULD_BE_VISIBLE'
          })}
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
          <Button
            size="sm"
            variant="outline"
            icon={<HiOutlineEye />}
            onClick={(e) => {
              e.stopPropagation();
              if (product.slug) {
                router.push(`/ProductDetails?slug=${product.slug}`);
              } else {
                router.push(`/ProductDetails/${product.id}`);
              }
            }}
            aria-label="View product details"
            className="view-details-btn"
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
