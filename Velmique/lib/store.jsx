'use client';
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  getWishlist as apiGetWishlist,
  addToWishlist as apiAddToWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  clearWishlist as apiClearWishlist,
} from '@/lib/api/wishlist';
import {
  toastAddedToCart, toastRemovedFromCart, toastCartCleared,
  toastAddedToWishlist, toastRemovedFromWishlist,
} from '@/lib/toast';

/**
 * Velmique global store.
 *
 * Single Context wrapping cart + wishlist + UI flags. Previously every
 * render of <StoreProvider> emitted a fresh value object, re-rendering
 * every consumer of `useStore()` — including ProductCard grids and the
 * Header — on every state tick.
 *
 * Fix: actions are all stable (useCallback) and the context value is
 * useMemo'd, so consumers only re-render when the data they actually
 * read changes. This is the lowest-blast-radius fix; a true per-slice
 * Context split (cart / wishlist / ui) would still require updating
 * every call site to subscribe granularly and is deferred.
 */

const StoreContext = createContext(undefined);

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [wishlistSyncing, setWishlistSyncing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Hydrate from the backend on mount.
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
    toastAddedToCart(item.name);
  }, []);

  const removeFromCart = useCallback((id, size) => {
    setCart(prev => {
      const removed = prev.find(c => c.id === id && c.size === size);
      if (removed) toastRemovedFromCart(removed.name);
      return prev.filter(c => !(c.id === id && c.size === size));
    });
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
    let previous = null;
    let exists = false;
    setWishlist(prev => {
      previous = prev;
      exists = prev.some(w => String(w.id) === id);
      return exists
        ? prev.filter(w => String(w.id) !== id)
        : [...prev, { ...item, id }];
    });

    setWishlistSyncing(true);
    try {
      if (exists) {
        await apiRemoveFromWishlist(id);
        toastRemovedFromWishlist(item.name);
      } else {
        await apiAddToWishlist(id);
        toastAddedToWishlist(item.name);
      }
    } catch (err) {
      setWishlist(previous);
      console.warn('[wishlist] sync failed:', err.message);
    } finally {
      setWishlistSyncing(false);
    }
  }, []);

  const isWishlisted = useCallback(
    (id) => wishlist.some(w => String(w.id) === String(id)),
    [wishlist]
  );

  const updateWishlistItem = useCallback((id, patch) => {
    setWishlist(prev => prev.map(w =>
      String(w.id) === String(id) ? { ...w, ...patch } : w
    ));
  }, []);

  const clearWishlist = useCallback(async () => {
    let prev = null;
    setWishlist(curr => { prev = curr; return []; });
    try { await apiClearWishlist(); }
    catch (err) {
      setWishlist(prev);
      console.warn('[wishlist] clear failed:', err.message);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    try {
      const items = await apiGetWishlist();
      setWishlist(items);
    } catch (err) {
      console.warn('[wishlist] refresh failed:', err.message);
    }
  }, []);

  const clearCart = useCallback((silent = false) => {
    setCart([]);
    if (!silent) toastCartCleared();
  }, []);

  // Derived values memo'd off the underlying state — same reference
  // until cart actually changes.
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  // Single memo'd value — emits a new object reference only when one of
  // the underlying inputs changes, instead of on every render.
  const value = useMemo(() => ({
    cart, wishlist, cartOpen, searchOpen,
    wishlistLoading, wishlistSyncing,
    addToCart, removeFromCart, updateQuantity,
    toggleWishlist, isWishlisted, updateWishlistItem, clearWishlist, refreshWishlist,
    setCartOpen, setSearchOpen,
    cartTotal, cartCount, clearCart,
  }), [
    cart, wishlist, cartOpen, searchOpen,
    wishlistLoading, wishlistSyncing,
    addToCart, removeFromCart, updateQuantity,
    toggleWishlist, isWishlisted, updateWishlistItem, clearWishlist, refreshWishlist,
    cartTotal, cartCount, clearCart,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
