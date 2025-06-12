import React, { createContext, useContext, useState, useEffect } from 'react';
// import { wishlistService } from '../services';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Load wishlist on initial render
  useEffect(() => {
    loadWishlist();
  }, [user]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      setError(null);
      if (user) {
        // If user is logged in, fetch wishlist from server
        const response = await wishlistService.getWishlist();
        setWishlist(response.items || []);
      } else {
        // If user is not logged in, load from localStorage
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
          setWishlist(JSON.parse(savedWishlist));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load wishlist');
      console.error('Error loading wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save wishlist to localStorage or server whenever it changes
  useEffect(() => {
    if (!loading) {
      if (user) {
        // If user is logged in, sync with server
        wishlistService.syncWishlist(wishlist).catch(err => {
          console.error('Error syncing wishlist:', err);
          setError('Failed to sync wishlist with server');
        });
      } else {
        // If user is not logged in, save to localStorage
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
      }
      setWishlistCount(wishlist.length);
    }
  }, [wishlist, user, loading]);

  const addToWishlist = async (product) => {
    try {
      setError(null);
      if (user) {
        // If user is logged in, add to server
        await wishlistService.addToWishlist(product);
      }

      setWishlist(prevWishlist => {
        // Check if product already exists in wishlist
        const exists = prevWishlist.some(item => item.id === product.id);
        if (!exists) {
          return [...prevWishlist, { ...product, addedAt: new Date().toISOString() }];
        }
        return prevWishlist;
      });
    } catch (err) {
      setError(err.message || 'Failed to add item to wishlist');
      throw err;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      setError(null);
      if (user) {
        // If user is logged in, remove from server
        await wishlistService.removeFromWishlist(productId);
      }
      setWishlist(prevWishlist => 
        prevWishlist.filter(item => item.id !== productId)
      );
    } catch (err) {
      setError(err.message || 'Failed to remove item from wishlist');
      throw err;
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

  const clearWishlist = async () => {
    try {
      setError(null);
      if (user) {
        // If user is logged in, clear on server
        await wishlistService.clearWishlist();
      }
      setWishlist([]);
      localStorage.removeItem('wishlist');
    } catch (err) {
      setError(err.message || 'Failed to clear wishlist');
      throw err;
    }
  };

  const value = {
    wishlist,
    wishlistCount,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    refreshWishlist: loadWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}; 