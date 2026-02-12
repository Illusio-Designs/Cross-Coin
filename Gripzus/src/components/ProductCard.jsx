import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const {
    id,
    name,
    brand,
    price,
    salePrice,
    images = [],
    badge,
    slug
  } = product;

  const hasDiscount = salePrice && salePrice < price;
  const discountPercent = hasDiscount 
    ? Math.round(((price - salePrice) / price) * 100) 
    : 0;

  return (
    <div 
      className="card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <Link href={`/products/${slug || id}`} className="imageContainer">
        {/* Badges */}
        {badge && (
          <span className={`badge badge${badge}`}>
            {badge}
          </span>
        )}
        {hasDiscount && !badge && (
          <span className="badge badgeSale">
            -{discountPercent}%
          </span>
        )}

        {/* Product Images */}
        <div className="imageWrapper">
          <Image
            src={images[0] || '/assets/placeholder.jpg'}
            alt={name}
            fill
            className={`image imagePrimary ${isHovered ? 'imageHidden' : ''}`}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {images[1] && (
            <Image
              src={images[1]}
              alt={name}
              fill
              className={`image imageSecondary ${isHovered ? 'imageVisible' : ''}`}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className={`quickActions ${isHovered ? 'quickActionsVisible' : ''}`}>
          <button 
            className="quickBtn"
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            aria-label="Add to wishlist"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill={isWishlisted ? "currentColor" : "none"}>
              <path d="M10 18.35l-1.45-1.32C3.4 12.36 0 9.28 0 5.5 0 2.42 2.42 0 5.5 0 7.24 0 8.91.81 10 2.09 11.09.81 12.76 0 14.5 0 17.58 0 20 2.42 20 5.5c0 3.78-3.4 6.86-8.55 11.54L10 18.35z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <button 
            className="quickBtn"
            onClick={(e) => e.preventDefault()}
            aria-label="Quick view"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </Link>

      {/* Product Info */}
      <div className="info">
        {brand && <span className="brand">{brand}</span>}
        <Link href={`/products/${slug || id}`}>
          <h3 className="name">{name}</h3>
        </Link>
        
        <div className="priceContainer">
          {hasDiscount ? (
            <>
              <span className="salePrice">${salePrice}</span>
              <span className="originalPrice">${price}</span>
            </>
          ) : (
            <span className="price">${price}</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button className={`addToCart ${isHovered ? 'addToCartVisible' : ''}`}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}
