import React, { createContext, useContext, useState, useEffect } from 'react';
// import { cartService } from '../services';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Load cart items on initial render
  useEffect(() => {
    loadCart();
  }, [user]);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      if (user) {
        // If user is logged in, fetch cart from server
        const response = await cartService.getCart();
        setCartItems(response.items || []);
      } else {
        // If user is not logged in, load from localStorage
        const savedCartItems = localStorage.getItem('cartItems');
        if (savedCartItems) {
          setCartItems(JSON.parse(savedCartItems));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load cart');
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save cart items to localStorage or server whenever they change
  useEffect(() => {
    if (!loading) {
      if (user) {
        // If user is logged in, sync with server
        cartService.syncCart(cartItems).catch(err => {
          console.error('Error syncing cart:', err);
          setError('Failed to sync cart with server');
        });
      } else {
        // If user is not logged in, save to localStorage
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
      }
      // Update cart count
      setCartCount(cartItems.reduce((total, item) => total + item.quantity, 0));
    }
  }, [cartItems, user, loading]);

  const addToCart = async (product, selectedColor, selectedSize, quantity = 1) => {
    try {
      setError(null);
      const newItem = {
        id: product.id,
        name: product.name,
        image: product.images[0],
        price: product.price,
        color: selectedColor,
        size: selectedSize,
        quantity: quantity
      };

      if (user) {
        // If user is logged in, add to server
        await cartService.addToCart(newItem);
      }

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

        return [...prevItems, newItem];
      });
    } catch (err) {
      setError(err.message || 'Failed to add item to cart');
      throw err;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      setError(null);
      if (user) {
        // If user is logged in, remove from server
        await cartService.removeFromCart(itemId);
      }
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err.message || 'Failed to remove item from cart');
      throw err;
    }
  };

  const updateQuantity = async (itemId, change) => {
    try {
      setError(null);
      const newItems = cartItems.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      );

      if (user) {
        // If user is logged in, update on server
        await cartService.updateCart(newItems);
      }

      setCartItems(newItems);
    } catch (err) {
      setError(err.message || 'Failed to update item quantity');
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      setError(null);
      if (user) {
        // If user is logged in, clear on server
        await cartService.clearCart();
      }
      setCartItems([]);
      localStorage.removeItem('cartItems');
    } catch (err) {
      setError(err.message || 'Failed to clear cart');
      throw err;
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      loading,
      error,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      refreshCart: loadCart
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