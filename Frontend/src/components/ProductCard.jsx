import React from "react";
import SafeImage from "./common/SafeImage";
import { FiHeart, FiShoppingCart } from "react-icons/fi";
import { HiOutlineEye } from "react-icons/hi2";
import { useRouter } from "next/router";
import { useWishlist } from "../context/WishlistContext";

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

const ProductCard = ({ product, onProductClick, onAddToCart }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();

  const variation = product?.variations?.[0];

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
    >
      <div className="product-image" style={{ position: "relative" }}>
        {product?.badge && (
          <span className="product-badge">{formatBadge(product.badge)}</span>
        )}
        <SafeImage
          imageData={imageData}
          alt={product?.name || "Product Image"}
          width="300px"
          height="300px"
          style={{ objectFit: "cover", background: "#f5f5f5" }}
          isProductCard={true}
        />
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
