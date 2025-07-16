import React from 'react';
import Image from 'next/image';
import { FiHeart } from 'react-icons/fi';
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
  const productImage = getProductImageSrc(imageData);

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
      <div className="product-image">
        {product?.badge && (
          <span className="product-badge">
            {formatBadge(product.badge)}
          </span>
        )}
        <Image 
          src={productImage} 
          alt={product?.name || 'Product Image'} 
          width={300}
          height={300}
          style={{ objectFit: 'cover' }}
        />
        <button 
          className={`wishlist-btn ${isInWishlist(product?.id) ? 'active' : ''}`}
          onClick={handleWishlistClick}
          aria-label="Add to wishlist"
        >
          <FiHeart />
        </button>
      </div>
      <div className="product-info">
        <h3>{product?.name}</h3>
        <div className="product-meta">
          <span className="product-price">
            ₹{price}
            {comparePrice > 0 && <span className="original-price">₹{comparePrice}</span>} 
          </span>
          <button 
            className="add-to-cart"
            onClick={(e) => onAddToCart(e, product, defaultColor, defaultSize, variationId)}
            aria-label="Quick view"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 