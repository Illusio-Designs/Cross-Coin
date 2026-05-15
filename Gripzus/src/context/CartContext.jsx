import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* Gripzus cart — client-side state + slide-in drawer control.
   Mirrors the cart UX of Knitwink / Velmique / Crosscoin: items live
   in a drawer, never on a dedicated page. Persists to localStorage. */

const CartContext = createContext(null);
const STORAGE_KEY = 'gripzus:cart';

export function CartProvider({ children }) {
  const [items, setItems]   = useState([]);
  const [open, setOpen]     = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  /* A cart line is uniquely keyed by product id + size + colour, so the
     same sock in two sizes shows as two lines. */
  const lineKey = (it) => `${it.id}::${it.size || ''}::${it.color || ''}`;

  const addItem = useCallback((item, { openDrawer = true } = {}) => {
    setItems((prev) => {
      const key = lineKey(item);
      const found = prev.find((p) => lineKey(p) === key);
      if (found) {
        return prev.map((p) =>
          lineKey(p) === key ? { ...p, qty: p.qty + (item.qty || 1) } : p
        );
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
    if (openDrawer) setOpen(true);
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((p) => lineKey(p) !== key));
  }, []);

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => lineKey(p) !== key)
        : prev.map((p) => (lineKey(p) === key ? { ...p, qty } : p))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count    = items.reduce((s, it) => s + it.qty, 0);
  const subtotal = items.reduce((s, it) => s + (it.salePrice ?? it.price) * it.qty, 0);

  const value = {
    items, count, subtotal, lineKey,
    open, openCart: () => setOpen(true), closeCart: () => setOpen(false),
    addItem, removeItem, updateQty, clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
