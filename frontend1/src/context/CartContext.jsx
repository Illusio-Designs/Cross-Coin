import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart
} from '../services/publicindex';
import { 
  showAddToCartSuccessToast, 
  showAddToCartErrorToast, 
  showRemoveFromCartSuccessToast, 
  showUpdateCartSuccessToast, 
  showClearCartSuccessToast,
  showRemoveFromCartErrorToast
} from '../utils/toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isCartLoading, setIsCartLoading] = useState(true);

  // Sync isAuthenticated on token change
  useEffect(() => {
    const handleStorage = () => {
      console.log('CartContext: storage event, token changed');
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load cart from backend or localStorage on initial render or auth change
  useEffect(() => {
    const fetchCart = async () => {
      console.log('CartContext: useEffect fetchCart, isAuthenticated:', isAuthenticated);
      setIsCartLoading(true);
      if (isAuthenticated) {
        try {
          console.log('CartContext: fetching cart from backend');
          const backendCart = await apiGetCart();
          console.log('CartContext: backend cart received', backendCart);
          setCartItems(backendCart);
        } catch (error){
          console.error('CartContext: error fetching backend cart', error);
          setCartItems([]);
        }
      } else {
        console.log('CartContext: loading cart from localStorage');
        const savedCartItems = localStorage.getItem('cartItems');
        if (savedCartItems) {
          setCartItems(JSON.parse(savedCartItems));
        } else {
          setCartItems([]);
        }
      }
      setIsCartLoading(false);
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
    console.log('CartContext: addToCart called with:', { product, selectedColor, selectedSize, quantity });
    console.log('CartContext: isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      try {
        console.log('CartContext: addToCart for authenticated user');
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
        console.log('CartContext: calling apiAddToCart with:', { productId: product.id, variationId, quantity });
        await apiAddToCart({ productId: product.id, variationId, quantity });
        const backendCart = await apiGetCart();
        setCartItems(backendCart);
        console.log('CartContext: cart updated from backend after adding item');
        showAddToCartSuccessToast(product.name);
      } catch(error) {
        console.error('CartContext: error adding to cart for authenticated user', error);
        showAddToCartErrorToast(error.message);
      }
    } else {
      console.log('CartContext: addToCart for guest user');
      setCartItems(prevItems => {
        const existingItem = prevItems.find(
          item =>
            item.productId === product.id &&
            item.color === selectedColor &&
            item.size === selectedSize
        );
        if (existingItem) {
          const newItems = prevItems.map(item =>
            item.productId === product.id && item.color === selectedColor && item.size === selectedSize
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          console.log('CartContext: updated existing item in guest cart', newItems);
          showAddToCartSuccessToast(product.name);
          return newItems;
        }
        const newItems = [
          ...prevItems,
          {
            id: Date.now() + Math.random(), // Generate unique ID for guest cart items
            productId: product.id,
            name: product.name,
            image: product.images[0],
            price: product.price,
            color: selectedColor,
            size: selectedSize,
            quantity: quantity
          }
        ];
        console.log('CartContext: added new item to guest cart', newItems);
        showAddToCartSuccessToast(product.name);
        return newItems;
      });
    }
  };

  const removeFromCart = async (itemId) => {
    console.log('CartContext: removeFromCart called with itemId:', itemId);
    console.log('CartContext: current cartItems:', cartItems);
    const itemToRemove = cartItems.find(item => item.id === itemId);
    console.log('CartContext: itemToRemove:', itemToRemove);
    
    if (!itemToRemove) {
      console.error('CartContext: Item not found for removal');
      showRemoveFromCartErrorToast('Item not found in cart');
      return;
    }
    
    if (isAuthenticated) {
      try {
        console.log('CartContext: removing from backend with productId:', itemToRemove.productId);
        // Pass productId to the API, not the cart item ID
        await apiRemoveFromCart(itemToRemove.productId);
        const backendCart = await apiGetCart();
        console.log('CartContext: backend cart after removal:', backendCart);
        setCartItems(backendCart);
        showRemoveFromCartSuccessToast(itemToRemove?.name || 'Item');
      } catch (error) {
        console.error('CartContext: error removing from cart', error);
        showRemoveFromCartErrorToast(error.message || 'Failed to remove item');
      }
    } else {
      console.log('CartContext: removing from local storage');
      setCartItems(prevItems => {
        const newItems = prevItems.filter(item => item.id !== itemId);
        console.log('CartContext: new cart items after removal:', newItems);
        return newItems;
      });
      showRemoveFromCartSuccessToast(itemToRemove?.name || 'Item');
    }
  };

  const updateQuantity = async (itemId, change) => {
    if (isAuthenticated) {
        try {
            const item = cartItems.find(i => i.id === itemId);
            if (!item) return;

            const newQuantity = Math.max(1, item.quantity + change);
            
            // Pass productId and variationId to the API
            await apiUpdateCartItem(item.productId, newQuantity, item.variationId);
            
            const backendCart = await apiGetCart();
            setCartItems(backendCart);
            showUpdateCartSuccessToast();
        } catch (error) {
            console.error("Failed to update quantity:", error);
        }
    } else {
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId
                    ? { ...item, quantity: Math.max(1, item.quantity + change) }
                    : item
            )
        );
        showUpdateCartSuccessToast();
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await apiClearCart();
        setCartItems([]);
        showClearCartSuccessToast();
      } catch (error) {
        console.error('CartContext: error clearing cart', error);
      }
    } else {
      setCartItems([]);
      localStorage.removeItem('cartItems');
      showClearCartSuccessToast();
    }
  };

  const setQuantity = async (itemId, quantity) => {
    const validQuantity = parseInt(quantity) || 0;
    if (validQuantity < 1) {
      await removeFromCart(itemId);
      return;
    }
    if (isAuthenticated) {
      try {
        const item = cartItems.find(i => i.id === itemId);
        if (!item) return;
        await apiUpdateCartItem(item.productId, validQuantity, item.variationId);
        const backendCart = await apiGetCart();
        setCartItems(backendCart);
        showUpdateCartSuccessToast();
      } catch (error) {
        console.error("Failed to set quantity:", error);
      }
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: validQuantity }
            : item
        ).filter(item => item.quantity > 0)
      );
      showUpdateCartSuccessToast();
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
      setIsAuthenticated,
      isCartLoading,
      setQuantity
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