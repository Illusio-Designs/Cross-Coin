import React from 'react';
import './ProductListSkeleton.css';

const ProductListSkeleton = ({ count = 12 }) => {
  return (
    <div className="product-list-skeleton">
      <div className="skeleton-products-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-product-card">
            {/* Product Image */}
            <div className="skeleton-product-image"></div>

            {/* Product Info */}
            <div className="skeleton-product-info">
              {/* Category */}
              <div className="skeleton-category"></div>

              {/* Product Name */}
              <div className="skeleton-product-name"></div>
              <div className="skeleton-product-name short"></div>

              {/* Rating */}
              <div className="skeleton-rating"></div>

              {/* Price */}
              <div className="skeleton-price-row">
                <div className="skeleton-price"></div>
                <div className="skeleton-original-price"></div>
              </div>

              {/* Button */}
              <div className="skeleton-button"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductListSkeleton;
