import React from 'react';
import Image from 'next/image';
import { FiHeart } from 'react-icons/fi';
import card1 from "../assets/card1-right.webp";
import card2 from "../assets/card2-left.webp";
import card3 from "../assets/card3-right.webp";
import { useWishlist } from '../context/WishlistContext';

// Dummy data for products
export const products = [
  {
    id: 1,
    name: "Premium Wool Socks",
    originalPrice: 39.99,
    price: 29.99,
    category: "Woollen Shocks",
    image: card1,
    rating: 4.5,
    reviews: 128,
    description: "Premium quality wool socks for ultimate comfort and warmth. Perfect for cold weather.",
    images: [card1, card2, card3, card1, card2],
    colors: ["brown", "navy", "black"],
    sizes: ["S", "M", "L", "XL"],
    material: "Wool",
    gender: "Unisex",
    badge: "New Arrival"
  },
  {
    id: 2,
    name: "Cotton Comfort Socks",
    originalPrice: 29.99,
    price: 19.99,
    category: "Cotton Shocks",
    image: card2,
    rating: 4.2,
    reviews: 95,
    description: "Soft and breathable cotton socks for everyday comfort. Ideal for daily wear.",
    images: [card2, card3, card1, card2, card3],
    colors: ["white", "gray", "black"],
    sizes: ["S", "M", "L", "XL"],
    material: "Cotton",
    gender: "Unisex",
    badge: "New Arrival"
  },
  {
    id: 3,
    name: "Silk Luxury Socks",
    originalPrice: 39.99,
    price: 39.99,
    category: "Silk Shocks",
    image: card3,
    rating: 4.8,
    reviews: 64,
    description: "Luxurious silk socks for special occasions. Elegant and comfortable.",
    images: [card3, card1, card2, card3, card1],
    colors: ["black", "navy", "burgundy"],
    sizes: ["S", "M", "L", "XL"],
    material: "Silk",
    gender: "Unisex",
    badge: "Best Seller"
  },
  {
    id: 4,
    name: "Winter Thermal Socks",
    originalPrice: 34.99,
    price: 34.99,
    category: "Winter Special",
    image: card1,
    rating: 4.6,
    reviews: 112,
    description: "Extra warm thermal socks for extreme cold weather. Stay cozy all winter long.",
    images: [card1, card2, card3, card1, card2],
    colors: ["gray", "black", "navy"],
    sizes: ["S", "M", "L", "XL"],
    material: "Thermal",
    gender: "Unisex"
  },
  {
    id: 5,
    name: "Summer Breathable Socks",
    originalPrice: 24.99,
    price: 24.99,
    category: "Summer Special",
    image: card2,
    rating: 4.3,
    reviews: 87,
    description: "Lightweight and breathable socks perfect for summer. Stay cool and comfortable.",
    images: [card2, card3, card1, card2, card3],
    colors: ["white", "light gray", "beige"],
    sizes: ["S", "M", "L", "XL"],
    material: "Cotton Blend",
    gender: "Unisex"
  },
  {
    id: 6,
    name: "Net Pattern Socks",
    originalPrice: 22.99,
    price: 22.99,
    category: "Net Shocks",
    image: card3,
    rating: 4.4,
    reviews: 73,
    description: "Stylish net pattern socks for a unique look. Fashion meets comfort.",
    images: [card3, card1, card2, card3, card1],
    colors: ["black", "white", "red"],
    sizes: ["S", "M", "L", "XL"],
    material: "Net",
    gender: "Unisex",
    badge: "New Arrival"
  },
  {
    id: 7,
    name: "Summer Breathable Socks",
    originalPrice: 24.99,
    price: 24.99,
    category: "Summer Special",
    image: card1,
    rating: 4.3,
    reviews: 87
  },
  {
    id: 8,
    name: "Net Pattern Socks",
    originalPrice: 22.99,
    price: 22.99,
    category: "Net Shocks",
    image: card2,
    rating: 4.4,
    reviews: 73
  },
  {
    id: 9,
    name: "Summer Breathable Socks",
    originalPrice: 24.99,
    price: 24.99,
    category: "Summer Special",
    image: card3,
    rating: 4.3,
    reviews: 87,
    badge: "Best Seller"
  },
  {
    id: 10,
    name: "Net Pattern Socks",
    originalPrice: 22.99,
    price: 22.99,
    category: "Net Shocks",
    image: card1,
    rating: 4.4,
    reviews: 73
  },
  {
    id: 11,
    name: "Summer Breathable Socks",
    originalPrice: 24.99,
    price: 24.99,
    category: "Summer Special",
    image: card2,
    rating: 4.3,
    reviews: 87
  },
  {
    id: 12,
    name: "Net Pattern Socks",
    originalPrice: 22.99,
    price: 22.99,
    category: "Net Shocks",
    image: card3,
    rating: 4.4,
    reviews: 73
  },
  {
    id: 13,
    name: "Summer Breathable Socks",
    originalPrice: 24.99,
    price: 24.99,
    category: "Summer Special",
    image: card1,
    rating: 4.3,
    reviews: 87,
    badge: "New Arrival"
  },
  {
    id: 14,
    name: "Net Pattern Socks",
    originalPrice: 22.99,
    price: 22.99,
    category: "Net Shocks",
    image: card2,
    rating: 4.4,
    reviews: 73,
    badge: "New Arrival"
  },
  {
    id: 15,
    name: "Summer Breathable Socks",
    originalPrice: 24.99,
    price: 24.99,
    category: "Summer Special",
    image: card3,
    rating: 4.3,
    reviews: 87
  },
  {
    id: 16,
    name: "Net Pattern Socks",
    originalPrice: 22.99,
    price: 22.99,
    category: "Net Shocks",
    image: card1,
    rating: 4.4,
    reviews: 73
  }
];

// Filter options data
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

  return (
    <div 
      className="product-card"
      onClick={() => onProductClick(product)}
      style={{ cursor: 'pointer' }}
    >
      <div className="product-image">
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <Image 
          src={product.image} 
          alt={product.name} 
          width={300}
          height={300}
          style={{ objectFit: 'cover' }}
        />
        <button 
          className={`wishlist-btn ${isInWishlist(product.id) ? 'active' : ''}`}
          onClick={handleWishlistClick}
        >
          <FiHeart />
        </button>
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <div className="product-meta">
          <span className="product-price">
            <span className="original-price">${product.originalPrice}</span> ${product.price}
          </span>
          <button 
            className="add-to-cart"
            onClick={(e) => onAddToCart(e, product)}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 