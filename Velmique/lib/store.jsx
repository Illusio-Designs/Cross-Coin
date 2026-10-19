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
import { fbTrack } from '@/utils/pixel';

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

// The bag is kept in this browser so a refresh, a new tab or coming back
// later doesn't empty it. Entries older than 30 days are dropped.
const CART_KEY = 'velmique_cart_v1';
const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readSavedCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.items) || Date.now() - Number(saved.at || 0) > CART_TTL_MS) return [];
    return saved.items.filter((i) => i && i.id != null && Number(i.quantity) > 0);
  } catch {
    return [];
  }
}

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [wishlistSyncing, setWishlistSyncing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  // "Buy now" / the /checkout page open the bag straight on its delivery &
  // payment step; the drawer consumes this flag when it opens.
  const [checkoutRequested, setCheckoutRequested] = useState(false);
  const [cartHydrated, setCartHydrated] = useState(false);

  // Load the saved bag after mount (not during render, so the server HTML and
  // the first client render match). A cart already filled by then — e.g. a
  // WhatsApp recovery link — wins over the saved one.
  useEffect(() => {
    const saved = readSavedCart();
    if (saved.length) setCart((prev) => (prev.length ? prev : saved));
    setCartHydrated(true);

    // Keep other open tabs of the store in step.
    const onStorage = (e) => {
      if (e.key === CART_KEY) setCart(readSavedCart());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      if (cart.length) localStorage.setItem(CART_KEY, JSON.stringify({ at: Date.now(), items: cart }));
      else localStorage.removeItem(CART_KEY);
    } catch { /* storage full or blocked — the bag still works for this visit */ }
  }, [cart, cartHydrated]);

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

    // Meta funnel: AddToCart (browser pixel + server CAPI, deduped by eventID).
    // Cart line ids are composite (`productId:variationId`); the real Meta
    // catalogue id is the product id, so content_ids use item.productId.
    const unitPrice = Number(item.price ?? 0);
    fbTrack('AddToCart', {
      content_ids: [String(item.productId ?? item.id)],
      content_type: 'product',
      content_name: item.name || undefined,
      value: unitPrice * addQty,
      currency: 'INR',
      contents: [{ id: String(item.productId ?? item.id), quantity: addQty }],
    });
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

  const openCheckout = useCallback(() => {
    setCheckoutRequested(true);
    setCartOpen(true);
  }, []);
  const consumeCheckoutRequest = useCallback(() => setCheckoutRequested(false), []);

  const clearCart = useCallback((silent = false) => {
    setCart([]);
    if (!silent) toastCartCleared();
  }, []);

  // WhatsApp cart-recovery link: put a recovered cart back (lines from
  // GET /api/abandoned-cart/restore/:token — see utils/cartRecovery.js). A
  // shopper coming back from the WhatsApp message (often in its in-app
  // browser, where nothing is saved) would otherwise find it empty. Only
  // fills an EMPTY cart; no AddToCart pixel/toast.
  const restoreCart = useCallback((lines) => {
    const list = (Array.isArray(lines) ? lines : []).map((l) => {
      if (l.line && l.line.id != null) return { ...l.line, quantity: l.quantity || 1 };
      return {
        id: `${l.productId}:${l.variationId ?? 'v'}${l.packGroup ? ':pack' : ''}`,
        productId: l.productId,
        variationId: l.variationId ?? null,
        name: l.name,
        price: Number(l.price) || 0,
        size: l.size || '',
        image: l.image || '',
        quantity: l.quantity || 1,
        ...(l.packGroup ? { packGroup: l.packGroup } : {}),
      };
    }).filter((i) => i.productId != null);
    if (!list.length) return 0;
    setCart((prev) => (prev.length ? prev : list));
    setCartOpen(true);
    return list.length;
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
    cart, wishlist, cartOpen,
    wishlistLoading, wishlistSyncing,
    addToCart, removeFromCart, updateQuantity,
    toggleWishlist, isWishlisted, updateWishlistItem, clearWishlist, refreshWishlist,
    setCartOpen,
    checkoutRequested, openCheckout, consumeCheckoutRequest,
    cartTotal, cartCount, clearCart, restoreCart,
  }), [
    cart, wishlist, cartOpen,
    wishlistLoading, wishlistSyncing,
    addToCart, removeFromCart, updateQuantity,
    toggleWishlist, isWishlisted, updateWishlistItem, clearWishlist, refreshWishlist,
    checkoutRequested, openCheckout, consumeCheckoutRequest,
    cartTotal, cartCount, clearCart, restoreCart,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
