import React, { useEffect, useState } from 'react';
import { FiX, FiShoppingBag, FiTrash2, FiCheck } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useRouter } from 'next/router';
import SafeImage from '../common/SafeImage';
import './CartDrawer.css';

// Helper functions from CartStep
function pickCartItemImage(item) {
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images[0].image_url || item.images[0];
  }
  if (item.image) {
    return item.image;
  }
  return null;
}

function getCartItemPrice(item) {
  if (item.variation && item.variation.price) {
    return parseFloat(item.variation.price);
  }
  return parseFloat(item.price || 0);
}

function formatColorDisplay(item) {
  if (item.variation && item.variation.attributes) {
    const attrs = typeof item.variation.attributes === 'string' 
      ? JSON.parse(item.variation.attributes) 
      : item.variation.attributes;
    
    if (attrs.color) {
      if (Array.isArray(attrs.color)) {
        if (attrs.color.length > 1) {
          return `Pack Colors: ${attrs.color.join(', ')}`;
        }
        return attrs.color[0];
      }
      return attrs.color;
    }
  }
  
  if (item.color) {
    if (Array.isArray(item.color)) {
      if (item.color.length > 1) {
        return `Pack Colors: ${item.color.join(', ')}`;
      }
      return item.color[0];
    }
    return item.color;
  }
  
  return null;
}

function formatSizeDisplay(item) {
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
  
  if (item.size) {
    if (Array.isArray(item.size)) {
      return item.size.join(', ');
    }
    return item.size;
  }
  
  return null;
}

const CartDrawer = ({ isOpen, onClose, lastAddedItem }) => {
  const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCheckout = () => {
    onClose();
    router.push('/UnifiedCheckout');
  };

  const handleViewCart = () => {
    onClose();
    router.push('/UnifiedCheckout');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`cart-drawer-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <FiShoppingBag />
            <span>Shopping Cart ({cartItems.length})</span>
          </div>
          <button className="cart-drawer-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Last Added Item Highlight */}
        {lastAddedItem && (
          <div className="cart-drawer-success">
            <span className="success-icon"><FiCheck /></span>
            <span>Item added to cart!</span>
          </div>
        )}

        {/* Cart Items */}
        <div className="cart-drawer-items">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">
              <FiShoppingBag size={48} />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const imageUrl = pickCartItemImage(item);
              const price = getCartItemPrice(item);
              const colorDisplay = formatColorDisplay(item);
              const sizeDisplay = formatSizeDisplay(item);
              const isLastAdded = lastAddedItem && lastAddedItem.id === item.id;

              return (
                <div 
                  key={item.id} 
                  className={`cart-drawer-item ${isLastAdded ? 'highlight' : ''}`}
                >
                  <div className="cart-drawer-item-image">
                    {imageUrl ? (
                      <SafeImage
                        imageData={{ image_url: imageUrl }}
                        alt={item.name}
                        width="100%"
                        height="100%"
                        style={{ objectFit: 'cover' }}
                        isProductCard={true}
                      />
                    ) : (
                      <div className="cart-drawer-item-placeholder" />
                    )}
                  </div>

                  <div className="cart-drawer-item-details">
                    <h4>{item.name}</h4>
                    {item.variation?.name && (
                      <p className="item-variation">{item.variation.name}</p>
                    )}
                    {sizeDisplay && (
                      <p className="item-meta">Size: {sizeDisplay}</p>
                    )}
                    {colorDisplay && (
                      <p className="item-meta">{colorDisplay}</p>
                    )}
                    <div className="item-price-qty">
                      <span className="item-price">₹{price.toFixed(2)}</span>
                      <div className="item-quantity">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="cart-drawer-item-remove"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-drawer-subtotal">
              <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items):</span>
              <span className="subtotal-amount">₹{cartTotal.toFixed(2)}</span>
            </div>
            
            <button className="cart-drawer-btn primary" onClick={handleCheckout}>
              Proceed to Checkout
            </button>
            
            <button className="cart-drawer-btn secondary" onClick={handleViewCart}>
              View Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
