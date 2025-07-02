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
  const imageData = product?.images?.find(img => img.is_primary) || product?.images?.[0];
  const productImage = getProductImageSrc(imageData);

  // Get the first variation for price
  const variation = product?.variations?.[0];
  const price = variation?.price || 0;
  const comparePrice = variation?.comparePrice || 0;

  // Get category name
  const categoryName = product?.category?.name || '';

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
        {categoryName && <p className="product-category">{categoryName}</p>}
        <div className="product-meta">
          <span className="product-price">
            ₹{price}
            {comparePrice > 0 && <span className="original-price">₹{comparePrice}</span>} 
          </span>
          <button 
            className="add-to-cart"
            onClick={(e) => onAddToCart(e, product)}
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