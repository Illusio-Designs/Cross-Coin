import { useRouter } from "next/router";
import Image from "next/image";
import { FiTrash2 } from "react-icons/fi";
import { FaBoxOpen } from "react-icons/fa";
import { useCart } from "../../context/CartContext";
import { useState } from "react";

// Utility function to normalize image URLs (same logic as ProductCard.jsx)
function getNormalizedImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return '/placeholder.png';
  // If it's a full URL, use as is
  if (/^https?:\/\//.test(imageUrl)) {
    return imageUrl;
  }
  // If it's a relative path, prepend the base URL from env
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
  if (imageUrl.startsWith('/')) {
    return `${baseUrl}${imageUrl}`;
  }
  // If it's just a filename, construct the path
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

export default function CartStep() {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQuantity, setQuantity } = useCart();
  const [inputValues, setInputValues] = useState({});

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
      setQuantity(itemId, num);
    }
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
            cartItems.map((item) => (
            <div className="cart-item" key={item.id}>
                <Image 
                  src={forceEnvImageBase(item.image)} 
                  alt={item.name} 
                  width={100} 
                  height={100} 
                  className="cart-item-img" 
                  onError={(e) => { e.target.src = '/placeholder.png'; }} // fallback if image fails
                  unoptimized
                />
                <div className="cart-item-details">
                <div className="cart-item-title">{item.name}</div>
                <div className="cart-item-meta">Size: {item.size || 'N/A'}</div>
                <div className="cart-item-meta">Color: {item.color || 'N/A'}</div>
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
                  value={inputValues[item.id] !== undefined ? inputValues[item.id] : item.quantity}
                  onChange={e => handleInputChange(item.id, e.target.value)}
                  onBlur={e => handleInputBlur(item.id, e.target.value)}
                  style={{ width: 60, textAlign: 'center', border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px', margin: '0 8px' }}
                />
                <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, 1)}
                >+</button>
                </div>
                <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}><FiTrash2 /></button>
            </div>
            ))
        )}
        </div>
    </div>
  );
} 