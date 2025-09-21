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

// Helper to pick the best image for a cart item based on variation
function pickCartItemImage(item) {
  // If item has images array (from variation), use the first one
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images[0].image_url || item.images[0];
  }
  
  // Fallback to single image
  if (item.image) {
    return item.image;
  }
  
  // Last fallback
  return '/assets/card1-left.webp';
}

// Helper to get variation-specific price
function getCartItemPrice(item) {
  // If item has variation data, use variation price
  if (item.variation && item.variation.price) {
    return item.variation.price;
  }
  
  // Fallback to item price
  return item.price || 0;
}

// Helper to format color display
function formatColorDisplay(color) {
  if (!color) return 'N/A';
  if (Array.isArray(color)) {
    return color.join(', ');
  }
  return color;
}

// Helper to format size display
function formatSizeDisplay(size) {
  if (!size) return 'N/A';
  if (Array.isArray(size)) {
    return size.join(', ');
  }
  return size;
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
              const itemPrice = getCartItemPrice(item);
              const formattedColor = formatColorDisplay(item.color);
              const formattedSize = formatSizeDisplay(item.size);
              
              // Debug logging
              console.log('CartStep: Processing item:', {
                id: item.id,
                name: item.name,
                price: itemPrice,
                color: item.color,
                size: item.size,
                variation: item.variation,
                images: item.images,
                formattedColor: formattedColor,
                formattedSize: formattedSize,
                fullItem: item
              });
              
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
                    {item.variation && item.variation.name && (
                      <div className="cart-item-meta">Variation: {item.variation.name}</div>
                    )}
                    {formattedSize !== 'N/A' && (
                      <div className="cart-item-meta">Size: {formattedSize}</div>
                    )}
                    {formattedColor !== 'N/A' && (
                      <div className="cart-item-meta">Color: {formattedColor}</div>
                    )}
                    <div className="cart-item-price">
                      <span>₹{itemPrice}</span>
                      {item.quantity > 1 && (
                        <span className="cart-item-total"> × {item.quantity} = ₹{(itemPrice * item.quantity).toFixed(2)}</span>
                      )}
                    </div>
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