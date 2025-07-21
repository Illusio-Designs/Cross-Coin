import { useRouter } from "next/router";
import Image from "next/image";
import { FiTrash2 } from "react-icons/fi";
import { FaBoxOpen } from "react-icons/fa";
import { useCart } from "../../context/CartContext";
import { useState, useEffect } from "react";

// Utility function to normalize image URLs (same logic as ProductCard.jsx)
function getNormalizedImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return '/placeholder.png';
  if (/^https?:\/\//.test(imageUrl)) {
    return imageUrl;
  }
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
  if (imageUrl.startsWith('/')) {
    return `${baseUrl}${imageUrl}`;
  }
  return `${baseUrl}/uploads/products/${imageUrl}`;
}

function forceEnvImageBase(url) {
  if (!url || typeof url !== 'string') return '/assets/card1-left.webp';
  if (url.startsWith('http')) {
    if (url.includes('localhost:5000')) {
      const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      return `${baseUrl}${path}`;
    }
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
  return `${baseUrl}${url}`;
}

// Helper to pick the best image for a cart item based on color
function pickCartItemImage(item) {
  if (Array.isArray(item.images) && item.color) {
    const colorValue = Array.isArray(item.color) ? item.color[0] : item.color;
    const colorLower = colorValue.toString().toLowerCase();
    
    const match = item.images.find(img =>
      (img.alt_text && img.alt_text.toLowerCase().includes(colorLower)) ||
      (img.image_url && img.image_url.toLowerCase().includes(colorLower))
    );
    if (match) return match.image_url;
    if (item.images.length > 0) return item.images[0].image_url;
  }
  return item.image;
}

export default function CartStep() {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQuantity, setQuantity } = useCart();
  const [inputValues, setInputValues] = useState({});
  const [imageLoaded, setImageLoaded] = useState({});

  useEffect(() => {
    const initialInputValues = {};
    cartItems.forEach(item => {
      initialInputValues[item.id] = item.quantity.toString();
    });
    setInputValues(initialInputValues);
  }, [cartItems]);


  // Debug logging
  console.log('CartStep: cartItems:', cartItems);

  const handleInputChange = (itemId, value) => {
    // Allow only numbers
    if (/^\d*$/.test(value)) {
      setInputValues(prev => ({ ...prev, [itemId]: value }));
    }
  };

  const handleInputBlur = (itemId, value) => {
    const num = parseInt(value, 10);
    if (!value || isNaN(num) || num < 1) {
      setInputValues(prev => ({ ...prev, [itemId]: "1" }));
      setQuantity(itemId, 1);
    } else if (num === 0) {
      removeFromCart(itemId);
    } else {
      if (num !== cartItems.find(item => item.id === itemId)?.quantity) {
          setQuantity(itemId, num);
      }
    }
  };

  const handleImageLoad = (itemId) => {
    setImageLoaded(prev => ({ ...prev, [itemId]: true }));
  };

  return (
    <div className="cart-items-list-container">
        <h2>Shopping Cart</h2>
        <div className={`cart-items-list${cartItems.length === 0 ? ' empty' : ''}`}>
        {cartItems.length === 0 ? (
            <div className="empty-cart">
            <div className="empty-cart-icon"><FaBoxOpen /></div>
            <div className="empty-cart-text">YOUR CART IS CURRENTLY EMPTY.</div>
            <button className="checkout-btn" onClick={() => router.push('/Products')}>Shop Now</button>
            </div>
        ) : (
            cartItems.map((item) => {
              const imageUrl = pickCartItemImage(item);
              // Debug log for size
              console.log('CartStep: item.size:', item.size, typeof item.size);
              return (
                <div className="cart-item" key={item.id}>
                  <div style={{ position: 'relative', width: 100, height: 100 }}>
                    {imageUrl ? (
                      <>
                        <img
                          src={forceEnvImageBase(imageUrl)}
                          alt={item.name}
                          width={100}
                          height={100}
                          className="cart-item-img"
                          style={{
                            objectFit: 'cover',
                            background: '#eee',
                            display: 'block'
                          }}
                          onLoad={() => handleImageLoad(item.id)}
                          onError={() => handleImageLoad(item.id)}
                        />
                        {!imageLoaded[item.id] && (
                          <div className="shimmer-placeholder" style={{ width: 100, height: 100, position: 'absolute', top: 0, left: 0 }} />
                        )}
                      </>
                    ) : (
                      <div style={{ width: 100, height: 100, background: '#eee', borderRadius: 8 }} />
                    )}
                  </div>
                    <div className="cart-item-details">
                    <div className="cart-item-title">{item.name}</div>
                    <div className="cart-item-meta">Size: {Array.isArray(item.size) ? item.size.join(', ') : (item.size || 'N/A')}</div>
                    <div className="cart-item-meta">Color: {Array.isArray(item.color) ? item.color.join(', ') : (item.color || 'N/A')}</div>
                    <div className="cart-item-price">₹{item.price}</div>
                    </div>
                    <div className="cart-item-qty">
                    <button
                        className={`qty-btn ${item.quantity === 1 ? 'qty-btn-disabled' : ''}`}
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity === 1}
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      className="qty-input improved-qty-input"
                      value={inputValues[item.id] || ''}
                      onChange={e => handleInputChange(item.id, e.target.value)}
                      onBlur={e => handleInputBlur(item.id, e.target.value)}
                      style={{ width: 60, textAlign: 'center', border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px', margin: '0 8px' }}
                    />
                    <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, 1)}
                    >+</button>
                    </div>
                    <button className="cart-item-remove" onClick={() => {
                      console.log('CartStep: Remove button clicked for item:', item);
                      removeFromCart(item.id);
                    }}><FiTrash2 /></button>
                </div>
              );
            })
        )}
        </div>
    </div>
  );
} 