'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
} from '@/lib/api/cart';
import { fbTrack } from '@/utils/pixel';

const CartContext = createContext(null);
const KEY = 'soxbae_cart';

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

// Normalise a backend cart row into the Soxbae cart-item shape the UI uses.
// Soxbae items: { key, id, productId, variationId, serverId, slug, name,
//                 price, oldPrice, image, color, size, qty }
function normalizeServerItem(item) {
  const productId = item.productId ?? item.product_id ?? item.id;
  const variationId = item.variationId ?? item.variation_id ?? null;
  const images = Array.isArray(item.images) ? item.images : [];
  const image = cleanUrl(item.image || images[0]?.image_url || images[0]?.url || '');
  const size = item.size || (Array.isArray(item.size) ? item.size[0] : null) || 'M';
  const packId = item.packId ?? item.pack_id ?? null;
  const packSize = item.packSize ?? item.pack_size ?? null;
  return {
    key: `${productId}-${variationId ?? size}${packId ? `-${packId}` : ''}`,
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
    packId,
    packSize,
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
  const toLocalItem = (product, size, qty, variationId, extra = {}) => ({
    key: `${product.id}-${variationId ?? size}${extra.packId ? `-${extra.packId}` : ''}`,
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
    packId: extra.packId || null,
    packSize: extra.packSize || null,
  });

  // `meta` (optional) carries { packId, packSize } so the drawer's "Buy More,
  // Save More" can group lines under a shared pack_id — the backend then prices
  // the whole group by its total pairs (server-authoritative). Omitted/null
  // leaves the item a normal loose line, unchanged from before.
  const add = useCallback(async (product, size = 'M', qty = 1, variationId = null, meta = {}) => {
    if (!product?.id) return;

    // Meta funnel: AddToCart (browser pixel + server CAPI, deduped by eventID).
    const unitPrice = Number(product.price ?? 0);
    fbTrack('AddToCart', {
      content_ids: [String(product.id)],
      content_type: 'product',
      content_name: product.name || undefined,
      value: unitPrice * qty,
      currency: 'INR',
      contents: [{ id: String(product.id), quantity: qty }],
    });

    // 1) Optimistic local insert — the item shows in the drawer INSTANTLY.
    const key = `${product.id}-${variationId ?? size}${meta.packId ? `-${meta.packId}` : ''}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      return [...prev, toLocalItem(product, size, qty, variationId, meta)];
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
          pack_id: meta.packId || null,
          pack_size: meta.packSize || null,
        });
        await refreshServerCart();
      } catch {
        /* optimistic item stays so the UI still reflects intent */
      }
    }
  }, []);

  // Add a multi-pair pack where each pair can be a different colour. Creates one
  // cart line per distinct colour (merged by quantity), all sharing a packId so
  // the backend prices the whole group at the pack rate (server-authoritative).
  const addPack = useCallback(async (product, size = 'M', perPair = [], packUnit = 0, packSize = 0) => {
    if (!product?.id || !perPair.length) return;
    const packId = `pk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    fbTrack('AddToCart', {
      content_ids: [String(product.id)],
      content_type: 'product',
      content_name: product.name || undefined,
      value: Number(packUnit) * perPair.length,
      currency: 'INR',
      contents: [{ id: String(product.id), quantity: perPair.length }],
    });

    // Merge pairs of the same colour into one line with a quantity.
    const byVar = new Map();
    for (const p of perPair) {
      const vid = p.variationId ?? null;
      const k = String(vid ?? `${p.color || ''}-${size}`);
      const cur = byVar.get(k) || { variationId: vid, color: p.color || null, image: p.image || null, qty: 0 };
      cur.qty += 1;
      byVar.set(k, cur);
    }
    const lines = [...byVar.values()];

    setItems((prev) => {
      const next = [...prev];
      for (const ln of lines) {
        next.push(toLocalItem(
          { ...product, price: Number(packUnit), image: ln.image || product.image || null, color: ln.color || null },
          size, ln.qty, ln.variationId || null, { packId, packSize },
        ));
      }
      return next;
    });
    setOpen(true);

    if (isAuthed()) {
      try {
        for (const ln of lines) {
          await apiAddToCart({
            productId: Number(product.id),
            variationId: ln.variationId ? Number(ln.variationId) : null,
            quantity: ln.qty, size: size || null,
            pack_id: packId, pack_size: packSize,
          });
        }
        await refreshServerCart();
      } catch { /* optimistic items stay */ }
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

  // WhatsApp cart-recovery link: put a recovered cart back (lines from
  // GET /api/abandoned-cart/restore/:token — see utils/cartRecovery.js). The
  // link usually opens in WhatsApp's in-app browser, which has none of this
  // shopper's localStorage, so the cart is rebuilt from the server copy.
  // Guests: straight into the local cart. Signed-in: added to the server cart.
  // No AddToCart pixel/toast — the shopper isn't adding anything new.
  const restore = useCallback(async (lines) => {
    const list = (Array.isArray(lines) ? lines : [])
      .map((l) => (l.line && l.line.key
        ? { ...l.line, productId: l.line.productId ?? l.productId, variationId: l.line.variationId ?? l.variationId ?? null, qty: l.quantity || 1 }
        : normalizeServerItem(l)))
      .filter((i) => i && (i.productId ?? i.id));
    if (!list.length) return 0;
    if (isAuthed()) {
      for (const l of lines) {
        try {
          await apiAddToCart({
            productId: Number(l.productId),
            variationId: l.variationId ? Number(l.variationId) : null,
            quantity: l.quantity || 1,
            size: l.line?.size || l.size || null,
            pack_id: l.packId || l.line?.packId || null,
            pack_size: l.packSize || l.line?.packSize || null,
          });
        } catch { /* non-fatal */ }
      }
      await refreshServerCart();
    } else {
      setItems((prev) => (prev.length ? prev : list));
    }
    setOpen(true);
    return list.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, add, addPack, remove, setQty, clear, count, subtotal, ready, open, openCart, closeCart, restore }}
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
