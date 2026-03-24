import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getWishlist, addToWishlist as apiAddToWishlist, removeFromWishlist as apiRemoveFromWishlist, clearWishlist as apiClearWishlist } from '../services/publicApi';
import { fbqTrack } from '../utils/fbqTrack';
import { 
  showAddToWishlistSuccessToast, 
  showAddToWishlistErrorToast, 
  showRemoveFromWishlistSuccessToast, 
  showClearWishlistSuccessToast 
} from '../utils/toast';

const WishlistContext = createContext();

function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

function forceEnvImageBase(url) {
  if (!url || typeof url !== 'string') return null; // No fallback image
  if (url.startsWith('http')) {
    if (url.includes('localhost:5000')) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      return `${baseUrl}${path}`;
    }
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
  return `${baseUrl}${url}`;
}

function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const apiCalledRef = useRef(false);

  // Initialize authentication state after hydration (client-side only)
  useEffect(() => {
    // Check if token exists in localStorage (client-side only)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
    setIsHydrated(true);
  }, []);

  // Load wishlist from backend or localStorage after hydration
  useEffect(() => {
    if (!isHydrated || apiCalledRef.current) return; // Prevent multiple calls and wait for hydration
    apiCalledRef.current = true;
    const fetchWishlist = async () => {
      if (isAuthenticated) {
        try {
          const backendWishlist = await getWishlist();
          // Debug log
          setWishlist(backendWishlist.map(item => {
            const product = item.Product;
            let primaryImage = '';
            if (product?.ProductImages && product.ProductImages.length > 0 && product?.ProductImages[0].image_url) {
              primaryImage = forceEnvImageBase(product.ProductImages[0].image_url);
            } else if (product?.image) {
              primaryImage = forceEnvImageBase(product.image);
            } else {
              primaryImage = null; // No fallback image
            }
            // Get price and comparePrice from the first variation
            const firstVariation = product?.ProductVariations?.[0] || {};
            return {
              ...product,
              id: product.id,
              image: primaryImage,
              price: firstVariation.price || 0,
              comparePrice: firstVariation.comparePrice || 0,
              addedAt: item.addedAt || new Date().toISOString()
            };
          }));
        } catch {
          setWishlist([]);
        }
      } else {
        // Load from localStorage only on client-side after hydration
        if (typeof window !== 'undefined') {
          const savedWishlist = localStorage.getItem('wishlist');
          if (savedWishlist) {
            const parsedWishlist = JSON.parse(savedWishlist);
            setWishlist(parsedWishlist);
          }
        }
      }
    };
    fetchWishlist();
  }, [isHydrated, isAuthenticated]);

  useEffect(() => {
    if (!isHydrated) return; // Only sync to localStorage after hydration
    if (!isAuthenticated) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
    setWishlistCount(wishlist.length);
  }, [wishlist, isAuthenticated, isHydrated]);

  const addToWishlist = async (product) => {
    if (isAuthenticated) {
      try {
        await apiAddToWishlist(product.id, product.selectedVariation?.id);
        const backendWishlist = await getWishlist();
        setWishlist(backendWishlist.map(item => {
          const product = item.Product;
          let primaryImage = '';
          if (product?.ProductImages && product.ProductImages.length > 0 && product.ProductImages[0].image_url) {
            primaryImage = forceEnvImageBase(product.ProductImages[0].image_url);
          } else if (product?.image) {
            primaryImage = forceEnvImageBase(product.image);
          } else {
            primaryImage = null; // No fallback image
          }
          const variation = item.Variation || product?.ProductVariations?.[0] || {};
          return {
            ...product,
            id: product.id,
            image: primaryImage,
            price: variation.price || 0,
            comparePrice: variation.comparePrice || 0,
            addedAt: item.addedAt || new Date().toISOString(),
            selectedVariation: variation,
          };
        }));
        showAddToWishlistSuccessToast(product.name);
        fbqTrack('AddToWishlist', {
          content_ids: [String(product.id)],
          content_name: product.name,
          content_type: 'product',
          value: product.price,
          currency: 'INR',
        });
      } catch (error) {
        showAddToWishlistErrorToast(error.message);
      }
    } else {
      setWishlist(prevWishlist => {
        const exists = prevWishlist.some(item => item.id === product.id);
        if (!exists) {
          let primaryImage = '';
          if (product.selectedVariation?.images && product.selectedVariation.images.length > 0) {
            primaryImage = product.selectedVariation.images[0].image_url;
          } else if (product.variationImages && product.variationImages.length > 0) {
            primaryImage = product.variationImages[0];
          } else if (Array.isArray(product.images) && product.images.length > 0) {
            primaryImage = product.images[0].image_url;
          } else if (product.image) {
            primaryImage = product.image;
          }
          
          let images = [];
          if (product.selectedVariation?.images && product.selectedVariation.images.length > 0) {
            images = product.selectedVariation.images;
          } else if (product.variationImages && product.variationImages.length > 0) {
            images = product.variationImages.map(img => ({ image_url: img, is_primary: false }));
            if(images.length > 0) images[0].is_primary = true;
          } else if (Array.isArray(product.images) && product.images.length > 0) {
            images = product.images;
          } else if (product.image) {
            images = [{ image_url: product.image, is_primary: true }];
          } else if (product.ProductImages && product.ProductImages.length > 0) {
            images = product.ProductImages;
          }
          
          const newWishlistItem = {
            ...product,
            image: primaryImage,
            images,
            addedAt: new Date().toISOString(),
            selectedVariation: product.selectedVariation,
            selectedSize: product.selectedSize,
            price: product.selectedVariation?.price || product.price,
            comparePrice: product.selectedVariation?.comparePrice || product.comparePrice,
          };
          
          return [...prevWishlist, newWishlistItem];
        }
        return prevWishlist;
      });
      showAddToWishlistSuccessToast(product.name);
    }
  };

  const removeFromWishlist = async (productId) => {
    const itemToRemove = wishlist.find(item => item.id === productId);
    if (isAuthenticated) {
      try {
        await apiRemoveFromWishlist(productId);
        setWishlist(prev => prev.filter(item => item.id !== productId));
        showRemoveFromWishlistSuccessToast(itemToRemove?.name || 'Item');
        if (itemToRemove) {
          fbqTrack('RemoveFromWishlist', {
            content_ids: [String(itemToRemove.id)],
            content_name: itemToRemove.name,
            content_type: 'product',
            value: itemToRemove.price,
            currency: 'INR',
          });
        }
      } catch (error) {
        }
    } else {
      setWishlist(prevWishlist => prevWishlist.filter(item => item.id !== productId));
      showRemoveFromWishlistSuccessToast(itemToRemove?.name || 'Item');
      if (itemToRemove) {
        fbqTrack('RemoveFromWishlist', {
          content_ids: [String(itemToRemove.id)],
          content_name: itemToRemove.name,
          content_type: 'product',
          value: itemToRemove.price,
          currency: 'INR',
        });
      }
    }
  };

  const clearWishlist = async () => {
    if (isAuthenticated) {
      try {
        await apiClearWishlist();
        setWishlist([]);
        showClearWishlistSuccessToast();
      } catch (error) {
        }
    } else {
      setWishlist([]);
      localStorage.removeItem('wishlist');
      showClearWishlistSuccessToast();
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

  const value = {
    wishlist,
    wishlistCount,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    setIsAuthenticated
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export { WishlistProvider, useWishlist }; 
