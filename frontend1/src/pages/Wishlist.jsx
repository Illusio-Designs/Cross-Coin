import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FiHeart, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import '../styles/pages/Wishlist.css';

const Wishlist = () => {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const router = useRouter();
  const [sortOrder, setSortOrder] = useState('newest');

  const handleMoveToCart = (product) => {
    // Add default color and size for quick add
    const defaultColor = product.colors?.[0] || 'black';
    const defaultSize = product.sizes?.[0] || 'M';
    addToCart(product, defaultColor, defaultSize, 1);
    removeFromWishlist(product.id);
  };

  const handleRemove = (productId) => {
    removeFromWishlist(productId);
  };

  const handleClearWishlist = () => {
    if (window.confirm('Are you sure you want to clear your wishlist?')) {
      clearWishlist();
    }
  };

  const sortWishlist = (items) => {
    const sorted = [...items];
    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      default:
        return sorted;
    }
  };

  const sortedWishlist = sortWishlist(wishlist);

  if (wishlist.length === 0) {
    return (
      <div className="wishlist-page">
        <Header />
        <main className="wishlist-main">
          <div className="wishlist-empty">
            <FiHeart className="wishlist-empty-icon" />
            <h2>Your Wishlist is Empty</h2>
            <p>Looks like you haven't added any products to your wishlist yet.</p>
            <button 
              className="wishlist-browse-btn"
              onClick={() => router.push('/Products')}
            >
              Browse Products
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <Header />
      <main className="wishlist-main">
        <div className="wishlist-header">
          <h1>My Wishlist ({wishlist.length} items)</h1>
          <div className="wishlist-controls">
            <div className="wishlist-sort">
              <label>Sort by:</label>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)}
                className="wishlist-sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>
            </div>
            <button 
              className="wishlist-clear-btn"
              onClick={handleClearWishlist}
            >
              <FiTrash2 /> Clear Wishlist
            </button>
          </div>
        </div>

        <div className="wishlist-items">
          {sortedWishlist.map((item) => (
            <div key={item.id} className="wishlist-item">
              <div 
                className="wishlist-item-image"
                onClick={() => router.push(`/ProductDetails?name=${encodeURIComponent(item.name)}`)}
              >
                <Image 
                  src={item.image} 
                  alt={item.name}
                  width={300}
                  height={250}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="wishlist-item-details">
                <h3>{item.name}</h3>
                <div className="wishlist-item-price">
                  {item.originalPrice > item.price && (
                    <span className="original-price">${item.originalPrice}</span>
                  )}
                  <span className="current-price">${item.price}</span>
                </div>
                <div className="wishlist-item-actions">
                  <button 
                    className="move-to-cart-btn"
                    onClick={() => handleMoveToCart(item)}
                  >
                    <FiShoppingCart /> Move to Cart
                  </button>
                  <button 
                    className="remove-btn"
                    onClick={() => handleRemove(item.id)}
                  >
                    <FiTrash2 /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;