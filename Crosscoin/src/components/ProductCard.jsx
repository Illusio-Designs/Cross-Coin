import React, { useEffect, useState } from "react";
import SafeImage from "./common/SafeImage";
import { FiHeart } from "react-icons/fi";
import { useWishlist } from "../context/WishlistContext";
import { getBadgeDisplay, formatBadge } from "../config/badgeConfig";
import { selectProductImage } from "../utils/productImageSelector";
import colorMap from "./products/colorMap";
import { getPublicProductReviews } from "../services/publicApi";

// Filter options data - This should come from API in real implementation
export const filterOptions = {
  categories: ["Ankle", "Long", "Short"],
  materials: ["Winter Wear", "Summer Wear", "Cotton", "Wools", "Silk", "Net", "Rubber"],
  colors: ["red", "blue", "green", "yellow", "black", "gray"],
  sizes: ["S", "M", "L", "XL"],
  genders: ["Men", "Women", "Kids"],
};

const ProductCard = ({ product, onProductClick, onAddToCart, index = 0 }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("ProductCard:", { id: product?.id, badge: product?.badge });
    }
  }, [product?.id, product?.badge]);

  const variation = product?.variations?.[0];
  const imageData = selectProductImage(product, variation);
  const price = variation?.price || product?.price || 0;
  const comparePrice = variation?.comparePrice || product?.comparePrice || 0;

  const [reviewCount, setReviewCount] = useState(product?.reviewCount || 0);
  const [avgRating, setAvgRating] = useState(product?.avgRating || null);

  useEffect(() => {
    if (!product?.id) return;
    // If already provided by API, use them directly
    if (product.reviewCount !== undefined && product.avgRating !== undefined) {
      setReviewCount(product.reviewCount);
      setAvgRating(product.avgRating);
      return;
    }
    // Otherwise fetch from API
    getPublicProductReviews(product.id, { limit: 100 })
      .then(data => {
        const reviews = data?.reviews || data || [];
        const count = Array.isArray(reviews) ? reviews.length : 0;
        const avg = count > 0
          ? parseFloat((reviews.reduce((s, r) => s + (r.rating || 0), 0) / count).toFixed(1))
          : null;
        setReviewCount(count);
        setAvgRating(avg);
      })
      .catch(() => {});
  }, [product?.id]);

  const [showAllColors, setShowAllColors] = useState(false);

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({
        ...product,
        variationImages: variation?.images?.map((img) => img.image_url || img.url || img) || [],
      });
    }
  };

  // Collect unique colors from all variations
  const colors = [];
  (product?.variations || []).forEach((v) => {
    const attrs = typeof v.attributes === "string" ? JSON.parse(v.attributes) : v.attributes;
    const varColors = Array.isArray(attrs?.color) ? attrs.color : attrs?.color ? [attrs.color] : [];
    varColors.forEach((c) => { if (c && !colors.includes(c)) colors.push(c); });
  });

  return (
    <div className="product-card" onClick={() => onProductClick(product)} style={{ cursor: "pointer" }}>
      <div className="product-image">
        <div className="product-image__inner">
          <SafeImage
            imageData={imageData}
            alt={product?.name || "Product Image"}
            priority={index < 6}
            fetchPriority={index < 6 ? "high" : "low"}
            quality={75}
            isProductCard={true}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {product?.badge && product.badge !== "none" && product.badge !== "" && (
          <div className="product-badge__ribbon" aria-label={getBadgeDisplay(product.badge).label}>
            <span>{formatBadge(product.badge)}</span>
          </div>
        )}

        {avgRating ? (
          <div className="rating-pill">
            <span className="rating-pill__star">★</span>
            <span className="rating-pill__score">{avgRating}/5</span>
            <span className="rating-pill__count">{reviewCount}</span>
          </div>
        ) : null}

        <button
          className={`wishlist-btn ${isInWishlist(product?.id) ? "active" : ""}`}
          onClick={handleWishlistClick}
          aria-label={isInWishlist(product?.id) ? "Remove from wishlist" : "Add to wishlist"}
        >
          <FiHeart />
        </button>
      </div>

      <div className="product-info">
        <h3 className="product-name">{product?.name}</h3>

        {colors.length > 0 && (
          <div className="product-colors">
            {(showAllColors ? colors : colors.slice(0, 5)).map((color, i) => (
              <span
                key={i}
                className="product-color-dot"
                style={{ background: colorMap[color?.toLowerCase()] || color }}
                title={color}
              />
            ))}
            {colors.length > 5 && !showAllColors && (
              <button
                className="product-color-more-btn"
                onClick={(e) => { e.stopPropagation(); setShowAllColors(true); }}
                aria-label="Show more colors"
              >
                +{colors.length - 5}
              </button>
            )}
          </div>
        )}

        <div className="product-footer">
          <span className="product-price">
            ₹{price}
            {comparePrice > 0 && <span className="original-price">₹{comparePrice}</span>}
          </span>
          <button
            className="add-to-bag-btn"
            onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }}
            aria-label="Add to bag"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            ADD TO BAG
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
