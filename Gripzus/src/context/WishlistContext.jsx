import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* Gripzus wishlist — client-side state, localStorage-persisted.
   API sync will be wired in later (structure-first). */

const WishlistContext = createContext(null);
const STORAGE_KEY = 'gripzus:wishlist';

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const has = useCallback(
    (id) => items.some((i) => String(i.id) === String(id)),
    [items]
  );

  const toggle = useCallback((product) => {
    if (!product?.id) return;
    setItems((prev) =>
      prev.some((i) => String(i.id) === String(product.id))
        ? prev.filter((i) => String(i.id) !== String(product.id))
        : [...prev, product]
    );
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((i) => String(i.id) !== String(id)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return (
    <WishlistContext.Provider value={{ items, count: items.length, has, toggle, remove, clear }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
