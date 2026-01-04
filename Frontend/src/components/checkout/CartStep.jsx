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
function formatColorDisplay(item) {
  // Try to get color from variation first
  if (item.variation && item.variation.attributes) {
    const attrs = typeof item.variation.attributes === 'string' 
      ? JSON.parse(item.variation.attributes) 
      : item.variation.attributes;
    
    if (attrs.color) {
      if (Array.isArray(attrs.color)) {
        // If it's a pack with multiple colors, format it nicely
        if (attrs.color.length > 1) {
          return `Pack Colors: ${attrs.color.join(', ')}`;
        }
        return attrs.color[0];
      }
      return attrs.color;
    }
  }
  
  // Fallback to item.color
  if (item.color) {
    if (Array.isArray(item.color)) {
      if (item.color.length > 1) {
        return `Pack Colors: ${item.color.join(', ')}`;
      }
      return item.color[0];
    }
    return item.color;
  }
  
  return 'N/A';
}

// Helper to format size display
function formatSizeDisplay(item) {
  // Try to get size from variation first
  if (item.variation && item.variation.attributes) {
    const attrs = typeof item.variation.attributes === 'string' 
      ? JSON.parse(item.variation.attributes) 
      : item.variation.attributes;
    
    if (attrs.size) {
      if (Array.isArray(attrs.size)) {
        return attrs.size.join(', ');
      }
      return attrs.size;
    }
  }
  
  // Fallback to item.size
  if (item.size) {
    if (Array.isArray(item.size)) {
      return item.size.join(', ');
    }
    return item.size;
  }
  
  return 'N/A';
}

export default function CartStep() {
  const router = useRouter();
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    setQuantity, 
    isCartLoading,
    buyNowItem,
    moveCartItemToBuyNow,
    clearBuyNow,
    updateBuyNowQuantity,
    setBuyNowQuantity
  } = useCart();
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
  console.log('CartStep: cartItems:', cartItems, 'isCartLoading:', isCartLoading, 'buyNowItem:', buyNowItem);

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
        
        {/* Buy Now Item Section - Always show at top if exists */}
        {buyNowItem && (
          <div className="buy-now-section">
            <div className="buy-now-header">
              <h3>🛒 Buy Now Item</h3>
            </div>
            <div className="buy-now-item">
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <img
                  src={forceEnvImageBase(pickCartItemImage(buyNowItem))}
                  alt={buyNowItem.name}
                  width={100}
                  height={100}
                  className="cart-item-img"
                  style={{
                    objectFit: 'cover',
                    background: '#eee',
                    display: 'block'
                  }}
                />
              </div>
              <div className="cart-item-details">
                <div className="cart-item-title">
                  {buyNowItem.name}
                  {/* Add pack indicator if multiple colors */}
                  {(buyNowItem.variation?.attributes?.color?.length > 1 || 
                    (Array.isArray(buyNowItem.color) && buyNowItem.color.length > 1)) && (
                    <span className="pack-indicator">📦 Pack</span>
                  )}
                </div>
                {buyNowItem.variation && buyNowItem.variation.name && (
                  <div className="cart-item-meta">Variation: {buyNowItem.variation.name}</div>
                )}
                {formatSizeDisplay(buyNowItem) !== 'N/A' && (
                  <div className="cart-item-meta">Size: {formatSizeDisplay(buyNowItem)}</div>
                )}
                {formatColorDisplay(buyNowItem) !== 'N/A' && (
                  <div className="cart-item-meta">Color: {formatColorDisplay(buyNowItem)}</div>
                )}
                <div className="cart-item-price">
                  <span>₹{getCartItemPrice(buyNowItem)}</span>
                  {buyNowItem.quantity > 1 && (
                    <span className="cart-item-total"> × {buyNowItem.quantity} = ₹{(getCartItemPrice(buyNowItem) * buyNowItem.quantity).toFixed(2)}</span>
                  )}
                </div>
              </div>
              
              {/* Buy Now Quantity Selector */}
              <div className="buy-now-qty">
                <button
                    className={`qty-btn ${buyNowItem.quantity === 1 ? 'qty-btn-disabled' : ''}`}
                    onClick={() => updateBuyNowQuantity(-1)}
                    disabled={buyNowItem.quantity === 1}
                >-</button>
                <input
                  type="number"
                  min={1}
                  className="qty-input improved-qty-input"
                  value={buyNowItem.quantity}
                  onChange={(e) => setBuyNowQuantity(parseInt(e.target.value) || 1)}
                  style={{ width: 60, textAlign: 'center', border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px', margin: '0 8px' }}
                />
                <button
                    className="qty-btn"
                    onClick={() => updateBuyNowQuantity(1)}
                >+</button>
              </div>
              
              <div className="buy-now-badge">
                <span>Buy Now</span>
              </div>
            </div>
          </div>
        )}

        {/* Cart Items Section - Show existing cart items */}
        {cartItems.length > 0 && (
          <div className="existing-cart-section">
            <div className="existing-cart-header">
              <h3>🛍️ Items Already in Your Cart</h3>
              <span className="cart-count">{cartItems.length} item{cartItems.length > 1 ? 's' : ''}</span>
            </div>
            
            <div className="cart-items-list">
              {cartItems.map((item) => {
                const imageUrl = pickCartItemImage(item);
                const itemPrice = getCartItemPrice(item);
                const formattedColor = formatColorDisplay(item);
                const formattedSize = formatSizeDisplay(item);
                
                return (
                  <div className="cart-item existing-cart-item" key={item.id}>
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
                      <div className="cart-item-title">
                        {item.name}
                        {/* Add pack indicator if multiple colors */}
                        {(item.variation?.attributes?.color?.length > 1 || 
                          (Array.isArray(item.color) && item.color.length > 1)) && (
                          <span className="pack-indicator">📦 Pack</span>
                        )}
                      </div>
                      {item.variation && item.variation.name && (
                        <div className="cart-item-meta">Variation: {item.variation.name}</div>
                      )}
                      {formattedSize !== 'N/A' && (
                        <div className="cart-item-meta">Size: {formattedSize}</div>
                      )}
                      {formattedColor !== 'N/A' && (
                        <div className="cart-item-meta">{formattedColor}</div>
                      )}
                      <div className="cart-item-price">
                        <span>₹{itemPrice}</span>
                        {item.quantity > 1 && (
                          <span className="cart-item-total"> × {item.quantity} = ₹{(itemPrice * item.quantity).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="cart-item-actions">
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
                      
                      <div className="cart-item-buttons">
                        {/* Move to Buy Now Button - Prominent */}
                        <button 
                          className="move-to-buy-now-btn primary"
                          onClick={() => moveCartItemToBuyNow(item.id)}
                          title="Move to Buy Now"
                        >
                          Move to Buy Now
                        </button>
                        
                        <button className="cart-item-remove" onClick={() => {
                          console.log('CartStep: Remove button clicked for item:', item);
                          removeFromCart(item.id);
                        }}><FiTrash2 /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty Cart State - Only show if no Buy Now item and no cart items */}
        {!buyNowItem && cartItems.length === 0 && (
          <div className={`cart-items-list empty`}>
            {isCartLoading ? (
              <div className="loading-container">
                <div className="loader"></div>
                <p>Loading your cart...</p>
              </div>
            ) : (
              <div className="empty-cart">
                <div className="empty-cart-icon"><FaBoxOpen /></div>
                <div className="empty-cart-text">YOUR CART IS CURRENTLY EMPTY.</div>
                <button className="checkout-btn" onClick={() => router.push('/Products')}>Shop Now</button>
              </div>
            )}
          </div>
        )}
    </div>
  );
} 