import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '../context/CurrencyContext';

export default function ProductCard({ product }) {
  const [currentImage, setCurrentImage] = useState(0);
  const { formatPrice } = useCurrency();

  return (
    <Link href={`/product/${product.slug}`} className="productCard">
      <div 
        className="productImage"
        onMouseEnter={() => product.images[1] && setCurrentImage(1)}
        onMouseLeave={() => setCurrentImage(0)}
      >
        <Image
          src={product.images[currentImage]}
          alt={product.name}
          width={600}
          height={800}
          style={{ objectFit: 'cover' }}
        />
        {product.badge && (
          <span className={`badge badge-${product.badge.toLowerCase()}`}>
            {product.badge}
          </span>
        )}
        <div className="quickActions">
          <button className="quickBtn" aria-label="Add to wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="quickBtn" aria-label="Quick view">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="productInfo">
        <h3 className="productName">{product.name}</h3>
        <p className="productCategory">{product.category}</p>
        <div className="productPrice">
          {product.salePrice ? (
            <>
              <span className="priceOriginal">{formatPrice(product.price)}</span>
              <span className="priceSale">{formatPrice(product.salePrice)}</span>
            </>
          ) : (
            <span className="price">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
