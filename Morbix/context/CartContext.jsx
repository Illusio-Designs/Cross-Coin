'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
} from '@/lib/api/cart';

const CartContext = createContext(null);
const KEY = 'morbix_cart';

function isAuthed() {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem('token');
  } catch {
    return false;
  }
}

function cleanUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

// Pull the colour out of a backend cart row's variation attributes.
function attrColor(item) {
  const a = item.color || item.variation?.attributes || item.attributes;
  if (!a) return null;
  if (typeof a === 'string' && !a.trim().startsWith('{')) return a;
  const obj = typeof a === 'string' ? (() => { try { return JSON.parse(a); } catch { return {}; } })() : a;
  const c = obj?.color;
  return Array.isArray(c) ? c[0] : (c || null);
}

// Normalise a backend cart row into the Morbix cart-item shape the UI uses.
// Morbix items: { key, id, productId, variationId, serverId, slug, name,
//                 price, oldPrice, image, color, size, qty }
function normalizeServerItem(item) {
  const productId = item.productId ?? item.product_id ?? item.id;
  const variationId = item.variationId ?? item.variation_id ?? null;
  const images = Array.isArray(item.images) ? item.images : [];
  const image = cleanUrl(item.image || images[0]?.image_url || images[0]?.url || '');
  const size = item.size || (Array.isArray(item.size) ? item.size[0] : null) || 'M';
  return {
    key: `${productId}-${variationId ?? size}`,
    id: productId,
    productId,
    variationId,
    serverId: item.id,
    slug: item.slug || item.handle || '',
    name: item.name || '',
    price: parseFloat(item.price || 0),
    oldPrice: item.comparePrice ? parseFloat(item.comparePrice) : null,
    image,
    color: attrColor(item),
    size,
    qty: item.quantity || 1,
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const prevAuthRef = useRef(false);
  const loadingRef = useRef(false);

  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  const readGuestCart = () => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  // Track the auth state and re-run the loader on login/logout.
  useEffect(() => {
    setLoggedIn(isAuthed());
    const onStorage = () => setLoggedIn(isAuthed());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Load cart: backend for authed users (merging the guest cart on first
  // login), localStorage for guests. Mirrors the Knitwink approach.
  useEffect(() => {
    if (loadingRef.current) return;
    let cancelled = false;

    const load = async () => {
      loadingRef.current = true;
      const authed = isAuthed();
      try {
        if (authed) {
          // Merge any guest cart into the server cart on first login.
          if (!prevAuthRef.current) {
            const guest = readGuestCart();
            for (const it of guest) {
              const pid = Number(it.productId ?? it.id);
              if (!pid || Number.isNaN(pid)) continue;
              try {
                await apiAddToCart({
                  productId: pid,
                  variationId: it.variationId ? Number(it.variationId) : null,
                  quantity: it.qty || 1,
                  size: it.size || null,
                });
              } catch {
                /* non-fatal */
              }
            }
            if (guest.length) {
              try { localStorage.removeItem(KEY); } catch {}
            }
          }
          const data = await apiGetCart();
          if (!cancelled) setItems(Array.isArray(data) ? data.map(normalizeServerItem) : []);
        } else if (!cancelled) {
          setItems(readGuestCart());
        }
      } catch {
        if (!cancelled) setItems(authed ? [] : readGuestCart());
      } finally {
        prevAuthRef.current = authed;
        loadingRef.current = false;
        if (!cancelled) setReady(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [loggedIn]);

  // Persist the guest cart to localStorage (guests only).
  useEffect(() => {
    if (!ready || isAuthed()) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  // Reconcile with the server cart, but KEEP the colour/image/oldPrice we already
  // know locally when the server row doesn't return them — so a freshly-added
  // item never loses its colour just because the backend omits it.
  const refreshServerCart = async () => {
    try {
      const data = await apiGetCart();
      setItems((prev) => {
        const byKey = new Map(prev.map((i) => [i.key, i]));
        return (Array.isArray(data) ? data : []).map((raw) => {
          const norm = normalizeServerItem(raw);
          const local = byKey.get(norm.key);
          if (!local) return norm;
          return {
            ...norm,
            color: norm.color || local.color || null,
            image: norm.image || local.image || null,
            oldPrice: norm.oldPrice ?? local.oldPrice ?? null,
            slug: norm.slug || local.slug || '',
          };
        });
      });
    } catch {
      /* keep current items */
    }
  };

  // Build the local cart-item shape (full details, so the drawer shows colour,
  // image and price instantly — no waiting on the network).
  const toLocalItem = (product, size, qty, variationId) => ({
    key: `${product.id}-${variationId ?? size}`,
    id: product.id,
    productId: product.id,
    variationId: variationId || null,
    slug: product.slug,
    name: product.name,
    price: product.price,
    oldPrice: product.oldPrice || null,
    image: product.image || null,
    color: product.color || null,
    size,
    qty,
  });

  const add = useCallback(async (product, size = 'M', qty = 1, variationId = null) => {
    // 1) Optimistic local insert — the item shows in the drawer INSTANTLY.
    const key = `${product.id}-${variationId ?? size}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      return [...prev, toLocalItem(product, size, qty, variationId)];
    });
    setOpen(true);
    // 2) For logged-in users, sync to the backend in the background and
    //    reconcile (keeping the colour/image we just set).
    if (isAuthed()) {
      try {
        await apiAddToCart({
          productId: Number(product.id),
          variationId: variationId ? Number(variationId) : null,
          quantity: qty,
          size: size || null,
        });
        await refreshServerCart();
      } catch {
        /* optimistic item stays so the UI still reflects intent */
      }
    }
  }, []);

  const remove = useCallback(async (key) => {
    const item = items.find((i) => i.key === key);
    if (item && isAuthed()) {
      try {
        await apiRemoveFromCart(item.productId ?? item.id, item.variationId ?? null);
        await refreshServerCart();
        return;
      } catch {
        /* fall through */
      }
    }
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, [items]);

  const setQty = useCallback(async (key, qty) => {
    const item = items.find((i) => i.key === key);
    if (qty <= 0) { await remove(key); return; }
    if (item && isAuthed()) {
      try {
        await apiUpdateCartItem(item.productId ?? item.id, qty, item.variationId ?? null);
        await refreshServerCart();
        return;
      } catch {
        /* fall through */
      }
    }
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  }, [items, remove]);

  const clear = useCallback(async () => {
    if (isAuthed()) {
      try { await apiClearCart(); } catch {}
    } else {
      try { localStorage.removeItem(KEY); } catch {}
    }
    setItems([]);
  }, []);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, add, remove, setQty, clear, count, subtotal, ready, open, openCart, closeCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
