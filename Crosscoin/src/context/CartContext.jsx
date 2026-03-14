import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart
} from '../services/publicApi';
import { 
  showAddToCartSuccessToast, 
  showAddToCartErrorToast, 
  showRemoveFromCartSuccessToast, 
  showUpdateCartSuccessToast, 
  showClearCartSuccessToast,
  showRemoveFromCartErrorToast
} from '../utils/toast';

const CartContext = createContext();

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [buyNowItem, setBuyNowItem] = useState(null);

  // ✅ Request deduplication - prevent duplicate API calls
  const pendingRequestRef = React.useRef(null);

  // Initialize authentication state
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setAuthChecked(true);
    };
    
    checkAuth();
  }, []);

  // Sync isAuthenticated on token change
  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load cart from backend or localStorage on initial render or auth change
  useEffect(() => {
    // Don't fetch cart until auth is checked
    if (!authChecked) {
      return;
    }

    // ✅ Deduplication: Skip if request already pending
    if (pendingRequestRef.current) {
      return;
    }

    const fetchCart = async () => {
      try {
        // Mark request as pending
        pendingRequestRef.current = true;
        setIsCartLoading(true);
        
        if (isAuthenticated) {
          try {
            const backendCart = await apiGetCart();
            setCartItems(Array.isArray(backendCart) ? backendCart : []);
          } catch (error){
            // Fallback to localStorage if backend fails
            const savedCartItems = localStorage.getItem('cartItems');
            if (savedCartItems) {
              try {
                const parsedItems = JSON.parse(savedCartItems);
                setCartItems(Array.isArray(parsedItems) ? parsedItems : []);
              } catch (parseError) {
                setCartItems([]);
                localStorage.removeItem('cartItems'); // Clear corrupted data
              }
            } else {
              setCartItems([]);
            }
          }
        } else {
          const savedCartItems = localStorage.getItem('cartItems');
          if (savedCartItems) {
            try {
              const parsedItems = JSON.parse(savedCartItems);
              setCartItems(Array.isArray(parsedItems) ? parsedItems : []);
            } catch (parseError) {
              setCartItems([]);
              localStorage.removeItem('cartItems'); // Clear corrupted data
            }
          } else {
            setCartItems([]);
          }
        }
      } finally {
        setIsCartLoading(false);
        // Mark request as complete
        pendingRequestRef.current = null;
      }
    };
    
    fetchCart();
  }, [isAuthenticated, authChecked]);

  // Save cart items to localStorage whenever they change (for guests)
  useEffect(() => {
    // Don't save until auth is checked and cart is loaded
    if (!authChecked || isCartLoading) {
      return;
    }

    if (!isAuthenticated) {
      try {
        const cartData = JSON.stringify(cartItems);
        localStorage.setItem('cartItems', cartData);
        } catch (error) {
        }
    }
    
    const newCartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    setCartCount(newCartCount);
    }, [cartItems, isAuthenticated, authChecked, isCartLoading]);

  const addToCart = async (product, selectedColor, selectedSize, quantity = 1, variationId = null, variationImages = null) => {
    if (isAuthenticated) {
      try {
        // Use variationId directly
        await apiAddToCart({ productId: product.id, variationId, quantity, size: selectedSize });
        const backendCart = await apiGetCart();
        setCartItems(backendCart);
        showAddToCartSuccessToast(product.name);
        
        // Open drawer and set last added item
        const addedItem = backendCart.find(item => 
          item.product_id === product.id && item.variation_id === variationId
        );
        setLastAddedItem(addedItem || { id: Date.now(), name: product.name });
        setIsDrawerOpen(true);
      } catch(error) {
        showAddToCartErrorToast(error.message);
      }
    } else {
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
            showAddToCartSuccessToast(product.name);
            resolve(newItems);
            return newItems;
          }
          
          // Get variation price if available
          const selectedVariation = variationId && product.variations ? 
            product.variations.find(v => v.id === variationId) : null;
          const variationPrice = selectedVariation?.price || product.price;
          
          const newItem = {
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
          };
          
          const newItems = [...prevItems, newItem];
          
          showAddToCartSuccessToast(product.name);
          
          // Open drawer and set last added item
          setLastAddedItem(newItem);
          setIsDrawerOpen(true);
          
          resolve(newItems);
          return newItems;
        });
      });
    }
  };

  const removeFromCart = async (itemId) => {
    const itemToRemove = cartItems.find(item => item.id === itemId);
    if (!itemToRemove) {
      showRemoveFromCartErrorToast('Item not found in cart');
      return;
    }
    
    if (isAuthenticated) {
      try {
        // Always pass null for variationId if it is null or undefined
        await apiRemoveFromCart(
          itemToRemove.productId,
          itemToRemove.variationId == null ? null : itemToRemove.variationId
        );
        const backendCart = await apiGetCart();
        setCartItems(backendCart);
        showRemoveFromCartSuccessToast(itemToRemove?.name || 'Item');
      } catch (error) {
        showRemoveFromCartErrorToast(error.message || 'Failed to remove item');
      }
    } else {
      setCartItems(prevItems => {
        const newItems = prevItems.filter(item => item.id !== itemId);
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
    // Get variation price if available
    const selectedVariation = variationId && product.variations ? 
      product.variations.find(v => v.id === variationId) : null;
    const variationPrice = selectedVariation?.price || product.price;
    
    // Create buy now item
    const item = {
      id: Date.now() + Math.random(),
      productId: product.id,
      name: product.name,
      image: variationImages && variationImages.length > 0 ? variationImages[0] : product.images[0],
      images: variationImages && variationImages.length > 0 ? variationImages : product.images,
      price: variationPrice,
      color: selectedColor,
      size: selectedSize,
      quantity: quantity,
      variationId: variationId,
      variation: selectedVariation
    };
    
    setBuyNowItem(item);
  };

  const clearBuyNow = () => {
    setBuyNowItem(null);
  };

  const cartTotal = React.useMemo(() => {
    return cartItems.reduce((total, item) => {
      // Use variation price if available, otherwise fallback to item price
      const price = item.variation?.price || item.price || 0;
      return total + (parseFloat(price) || 0) * (item.quantity || 1);
    }, 0);
  }, [cartItems]);

  const buyNowTotal = React.useMemo(() => {
    if (!buyNowItem) return 0;
    const price = buyNowItem.variation?.price || buyNowItem.price || 0;
    return (parseFloat(price) || 0) * (buyNowItem.quantity || 1);
  }, [buyNowItem]);

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
      buyNow,
      buyNowItem,
      buyNowTotal,
      clearBuyNow,
      isDrawerOpen,
      setIsDrawerOpen,
      lastAddedItem
    }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export { CartProvider, useCart }; 
