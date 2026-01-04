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
    console.log('API BEING CALLED: Cart data fetch');
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

  const addToCart = async (product, selectedColor, selectedSize, quantity = 1, variationId = null, variationImages = null) => {
    console.log('CartContext: addToCart called with:', { 
      productName: product.name, 
      selectedColor, 
      selectedSize, 
      quantity, 
      variationId, 
      variationImages,
      productVariations: product.variations
    });
    console.log('CartContext: isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      try {
        console.log('CartContext: addToCart for authenticated user');
        // Use variationId directly
        console.log('CartContext: calling apiAddToCart with:', { productId: product.id, variationId, quantity, size: selectedSize });
        await apiAddToCart({ productId: product.id, variationId, quantity, size: selectedSize });
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
      return new Promise((resolve) => {
        setCartItems(prevItems => {
          const existingItem = prevItems.find(
            item =>
              item.productId === product.id &&
              item.variationId === variationId &&
              item.color === selectedColor &&
              item.size === selectedSize
          );
        if (existingItem) {
          // Get variation price if available
          const variationPrice = variationId && product.variations ? 
            product.variations.find(v => v.id === variationId)?.price || product.price : 
            product.price;
            
          const newItems = prevItems.map(item =>
            item.productId === product.id && 
            item.variationId === variationId &&
            item.color === selectedColor && 
            item.size === selectedSize
              ? { 
                  ...item, 
                  quantity: item.quantity + quantity,
                  price: variationPrice, // Update price to variation price
                  variation: variationId && product.variations ? 
                    product.variations.find(v => v.id === variationId) : item.variation
                }
              : item
          );
          console.log('CartContext: updated existing item in guest cart', newItems);
          showAddToCartSuccessToast(product.name);
          resolve(newItems);
          return newItems;
        }
          // Get variation price if available
          const selectedVariation = variationId && product.variations ? 
            product.variations.find(v => v.id === variationId) : null;
          const variationPrice = selectedVariation?.price || product.price;
          
          console.log('CartContext: Variation data for new guest cart item:', {
            variationId,
            selectedVariation,
            variationPrice,
            productPrice: product.price,
            selectedColor,
            selectedSize
          });
          
          const newItems = [
            ...prevItems,
            {
              id: Date.now() + Math.random(), // Generate unique ID for guest cart items
              productId: product.id,
              name: product.name,
              image: variationImages && variationImages.length > 0 ? variationImages[0] : product.images[0],
              images: variationImages && variationImages.length > 0 ? variationImages : product.images,
              price: variationPrice, // Use variation price if available
              color: selectedColor,
              size: selectedSize,
              quantity: quantity,
              variationId: variationId, // Store variationId for guest cart items
              variation: selectedVariation // Store full variation data
            }
          ];
          console.log('CartContext: added new item to guest cart with final data:', {
            newItem: newItems[newItems.length - 1],
            allItems: newItems
          });
          showAddToCartSuccessToast(product.name);
          resolve(newItems);
          return newItems;
        });
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
        console.log('CartContext: removing from backend with productId and variationId:', itemToRemove.productId, itemToRemove.variationId);
        // Always pass null for variationId if it is null or undefined
        await apiRemoveFromCart(
          itemToRemove.productId,
          itemToRemove.variationId == null ? null : itemToRemove.variationId
        );
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

  const buyNow = async (product, selectedColor, selectedSize, quantity = 1, variationId = null, variationImages = null) => {
    // For now, just add to cart and redirect to checkout
    await addToCart(product, selectedColor, selectedSize, quantity, variationId, variationImages);
  };

  const cartTotal = cartItems.reduce((total, item) => {
    // Use variation price if available, otherwise fallback to item price
    const price = item.variation?.price || item.price || 0;
    return total + (parseFloat(price) || 0) * (item.quantity || 1);
  }, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      cartTotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      setIsAuthenticated,
      isCartLoading,
      setQuantity,
      buyNow
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