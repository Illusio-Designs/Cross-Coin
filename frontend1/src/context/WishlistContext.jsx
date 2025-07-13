import React, { createContext, useContext, useState, useEffect } from 'react';
import { getWishlist, addToWishlist as apiAddToWishlist, removeFromWishlist as apiRemoveFromWishlist, clearWishlist as apiClearWishlist } from '../services/publicindex';
import { fbqTrack } from '../components/common/Analytics';
import { 
  showAddToWishlistSuccessToast, 
  showAddToWishlistErrorToast, 
  showRemoveFromWishlistSuccessToast, 
  showClearWishlistSuccessToast 
} from '../utils/toast';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

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

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Load wishlist from backend or localStorage on initial render
  useEffect(() => {
    const fetchWishlist = async () => {
      if (isAuthenticated) {
        try {
          const backendWishlist = await getWishlist();
          setWishlist(backendWishlist.map(item => {
            const product = item.Product;
            let primaryImage = product?.ProductImages?.[0]?.image_url || '';
            if (primaryImage) {
              primaryImage = forceEnvImageBase(primaryImage);
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
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
          const parsedWishlist = JSON.parse(savedWishlist);
          setWishlist(parsedWishlist);
        }
      }
    };
    fetchWishlist();
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    setWishlistCount(wishlist.length);
  }, [wishlist]);

  const addToWishlist = async (product) => {
    if (isAuthenticated) {
      try {
        await apiAddToWishlist(product.id);
        const backendWishlist = await getWishlist();
        setWishlist(backendWishlist.map(item => {
          const product = item.Product;
          let primaryImage = product?.ProductImages?.[0]?.image_url || '';
          if (primaryImage) {
            primaryImage = forceEnvImageBase(primaryImage);
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
        showAddToWishlistSuccessToast(product.name);
        fbqTrack('AddToWishlist', {
          content_ids: [product.id],
          content_name: product.name,
          content_type: 'product',
          value: product.price,
          currency: 'INR',
        });
      } catch (error) {
        console.error('WishlistContext: error adding to wishlist', error);
        showAddToWishlistErrorToast(error.message);
      }
    } else {
      setWishlist(prevWishlist => {
        const exists = prevWishlist.some(item => item.id === product.id);
        if (!exists) {
          showAddToWishlistSuccessToast(product.name);
          fbqTrack('AddToWishlist', {
            content_ids: [product.id],
            content_name: product.name,
            content_type: 'product',
            value: product.price,
            currency: 'INR',
          });
          return [...prevWishlist, { ...product, addedAt: new Date().toISOString() }];
        }
        return prevWishlist;
      });
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
            content_ids: [itemToRemove.id],
            content_name: itemToRemove.name,
            content_type: 'product',
            value: itemToRemove.price,
            currency: 'INR',
          });
        }
      } catch (error) {
        console.error('WishlistContext: error removing from wishlist', error);
      }
    } else {
      setWishlist(prevWishlist => prevWishlist.filter(item => item.id !== productId));
      showRemoveFromWishlistSuccessToast(itemToRemove?.name || 'Item');
      if (itemToRemove) {
        fbqTrack('RemoveFromWishlist', {
          content_ids: [itemToRemove.id],
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
        console.error('WishlistContext: error clearing wishlist', error);
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
};

export { WishlistContext }; 