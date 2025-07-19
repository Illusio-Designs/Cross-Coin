import React, { useState } from 'react';
import Image from 'next/image';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { HiOutlineEye } from "react-icons/hi2";
import { useRouter } from "next/router";
import { useWishlist } from '../context/WishlistContext';
import { getProductImageSrc } from '../utils/imageUtils';

// Filter options data - This should come from API in real implementation
export const filterOptions = {
  categories: ['Ankle', 'Long', 'Short'],
  materials: ['Winter Wear', 'Summer Wear', 'Cotton', 'Wools', 'Silk', 'Net', 'Rubber'],
  colors: ['red', 'blue', 'green', 'yellow', 'black', 'gray'],
  sizes: ['S', 'M', 'L', 'XL'],
  genders: ['Men', 'Women', 'Kids']
};

const ProductCard = ({ product, onProductClick, onAddToCart }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();

  const handleWishlistClick = (e) => {
    e.stopPropagation(); // Prevent triggering product click
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  // Get the primary image or first image from the images array
  let imageData = null;
  if (Array.isArray(product?.images) && product.images.length > 0) {
    imageData = product.images.find(img => img.is_primary) || product.images[0];
  } else if (typeof product?.image === 'string') {
    imageData = { image_url: product.image };
  }
  const productImage = imageData && imageData.image_url ? getProductImageSrc(imageData) : null;
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get the first variation for price
  const variation = product?.variations?.[0];
  const price = variation?.price || 0;
  const comparePrice = variation?.comparePrice || 0;

  // Get category name
  const categoryName = product?.category?.name || '';

  // Get default color and size from the first variation
  let defaultColor = '';
  let defaultSize = '';
  let variationId = variation?.id || null;
  if (variation && variation.attributes) {
    const attrs = typeof variation.attributes === 'string' ? JSON.parse(variation.attributes) : variation.attributes;
    defaultColor = attrs.color?.[0] || '';
    defaultSize = attrs.size?.[0] || '';
  }

  // Format badge text safely
  const formatBadge = (badge) => {
    if (!badge) return '';
    return badge.toString().replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div 
      className="product-card"
      onClick={() => onProductClick(product)}
      style={{ cursor: 'pointer' }}
    >
      <div className="product-image" style={{ position: 'relative' }}>
        {product?.badge && (
          <span className="product-badge">
            {formatBadge(product.badge)}
          </span>
        )}
        {productImage ? (
          <>
            <img
              src={productImage}
              alt={product?.name || 'Product Image'}
              width={300}
              height={300}
              style={{
                objectFit: 'cover',
                background: '#eee',
                display: 'block'
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="shimmer-placeholder" style={{ width: 300, height: 300 }} />
            )}
          </>
        ) : (
          <div style={{ width: 300, height: 300, background: '#eee', borderRadius: 8 }} />
        )}
        <button 
          className={`wishlist-btn ${isInWishlist(product?.id) ? 'active' : ''}`}
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
            {comparePrice > 0 && <span className="original-price">₹{comparePrice}</span>} 
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