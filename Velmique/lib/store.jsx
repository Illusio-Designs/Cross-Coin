'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getWishlist as apiGetWishlist,
  addToWishlist as apiAddToWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  clearWishlist as apiClearWishlist,
} from '@/lib/api/wishlist';

const StoreContext = createContext(undefined);

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [wishlistSyncing, setWishlistSyncing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Hydrate from the backend on mount. The API works for guests via the
  // X-Guest-Token header, so we always get a real list back.
  useEffect(() => {
    let alive = true;
    apiGetWishlist()
      .then(items => { if (alive) setWishlist(items); })
      .catch(err => { console.warn('[wishlist] hydrate failed:', err.message); })
      .finally(() => { if (alive) setWishlistLoading(false); });
    return () => { alive = false; };
  }, []);

  const addToCart = useCallback((item) => {
    const addQty = Math.max(1, Number(item.quantity) || 1);
    setCart(prev => {
      const key = `${item.id}-${item.size}-${item.color}`;
      const existing = prev.find(c => `${c.id}-${c.size}-${c.color}` === key);
      if (existing) {
        return prev.map(c => `${c.id}-${c.size}-${c.color}` === key ? { ...c, quantity: c.quantity + addQty } : c);
      }
      return [...prev, { ...item, quantity: addQty }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id, size) => {
    setCart(prev => prev.filter(c => !(c.id === id && c.size === size)));
  }, []);

  const updateQuantity = useCallback((id, qty, size) => {
    if (qty <= 0) { removeFromCart(id, size); return; }
    setCart(prev => prev.map(c => c.id === id && c.size === size ? { ...c, quantity: qty } : c));
  }, [removeFromCart]);

  // Optimistic toggle — flip local state instantly, sync to backend, revert
  // on failure so the UI never lies about the persisted state.
  const toggleWishlist = useCallback(async (item) => {
    if (!item?.id) return;
    const id = String(item.id);
    const exists = wishlist.some(w => String(w.id) === id);
    const previous = wishlist;
    const next = exists
      ? wishlist.filter(w => String(w.id) !== id)
      : [...wishlist, { ...item, id }];
    setWishlist(next);

    setWishlistSyncing(true);
    try {
      if (exists) await apiRemoveFromWishlist(id);
      else        await apiAddToWishlist(id);
    } catch (err) {
      setWishlist(previous);
      console.warn('[wishlist] sync failed:', err.message);
    } finally {
      setWishlistSyncing(false);
    }
  }, [wishlist]);

  const isWishlisted = useCallback(
    (id) => wishlist.some(w => String(w.id) === String(id)),
    [wishlist]
  );

  // Locally update a wishlist item's snapshot (variation, image, price). The
  // backend stores rows by productId only, so this is purely client-side
  // metadata used to remember which variation the customer picked.
  const updateWishlistItem = useCallback((id, patch) => {
    setWishlist(prev => prev.map(w =>
      String(w.id) === String(id) ? { ...w, ...patch } : w
    ));
  }, []);

  const clearWishlist = useCallback(async () => {
    const prev = wishlist;
    setWishlist([]);
    try { await apiClearWishlist(); }
    catch (err) {
      setWishlist(prev);
      console.warn('[wishlist] clear failed:', err.message);
    }
  }, [wishlist]);

  const refreshWishlist = useCallback(async () => {
    try {
      const items = await apiGetWishlist();
      setWishlist(items);
    } catch (err) {
      console.warn('[wishlist] refresh failed:', err.message);
    }
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const clearCart = () => setCart([]);

  return (
    <StoreContext.Provider value={{
      cart, wishlist, cartOpen, searchOpen,
      wishlistLoading, wishlistSyncing,
      addToCart, removeFromCart, updateQuantity,
      toggleWishlist, isWishlisted, updateWishlistItem, clearWishlist, refreshWishlist,
      setCartOpen, setSearchOpen,
      cartTotal, cartCount, clearCart,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
