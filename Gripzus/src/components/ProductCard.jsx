import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '../context/CurrencyContext';

export default function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { formatPrice } = useCurrency();

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button 
            className="quickBtn"
            onClick={(e) => e.preventDefault()}
            aria-label="Quick view"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
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
              <span className="salePrice">{formatPrice(salePrice)}</span>
              <span className="originalPrice">{formatPrice(price)}</span>
            </>
          ) : (
            <span className="price">{formatPrice(price)}</span>
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
