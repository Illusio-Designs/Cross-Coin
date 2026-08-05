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
        // Backend tracks PRODUCT ids. Keep the richer local rows (which may be
        // per-colour variants, keyed by uid) whose product is still wishlisted,
        // then append any product wishlisted elsewhere that we don't have locally.
        const remoteIds = new Set(remote.map((r) => String(r.id)));
        const keptLocal = local.filter((i) => remoteIds.has(String(i.pid ?? i.id)));
        const localPids = new Set(keptLocal.map((i) => String(i.pid ?? i.id)));
        const extras = remote
          .filter((r) => !localPids.has(String(r.id)))
          .map((r) => ({ ...r, id: String(r.id), pid: String(r.id), key: String(r.id) }));
        setItems([...keptLocal, ...extras]);
      })
      .catch(() => { /* offline / unreachable — keep the localStorage copy */ });
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  // Match on the variant key (uid) OR the product id, so each colour card is
  // independent yet page-level calls that pass a product id still resolve.
  const has = useCallback(
    (x) => {
      const s = String(x);
      return items.some((i) => String(i.key ?? i.id) === s || String(i.id) === s || String(i.pid ?? i.id) === s);
    },
    [items]
  );

  const addItem = useCallback(async (product) => {
    if (!product?.id) return;
    const pid = String(product.id);               // real product id — sent to backend
    const key = String(product.uid || product.id); // per-variant key — unique per colour card
    if (items.some((i) => String(i.key ?? i.id) === key)) return;
    setItems((prev) => [...prev, { ...product, id: pid, pid, key }]); // optimistic
    setSyncing(true);
    try {
      await apiAddToWishlist(pid);
      toastAddedToWishlist(product.name);
    } catch {
      setItems((prev) => prev.filter((i) => String(i.key ?? i.id) !== key)); // rollback
      showError('Could not save to wishlist. Please try again.', 'wishlist-err');
    } finally {
      setSyncing(false);
    }
  }, [items]);

  const remove = useCallback(async (x) => {
    const s = String(x);
    const removed = items.find((i) => String(i.key ?? i.id) === s || String(i.id) === s || String(i.pid ?? i.id) === s);
    if (!removed) return;
    const rKey = String(removed.key ?? removed.id);
    const pid  = String(removed.pid ?? removed.id);
    setItems((prev) => prev.filter((i) => String(i.key ?? i.id) !== rKey)); // optimistic
    setSyncing(true);
    try {
      await apiRemoveFromWishlist(pid);
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
    const key = String(product.uid || product.id);
    if (items.some((i) => String(i.key ?? i.id) === key)) {
      remove(key);
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
