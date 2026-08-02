'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
} from '@/lib/api/cart';
import { toastAddedToCart } from '@/lib/toast';
import { fbTrack } from '@/utils/pixel';

const GUEST_CART_KEY = 'knitwink_guest_cart';

function cleanUrl(url) {
  if (!url) return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

function normalizeApiItem(item) {
  // Backend cart controller returns flat format:
  // { id, productId, variationId, name, image, images:[{image_url}], price, quantity, size, color }
  // This handles that directly.

  // Flat format detection (backend already processed)
  if (item.productId !== undefined || (item.name && !item.Product)) {
    const colorVal = item.color;
    const colorStr = Array.isArray(colorVal) ? colorVal.join(', ') : (colorVal || null);
    const images = Array.isArray(item.images) && item.images.length > 0
      ? item.images.map(i => ({ image_url: cleanUrl(i.image_url || i.url || '') }))
      : item.image ? [{ image_url: cleanUrl(item.image) }] : [];

    return {
      id: item.id,
      productId: item.productId || item.product_id,
      variationId: item.variationId || item.variation_id || null,
      name: item.name || '',
      images,
      image: cleanUrl(item.image || images[0]?.image_url || ''),
      price: parseFloat(item.price || 0),
      compareAtPrice: 0,
      variation: null,
      size: item.size || null,
      color: colorStr,
      quantity: item.quantity || 1,
      sku: '',
    };
  }

  // DB join format fallback (Product / ProductVariation nested)
  const variation = item.ProductVariation || item.variation || null;
  const product = item.Product || {};
  let images = [];
  if (variation?.VariationImages?.length > 0) {
    images = variation.VariationImages.map(img => ({
      image_url: cleanUrl(img.large || img.image_url || img.url || ''),
    }));
  } else if (product.ProductImages?.length > 0) {
    images = product.ProductImages.map(img => ({
      image_url: cleanUrl(img.large || img.image_url || img.url || ''),
    }));
  }
  const attrs = variation?.attributes
    ? (typeof variation.attributes === 'string' ? JSON.parse(variation.attributes) : variation.attributes)
    : {};
  return {
    id: item.id,
    productId: item.product_id || item.productId,
    variationId: item.variation_id || item.variationId || null,
    name: product.name || item.name || '',
    images,
    image: images[0]?.image_url || '',
    price: parseFloat(variation?.price || item.price || 0),
    compareAtPrice: parseFloat(variation?.comparePrice || item.comparePrice || 0),
    variation: variation ? { ...variation, attributes: attrs } : null,
    size: item.size || (attrs.size ? (Array.isArray(attrs.size) ? attrs.size[0] : attrs.size) : null),
    color: item.color || (attrs.color ? (Array.isArray(attrs.color) ? attrs.color.join(', ') : attrs.color) : null),
    quantity: item.quantity || 1,
    sku: variation?.sku || '',
  };
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const pendingRef = useRef(false);
  const prevIsAuthRef = useRef(false);

  // Sync isLoggedIn with token in localStorage
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsLoggedIn(!!token);
    setIsHydrated(true);

    const onStorage = () => setIsLoggedIn(!!localStorage.getItem('token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isAuthenticated = () =>
    typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;

  useEffect(() => {
    if (!isHydrated || pendingRef.current) return;

    const load = async () => {
      pendingRef.current = true;
      setIsCartLoading(true);
      const authed = isAuthenticated();
      try {
        if (authed) {
          // Merge guest cart on first login
          if (!prevIsAuthRef.current) {
            try {
              const raw = localStorage.getItem(GUEST_CART_KEY);
              const guestItems = raw ? JSON.parse(raw) : [];
              for (const item of guestItems) {
                try {
                  await apiAddToCart({
                    productId: Number(item.productId),
                    variationId: item.variationId ? Number(item.variationId) : null,
                    quantity: item.quantity || 1,
                    size: item.size || null,
                  });
                } catch { /* non-fatal */ }
              }
              if (guestItems.length > 0) localStorage.removeItem(GUEST_CART_KEY);
            } catch { /* non-fatal */ }
          }
          const data = await apiGetCart();
          setCartItems(Array.isArray(data) ? data.map(normalizeApiItem) : []);
        } else {
          try {
            const raw = localStorage.getItem(GUEST_CART_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            // Filter out legacy items that don't have a valid productId (from old schema)
            const cleaned = parsed.filter(i => i.productId != null && !isNaN(Number(i.productId)));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cleaned));
            }
            setCartItems(cleaned);
          } catch { setCartItems([]); }
        }
      } catch { setCartItems([]); }
      finally {
        prevIsAuthRef.current = authed;
        setIsCartLoading(false);
        pendingRef.current = false;
      }
    };

    load();
  }, [isHydrated, isLoggedIn]);

  // Persist guest cart to localStorage
  useEffect(() => {
    if (!isHydrated || isCartLoading || isAuthenticated()) return;
    try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems)); } catch { /* ignore */ }
  }, [cartItems, isHydrated, isCartLoading]);

  const addToCart = async (product, selectedColor, selectedSize, quantity = 1, variationId = null, imageUrl = null) => {
    if (!product?.id) return;
    const authed = isAuthenticated();

    // Meta funnel: AddToCart (browser pixel + server CAPI, deduped by eventID).
    const qty = quantity || 1;
    const unitPrice = parseFloat(product.price || 0);
    fbTrack('AddToCart', {
      content_ids: [String(product.id)],
      content_type: 'product',
      content_name: product.name || undefined,
      value: unitPrice * qty,
      currency: 'INR',
      contents: [{ id: String(product.id), quantity: qty }],
    });

    if (authed) {
      try {
        await apiAddToCart({
          productId: Number(product.id),
          variationId: variationId ? Number(variationId) : null,
          quantity,
          size: selectedSize || null,
        });
        const data = await apiGetCart();
        setCartItems(Array.isArray(data) ? data.map(normalizeApiItem) : []);
        toastAddedToCart(product.name);
      } catch {
        _addGuestItem(product, selectedColor, selectedSize, quantity, variationId, imageUrl);
      }
    } else {
      _addGuestItem(product, selectedColor, selectedSize, quantity, variationId, imageUrl);
    }

    setIsDrawerOpen(true);
  };

  function _addGuestItem(product, selectedColor, selectedSize, quantity, variationId, imageUrl) {
    const vid = variationId ? String(variationId) : null;
    setCartItems(prev => {
      const existing = prev.find(i => String(i.productId) === String(product.id) && String(i.variationId) === String(vid));
      if (existing) {
        return prev.map(i =>
          String(i.productId) === String(product.id) && String(i.variationId) === String(vid)
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      const url = imageUrl || product.images?.[0]?.url || '';
      const newItem = {
        id: Date.now() + Math.random(),
        productId: String(product.id),
        variationId: vid,
        name: product.name,
        image: url,
        images: url ? [{ image_url: url }] : [],
        price: parseFloat(product.price || 0),
        compareAtPrice: parseFloat(product.compareAtPrice || 0),
        variation: null,
        size: selectedSize || 'Free Size',
        color: selectedColor || '',
        quantity,
      };
      return [...prev, newItem];
    });
    toastAddedToCart(product.name);
  }

  const removeFromCart = async (itemId) => {
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;
    if (isAuthenticated()) {
      try {
        await apiRemoveFromCart(item.productId, item.variationId ?? null);
        const data = await apiGetCart();
        setCartItems(Array.isArray(data) ? data.map(normalizeApiItem) : []);
        return;
      } catch { /* fall through to local remove */ }
    }
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = async (itemId, newQty) => {
    if (newQty < 1) { await removeFromCart(itemId); return; }
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;
    if (isAuthenticated()) {
      try {
        await apiUpdateCartItem(item.productId, newQty, item.variationId ?? null);
        const data = await apiGetCart();
        setCartItems(Array.isArray(data) ? data.map(normalizeApiItem) : []);
        return;
      } catch { /* fall through to local update */ }
    }
    setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
  };

  const clearCart = async () => {
    if (isAuthenticated()) {
      try { await apiClearCart(); } catch { /* non-fatal */ }
    } else {
      try { localStorage.removeItem(GUEST_CART_KEY); } catch { /* ignore */ }
    }
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + parseFloat(i.price || 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      cartTotal,
      isCartLoading,
      isDrawerOpen,
      setIsDrawerOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used within CartProvider');
  return ctx;
}
