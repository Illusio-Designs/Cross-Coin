import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart
} from '../services/publicindex';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Sync isAuthenticated on token change
  useEffect(() => {
    const handleStorage = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load cart from backend or localStorage on initial render or auth change
  useEffect(() => {
    const fetchCart = async () => {
      if (isAuthenticated) {
        try {
          const backendCart = await apiGetCart();
          setCartItems(backendCart);
        } catch {
          setCartItems([]);
        }
      } else {
        const savedCartItems = localStorage.getItem('cartItems');
        if (savedCartItems) {
          setCartItems(JSON.parse(savedCartItems));
        } else {
          setCartItems([]);
        }
      }
    };
    fetchCart();
  }, [isAuthenticated]);

  // Save cart items to localStorage whenever they change (for guests)
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
    setCartCount(cartItems.reduce((total, item) => total + item.quantity, 0));
  }, [cartItems, isAuthenticated]);

  const addToCart = async (product, selectedColor, selectedSize, quantity = 1) => {
    if (isAuthenticated) {
      try {
        // Find variationId if available
        let variationId = null;
        if (product.variations && product.variations.length > 0) {
          const match = product.variations.find(v => {
            const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
            return (!selectedColor || (attrs.color && attrs.color.includes(selectedColor))) &&
                   (!selectedSize || (attrs.size && attrs.size.includes(selectedSize)));
          });
          if (match) variationId = match.id;
        }
        await apiAddToCart({ productId: product.id, variationId, quantity });
        const backendCart = await apiGetCart();
        setCartItems(backendCart);
      } catch {}
    } else {
      setCartItems(prevItems => {
        const existingItem = prevItems.find(
          item =>
            item.id === product.id &&
            item.color === selectedColor &&
            item.size === selectedSize
        );
        if (existingItem) {
          return prevItems.map(item =>
            item.id === product.id && item.color === selectedColor && item.size === selectedSize
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [
          ...prevItems,
          {
            id: product.id,
            name: product.name,
            image: product.images[0],
            price: product.price,
            color: selectedColor,
            size: selectedSize,
            quantity: quantity
          }
        ];
      });
    }
  };

  const removeFromCart = async (itemId) => {
    if (isAuthenticated) {
      try {
        await apiRemoveFromCart(itemId);
        const backendCart = await apiGetCart();
        setCartItems(backendCart);
      } catch {}
    } else {
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    }
  };

  const updateQuantity = async (itemId, change) => {
    if (isAuthenticated) {
      try {
        // Find the item to get the new quantity
        const item = cartItems.find(i => i.id === itemId);
        if (!item) return;
        const newQuantity = Math.max(1, item.quantity + change);
        await apiUpdateCartItem(itemId, newQuantity);
        const backendCart = await apiGetCart();
        setCartItems(backendCart);
      } catch {}
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item
        )
      );
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await apiClearCart();
        setCartItems([]);
      } catch {}
    } else {
      setCartItems([]);
      localStorage.removeItem('cartItems');
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      setIsAuthenticated
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 