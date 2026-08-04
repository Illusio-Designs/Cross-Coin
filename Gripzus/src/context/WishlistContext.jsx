import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getWishlist as apiGetWishlist,
  addToWishlist as apiAddToWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  clearWishlist as apiClearWishlist,
} from '../services/wishlist';
import {
  toastAddedToWishlist,
  toastRemovedFromWishlist,
  toastWishlistCleared,
  showError,
} from '../utils/toast';

/* Gripzus wishlist — backend-synced (same model as Knitwink).

   The backend is the source of truth for *which* product IDs are
   saved; we keep the richer product object locally so cards have
   images, colours and price. Persisted to localStorage for instant
   paint and an offline fallback. Works for guests and signed-in users.

   Every mutation is optimistic — the UI updates immediately, then the
   API call runs and rolls back if it fails. */

const WishlistContext = createContext(null);
const STORAGE_KEY = 'gripzus:wishlist';

export function WishlistProvider({ children }) {
  const [items, setItems]     = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load localStorage instantly, then reconcile with the backend.
  useEffect(() => {
    let local = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) local = JSON.parse(raw) || [];
    } catch {}
    setItems(local);
    setHydrated(true);

    apiGetWishlist()
      .then((remote) => {
        const remoteIds = new Set(remote.map((r) => String(r.id)));
        const localById = new Map(local.map((i) => [String(i.id), i]));
        // Prefer the richer local copy; fall back to the backend row.
        const merged = remote.map((r) => {
          const l = localById.get(String(r.id));
          return l ? { ...l, id: String(r.id) } : r;
        });
        setItems(merged.filter((i) => remoteIds.has(String(i.id))));
      })
      .catch(() => { /* offline / unreachable — keep the localStorage copy */ });
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const has = useCallback(
    (id) => items.some((i) => String(i.id) === String(id)),
    [items]
  );

  const addItem = useCallback(async (product) => {
    if (!product?.id) return;
    const id = String(product.id);
    if (items.some((i) => String(i.id) === id)) return;
    setItems((prev) => [...prev, { ...product, id }]); // optimistic
    setSyncing(true);
    try {
      await apiAddToWishlist(id);
      toastAddedToWishlist(product.name);
    } catch {
      setItems((prev) => prev.filter((i) => String(i.id) !== id)); // rollback
      showError('Could not save to wishlist. Please try again.', 'wishlist-err');
    } finally {
      setSyncing(false);
    }
  }, [items]);

  const remove = useCallback(async (productId) => {
    const id = String(productId);
    const removed = items.find((i) => String(i.id) === id);
    if (!removed) return;
    setItems((prev) => prev.filter((i) => String(i.id) !== id)); // optimistic
    setSyncing(true);
    try {
      await apiRemoveFromWishlist(id);
      toastRemovedFromWishlist(removed.name);
    } catch {
      setItems((prev) => [...prev, removed]); // rollback
      showError('Could not update wishlist. Please try again.', 'wishlist-err');
    } finally {
      setSyncing(false);
    }
  }, [items]);

  const toggle = useCallback((product) => {
    if (!product?.id) return;
    if (items.some((i) => String(i.id) === String(product.id))) {
      remove(product.id);
    } else {
      addItem(product);
    }
  }, [items, addItem, remove]);

  const clear = useCallback(async () => {
    if (!items.length) return;
    const prev = items;
    setItems([]); // optimistic
    setSyncing(true);
    try {
      await apiClearWishlist();
      toastWishlistCleared();
    } catch {
      setItems(prev); // rollback
      showError('Could not clear wishlist. Please try again.', 'wishlist-err');
    } finally {
      setSyncing(false);
    }
  }, [items]);

  return (
    <WishlistContext.Provider
      value={{ items, count: items.length, hydrated, syncing, has, addItem, remove, toggle, clear }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
